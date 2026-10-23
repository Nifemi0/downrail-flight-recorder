# Testing Status

Last updated: October 23, 2026

| Capability | Status | Evidence |
|---|---|---|
| Project scaffold | Yes | Next.js App Router application builds successfully |
| Live market read | Yes | `evidence/first-market-read.json`; 21 markets returned on chain 50383 |
| Real testnet order | No | Not started |
| Position lifecycle capture | No | Not started |
| Explainable receipt | Partial | Read-only account event timeline and source status implemented; no complete position PnL reconstruction or live populated receipt verified |
| Read-only recorder workspace | Yes | Local browser verified market selection and live refresh |
| Account evidence lookup | Yes | Four successful indexer reads captured in `evidence/account-read-empty.json`; zero activity returned for the checked wallet |
| Unit tests | Yes | 5 tests passed with Vitest on October 23, 2026 |
| Integration tests | No | 0 tests |
| Browser tests | Partial | Manual desktop and 390 × 844 mobile review passed; live refresh passed |
| Typecheck | Yes | `npm run typecheck` passed on October 23, 2026 |
| Production build | Yes | `npm run build` passed on October 23, 2026 |
| Fresh-clone verification | No | Not run |
| Public repository | No | Local planning files only |
| Production deployment | No | Not deployed |
| External playtesters | No | None |
| Submission accepted | No | Not submitted |

## Current truth

The read-only foundation is implemented and verified against the live dreamDEX testnet indexer. A wallet lookup now renders indexed fills, position changes, and funding in time order with source availability. This timeline has a unit test but has not been verified against a populated live wallet. The product does not yet connect a wallet, sign an order, correlate a complete position lifecycle, or calculate a completed per-position PnL receipt.

