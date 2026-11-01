import { beforeEach, describe, expect, it, vi } from "vitest";
const { getReceipt }=vi.hoisted(()=>({getReceipt:vi.fn()}));
vi.mock("viem",async(load)=>({...(await load<typeof import("viem")>()),createPublicClient:()=>({getTransactionReceipt:getReceipt}),http:()=>({})}));
vi.mock("@/lib/dreamdex/config",()=>({DREAMDEX_CHAIN:{id:50383}}));
import { POST } from "./route";
const owner="0x0000000000000000000000000000000000000001",other="0x0000000000000000000000000000000000000002",hash=`0x${"a".repeat(64)}`, second=`0x${"b".repeat(64)}`;
const context={params:Promise.resolve({address:owner})};
const request=(hashes:unknown)=>new Request("http://localhost",{method:"POST",body:JSON.stringify({hashes})});
beforeEach(()=>{getReceipt.mockReset();});
describe("transaction gas",()=>{
 it("counts a sender's transaction once and excludes a different payer",async()=>{getReceipt.mockResolvedValueOnce({from:owner,gasUsed:21000n,effectiveGasPrice:1000000000n}).mockResolvedValueOnce({from:other,gasUsed:2n,effectiveGasPrice:1n});const response=await POST(request([hash,hash,second]),context);expect(await response.json()).toMatchObject({paid:1,other:1,unavailable:0,totalSTT:"0.000021"});expect(getReceipt).toHaveBeenCalledTimes(2);});
 it("reports unavailable receipts without adding invented gas",async()=>{getReceipt.mockRejectedValue(new Error("offline"));const response=await POST(request([hash]),context);expect(await response.json()).toMatchObject({paid:0,unavailable:1,totalSTT:"0"});});
 it("rejects malformed hashes and excessive lists",async()=>{expect((await POST(request(["0x12"]),context)).status).toBe(400);expect((await POST(request(Array(21).fill(hash)),context)).status).toBe(400);expect(getReceipt).not.toHaveBeenCalled();});
});
