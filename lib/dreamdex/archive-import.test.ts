import { describe, expect, it } from "vitest";
import { compareArchiveChanges, parseLocalArchive, parseStandaloneArchive, summarizeArchiveReceipt } from "./archive-import";
import type { AccountPositionChange } from "./account";
const account="0x0000000000000000000000000000000000000001", pool="0x0000000000000000000000000000000000000002", hash=`0x${"a".repeat(64)}`;
const archive={version:3,chainId:50383,account,market:"ETH-PERP",pool,startBlock:"10",checkpoint:"20",rows:[{type:"PositionUpdated",blockNumber:"12",logIndex:4,transactionHash:hash,size:"1",realizedPricePnl:"-2",amount:null}]};
const change={id:"c",market:"ETH-PERP",kind:"CLOSE",sideAfter:"Long",sizeBefore:"2",sizeAfter:"1",realizedPricePnl:"-2",timestamp:"1",transactionHash:hash,blockNumber:"12",logIndex:4} satisfies AccountPositionChange;
const expected={account,market:"ETH-PERP",pool};
describe("local archive import", () => {
 it("compares matched and outside-range changes", () => { const parsed=parseLocalArchive(JSON.stringify(archive),expected); expect(compareArchiveChanges([change,{...change,id:"outside",blockNumber:"21"}],parsed).map((item)=>item.status)).toEqual(["matches","outside range"]); });
 it("accepts the expanded version 4 archive while rejecting unknown versions", () => {
  expect(parseLocalArchive(JSON.stringify({...archive,version:4}),expected).version).toBe(4);
  expect(()=>parseLocalArchive(JSON.stringify({...archive,version:5}),expected)).toThrow();
 });
 it("validates a standalone archive without market discovery and rejects invalid identity", () => {
  expect(parseStandaloneArchive(JSON.stringify({...archive,version:4}))).toMatchObject({account,pool,market:"ETH-PERP"});
  expect(()=>parseStandaloneArchive(JSON.stringify({...archive,pool:"fake"}))).toThrow();
  expect(()=>parseStandaloneArchive(JSON.stringify({...archive,market:"made up"}))).toThrow();
 });
 it("only summarizes a covered, matching closed episode and uses funding owed as a cost", () => {
  const open={...change,id:"open",kind:"OPEN" as const,blockNumber:"11",logIndex:1,sizeAfter:"1",realizedPricePnl:"0"};
  const close={...change,kind:"CLOSE" as const,sideAfter:"Flat" as const,sizeAfter:"0"};
  const input={...archive,rows:[{type:"PositionUpdated",blockNumber:"11",logIndex:1,transactionHash:hash,size:"1",realizedPricePnl:"0",amount:null},{type:"FundingSettled",blockNumber:"12",logIndex:2,transactionHash:hash,size:null,realizedPricePnl:null,amount:"0.5"},{type:"PositionUpdated",blockNumber:"12",logIndex:4,transactionHash:hash,size:"0",realizedPricePnl:"-2",amount:null}]};
  const parsed=parseLocalArchive(JSON.stringify(input),expected);
  const receipt={id:"r",market:"ETH-PERP",startObserved:true,end:"closed" as const,changes:[open,close],fills:[],orders:[],observedPricePnl:"-2"};
  expect(summarizeArchiveReceipt(receipt,[receipt],parsed)).toMatchObject({costCount:1,costImpact:"-0.5",subtotal:"-2.5"});
  expect(summarizeArchiveReceipt({...receipt,startObserved:false},[receipt],parsed)).toBeNull();
  const sharedBoundary=parseLocalArchive(JSON.stringify({...input,rows:[...input.rows,{type:"PositionUpdated",blockNumber:"12",logIndex:5,transactionHash:hash,size:"2",realizedPricePnl:"0",amount:null}]}),expected);
  expect(summarizeArchiveReceipt(receipt,[receipt],sharedBoundary)).toBeNull();
 });
 it("rejects another wallet, malformed rows and misleading ranges", () => {
  expect(()=>parseLocalArchive(JSON.stringify({...archive,account:pool}),expected)).toThrow();
  expect(()=>parseLocalArchive(JSON.stringify({...archive,rows:[{...archive.rows[0],transactionHash:"fake"}]}),expected)).toThrow();
  expect(()=>parseLocalArchive(JSON.stringify({...archive,checkpoint:"9"}),expected)).toThrow();
  expect(()=>parseLocalArchive(JSON.stringify({...archive,rows:[archive.rows[0],archive.rows[0]]}),expected)).toThrow(/duplicate/);
  expect(()=>parseLocalArchive(JSON.stringify({...archive,rows:[{...archive.rows[0],amount:"not-a-number"}]}),expected)).toThrow(/invalid/);
  expect(()=>parseLocalArchive(JSON.stringify({...archive,rows:[{...archive.rows[0],amount:`0.${"1".repeat(78)}`}]}),expected)).toThrow(/invalid/);
  expect(()=>parseLocalArchive(JSON.stringify({...archive,rows:[{...archive.rows[0],quantity:"-1"}]}),expected)).toThrow(/invalid/);
 });
});
