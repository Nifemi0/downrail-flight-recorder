"use client";

import { useMemo, useState } from "react";
import { formatUnits, type Hex } from "viem";

import type { AccountRecorderSnapshot } from "@/lib/dreamdex/account";
import { buildReceiptEvents, formatEventTime, type ReceiptEvent } from "@/lib/dreamdex/receipt";
import { buildPositionReceipts, type PositionReceipt } from "@/lib/dreamdex/position-receipt";
import { compareArchiveChanges, parseLocalArchive, summarizeArchiveReceipt, type ImportedArchive } from "@/lib/dreamdex/archive-import";
import { comparePositionChange } from "@/lib/dreamdex/chain-comparison";
import { reconcilePosition } from "@/lib/dreamdex/reconciliation";
import type { MarketSnapshot } from "@/lib/dreamdex/markets";
import { displayMoney, formatCheckedAt, shortenAddress } from "@/lib/format";
import { TradeReview } from "./trade-review";
import { ArchiveViewer } from "./archive-viewer";

type Props = {
  initialSnapshot: MarketSnapshot;
};

type DirectEvents = { source: string; account: string; market: string; fromBlock: string; toBlock: string; rows: { type: string; blockNumber: string; logIndex: number; transactionHash: string; size: string | null; price: string | null; realizedPricePnl: string | null; amount: string | null }[]; note: string };
type GasResult = { account: string; receiptId: string; hashKey: string; totalSTT: string; paid: number; other: number; unavailable: number; checked: number };

type PositionAnalytics = { account: string; market: string; chainId: number; block: string; checkedAt: string; size: string; priceable: boolean; markPrice?: string; entryPrice?: string; unrealizedPricePnl?: string; accruedFundingOwed?: string; equityContribution?: string; quote?: string };

type ChainProof = {
  hash: string; status: string; blockNumber: string; timestamp: string; logCount: number; note: string;
  logIndex: number | null; logNote: string | null;
  fill: { pool: string; market: string; quantity: string; price: string; baseSymbol: string; quoteSymbol: string } | null;
};

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path d="M6 18 18 6M8 6h10v10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function compactUnits(value: string | null, decimals: number) {
  if (value === null) return "Not indexed";
  const formatted = formatUnits(BigInt(value), decimals);
  const [whole, fraction = ""] = formatted.split(".");
  const trimmed = fraction.replace(/0+$/, "").slice(0, 6);
  return trimmed ? `${whole}.${trimmed}` : whole;
}

