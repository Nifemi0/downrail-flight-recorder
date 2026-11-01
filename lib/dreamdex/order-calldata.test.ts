import { describe, expect, it } from "vitest";
import { encodeFunctionData, zeroAddress } from "viem";
import { perpPoolWriteAbi } from "@somnia-chain/markets-sdk";
import { orderCalldataMatches } from "./order-calldata";
const input = { isBid: true, price: 120n, quantity: 5n, expiresNs: 1000n };
function data(quantity = 5n) { return encodeFunctionData({ abi: perpPoolWriteAbi, functionName: "placeOrder", args: [true,0n,120n,quantity,1000n,0,0,zeroAddress,0n] }); }
describe("reviewed order calldata", () => {
  it("accepts an exact reviewed call", () => expect(orderCalldataMatches(data(), input)).toBe(true));
  it("rejects changed quantity, price, direction, expiry and malformed data", () => {
    expect(orderCalldataMatches(data(6n), input)).toBe(false);
    expect(orderCalldataMatches(data(), {...input, price:121n})).toBe(false);
    expect(orderCalldataMatches(data(), {...input, isBid:false})).toBe(false);
    expect(orderCalldataMatches(data(), {...input, expiresNs:1001n})).toBe(false);
    expect(orderCalldataMatches("0x1234", input)).toBe(false);
  });
});
