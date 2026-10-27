import { formatUnits, getAddress, isAddress } from "viem";

import { createDreamDexClient, DREAMDEX_CHAIN } from "./config";
import { getMarketSnapshot, type SupportedPerpMarket } from "./markets";

type SourceState = "indexed" | "unavailable";
type SourceName = "positions" | "openOrders" | "orderHistory" | "fills" | "positionChanges" | "funding" | "marginEvents" | "liquidations";
const PAGE_SIZE = 50;

type PageCursor = { offset: number; fillsCursor: string | null };

function decodeCursor(value: string | null): PageCursor {
  if (!value) return { offset: 0, fillsCursor: null };
  if (value.length > 4096) throw new Error("Invalid page cursor.");
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as PageCursor;
    if (!Number.isSafeInteger(parsed.offset) || parsed.offset < 0 || parsed.offset % PAGE_SIZE !== 0 || (parsed.fillsCursor !== null && typeof parsed.fillsCursor !== "string")) throw new Error();
    return parsed;
  } catch { throw new Error("Invalid page cursor."); }
}

function encodeCursor(value: PageCursor) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

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
  role: "Maker" | "Taker" | "Unknown";
  side: "Buy" | "Sell" | "Unknown";
  quantity: string;
  price: string;
  timestamp: string;
  transactionHash: string;
  blockNumber: string | null;
  logIndex: number | null;
  orderId: string | null;
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

export type AccountOrder = {
  id: string;
  market: string;
  status: string;
  side: "Buy" | "Sell";
  quantity: string;
  filledQuantity: string;
  price: string;
  placedAt: string;
  lastUpdatedAt: string | null;
  placedTransactionHash: string;
};

export type AccountMarginEvent = {
  id: string;
  market: string;
  kind: string;
  amount: string;
  timestamp: string;
  transactionHash: string;
};

export type AccountLiquidation = {
  id: string;
  market: string;
  kind: string;
  timestamp: string;
  transactionHash: string;
  blockNumber: string;
};

export type AccountRecorderSnapshot = {
  checkedAt: string;
  chainId: number;
  account: string;
  positions: AccountPosition[];
  openOrders: AccountOrder[];
  orderHistory: AccountOrder[];
  fills: AccountFill[];
  positionChanges: AccountPositionChange[];
  funding: AccountFunding[];
  marginEvents: AccountMarginEvent[];
  liquidations: AccountLiquidation[];
  page: number;
  nextCursor: string | null;
  sourceStatus: Record<SourceName, {
    state: SourceState;
    detail: string;
    hasMore: boolean;
  }>;
};

