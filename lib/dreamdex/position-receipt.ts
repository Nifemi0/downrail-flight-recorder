import { formatUnits, parseUnits } from "viem";
import type { AccountFill, AccountOrder, AccountPositionChange, AccountRecorderSnapshot } from "./account";

export type PositionReceipt = {
  id: string;
  market: string;
  startObserved: boolean;
  end: "closed" | "flipped" | "not observed";
  changes: AccountPositionChange[];
  fills: AccountFill[];
  orders: AccountOrder[];
  observedPricePnl: string;
};

function compareChanges(a: AccountPositionChange, b: AccountPositionChange) {
  const left = BigInt(a.blockNumber);
  const right = BigInt(b.blockNumber);
  return left < right ? -1 : left > right ? 1 : a.logIndex - b.logIndex;
}

/** Groups observed changes, not a claim that the upstream history is complete. */
export function buildPositionReceipts(snapshot: AccountRecorderSnapshot): PositionReceipt[] {
  const groups: Omit<PositionReceipt, "fills" | "orders" | "observedPricePnl">[] = [];
  const byMarket = new Map<string, AccountPositionChange[]>();
  for (const change of snapshot.positionChanges) {
    const rows = byMarket.get(change.market) ?? [];
    rows.push(change);
    byMarket.set(change.market, rows);
  }
  for (const [market, changes] of byMarket) {
    changes.sort(compareChanges);
    let current: (typeof groups)[number] | null = null;
    for (const change of changes) {
      if (change.kind === "OPEN" && current?.changes.length) {
        groups.push(current);
        current = null;
      }
      if (!current) current = { id: `${market}:${change.id}`, market, startObserved: change.kind === "OPEN", end: "not observed", changes: [] };
      current.changes.push(change);
      if (change.kind === "CLOSE" || change.kind === "FLIP") {
        current.end = change.kind === "CLOSE" ? "closed" : "flipped";
        groups.push(current);
        current = null;
      }
    }
    if (current?.changes.length) groups.push(current);
  }
  // If a transaction contains changes in more than one episode, it cannot safely
  // identify which episode its fills belong to without a finer order-level join.
  const transactionGroups = new Map<string, Set<string>>();
  for (const group of groups) for (const change of group.changes) {
    const key = `${group.market}:${change.transactionHash.toLowerCase()}`;
    const ids = transactionGroups.get(key) ?? new Set<string>();
    ids.add(group.id);
    transactionGroups.set(key, ids);
  }
  const allOrders = [...new Map([...snapshot.orderHistory, ...snapshot.openOrders].map((order) => [order.id, order])).values()];
  return groups.map((group) => {
    const txs = new Set(group.changes.map((change) => change.transactionHash.toLowerCase()));
    const fills = snapshot.fills.filter((fill) => fill.market === group.market && txs.has(fill.transactionHash.toLowerCase()) && transactionGroups.get(`${group.market}:${fill.transactionHash.toLowerCase()}`)?.size === 1);
    const orders = allOrders.filter((order) => order.market === group.market && fills.some((fill) => fill.orderId !== null && order.id.toLowerCase().endsWith(`_${fill.orderId.toLowerCase()}`)));
    const precision = Math.max(0, ...group.changes.map((change) => (change.realizedPricePnl.split(".")[1] ?? "").length));
    const total = group.changes.reduce((sum, change) => sum + parseUnits(change.realizedPricePnl.replace(/^\+/, ""), precision), 0n);
    const observedPricePnl = `${total > 0n ? "+" : ""}${formatUnits(total, precision)}`;
    return { ...group, fills, orders, observedPricePnl };
  }).reverse();
}
