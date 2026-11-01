import { perpPoolWriteAbi } from "@somnia-chain/markets-sdk";
import { decodeFunctionData, zeroAddress, type Hex } from "viem";

/** Check the SDK-built calldata matches the reviewed order before handing it to a wallet. */
export function orderCalldataMatches(data: Hex, expected: { isBid: boolean; price: bigint; quantity: bigint; expiresNs: bigint }): boolean {
  try {
    const call = decodeFunctionData({ abi: perpPoolWriteAbi, data });
    if (call.functionName !== "placeOrder") return false;
    const [isBid, outcome, price, quantity, expiry, orderType, selfMatch, builder, builderFee] = call.args;
    return isBid === expected.isBid && outcome === 0n && price === expected.price && quantity === expected.quantity && expiry === expected.expiresNs && orderType === 0 && selfMatch === 0 && builder.toLowerCase() === zeroAddress && builderFee === 0n;
  } catch { return false; }
}
