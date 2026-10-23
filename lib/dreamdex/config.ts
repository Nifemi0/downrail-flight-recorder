import {
  SOMNIA_HIDEKI_TESTNET_ADDRESSES,
  SomniaMarkets,
} from "@somnia-chain/markets-sdk";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";

export const DREAMDEX_INDEXER_URL =
  "https://hideki-dev.smk.somnia.host/v1/graphql";

export const DREAMDEX_CHAIN = hidekiTestnet;

export function createDreamDexClient() {
  return new SomniaMarkets({
    chain: DREAMDEX_CHAIN,
    indexerUrl: DREAMDEX_INDEXER_URL,
    addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
  });
}
