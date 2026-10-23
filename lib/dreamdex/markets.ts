import type { PerpMarket } from "@somnia-chain/markets-sdk";

import {
  createDreamDexClient,
  DREAMDEX_CHAIN,
  DREAMDEX_INDEXER_URL,
} from "./config";

export type SupportedPerpMarket = {
  symbol: "BTC-PERP" | "ETH-PERP";
  baseSymbol: "BTC" | "ETH";
  quoteSymbol: string;
  poolAddress: `0x${string}`;
  marginBank: `0x${string}`;
  quoteToken: `0x${string}`;
  stopRegistry: `0x${string}` | null;
  baseDecimals: number;
  quoteDecimals: number;
  tickSize: string;
  lotSize: string;
  minQuantity: string;
  lastPrice: string | null;
  lastTradeAt: string | null;
  tradeCount: string;
};

export type MarketSnapshot = {
  checkedAt: string;
  chainId: number;
  networkName: string;
  indexerUrl: string;
  marketCount: number;
  supported: SupportedPerpMarket[];
};

function isSupportedBase(
  symbol: string | null,
): symbol is SupportedPerpMarket["baseSymbol"] {
  return symbol === "BTC" || symbol === "ETH";
}

export function normalizePerpMarket(market: PerpMarket): SupportedPerpMarket | null {
  if (!isSupportedBase(market.baseSymbol)) return null;

  return {
    symbol: `${market.baseSymbol}-PERP`,
    baseSymbol: market.baseSymbol,
    quoteSymbol: market.quoteSymbol ?? "USDso",
    poolAddress: market.poolAddress,
    marginBank: market.marginBank,
    quoteToken: market.quoteToken,
    stopRegistry: market.stopRegistry,
    baseDecimals: market.baseDecimals,
    quoteDecimals: market.quoteDecimals,
    tickSize: market.tickSize,
    lotSize: market.lotSize,
    minQuantity: market.minQuantity,
    lastPrice: market.lastPrice,
    lastTradeAt: market.lastTradeAt,
    tradeCount: market.tradeCount,
  };
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const exchange = createDreamDexClient();
  const markets = await exchange.client.listPerpMarkets();
  const supported = markets
    .map(normalizePerpMarket)
    .filter((market): market is SupportedPerpMarket => market !== null)
    .sort((left, right) => left.symbol.localeCompare(right.symbol));

  if (supported.length !== 2) {
    throw new Error(
      `Expected BTC-PERP and ETH-PERP, received ${supported.length} supported markets.`,
    );
  }

  return {
    checkedAt: new Date().toISOString(),
    chainId: DREAMDEX_CHAIN.id,
    networkName: DREAMDEX_CHAIN.name,
    indexerUrl: DREAMDEX_INDEXER_URL,
    marketCount: markets.length,
    supported,
  };
}
