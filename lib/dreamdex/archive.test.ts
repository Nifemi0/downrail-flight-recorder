import { describe, expect, it } from "vitest";
import { archiveIdentityMatches, checkpointMatches, chunkEnd, knownFillRole, mergeEventRows } from "./archive";
const id = {version:1,chainId:50383,account:"0xaB",market:"ETH-PERP",pool:"0xCD",bank:"0xEF",startBlock:"10"};
describe("local chain archive safeguards", () => {
  it("rejects a different account, market, start, network or contract", () => {
    expect(archiveIdentityMatches(id,{...id,account:"0xab"})).toBe(true);
    for (const changed of [{account:"0x2"},{market:"BTC-PERP"},{startBlock:"11"},{chainId:1},{bank:"0x3"}]) expect(archiveIdentityMatches(id,{...id,...changed})).toBe(false);
  });
  it("detects checkpoint hash changes and limits chunks", () => {
    expect(checkpointMatches("0xab","0xAB")).toBe(true); expect(checkpointMatches("0xab","0xcd")).toBe(false); expect(checkpointMatches("0xab",null)).toBe(false);
    expect(chunkEnd(100n,10000n)).toBe(1099n); expect(chunkEnd(100n,150n)).toBe(150n);
  });
  it("does not infer participation when neither order was observed", () => {
    const known = new Set(["1", "2"]);
    expect(knownFillRole(known,"1","3")).toBe("taker");
    expect(knownFillRole(known,"3","2")).toBe("maker");
    expect(knownFillRole(known,"1","2")).toBe("both");
    expect(knownFillRole(known,"3","4")).toBeNull();
  });
  it("deduplicates events by block hash and log index and orders them", () => {
    const a={blockNumber:"2",blockHash:"0xA",logIndex:5}, b={blockNumber:"1",blockHash:"0xB",logIndex:2};
    expect(mergeEventRows([a],[b,{...a,blockHash:"0xa"}])).toEqual([b,{...a,blockHash:"0xa"}]);
  });
});
