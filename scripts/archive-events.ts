import { createPublicClient, erc20Abi, formatUnits, getAddress, http, isAddress, parseAbi, parseAbiItem, type Address } from "viem";
import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { retryTransient } from "../lib/dreamdex/retry";
import { archiveIdentityMatches, checkpointMatches, chunkEnd, knownFillRole, mergeEventRows } from "../lib/dreamdex/archive";
import { orderBookEventsAbi } from "@somnia-chain/markets-sdk";
import { DREAMDEX_CHAIN } from "../lib/dreamdex/config";
import { getMarketSnapshot } from "../lib/dreamdex/markets";

// Direct logs are complete only within the configured range and retained RPC history.
const events = [
  parseAbiItem("event PositionUpdated(address indexed account, address indexed perpPool, int128 newSize, uint128 avgEntryPrice, int256 realizedPnl, int256 entryFundingIndex)"),
  parseAbiItem("event FundingSettled(address indexed account, address indexed perpPool, int256 payment)"),
  parseAbiItem("event FeeCharged(address indexed account, address indexed perpPool, uint256 amount, uint256 insurancePortion)"),
  parseAbiItem("event RebatePaid(address indexed account, address indexed perpPool, uint256 amount)"),
] as const;
type Row = { type: string; blockNumber: string; blockHash: string; logIndex: number; transactionHash: string; size: string | null; realizedPricePnl: string | null; amount: string | null; orderId?: string; side?: string; quantity?: string; price?: string; role?: string };
const placedEvent = orderBookEventsAbi.find((event) => event.name === "OrderPlaced")!;
const filledEvent = orderBookEventsAbi.find((event) => event.name === "OrderFilled")!;
const cancelledEvent = orderBookEventsAbi.find((event) => event.name === "OrderCancelled")!;
const expiredEvent = orderBookEventsAbi.find((event) => event.name === "OrderExpired")!;
const reducedEvent = orderBookEventsAbi.find((event) => event.name === "OrderReduced")!;
const additionalOrderEvents = orderBookEventsAbi.filter((event) => ["OrderRested", "OrderCancelledSelfMatch", "MakerOrderCancelledExceedsPosition", "OrderCancelledPreFill"].includes(event.name));
type Archive = { version: 4; baseDecimals: number; quoteDecimals: number; chainId: number; account: string; market: string; pool: string; bank: string; startBlock: string; checkpoint: string | null; checkpointHash: string | null; rows: Row[] };

