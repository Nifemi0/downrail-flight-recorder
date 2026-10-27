import { describe, expect, it } from "vitest";
import type { AccountPositionChange, AccountRecorderSnapshot } from "./account";
import { buildPositionReceipts } from "./position-receipt";

const change = (id: string, kind: AccountPositionChange["kind"], block: string, tx: string, pnl = "0"): AccountPositionChange => ({
  id, kind, blockNumber: block, transactionHash: tx, market: "ETH-PERP", logIndex: 1,
  sideAfter: kind === "CLOSE" ? "Flat" : "Long", sizeBefore: "0", sizeAfter: "1", realizedPricePnl: pnl, timestamp: block,
});
const snapshot = (changes: AccountPositionChange[]): AccountRecorderSnapshot => ({
  account: "0x0000000000000000000000000000000000000001", chainId: 50383, checkedAt: "2026-10-26T00:00:00Z",
  positions: [], openOrders: [], orderHistory: [], fills: [], positionChanges: changes, funding: [], marginEvents: [], liquidations: [], page: 1, nextCursor: null,
  sourceStatus: Object.fromEntries(["positions", "openOrders", "orderHistory", "fills", "positionChanges", "funding", "marginEvents", "liquidations"].map((name) => [name, { state: "indexed", detail: "", hasMore: false }])) as AccountRecorderSnapshot["sourceStatus"],
});

describe("position receipts", () => {
  it("groups an observed open, reduction, and close and sums only indexed price PnL precisely", () => {
    const receipt = buildPositionReceipts(snapshot([change("c", "CLOSE", "3", "0xc", "+1.000000000000000001"), change("a", "OPEN", "1", "0xa"), change("b", "REDUCE", "2", "0xb", "-0.1")]))[0];
    expect(receipt.changes.map((row) => row.id)).toEqual(["a", "b", "c"]);
    expect(receipt).toMatchObject({ startObserved: true, end: "closed", observedPricePnl: "+0.900000000000000001" });
  });

  it("marks a history fragment without an opening as incomplete", () => {
    expect(buildPositionReceipts(snapshot([change("a", "REDUCE", "1", "0xa"), change("b", "CLOSE", "2", "0xb")]))[0]).toMatchObject({ startObserved: false, end: "closed" });
  });

  it("treats a direction flip as a boundary and leaves the next episode's opening unproven", () => {
    const receipts = buildPositionReceipts(snapshot([change("a", "OPEN", "1", "0xa"), change("b", "FLIP", "2", "0xb"), change("c", "INCREASE", "3", "0xc")]));
    expect(receipts).toHaveLength(2);
    expect(receipts.find((receipt) => receipt.end === "flipped")?.changes.map((row) => row.id)).toEqual(["a", "b"]);
    expect(receipts.find((receipt) => receipt.changes[0].id === "c")?.startObserved).toBe(false);
  });

  it("does not assign a same-transaction fill to two position episodes", () => {
    const data = snapshot([change("a", "OPEN", "1", "0xsame"), change("b", "CLOSE", "2", "0xsame"), change("c", "OPEN", "3", "0xsame")]);
    data.fills = [{ id: "fill", market: "ETH-PERP", role: "Maker", side: "Buy", quantity: "1", price: "1", timestamp: "1", transactionHash: "0xsame", blockNumber: "1", logIndex: 0, orderId: "7" }];
    expect(buildPositionReceipts(data).flatMap((receipt) => receipt.fills)).toHaveLength(0);
  });

  it("links a fill and its indexed order only when the market, transaction and order ID agree", () => {
    const data = snapshot([change("a", "OPEN", "1", "0xentry")]);
    data.fills = [{ id: "fill", market: "ETH-PERP", role: "Maker", side: "Buy", quantity: "1", price: "2", timestamp: "1", transactionHash: "0xentry", blockNumber: "1", logIndex: 0, orderId: "7" }];
    data.orderHistory = [{ id: "0xpool_7", market: "ETH-PERP", status: "FILLED", side: "Buy", quantity: "1", filledQuantity: "1", price: "2", placedAt: "1", lastUpdatedAt: null, placedTransactionHash: "0xorder" }, { id: "0xpool_8", market: "ETH-PERP", status: "FILLED", side: "Buy", quantity: "1", filledQuantity: "1", price: "2", placedAt: "1", lastUpdatedAt: null, placedTransactionHash: "0xother" }];
    const receipt = buildPositionReceipts(data)[0];
    expect(receipt.fills.map((row) => row.id)).toEqual(["fill"]);
    expect(receipt.orders.map((row) => row.id)).toEqual(["0xpool_7"]);
  });

  it("preserves multiple partial fills across separate position changes and only links their matching order", () => {
    const data = snapshot([change("open", "OPEN", "1", "0xfirst"), change("increase", "INCREASE", "2", "0xsecond")]);
    data.fills = ["first", "second"].map((name, index) => ({ id: name, market: "ETH-PERP", role: "Taker" as const, side: "Buy" as const, quantity: index ? "0.6" : "0.4", price: "2000", timestamp: String(index + 1), transactionHash: `0x${name}`, blockNumber: String(index + 1), logIndex: 0, orderId: "7" }));
    data.orderHistory = [{ id: "0xpool_7", market: "ETH-PERP", status: "FILLED", side: "Buy", quantity: "1", filledQuantity: "1", price: "2000", placedAt: "1", lastUpdatedAt: null, placedTransactionHash: "0xorder" }];
    const receipt = buildPositionReceipts(data)[0];
    expect(receipt.fills.map((fill) => fill.quantity)).toEqual(["0.4", "0.6"]);
    expect(receipt.orders).toHaveLength(1);
    expect(receipt.end).toBe("not observed");
  });
});
