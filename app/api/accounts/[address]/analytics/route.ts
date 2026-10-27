import { getAddress, isAddress, formatUnits } from "viem";
import { NextResponse } from "next/server";
import { createDreamDexClient, DREAMDEX_CHAIN } from "@/lib/dreamdex/config";
import { getMarketSnapshot } from "@/lib/dreamdex/markets";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ address: string }> }) {
  const { address } = await context.params;
  const symbol = new URL(request.url).searchParams.get("market");
  if (!isAddress(address) || (symbol !== "ETH-PERP" && symbol !== "BTC-PERP")) {
    return NextResponse.json({ error: "Enter a valid wallet and supported market." }, { status: 400 });
  }
  try {
    const { supported } = await getMarketSnapshot();
    const market = supported.find((item) => item.symbol === symbol);
    if (!market) throw new Error("Market unavailable");
    const account = getAddress(address);
    const result = await createDreamDexClient().client.getPerpPositionAnalytics({ account, marginBank: market.marginBank, pool: market.poolAddress });
    const common = { account, market: symbol, chainId: DREAMDEX_CHAIN.id, block: result.asOfBlock.toString(), checkedAt: new Date().toISOString(), size: formatUnits(result.size, market.baseDecimals), priceable: result.priceable };
    return NextResponse.json(result.priceable ? {
      ...common, markPrice: formatUnits(result.markPrice, market.quoteDecimals), entryPrice: formatUnits(result.avgEntryPrice, market.quoteDecimals),
      unrealizedPricePnl: formatUnits(result.unrealizedPnl, market.quoteDecimals), accruedFundingOwed: formatUnits(result.accruedFunding, market.quoteDecimals), equityContribution: formatUnits(result.equityContribution, market.quoteDecimals), quote: market.quoteSymbol,
    } : common, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The on-chain position snapshot is unavailable. Try again; historical indexed records are unaffected." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