function compactDecimal(value: string) {
  const [whole, fraction] = value.split(".");
  if (!fraction) return whole;
  const compactFraction = fraction.replace(/0+$/, "");
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
  cursorValue: string | null = null,
): Promise<AccountRecorderSnapshot> {
  if (!isAddress(rawAccount)) {
    throw new Error("Enter a valid EVM wallet address.");
  }

  const account = getAddress(rawAccount);
  const cursor = decodeCursor(cursorValue);
  const [marketSnapshot, client] = await Promise.all([
    getMarketSnapshot(),
    Promise.resolve(createDreamDexClient().client),
  ]);
  const marketsByPool = new Map(
    marketSnapshot.supported.map((market) => [market.poolAddress.toLowerCase(), market]),
  );

  const [positionsRead, openOrdersRead, orderHistoryRead, fillsRead, changesRead, fundingRead, marginRead, liquidationRead] = await Promise.allSettled([
    client.listPerpPositions(account, { includeFlat: true, limit: PAGE_SIZE + 1, offset: cursor.offset }),
    client.getPerpPortfolio(account, { ordersLimit: 1000, tradesLimit: 0 }),
    client.listPerpOrderHistory(account, { limit: PAGE_SIZE + 1, offset: cursor.offset }),
    cursor.offset > 0 && cursor.fillsCursor === null
      ? Promise.resolve({ fills: [], nextCursor: null, datasetGeneration: "" })
      : client.getUserFillsPage(account, { marketType: "PERP", limit: PAGE_SIZE, ...(cursor.fillsCursor ? { cursor: cursor.fillsCursor } : {}) }),
    client.listPerpPositionChanges({ account, order: "desc", limit: PAGE_SIZE + 1, offset: cursor.offset }),
    client.getFundingPayments(account, { limit: PAGE_SIZE + 1, offset: cursor.offset }),
    client.getMarginEvents(account, { limit: PAGE_SIZE + 1, offset: cursor.offset }),
    client.listLiquidations({ account, limit: PAGE_SIZE + 1, offset: cursor.offset }),
  ]);

  const positions =
    positionsRead.status === "fulfilled"
      ? positionsRead.value.slice(0, PAGE_SIZE).flatMap<AccountPosition>((position) => {
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

  const openOrders = openOrdersRead.status === "fulfilled"
    ? openOrdersRead.value.openOrders.slice(cursor.offset, cursor.offset + PAGE_SIZE).flatMap<AccountOrder>((order) => {
        const market = marketForPool(order.market.poolAddress, marketsByPool);
        if (!market) return [];
        return [{ id: order.id, market: market.symbol, status: "Open", side: order.isBid ? "Buy" : "Sell", quantity: units(order.fullQuantity, market.baseDecimals), filledQuantity: units(order.filledQuantity, market.baseDecimals), price: units(order.price, market.quoteDecimals), placedAt: order.placedAtTimestamp, lastUpdatedAt: null, placedTransactionHash: order.placedTxHash }];
      })
    : [];

  const orderHistory = orderHistoryRead.status === "fulfilled"
    ? orderHistoryRead.value.slice(0, PAGE_SIZE).flatMap<AccountOrder>((order) => {
        const market = marketForPool(order.market.poolAddress, marketsByPool);
        if (!market) return [];
        return [{ id: order.id, market: market.symbol, status: order.status, side: order.isBid ? "Buy" : "Sell", quantity: units(order.fullQuantity, market.baseDecimals), filledQuantity: units(order.filledQuantity, market.baseDecimals), price: units(order.price, market.quoteDecimals), placedAt: order.placedAtTimestamp, lastUpdatedAt: order.lastUpdatedAtTimestamp, placedTransactionHash: order.placedTxHash }];
      })
    : [];

  const fills =
    fillsRead.status === "fulfilled"
      ? fillsRead.value.fills.flatMap<AccountFill>((fill) => {
          const market = marketForPool(fill.pool, marketsByPool);
          if (!market) return [];
          const normalized = account.toLowerCase();
          const role = fill.taker?.toLowerCase() === normalized ? "Taker" : fill.maker?.toLowerCase() === normalized ? "Maker" : "Unknown";
          const side =
            fill.takerIsBid === null || role === "Unknown"
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
            logIndex: fill.logIndex ?? null,
            orderId: role === "Taker" ? fill.takerOrderId : role === "Maker" ? fill.makerOrderId : null,
          }];
        })
      : [];

  const positionChanges =
    changesRead.status === "fulfilled"
      ? changesRead.value.slice(0, PAGE_SIZE).flatMap<AccountPositionChange>((change) => {
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
      ? fundingRead.value.slice(0, PAGE_SIZE).flatMap<AccountFunding>((payment) => {
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

  const marginEvents = marginRead.status === "fulfilled"
    ? marginRead.value.slice(0, PAGE_SIZE).flatMap<AccountMarginEvent>((event) => {
        const market = event.pool ? marketForPool(event.pool, marketsByPool) : null;
        if (event.pool && !market) return [];
        const quoteDecimals = market?.quoteDecimals ?? marketSnapshot.supported[0].quoteDecimals;
        return [{ id: event.id, market: market?.symbol ?? "Account", kind: event.kind, amount: signedUnits(event.amount, quoteDecimals), timestamp: event.timestamp, transactionHash: event.txHash }];
      })
    : [];

  const liquidations = liquidationRead.status === "fulfilled"
    ? liquidationRead.value.slice(0, PAGE_SIZE).flatMap<AccountLiquidation>((event) => {
        const market = event.pool ? marketForPool(event.pool, marketsByPool) : null;
        if (event.pool && !market) return [];
        return [{ id: event.id, market: market?.symbol ?? "Account", kind: event.kind, timestamp: event.timestamp, transactionHash: event.txHash, blockNumber: event.blockNumber }];
      })
    : [];

  const hasMore = {
    positions: positionsRead.status === "fulfilled" && positionsRead.value.length > PAGE_SIZE,
    openOrders: openOrdersRead.status === "fulfilled" && openOrdersRead.value.openOrders.length > cursor.offset + PAGE_SIZE,
    orderHistory: orderHistoryRead.status === "fulfilled" && orderHistoryRead.value.length > PAGE_SIZE,
    fills: fillsRead.status === "fulfilled" && fillsRead.value.nextCursor !== null,
    positionChanges: changesRead.status === "fulfilled" && changesRead.value.length > PAGE_SIZE,
    funding: fundingRead.status === "fulfilled" && fundingRead.value.length > PAGE_SIZE,
    marginEvents: marginRead.status === "fulfilled" && marginRead.value.length > PAGE_SIZE,
    liquidations: liquidationRead.status === "fulfilled" && liquidationRead.value.length > PAGE_SIZE,
  };
  const anySourceFailed = [positionsRead, openOrdersRead, orderHistoryRead, fillsRead, changesRead, fundingRead, marginRead, liquidationRead].some((read) => read.status === "rejected");
  // Do not advance the shared offsets past a failed source: retry this page instead.
  const nextCursor = !anySourceFailed && Object.values(hasMore).some(Boolean)
    ? encodeCursor({ offset: cursor.offset + PAGE_SIZE, fillsCursor: fillsRead.status === "fulfilled" ? fillsRead.value.nextCursor : null })
    : null;

  function status(name: SourceName, result: PromiseSettledResult<unknown>, count: number) {
    return result.status === "fulfilled"
      ? { state: "indexed" as const, detail: `${count} supported rows on this page${hasMore[name] ? "; older rows available" : ""}.`, hasMore: hasMore[name] }
      : { state: "unavailable" as const, detail: unavailable(result.reason), hasMore: false };
  }

  return {
    checkedAt: new Date().toISOString(),
    chainId: DREAMDEX_CHAIN.id,
    account,
    positions,
    openOrders,
    orderHistory,
    fills,
    positionChanges,
    funding,
    marginEvents,
    liquidations,
    page: cursor.offset / PAGE_SIZE + 1,
    nextCursor,
    sourceStatus: {
      positions: status("positions", positionsRead, positions.length),
      openOrders: status("openOrders", openOrdersRead, openOrders.length),
      orderHistory: status("orderHistory", orderHistoryRead, orderHistory.length),
      fills: status("fills", fillsRead, fills.length),
      positionChanges: status("positionChanges", changesRead, positionChanges.length),
      funding: status("funding", fundingRead, funding.length),
      marginEvents: status("marginEvents", marginRead, marginEvents.length),
      liquidations: status("liquidations", liquidationRead, liquidations.length),
    },
  };
}
