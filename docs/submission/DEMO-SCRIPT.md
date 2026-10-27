# Downrail Flight Recorder — demo narration draft

All figures below are from the owner-authorized Hideki testnet lifecycle saved under `evidence/`. Paper USDso is testnet collateral. The recording must show the actual app and evidence, not a staged transaction.

**Opening**

Every leveraged trade leaves a trail. But understanding what happened means piecing together orders, fills, position changes and funding. Downrail Flight Recorder brings those records into a readable position view.

**Opening the position**

On Somnia Hideki testnet, we placed a real ETH perpetual order through the app. The wallet confirmed it. The buy filled for zero point zero zero four ETH at two thousand three hundred eight point four nine paper USDso.

**Closing the position**

We then placed a separate sell. It filled at two thousand three hundred six point eight six, and the indexed position returned to flat. The observed price result was a loss of zero point zero zero six five two paper USDso.

**Evidence**

The receipt groups the observed opening and close. We can inspect the orders and fills, check a transaction against the chain, and export the evidence as JSON.

**Limits**

This is testnet data from the official dreamDEX indexer. Funding and fees are not attributed to this position, and the observed price result is not a complete net PnL. Missing or ambiguous history remains visible.
