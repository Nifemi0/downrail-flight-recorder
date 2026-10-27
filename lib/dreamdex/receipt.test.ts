import { describe, expect, it } from "vitest";
import { buildReceiptEvents } from "./receipt";
import type { AccountRecorderSnapshot } from "./account";

describe("receipt timeline", () => {
  it("orders different indexed event types by actual time", () => {
    const snapshot: AccountRecorderSnapshot = {
      checkedAt: "2026-10-23T12:00:00Z", chainId: 50383, account: "0x0000000000000000000000000000000000000001",
      positions: [],
      openOrders: [], orderHistory: [], marginEvents: [], liquidations: [], page: 1, nextCursor: null,
      fills: [{ id: "fill", market: "ETH-PERP", role: "Taker", side: "Buy", quantity: "1", price: "2000", timestamp: "2026-10-23T10:00:00Z", transactionHash: "0xfill", blockNumber: "5", logIndex: 0, orderId: "1" }],
      positionChanges: [{ id: "change", market: "ETH-PERP", kind: "OPEN", sideAfter: "Long", sizeBefore: "0", sizeAfter: "1", realizedPricePnl: "0", timestamp: "1792753200", transactionHash: "0xchange", blockNumber: "6", logIndex: 0 }],
      funding: [{ id: "funding", market: "ETH-PERP", direction: "Paid", amount: "+2", timestamp: "2026-10-23T09:00:00Z", transactionHash: "0xfunding" }],
      sourceStatus: Object.fromEntries(["positions", "openOrders", "orderHistory", "fills", "positionChanges", "funding", "marginEvents", "liquidations"].map((name) => [name, { state: "indexed", detail: "", hasMore: false }])) as AccountRecorderSnapshot["sourceStatus"],
    };
    expect(buildReceiptEvents(snapshot).map((event) => event.kind)).toEqual(["Funding", "Fill", "Position change"]);
  });

  it("does not present an open order twice when it also appears in history", () => {
    const order = { id: "same-order", market: "ETH-PERP", status: "Open", side: "Buy" as const, quantity: "1", filledQuantity: "0", price: "2000", placedAt: "2026-10-23T10:00:00Z", lastUpdatedAt: null, placedTransactionHash: "0xabc" };
    const snapshot = {
      checkedAt: "2026-10-23T12:00:00Z", chainId: 50383, account: "0x0000000000000000000000000000000000000001",
      positions: [], openOrders: [order], orderHistory: [order], fills: [], positionChanges: [], funding: [], marginEvents: [], liquidations: [], page: 1, nextCursor: null,
      sourceStatus: Object.fromEntries(["positions", "openOrders", "orderHistory", "fills", "positionChanges", "funding", "marginEvents", "liquidations"].map((name) => [name, { state: "indexed", detail: "", hasMore: false }])) as AccountRecorderSnapshot["sourceStatus"],
    } satisfies AccountRecorderSnapshot;
    expect(buildReceiptEvents(snapshot).map((event) => event.id)).toEqual(["order-same-order"]);
  });
});
