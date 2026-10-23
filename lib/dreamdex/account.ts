import { formatUnits, getAddress, isAddress } from "viem";

import { createDreamDexClient, DREAMDEX_CHAIN } from "./config";
import { getMarketSnapshot, type SupportedPerpMarket } from "./markets";

type SourceState = "verified" | "unavailable";

export type AccountPosition = {
  market: string;
  side: "Long" | "Short" | "Flat";
  size: string;
  averageEntryPrice: string | null;
  realizedPricePnl: string | null;
  updatedAt: string;
  updatedAtBlock: number | null;
};

export type AccountFill = {
  id: string;
  market: string;
  role: "Maker" | "Taker";
  side: "Buy" | "Sell" | "Unknown";
  quantity: string;
  price: string;
  timestamp: string;
  transactionHash: string;
  blockNumber: string | null;
};

export type AccountPositionChange = {
  id: string;
  market: string;
  kind: "OPEN" | "INCREASE" | "REDUCE" | "CLOSE" | "FLIP";
  sideAfter: "Long" | "Short" | "Flat";
  sizeBefore: string;
  sizeAfter: string;
  realizedPricePnl: string;
  timestamp: string;
  transactionHash: string;
  blockNumber: string;
  logIndex: number;
};

export type AccountFunding = {
  id: string;
  market: string;
  direction: "Paid" | "Received" | "Zero";
  amount: string;
  timestamp: string;
  transactionHash: string;
};

export type AccountRecorderSnapshot = {
  checkedAt: string;
  chainId: number;
  account: string;
  positions: AccountPosition[];
  fills: AccountFill[];
  positionChanges: AccountPositionChange[];
  funding: AccountFunding[];
  sourceStatus: Record<"positions" | "fills" | "positionChanges" | "funding", {
    state: SourceState;
    detail: string;
  }>;
};

function compactDecimal(value: string) {
  const [whole, fraction] = value.split(".");
  if (!fraction) return whole;
  const compactFraction = fraction.replace(/0+$/, "").slice(0, 8);
  return compactFraction ? `${whole}.${compactFraction}` : whole;
}

function units(value: bigint | string, decimals: number) {
  return compactDecimal(formatUnits(BigInt(value), decimals));
}

function signedUnits(value: bigint | string, decimals: number) {
  const amount = BigInt(value);
  const magnitude = units(amount < 0n ? -amount : amount, decimals);
  return amount > 0n ? `+${magnitude}` : amount < 0n ? `-${magnitude}` : "0";
}

function sideFromSize(value: bigint | string): "Long" | "Short" | "Flat" {
  const size = BigInt(value);
  return size > 0n ? "Long" : size < 0n ? "Short" : "Flat";
}

function marketForPool(
  pool: string,
  markets: Map<string, SupportedPerpMarket>,
) {
  return markets.get(pool.toLowerCase());
}

function unavailable(error: unknown) {
  return error instanceof Error ? error.message : "The source could not be read.";
}

