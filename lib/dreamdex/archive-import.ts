import { formatUnits, parseUnits } from "viem";
import { isAddress } from "viem";
import type { PositionReceipt } from "./position-receipt";
import type { AccountPositionChange } from "./account";
import { comparePositionChange } from "./chain-comparison";

type ArchiveRow = {type:string;blockNumber:string;logIndex:number;transactionHash:string;size:string|null;realizedPricePnl:string|null;amount:string|null;quantity?:string;price?:string;side?:"Buy"|"Sell";role?:"maker"|"taker"|"both";orderId?:string};
export type ImportedArchive = {version:3|4;chainId:number;account:string;market:string;pool:string;startBlock:string;checkpoint:string;rows:ArchiveRow[]};
/** Validate an archive without consulting market discovery; identity is still a file claim, not proof. */
export function parseStandaloneArchive(text: string): ImportedArchive {
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== "object") throw new Error("This is not a supported archive.");
  const data = value as Record<string, unknown>;
  if (typeof data.account !== "string" || !isAddress(data.account) || typeof data.pool !== "string" || !isAddress(data.pool) || (data.market !== "ETH-PERP" && data.market !== "BTC-PERP")) throw new Error("The archive has an invalid account, market, or pool.");
  return parseLocalArchive(text, { account: data.account, market: data.market, pool: data.pool });
}
export function parseLocalArchive(text: string, expected: {account:string;market:string;pool:string}): ImportedArchive {
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== "object") throw new Error("This is not a supported archive.");
  const a = value as Record<string, unknown>;
  if ((a.version !== 3 && a.version !== 4) || a.chainId !== 50383 || typeof a.account !== "string" || a.account.toLowerCase() !== expected.account.toLowerCase() || a.market !== expected.market || typeof a.pool !== "string" || a.pool.toLowerCase() !== expected.pool.toLowerCase() || typeof a.startBlock !== "string" || !/^\d{1,16}$/.test(a.startBlock) || typeof a.checkpoint !== "string" || !/^\d{1,16}$/.test(a.checkpoint) || BigInt(a.checkpoint) < BigInt(a.startBlock) || !Array.isArray(a.rows) || a.rows.length > 25000) throw new Error("The archive does not match this account, market, pool, or network.");
  const seen = new Set<string>();
  const validAmount = (value: unknown) => value === null || (typeof value === "string" && value.length <= 160 && /^-?\d{1,80}(?:\.\d{1,77})?$/.test(value));
  for (const row of a.rows) {
    if (!row || typeof row !== "object" || typeof row.type !== "string" || typeof row.blockNumber !== "string" || !/^\d{1,16}$/.test(row.blockNumber) || BigInt(row.blockNumber) < BigInt(a.startBlock) || BigInt(row.blockNumber) > BigInt(a.checkpoint) || !Number.isSafeInteger(row.logIndex) || row.logIndex < 0 || typeof row.transactionHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(row.transactionHash) || !validAmount(row.size) || !validAmount(row.realizedPricePnl) || !validAmount(row.amount)) throw new Error("The archive contains an invalid event.");
    if ((row.quantity !== undefined && (!validAmount(row.quantity) || row.quantity === null || row.quantity.startsWith("-"))) || (row.price !== undefined && (!validAmount(row.price) || row.price === null || row.price.startsWith("-"))) || (row.side !== undefined && row.side !== "Buy" && row.side !== "Sell") || (row.role !== undefined && !["maker", "taker", "both"].includes(row.role)) || (row.orderId !== undefined && (typeof row.orderId !== "string" || !/^\d{1,39}$/.test(row.orderId)))) throw new Error("The archive contains invalid order details.");
    const key = `${row.transactionHash.toLowerCase()}:${row.logIndex}`;
    if (seen.has(key)) throw new Error("The archive contains a duplicate event; rebuild or correct it before importing.");
    seen.add(key);
  }
  return a as ImportedArchive;
}
export function compareArchiveChanges(changes: AccountPositionChange[], archive: ImportedArchive) {
  return changes.map((change) => ({ change, status: BigInt(change.blockNumber) < BigInt(archive.startBlock) || BigInt(change.blockNumber) > BigInt(archive.checkpoint) ? "outside range" as const : comparePositionChange(change, archive.rows) }));
}

function addDecimals(values: string[]) {
  const precision = Math.max(0,...values.map((v)=>(v.split(".")[1] ?? "").length));
  return formatUnits(values.reduce((sum,value)=>sum+parseUnits(value.replace(/^\+/,""),precision),0n),precision);
}
/** An imported file is user-editable; these are comparisons, not independently verified facts. */
export function summarizeArchiveReceipt(receipt: PositionReceipt, receipts: PositionReceipt[], archive: ImportedArchive) {
  if (!receipt.startObserved || receipt.end !== "closed" || !receipt.changes.length) return null;
  const first=receipt.changes[0], last=receipt.changes[receipt.changes.length-1];
  if (BigInt(first.blockNumber)<BigInt(archive.startBlock) || BigInt(last.blockNumber)>BigInt(archive.checkpoint)) return null;
  if (receipts.some((other)=>other.id!==receipt.id && other.changes.some((change)=>change.transactionHash.toLowerCase()===first.transactionHash.toLowerCase() || change.transactionHash.toLowerCase()===last.transactionHash.toLowerCase()))) return null;
  if (compareArchiveChanges(receipt.changes,archive).some((item)=>item.status!=="matches")) return null;
  const compare = (block: string, index: number, otherBlock: string, otherIndex: number) => BigInt(block)<BigInt(otherBlock) ? -1 : BigInt(block)>BigInt(otherBlock) ? 1 : index-otherIndex;
  const inside = (row: ArchiveRow) => compare(row.blockNumber,row.logIndex,first.blockNumber,first.logIndex)>=0 && compare(row.blockNumber,row.logIndex,last.blockNumber,last.logIndex)<=0;
  const changes = archive.rows.filter((row)=>row.type === "PositionUpdated" && inside(row));
  if (changes.length !== receipt.changes.length) return null;
  const boundary = new Set([first.transactionHash.toLowerCase(),last.transactionHash.toLowerCase()]);
  // A shared boundary transaction may charge fees for multiple position episodes.
  // Even if the indexer did not load the other episode, the local archive can reveal it.
  if (archive.rows.some((row)=>row.type === "PositionUpdated" && !inside(row) && boundary.has(row.transactionHash.toLowerCase()))) return null;
  const costs = archive.rows.filter((row)=>["FundingSettled","FeeCharged","RebatePaid"].includes(row.type) && (inside(row) || boundary.has(row.transactionHash.toLowerCase())));
  if (costs.some((row)=>row.amount===null || !/^-?\d+(?:\.\d+)?$/.test(row.amount) || (row.type !== "FundingSettled" && row.amount.startsWith("-")))) return null;
  const impact = addDecimals(costs.map((row)=>row.type === "RebatePaid" ? row.amount! : row.amount!.startsWith("-") ? row.amount!.slice(1) : `-${row.amount}`));
  return {costCount:costs.length,costImpact:impact,subtotal:addDecimals([receipt.observedPricePnl,impact])};
}
