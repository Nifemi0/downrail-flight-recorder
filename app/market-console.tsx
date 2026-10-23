"use client";

import { useMemo, useState } from "react";
import { formatUnits } from "viem";

import type { AccountRecorderSnapshot } from "@/lib/dreamdex/account";
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
          <a href="#mechanics">How it works</a>
          <a href="#recorder">Recorder</a>
          <a href="#proof">Proof</a>
        </nav>
        <div className="network-pill">
          <span className="status-dot" />
          Somnia Hideki · Chain {snapshot.chainId}
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">The black box for dreamDEX Perps</p>
          <h1>
            <span>Every trade</span>
            <span>leaves a trail.</span>
          </h1>
          <p className="hero-description">
            Downrail records a position from intent to outcome, then turns the raw
            chain events into one receipt a trader can read, verify, and share.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#recorder">
              Open the recorder <span><ArrowIcon /></span>
            </a>
            <a className="text-action" href="#mechanics">
              See the evidence flow <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="hero-facts" aria-label="Current product status">
            <div><strong>{snapshot.marketCount}</strong><span>live perp markets</span></div>
            <div><strong>{snapshot.chainId}</strong><span>Somnia chain</span></div>
            <div><strong>Read only</strong><span>until you sign</span></div>
          </div>
        </div>

        <div className="hero-visual" aria-label="Trade evidence flowing into a receipt">
          <div className="signal-grid" aria-hidden="true" />
          <div className="orbit orbit-one" aria-hidden="true" />
          <div className="orbit orbit-two" aria-hidden="true" />
          <div className="evidence-node node-order"><span />Order intent</div>
          <div className="evidence-node node-fill"><span />Ordered fills</div>
          <div className="evidence-node node-funding"><span />Funding</div>
          <div className="receipt-card">
            <div className="receipt-card-top">
              <span>RECEIPT ANATOMY</span>
              <span className="verified-label">ILLUSTRATIVE</span>
            </div>
            <strong>One position. One provable story.</strong>
            <div className="receipt-line">
              <span>Order intent</span>
              <span>TX + PARAMETERS</span>
            </div>
            <div className="receipt-line">
              <span>Execution</span>
              <span>ORDERED FILLS</span>
            </div>
            <div className="receipt-line">
              <span>Outcome</span>
              <span>PNL + FUNDING</span>
            </div>
            <div className="receipt-proof"><span className="proof-check" />Every line keeps its source.</div>
          </div>
        </div>
      </section>

      <div className="connection-band" aria-label="Live connection status">
        <span><i className="status-dot" />Live SDK connection</span>
        <span>BTC-PERP + ETH-PERP</span>
        <span>Indexer-backed evidence</span>
        <span>No custody. No hidden signing.</span>
      </div>

      <section className="recorder-section" id="recorder">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Live testnet workspace</p>
            <h2>Record first.<br />Explain everything.</h2>
            <p className="section-intro">Start with a live market or inspect a wallet that has already traded. Downrail keeps the evidence together from the first event.</p>
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
                <p className="panel-label">Your next recording</p>
                <h4>No black boxes from here.</h4>
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
            <h2>A trade is not one number.</h2>
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
          <h2>Proof before polish.</h2>
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
          <h2>Bring a position.<br />Leave with proof.</h2>
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
          <p>The verifiable flight recorder for dreamDEX Perps.</p>
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
