# Event Dossier — dreamDEX Perps Builder Bounty

> Official DoraHacks details checked October 26, 2026. The organizer has made the public builds list private.

## Event facts

- **Platform:** DoraHacks.
- **Format:** online builder bounty focused on dreamDEX Perps.
- **Public event listing:** https://www.eventbrite.com/e/dreamdex-perps-builder-bounty-tickets-2003605109819
- **Official submission page:** https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail
- **Deadline:** November 1, 2026 at 23:59 UTC, confirmed on DoraHacks (November 2 at 00:59 Lagos time).
- **Internal target:** October 31, 2026.
- **Eligibility:** registration is open, but submission requires a whitelisted email. Selected builders from the prior dreamDEX Event Contracts hackathon were invited.
- **Team size:** unknown.
- **Rounds:** no multi-round structure found; unknown until official page is manually confirmed.

## Money and tracks

Official source: https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail

| Track | Reported prize | Focus | Confidence |
|---|---:|---|---|
| Feedback | Up to $1,500 pool | Reproducible API, SDK, documentation, and app issues | Official |
| MVP | 3 × $500 | A perps product worth using; $300 initially, $200 conditional on a mainnet order within the organizer's stated window | Official |

Total pool: **$3,000**.

## Sponsor agenda

The event is designed to stress-test dreamDEX Perps and produce useful products on the Somnia Tokyo/Hideki testnet.

Sponsor-aligned MVP examples reported by the secondary summary:

- Trading bot.
- AI agent.
- Trader tool.
- Consumer perps application.

Primary documentation:

- Perps overview: https://app.dreamdex.io/docs/trading/perps-testnet
- Developer guide: https://app.dreamdex.io/docs/developers/perps-testnet
- Orders: https://app.dreamdex.io/docs/trading/perps-testnet/orders
- Margin and liquidations: https://app.dreamdex.io/docs/trading/perps-testnet/margin-and-liquidations
- Funding: https://app.dreamdex.io/docs/trading/perps-testnet/funding
- Link a bot: https://app.dreamdex.io/docs/trading/common/link-a-bot

## Judging

Published weights were not found. The official page lists MVP potential (user value, scope, repeat use and execution), evidence of building (testnet orders, transaction hashes, repo and demo), and communication (quality and accuracy of X posts).

Fallback planning rubric used for candidate selection:

| Criterion | Weight |
|---|---:|
| Sponsor and protocol fit | 25% |
| Verifiable live demo | 25% |
| Original product value | 20% |
| Feasibility before deadline | 20% |
| Communication clarity | 10% |

## Requirements ledger

| Requirement | Source status | Planned satisfaction | Confirmed |
|---|---|---|---|
| Whitelisted DoraHacks email | Eventbrite | Owner reports whitelist access on October 27; verify final submission form | Owner-confirmed; final form not independently checked |
| GitHub repository | Official | Public repository; clean-clone verification passed for app commit 47de832 | https://github.com/Nifemi0/downrail-flight-recorder |
| MVP places real perp orders on Tokyo testnet | Official | Owner-confirmed ETH-PERP open and close; chain evidence in evidence/ | Yes for the recorded testnet example |
| README describes product and functionality | Official | Root README | Drafted |
| Two or three X posts tagging @DreamDEXSomnia, linked in README | Official | Drafts prepared; publication pending | No |
| Submission by Nov 1 23:59 UTC | Official | Internal Oct 31 target | Deadline confirmed |
| Demo video | Unknown | Prepare a sub-three-minute demo as a safe default | Unconfirmed |
| Public deployment | Unknown | Plan deployment only after local verification and owner approval | Unconfirmed |

## Public competition intel

Accessible public build:

- `Bortlesboat/dreamdex-perps-feedback`: https://github.com/Bortlesboat/dreamdex-perps-feedback
- Lane: feedback, not MVP.
- Strength: exact upstream commit, reproducible tests, measured before/after behavior, candidate patch, and honest limits.
- Lesson: evidence quality matters more than visual polish alone.

The organizer has set the DoraHacks builds list to private. We cannot compare or rank the MVP field from that list.

## Candidate directions

| Idea | Sponsor fit | Demo evidence | Originality | Feasibility | Communication | Weighted score |
|---|---:|---:|---:|---:|---:|---:|
| Downrail Flight Recorder | 5 | 5 | 5 | 4 | 5 | 4.8/5 |
| Order Firewall | 5 | 5 | 3 | 5 | 5 | 4.6/5 |
| Bot Policy Console | 5 | 4 | 4 | 3 | 4 | 4.0/5 |
| Funding Lens | 4 | 3 | 3 | 4 | 4 | 3.6/5 |
| Liquidation Clock | 4 | 4 | 3 | 4 | 5 | 4.0/5 |

**Selected direction:** Downrail Flight Recorder. It has the strongest combination of sponsor fit, distinctive story, and verifiable evidence without requiring a new protocol.

## Unknowns requiring manual confirmation

- Team-size rules.
- Demo video requirement and length.
- Public deployment requirement.
- Whether pre-existing Downrail branding/code must be disclosed.

