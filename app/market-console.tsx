"use client";

import { useMemo, useState } from "react";
import { formatUnits } from "viem";

import type { AccountRecorderSnapshot } from "@/lib/dreamdex/account";
import { buildReceiptEvents, formatEventTime } from "@/lib/dreamdex/receipt";
import type { MarketSnapshot } from "@/lib/dreamdex/markets";
import { formatCheckedAt, shortenAddress } from "@/lib/format";

type Props = {
  initialSnapshot: MarketSnapshot;
};

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path d="M6 18 18 6M8 6h10v10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function compactUnits(value: string | null, decimals: number) {
  if (value === null) return "Not indexed";
  const formatted = formatUnits(BigInt(value), decimals);
  const [whole, fraction = ""] = formatted.split(".");
  const trimmed = fraction.replace(/0+$/, "").slice(0, 6);
  return trimmed ? `${whole}.${trimmed}` : whole;
}

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
  const selectedMinimum = `${compactUnits(selected.minQuantity, selected.baseDecimals)} ${selected.baseSymbol}`;
  const selectedLastPrice = selected.lastPrice
    ? `${compactUnits(selected.lastPrice, selected.quoteDecimals)} ${selected.quoteSymbol}`
    : "Awaiting first fill";
  const receiptEvents = accountSnapshot ? buildReceiptEvents(accountSnapshot) : [];

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
          <a href="#explain">What it solves</a>
          <a href="#recorder">Try it</a>
          <a href="#proof">Network proof</a>
        </nav>
        <div className="network-pill">
          <span className="status-dot" />
          Somnia Hideki · Chain {snapshot.chainId}
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">A readable trade record for dreamDEX Perps</p>
          <h1>
            <span>Paste a wallet.</span>
            <span>Understand the trade.</span>
          </h1>
          <p className="hero-description">
            Downrail reads public testnet activity and rebuilds each perp position
            as a plain-English timeline: what was requested, what filled, what funding
            changed, and where the final result came from.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#recorder">
              Open live recorder <span><ArrowIcon /></span>
            </a>
            <a className="text-action" href="#explain">
              See a simple example <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="hero-facts" aria-label="Current product status">
            <div><strong>{snapshot.marketCount}</strong><span>live perp markets</span></div>
            <div><strong>{snapshot.chainId}</strong><span>Somnia chain</span></div>
            <div><strong>No custody</strong><span>your funds stay in your wallet</span></div>
          </div>
        </div>

        <div className="hero-visual" aria-label="Illustrative Downrail position receipt">
          <div className="preview-shell">
            <div className="preview-toolbar">
              <div><span className="preview-logo" />What happened to this position?</div>
              <span className="preview-live"><i /> Product preview</span>
            </div>
            <div className="preview-position">
              <div>
                <span>PUBLIC WALLET · ETH-PERP LONG</span>
                <strong>Your result, broken down</strong>
              </div>
              <div className="preview-pnl">
                <span>Explained PnL</span>
                <strong>+$184.20</strong>
              </div>
            </div>
            <div className="preview-chart" aria-hidden="true">
              <svg viewBox="0 0 560 150" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="currentColor" stopOpacity=".22" />
                    <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path className="chart-area" d="M0 125 C60 118 83 82 142 93 S230 110 284 66 S372 72 420 39 S500 48 560 16 L560 150 L0 150Z" />
                <path className="chart-line" d="M0 125 C60 118 83 82 142 93 S230 110 284 66 S372 72 420 39 S500 48 560 16" />
              </svg>
              <span className="chart-cursor" />
            </div>
            <div className="preview-events">
              <div className="preview-event complete"><i /><span><strong>Order intent</strong><small>Long 1.20 ETH · source linked</small></span><b>Verified</b></div>
              <div className="preview-event complete"><i /><span><strong>Execution</strong><small>3 fills · ordered by block</small></span><b>Indexed</b></div>
              <div className="preview-event active"><i /><span><strong>Position outcome</strong><small>Price PnL and funding separated</small></span><b>Explained</b></div>
            </div>
          </div>
          <div className="floating-proof"><span>Downrail output</span><strong>1 receipt</strong><small>Timeline + sources + result</small></div>
        </div>
      </section>

      <div className="connection-band" aria-label="Live connection status">
        <span><i className="status-dot" />Official SDK connected</span>
        <span>{snapshot.marketCount} markets indexed</span>
        <span>BTC-PERP + ETH-PERP ready</span>
        <span>Read-only until you sign</span>
      </div>

      <section className="explain-section" id="explain">
        <div className="explain-heading">
          <p className="eyebrow">The problem Downrail solves</p>
          <h2>Your exchange shows a PnL number.<br />Downrail shows where it came from.</h2>
          <p>A perp position is spread across orders, partial fills, funding payments, and position updates. Downrail joins those records into one sequence a trader can actually follow.</p>
        </div>

        <div className="comparison-card">
          <div className="comparison-before">
            <span className="comparison-label">Without Downrail</span>
            <p>Exchange result</p>
            <strong>+$184.20</strong>
            <small>You know the outcome, but not the full reason.</small>
          </div>
          <div className="comparison-arrow" aria-hidden="true"><ArrowIcon /></div>
          <div className="comparison-after">
            <span className="comparison-label">With Downrail</span>
            <div><span>Price movement</span><strong>+$210.00</strong></div>
            <div><span>Funding paid</span><strong>−$25.80</strong></div>
            <div className="comparison-total"><span>Explained result</span><strong>+$184.20</strong></div>
            <small>Illustrative breakdown. Each live value keeps its indexer or chain source.</small>
          </div>
        </div>

        <div className="how-flow" aria-label="How Downrail works">
          <article><span>1</span><div><h3>Enter a public wallet</h3><p>No deposit and no private key. Downrail only reads supported testnet activity.</p></div></article>
          <article><span>2</span><div><h3>We rebuild the sequence</h3><p>Orders, fills, funding, and position changes are placed in chronological order.</p></div></article>
          <article><span>3</span><div><h3>You get a readable record</h3><p>See what changed the position and keep the source behind every available claim.</p></div></article>
        </div>
      </section>

      <section className="recorder-section" id="recorder">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Live testnet workspace</p>
            <h2>From wallet address<br />to a clear position story.</h2>
            <p className="section-intro">Choose a supported market, then paste a public wallet that has traded it. The current build reads indexed evidence only—nothing is signed or moved.</p>
          </div>
          <div className="refresh-stack">
            <span>Last verified {formatCheckedAt(snapshot.checkedAt)}</span>
            <button className="refresh-button" onClick={refreshSnapshot} disabled={isRefreshing}>
              {isRefreshing ? "Refreshing…" : "Refresh live data"}
            </button>
          </div>
        </div>

        {refreshError ? <p className="error-banner">{refreshError}</p> : null}

        <div className="workspace">
          <aside className="market-rail" aria-label="Supported markets">
            <div className="rail-heading">
              <p className="panel-label">Choose instrument</p>
              <span>Live</span>
            </div>
            {snapshot.supported.map((market) => (
              <button
                className={market.symbol === selected.symbol ? "market active" : "market"}
                key={market.symbol}
                onClick={() => setSelectedSymbol(market.symbol)}
              >
                <span className="asset-token">{market.baseSymbol}</span>
                <span>
                  <strong>{market.symbol}</strong>
                  <small>{market.tradeCount} indexed fills</small>
                </span>
                <span className="market-arrow" aria-hidden="true">→</span>
              </button>
            ))}
            <div className="rail-note">
              <span className="rail-note-icon" aria-hidden="true" />
              <p><strong>Market discovery live</strong><small>{snapshot.marketCount} perps returned by the official indexer.</small></p>
            </div>
          </aside>

          <article className="capture-panel">
            <div className="capture-header">
              <div>
                <p className="panel-label">Recorder status</p>
                <h3>{selected.symbol} is ready to record.</h3>
              </div>
              <span className="waiting-badge"><i />Awaiting wallet</span>
            </div>

            <div className="market-summary">
              <div>
                <span>Instrument</span>
                <strong>{selected.symbol}</strong>
              </div>
              <div>
                <span>Last indexed price</span>
                <strong>{selectedLastPrice}</strong>
              </div>
              <div>
                <span>Protocol minimum</span>
                <strong>{selectedMinimum}</strong>
              </div>
              <div>
                <span>Pool contract</span>
                <strong>{shortenAddress(selected.poolAddress)}</strong>
              </div>
            </div>

            <div className="empty-flight">
              <div className="empty-flight-copy">
                <span className="radar" aria-hidden="true"><span /></span>
                <div>
                <p className="panel-label">Your next receipt</p>
                <h4>Build a clear position record.</h4>
                <p>
                  Once a wallet is connected, every order event is collected into
                  one chronological record. Nothing is signed by this screen yet.
                </p>
                </div>
              </div>
              <div className="recording-path" aria-label="Recording lifecycle">
                <div className="path-step current"><span /> <p><strong>Market selected</strong><small>{selected.symbol} configuration verified</small></p></div>
                <div className="path-step"><span /> <p><strong>Wallet linked</strong><small>Owner stays in control</small></p></div>
                <div className="path-step"><span /> <p><strong>Events indexed</strong><small>Fills, funding, position changes</small></p></div>
                <div className="path-step"><span /> <p><strong>Receipt ready</strong><small>Readable explanation with sources</small></p></div>
              </div>
            </div>

            <form className="account-lookup" onSubmit={inspectAccount}>
              <div>
                <p className="panel-label">Already traded?</p>
                <label htmlFor="account-address">Inspect an existing testnet wallet.</label>
                <p>Paste a public address. The lookup is read-only and never asks for a signature.</p>
              </div>
              <div className="account-controls">
                <input
                  id="account-address"
                  value={account}
                  onChange={(event) => setAccount(event.target.value)}
                  placeholder="0x…"
                  spellCheck={false}
                  autoComplete="off"
                  aria-describedby="account-privacy"
                />
                <button type="submit" disabled={isInspecting || account.trim().length === 0}>
                  {isInspecting ? "Reading…" : "Inspect trail"}
                </button>
              </div>
              <span className="sr-only" id="account-privacy">Public wallet address only. No signature is requested.</span>
            </form>

            {accountError ? <p className="account-error">{accountError}</p> : null}

            {accountSnapshot ? (
              <div className="account-result">
                <div className="account-result-head">
                  <div>
                    <p className="panel-label">Your position record · Somnia testnet</p>
                    <h4>{shortenAddress(accountSnapshot.account, 10, 8)}</h4>
                  </div>
                  <span>{formatCheckedAt(accountSnapshot.checkedAt)}</span>
                </div>
                <p className="receipt-context">Downrail found the following indexed activity for this public wallet. This is a read-only account view; a complete trade PnL cannot be claimed until all required sources are available and matched to one position.</p>
                <div className="evidence-counts">
                  <div><strong>{accountSnapshot.positions.length}</strong><span>Position rows</span></div>
                  <div><strong>{accountSnapshot.fills.length}</strong><span>Perp fills</span></div>
                  <div><strong>{accountSnapshot.positionChanges.length}</strong><span>Lifecycle events</span></div>
                  <div><strong>{accountSnapshot.funding.length}</strong><span>Funding records</span></div>
                </div>
                <div className="receipt-sources" aria-label="Indexer source status">
                  {Object.entries(accountSnapshot.sourceStatus).map(([name, source]) => (
                    <div key={name}><strong>{name.replace(/([A-Z])/g, " $1")}</strong><span className={source.state}>{source.state}</span><small>{source.detail}</small></div>
                  ))}
                </div>
                {receiptEvents.length > 0 ? (
                  <div className="receipt-timeline">
                    <h5>What happened, in order</h5>
                    {receiptEvents.slice(-30).map((event) => (
                      <article key={event.id}>
                        <span className="timeline-marker" aria-hidden="true" />
                        <div><span className="event-kind">{event.kind}</span><h6>{event.market} · {event.title}</h6><p>{event.detail}</p><small>{formatEventTime(event.timestamp)}{event.blockNumber ? ` · block ${event.blockNumber}` : ""}</small></div>
                        <code title={event.transactionHash}>{shortenAddress(event.transactionHash, 10, 8)}</code>
                      </article>
                    ))}
                    {receiptEvents.length > 30 ? <p className="receipt-limit">Showing the latest 30 indexed events. Earlier activity is omitted from this view.</p> : null}
                  </div>
                ) : (
                  <p className="no-events">
                    No supported events were returned for this address. The wallet may not have traded these markets, or the indexer may not have recorded its activity yet. Check the source status above.
                  </p>
                )}
              </div>
            ) : null}

            <div className="capture-footer">
              <p><span className="status-dot" />Live market configuration verified. No transaction prepared.</p>
              <span className="footer-state">Wallet signing comes with the backend phase</span>
            </div>
          </article>
        </div>
      </section>

      <section className="mechanics-section" id="mechanics">
        <div className="mechanics-layout">
          <div>
            <p className="eyebrow">What the recorder keeps</p>
          <h2>Your PnL deserves an explanation.</h2>
            <p className="section-intro">A position moves through multiple contracts and events. Downrail preserves the sequence, then explains each contribution without pretending missing data exists.</p>
            <a className="text-action" href="#proof">See the live proof <span aria-hidden="true">→</span></a>
          </div>
          <div className="mechanic-stream">
            <article><span className="stream-icon intent-icon" aria-hidden="true" /><div><p className="panel-label">Wallet intent</p><h3>What was requested?</h3><p>Market, side, size, limit, account, and the transaction that carried the instruction.</p></div><small>Transaction source</small></article>
            <article><span className="stream-icon execution-icon" aria-hidden="true" /><div><p className="panel-label">Execution</p><h3>What actually filled?</h3><p>Every partial fill stays in chain order, with quantity, price, role, block, and log position.</p></div><small>Indexer source</small></article>
            <article><span className="stream-icon outcome-icon" aria-hidden="true" /><div><p className="panel-label">Position outcome</p><h3>Why did the result change?</h3><p>Price PnL and funding remain separate. Anything unavailable is named, never guessed.</p></div><small>Calculated + sourced</small></article>
            <article><span className="stream-icon receipt-icon" aria-hidden="true" /><div><p className="panel-label">Receipt</p><h3>Can someone verify it?</h3><p>The final explanation carries hashes and provenance behind every visible claim.</p></div><small>Exportable proof</small></article>
          </div>
        </div>
      </section>

      <section className="proof-section" id="proof">
        <div>
          <p className="eyebrow light">Connected where it counts</p>
          <h2>Built on live evidence.</h2>
          <p>
            The interface is already reading the official dreamDEX testnet indexer
            through the Somnia Markets SDK. We expose exactly what is live—and keep
            signing locked until the transaction path is reviewed.
          </p>
        </div>
        <dl className="proof-ledger">
          <div><dt>Network</dt><dd>Somnia Hideki · {snapshot.chainId}</dd></div>
          <div><dt>Instruments</dt><dd>BTC-PERP · ETH-PERP</dd></div>
          <div><dt>Market records</dt><dd>{snapshot.marketCount} returned live</dd></div>
          <div><dt>Evidence state</dt><dd><span className="ledger-dot" />Indexer verified</dd></div>
          <div><dt>Signing state</dt><dd>Intentionally locked</dd></div>
        </dl>
      </section>

      <section className="final-cta">
        <div>
          <p className="eyebrow">Start with evidence</p>
          <h2>Bring a wallet.<br />Leave with clarity.</h2>
        </div>
        <a className="primary-action" href="#recorder">
          Inspect a wallet <span><ArrowIcon /></span>
        </a>
      </section>

      <footer>
        <div className="footer-brand">
          <a className="brand brand-light" href="#top" aria-label="Back to top">
            <span className="brand-mark" aria-hidden="true"><span /></span>
            <span>DOWNRAIL</span>
          </a>
          <p>Readable, verifiable position intelligence for dreamDEX Perps.</p>
        </div>
        <div className="footer-links">
          <div><span>Product</span><a href="#recorder">Recorder</a><a href="#mechanics">How it works</a></div>
          <div><span>Evidence</span><a href="#proof">Live status</a><a href="#recorder">Inspect wallet</a></div>
        </div>
        <div className="footer-status">
          <span><i className="status-dot" />Somnia testnet</span>
          <small>Local build · No custody</small>
        </div>
      </footer>
    </main>
  );
}