export async function getAccountRecorderSnapshot(
  rawAccount: string,
): Promise<AccountRecorderSnapshot> {
  if (!isAddress(rawAccount)) {
    throw new Error("Enter a valid EVM wallet address.");
  }

  const account = getAddress(rawAccount);
  const [marketSnapshot, client] = await Promise.all([
    getMarketSnapshot(),
    Promise.resolve(createDreamDexClient().client),
  ]);
  const marketsByPool = new Map(
    marketSnapshot.supported.map((market) => [market.poolAddress.toLowerCase(), market]),
  );

  const [positionsRead, fillsRead, changesRead, fundingRead] = await Promise.allSettled([
    client.listPerpPositions(account, { includeFlat: true, limit: 50 }),
    client.getUserFillsPage(account, { marketType: "PERP", limit: 50 }),
    client.listPerpPositionChanges({ account, order: "desc", limit: 100 }),
    client.getFundingPayments(account, { limit: 100 }),
  ]);

  const positions =
    positionsRead.status === "fulfilled"
      ? positionsRead.value.flatMap<AccountPosition>((position) => {
          const market = marketForPool(position.pool, marketsByPool);
          if (!market) return [];
          return [{
            market: market.symbol,
            side: sideFromSize(position.size),
            size: units(BigInt(position.size) < 0n ? -BigInt(position.size) : position.size, market.baseDecimals),
            averageEntryPrice:
              position.avgEntryPrice === null
                ? null
                : units(position.avgEntryPrice, market.quoteDecimals),
            realizedPricePnl:
              position.lastUpdateRealizedPnl === null
                ? null
                : signedUnits(position.lastUpdateRealizedPnl, market.quoteDecimals),
            updatedAt: position.updatedAt,
            updatedAtBlock: position.updatedAtBlock,
          }];
        })
      : [];

  const fills =
    fillsRead.status === "fulfilled"
      ? fillsRead.value.fills.flatMap<AccountFill>((fill) => {
          const market = marketForPool(fill.pool, marketsByPool);
          if (!market) return [];
          const normalized = account.toLowerCase();
          const role = fill.taker?.toLowerCase() === normalized ? "Taker" : "Maker";
          const side =
            fill.takerIsBid === null
              ? "Unknown"
              : role === "Taker"
                ? fill.takerIsBid ? "Buy" : "Sell"
                : fill.takerIsBid ? "Sell" : "Buy";
          return [{
            id: fill.id,
            market: market.symbol,
            role,
            side,
            quantity: units(fill.quantity, market.baseDecimals),
            price: units(fill.fillPrice, market.quoteDecimals),
            timestamp: fill.timestamp,
            transactionHash: fill.txHash,
            blockNumber: fill.blockNumber ?? null,
          }];
        })
      : [];

  const positionChanges =
    changesRead.status === "fulfilled"
      ? changesRead.value.flatMap<AccountPositionChange>((change) => {
          const market = marketForPool(change.pool, marketsByPool);
          if (!market) return [];
          const before = change.sizeBefore < 0n ? -change.sizeBefore : change.sizeBefore;
          const after = change.sizeAfter < 0n ? -change.sizeAfter : change.sizeAfter;
          return [{
            id: change.id,
            market: market.symbol,
            kind: change.kind,
            sideAfter: sideFromSize(change.sizeAfter),
            sizeBefore: units(before, market.baseDecimals),
            sizeAfter: units(after, market.baseDecimals),
            realizedPricePnl: signedUnits(change.realizedPnl, market.quoteDecimals),
            timestamp: change.timestamp.toString(),
            transactionHash: change.txHash,
            blockNumber: change.blockNumber.toString(),
            logIndex: change.logIndex,
          }];
        })
      : [];

  const funding =
    fundingRead.status === "fulfilled"
      ? fundingRead.value.flatMap<AccountFunding>((payment) => {
          if (!payment.pool) return [];
          const market = marketForPool(payment.pool, marketsByPool);
          if (!market) return [];
          const amount = BigInt(payment.amount);
          return [{
            id: payment.id,
            market: market.symbol,
            direction: amount > 0n ? "Paid" : amount < 0n ? "Received" : "Zero",
            amount: signedUnits(payment.amount, market.quoteDecimals),
            timestamp: payment.timestamp,
            transactionHash: payment.txHash,
          }];
        })
      : [];

  return {
    checkedAt: new Date().toISOString(),
    chainId: DREAMDEX_CHAIN.id,
    account,
    positions,
    fills,
    positionChanges,
    funding,
    sourceStatus: {
      positions: positionsRead.status === "fulfilled"
        ? { state: "verified", detail: `${positions.length} supported market rows returned.` }
        : { state: "unavailable", detail: unavailable(positionsRead.reason) },
      fills: fillsRead.status === "fulfilled"
        ? { state: "verified", detail: `${fills.length} supported perp fills returned.` }
        : { state: "unavailable", detail: unavailable(fillsRead.reason) },
      positionChanges: changesRead.status === "fulfilled"
        ? { state: "verified", detail: `${positionChanges.length} lifecycle rows returned.` }
        : { state: "unavailable", detail: unavailable(changesRead.reason) },
      funding: fundingRead.status === "fulfilled"
        ? { state: "verified", detail: `${funding.length} funding rows returned.` }
        : { state: "unavailable", detail: unavailable(fundingRead.reason) },
    },
  };
}
