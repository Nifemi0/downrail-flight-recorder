import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createPublicClient, http, isAddress } from "viem";
import { DREAMDEX_CHAIN } from "../lib/dreamdex/config";

/** Local opt-in follower for one account/market. Not a hosted indexer. */
async function main() {
  const [account, market, start, path, flag] = process.argv.slice(2);
  if (!account || !isAddress(account) || !["ETH-PERP","BTC-PERP"].includes(market) || !/^\d{1,16}$/.test(start ?? "") || !path || (flag && flag !== "--once")) throw new Error("Usage: npm run archive:follow -- <account> <ETH-PERP|BTC-PERP> <start-block> <archive.json> [--once]");
  const client=createPublicClient({chain:DREAMDEX_CHAIN,transport:http()});
  const cli=require.resolve("tsx/cli");
  let stopped=false;
  process.on("SIGINT",()=>{ stopped=true; });
  async function runChunk(end: bigint) {
    await new Promise<void>((resolve,reject)=>{
      const child=spawn(process.execPath,[cli,"scripts/archive-events.ts",account,market,start,end.toString(),path],{stdio:"inherit",windowsHide:true});
      child.on("error",reject);
      child.on("exit",(code)=>code===0?resolve():reject(new Error(`Archive process stopped with code ${code}. Check its output before restarting.`)));
    });
  }
  while (!stopped) {
    const head=await client.getBlockNumber();
    if (head < 12n) throw new Error("Chain head is too low to select a confirmed range.");
    let checkpoint=BigInt(start)-1n;
    try {
      const archive=JSON.parse(await readFile(path,"utf8")) as {version?:unknown;chainId?:unknown;account?:unknown;market?:unknown;startBlock?:unknown;checkpoint?:unknown};
      if (archive.version !== 4 || archive.chainId !== DREAMDEX_CHAIN.id || typeof archive.account !== "string" || archive.account.toLowerCase() !== account.toLowerCase() || archive.market !== market || archive.startBlock !== start) throw new Error("Archive version or identity differs. Start a fresh version 4 archive with the correct account, market and start block.");
      if (archive.checkpoint !== null && archive.checkpoint !== undefined) { if (typeof archive.checkpoint !== "string" || !/^\d{1,16}$/.test(archive.checkpoint)) throw new Error("Invalid checkpoint."); checkpoint=BigInt(archive.checkpoint); }
    }
    catch(error) { if ((error as NodeJS.ErrnoException).code!=="ENOENT") throw error; }
    const target=head-12n;
    if (checkpoint < target && checkpoint+1n >= BigInt(start)) {
      const end=checkpoint+1000n < target ? checkpoint+1000n : target;
      await runChunk(end);
    } else console.log(`Waiting: archive checkpoint ${checkpoint}, confirmed target ${target}.`);
    if (flag === "--once" || stopped) break;
    await new Promise<void>((resolve)=>setTimeout(resolve,30000));
  }
}
main().catch((error:unknown)=>{console.error(error instanceof Error?error.message:"Follower failed.");process.exitCode=1;});
