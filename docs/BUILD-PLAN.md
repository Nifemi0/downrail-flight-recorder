# Build Plan

## Internal target

Submission-ready by **October 31, 2026**, leaving a buffer before the earliest reported deadline of November 1 at 23:59 UTC.

## Build order

### Execution spike

- Initialize the repository and pin the current dreamDEX SDK.
- Read live perp markets and system configuration.
- Confirm browser-wallet signing or document the local operator fallback.
- Place and close the smallest practical supported testnet position.
- Save the first redacted transaction evidence.

**Gate:** do not build the polished interface until a real order path works.

### Lifecycle model

- Inspect indexer and WebSocket schemas.
- Define normalized lifecycle events.
- Correlate transaction, order, fill, position, and close data.
- Build fixtures from the first real run.

**Gate:** reconstruct the first lifecycle as JSON with source references.

### Explanation engine

- Implement deterministic price PnL.
- Add verifiable funding, fee, and slippage components where available.
- Surface unattributed differences.
- Generate plain-English timeline statements.

**Gate:** every statement maps to evidence or is marked unavailable.

### Product interface

- Build landing, app, receipt, and methodology surfaces.
- Keep the receipt as the visual center.
- Add network, provenance, pending, error, and empty states.
- Verify desktop and mobile layouts.

### Evidence and submission

- Run unit, integration, browser, and live smoke checks.
- Record exact test count.
- Capture explorer links, screenshots, and transcript.
- Complete README, claims ledger, testing status, and submission checklist.
- Record a short real-product demo.
- Prepare X post and DoraHacks copy without publishing until approved.

## Priority ladder

| Priority | Deliverable | Cut rule |
|---|---|---|
| P0 | Real testnet order and evidence | Never cut |
| P0 | Lifecycle reconstruction | Never cut |
| P0 | Explainable receipt | Never cut |
| P1 | Polished responsive UI | Reduce animation before reducing clarity |
| P1 | Shareable receipt URL | Fall back to deterministic local route/export |
| P2 | Planned-versus-actual comparison | Cut if core evidence is incomplete |
| P2 | Existing-wallet historical import | Cut if indexer history is unreliable |

## Definition of done

- Core journey works from a fresh clone.
- A real order hash and lifecycle artifact are committed.
- Receipt numbers are reproducible.
- Test counts and limitations are current.
- Submission materials contain no unsupported claims.