async function main() {
  const [accountText, symbol, fromText, toText, path] = process.argv.slice(2);
  if (!accountText || !isAddress(accountText) || !["ETH-PERP", "BTC-PERP"].includes(symbol) || !/^\d{1,16}$/.test(fromText ?? "") || !/^\d{1,16}$/.test(toText ?? "") || !path) throw new Error("Usage: npm run archive:events -- <account> <ETH-PERP|BTC-PERP> <start-block> <end-block> <local-output.json>");
  const start = BigInt(fromText), end = BigInt(toText);
  if (end < start) throw new Error("End block must not precede the archive start.");
  const account = getAddress(accountText);
  const client = createPublicClient({ chain: DREAMDEX_CHAIN, transport: http() });
  if (await client.getChainId() !== DREAMDEX_CHAIN.id) throw new Error("RPC chain mismatch.");
  const head = await client.getBlockNumber();
  if (head < 12n || end > head - 12n) throw new Error("End block must be at least 12 blocks behind the current head.");
  let archive: Archive | null = null;
  try { archive = JSON.parse(await readFile(path, "utf8")) as Archive; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  // A seeded archive or explicit pool avoids requiring the dreamDEX indexer on resume.
  const suppliedPool = process.env.DOWNRAIL_ARCHIVE_POOL;
  if (suppliedPool && !archive) console.warn("Pool address supplied by user; verify its market identity independently. The symbol is a label, not proven by this scan.");
  if (suppliedPool && !isAddress(suppliedPool)) throw new Error("DOWNRAIL_ARCHIVE_POOL must be a valid pool address.");
  if (archive && (archive.version !== 4 || !isAddress(archive.pool))) throw new Error("Unsupported archive version. Version 4 adds event types and requires a fresh scan into a new output file.");
  const discovered = !archive && !suppliedPool ? (await getMarketSnapshot()).supported.find((item) => item.symbol === symbol) : null;
  const poolAddress = getAddress((archive?.pool ?? suppliedPool ?? discovered?.poolAddress ?? "") as Address);
  if (suppliedPool && poolAddress.toLowerCase() !== suppliedPool.toLowerCase()) throw new Error("Supplied pool differs from the existing archive.");
  const poolAbi = parseAbi(["function marginBank() view returns (address)", "function getOneBase() view returns (uint256)"]);
  const [bankAddress, oneBase] = await Promise.all([
    client.readContract({address:poolAddress,abi:poolAbi,functionName:"marginBank"}),
    client.readContract({address:poolAddress,abi:poolAbi,functionName:"getOneBase"}),
  ]);
  const power = oneBase.toString();
  if (!/^10*$/.test(power) || power.length > 79) throw new Error("Pool base unit is not a supported power of ten.");
  const bankAbi = parseAbi(["function getSystemConfig() view returns ((address marginBank, address collateralToken, address perpPoolFactory, address liquidationEngine, address insuranceFund, address feeRecipient, uint16 maxLeverageLimit, bool fullyWired))"]);
  const system = await client.readContract({address:bankAddress,abi:bankAbi,functionName:"getSystemConfig"});
  const quoteDecimals = await client.readContract({address:system.collateralToken,abi:erc20Abi,functionName:"decimals"});
  if (quoteDecimals > 77) throw new Error("Unsupported collateral decimals.");
  const market = { symbol, poolAddress, marginBank:bankAddress, baseDecimals:power.length-1, quoteDecimals };
  if (!archive) archive = {version:4,chainId:DREAMDEX_CHAIN.id,account,market:symbol,pool:market.poolAddress,bank:market.marginBank,baseDecimals:market.baseDecimals,quoteDecimals:market.quoteDecimals,startBlock:fromText,checkpoint:null,checkpointHash:null,rows:[]};
  if (!archiveIdentityMatches(archive, {version:4,chainId:DREAMDEX_CHAIN.id,account,market:symbol,pool:market.poolAddress,bank:market.marginBank,startBlock:fromText}) || archive.baseDecimals !== market.baseDecimals || archive.quoteDecimals !== market.quoteDecimals || !Array.isArray(archive.rows)) throw new Error("Archive identity, units or start block differ; choose a separate output file.");
  if (archive.checkpoint !== null) {
    if (!/^\d+$/.test(archive.checkpoint) || !archive.checkpointHash) throw new Error("Invalid archive checkpoint.");
    const block = await client.getBlock({ blockNumber: BigInt(archive.checkpoint) });
    if (!checkpointMatches(archive.checkpointHash, block.hash)) throw new Error("Checkpoint block hash changed. Stop and rebuild the archive from a trusted start block.");
  }
  let next = archive.checkpoint === null ? start : BigInt(archive.checkpoint) + 1n;
  if (next <= end && end - next > 99_999n) throw new Error("Choose at most 100,000 new blocks per run.");
  while (next <= end) {
    const upper = chunkEnd(next,end);
    const checkpointBefore = await client.getBlock({ blockNumber: upper });
    const pages = await Promise.all(events.map((event) => retryTransient(() => client.getLogs({address:market.marginBank,event,args:{account,perpPool:market.poolAddress},fromBlock:next,toBlock:upper,strict:true}))));
    // OrderPlaced does not index owner, so read pool events then retain only this account.
    // Fill may precede OrderPlaced in the same transaction; collect placements first.
    const [placed, fills, cancelled, expired, reduced] = await Promise.all([
      retryTransient(() => client.getLogs({address:market.poolAddress,event:placedEvent,fromBlock:next,toBlock:upper,strict:true})),
      retryTransient(() => client.getLogs({address:market.poolAddress,event:filledEvent,fromBlock:next,toBlock:upper,strict:true})),
      retryTransient(() => client.getLogs({address:market.poolAddress,event:cancelledEvent,fromBlock:next,toBlock:upper,strict:true})),
      retryTransient(() => client.getLogs({address:market.poolAddress,event:expiredEvent,fromBlock:next,toBlock:upper,strict:true})),
      retryTransient(() => client.getLogs({address:market.poolAddress,event:reducedEvent,fromBlock:next,toBlock:upper,strict:true})),
    ]);
    const additionalPages = await Promise.all(additionalOrderEvents.map((event) => retryTransient(() => client.getLogs({address:market.poolAddress,event,fromBlock:next,toBlock:upper,strict:true}))));
    const checkpointAfter = await client.getBlock({ blockNumber: upper });
    if (!checkpointAfter.hash || checkpointAfter.hash !== checkpointBefore.hash) throw new Error("Chain changed during scan; range was not checkpointed.");
    const rows: Row[] = pages.flat().map((log) => {
      const args=log.args as {newSize?:bigint;realizedPnl?:bigint;payment?:bigint;amount?:bigint};
      return {type:log.eventName,blockNumber:log.blockNumber.toString(),blockHash:log.blockHash,logIndex:log.logIndex,transactionHash:log.transactionHash,size:args.newSize === undefined ? null : formatUnits(args.newSize,market.baseDecimals),realizedPricePnl:args.realizedPnl === undefined ? null : formatUnits(args.realizedPnl,market.quoteDecimals),amount:args.payment !== undefined ? formatUnits(args.payment,market.quoteDecimals) : args.amount !== undefined ? formatUnits(args.amount,market.quoteDecimals) : null};
    });
    const ownerPlaced = placed.filter((log) => log.args.placedOrder.owner.toLowerCase() === account.toLowerCase());
    const knownIds = new Set(archive.rows.filter((row) => row.type === "OrderPlaced" && row.orderId).map((row) => row.orderId!));
    for (const log of ownerPlaced) knownIds.add(log.args.orderId.toString());
    const common = (log: { eventName:string; blockNumber:bigint; blockHash:`0x${string}`; logIndex:number; transactionHash:`0x${string}` }): Row => ({type:log.eventName,blockNumber:log.blockNumber.toString(),blockHash:log.blockHash,logIndex:log.logIndex,transactionHash:log.transactionHash,size:null,realizedPricePnl:null,amount:null});
    const orderRows: Row[] = ownerPlaced.map((log) => ({ ...common(log), orderId:log.args.orderId.toString(), side:log.args.placedOrder.isBid ? "Buy" : "Sell", quantity:formatUnits(log.args.placedOrder.fullQuantity,market.baseDecimals), price:formatUnits(log.args.placedOrder.price,market.quoteDecimals) }));
    for (const log of fills) {
      const role = knownFillRole(knownIds, log.args.takerOrderId.toString(), log.args.makerOrderId.toString());
      if (role) orderRows.push({...common(log), orderId:role === "maker" ? log.args.makerOrderId.toString() : log.args.takerOrderId.toString(), role, quantity:formatUnits(log.args.quantityFilled,market.baseDecimals),price:formatUnits(log.args.fillPrice,market.quoteDecimals)});
    }
    for (const log of [...cancelled,...expired,...reduced]) if (knownIds.has(log.args.orderId.toString())) orderRows.push({...common(log),orderId:log.args.orderId.toString()});
    for (const log of additionalPages.flat()) if ("orderId" in log.args && knownIds.has(log.args.orderId.toString())) orderRows.push({...common(log),orderId:log.args.orderId.toString()});
    archive.rows = mergeEventRows(archive.rows, [...rows,...orderRows]);
    archive.checkpoint = upper.toString(); archive.checkpointHash = checkpointAfter.hash;
    await mkdir(dirname(path),{recursive:true});
    const temp = `${path}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(archive,null,2), {encoding:"utf8",flag:"wx"});
    await rename(temp,path);
    console.log(`Archived ${next}-${upper}; ${archive.rows.length} matching events total.`);
    next = upper+1n;
  }
  console.log(`Archive complete through ${archive.checkpoint ?? "no blocks"}. Includes position, funding, fee, rebate and observed order events; activity before the start block may be missing.`);
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Archive failed."); process.exitCode = 1; });
