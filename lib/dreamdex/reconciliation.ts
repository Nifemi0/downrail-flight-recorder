import { formatUnits, parseUnits } from "viem";
import type { AccountRecorderSnapshot } from "./account";
import type { PositionReceipt } from "./position-receipt";

function sum(values: string[]) {
  const decimals = Math.max(0, ...values.map((value) => (value.split(".")[1] ?? "").length));
  return formatUnits(values.reduce((total, value) => total + parseUnits(value.replace(/^\+/, ""), decimals), 0n), decimals);
}

/** Transaction matches are evidence of association, not proof of full lifecycle accounting. */
export function reconcilePosition(snapshot: AccountRecorderSnapshot, receipts: PositionReceipt[], receipt: PositionReceipt) {
  const owners = new Map<string, Set<string>>();
  for (const group of receipts) for (const change of group.changes) {
    const key = `${group.market}:${change.transactionHash.toLowerCase()}`;
    const ids = owners.get(key) ?? new Set<string>(); ids.add(group.id); owners.set(key, ids);
  }
  const belongs = (market: string, hash: string) => market === receipt.market && owners.get(`${market}:${hash.toLowerCase()}`)?.size === 1 && owners.get(`${market}:${hash.toLowerCase()}`)?.has(receipt.id) === true;
  const fees = snapshot.fees.filter((row) => belongs(row.market, row.transactionHash));
  const funding = snapshot.funding.filter((row) => belongs(row.market, row.transactionHash));
  const unmatchedFees = snapshot.fees.filter((row) => row.market === receipt.market && !belongs(row.market, row.transactionHash));
  const unmatchedFunding = snapshot.funding.filter((row) => row.market === receipt.market && !belongs(row.market, row.transactionHash));
  const transactions = new Set(receipt.changes.map((change) => change.transactionHash.toLowerCase()));
  const liquidationEvents = (snapshot.liquidations ?? []).filter((row) => (row.market === receipt.market || row.market === "Account") && transactions.has(row.transactionHash.toLowerCase()));
  const feeImpact = sum(fees.map((fee) => `${fee.isRebate ? "" : "-"}${fee.amount}`));
  // Funding amount is positive when owed and negative when received.
  const fundingOwed = sum(funding.map((row) => row.amount));
  const fundingImpact = fundingOwed.startsWith("-") ? fundingOwed.slice(1) : fundingOwed === "0" ? "0" : `-${fundingOwed}`;
  const observedSubtotal = sum([receipt.observedPricePnl, feeImpact, fundingImpact]);
  return { fees, funding, unmatchedFees, unmatchedFunding, liquidationEvents, feeImpact, fundingImpact, observedSubtotal };
}
