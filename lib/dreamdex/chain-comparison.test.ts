import { describe, expect, it } from "vitest";
import { comparePositionChange } from "./chain-comparison";
import type { AccountPositionChange } from "./account";
const change = { id:"1",market:"ETH-PERP",kind:"OPEN",sideAfter:"Short",sizeBefore:"0",sizeAfter:"0.4",realizedPricePnl:"+1.25",timestamp:"1",transactionHash:"0xAb",blockNumber:"42",logIndex:2 } satisfies AccountPositionChange;
const row = {type:"PositionUpdated",blockNumber:"42",logIndex:2,transactionHash:"0xab",size:"-0.400",realizedPricePnl:"1.2500"};
describe("direct position comparison", () => {
  it("matches signed size and exact realized PnL despite formatting", () => expect(comparePositionChange(change,[row])).toBe("matches"));
  it("reports a discrepancy and absent transaction separately", () => { expect(comparePositionChange(change,[{...row,size:"0.4"}])).toBe("different"); expect(comparePositionChange(change,[{...row,logIndex:3}])).toBe("not found"); });
});
