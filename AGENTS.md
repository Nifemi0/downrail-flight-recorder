# Agent Instructions

## Source of truth

Read `PROJECT.md`, `docs/PRD.md`, `docs/TECHNICAL-SPEC.md`, and `downrail-flight-recorder_master_prompt.md` before implementing product work.

## Scope discipline

- Build only the live flight recorder and explainable receipt.
- Treat real testnet order placement as mandatory plumbing, not a third product feature.
- Do not add AI signals, strategy generation, copy trading, portfolio management, notifications, or unrelated dashboards.
- Do not change the product thesis without updating `DECISIONS.md` and receiving owner approval.

## Safety and honesty

- Never request, log, transmit, or commit a private key or seed phrase.
- Wallet signing must remain client-side or in a local, owner-controlled test operator.
- Never fabricate transaction hashes, fills, funding, PnL components, screenshots, or test results.
- Label estimates as estimates. If a component cannot be verified, show it as unavailable.
- Use testnet-only language until mainnet support is independently verified.

## Evidence

- Every externally visible claim must have a row in `CLAIMS.md`.
- Save reproducible testnet artifacts under `evidence/` with secrets removed.
- Record exact test counts in `docs/submission/TESTING-STATUS.md` only after running them.
- A successful transaction must include network, account, market, transaction hash, block, and timestamp.

## Interface rules

- No decorative slash-number labels such as `Overview / 01`.
- Use numbering only for real sequences, timelines, or data.
- No decorative emoji in product UI.
- Prioritize plain-English mechanics over marketing copy.
- Always show network, testnet status, and evidence provenance near financial numbers.

## Repository boundaries

- Work locally by default.
- Do not publish, deploy, submit, post, or message third parties without explicit owner approval for that action.
- Preserve unrelated user changes and never rewrite history destructively.

