# Testing Status

Last updated: October 27, 2026

| Capability | Status | Evidence |
|---|---|---|
| Project scaffold | Yes | Next.js App Router application builds successfully |
| Live market read | Yes | `evidence/first-market-read.json`; 21 markets returned on chain 50383 |
| Real testnet order | Yes | Owner-confirmed ETH-PERP order, `0x15766748dfd03bd61d5e786f9d4ec9177f2c82763b401ad78ac5a2762453fe95`, block 34005026; indexer and on-chain log agree it filled 0.004 ETH at 2308.49 paper USDso. `evidence/owner-testnet-open.json` |
| Position lifecycle capture | Partial | One owner-controlled ETH-PERP open and close were captured, including matching indexed fills and chain logs. Missing history and ambiguous shared transactions remain explicit; general lifecycle completeness is not proven |
| Explainable receipt | Partial | Position view and evidence JSON export work locally; indexed price PnL is summed over loaded changes, but funding, fees and complete net PnL are not attributed |
| Read-only recorder workspace | Yes | Local browser verified market selection and live refresh |
| Account evidence lookup | Yes | Eight official SDK sources responded for a populated public testnet account on October 26; liquidation returned zero rows, and a second page returned distinct fill IDs |
| Current on-chain position analytics | Yes | October 27 local browser and RPC returned a block-pinned ETH-PERP mark, unrealized price PnL and accrued funding for the owner testnet wallet; stale marks remain unavailable |
| Chain transaction check | Yes | On October 26, the RPC returned transaction `0x6b8539a59230019437dc6d81df7a7c35ec4102ae681a29a962b9546c57c37689`; block 33960632, log 15 decoded to 0.01234 BTC at 79928.2 USDso, matching the indexed fill. Wallet involvement and other indexed fields were not independently verified |
| Automated tests | Yes | 24 tests across 7 files passed with Vitest on October 27, 2026; includes partial-fill receipt matching, analytics stale-mark handling and mocked account-source pagination |
| Live order integration | Partial | Owner-signed approval, opening order, and closing order were confirmed; both fills and position changes were indexed. Full net PnL reconciliation remains pending. |
| Browser tests | Partial | October 26 local browser checks covered invalid and populated wallet lookup, older records, an inline chain check and a simulated RPC error; 390 × 844 mobile layout had no horizontal overflow. Owner-signed funded-wallet open and close were tested; additional order scenarios remain untested |
| Typecheck | Yes | `npm run typecheck` passed on October 27, 2026 |
| Production build | Yes | `npm run build` passed in the working directory on October 27, 2026; a separate local copy passed `npm ci` and build on October 26 |
| Fresh-clone verification | No | Not run |
| Public repository | No | Local planning files only |
| Production deployment | No | Not deployed |
| External playtesters | No | None |
| Submission accepted | No | Not submitted |

## Current truth

The local app is backed by dreamDEX's official indexer. It is not a self-hosted chain indexer. The owner confirmed a bounded paper USDso allowance and separate real testnet ETH-PERP opening and closing orders. The indexed opening and close, together with RPC-decoded fills, are recorded in `evidence/owner-testnet-open.json` and `evidence/owner-testnet-close.json`. The recorded October 26 position closed with an observed realized price PnL of -0.00652 paper USDso; a later separate 0.004 ETH-PERP long was observed open on October 27. Grouping is based on observed boundaries and transaction matches; it is not proof of complete history. Funding and fees are not attributed to a position, and the sum of observed price PnL is not complete net PnL. Pagination stops if a source fails; the SDK open-order response is capped at 1,000 and offset pages can shift. The app's pre-sign funding checks do not impose on-chain maximums.

