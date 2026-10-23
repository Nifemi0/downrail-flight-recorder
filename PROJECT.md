# Project Brief

## Working name

**Downrail Flight Recorder**

The name is provisional until the first working testnet receipt exists. Product mechanics are locked before visual naming work.

## Thesis

> Every leveraged trade should explain itself.

## Problem

Perp interfaces usually reduce a position to entry, leverage, liquidation price, and PnL. A trader can see that money changed but may not understand how price movement, fills, funding, margin, reductions, and liquidation risk combined to create the result. This is especially painful for new users and for developers debugging automated strategies.

## Product

Downrail turns a real dreamDEX perp position into a chronological, verifiable explanation. It records the position lifecycle and produces a receipt whose statements link back to dreamDEX testnet data and transaction hashes.

## Primary user

A dreamDEX testnet trader who wants to understand what happened to a leveraged position without reading raw contract events.

## Secondary user

A bot builder who needs a human-readable audit trail for orders and position changes.

## Co-primary features

### Live flight recorder

Capture a real ETH-PERP or BTC-PERP order, fills, current position state, funding-related changes when observable, margin state, reductions, and closure.

### Explainable position receipt

Turn the captured lifecycle into a plain-English timeline and PnL explanation, with direct evidence links and explicit labels for any estimate or unavailable datum.

## Mandatory plumbing

- Connect to the required dreamDEX testnet.
- Place at least one real perp order.
- Read live market metadata rather than hardcoding decimals or limits.
- Preserve transaction hashes and a reproducible run transcript.

## Explicitly out of scope

- Trading signals, price predictions, or guaranteed-return language.
- Automated strategy execution or a bot marketplace.
- A new perp protocol, insurance pool, or custom derivative.
- Event-contract hedging.
- Multi-chain or multi-venue support.
- Full portfolio accounting or tax reporting.
- Social feeds, copy trading, leaderboards, or notifications.
- Custody of user funds or collection of private keys.

## Success definition

A judge can open the product, observe or create a small real dreamDEX testnet position, inspect its lifecycle, and independently verify the receipt from linked transaction evidence.

## Failure conditions

The MVP is not submission-ready if any of the following is true:

- The order is simulated rather than placed on the required testnet.
- The receipt contains invented or untraceable numbers.
- The app requires a user to send us a private key.
- The demo cannot be reproduced from a fresh clone.
- The product is only a dashboard with no position lifecycle or evidence.

