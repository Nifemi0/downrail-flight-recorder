"use client";

import { useState } from "react";
import type { PerpOrderMarginPreview } from "@somnia-chain/markets-sdk";
import { createPublicClient, createWalletClient, custom, erc20Abi, formatUnits, http, parseUnits, type Address, type EIP1193Provider, type Hex } from "viem";
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";

import { createDreamDexClient, DREAMDEX_CHAIN } from "@/lib/dreamdex/config";
import type { SupportedPerpMarket } from "@/lib/dreamdex/markets";
import { fundingReviewWithinBounds, withMarginBuffer } from "@/lib/dreamdex/order-review";
import { shortenAddress } from "@/lib/format";

type PreparedOrder = {
  account: Address;
  market: SupportedPerpMarket;
  isBid: boolean;
  price: bigint;
  quantity: bigint;
  limitNotional: bigint;
  lockAmount: bigint;
  asOfBlock: bigint;
  ownWalletPull: bigint;
  mainWalletPull: bigint;
  fundingPayer: Address | null;
};

function injectedProvider(): EIP1193Provider {
  const provider = (window as Window & { ethereum?: EIP1193Provider }).ethereum;
  if (!provider) throw new Error("No browser wallet found. Install or open an EVM wallet, then retry.");
  return provider;
}

function walletFor(provider: EIP1193Provider, account: Address) {
  return createWalletClient({ chain: DREAMDEX_CHAIN, transport: custom(provider), account });
}

function explainMarginFailure(preview: Extract<PerpOrderMarginPreview, { priceable: true }>, market: SupportedPerpMarket) {
  const reasons = [
    preview.voucherBlocked ? "The voucher does not allow this market or has no leverage cap." : null,
    preview.restrictedBlocked ? "This market is currently close-only." : null,
    preview.isolationBlocked ? "The account's isolated margin settings block this market." : null,
    !preview.hasCollateralForLock ? "Available collateral does not cover the required lock." : null,
    !preview.meetsInitialMargin ? "The account does not meet the required initial margin." : null,
    preview.mainFundingBlocked ? "A previous linked-wallet funding claim blocks the main wallet top-up." : null,
  ].filter(Boolean);
  const show = (amount: bigint) => `${formatUnits(amount, market.quoteDecimals)} ${market.quoteSymbol}`;
  const wallet = preview.wallet ? ` Your wallet holds ${show(preview.wallet.balance)}; MarginBank allowance is ${show(preview.wallet.allowance)}.` : " Wallet balance and allowance are unavailable.";
  return `${reasons.join(" ") || "The protocol rejected the margin preview."} Required lock: ${show(preview.lockAmount)}; unlocked bank collateral: ${show(preview.unlockedCollateral)}; total top-up requested: ${show(preview.topUpRequired)}.${wallet} All amounts are testnet assets.`;
}

