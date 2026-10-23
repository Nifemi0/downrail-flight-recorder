# Technical Specification

## Status

Proposed architecture. The execution spike must confirm SDK and signing behavior before the application scaffold is considered final.

## Network

- Network: Somnia Hideki/Tokyo testnet
- Chain ID: `50383`
- RPC: `https://api.hideki2.infra.testnet.somnia.network`
- WebSocket: `wss://api.hideki2.infra.testnet.somnia.network/ws`
- GraphQL indexer: `https://hideki-dev.smk.somnia.host/v1/graphql`
- Gas token: STT
- Collateral: paper USDso through the official testnet flow

Addresses must be read through the official SDK/system configuration rather than duplicated in application code.

## Proposed stack

- TypeScript
- React with Next.js App Router, subject to SDK compatibility spike
- `@somnia-chain/markets-sdk` pinned to the version used by the current dreamDEX application at implementation time
- viem-compatible wallet and transaction utilities
- GraphQL client for indexed lifecycle data
- WebSocket client for live market/order events
- Vitest for unit and integration tests
- Playwright for the critical browser flow

## Architecture

```text
Wallet / local test operator
          |
          v
Order composer -> validation -> dreamDEX PerpPool transaction
          |                         |
          |                         v
          |                 transaction receipt
          v                         |
Live recorder <--- WebSocket / GraphQL indexer / RPC
          |
          v
Normalized lifecycle model
          |
          v
Explanation engine -> position receipt -> evidence export
```

## Core modules

### Market adapter

Responsibilities:

- List supported perp markets.
- Resolve pool, margin bank, stop registry, quote token, decimals, tick size, lot size, and minimum size.
- Reject stale or incomplete market data.
- Never assume 18 base decimals.

### Order executor

Responsibilities:

- Verify chain and account.
- Construct a small supported order.
- Check maximum placeable size before submission.
- Sign client-side or through an owner-controlled local operator.
- Return transaction hash and raw receipt.

### Lifecycle recorder

Responsibilities:

- Correlate transaction, order ID, fills, and position updates.
- Preserve source timestamps, blocks, hashes, and event identifiers.
- Handle pending, partial, rejected, cancelled, filled, reduced, closed, and liquidated states.
- Store only redacted evidence artifacts.

### Explanation engine

Responsibilities:

- Convert normalized events into plain-English statements.
- Calculate only deterministic components supported by source data.
- Attach provenance and confidence state to each statement.
- Never force components to sum when protocol data is incomplete.

### Receipt renderer

Responsibilities:

- Present summary, lifecycle, PnL explanation, and proof.
- Link transactions to the correct explorer where available.
- Export a redacted JSON evidence package.

## Normalized data model

```ts
type Provenance = "verified" | "calculated" | "estimated" | "pending" | "unavailable";

type LifecycleEvent = {
  id: string;
  kind: "submitted" | "accepted" | "rejected" | "filled" | "cancelled" | "position" | "funding" | "reduced" | "closed" | "liquidated";
  timestamp: string;
  blockNumber?: string;
  transactionHash?: `0x${string}`;
  orderId?: string;
  market: string;
  payload: Record<string, string>;
  provenance: Provenance;
  source: string;
};

type ReceiptLine = {
  label: string;
  value?: string;
  explanation: string;
  provenance: Provenance;
  evidenceEventIds: string[];
};
```

## PnL explanation policy

- Price PnL may be calculated from verified fills and current/exit position data.
- Funding is shown only when a protocol/indexer source supports attribution.
- Fees are shown only when present; zero-fee claims must still cite protocol data.
- Slippage is calculated only against a captured reference quote with timestamp.
- Any unexplained difference is shown as `Unattributed`, not silently distributed.

## Security requirements

- Never send user private keys to a server.
- Never write private keys, mnemonics, auth tokens, or full environment dumps to logs.
- Restrict the MVP to testnet and display that status persistently.
- Validate chain ID before signing.
- Read token and market decimals dynamically.
- Sanitize exported evidence and UI error messages.
- Use a dedicated low-value testnet account for recorded evidence.

## Test strategy

### Unit

- Decimal and unit conversion for varied market decimals.
- Lifecycle state transitions.
- PnL decomposition and unattributed remainder.
- Provenance propagation.
- Error translation.

### Integration

- Market discovery through a controlled SDK/indexer fixture.
- Order-to-fill correlation.
- Partial fill, cancellation, rejection, and closure fixtures.
- Receipt reconstruction from saved evidence.

### Live smoke

- Read live supported markets.
- Verify chain and system configuration.
- Place one small testnet order with explicit owner approval.
- Capture transaction and lifecycle evidence.

### Browser

- Connect or demo-account path.
- Place/review order flow.
- Receipt rendering on desktop and mobile.
- Keyboard navigation and error states.

## Technical unknowns to resolve first

- Browser-wallet signing compatibility with the current SDK.
- Exact indexer schema for orders, fills, positions, and funding attribution.
- Explorer URL format for Hideki/Tokyo transactions.
- Reliable position lifecycle identifier across partial closes and flips.
- Whether the official MVP rules require a public deployment or only repository and evidence.

