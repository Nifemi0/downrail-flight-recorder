import { beforeEach, describe, expect, it, vi } from "vitest";

const { client, markets } = vi.hoisted(() => ({
  client: {
    listPerpPositions: vi.fn(), getPerpPortfolio: vi.fn(), listPerpOrderHistory: vi.fn(),
    getUserFillsPage: vi.fn(), listPerpPositionChanges: vi.fn(), getFundingPayments: vi.fn(),
    getMarginEvents: vi.fn(), listLiquidations: vi.fn(),
  },
  markets: { supported: [{ symbol: "ETH-PERP", poolAddress: "0x1111111111111111111111111111111111111111", baseDecimals: 18, quoteDecimals: 18 }] },
}));
vi.mock("./config", () => ({ createDreamDexClient: () => ({ client }), DREAMDEX_CHAIN: { id: 50383 } }));
vi.mock("./markets", () => ({ getMarketSnapshot: async () => markets }));
import { getAccountRecorderSnapshot } from "./account";

const wallet = "0x0000000000000000000000000000000000000001";
const changes = Array.from({ length: 51 }, (_, index) => ({
  id: `change-${index}`, pool: markets.supported[0].poolAddress, kind: "INCREASE" as const,
  sizeBefore: 0n, sizeAfter: 1n, realizedPnl: 0n, timestamp: 1n, txHash: `0x${index}`, blockNumber: 1n, logIndex: index,
}));

beforeEach(() => {
  vi.resetAllMocks();
  client.listPerpPositions.mockResolvedValue([]);
  client.getPerpPortfolio.mockResolvedValue({ openOrders: [] });
  client.listPerpOrderHistory.mockResolvedValue([]);
  client.getUserFillsPage.mockResolvedValue({ fills: [], nextCursor: null });
  client.listPerpPositionChanges.mockImplementation(async ({ offset }: { offset: number }) => changes.slice(offset, offset + 51));
  client.getFundingPayments.mockResolvedValue([]);
  client.getMarginEvents.mockResolvedValue([]);
  client.listLiquidations.mockResolvedValue([]);
});

describe("account source pagination", () => {
  it("advances position changes without re-reading an exhausted fill cursor", async () => {
    const first = await getAccountRecorderSnapshot(wallet);
    expect(first.positionChanges).toHaveLength(50);
    expect(first.nextCursor).toBeTruthy();
    const second = await getAccountRecorderSnapshot(wallet, first.nextCursor);
    expect(second.positionChanges.map((row) => row.id)).toEqual(["change-50"]);
    expect(second.nextCursor).toBeNull();
    expect(client.getUserFillsPage).toHaveBeenCalledTimes(1);
  });

  it("does not advance a cursor past an unavailable source", async () => {
    client.getFundingPayments.mockRejectedValue(new Error("funding unavailable"));
    const result = await getAccountRecorderSnapshot(wallet);
    expect(result.sourceStatus.funding.state).toBe("unavailable");
    expect(result.positionChanges).toHaveLength(50);
    expect(result.nextCursor).toBeNull();
  });

  it("rejects an invalid cursor before making source requests", async () => {
    await expect(getAccountRecorderSnapshot(wallet, "bad cursor")).rejects.toThrow("Invalid page cursor");
    expect(client.listPerpPositions).not.toHaveBeenCalled();
  });
});
