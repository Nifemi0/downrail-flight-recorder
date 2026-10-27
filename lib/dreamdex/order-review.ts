export type FundingReview = {
  lockAmount: bigint;
  ownWalletPull: bigint;
  mainWalletPull: bigint;
  fundingPayer: string | null;
};

export function withMarginBuffer(value: bigint) {
  return (value * 110n + 99n) / 100n;
}

export function fundingReviewWithinBounds(reviewed: FundingReview, current: FundingReview) {
  return current.lockAmount <= withMarginBuffer(reviewed.lockAmount) && current.ownWalletPull <= withMarginBuffer(reviewed.ownWalletPull) &&
    current.mainWalletPull <= withMarginBuffer(reviewed.mainWalletPull) && reviewed.fundingPayer?.toLowerCase() === current.fundingPayer?.toLowerCase();
}
