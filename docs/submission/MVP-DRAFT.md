# Flight Recorder — MVP submission draft

## Product

Downrail Flight Recorder helps a dreamDEX Perps trader inspect the records behind a testnet position. A public wallet lookup brings together supported positions, orders, fills, position changes, margin, funding, and liquidation data returned by the official indexer. A position receipt groups observed changes and transaction-matched fills; a chain check can decode a supported fill's quantity and price.

## Current evidence

- Network: Somnia Hideki/Tokyo testnet, chain 50383.
- Public example: a BTC fill in transaction `0x6b8539a59230019437dc6d81df7a7c35ec4102ae681a29a962b9546c57c37689`, block `33960632`, log `15`; the indexer and RPC log agreed on `0.01234 BTC` at `79928.2 USDso`.
- This public example is not proof an order was placed by this MVP.
- Owner-confirmed opening order: account `0x249e79De269e54a901A3d2Ce660496563103b470`, ETH-PERP, transaction `0x15766748dfd03bd61d5e786f9d4ec9177f2c82763b401ad78ac5a2762453fe95`, block 34005026, 2026-10-26 22:11:14 UTC. Indexed status: filled 0.004 ETH at 2308.49 paper USDso; RPC OrderFilled log 27 agrees. Evidence: `evidence/owner-testnet-open.json`.
- Owner-confirmed close: transaction `0xa17812dca463b120ceb1c1b51acbd2115a4892cd5eb91d9f46bb2cef24532721`, block 34007780, 2026-10-26 22:15:49 UTC. The indexer and RPC OrderFilled log 5 agree on a 0.004 ETH sell at 2306.86 paper USDso. Indexed position: flat; observed realized price PnL: -0.00652 USDso. Evidence: `evidence/owner-testnet-close.json`.
- Exported position receipt: `evidence/owner-position-receipt.json`, generated from the local product after the close.
- The product consumes the official indexer; it is not an independent chain indexer. Receipts represent loaded observations, can be incomplete, and do not calculate complete net PnL.

## Required before submission

- Verify whitelist access in the intended DoraHacks account.
- Reconcile the observable funding and fees or leave them explicitly unavailable; do not imply complete net PnL.
- Capture position change and close evidence where available, and compare the exported receipt with source records.
- Prepare a public repository with the current local files and reproducible instructions; verify from a clean checkout.
- Record a demo of the real order and receipt.
- Publish two or three accurate posts tagging @DreamDEXSomnia and link them from the README.
- Review the final submission against the official requirements before submitting.

Deadline: November 1, 2026, 23:59 UTC (November 2, 00:59 in Lagos). Submission and publication remain pending.
