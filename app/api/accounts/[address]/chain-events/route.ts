import { createPublicClient, erc20Abi, getAddress, http, isAddress, parseAbi, parseAbiItem, formatUnits } from "viem";
import { NextResponse } from "next/server";
import { DREAMDEX_CHAIN } from "@/lib/dreamdex/config";
import { getMarketSnapshot } from "@/lib/dreamdex/markets";

export const dynamic = "force-dynamic";
const events = [
  parseAbiItem("event PositionUpdated(address indexed account, address indexed perpPool, int128 newSize, uint128 avgEntryPrice, int256 realizedPnl, int256 entryFundingIndex)"),
  parseAbiItem("event FundingSettled(address indexed account, address indexed perpPool, int256 payment)"),
  parseAbiItem("event FeeCharged(address indexed account, address indexed perpPool, uint256 amount, uint256 insurancePortion)"),
  parseAbiItem("event RebatePaid(address indexed account, address indexed perpPool, uint256 amount)"),
] as const;

/** Bounded direct RPC scan, not a complete index or proof that historical logs are retained. */
export async function GET(request: Request, context: { params: Promise<{ address: string }> }) {
  const { address } = await context.params;
  const query = new URL(request.url).searchParams;
  const symbol = query.get("market");
  const suppliedPool = query.get("pool");
  const fromText = query.get("fromBlock");
  const toText = query.get("toBlock");
  if (!isAddress(address) || (symbol !== "ETH-PERP" && symbol !== "BTC-PERP") || (suppliedPool !== null && !isAddress(suppliedPool)) || !fromText || !toText || !/^\d{1,16}$/.test(fromText) || !/^\d{1,16}$/.test(toText)) return NextResponse.json({ error: "Enter a valid account, market, pool, and block range." }, { status: 400 });
  const fromBlock = BigInt(fromText), toBlock = BigInt(toText);
  if (toBlock < fromBlock || toBlock - fromBlock > 999n) return NextResponse.json({ error: "Use an ordered range of at most 1,000 blocks." }, { status: 400 });
  try {
    const client = createPublicClient({ chain: DREAMDEX_CHAIN, transport: http() });
    let market: { marginBank: `0x${string}`; poolAddress: `0x${string}`; baseDecimals: number; quoteDecimals: number };
    if (suppliedPool) {
      if (await client.getChainId() !== DREAMDEX_CHAIN.id) throw new Error("RPC chain mismatch");
      const poolAddress = getAddress(suppliedPool);
      const poolAbi = parseAbi(["function marginBank() view returns (address)", "function getOneBase() view returns (uint256)"]);
      const [marginBank, oneBase] = await Promise.all([client.readContract({address:poolAddress,abi:poolAbi,functionName:"marginBank"}), client.readContract({address:poolAddress,abi:poolAbi,functionName:"getOneBase"})]);
      const unit = oneBase.toString();
      if (!/^10*$/.test(unit) || unit.length > 79) throw new Error("Invalid base unit");
      const bankAbi = parseAbi(["function getSystemConfig() view returns ((address marginBank, address collateralToken, address perpPoolFactory, address liquidationEngine, address insuranceFund, address feeRecipient, uint16 maxLeverageLimit, bool fullyWired))"]);
      const system = await client.readContract({address:marginBank,abi:bankAbi,functionName:"getSystemConfig"});
      if (system.marginBank.toLowerCase() !== marginBank.toLowerCase()) throw new Error("Inconsistent bank metadata");
      const quoteDecimals = await client.readContract({address:system.collateralToken,abi:erc20Abi,functionName:"decimals"});
      if (quoteDecimals > 77) throw new Error("Invalid collateral decimals");
      market = { marginBank, poolAddress, baseDecimals: unit.length-1, quoteDecimals };
    } else {
      const { supported } = await getMarketSnapshot();
      const discovered = supported.find((item) => item.symbol === symbol);
      if (!discovered) throw new Error("Market unavailable");
      market = discovered;
    }
    const account = getAddress(address);
    const blocks = await Promise.all(events.map((event) => client.getLogs({ address: market.marginBank, event, args: { account, perpPool: market.poolAddress }, fromBlock, toBlock, strict: true })));
    const rows = blocks.flat().map((log) => {
      const args = log.args as { newSize?: bigint; avgEntryPrice?: bigint; realizedPnl?: bigint; payment?: bigint; amount?: bigint };
      return { type: log.eventName, transactionHash: log.transactionHash, blockNumber: log.blockNumber.toString(), logIndex: log.logIndex, size: args.newSize === undefined ? null : formatUnits(args.newSize, market.baseDecimals), price: args.avgEntryPrice === undefined ? null : formatUnits(args.avgEntryPrice, market.quoteDecimals), realizedPricePnl: args.realizedPnl === undefined ? null : formatUnits(args.realizedPnl, market.quoteDecimals), amount: args.payment !== undefined ? formatUnits(args.payment, market.quoteDecimals) : args.amount !== undefined ? formatUnits(args.amount, market.quoteDecimals) : null };
    }).sort((a,b) => BigInt(a.blockNumber) < BigInt(b.blockNumber) ? -1 : BigInt(a.blockNumber) > BigInt(b.blockNumber) ? 1 : a.logIndex - b.logIndex);
    return NextResponse.json({ source: "Somnia Hideki RPC", chainId: DREAMDEX_CHAIN.id, account, market: symbol, bank: market.marginBank, pool: market.poolAddress, fromBlock: fromText, toBlock: toText, rows, note: `${suppliedPool ? "The supplied pool and market label are not independently authenticated. " : ""}Direct logs for this bounded range only; not a complete history. RPC responses are not proof-authenticated and recent blocks can change. Funding payment is positive when owed; fee amounts are debits and rebates are credits.` }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "The direct chain scan failed. The RPC may not retain the requested logs; try a smaller range." }, { status: 502, headers: { "Cache-Control": "no-store" } }); }
}
