import { beforeEach, describe, expect, it, vi } from "vitest";
const { logs, read, chainId, discovery } = vi.hoisted(() => ({ logs: vi.fn(), read: vi.fn(), chainId: vi.fn(), discovery: vi.fn() }));
vi.mock("viem", async (load) => ({ ...(await load<typeof import("viem")>()), createPublicClient: () => ({ getLogs: logs, readContract: read, getChainId: chainId }), http: () => ({}) }));
vi.mock("@/lib/dreamdex/config", () => ({ DREAMDEX_CHAIN: { id: 50383 } }));
vi.mock("@/lib/dreamdex/markets", () => ({ getMarketSnapshot: discovery }));
import { GET } from "./route";
const address = "0x0000000000000000000000000000000000000001";
const context = { params: Promise.resolve({ address }) };
const request = (query: string) => new Request(`http://localhost/api/accounts/${address}/chain-events?${query}`);
beforeEach(() => { logs.mockReset(); read.mockReset(); chainId.mockReset(); discovery.mockReset(); discovery.mockResolvedValue({ supported: [{ symbol: "ETH-PERP", marginBank: "0x1111111111111111111111111111111111111111", poolAddress: "0x2222222222222222222222222222222222222222", baseDecimals: 18, quoteDecimals: 18 }] }); });
describe("bounded direct chain scan", () => {
  it("rejects invalid or overly broad ranges before calling the RPC", async () => {
    expect((await GET(request("market=ETH-PERP&fromBlock=1&toBlock=1001"), context)).status).toBe(400);
    expect((await GET(request("market=ETH-PERP&fromBlock=9&toBlock=8"), context)).status).toBe(400);
    expect(logs).not.toHaveBeenCalled();
  });
  it("returns ordered independently read events with exact values", async () => {
    logs.mockResolvedValueOnce([{eventName:"PositionUpdated",blockNumber:5n,logIndex:2,transactionHash:"0xabc",args:{newSize:1000000000000000000n,avgEntryPrice:2000000000000000000000n,realizedPnl:-1000000000000000000n}}]).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const response = await GET(request("market=ETH-PERP&fromBlock=5&toBlock=5"), context);
    expect(response.status).toBe(200);
    expect((await response.json()).rows).toMatchObject([{type:"PositionUpdated",size:"1",price:"2000",realizedPricePnl:"-1",logIndex:2}]);
    expect(logs).toHaveBeenCalledTimes(4);
  });
  it("reads pool metadata from RPC without market discovery when a pool is supplied", async () => {
    const bank="0x1111111111111111111111111111111111111111",pool="0x2222222222222222222222222222222222222222",token="0x3333333333333333333333333333333333333333";
    chainId.mockResolvedValue(50383); const values:Record<string,unknown>={marginBank:bank,getOneBase:10n**18n,getSystemConfig:{marginBank:bank,collateralToken:token},decimals:18}; read.mockImplementation(({functionName}: {functionName:string}) => values[functionName]); logs.mockResolvedValue([]);
    const response=await GET(request(`market=ETH-PERP&pool=${pool}&fromBlock=5&toBlock=5`),context);
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({bank,pool,rows:[]}); expect(discovery).not.toHaveBeenCalled();
  });
  it("fails closed if RPC chain does not match", async () => {
    chainId.mockResolvedValue(1); const response=await GET(request(`market=ETH-PERP&pool=0x2222222222222222222222222222222222222222&fromBlock=5&toBlock=5`),context);
    expect(response.status).toBe(502); expect(logs).not.toHaveBeenCalled(); expect(discovery).not.toHaveBeenCalled();
  });
});
