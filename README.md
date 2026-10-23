# Downrail Flight Recorder

> Every leveraged trade should explain itself.

Downrail Flight Recorder is an explainability layer for dreamDEX Perps. It follows a real testnet position from order submission through fills, funding, margin changes, reductions, and closure, then produces a verifiable receipt explaining the result in plain English.

## Current status

**Read-only foundation implemented locally.** The app reads the live dreamDEX testnet market index and can inspect indexed positions, fills, position changes, and funding for an EVM address. Wallet connection, order signing, completed lifecycle reconstruction, and final receipts remain to be built.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Useful verification commands:

```bash
npm run spike:markets
npm run typecheck
npm test
npm run build
```

## What the MVP must prove

1. A real ETH-PERP or BTC-PERP order is placed on the Somnia Tokyo/Hideki testnet.
2. Downrail records the order and position lifecycle from dreamDEX data.
3. Downrail produces an explainable receipt backed by transaction hashes and reproducible evidence.

## Product surfaces

- `/` — product explanation, live market workspace, and read-only account evidence lookup.
- `/api/markets` — current supported market snapshot.
- `/api/accounts/[address]` — indexed perp positions, fills, lifecycle changes, and funding for one address.

Planned next surfaces are client-side wallet connection, order review/signing, and a shareable receipt route.

## Scope boundary

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

