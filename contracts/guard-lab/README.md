# Experimental guard lab

This is an **unreviewed local prototype**, not a deployable production contract and not connected to the application. Its automated regression tests use a protocol-shaped mock pool and bank. Do not approve or deploy it without protocol compatibility tests, a security review and an explicit deployment decision.

The prototype checks net changes in the owner and linked payer token balances and net reduction in free bank collateral and the resulting absolute position size during one IOC placement transaction. A failed check reverts that transaction atomically in the mock EVM. It does not measure gross transfers, does not cap later fills or trading losses, and does not cap gas. Existing cross-margin exposure and contract upgrades need separate assessment.

From the project root run `npm ci`, then:

```bash
cd contracts/guard-lab
npm ci --ignore-scripts
npm test
```

The lab test compiles the contract with solc and executes it on an in-memory EVM with mock contracts. It is not a fork test or on-chain test. Its dev dependencies are separate from the Next.js application.

`node fork-guard.mjs` runs a separate, read-only-RPC historical-state simulation; no approval or transaction is sent. Its RPC state is not proof-authenticated, and local EVM behavior may differ from the target chain. The RPC-backed state adapter overrides cache commits because the installed implementation does not commit its storage and code caches. The mock suite tests rollback with both state managers. See `docs/ONCHAIN-LIMIT-FEASIBILITY.md` for the current fork result and remaining verification gates.
