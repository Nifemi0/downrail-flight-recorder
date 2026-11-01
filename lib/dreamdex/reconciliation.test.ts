import { describe, expect, it } from "vitest";
import type { AccountRecorderSnapshot } from "./account";
import type { PositionReceipt } from "./position-receipt";
import { reconcilePosition } from "./reconciliation";
const receipt = { id: "one", market: "ETH-PERP", startObserved: true, end: "closed", changes: [{ id: "c", market: "ETH-PERP", kind: "CLOSE", sideAfter: "Flat", sizeBefore: "1", sizeAfter: "0", realizedPricePnl: "10", timestamp: "1", transactionHash: "0xabc", blockNumber: "1", logIndex: 1 }], fills: [], orders: [], observedPricePnl: "10" } satisfies PositionReceipt;
const snapshot = { fees: [{id:"f",market:"ETH-PERP",kind:"Fee",amount:"1",isRebate:false,timestamp:"1",transactionHash:"0xabc"},{id:"r",market:"ETH-PERP",kind:"Rebate",amount:"0.2",isRebate:true,timestamp:"1",transactionHash:"0xabc"}], funding: [{id:"x",market:"ETH-PERP",direction:"Paid",amount:"+2",timestamp:"1",transactionHash:"0xabc"}] } as AccountRecorderSnapshot;
describe("observed reconciliation", () => {
  it("subtracts fees and paid funding, adds rebates, and keeps exact decimal math", () => {
    expect(reconcilePosition(snapshot,[receipt],receipt)).toMatchObject({ feeImpact:"-0.8", fundingImpact:"-2", observedSubtotal:"7.2" });
  });
  it("adds received funding and excludes unmatched transactions", () => {
    const data = { ...snapshot, funding: [{ ...snapshot.funding[0], amount:"-0.5", direction:"Received" as const }, { ...snapshot.funding[0], id:"other", transactionHash:"0xother", amount:"+8" }] };
    expect(reconcilePosition(data,[receipt],receipt)).toMatchObject({ fundingImpact:"0.5", observedSubtotal:"9.7", unmatchedFunding:[{id:"other"}] });
  });
  it("does not match a transaction shared across position episodes", () => {
    const other = { ...receipt, id:"two" };
    expect(reconcilePosition(snapshot,[receipt,other],receipt)).toMatchObject({ fees:[], funding:[], observedSubtotal:"10" });
  });
  it("flags liquidation events in the same transaction without treating them as a cost", () => {
    const data = { ...snapshot, liquidations: [{ id:"liq", market:"ETH-PERP", kind:"PositionLiquidated", transactionHash:"0xabc", timestamp:"1", blockNumber:"1" }, { id:"other", market:"BTC-PERP", kind:"PositionLiquidated", transactionHash:"0xabc", timestamp:"1", blockNumber:"1" }] };
    expect(reconcilePosition(data,[receipt],receipt)).toMatchObject({ liquidationEvents:[{id:"liq"}], observedSubtotal:"7.2" });
  });
});
