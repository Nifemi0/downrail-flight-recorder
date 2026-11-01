# On-chain limit feasibility — local assessment

The installed `@somnia-chain/markets-sdk@0.32.1` `PlacePerpOrderParams` and `perpPoolWriteAbi` expose a limit price and quantity but no per-order maximum collateral pull or maximum margin-lock parameter. `previewPerpOrderMargin` is an off-chain read. In the SDK's documented direct owner placement, auto-pull may use the owner's wallet and a linked main wallet. Our 60-second review and calldata validation do not enforce a collateral cap on-chain.

The SDK also documents operator-routed `placeOrderFor` paths, where auto-pull is disabled because the sender is not the owner. A separately authorized operator contract might therefore be a possible route to execute against pre-deposited collateral and revert when its own checked invariants are exceeded. `contracts/guard-lab/ExperimentalPlacementGuard.sol` is a local research prototype: in a mock EVM, it reverts a placement if net owner or linked-payer token balance reductions or net free-bank-collateral reduction exceed the caller-specified bounds, or the resulting absolute position size exceeds its bound. The prototype requests an immediate-or-cancel order. The tests cover atomic rollback, a changed payer, a non-reverting rejection and expiry. This is not a supported or verified live-protocol solution: the live contract ABI, permissions, accounting behavior, existing collateral/locks, partial fills, cancellation and residual exposure must be investigated and tested. Funding the margin bank and granting an operator are separate user actions with their own security risks. There is no evidence here that this approach provides an exact cap on all user losses, exposure, fees or collateral usage.

Required before claiming an enforceable cap:

1. Identify a deployed testnet protocol interface and supported owner authorization path from authoritative contracts or organizer documentation.
2. Define precisely whether the cap applies to wallet transfer, increase in bank collateral locked, order notional, or maximum loss. These are different constraints. A limit order cannot guarantee maximum trading loss.
3. Implement and audit a minimal on-chain guard for the identified protocol interface, using strict per-order authorization, replay protection, deadlines and safe revocation.
4. Run unit and integration tests including altered market conditions, already-open positions, linked wallets, partial fills, failure/revert rollback and allowance changes. Reproduce on testnet with explicit owner wallet approval.
5. Independently review the contract and surface the authority and remaining allowance to the user. Never reuse an unverified deployment.

Until those gates pass, the application must label its checks as pre-sign checks only. The prototype measures net before/after balances for one transaction, not gross transfers or a lifetime spending cap. Other existing orders can still fill later and accrue further costs or losses. It is not wired into the app, not independently reviewed, and has not been tested on the actual dreamDEX contracts. No guard has been deployed or approved by this work.

Protocol documentation: https://prd.smk.somnia.host/docs/typescript/perps (operator-routed orders and auto-pull).

## Fork experiment, October 28

An in-memory experiment read historical Hideki RPC state and simulated operator authorization and a placement. The initial result was invalid: the RPC state manager's `commit()` committed the account cache but left storage and code cache checkpoints uncommitted. A regression test reproduced incorrect rollback with that adapter and passed after committing all caches. The corrected real-contract fork experiment is separate from the mock test; its outcome must be recorded before making any compatibility claim. RPC-backed simulation also does not authenticate state proofs. No transaction, approval, or deployment was sent to the network.

A corrected historical-state run at block 34494972 completed: with an existing 0.004 ETH position, a tight absolute-size limit reverted and the position remained 0.004 ETH; a wider limit allowed a simulated IOC and the position became 0.008 ETH. A second run confirmed that the revert was the guard's `LimitExceeded` error and that the owner's token balance and bank unlocked and locked collateral were unchanged after the revert; the wider-limit placement also succeeded. These are repeated runs of one historical scenario, not a live test, an audit, or evidence that the guard limits total losses, all fees, linked-payer effects or future orders. The RPC state is not proof-authenticated and the simulation may differ from chain execution.

The mock regression suite additionally checks that an existing position can be reduced to a specified bound, that an increase beyond the bound rolls back, and that revoking operator permission prevents another placement. These use mock protocol contracts and do not prove actual authorization revocation or collateral behavior on dreamDEX.
