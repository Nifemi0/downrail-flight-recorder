import { createPublicClient, decodeEventLog, formatUnits, http, isHex, parseAbiItem } from "viem";
import { NextResponse } from "next/server";

import { DREAMDEX_CHAIN } from "@/lib/dreamdex/config";
import { getMarketSnapshot } from "@/lib/dreamdex/markets";

export const dynamic = "force-dynamic";

const orderFilled = parseAbiItem("event OrderFilled(uint128 indexed takerOrderId, uint128 indexed makerOrderId, uint256 quantityFilled, uint256 takerRemainingQuantity, uint256 makerRemainingQuantity, uint256 fillPrice)");

export async function GET(request: Request, context: { params: Promise<{ hash: string }> }) {
  const { hash } = await context.params;
  if (!isHex(hash) || hash.length !== 66) {
    return NextResponse.json({ error: "Enter a full transaction hash." }, { status: 400 });
  }
  const query = new URL(request.url).searchParams;
  const logIndexValue = query.get("logIndex");
  if (logIndexValue !== null && (!/^\d+$/.test(logIndexValue) || !Number.isSafeInteger(Number(logIndexValue)))) {
    return NextResponse.json({ error: "Invalid log index." }, { status: 400 });
  }
  try {
    const client = createPublicClient({ chain: DREAMDEX_CHAIN, transport: http() });
    const receipt = await client.getTransactionReceipt({ hash });
    const block = await client.getBlock({ blockNumber: receipt.blockNumber });
    const log = logIndexValue === null ? undefined : receipt.logs.find((item) => item.logIndex === Number(logIndexValue));
    let fill: { pool: string; market: string; quantity: string; price: string; baseSymbol: string; quoteSymbol: string } | null = null;
    let logNote: string | null = logIndexValue === null ? null : log ? "Log found in this transaction." : "The requested log index was not found in this transaction.";
    if (log) {
      try {
        const decoded = decodeEventLog({ abi: [orderFilled], data: log.data, topics: log.topics });
        const markets = await getMarketSnapshot();
        const market = markets.supported.find((item) => item.poolAddress.toLowerCase() === log.address.toLowerCase());
        if (market) {
          fill = { pool: log.address, market: market.symbol, quantity: formatUnits(decoded.args.quantityFilled, market.baseDecimals), price: formatUnits(decoded.args.fillPrice, market.quoteDecimals), baseSymbol: market.baseSymbol, quoteSymbol: market.quoteSymbol };
          logNote = "OrderFilled log decoded from the supported pool. Compare these on-chain values with the indexed fill; wallet involvement is not independently checked here.";
        }
      } catch {
        logNote = "Log found, but it could not be decoded and matched to supported market metadata.";
      }
    }
    return NextResponse.json({
      source: "Somnia Hideki RPC",
      chainId: DREAMDEX_CHAIN.id,
      hash: receipt.transactionHash,
      status: receipt.status,
      blockNumber: receipt.blockNumber.toString(),
      timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
      from: receipt.from,
      to: receipt.to,
      logCount: receipt.logs.length,
      logIndex: logIndexValue === null ? null : Number(logIndexValue),
      logNote,
      fill,
      note: "This proves the transaction receipt exists on the configured chain. It does not independently decode or verify every indexed row in that transaction.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not retrieve the transaction receipt from the Somnia Hideki RPC. It may be unavailable, pending, or the network request may have failed; try again." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
