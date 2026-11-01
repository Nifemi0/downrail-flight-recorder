import { createPublicClient, formatUnits, getAddress, http, isAddress, isHex, type Hex } from "viem";
import { NextResponse } from "next/server";
import { DREAMDEX_CHAIN } from "@/lib/dreamdex/config";

export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ address: string }> }) {
  const { address } = await context.params;
  if (!isAddress(address)) return NextResponse.json({error:"Enter a valid account."},{status:400});
  let hashes: unknown;
  try { const body = await request.json() as { hashes?: unknown }; hashes = body?.hashes; }
  catch { return NextResponse.json({error:"Invalid request."},{status:400}); }
  if (!Array.isArray(hashes) || hashes.length === 0 || hashes.length > 20 || hashes.some((hash) => typeof hash !== "string" || !isHex(hash) || hash.length !== 66)) return NextResponse.json({error:"Provide between 1 and 20 full transaction hashes."},{status:400});
  const account=getAddress(address), unique=[...new Set((hashes as Hex[]).map((hash)=>hash.toLowerCase() as Hex))];
  const client=createPublicClient({chain:DREAMDEX_CHAIN,transport:http()});
  const results=await Promise.allSettled(unique.map((hash)=>client.getTransactionReceipt({hash})));
  let total=0n, paid=0, other=0, unavailable=0;
  const rows=results.map((result,index)=>{
    if (result.status === "rejected") { unavailable++; return {hash:unique[index],status:"unavailable",gasSTT:null}; }
    const receipt=result.value;
    if (receipt.from.toLowerCase() !== account.toLowerCase()) {other++;return {hash:unique[index],status:"different payer",gasSTT:null};}
    if (receipt.effectiveGasPrice === undefined || receipt.effectiveGasPrice === null) {unavailable++;return {hash:unique[index],status:"unavailable",gasSTT:null};}
    const gas=receipt.gasUsed*receipt.effectiveGasPrice; total+=gas; paid++;
    return {hash:unique[index],status:"account paid",gasSTT:formatUnits(gas,18)};
  });
  return NextResponse.json({account,chainId:DREAMDEX_CHAIN.id,checkedAt:new Date().toISOString(),paid,other,unavailable,totalSTT:formatUnits(total,18),rows,note:"Gas is for whole transactions sent by this account, not necessarily attributable solely to this position. Missing or unrelated transactions are not included; no USDso conversion is made."},{headers:{"Cache-Control":"no-store"}});
}
