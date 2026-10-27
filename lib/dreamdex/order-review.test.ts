import { describe, expect, it } from "vitest";
import { fundingReviewWithinBounds, withMarginBuffer } from "./order-review";

describe("wallet funding review", () => {
  const reviewed = { lockAmount: 5n, ownWalletPull: 3n, mainWalletPull: 2n, fundingPayer: "0xABC" };
  it("accepts unchanged funding amounts and case-insensitive payer addresses", () => {
    expect(fundingReviewWithinBounds(reviewed, { ...reviewed, fundingPayer: "0xabc" })).toBe(true);
  });
  it.each(["lockAmount", "ownWalletPull", "mainWalletPull"] as const)("requires a fresh review when %s changes", (field) => {
    expect(fundingReviewWithinBounds(reviewed, { ...reviewed, [field]: 10n })).toBe(false);
  });
  it("requires a fresh review when the linked payer changes", () => {
    expect(fundingReviewWithinBounds(reviewed, { ...reviewed, fundingPayer: "0xdef" })).toBe(false);
  });
  it("allows changes inside the displayed buffer and prevents a new linked-wallet pull", () => {
    expect(fundingReviewWithinBounds(reviewed, { ...reviewed, lockAmount: withMarginBuffer(reviewed.lockAmount) })).toBe(true);
    const noMain = { ...reviewed, mainWalletPull: 0n, fundingPayer: null };
    expect(fundingReviewWithinBounds(noMain, { ...noMain, mainWalletPull: 1n })).toBe(false);
  });
});
