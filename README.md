# Downrail Flight Recorder

> Every leveraged trade should explain itself.

Downrail Flight Recorder is a testnet account activity viewer for dreamDEX Perps with an optional wallet-signed limit order flow. It pages through the official testnet indexer's supported account records, shows their sources, and lets a reader check a transaction hash separately against the Somnia chain RPC.

## Current status

**The local indexer viewer is live.** For a public wallet it reads supported positions, open orders, order history, fills, position changes, margin events, funding, and liquidation stages. A position receipt groups observed changes, links fills by market and transaction, links matching indexed orders by order ID, and can be exported as JSON. Older records can be loaded in pages. The app can check a transaction receipt through RPC and decode a supported fill's on-chain quantity and price for comparison. A separate block-pinned on-chain snapshot shows an open position’s mark-to-market price PnL and accrued funding when the mark is available. It does not independently verify wallet involvement or every indexed field.

An owner-controlled wallet opened and closed a real ETH-PERP position through the local app on Hideki testnet. The buy of 0.004 ETH filled at 2308.49 paper USDso in transaction `0x15766748dfd03bd61d5e786f9d4ec9177f2c82763b401ad78ac5a2762453fe95`, block 34005026. The sell filled at 2306.86 in transaction `0xa17812dca463b120ceb1c1b51acbd2115a4892cd5eb91d9f46bb2cef24532721`, block 34007780. The indexer reported a flat position and -0.00652 USDso realized price PnL. The two RPC fill logs agree with the indexed prices and quantities; see [opening evidence](evidence/owner-testnet-open.json), [closing evidence](evidence/owner-testnet-close.json), and the [exported position receipt](evidence/owner-position-receipt.json). Funding, fees, and complete net PnL have not been reconciled.

This is a client of dreamDEX's official indexer, **not a self-hosted independent chain indexer**. The official SDK currently caps the open-order response at 1,000, and newly indexed activity can shift older offset pages. Source errors and missing rows are shown rather than replaced with demo numbers.

## Run locally

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Useful verification commands:

```bash
npm run spike:markets
npm run typecheck
npm test
npm run build
```

To inspect existing data, select ETH-PERP or BTC-PERP and enter a public Hideki testnet wallet. The position receipt is based only on records loaded so far; use “Load older records” if available. The JSON export includes the public account, selected observations, source status and completeness notes. No private key is required for lookup.

## What the MVP must prove

1. A real ETH-PERP or BTC-PERP order is placed on the Somnia Tokyo/Hideki testnet.
2. Downrail records the order and position lifecycle from dreamDEX data.
3. Downrail produces an explainable receipt backed by transaction hashes and reproducible evidence.

## Product surfaces

- `/` — product explanation, live market workspace, optional testnet order review, and read-only account evidence lookup.
- `/api/markets` — current supported market snapshot.
- `/api/accounts/[address]` — paged indexed account sources; pass the returned `nextCursor` as the `cursor` query parameter for older rows.
- `/api/accounts/[address]/analytics?market=ETH-PERP` — block-pinned current position analytics when the mark is available.
- `/api/transactions/[hash]` — read-only Somnia RPC transaction receipt check, distinct from indexer data.

The next milestone is to reconcile the position's attributable records and make the evidence reproducible from a clean checkout.

## X posts

Two or three posts tagging @DreamDEXSomnia are required by the bounty. [Drafts](docs/submission/X-POSTS-DRAFT.md) are prepared locally; published links are pending.

## Scope boundary

The optional order is a normal limit order, not reduce-only. A position may change before it fills, and the client-side margin preview is not an on-chain spending cap. This is a testnet MVP, not a production trading system.

Downrail does not predict prices, promise profit, custody funds, sell insurance, or create a new perp protocol. It explains real activity on dreamDEX Perps.

## Documentation

- [Project brief](PROJECT.md)
- [Product requirements](docs/PRD.md)
- [Technical specification](docs/TECHNICAL-SPEC.md)
- [Build plan](docs/BUILD-PLAN.md)
- [Event dossier](docs/EVENT-DOSSIER.md)
- [Win memo](docs/WIN-MEMO.md)
- [Submission checklist](docs/SUBMISSION-CHECKLIST.md)
- [Claims ledger](CLAIMS.md)
- [Testing status](docs/submission/TESTING-STATUS.md)

