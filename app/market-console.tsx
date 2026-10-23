"use client";

import { useMemo, useState } from "react";

import type { AccountRecorderSnapshot } from "@/lib/dreamdex/account";
import type { MarketSnapshot } from "@/lib/dreamdex/markets";
import { formatCheckedAt, shortenAddress } from "@/lib/format";

type Props = {
  initialSnapshot: MarketSnapshot;
};

export function MarketConsole({ initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedSymbol, setSelectedSymbol] = useState("ETH-PERP");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [account, setAccount] = useState("");
  const [accountSnapshot, setAccountSnapshot] = useState<AccountRecorderSnapshot | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  const selected = useMemo(
    () =>
      snapshot.supported.find((market) => market.symbol === selectedSymbol) ??
      snapshot.supported[0],
    [selectedSymbol, snapshot.supported],
  );

  async function refreshSnapshot() {
    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const response = await fetch("/api/markets", { cache: "no-store" });
      const body = (await response.json()) as MarketSnapshot | { error: string };
      if (!response.ok || "error" in body) {
        throw new Error("error" in body ? body.error : "Refresh failed.");
      }
      setSnapshot(body);
    } catch (error) {
      setRefreshError(
        error instanceof Error ? error.message : "The live read could not be refreshed.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function inspectAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsInspecting(true);
    setAccountError(null);
    setAccountSnapshot(null);

    try {
      const response = await fetch(`/api/accounts/${encodeURIComponent(account.trim())}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as AccountRecorderSnapshot | { error: string };
      if (!response.ok || "error" in body) {
        throw new Error("error" in body ? body.error : "Account lookup failed.");
      }
      setAccountSnapshot(body);
    } catch (error) {
      setAccountError(
        error instanceof Error ? error.message : "The account lifecycle could not be read.",
      );
    } finally {
      setIsInspecting(false);
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Downrail Flight Recorder home">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>DOWNRAIL</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#recorder">Recorder</a>
          <a href="#proof">Proof</a>
          <a href="#mechanics">How it works</a>
        </nav>
        <div className="network-pill">
          <span className="status-dot" />
          Somnia Hideki · Chain {snapshot.chainId}
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Explainable perps infrastructure</p>
          <h1>Every leveraged trade should explain itself.</h1>
          <p className="hero-description">
            Downrail records a dreamDEX position from order to outcome, then turns
            the chain evidence into a receipt a trader can actually understand.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#recorder">
              Open the recorder <span aria-hidden="true">↗</span>
            </a>
            <a className="text-action" href="#mechanics">
              See what gets captured <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        <div className="hero-visual" aria-label="Trade evidence flowing into a receipt">
          <div className="signal-grid" aria-hidden="true" />
          <div className="orbit orbit-one" aria-hidden="true" />
          <div className="orbit orbit-two" aria-hidden="true" />
          <div className="receipt-card">
            <div className="receipt-card-top">
              <span>POSITION RECEIPT</span>
              <span className="verified-label">CHAIN VERIFIED</span>
            </div>
            <strong>Why did this trade move?</strong>
            <div className="receipt-line">
              <span>Entry and fills</span>
              <span>Waiting</span>
            </div>
            <div className="receipt-line">
              <span>Funding impact</span>
              <span>Waiting</span>
            </div>
            <div className="receipt-line">
              <span>Realized PnL</span>
              <span>Waiting</span>
            </div>
            <div className="receipt-proof">Each line links back to source evidence.</div>
          </div>
        </div>
      </section>

      <section className="recorder-section" id="recorder">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Live testnet workspace</p>
            <h2>Choose a market. Record the whole story.</h2>
          </div>
          <button className="refresh-button" onClick={refreshSnapshot} disabled={isRefreshing}>
            {isRefreshing ? "Refreshing…" : "Refresh live data"}
          </button>
        </div>

        {refreshError ? <p className="error-banner">{refreshError}</p> : null}

        <div className="workspace">
          <aside className="market-rail" aria-label="Supported markets">
            <p className="panel-label">Verified markets</p>
            {snapshot.supported.map((market) => (
              <button
                className={market.symbol === selected.symbol ? "market active" : "market"}
                key={market.symbol}
                onClick={() => setSelectedSymbol(market.symbol)}
              >
                <span className="asset-token">{market.baseSymbol}</span>
                <span>
                  <strong>{market.symbol}</strong>
                  <small>Quoted in {market.quoteSymbol}</small>
                </span>
                <span className="market-arrow" aria-hidden="true">→</span>
              </button>
            ))}
            <div className="rail-note">
              <span className="status-dot" />
              {snapshot.marketCount} perp markets found
            </div>
          </aside>

          <article className="capture-panel">
            <div className="capture-header">
              <div>
                <p className="panel-label">Recorder status</p>
                <h3>Ready for a verified testnet position</h3>
              </div>
              <span className="waiting-badge">Waiting for wallet</span>
            </div>

            <div className="market-summary">
              <div>
                <span>Selected market</span>
                <strong>{selected.symbol}</strong>
              </div>
              <div>
                <span>Pool</span>
                <strong>{shortenAddress(selected.poolAddress)}</strong>
              </div>
              <div>
                <span>Minimum quantity</span>
                <strong>{selected.minQuantity} raw</strong>
              </div>
              <div>
                <span>Trades indexed</span>
                <strong>{selected.tradeCount}</strong>
              </div>
            </div>

            <div className="empty-flight">
              <span className="radar" aria-hidden="true"><span /></span>
              <div>
                <h4>No position has been recorded yet.</h4>
                <p>
                  Connect a funded testnet wallet, place a supported perp order,
                  and Downrail will correlate the transaction, fills, position,
                  funding, and close into one evidence trail.
                </p>
              </div>
            </div>

            <form className="account-lookup" onSubmit={inspectAccount}>
              <div>
                <label htmlFor="account-address">Inspect an existing testnet wallet</label>
                <p>Read-only. This does not connect, sign, or submit anything.</p>
              </div>
              <div className="account-controls">
                <input
                  id="account-address"
                  value={account}
                  onChange={(event) => setAccount(event.target.value)}
                  placeholder="0x…"
                  spellCheck={false}
                  autoComplete="off"
                />
                <button type="submit" disabled={isInspecting || account.trim().length === 0}>
                  {isInspecting ? "Reading…" : "Inspect evidence"}
                </button>
              </div>
            </form>

            {accountError ? <p className="account-error">{accountError}</p> : null}

            {accountSnapshot ? (
              <div className="account-result">
                <div className="account-result-head">
                  <div>
                    <p className="panel-label">Indexed account evidence</p>
                    <h4>{shortenAddress(accountSnapshot.account, 10, 8)}</h4>
                  </div>
                  <span>{formatCheckedAt(accountSnapshot.checkedAt)}</span>
                </div>
                <div className="evidence-counts">
                  <div><strong>{accountSnapshot.positions.length}</strong><span>Position rows</span></div>
                  <div><strong>{accountSnapshot.fills.length}</strong><span>Perp fills</span></div>
                  <div><strong>{accountSnapshot.positionChanges.length}</strong><span>Lifecycle events</span></div>
                  <div><strong>{accountSnapshot.funding.length}</strong><span>Funding records</span></div>
                </div>
                {accountSnapshot.positionChanges.length > 0 ? (
                  <div className="event-list">
                    {accountSnapshot.positionChanges.slice(0, 6).map((change) => (
                      <article key={change.id}>
                        <span className={`event-kind event-${change.kind.toLowerCase()}`}>{change.kind}</span>
                        <div>
                          <strong>{change.market} · {change.sideAfter}</strong>
                          <small>Size {change.sizeBefore} → {change.sizeAfter}</small>
                        </div>
                        <div className="event-outcome">
                          <strong>{change.realizedPricePnl} {selected.quoteSymbol}</strong>
                          <small>Price PnL · block {change.blockNumber}</small>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="no-events">
                    No supported lifecycle rows were returned for this address. That can
                    mean the wallet has not traded these markets or the indexer has not
                    recorded the activity yet.
                  </p>
                )}
              </div>
            ) : null}

            <div className="capture-footer">
              <p>
                Live market configuration verified at {formatCheckedAt(snapshot.checkedAt)}.
                No transaction has been prepared or signed.
              </p>
              <button className="connect-button" disabled>
                Wallet connection next
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="mechanics-section" id="mechanics">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">What Downrail proves</p>
            <h2>From one opaque number to a complete explanation.</h2>
          </div>
        </div>
        <div className="mechanic-grid">
          <article>
            <span className="mechanic-icon order-icon" aria-hidden="true" />
            <h3>Order intent</h3>
            <p>What the wallet asked for, on which market, and under which limits.</p>
          </article>
          <article>
            <span className="mechanic-icon fill-icon" aria-hidden="true" />
            <h3>Execution trail</h3>
            <p>Which fills changed the position, in exact block and event order.</p>
          </article>
          <article>
            <span className="mechanic-icon pnl-icon" aria-hidden="true" />
            <h3>PnL explanation</h3>
            <p>Price movement, funding, and realized outcome—never a mystery total.</p>
          </article>
          <article>
            <span className="mechanic-icon proof-icon" aria-hidden="true" />
            <h3>Proof package</h3>
            <p>A redacted receipt with hashes and provenance behind every claim.</p>
          </article>
        </div>
      </section>

      <section className="proof-section" id="proof">
        <div>
          <p className="eyebrow light">Current verified capability</p>
          <h2>Live market discovery is connected.</h2>
          <p>
            Downrail is reading the official dreamDEX testnet indexer through the
            Somnia Markets SDK. Order signing is intentionally still locked until
            the wallet path is implemented and reviewed.
          </p>
        </div>
        <dl className="proof-ledger">
          <div><dt>Chain ID</dt><dd>{snapshot.chainId}</dd></div>
          <div><dt>Supported now</dt><dd>BTC-PERP · ETH-PERP</dd></div>
          <div><dt>Evidence state</dt><dd>Verified live read</dd></div>
          <div><dt>Signing state</dt><dd>Not enabled</dd></div>
        </dl>
      </section>

      <footer>
        <div>
          <span className="footer-wordmark">DOWNRAIL</span>
          <p>A verifiable flight recorder for leveraged positions.</p>
        </div>
        <div className="footer-meta">
          <span>Built for dreamDEX Perps</span>
          <span>Somnia testnet only</span>
        </div>
      </footer>
    </main>
  );
}
