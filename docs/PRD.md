# Product Requirements Document

## Product

Downrail Flight Recorder

## Product statement

Downrail explains what happened to a real dreamDEX perp position and proves each part of the explanation with testnet evidence.

## Goals

- Make a leveraged position understandable to a non-expert.
- Give bot builders a readable audit trail for order and position changes.
- Demonstrate meaningful, real dreamDEX Perps integration.
- Produce evidence strong enough for a judge to verify independently.

## Non-goals

- Recommend trades or forecast prices.
- Optimize returns.
- Automatically manage a portfolio.
- Replace dreamDEX's trading interface.
- Support real-money mainnet trading.
- Provide accounting, tax, or legal advice.

## User stories

### Trader

- As a trader, I can connect to the required testnet and see that I am on the correct network.
- As a trader, I can place a small ETH-PERP or BTC-PERP order through the MVP flow.
- As a trader, I can see each meaningful lifecycle event in chronological order.
- As a trader, I can understand why my position value changed.
- As a trader, I can verify the underlying transaction evidence.

### Bot builder

- As a bot builder, I can inspect the order lifecycle without reading raw logs.
- As a bot builder, I can export a redacted receipt for debugging or review.

### Judge

- As a judge, I can reproduce the product's core claim from a fresh clone.
- As a judge, I can distinguish live data, calculated values, estimates, and unavailable values.

## Core journey

1. User opens Downrail and sees the testnet/network status.
2. User connects an eligible wallet or uses the documented owner-controlled demo flow.
3. User selects ETH-PERP or BTC-PERP and enters a deliberately small order.
4. Downrail validates market metadata and submits the signed testnet transaction.
5. The recorder follows order acceptance, fills, position state, and later reduction or closure.
6. The receipt explains the lifecycle and links to evidence.

## Functional requirements

### Required for submission

- **FR-01 Network verification:** detect and clearly display chain ID `50383` before any transaction.
- **FR-02 Live market metadata:** read market addresses, decimals, tick size, lot size, minimum quantity, and margin configuration from the live system.
- **FR-03 Real order:** place at least one signed ETH-PERP or BTC-PERP testnet order.
- **FR-04 Lifecycle ingestion:** capture order submission, order state, fills, position state, and reduction/closure.
- **FR-05 Timeline:** render lifecycle events in chronological order with timestamps and provenance.
- **FR-06 Explainable receipt:** show entry, side, size, leverage/margin context, fills, observable funding effects, and current/final PnL components.
- **FR-07 Evidence links:** attach a transaction hash, block, indexer record, or deterministic calculation to every factual claim.
- **FR-08 Truth states:** visibly distinguish verified, calculated, estimated, pending, and unavailable values.
- **FR-09 Export:** allow the receipt to be copied or exported without secrets.
- **FR-10 Error clarity:** translate common SDK and chain failures into plain English while preserving the raw error for debugging.

### Only after the core works

- Compare planned versus actual risk.
- Generate a compact shareable receipt URL.
- Add a read-only receipt for an existing wallet position.

## Receipt content

- Network and market.
- Account address, shortened by default with full copy action.
- Position direction and size.
- Entry order transaction and fill evidence.
- Entry and current/exit prices.
- Margin mode and relevant thresholds when verifiable.
- Funding paid or received when verifiable.
- Reductions, stop-loss, take-profit, or liquidation events when present.
- Final or current PnL decomposition.
- Confidence/provenance label for every row.
- Product limitations and testnet notice.

## UX requirements

- The first screen must answer: what happened, why, and where is the proof?
- Financial numbers must include units and testnet context.
- Do not hide uncertainty behind tooltips.
- Use a timeline only for actual ordered events.
- Do not use decorative slash-number labels or emoji.
- Mobile must preserve the explanation before secondary metadata.
- Keyboard navigation and visible focus states are required.

## Acceptance test

The MVP passes when a new reviewer can follow documented setup, place or inspect a real supported testnet position, produce a receipt, and verify its transaction evidence without developer intervention.

## Product risks

| Risk | Impact | Mitigation |
|---|---|---|
| SDK cannot sign through the chosen browser wallet | Blocks core flow | Complete signing spike first; use an owner-controlled local operator fallback for the recorded demo |
| Indexer does not expose complete historical state | Weakens reconstruction | Record live lifecycle events and preserve a redacted evidence artifact |
| Funding cannot be attributed precisely | Misleading receipt | Show funding only when source data is verifiable; otherwise mark unavailable |
| Testnet liquidity prevents fills | Demo failure | Use small IOC/marketable limit with documented slippage bounds and retain a resting-order lifecycle fallback |
| Deadline ambiguity | Submission risk | Treat Nov 1 23:59 UTC as hard deadline and target Oct 31 |

