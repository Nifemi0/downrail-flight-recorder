# Downrail Flight Recorder — Master Build Prompt

## Context

Downrail Flight Recorder is an explainability layer for real dreamDEX Perps positions on the Somnia Tokyo/Hideki testnet.

It is being built for the dreamDEX Perps Builder Bounty. Public secondary summaries describe two lanes: a feedback track and an MVP track. We are entering the **MVP track**. The earliest reported deadline is **November 1, 2026 at 23:59 UTC**; the DoraHacks/Eventbrite display also extends into November 2 in another timezone. Until the official page is manually confirmed, use November 1 at 23:59 UTC as the hard deadline and October 31 as the internal submission target.

> **Every leveraged trade should explain itself.**

## The problem

Perp traders can see PnL but often cannot explain it. Price movement, partial fills, funding, margin thresholds, reductions, and liquidation risk are distributed across tables, events, and transactions. Bot builders face the same problem when debugging an automated strategy.

## What we ship

### Live flight recorder

The user connects to dreamDEX testnet and places or selects a real ETH-PERP or BTC-PERP position. Downrail records the order, fills, position state, observable funding effects, margin state, reductions, and closure as a chronological lifecycle.

### Explainable position receipt

Downrail converts that lifecycle into a plain-English receipt. Every factual row links to a transaction hash, block, indexer record, or documented calculation. Unknown or unavailable components remain visibly unavailable; they are never invented.

## Why this can win

- It is a consumer-facing perps product rather than another generic trading bot.
- It places and records real dreamDEX testnet orders.
- It makes the protocol's onchain transparency legible to normal users.
- It produces strong judging evidence: transaction hashes, lifecycle artifacts, tests, and a reproducible receipt.
- A visible public competitor is focused on the feedback track, so this occupies a different lane.

## Stack and settlement

- **Network**: Somnia Hideki/Tokyo testnet, chain ID `50383`.
- **Protocol**: dreamDEX Perps through `@somnia-chain/markets-sdk`, the GraphQL indexer, WebSocket feeds, and viem-compatible wallet signing.
- **Markets**: ETH-PERP and BTC-PERP only for the MVP.
- **Frontend**: TypeScript web application, proposed Next.js App Router implementation after the execution spike confirms SDK compatibility.
- **Persistence**: reconstruct receipts from testnet/indexer data where possible; store only minimal non-secret evidence artifacts.
- **Signing**: client-side wallet or an owner-controlled local operator. No server-custodied user keys.
- **Gas and collateral**: STT for gas and paper USDso for positions, supplied through the official testnet flow.

## Acceptance criteria

- [ ] Live market metadata loads from dreamDEX testnet.
- [ ] A small real ETH-PERP or BTC-PERP order is placed and reaches a terminal order state.
- [ ] At least one position lifecycle is captured from open through reduce or close.
- [ ] The receipt shows entry, fills, current/final position state, and all verifiable PnL components.
- [ ] Every receipt statement maps to a hash, indexer record, or tested calculation.
- [ ] Tests pass from a fresh clone and the exact count is recorded.
- [ ] A redacted evidence bundle and execution transcript are committed.
- [ ] README contains the thesis, live status, setup, test command, and proof links.
- [ ] Submission materials accurately state what is and is not live.

## Hard rules

- Two product features maximum.
- No fake or simulated evidence in the submission path.
- No private key collection or server-side custody of user credentials.
- No financial advice or profit promises.
- No deployment, publishing, X post, or DoraHacks submission without explicit owner approval.

