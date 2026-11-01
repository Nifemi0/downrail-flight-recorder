import { MarketConsole } from "./market-console";
import { ArchiveViewer } from "./archive-viewer";
import { getMarketSnapshot } from "@/lib/dreamdex/markets";

export const dynamic = "force-dynamic";

async function readMarketsWithDeadline() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      getMarketSnapshot(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Market read timed out")), 12000); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}

export default async function HomePage() {
  try {
    const snapshot = await readMarketsWithDeadline();
    return <MarketConsole initialSnapshot={snapshot} />;
  } catch {
    return <main>
      <header className="site-header"><a className="brand" href="/" aria-label="Filltrail home"><span className="brand-mark" aria-hidden="true"><span /></span><span>FILLTRAIL</span></a><div className="network-pill">Somnia Hideki · Testnet</div></header>
      <section className="availability-page" aria-labelledby="availability-title">
        <p className="eyebrow">Connection unavailable</p>
        <h1 id="availability-title">We couldn’t load the market data.</h1>
        <p>The dreamDEX market source may be unavailable or slow. Account lookup and order review are paused until it responds.</p>
        <a href="/" className="availability-retry">Try again <span aria-hidden="true">→</span></a>
        <p className="availability-note">Existing positions and orders remain on the testnet. Check them directly in your wallet or on dreamDEX if needed.</p>
        <ArchiveViewer />
      </section>
    </main>;
  }
}
