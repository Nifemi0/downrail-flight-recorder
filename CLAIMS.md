# Claims Ledger

Claims remain `Planned` until direct evidence exists. Verified claims link to reproducible local evidence.

| ID | Claim | Status | Required evidence |
|---|---|---|---|
| C-001 | Downrail reads live dreamDEX perp market metadata. | Verified | `evidence/first-market-read.json`; `npm run spike:markets` |
| C-002 | Downrail places a real perp order on Somnia Tokyo/Hideki testnet. | Verified locally | `evidence/owner-testnet-open.json`: owner-confirmed ETH-PERP buy, transaction `0x15766748dfd03bd61d5e786f9d4ec9177f2c82763b401ad78ac5a2762453fe95`, block 34005026, 2026-10-26 22:11:14 UTC; indexer and decoded fill log show 0.004 ETH at 2308.49 paper USDso |
| C-003 | Downrail groups observed order, fill and position changes for the demonstrated open-and-close ETH-PERP testnet lifecycle. | Verified for one local example; general completeness not proven | `evidence/owner-testnet-open.json` and `evidence/owner-testnet-close.json`; open `0x15766748dfd03bd61d5e786f9d4ec9177f2c82763b401ad78ac5a2762453fe95`, close `0xa17812dca463b120ceb1c1b51acbd2115a4892cd5eb91d9f46bb2cef24532721`; matched fills and position changes, without full fee or funding attribution |
| C-004 | Downrail explains price PnL from verified fills. | Planned | Calculation fixture and unit tests |
| C-005 | Downrail attributes funding where protocol data permits. | Planned | Source record, calculation, and explicit unavailable fallback |
| C-006 | The receipt can be reproduced from repository instructions. | Planned | Fresh-clone transcript |
| C-007 | No user private key is sent to or stored by the application server. | Planned | Architecture review and secret scan |
| C-008 | The local interface refreshes live dreamDEX market metadata without preparing or signing a transaction. | Verified | Manual browser check on October 23, 2026; `/api/markets`; `app/market-console.tsx` |
| C-009 | Downrail can query the official indexer's supported positions, open orders, order history, fills, position changes, funding, margin, and liquidation stages for a valid EVM address. | Verified locally | `/api/accounts/[address]`; eight sources responded for a public testnet account on October 26, 2026; liquidation source returned zero rows |
| C-010 | The local interface orders loaded indexed events into a read-only timeline, deduplicates an order shared by open orders and history, and shows per-source availability. | Verified locally | `lib/dreamdex/receipt.test.ts`; `app/market-console.tsx`; local populated account API check October 26, 2026 |
| C-011 | The local interface can prepare a bounded testnet perp limit order, preview protocol margin, and request browser-wallet submission. | Verified locally with one owner-confirmed order | `app/trade-review.tsx`; `evidence/owner-testnet-open.json`. The pre-sign margin buffer is a client-side check, not an on-chain cap. |
| C-012 | Older indexed account rows can be requested with an opaque cursor. | Verified locally | Consecutive `/api/accounts/[address]` pages returned distinct fill IDs on October 26, 2026; official SDK open-order cap and shifting offset pages remain limitations |
| C-013 | A transaction hash can be checked against the Somnia Hideki chain RPC; a supported OrderFilled log can be decoded and its quantity and price compared with the indexed fill. | Verified locally | `/api/transactions/[hash]`; public BTC fill `0x6b8539a59230019437dc6d81df7a7c35ec4102ae681a29a962b9546c57c37689`, block 33960632, log 15, matched 0.01234 BTC at 79928.2 USDso on October 26, 2026. This does not prove wallet participation or every indexed field. |
| C-014 | Loaded position changes can be grouped into observed position episodes, with fills matched by market and transaction and orders matched by order ID, and exported as JSON. | Verified locally with fixtures and owner-controlled open/close; incomplete history remains possible | `lib/dreamdex/position-receipt.test.ts`; `evidence/owner-position-receipt.json`; local browser export and evidence-link check; funding and complete net PnL are not attributed |
| C-015 | The owner wallet can confirm a bounded paper USDso allowance for the Hideki MarginBank. | Verified on testnet | Wallet `0x249e79De269e54a901A3d2Ce660496563103b470`, ETH-PERP collateral approval `0x7ffccf44e6362ce5f883b5342d482007e96a56e9cc18cbd952aca0fc649606c4`, block 34003711 at 2026-10-26 22:09:02 UTC. This is token approval, not an order. |

| C-016 | The local app can read block-pinned current position analytics, including mark-to-market price PnL and accrued funding, when the protocol mark is priceable. | Verified locally | Owner wallet ETH-PERP, chain 50383, block 34503272 on October 27, 2026; `/api/accounts/[address]/analytics`; stale-mark fixture. This is not complete historical net PnL. |

## Claim policy

- Change `Planned` to `Verified` only after linking evidence.
- Mark superseded or incorrect claims `Withdrawn`; do not delete history.
- Never use aggregate test counts until the final command has been run.

