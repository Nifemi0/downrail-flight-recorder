export type ArchiveIdentity = { version: number; chainId: number; account: string; market: string; pool: string; bank: string; startBlock: string };
export function archiveIdentityMatches(actual: ArchiveIdentity, expected: ArchiveIdentity): boolean {
  return actual.version === expected.version && actual.chainId === expected.chainId && actual.account.toLowerCase() === expected.account.toLowerCase() && actual.market === expected.market && actual.pool.toLowerCase() === expected.pool.toLowerCase() && actual.bank.toLowerCase() === expected.bank.toLowerCase() && actual.startBlock === expected.startBlock;
}
export function checkpointMatches(expected: string, actual: string | null): boolean { return actual !== null && expected.toLowerCase() === actual.toLowerCase(); }
export function chunkEnd(start: bigint, end: bigint): bigint { return start + 999n < end ? start + 999n : end; }
export function mergeEventRows<T extends {blockNumber:string;blockHash:string;logIndex:number}>(current:T[], incoming:T[]):T[] {
  const rows = new Map<string,T>();
  for (const row of [...current,...incoming]) rows.set(`${row.blockHash.toLowerCase()}:${row.logIndex}`, row);
  return [...rows.values()].sort((a,b) => BigInt(a.blockNumber) < BigInt(b.blockNumber) ? -1 : BigInt(a.blockNumber) > BigInt(b.blockNumber) ? 1 : a.logIndex-b.logIndex);
}

export function knownFillRole(known: Set<string>, taker: string, maker: string): "taker" | "maker" | "both" | null {
  const isTaker = known.has(taker), isMaker = known.has(maker);
  return isTaker && isMaker ? "both" : isTaker ? "taker" : isMaker ? "maker" : null;
}
