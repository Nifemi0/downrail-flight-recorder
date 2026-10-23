import type { PerpMarket } from "@somnia-chain/markets-sdk";
import { describe, expect, it } from "vitest";

import { normalizePerpMarket } from "./markets";

const baseMarket = {
  id: "0x1111111111111111111111111111111111111111",
  chainId: 50383,
  marketType: "PERP",
  poolAddress: "0x1111111111111111111111111111111111111111",
  lastPrice: "2500000000000000000000",
  lastTradeAt: "1792750000",
  cumulativeBaseVolume: "1000000000000000000",
  cumulativeQuoteVolume: "2500000000000000000000",
  tradeCount: "42",
  baseDecimals: 18,
  quoteDecimals: 18,
  createdAtTimestamp: "1792700000",
  createdAtBlock: "100",
  baseToken: "0x2222222222222222222222222222222222222222",
  quoteToken: "0x3333333333333333333333333333333333333333",
  baseSymbol: "ETH",
  quoteSymbol: "USDso",
  baseIsNative: false,
  tickSize: "10000000000000000",
  lotSize: "100000000000000",
  minQuantity: "4000000000000000",
  marginBank: "0x4444444444444444444444444444444444444444",
  initialMarginBps: 500,
  stopRegistry: "0x5555555555555555555555555555555555555555",
} as unknown as PerpMarket;

describe("normalizePerpMarket", () => {
  it("preserves raw protocol units and supported market metadata", () => {
    expect(normalizePerpMarket(baseMarket)).toMatchObject({
      symbol: "ETH-PERP",
      baseSymbol: "ETH",
      quoteSymbol: "USDso",
      baseDecimals: 18,
      quoteDecimals: 18,
      minQuantity: "4000000000000000",
      tradeCount: "42",
    });
  });

  it("rejects perp markets outside the MVP asset scope", () => {
    expect(normalizePerpMarket({ ...baseMarket, baseSymbol: "SOL" })).toBeNull();
  });
});
