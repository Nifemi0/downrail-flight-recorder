# Claims Ledger

Claims remain `Planned` until direct evidence exists. Verified claims link to reproducible local evidence.

| ID | Claim | Status | Required evidence |
|---|---|---|---|
| C-001 | Downrail reads live dreamDEX perp market metadata. | Verified | `evidence/first-market-read.json`; `npm run spike:markets` |
| C-002 | Downrail places a real perp order on Somnia Tokyo/Hideki testnet. | Planned | Transaction hash and explorer/indexer proof |
| C-003 | Downrail reconstructs the order and position lifecycle. | Planned | Redacted lifecycle JSON and integration test |
| C-004 | Downrail explains price PnL from verified fills. | Planned | Calculation fixture and unit tests |
| C-005 | Downrail attributes funding where protocol data permits. | Planned | Source record, calculation, and explicit unavailable fallback |
| C-006 | The receipt can be reproduced from repository instructions. | Planned | Fresh-clone transcript |
| C-007 | No user private key is sent to or stored by the application server. | Planned | Architecture review and secret scan |
| C-008 | The local interface refreshes live dreamDEX market metadata without preparing or signing a transaction. | Verified | Manual browser check on October 23, 2026; `/api/markets`; `app/market-console.tsx` |
| C-009 | Downrail can query indexed perp positions, fills, lifecycle changes, and funding for a valid EVM address. | Verified | `evidence/account-read-empty.json`; `/api/accounts/[address]`; all four sources responded successfully |

## Claim policy

- Change `Planned` to `Verified` only after linking evidence.
- Mark superseded or incorrect claims `Withdrawn`; do not delete history.
- Never use aggregate test counts until the final command has been run.

