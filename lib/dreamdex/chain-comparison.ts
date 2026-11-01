import { parseUnits } from "viem";
import type { AccountPositionChange } from "./account";

type ChainPositionRow = { type: string; blockNumber: string; logIndex: number; transactionHash: string; size: string | null; realizedPricePnl: string | null };
function equalDecimal(a: string, b: string) {
  const decimals = Math.max((a.split(".")[1] ?? "").length, (b.split(".")[1] ?? "").length);
  return parseUnits(a.replace(/^\+/, ""), decimals) === parseUnits(b.replace(/^\+/, ""), decimals);
}
export function comparePositionChange(change: AccountPositionChange, rows: ChainPositionRow[]): "matches" | "different" | "not found" {
  const row = rows.find((item) => item.type === "PositionUpdated" && item.transactionHash.toLowerCase() === change.transactionHash.toLowerCase() && item.blockNumber === change.blockNumber && item.logIndex === change.logIndex);
  if (!row || row.size === null || row.realizedPricePnl === null) return "not found";
  const signed = change.sideAfter === "Short" && change.sizeAfter !== "0" ? `-${change.sizeAfter}` : change.sizeAfter;
  try { return equalDecimal(row.size, signed) && equalDecimal(row.realizedPricePnl, change.realizedPricePnl) ? "matches" : "different"; }
  catch { return "different"; }
}