export function TradeReview({ market, onConfirmed }: { market: SupportedPerpMarket; onConfirmed: (account: Address, hash: Hex) => void }) {
  const [account, setAccount] = useState<Address | null>(null);
  const [side, setSide] = useState<"long" | "short">("long");
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [prepared, setPrepared] = useState<PreparedOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ hash: Hex; block: bigint; timestamp?: number; status: string } | null>(null);
  const [approval, setApproval] = useState<{ account: Address; amount: bigint; token: Address; spender: Address } | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);

  function clearReview() { setPrepared(null); setResult(null); setError(null); setApproval(null); setApprovalStatus(null); }

  async function connect() {
    setBusy(true); setError(null); clearReview();
    try {
      const provider = injectedProvider();
      const accounts = await provider.request({ method: "eth_requestAccounts" }) as Address[];
      if (!accounts?.[0]) throw new Error("The wallet did not return an account.");
      const wallet = walletFor(provider, accounts[0]);
      try { await wallet.switchChain({ id: DREAMDEX_CHAIN.id }); }
      catch {
        await wallet.addChain({ chain: DREAMDEX_CHAIN });
        await wallet.switchChain({ id: DREAMDEX_CHAIN.id });
      }
      setAccount(accounts[0]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Wallet connection failed."); }
    finally { setBusy(false); }
  }

  async function review() {
    setBusy(true); setError(null); setPrepared(null); setResult(null); setApproval(null); setApprovalStatus(null);
    try {
      if (!account) throw new Error("Connect a wallet first.");
      if (!quantity || !limitPrice) throw new Error("Enter a quantity and a limit price.");
      const rawQuantity = parseUnits(quantity, market.baseDecimals);
      const rawPrice = parseUnits(limitPrice, market.quoteDecimals);
      if (rawQuantity < BigInt(market.minQuantity)) throw new Error(`Minimum quantity is ${formatUnits(BigInt(market.minQuantity), market.baseDecimals)} ${market.baseSymbol}.`);
      if (rawQuantity % BigInt(market.lotSize) !== 0n) throw new Error(`Quantity must be a multiple of ${formatUnits(BigInt(market.lotSize), market.baseDecimals)} ${market.baseSymbol}.`);
      if (rawPrice <= 0n || rawPrice % BigInt(market.tickSize) !== 0n) throw new Error(`Limit price must be a positive multiple of ${formatUnits(BigInt(market.tickSize), market.quoteDecimals)} ${market.quoteSymbol}.`);
      const notional = rawQuantity * rawPrice / 10n ** BigInt(market.baseDecimals);
      if (notional > parseUnits("25", market.quoteDecimals)) throw new Error("This local test flow caps each order at 25 quote units of limit notional.");
      const chainId = await walletFor(injectedProvider(), account).getChainId();
      if (chainId !== DREAMDEX_CHAIN.id) throw new Error(`Switch your wallet to Somnia Hideki (${DREAMDEX_CHAIN.id}).`);
      const exchange = createDreamDexClient();
      const margin = await exchange.client.previewPerpOrderMargin({ pool: market.poolAddress, marginBank: market.marginBank, account, isBid: side === "long", quantity: rawQuantity, price: rawPrice, autoPull: true });
      if (!margin.priceable) throw new Error("This market has no fresh mark price. Order review is unavailable.");
      if (!margin.sufficient) {
        const allowanceAmount = (margin.topUpRequired * 110n + 99n) / 100n;
        if (!margin.voucherBlocked && !margin.restrictedBlocked && !margin.isolationBlocked && !margin.mainFundingBlocked && margin.wallet && margin.wallet.allowance === 0n && margin.topUpRequired > 0n && margin.wallet.balance >= allowanceAmount && allowanceAmount <= parseUnits("25", market.quoteDecimals)) {
          setApproval({ account, amount: allowanceAmount, token: market.quoteToken, spender: market.marginBank });
        }
        throw new Error(explainMarginFailure(margin, market));
      }
      setPrepared({ account, market, isBid: side === "long", quantity: rawQuantity, price: rawPrice, limitNotional: notional, lockAmount: margin.lockAmount, asOfBlock: margin.asOfBlock, ownWalletPull: margin.ownWalletPull, mainWalletPull: margin.mainWalletPull, fundingPayer: margin.fundingPayer });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Order review failed."); }
    finally { setBusy(false); }
  }

  async function approveCollateral() {
    if (!approval) return;
    setBusy(true); setError(null); setApprovalStatus(null);
    try {
      const provider = injectedProvider();
      const wallet = walletFor(provider, approval.account);
      const active = await wallet.getAddresses();
      if (active[0]?.toLowerCase() !== approval.account.toLowerCase() || await wallet.getChainId() !== DREAMDEX_CHAIN.id) throw new Error("Wallet account or network changed. Connect and review again.");
      const configuredBank = SOMNIA_HIDEKI_TESTNET_ADDRESSES.marginBank;
      if (!configuredBank || approval.spender.toLowerCase() !== configuredBank.toLowerCase()) throw new Error("The MarginBank address does not match the Hideki SDK configuration.");
      const exchange = createDreamDexClient();
      const system = await exchange.client.getPerpSystemConfig(approval.spender);
      if (system.collateralToken.toLowerCase() !== approval.token.toLowerCase()) throw new Error("The token does not match the MarginBank's on-chain collateral.");
      const publicClient = createPublicClient({ chain: DREAMDEX_CHAIN, transport: http() });
      const currentAllowance = await publicClient.readContract({ address: approval.token, abi: erc20Abi, functionName: "allowance", args: [approval.account, approval.spender] });
      if (currentAllowance !== 0n) throw new Error("The allowance changed. Review the order again before approving.");
      const hash = await wallet.writeContract({ account: approval.account, chain: DREAMDEX_CHAIN, address: approval.token, abi: erc20Abi, functionName: "approve", args: [approval.spender, approval.amount] });
      setApprovalStatus(`Approval submitted: ${hash}. Waiting for a chain receipt.`);
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
      if (receipt.status !== "success") throw new Error(`Approval transaction reverted: ${hash}`);
      setApprovalStatus(`Approval confirmed at block ${receipt.blockNumber}. Review the order again. Transaction: ${hash}`);
      setApproval(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Token approval failed. Check your wallet activity before retrying."); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!prepared) return;
    setBusy(true); setError(null);
    try {
      const provider = injectedProvider();
      const wallet = walletFor(provider, prepared.account);
      const activeAccounts = await wallet.getAddresses();
      if (activeAccounts[0]?.toLowerCase() !== prepared.account.toLowerCase()) throw new Error("Wallet account changed. Reconnect and review again.");
      if (await wallet.getChainId() !== DREAMDEX_CHAIN.id) throw new Error("Wallet network changed. Switch back to Somnia Hideki and review again.");
      const exchange = createDreamDexClient();
      const margin = await exchange.client.previewPerpOrderMargin({ pool: prepared.market.poolAddress, marginBank: prepared.market.marginBank, account: prepared.account, isBid: prepared.isBid, quantity: prepared.quantity, price: prepared.price, autoPull: true });
      if (!margin.priceable || !margin.sufficient) throw new Error("Margin or market state changed. Review the order again.");
      if (!fundingReviewWithinBounds(prepared, margin)) throw new Error("The margin or wallet funding amounts exceeded the reviewed maximum. Review the order again before signing.");
      const trader = exchange.client.createTrader({ walletClient: wallet });
      const unsigned = await trader.buildPlacePerpOrder({ pool: prepared.market.poolAddress, isBid: prepared.isBid, quantity: prepared.quantity, price: prepared.price, orderType: 0, expireTimestampNs: BigInt(Date.now() + 10 * 60_000) * 1_000_000n });
      if (unsigned.approval || unsigned.order.chainId !== DREAMDEX_CHAIN.id || unsigned.order.to.toLowerCase() !== prepared.market.poolAddress.toLowerCase()) throw new Error("Built order did not match the reviewed testnet market.");
      const hash = await wallet.sendTransaction({ account: prepared.account, chain: DREAMDEX_CHAIN, to: unsigned.order.to, data: unsigned.order.data, value: unsigned.order.value });
      setResult({ hash, block: 0n, status: "Submitted; awaiting chain receipt" });
      const publicClient = createPublicClient({ chain: DREAMDEX_CHAIN, transport: http() });
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
      const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber }).catch(() => null);
      setResult({ hash, block: receipt.blockNumber, timestamp: block ? Number(block.timestamp) : undefined, status: receipt.status === "success" ? "Confirmed on-chain; fill/indexing still needs verification" : "Transaction reverted" });
      if (receipt.status === "success") onConfirmed(prepared.account, hash);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Order submission failed. Check your wallet activity before retrying."); }
    finally { setBusy(false); setPrepared(null); }
  }

  return <section className="trade-review" aria-label="Testnet order review">
    <div className="trade-review-heading"><div><p className="panel-label">Optional testnet order</p><h4>Make a real event to record.</h4><p>This is a small, expiring limit order—not a simulated fill. It can execute, remain open, or expire. Margin and gas are testnet assets.</p></div><button type="button" onClick={connect} disabled={busy}>{account ? shortenAddress(account) : "Connect wallet"}</button></div>
    <div className="trade-fields"><label>Direction<select disabled={busy} value={side} onChange={event => { setSide(event.target.value as "long" | "short"); clearReview(); }}><option value="long">Buy / long</option><option value="short">Sell / short</option></select></label><label>Quantity ({market.baseSymbol})<input disabled={busy} inputMode="decimal" value={quantity} onChange={event => { setQuantity(event.target.value); clearReview(); }} placeholder={formatUnits(BigInt(market.minQuantity), market.baseDecimals)} /></label><label>Limit price ({market.quoteSymbol})<input disabled={busy} inputMode="decimal" value={limitPrice} onChange={event => { setLimitPrice(event.target.value); clearReview(); }} placeholder={market.lastPrice ? formatUnits(BigInt(market.lastPrice), market.quoteDecimals) : "Enter price"} /></label><button type="button" onClick={review} disabled={busy || !account}>Review order</button></div>
    {prepared ? <div className="trade-confirm"><p><strong>{prepared.isBid ? "Buy" : "Sell"} {formatUnits(prepared.quantity, market.baseDecimals)} {market.baseSymbol}</strong> at a limit of {formatUnits(prepared.price, market.quoteDecimals)} {market.quoteSymbol}. Maximum limit notional: {formatUnits(prepared.limitNotional, market.quoteDecimals)} {market.quoteSymbol}. Margin lock: {formatUnits(prepared.lockAmount, market.quoteDecimals)} {market.quoteSymbol} at block {prepared.asOfBlock.toString()}; maximum accepted before opening the wallet: {formatUnits(withMarginBuffer(prepared.lockAmount), market.quoteDecimals)} {market.quoteSymbol}.</p><p>Potential top-up from your wallet: {formatUnits(prepared.ownWalletPull, market.quoteDecimals)} {market.quoteSymbol}; maximum accepted before opening the wallet: {formatUnits(withMarginBuffer(prepared.ownWalletPull), market.quoteDecimals)} {market.quoteSymbol}{prepared.mainWalletPull > 0n ? `. Linked wallet ${prepared.fundingPayer ?? "unknown"}: ${formatUnits(prepared.mainWalletPull, market.quoteDecimals)} ${market.quoteSymbol}, maximum ${formatUnits(withMarginBuffer(prepared.mainWalletPull), market.quoteDecimals)}` : "; no linked-wallet top-up is accepted in this review"}. These are testnet assets.</p><p>Market conditions may change after your wallet opens. These preview limits are checked before signing and are not enforced as on-chain caps. A resting order can fill before its 10-minute expiry. This is not a reduce-only order: if your position changes before it fills, a sell or buy intended to close it could instead increase or reverse your position.</p><button type="button" onClick={submit} disabled={busy}>{busy ? "Working…" : "Send testnet order in wallet"}</button></div> : null}
    {approval ? <div className="trade-confirm"><p><strong>Limited testnet token allowance</strong></p><p>Allow the dreamDEX MarginBank <code>{approval.spender}</code> to use up to {formatUnits(approval.amount, market.quoteDecimals)} {market.quoteSymbol} from your wallet. This is a limited allowance, including a 10% margin buffer. Unused allowance remains until spent or revoked. Token: <code>{approval.token}</code>. Your wallet will ask you to confirm a separate testnet transaction.</p><button type="button" onClick={approveCollateral} disabled={busy}>{busy ? "Waiting for wallet…" : "Approve testnet USDso in wallet"}</button></div> : null}
    {approvalStatus ? <p className="trade-result" role="status">{approvalStatus}</p> : null}
    {result ? <p className="trade-result">{result.status}. Somnia Hideki ({DREAMDEX_CHAIN.id}) · {account ? shortenAddress(account) : "Wallet"} · {market.symbol} · transaction <code>{result.hash}</code>{result.block > 0n ? ` · block ${result.block}` : ""}{result.timestamp ? ` · ${new Date(result.timestamp * 1000).toLocaleString()}` : ""}. Use the wallet lookup above to inspect indexed activity.</p> : null}
    {error ? <p className="trade-error" role="alert">{error}</p> : null}
  </section>;
}
