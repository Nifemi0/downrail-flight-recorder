# Local direct-event archive

The version 4 local command reads `PositionUpdated`, `FundingSettled`, `FeeCharged`, `RebatePaid`, `OrderPlaced`, `OrderFilled`, `OrderCancelled`, `OrderExpired`, `OrderReduced`, `OrderRested`, `OrderCancelledSelfMatch`, `MakerOrderCancelledExceedsPosition` and `OrderCancelledPreFill` directly from Hideki RPC logs for one account and market. It is not a complete indexer and does not drive the app's indexed receipt. It needs historical RPC logs. Pool-wide order events are filtered after retrieval: only fills and changes whose order placement was seen within the archived range can be assigned to the account. Orders placed before the start, other event kinds, and missed or unavailable RPC logs remain outside coverage.

The local app's **Open a local chain-event archive** view can inspect a saved file even when market discovery is unavailable. It shows the archive's own account, pool, claimed range and events without consulting the indexer. From the same view, a user can request a fresh, read-only RPC scan for up to 1,000 blocks using the file's supplied pool and account. That scan resolves bank and decimals directly from chain, without market discovery, and returns position, funding, fee and rebate events only. The supplied market label and pool are not authenticated as the intended market. RPC responses are not proof-authenticated and recent blocks can change. Because files can be edited, the saved file itself is not independent authentication of its contents or a current position, and it does not establish full net PnL. The bounded route has not been hardened for public high-volume hosting.

Run only one process per output file. The first run discovers the pool from the official indexer; later runs use the saved pool and verify bank and decimals on-chain without consulting the indexer:

```bash
npm run archive:events -- 0xYOUR_ADDRESS ETH-PERP 34005026 34007780 local-archives/my-eth.json
```

To start without the indexer, set `DOWNRAIL_ARCHIVE_POOL` to a verified pool address before running. The script validates its MarginBank and decimals on-chain but does not prove the user-supplied ETH/BTC label matches that pool; verify the address independently. Version 4 adds event types, so older archives cannot be resumed as version 4: rebuild from the desired starting block into a new output file. The app can still import version 3 files for comparison.

The output contains a public wallet address and transaction data. Files under `local-archives/` are ignored by Git. Each successful chunk is saved with a checkpoint block hash using a temporary file and rename; restart with the same account, market, start block and output path to resume. The command checks the checkpoint hash before continuing and halts if it changes. It requires the end block to be at least 12 blocks behind the observed head; this delay is a precaution and is not a guarantee of finality. It only covers the explicitly requested block range. Each run scans at most 100,000 new blocks, fetched in chunks of at most 1,000 blocks. Transient RPC failures are retried once. A crash can leave a temporary file; inspect it before removing it.

Live check on October 27, 2026: owner testnet wallet, ETH-PERP, blocks 34005026–34007780. A one-block run was resumed to the close; the version 2 archive contained both order placements, both fills, and the opening and closing position updates; close realized price PnL was −0.00652 paper USDso. A version 3 archive was separately initialized from the explicit ETH pool and resumed from its saved checkpoint without market discovery. The app can import an archive locally and compare position changes, but an imported file is editable and is not authenticated. A single `--once` follower run advanced the checkpoint from 34007780 to 34008780. This verifies this small range only.

On October 28, a fresh version 4 scan of the same range using the explicitly supplied pool again returned those six records. None of the newly supported order-event types occurred in this small sample. The local app imported the version 4 file and matched both position changes; a subsequent single follower cycle advanced it to block 34008780. An attempted version 3 resume and follower run were rejected as intended; the old file was not migrated or overwritten.

To keep a local archive advancing, run:

```bash
npm run archive:follow -- 0xYOUR_ADDRESS ETH-PERP 34005026 local-archives/my-eth.json
```

The follower is opt-in and runs until interrupted; it reads up to 1,000 new blocks per cycle with a 30-second pause, stops on a failed chunk, and checks the saved checkpoint before writing. Append `--once` to run just one cycle. This is not a hosted service; it does not run when your process is stopped. Avoid running multiple archive or follower processes against the same output file.
