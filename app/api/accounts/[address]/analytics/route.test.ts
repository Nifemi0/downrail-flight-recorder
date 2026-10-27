import { beforeEach, describe, expect, it, vi } from "vitest";
const { analytics } = vi.hoisted(() => ({ analytics: vi.fn() }));
vi.mock("@/lib/dreamdex/config", () => ({ DREAMDEX_CHAIN: { id: 50383 }, createDreamDexClient: () => ({ client: { getPerpPositionAnalytics: analytics } }) }));
vi.mock("@/lib/dreamdex/markets", () => ({ getMarketSnapshot: async () => ({ supported: [{ symbol: "ETH-PERP", marginBank: "0x1111111111111111111111111111111111111111", poolAddress: "0x2222222222222222222222222222222222222222", baseDecimals: 18, quoteDecimals: 18, quoteSymbol: "USDso" }] }) }));
import { GET } from "./route";
const address = "0x0000000000000000000000000000000000000001";
const request = (market: string) => new Request(`http://localhost/api/accounts/${address}/analytics?market=${market}`);
const context = { params: Promise.resolve({ address }) };
beforeEach(() => analytics.mockReset());
describe("position analytics endpoint", () => {
  it("returns block-pinned values and preserves the funding-owed sign", async () => {
    analytics.mockResolvedValue({ priceable: true, asOfBlock: 55n, size: 1000000000000000000n, markPrice: 2000000000000000000000n, avgEntryPrice: 2100000000000000000000n, unrealizedPnl: -100000000000000000000n, accruedFunding: 1000000000000000000n, equityContribution: -101000000000000000000n });
    const response = await GET(request("ETH-PERP"), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ block: "55", unrealizedPricePnl: "-100", accruedFundingOwed: "1", equityContribution: "-101" });
  });
  it("does not invent PnL for an unpriceable mark", async () => {
    analytics.mockResolvedValue({ priceable: false, asOfBlock: 56n, size: 1000000000000000000n });
    const body = await (await GET(request("ETH-PERP"), context)).json();
    expect(body).toMatchObject({ priceable: false, size: "1", block: "56" });
    expect(body.unrealizedPricePnl).toBeUndefined();
  });
  it("rejects unsupported markets and reports unavailable market data", async () => {
    expect((await GET(request("OTHER"), context)).status).toBe(400);
    const result = await GET(request("BTC-PERP"), context);
    expect(result.status).toBe(502);
    expect(await result.json()).toHaveProperty("error");
  });
});
