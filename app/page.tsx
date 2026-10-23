import { MarketConsole } from "./market-console";
import { getMarketSnapshot } from "@/lib/dreamdex/markets";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const snapshot = await getMarketSnapshot();
  return <MarketConsole initialSnapshot={snapshot} />;
}
