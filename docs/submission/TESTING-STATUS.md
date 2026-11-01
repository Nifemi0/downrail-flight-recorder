# Testing Status

Last updated: November 1, 2026

| Capability | Status | Evidence |
|---|---|---|
| Project scaffold | Yes | Next.js App Router application builds successfully |
| Live market read | Yes | `evidence/first-market-read.json`; 21 markets returned on chain 50383 |
| Real testnet order | Yes | Owner-confirmed ETH-PERP order, `0x15766748dfd03bd61d5e786f9d4ec9177f2c82763b401ad78ac5a2762453fe95`, block 34005026; indexer and on-chain log agree it filled 0.004 ETH at 2308.49 paper USDso. `evidence/owner-testnet-open.json` |
| Position lifecycle capture | Partial | One owner-controlled ETH-PERP open and close were captured, including matching indexed fills and chain logs. Missing history and ambiguous shared transactions remain explicit; general lifecycle completeness is not proven |
| Explainable receipt | Partial | Position view and evidence JSON export work locally; loaded fees and funding can be associated by unique market and transaction; unmatched records and complete net PnL remain unavailable |
| Read-only recorder workspace | Yes | Local browser verified market selection and live refresh |
| Account evidence lookup | Yes | On October 31, the local endpoint returned four loaded position changes and four fills for the owner testnet account with no sources marked unavailable. This is not proof of complete history. Earlier pagination evidence dates from October 26. |
| Current on-chain position analytics | Yes | October 27 local browser and RPC returned a block-pinned ETH-PERP mark, unrealized price PnL and accrued funding for the owner testnet wallet; stale marks remain unavailable |
| Local direct-event archive | Partial | `evidence/owner-direct-chain-archive.json`: direct RPC backfill of owner opening and closing events over blocks 34005026–34007780. On October 28, version 4 re-scanned the same six events, matched both position changes in the local browser, and followed one further 1,000-block cycle; bounded coverage only, not a hosted service |
| Chain transaction check | Yes | On October 26, the RPC returned transaction `0x6b8539a59230019437dc6d81df7a7c35ec4102ae681a29a962b9546c57c37689`; block 33960632, log 15 decoded to 0.01234 BTC at 79928.2 USDso, matching the indexed fill. Wallet involvement and other indexed fields were not independently verified |
| Automated tests | Yes | 57 tests across 16 files passed with Vitest on October 31, 2026; includes decimal rounding, liquidation warnings, gas receipts, fee/funding reconciliation, order calldata, archive import, bounded chain scan, retries and pagination |
| Transaction gas | Partial | Two observed owner transactions returned 0.030702618 STT in total on October 28; these are whole-transaction costs, not necessarily position-specific, and are not converted to USDso |
| Experimental on-chain guard | Not verified | Mock EVM tests pass with the default and corrected RPC-backed state managers. Two runs of one historical-state scenario reverted a tight size limit and allowed a wider one; the second checked the revert reason and selected rollback balances. The guard is not integrated, deployed, audited, or approved |
| Local archive viewer | Partial | Owner version 4 archive loaded in browser without account lookup. A bounded RPC scan using its supplied pool returned the owner opening event without market discovery. Automated source-failure test confirms the archive control is rendered when market discovery fails. The file and supplied pool are not authenticated. |
| Live order integration | Partial | Owner-signed approval, opening order, and closing order were confirmed; both fills and position changes were indexed. Full net PnL reconciliation remains pending. |
| Browser tests | Partial | October 26 local browser checks covered invalid and populated wallet lookup, older records, an inline chain check and a simulated RPC error; 390 × 844 mobile layout had no horizontal overflow. Owner-signed funded-wallet open and close were tested; additional order scenarios remain untested |
| Typecheck | Yes | `npm run typecheck` passed on October 31, 2026 |
| Production build | Yes | `npm run build` passed in the working directory on October 31, 2026; a separate local copy passed `npm ci` and build on October 26 |
| Production dependency audit | Yes | `npm audit --omit=dev` reported zero known vulnerabilities on October 31; this is not a security audit and excludes development and separate demo dependencies |
| Limited secret-pattern scan | Partial | On October 31, a local scan of 90 non-ignored tracked and untracked paths found no private-key blocks, common GitHub tokens, AWS access keys or quoted mnemonic/private-key assignments. This is not a comprehensive secret scan; ignored files and other secret formats were excluded. |
| Fresh-clone verification | Yes | Clean checkout of the source subsequently published as commit 2c6b0c0: npm ci, 57 tests, typecheck, and production build passed on November 1, 2026. |
| Public repository | Yes | https://github.com/Nifemi0/downrail-flight-recorder; clean-clone verification passed for app commit 47de832 |
| Production deployment | Yes | https://filltrail-dreamdex.vercel.app/; deployed November 1, 2026. Market API, existing-wallet lookup and one transaction receipt check verified on the deployed app. |
| External playtesters | No | None |
| Submission accepted | No | Not submitted |

## Current truth

The local app is backed by dreamDEX's official indexer. It is not a self-hosted chain indexer. The owner confirmed a bounded paper USDso allowance and separate real testnet ETH-PERP opening and closing orders. The indexed October 26 opening and close, together with RPC-decoded fills, are recorded in `evidence/owner-testnet-open.json` and `evidence/owner-testnet-close.json`; that position had observed realized price PnL of -0.00652 paper USDso. A separate position opened October 27 and was liquidated in an October 29 transaction. RPC logs confirmed its zero position, -0.23756 price PnL, 0.006666652116834025 funding payment and a 0.0901368 liquidation-fee event. The fee and keeper reward must not be summed without verifying their relationship. See `evidence/owner-later-position-close-2026-10-29.json`. Grouping is based on observed boundaries and transaction matches; it is not proof of complete history. Fee and funding records are associated only by uniquely matched transaction and market; unmatched records, liquidation-specific costs and gas remain excluded, so the observed subtotal is not complete net PnL. Pagination stops if a source fails; the SDK open-order response is capped at 1,000 and offset pages can shift. The app's pre-sign funding checks do not impose on-chain maximums.

