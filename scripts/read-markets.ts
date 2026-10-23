import {
  SOMNIA_HIDEKI_TESTNET_ADDRESSES,
  SomniaMarkets,
} from "@somnia-chain/markets-sdk";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";

const INDEXER_URL = "https://hideki-dev.smk.somnia.host/v1/graphql";

async function main() {
  const markets = new SomniaMarkets({
    chain: hidekiTestnet,
    indexerUrl: INDEXER_URL,
    addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
  });

  const perps = await markets.client.listPerpMarkets();
  const supported = perps
    .filter((market) => market.baseSymbol === "BTC" || market.baseSymbol === "ETH")
    .map((market) => ({
      symbol: `${market.baseSymbol}-PERP`,
      poolAddress: market.poolAddress,
      marginBank: market.marginBank,
      stopRegistry: market.stopRegistry,
      quoteToken: market.quoteToken,
      baseDecimals: market.baseDecimals,
      quoteDecimals: market.quoteDecimals,
      tickSize: market.tickSize.toString(),
      lotSize: market.lotSize.toString(),
      minQuantity: market.minQuantity.toString(),
    }));

  if (supported.length !== 2) {
    throw new Error(`Expected BTC and ETH perp markets, received ${supported.length}`);
  }

  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        chainId: hidekiTestnet.id,
        indexerUrl: INDEXER_URL,
        marketCount: perps.length,
        supported,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

