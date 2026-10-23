import type { AccountRecorderSnapshot } from "./account";

export type ReceiptEvent = {
  id: string;
  kind: "Position change" | "Fill" | "Funding";
  market: string;
  timestamp: string;
  title: string;
  detail: string;
  transactionHash: string;
  blockNumber: string | null;
};

function eventTime(value: string) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && /^\d+$/.test(value)) {
    return numeric < 1e12 ? numeric * 1000 : numeric;
  }
  return Date.parse(value);
}

export function buildReceiptEvents(snapshot: AccountRecorderSnapshot): ReceiptEvent[] {
  const changes: ReceiptEvent[] = snapshot.positionChanges.map((change) => ({
    id: `change-${change.id}`,
    kind: "Position change",
    market: change.market,
    timestamp: change.timestamp,
    title: `${change.kind.toLowerCase()} · ${change.sideAfter}`,
    detail: `Size ${change.sizeBefore} → ${change.sizeAfter}; reported realized price PnL ${change.realizedPricePnl}`,
    transactionHash: change.transactionHash,
    blockNumber: change.blockNumber,
  }));
  const fills: ReceiptEvent[] = snapshot.fills.map((fill) => ({
    id: `fill-${fill.id}`,
    kind: "Fill",
    market: fill.market,
    timestamp: fill.timestamp,
    title: `${fill.side} ${fill.quantity} · ${fill.role.toLowerCase()} fill`,
    detail: `Execution price ${fill.price}`,
    transactionHash: fill.transactionHash,
    blockNumber: fill.blockNumber,
  }));
  const funding: ReceiptEvent[] = snapshot.funding.map((payment) => ({
    id: `funding-${payment.id}`,
    kind: "Funding",
    market: payment.market,
    timestamp: payment.timestamp,
    title: `Funding ${payment.direction.toLowerCase()}`,
    detail: `Indexed amount ${payment.amount}`,
    transactionHash: payment.transactionHash,
    blockNumber: null,
  }));
  return [...changes, ...fills, ...funding].sort((a, b) => {
    const aTime = eventTime(a.timestamp);
    const bTime = eventTime(b.timestamp);
    if (!Number.isFinite(aTime)) return 1;
    if (!Number.isFinite(bTime)) return -1;
    return aTime - bTime;
  });
}

export function formatEventTime(value: string) {
  const time = eventTime(value);
  return Number.isFinite(time) ? new Date(time).toLocaleString() : "Time unavailable";
}
