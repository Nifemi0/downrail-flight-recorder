# Win Memo

## Product

**Downrail Flight Recorder** — a verifiable black box for dreamDEX perp positions.

> Every leveraged trade should explain itself.

## Why it can win

- **Potential:** creates a consumer and developer trust layer that remains useful beyond the bounty.
- **Building evidence:** the primary artifact is a real testnet position receipt with hashes, events, calculations, and a reproducible transcript.
- **Communication:** turns protocol-level mechanics into a plain-English story a judge can understand quickly.
- **Sponsor fit:** operates directly on dreamDEX Perps and uses the required testnet rails.
- **Distinctiveness:** visible public competition is currently concentrated in the feedback lane; this is a product in the MVP lane.

## Edge

Most trading tools focus on what to trade or when to trade. Downrail focuses on explaining what actually happened. The receipt makes dreamDEX's onchain transparency useful to people who do not read contract events.

## Risks

- Complete historical reconstruction may not be available through the indexer.
- Funding attribution may be incomplete.
- Testnet liquidity may make a clean demo fill unreliable.
- Browser-wallet signing may require a different path from the SDK examples.

Mitigation: validate execution first, record live lifecycle events, show unavailable data honestly, use small supported markets, and maintain a redacted evidence fixture from a real run.

## Scope

### Build

1. Live flight recorder.
2. Explainable position receipt.

### Do not build

- Signals or predictions.
- Automated strategies.
- Insurance or guaranteed protection.
- Multi-venue portfolio tooling.
- A new smart-contract protocol.

## Proof judges will see

- Real order transaction hash.
- Real order/fill/position lifecycle.
- Receipt with source-linked calculations.
- Automated test count.
- Fresh-clone run instructions.
- Honest testing-status table.

## Decision

Direction locked on October 23, 2026. Reconsider only if the execution spike proves that real order lifecycle data cannot be obtained within the deadline.