export function MarketConsole({ initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedSymbol, setSelectedSymbol] = useState("ETH-PERP");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [account, setAccount] = useState("");
  const [accountSnapshot, setAccountSnapshot] = useState<AccountRecorderSnapshot | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [submittedHash, setSubmittedHash] = useState<Hex | null>(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [chainProof, setChainProof] = useState<ChainProof | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [isCheckingProof, setIsCheckingProof] = useState(false);
  const [proofEventId, setProofEventId] = useState<string | null>(null);
  const [localArchive, setLocalArchive] = useState<ImportedArchive | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [directEvents, setDirectEvents] = useState<DirectEvents | null>(null);
  const [directError, setDirectError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [analytics, setAnalytics] = useState<PositionAnalytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [isCheckingAnalytics, setIsCheckingAnalytics] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [gasResult, setGasResult] = useState<GasResult | null>(null);
  const [gasError, setGasError] = useState<string | null>(null);
  const [checkingGas, setCheckingGas] = useState(false);

  const selected = useMemo(
    () =>
      snapshot.supported.find((market) => market.symbol === selectedSymbol) ??
      snapshot.supported[0],
    [selectedSymbol, snapshot.supported],
  );
  const selectedMinimum = `${compactUnits(selected.minQuantity, selected.baseDecimals)} ${selected.baseSymbol}`;
  const selectedLastPrice = selected.lastPrice
    ? `${compactUnits(selected.lastPrice, selected.quoteDecimals)} ${selected.quoteSymbol}`
    : "Awaiting first fill";
  const receiptEvents = useMemo(() => accountSnapshot ? buildReceiptEvents(accountSnapshot) : [], [accountSnapshot]);
  const positionReceipts = useMemo(() => accountSnapshot ? buildPositionReceipts(accountSnapshot).filter((receipt) => receipt.market === selected.symbol) : [], [accountSnapshot, selected.symbol]);
  const selectedReceipt = positionReceipts.find((receipt) => receipt.id === selectedReceiptId) ?? positionReceipts[0];
  const reconciliation = useMemo(() => accountSnapshot && selectedReceipt ? reconcilePosition(accountSnapshot, positionReceipts, selectedReceipt) : null, [accountSnapshot, positionReceipts, selectedReceipt]);
  const selectedReceiptEvents = useMemo(() => {
    if (!selectedReceipt) return [];
    const ids = new Set([...selectedReceipt.changes.map((row) => `change-${row.id}`), ...selectedReceipt.fills.map((row) => `fill-${row.id}`), ...selectedReceipt.orders.map((row) => `order-${row.id}`)]);
    if (reconciliation) { for (const fee of reconciliation.fees) ids.add(`fee-${fee.id}`); for (const payment of reconciliation.funding) ids.add(`funding-${payment.id}`); for (const event of reconciliation.liquidationEvents) ids.add(`liquidation-${event.id}`); }
    return receiptEvents.filter((event) => ids.has(event.id));
  }, [receiptEvents, selectedReceipt, reconciliation]);
  const receiptHashes = useMemo(() => [...new Set(selectedReceiptEvents.map((event) => event.transactionHash.toLowerCase()).filter((hash) => /^0x[0-9a-f]{64}$/.test(hash)))].sort(), [selectedReceiptEvents]);

  async function checkGas() {
    if (!accountSnapshot || !selectedReceipt || checkingGas) return;
    const hashes = receiptHashes;
    if (!hashes.length) { setGasError("No transaction hashes are available for this position."); return; }
    if (hashes.length > 20) { setGasError(`This position has ${hashes.length} transactions; gas checking currently supports up to 20.`); return; }
    const owner = accountSnapshot.account, receiptId = selectedReceipt.id;
    setCheckingGas(true); setGasResult(null); setGasError(null);
    try {
      const response = await fetch(`/api/accounts/${encodeURIComponent(owner)}/gas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hashes }) });
      const body = await response.json() as Omit<GasResult, "receiptId" | "checked" | "hashKey"> | { error: string };
      if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : "Gas lookup failed.");
      setGasResult({ ...body, receiptId, hashKey: hashes.join(","), checked: hashes.length });
    } catch (cause) { setGasError(cause instanceof Error ? cause.message : "Gas lookup failed."); }
    finally { setCheckingGas(false); }
  }

  async function refreshSnapshot() {
    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const response = await fetch("/api/markets", { cache: "no-store" });
      const body = (await response.json()) as MarketSnapshot | { error: string };
      if (!response.ok || "error" in body) {
        throw new Error("error" in body ? body.error : "Refresh failed.");
      }
      setSnapshot(body);
    } catch (error) {
      setRefreshError(
        error instanceof Error ? error.message : "The live read could not be refreshed.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function loadAccount(address: string) {
    setIsInspecting(true);
    setAccountError(null);
    setAccountSnapshot(null);
    setChainProof(null);
    setProofError(null);
    setProofEventId(null);
    setSelectedReceiptId(null);
    setGasResult(null); setGasError(null);
    setAnalytics(null);
    setAnalyticsError(null);
    setDirectEvents(null);
    setDirectError(null);
    setLocalArchive(null);
    setArchiveError(null);

    try {
      const response = await fetch(`/api/accounts/${encodeURIComponent(address.trim())}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as AccountRecorderSnapshot | { error: string };
      if (!response.ok || "error" in body) {
        throw new Error("error" in body ? body.error : "Account lookup failed.");
      }
      setAccountSnapshot(body);
    } catch (error) {
      setAccountError(
        error instanceof Error ? error.message : "The account lifecycle could not be read.",
      );
    } finally {
      setIsInspecting(false);
    }
  }

  async function loadOlder() {
    if (!accountSnapshot?.nextCursor || isLoadingOlder) return;
    setIsLoadingOlder(true);
    setAccountError(null);
    try {
      const response = await fetch(`/api/accounts/${encodeURIComponent(accountSnapshot.account)}?cursor=${encodeURIComponent(accountSnapshot.nextCursor)}`, { cache: "no-store" });
      const body = (await response.json()) as AccountRecorderSnapshot | { error: string };
      if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : "Older records could not be read.");
      if (Object.values(body.sourceStatus).some((source) => source.state === "unavailable")) throw new Error("A source was unavailable. Older records were not advanced; try loading this page again.");
      setAccountSnapshot((previous) => previous ? {
        ...body,
        positions: [...previous.positions, ...body.positions.filter((row) => !previous.positions.some((old) => old.market === row.market))],
        openOrders: [...previous.openOrders, ...body.openOrders.filter((row) => !previous.openOrders.some((old) => old.id === row.id))],
        orderHistory: [...previous.orderHistory, ...body.orderHistory.filter((row) => !previous.orderHistory.some((old) => old.id === row.id))],
        fills: [...previous.fills, ...body.fills.filter((row) => !previous.fills.some((old) => old.id === row.id))],
        positionChanges: [...previous.positionChanges, ...body.positionChanges.filter((row) => !previous.positionChanges.some((old) => old.id === row.id))],
        funding: [...previous.funding, ...body.funding.filter((row) => !previous.funding.some((old) => old.id === row.id))],
        fees: [...previous.fees, ...body.fees.filter((row) => !previous.fees.some((old) => old.id === row.id))],
        marginEvents: [...previous.marginEvents, ...body.marginEvents.filter((row) => !previous.marginEvents.some((old) => old.id === row.id))],
        liquidations: [...previous.liquidations, ...body.liquidations.filter((row) => !previous.liquidations.some((old) => old.id === row.id))],
      } : body);
    } catch (cause) { setAccountError(cause instanceof Error ? cause.message : "Older records could not be read."); }
    finally { setIsLoadingOlder(false); }
  }

  async function importArchive(file: File | undefined) {
    setLocalArchive(null); setArchiveError(null);
    if (!file || !accountSnapshot) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("Archive exceeds the 5 MB local import limit.");
      const archive = parseLocalArchive(await file.text(), {account:accountSnapshot.account,market:selected.symbol,pool:selected.poolAddress});
      setLocalArchive(archive);
    } catch (error) { setArchiveError(error instanceof Error ? error.message : "Could not read this archive."); }
  }

  async function checkOpeningBlock() {
    if (!accountSnapshot || !selectedReceipt || isScanning) return;
    const block = selectedReceipt.changes[0].blockNumber;
    setIsScanning(true); setDirectEvents(null); setDirectError(null);
    try {
      const url = `/api/accounts/${encodeURIComponent(accountSnapshot.account)}/chain-events?market=${encodeURIComponent(selectedReceipt.market)}&fromBlock=${block}&toBlock=${block}`;
      const response = await fetch(url, { cache: "no-store" });
      const body = (await response.json()) as DirectEvents | { error: string };
      if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : "Chain scan failed.");
      setDirectEvents(body);
    } catch (cause) { setDirectError(cause instanceof Error ? cause.message : "Chain scan failed."); }
    finally { setIsScanning(false); }
  }

  async function checkPositionAnalytics() {
    if (!accountSnapshot || isCheckingAnalytics) return;
    setIsCheckingAnalytics(true);
    setAnalytics(null);
    setAnalyticsError(null);
    try {
      const response = await fetch(`/api/accounts/${encodeURIComponent(accountSnapshot.account)}/analytics?market=${encodeURIComponent(selected.symbol)}`, { cache: "no-store" });
      const body = (await response.json()) as PositionAnalytics | { error: string };
      if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : "Position snapshot failed.");
      setAnalytics(body);
    } catch (cause) { setAnalyticsError(cause instanceof Error ? cause.message : "Position snapshot failed."); }
    finally { setIsCheckingAnalytics(false); }
  }

  async function checkTransaction(event: ReceiptEvent) {
    setIsCheckingProof(true);
    setProofError(null);
    setChainProof(null);
    setProofEventId(event.id);
    try {
      const query = event.kind === "Fill" && event.logIndex !== null ? `?logIndex=${event.logIndex}` : "";
      const response = await fetch(`/api/transactions/${encodeURIComponent(event.transactionHash)}${query}`, { cache: "no-store" });
      const body = (await response.json()) as ChainProof | { error: string };
      if (!response.ok || !body || "error" in body) throw new Error(body && "error" in body ? body.error : "The RPC check failed.");
      setChainProof(body);
    } catch (cause) { setProofError(cause instanceof Error ? cause.message : "The RPC check failed."); }
    finally { setIsCheckingProof(false); }
  }

  async function inspectAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadAccount(account);
  }

  function exportReceipt(receipt: PositionReceipt) {
    if (!accountSnapshot) return;
    const content = JSON.stringify({
      product: "Filltrail", network: "Somnia Hideki testnet", chainId: accountSnapshot.chainId,
      account: accountSnapshot.account, checkedAt: accountSnapshot.checkedAt, source: "dreamDEX indexer",
      coverage: "Observed records only; history may be incomplete. Fills, fees, and funding are matched by transaction and market where an episode is unique, not independently attributed. Unmatched activity and gas are excluded; subtotal is not complete net PnL.",
      sourceStatus: accountSnapshot.sourceStatus, morePagesAvailable: accountSnapshot.nextCursor !== null, receipt, reconciliation: reconcilePosition(accountSnapshot, positionReceipts, receipt),
    }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `filltrail-${receipt.market.toLowerCase()}-receipt.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Filltrail home">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>FILLTRAIL</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#explain">What it solves</a>
          <a href="#recorder">Try it</a>
          <a href="#proof">Network proof</a>
        </nav>
        <div className="network-pill">
          <span className="status-dot" />
          Somnia Hideki · Chain {snapshot.chainId}
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">A readable trade record for dreamDEX Perps</p>
          <h1>
            <span>Paste a wallet.</span>
            <span>Understand the trade.</span>
          </h1>
          <p className="hero-description">
            A live, read-only view of dreamDEX Perps activity on Somnia Hideki.
            Enter a public wallet to inspect indexed orders, fills, position changes,
            margin movements, funding, and liquidation events. Missing evidence stays missing.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#recorder">
              Open live recorder <span><ArrowIcon /></span>
            </a>
            <a className="text-action" href="#proof">
              See data sources <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="hero-facts" aria-label="Current product status">
            <div><strong>{snapshot.marketCount}</strong><span>live perp markets</span></div>
            <div><strong>{snapshot.chainId}</strong><span>Somnia chain</span></div>
            <div><strong>Read only</strong><span>no signature for a lookup</span></div>
          </div>
        </div>

        <div className="hero-visual" aria-label="Live market index snapshot">
          <div className="preview-shell">
            <div className="preview-toolbar">
              <div><span className="preview-logo" />dreamDEX market index</div>
              <span className="preview-live"><i /> Live indexer read</span>
            </div>
            <div className="preview-position">
              <div>
                <span>SOMNIA HIDEKI · CHAIN {snapshot.chainId}</span>
                <strong>{selected.symbol}</strong>
              </div>
              <div className="preview-pnl">
                <span>Last indexed fill price</span>
                <strong>{selectedLastPrice}</strong>
              </div>
            </div>
            <div className="live-market-grid">
              <div><span>Pool contract</span><code>{shortenAddress(selected.poolAddress, 12, 10)}</code></div>
              <div><span>Protocol minimum</span><strong>{selectedMinimum}</strong></div>
              <div><span>Indexed fills</span><strong>{selected.tradeCount}</strong></div>
              <div><span>Snapshot read</span><strong>{formatCheckedAt(snapshot.checkedAt)}</strong></div>
            </div>
            <p className="live-market-note">Market metadata is live. No account PnL or trade outcome is shown until a wallet is queried and the evidence is available.</p>
          </div>
        </div>
      </section>

      <div className="connection-band" aria-label="Live connection status">
        <span><i className="status-dot" />Official SDK connected</span>
        <span>{snapshot.marketCount} markets indexed</span>
        <span>BTC-PERP + ETH-PERP ready</span>
        <span>Wallet signs testnet orders only on request</span>
      </div>

      <section className="explain-section" id="explain">
        <div className="explain-heading">
          <p className="eyebrow">The problem Filltrail solves</p>
          <h2>One wallet.<br />Every available source, labeled.</h2>
          <p>A perp position is spread across orders, partial fills, funding payments, margin movements, and position updates. This view brings the available indexed records together without manufacturing a total PnL.</p>
        </div>

        <div className="comparison-card">
          <div className="comparison-before">
            <span className="comparison-label">The source data</span>
            <p>Separate protocol records</p>
            <strong>Orders. Fills. Funding.</strong>
            <small>Each record has its own source, timestamp, and available transaction reference.</small>
          </div>
          <div className="comparison-arrow" aria-hidden="true"><ArrowIcon /></div>
          <div className="comparison-after">
            <span className="comparison-label">The indexed view</span>
            <div><span>What the indexer returned</span><strong>Shown</strong></div>
            <div><span>What the chain receipt proves</span><strong>Checked separately</strong></div>
            <div className="comparison-total"><span>What remains unknown</span><strong>Not invented</strong></div>
            <small>Indexer rows are not independently chain-verified just because they loaded. Check any displayed transaction through the RPC control.</small>
          </div>
        </div>

        <div className="how-flow" aria-label="How Filltrail works">
          <article><span>1</span><div><h3>Enter a public wallet</h3><p>No deposit or private key is needed to read supported testnet activity.</p></div></article>
          <article><span>2</span><div><h3>We rebuild the sequence</h3><p>Orders, fills, funding, and position changes are placed in chronological order.</p></div></article>
          <article><span>3</span><div><h3>You get a readable record</h3><p>See what changed the position and keep the source behind every available claim.</p></div></article>
        </div>
      </section>

      <section className="recorder-section" id="recorder">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Live testnet workspace</p>
            <h2>From wallet address<br />to a clear position story.</h2>
            <p className="section-intro">Choose a supported market and inspect a public wallet. To create a fresh testnet record, connect your wallet, review a small limit order, and approve it yourself.</p>
          </div>
          <div className="refresh-stack">
            <span>Last indexed {formatCheckedAt(snapshot.checkedAt)}</span>
            <button className="refresh-button" onClick={refreshSnapshot} disabled={isRefreshing}>
              {isRefreshing ? "Refreshing…" : "Refresh live data"}
            </button>
          </div>
        </div>

        {refreshError ? <p className="error-banner">{refreshError}</p> : null}

        <div className="workspace">
          <aside className="market-rail" aria-label="Supported markets">
            <div className="rail-heading">
              <p className="panel-label">Choose instrument</p>
              <span>Live</span>
            </div>
            {snapshot.supported.map((market) => (
              <button
                className={market.symbol === selected.symbol ? "market active" : "market"}
                key={market.symbol}
                onClick={() => setSelectedSymbol(market.symbol)}
              >
                <span className="asset-token">{market.baseSymbol}</span>
                <span>
                  <strong>{market.symbol}</strong>
                  <small>{market.tradeCount} indexed fills</small>
                </span>
                <span className="market-arrow" aria-hidden="true">→</span>
              </button>
            ))}
            <div className="rail-note">
              <span className="rail-note-icon" aria-hidden="true" />
              <p><strong>Market discovery live</strong><small>{snapshot.marketCount} perps returned by the official indexer.</small></p>
            </div>
          </aside>

          <article className="capture-panel">
            <div className="capture-header">
              <div>
                <p className="panel-label">Recorder status</p>
                <h3>{selected.symbol} is ready to record.</h3>
              </div>
              <span className="waiting-badge" role="status"><i />{isInspecting ? "Reading account" : accountError ? "Lookup needs attention" : accountSnapshot ? "Account records loaded" : "Ready for account lookup"}</span>
            </div>

            <div className="market-summary">
              <div>
                <span>Instrument</span>
                <strong>{selected.symbol}</strong>
              </div>
              <div>
                <span>Last indexed price</span>
                <strong>{selectedLastPrice}</strong>
              </div>
              <div>
                <span>Protocol minimum</span>
                <strong>{selectedMinimum}</strong>
              </div>
              <div>
                <span>Pool contract</span>
                <strong>{shortenAddress(selected.poolAddress)}</strong>
              </div>
            </div>

            <div className="empty-flight">
              <div className="empty-flight-copy">
                <span className="radar" aria-hidden="true"><span /></span>
                <div>
                <p className="panel-label">Public account lookup</p>
                <h4>Read the records the indexer has.</h4>
                <p>
                  Inspect an existing wallet or create a small testnet order below.
                  A submitted order is not a fill; its outcome must be checked against chain and indexer records.
                </p>
                </div>
              </div>
              <div className="recording-path" aria-label="Recording lifecycle">
                <div className="path-step current"><span /> <p><strong>Market indexed</strong><small>{selected.symbol} configuration loaded</small></p></div>
                <div className="path-step"><span /> <p><strong>Account lookup</strong><small>Public address; no signature</small></p></div>
                <div className="path-step"><span /> <p><strong>Sources returned</strong><small>Orders, fills, margin, funding</small></p></div>
                <div className="path-step"><span /> <p><strong>Chain check</strong><small>Check a transaction separately</small></p></div>
              </div>
            </div>

            <ArchiveViewer />

            <form className="account-lookup" onSubmit={inspectAccount}>
              <div>
                <p className="panel-label">Already traded?</p>
                <label htmlFor="account-address">Inspect an existing testnet wallet.</label>
                <p>Paste a public address. The lookup is read-only and never asks for a signature.</p>
              </div>
              <div className="account-controls">
                <input
                  id="account-address"
                  value={account}
                  onChange={(event) => setAccount(event.target.value)}
                  placeholder="0x…"
                  spellCheck={false}
                  autoComplete="off"
                  aria-describedby="account-privacy"
                />
                <button type="submit" disabled={isInspecting || account.trim().length === 0}>
                  {isInspecting ? "Reading…" : "Inspect trail"}
                </button>
              </div>
              <span className="sr-only" id="account-privacy">Public wallet address only. No signature is requested.</span>
            </form>

            {accountError ? <p className="account-error">{accountError}</p> : null}

            {accountSnapshot ? (
              <div className="account-result">
                <div className="account-result-head">
                  <div>
                    <p className="panel-label">Indexed account activity · Somnia testnet</p>
                    <h4>{shortenAddress(accountSnapshot.account, 10, 8)}</h4>
                  </div>
                  <span>{formatCheckedAt(accountSnapshot.checkedAt)}</span>
                </div>
                <p className="receipt-context">These records come from the official dreamDEX indexer on Somnia Hideki testnet. The market selector changes the position receipt; the positions and event timeline below cover all supported markets. USDso here is testnet collateral, not real dollars. Counts reflect loaded records, not lifetime totals. The address below is the account you entered; it may belong to someone else.</p>
                <p className="receipt-context"><strong>Account:</strong> <code className="full-address">{accountSnapshot.account}</code> · <strong>Source:</strong> dreamDEX indexer · <strong>Network:</strong> Hideki, chain {accountSnapshot.chainId}. The app does not independently index the chain or calculate complete trade PnL. <a href="https://app.dreamdex.io/docs/developers/perps-testnet" target="_blank" rel="noreferrer">See dreamDEX network documentation ↗</a></p>
                {submittedHash && accountSnapshot.account.toLowerCase() === account.trim().toLowerCase() ? <p className="receipt-context">Submitted transaction {shortenAddress(submittedHash, 12, 10)}: {receiptEvents.some((event) => event.transactionHash.toLowerCase() === submittedHash.toLowerCase()) ? "matching indexed lifecycle event found below" : "no matching indexed event yet; this does not prove a fill. Refresh the wallet lookup after the indexer catches up."}</p> : null}
                <div className="evidence-counts">
                  <div><strong>{accountSnapshot.positions.length}</strong><span>Positions loaded</span></div>
                  <div><strong>{new Set([...accountSnapshot.openOrders, ...accountSnapshot.orderHistory].map((order) => order.id)).size}</strong><span>Orders loaded</span></div>
                  <div><strong>{accountSnapshot.fills.length}</strong><span>Fills loaded</span></div>
                  <div><strong>{accountSnapshot.positionChanges.length}</strong><span>Changes loaded</span></div>
                  <div><strong>{accountSnapshot.marginEvents.length}</strong><span>Margin rows loaded</span></div>
                  <div><strong>{accountSnapshot.funding.length}</strong><span>Funding loaded</span></div>
                  <div><strong>{accountSnapshot.fees.length}</strong><span>Fee records loaded</span></div>
                  <div><strong>{accountSnapshot.liquidations.length}</strong><span>Liquidation stages loaded</span></div>
                </div>
                <div className="receipt-sources" aria-label="Indexer source status">
                  {Object.entries(accountSnapshot.sourceStatus).map(([name, source]) => (
                    <div key={name}><strong>{name.replace(/([A-Z])/g, " $1")}</strong><span className={source.state}>{source.state}</span><small>{source.detail}</small></div>
                  ))}
                </div>
                <section className="position-receipt" aria-label="Position receipt">
                  <div className="position-receipt-head">
                    <div><p className="panel-label">Position receipt · {selected.symbol}</p><h5>Follow one position.</h5></div>
                    {selectedReceipt ? <button type="button" className="receipt-export" onClick={() => exportReceipt(selectedReceipt)}>Download evidence JSON</button> : null}
                  </div>
                  {selectedReceipt ? <>
                    <label className="receipt-select">Observed position
                      <select value={selectedReceipt.id} onChange={(event) => { setSelectedReceiptId(event.target.value); setGasError(null); }}>
                        {positionReceipts.map((receipt) => <option key={receipt.id} value={receipt.id}>{formatEventTime(receipt.changes[0].timestamp)} · {receipt.startObserved ? "opening observed" : "opening not loaded"} · {receipt.end}</option>)}
                      </select>
                    </label>
                    <div className="receipt-summary-grid">
                      <div><span>Opening</span><strong>{selectedReceipt.startObserved ? "Observed" : "Not loaded"}</strong></div>
                      <div><span>End</span><strong>{selectedReceipt.end === "closed" ? "Close observed" : selectedReceipt.end === "flipped" ? "Direction flipped" : "Not observed"}</strong></div>
                      <div><span>Matched fills</span><strong>{selectedReceipt.fills.length}</strong></div>
                      <div><span>Observed price PnL</span><strong title={`Exact indexed sum: ${selectedReceipt.observedPricePnl} USDso`}>{displayMoney(selectedReceipt.observedPricePnl)} USDso</strong></div>
                    </div>
                    <p className="receipt-explanation">Observed realized price PnL is the sum of loaded position-change values. It does not include the current unrealized PnL of an open position or the final net result. The exact sum is in the evidence export. Fills are associated by matching market and transaction; orders are matched to those fills by order ID. Only uniquely transaction-matched funding and fee records are included below; unmatched activity is not attributed.</p>
                    <p className="receipt-explanation">{Object.values(accountSnapshot.sourceStatus).some((source) => source.state === "unavailable") ? "Some sources are unavailable; inspect this wallet again to retry. " : accountSnapshot.nextCursor ? "Older records are available; load them to look for missing history. " : "No further page was returned for this lookup. "}The indexer can still have gaps, and a flip or missing opening may make this receipt partial.</p>
                    {reconciliation ? <div className="receipt-reconciliation">
                      <h5>Observed costs and credits</h5>
                      <div className="receipt-summary-grid">
                        <div><span>Price PnL</span><strong>{selectedReceipt.observedPricePnl} USDso</strong></div>
                        <div><span>Matched fees and rebates</span><strong>{accountSnapshot.sourceStatus.fees.state === "unavailable" ? "Unavailable" : `${reconciliation.feeImpact} USDso`}</strong></div>
                        <div><span>Matched funding impact</span><strong>{accountSnapshot.sourceStatus.funding.state === "unavailable" ? "Unavailable" : `${reconciliation.fundingImpact} USDso`}</strong></div>
                        <div><span>Observed subtotal</span><strong>{accountSnapshot.sourceStatus.fees.state === "unavailable" || accountSnapshot.sourceStatus.funding.state === "unavailable" ? "Unavailable" : `${reconciliation.observedSubtotal} USDso`}</strong></div>
                      </div>
                      <p className="receipt-explanation">Only loaded records sharing a uniquely associated market and transaction are included. {reconciliation.fees.length} fee records and {reconciliation.funding.length} funding records matched. {reconciliation.unmatchedFees.length} fee and {reconciliation.unmatchedFunding.length} funding records for this market were not matched to this position. Missing pages, account-wide rows, fees, funding, gas and ambiguous events can change the result. This subtotal is not complete net PnL.</p>
                      {reconciliation.liquidationEvents.length ? <p className="receipt-explanation"><strong>Liquidation-related activity was indexed in a transaction associated with this position.</strong> Liquidation-specific costs are not included in this subtotal. Inspect the indexed records and chain evidence; a shared transaction alone does not establish every cost.</p> : null}
                      {accountSnapshot.sourceStatus.fees.state === "unavailable" || accountSnapshot.sourceStatus.funding.state === "unavailable" ? <p className="account-error">A cost source is unavailable; the subtotal omits records that could not be read.</p> : null}
                    </div> : null}
                    <details className="receipt-evidence"><summary>Check transaction gas</summary>
                      <p className="receipt-explanation">Check gas paid by this wallet for the observed transaction hashes. A transaction can contain other actions, so this is not necessarily the cost of this position.</p>
                      <button type="button" className="receipt-export" onClick={() => void checkGas()} disabled={checkingGas}>{checkingGas ? "Checking gas…" : "Check gas in STT"}</button>
                      {gasError ? <p className="account-error" role="status">{gasError}</p> : null}
                      {gasResult && gasResult.account.toLowerCase() === accountSnapshot.account.toLowerCase() && gasResult.receiptId === selectedReceipt.id && gasResult.hashKey === receiptHashes.join(",") ? <p className="receipt-explanation" role="status"><strong>{gasResult.totalSTT} STT</strong> paid by this wallet across {gasResult.paid} of {gasResult.checked} observed transactions. {gasResult.other} had a different sender; {gasResult.unavailable} receipts were unavailable. Unobserved transactions are excluded; this is not converted to USDso or included in net PnL.</p> : null}
                    </details>
                    <div className="receipt-reconciliation">
                      <p className="receipt-explanation">Compare the first loaded position-change block against MarginBank events read directly from the chain. This checks one block only.</p>
                      <button type="button" className="receipt-export" onClick={() => void checkOpeningBlock()} disabled={isScanning}>{isScanning ? "Checking chain…" : "Check first change on chain"}</button>
                      {directError ? <p className="account-error" role="status">{directError}</p> : null}
                      {directEvents && directEvents.account.toLowerCase() === accountSnapshot.account.toLowerCase() && directEvents.market === selectedReceipt.market && directEvents.fromBlock === selectedReceipt.changes[0].blockNumber ? <div role="status"><p className="receipt-explanation"><strong>First indexed change: {comparePositionChange(selectedReceipt.changes[0], directEvents.rows) === "matches" ? "size and realized price PnL match the chain event" : comparePositionChange(selectedReceipt.changes[0], directEvents.rows) === "different" ? "the chain event differs; inspect the records" : "matching chain event not found"}.</strong> {directEvents.source} · block {directEvents.fromBlock} · {directEvents.rows.length} matching events. {directEvents.note}</p>{directEvents.rows.map((row) => <p className="receipt-explanation" key={`${row.transactionHash}-${row.logIndex}`}><strong>{row.type}</strong> · log {row.logIndex} · {row.size !== null ? `position size ${row.size}; price ${row.price}; realized price PnL ${row.realizedPricePnl} USDso` : `amount ${row.amount} USDso`} · <code>{row.transactionHash}</code></p>)}</div> : null}
                    </div>
                    <details className="receipt-evidence"><summary>Compare a local event archive</summary>
                      <p className="receipt-explanation">Import an archive created by the local backfill command. The file stays in this browser; it can be edited and is not independently authenticated.</p>
                      <label className="receipt-select">Archive JSON<input type="file" accept="application/json,.json" onChange={(event) => void importArchive(event.target.files?.[0])} /></label>
                      {archiveError ? <p className="account-error" role="status">{archiveError}</p> : null}
                      {localArchive && localArchive.account.toLowerCase() === accountSnapshot.account.toLowerCase() && localArchive.market === selected.symbol && localArchive.pool.toLowerCase() === selected.poolAddress.toLowerCase() ? <div role="status"><p className="receipt-explanation">Local file · blocks {localArchive.startBlock}–{localArchive.checkpoint} · {localArchive.rows.length} stored events. Coverage is limited to its stated range and event types.</p>{compareArchiveChanges(selectedReceipt.changes,localArchive).map(({change,status}) => <p className="receipt-explanation" key={change.id}>Position change at block {change.blockNumber}, log {change.logIndex}: <strong>{status}</strong>.</p>)}{(() => { const summary = summarizeArchiveReceipt(selectedReceipt,positionReceipts,localArchive); return summary ? <p className="receipt-explanation">Local-file subtotal for this covered closed position: <strong>{summary.subtotal} USDso</strong>, including {summary.costCount} captured funding, fee, or rebate events with a combined impact of {summary.costImpact} USDso. This editable file is not authenticated and excludes gas and other event kinds; it is not complete net PnL.</p> : <p className="receipt-explanation">A local-file subtotal is unavailable because the opening, close, coverage, or position-change comparison is incomplete or ambiguous.</p>; })()}</div> : null}
                    </details>
                    <details className="receipt-evidence"><summary>Show {selectedReceiptEvents.length} observed records and transaction hashes</summary>
                      {selectedReceiptEvents.map((event) => <div key={event.id}><span>{formatEventTime(event.timestamp)} · {event.kind} · {event.title}</span><a href={`#event-${encodeURIComponent(event.id)}`}>View event and check transaction</a><code>{event.transactionHash}</code></div>)}
                    </details>
                  </> : <p className="receipt-explanation">No position changes for {selected.symbol} are loaded yet. Try the other market or load older records.</p>}
                </section>
                <section className="position-receipt" aria-label="Current on-chain position snapshot">
                  <div className="position-receipt-head"><div><p className="panel-label">Current on-chain snapshot · {selected.symbol}</p><h5>What is the current position?</h5></div><button type="button" className="receipt-export" onClick={() => void checkPositionAnalytics()} disabled={isCheckingAnalytics}>{isCheckingAnalytics ? "Checking…" : "Check current position"}</button></div>
                  <p className="receipt-explanation">This reads the current position and mark from the chain at one block. It is separate from the historical receipt above.</p>
                  {analyticsError ? <p className="account-error" role="status">{analyticsError}</p> : null}
                  {analytics && analytics.market === selected.symbol && analytics.account.toLowerCase() === accountSnapshot.account.toLowerCase() ? <div role="status">
                    <p className="receipt-explanation">Somnia Hideki · block {analytics.block} · checked {formatCheckedAt(analytics.checkedAt)}. Signed position size: {analytics.size} {selected.baseSymbol} (negative means short).</p>
                    {analytics.size === "0" ? <p className="receipt-explanation">No open position was found for this market at that block.</p> : analytics.priceable ? <><div className="receipt-summary-grid">
                      <div><span>Mark price</span><strong>{analytics.markPrice} {analytics.quote}</strong></div>
                      <div><span>Unrealized price PnL</span><strong>{analytics.unrealizedPricePnl} {analytics.quote}</strong></div>
                      <div><span>Accrued funding owed</span><strong>{analytics.accruedFundingOwed} {analytics.quote}</strong></div>
                      <div><span>Price PnL minus funding</span><strong>{analytics.equityContribution} {analytics.quote}</strong></div>
                    </div><p className="receipt-explanation">Positive funding owed is a cost; negative means a credit. This is a point-in-time position contribution, not total account or trade profit: realized PnL, settled funding, fees and gas are not included.</p></> : <p className="receipt-explanation">The mark feed is unavailable or stale, so price PnL and funding cannot be calculated for this snapshot.</p>}
                  </div> : null}
                </section>
                {accountSnapshot.positions.length > 0 ? (
                  <div className="position-summary">
                    <h5>Indexed positions</h5>
                    <div className="position-list">{accountSnapshot.positions.map((position) => (
                      <article key={position.market}>
                        <strong>{position.market} · {position.side}</strong>
                        <span>Size: {position.size} {position.market.split("-")[0]}</span>
                        <span>Average entry: {position.averageEntryPrice === null ? "Not indexed" : `${position.averageEntryPrice} USDso`}</span>
                        <span>Last update realized price PnL: {position.realizedPricePnl === null ? "Not indexed" : `${position.realizedPricePnl} USDso`}</span>
                        <small>Updated {formatEventTime(position.updatedAt)}{position.updatedAtBlock ? ` · block ${position.updatedAtBlock}` : ""}</small>
                      </article>
                    ))}</div>
                  </div>
                ) : null}
                {receiptEvents.length > 0 ? (
                  <div className="receipt-timeline">
                    <h5>All supported market events loaded · oldest first</h5>
                    {receiptEvents.map((event) => (
                      <article key={event.id} id={`event-${event.id}`}>
                        <span className="timeline-marker" aria-hidden="true" />
                        <div><span className="event-kind">{event.kind}</span><h6>{event.market} · {event.title}</h6><p>{event.detail}</p><small>{formatEventTime(event.timestamp)}{event.blockNumber ? ` · block ${event.blockNumber}` : ""}</small></div>
                        <div className="event-proof"><code title={event.transactionHash}>{shortenAddress(event.transactionHash, 10, 8)}</code><button type="button" onClick={() => void checkTransaction(event)} disabled={isCheckingProof}>{isCheckingProof && proofEventId === event.id ? "Checking…" : "Check on chain"}</button></div>
                        {proofEventId === event.id ? <div className="chain-proof" role="status" aria-live="polite">
                          {isCheckingProof ? <span>Checking the Somnia Hideki RPC…</span> : null}
                          {proofError ? <p className="proof-error">{proofError}</p> : null}
                          {chainProof ? <><strong>Transaction {chainProof.status}</strong><span>Somnia Hideki RPC · block {chainProof.blockNumber} · {formatEventTime(chainProof.timestamp)} · {chainProof.logCount} logs</span><code>{chainProof.hash}</code>{chainProof.logNote ? <p>{chainProof.logNote}</p> : null}{chainProof.fill ? <p><strong>On-chain fill:</strong> {chainProof.fill.quantity} {chainProof.fill.baseSymbol} at {chainProof.fill.price} {chainProof.fill.quoteSymbol} · {chainProof.fill.market} · log {chainProof.logIndex}<br /><code>Pool: {chainProof.fill.pool}</code></p> : null}<p>{chainProof.note}</p></> : null}
                        </div> : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="no-events">
                    No supported events were returned for this address. The wallet may not have traded these markets, or the indexer may not have recorded its activity yet. Check the source status above.
                  </p>
                )}
                {accountSnapshot.nextCursor ? <button className="load-older" type="button" onClick={() => void loadOlder()} disabled={isLoadingOlder}>{isLoadingOlder ? "Loading older records…" : "Load older records"}</button> : <p className="receipt-context">{Object.values(accountSnapshot.sourceStatus).some((source) => source.state === "unavailable") ? "Some sources are unavailable. Inspect the wallet again to retry before loading older records." : "No more rows were reported by the available indexer sources for this lookup."}</p>}
                <p className="receipt-context">Older pages may shift when new activity is indexed. Open orders are drawn from an SDK response capped at 1,000, so a larger open-order history may be incomplete.</p>
              </div>
            ) : null}

            <TradeReview key={selected.poolAddress} market={selected} onConfirmed={(address, hash) => { setSubmittedHash(hash); setAccount(address); void loadAccount(address); }} />

            <div className="capture-footer">
              <p><span className="status-dot" />Live market configuration indexed. Signing requires an explicit wallet action.</p>
              <span className="footer-state">Testnet only</span>
            </div>
          </article>
        </div>
      </section>

      <section className="mechanics-section" id="mechanics">
        <div className="mechanics-layout">
          <div>
            <p className="eyebrow">What the recorder keeps</p>
          <h2>Every indexed event has a source.</h2>
            <p className="section-intro">A position moves through multiple contracts and events. Filltrail shows the available sequence and makes missing data visible.</p>
            <a className="text-action" href="#proof">See the live proof <span aria-hidden="true">→</span></a>
          </div>
          <div className="mechanic-stream">
            <article><span className="stream-icon intent-icon" aria-hidden="true" /><div><p className="panel-label">Wallet intent</p><h3>What was requested?</h3><p>Market, side, size, limit, account, and the transaction that carried the instruction.</p></div><small>Transaction source</small></article>
            <article><span className="stream-icon execution-icon" aria-hidden="true" /><div><p className="panel-label">Execution</p><h3>What actually filled?</h3><p>Loaded fills show quantity, price, role, and block or log position where the indexer provides them.</p></div><small>Indexer source</small></article>
            <article><span className="stream-icon outcome-icon" aria-hidden="true" /><div><p className="panel-label">Position changes</p><h3>What changed?</h3><p>Indexed size changes, realized price PnL fields, margin movements, and funding are shown separately.</p></div><small>Indexer source</small></article>
            <article><span className="stream-icon receipt-icon" aria-hidden="true" /><div><p className="panel-label">Chain receipt</p><h3>Was a transaction included?</h3><p>Check its hash on the network. A successful transaction does not by itself verify every indexed field.</p></div><small>RPC source</small></article>
          </div>
        </div>
      </section>

      <section className="proof-section" id="proof">
        <div>
          <p className="eyebrow light">Connected where it counts</p>
          <h2>Built on live evidence.</h2>
          <p>
            The interface reads the official dreamDEX testnet indexer through the
            Somnia Markets SDK. Optional order submission uses your browser wallet;
            a transaction check reads the chain RPC separately. The indexer remains the source of account rows.
          </p>
        </div>
        <dl className="proof-ledger">
          <div><dt>Network</dt><dd>Somnia Hideki · {snapshot.chainId}</dd></div>
          <div><dt>Instruments</dt><dd>BTC-PERP · ETH-PERP</dd></div>
          <div><dt>Market records</dt><dd>{snapshot.marketCount} returned live</dd></div>
          <div><dt>Evidence state</dt><dd><span className="ledger-dot" />Indexer sourced; transactions checkable</dd></div>
          <div><dt>Signing state</dt><dd>Explicit browser-wallet action</dd></div>
        </dl>
      </section>

      <section className="final-cta">
        <div>
          <p className="eyebrow">Start with evidence</p>
          <h2>Bring a wallet.<br />Leave with clarity.</h2>
        </div>
        <a className="primary-action" href="#recorder">
          Inspect a wallet <span><ArrowIcon /></span>
        </a>
      </section>

      <footer>
        <div className="footer-brand">
          <a className="brand brand-light" href="#top" aria-label="Back to top">
            <span className="brand-mark" aria-hidden="true"><span /></span>
            <span>FILLTRAIL</span>
          </a>
          <p>Readable indexed activity for dreamDEX Perps.</p>
        </div>
        <div className="footer-links">
          <div><span>Product</span><a href="#recorder">Recorder</a><a href="#mechanics">How it works</a></div>
          <div><span>Evidence</span><a href="#proof">Live status</a><a href="#recorder">Inspect wallet</a></div>
        </div>
        <div className="footer-status">
          <span><i className="status-dot" />Somnia testnet</span>
          <small>Testnet · No custody</small>
        </div>
      </footer>
    </main>
  );
}
