import type { AccountRecorderSnapshot } from "./account";

export type ReceiptEvent = {
  id: string;
  kind: "Order" | "Position change" | "Fill" | "Funding" | "Margin" | "Liquidation";
  market: string;
  timestamp: string;
  title: string;
  detail: string;
  transactionHash: string;
  blockNumber: string | null;
  logIndex: number | null;
};

function eventTime(value: string) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && /^\d+$/.test(value)) {
    return numeric < 1e12 ? numeric * 1000 : numeric;
  }
  return Date.parse(value);
}

export function buildReceiptEvents(snapshot: AccountRecorderSnapshot): ReceiptEvent[] {
  const uniqueOrders = new Map([...snapshot.orderHistory, ...snapshot.openOrders].map((order) => [order.id, order]));
  const orders: ReceiptEvent[] = [...uniqueOrders.values()].map((order) => ({
    id: `order-${order.id}`,
    kind: "Order",
    market: order.market,
    timestamp: order.placedAt,
    title: `${order.side} ${order.quantity} · order placed`,
    detail: `Limit ${order.price} USDso; latest indexed status ${order.status.toLowerCase()}, filled quantity ${order.filledQuantity}. The timestamp and hash refer to placement, not when the later status changed.`,
    transactionHash: order.placedTransactionHash,
    blockNumber: null,
    logIndex: null,
  }));
  const changes: ReceiptEvent[] = snapshot.positionChanges.map((change) => ({
    id: `change-${change.id}`,
    kind: "Position change",
    market: change.market,
    timestamp: change.timestamp,
    title: `${change.kind.toLowerCase()} · ${change.sideAfter}`,
    detail: `Size ${change.sizeBefore} → ${change.sizeAfter}; indexed realized price PnL ${change.realizedPricePnl} USDso`,
    transactionHash: change.transactionHash,
    blockNumber: change.blockNumber,
    logIndex: change.logIndex,
  }));
  const fills: ReceiptEvent[] = snapshot.fills.map((fill) => ({
    id: `fill-${fill.id}`,
    kind: "Fill",
    market: fill.market,
    timestamp: fill.timestamp,
    title: `${fill.side} ${fill.quantity} · ${fill.role.toLowerCase()} fill`,
    detail: `Execution price ${fill.price} USDso`,
    transactionHash: fill.transactionHash,
    blockNumber: fill.blockNumber,
    logIndex: fill.logIndex,
  }));
  const funding: ReceiptEvent[] = snapshot.funding.map((payment) => ({
    id: `funding-${payment.id}`,
    kind: "Funding",
    market: payment.market,
    timestamp: payment.timestamp,
    title: `Funding ${payment.direction.toLowerCase()}`,
    detail: `Indexed amount ${payment.amount} USDso`,
    transactionHash: payment.transactionHash,
    blockNumber: null,
    logIndex: null,
  }));
  const margin: ReceiptEvent[] = snapshot.marginEvents.map((movement) => ({
    id: `margin-${movement.id}`,
    kind: "Margin",
    market: movement.market,
    timestamp: movement.timestamp,
    title: movement.kind,
    detail: `Indexed collateral movement ${movement.amount} USDso`,
    transactionHash: movement.transactionHash,
    blockNumber: null,
    logIndex: null,
  }));
  const liquidations: ReceiptEvent[] = snapshot.liquidations.map((event) => ({
    id: `liquidation-${event.id}`,
    kind: "Liquidation",
    market: event.market,
    timestamp: event.timestamp,
    title: event.kind,
    detail: "Indexed liquidation or deleveraging stage; the stage name alone does not establish a loss amount.",
    transactionHash: event.transactionHash,
    blockNumber: event.blockNumber,
    logIndex: null,
  }));
  return [...orders, ...changes, ...fills, ...funding, ...margin, ...liquidations].sort((a, b) => {
    const aTime = eventTime(a.timestamp);
    const bTime = eventTime(b.timestamp);
    if (!Number.isFinite(aTime)) return 1;
    if (!Number.isFinite(bTime)) return -1;
    if (aTime !== bTime) return aTime - bTime;
    if (a.blockNumber && b.blockNumber && a.blockNumber !== b.blockNumber) return BigInt(a.blockNumber) < BigInt(b.blockNumber) ? -1 : 1;
    return (a.logIndex ?? 0) - (b.logIndex ?? 0);
  });
}

export function formatEventTime(value: string) {
  const time = eventTime(value);
  return Number.isFinite(time) ? new Date(time).toLocaleString() : "Time unavailable";
}
