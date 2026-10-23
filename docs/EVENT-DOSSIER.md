# Event Dossier — dreamDEX Perps Builder Bounty

> Research artifact accessed October 23, 2026. Facts not available from the official DoraHacks page are explicitly marked secondary or unknown.

## Event facts

- **Platform:** DoraHacks.
- **Format:** online builder bounty focused on dreamDEX Perps.
- **Public event listing:** https://www.eventbrite.com/e/dreamdex-perps-builder-bounty-tickets-2003605109819
- **Official submission page:** https://dorahacks.io/hackathon/dreamdex-perps-bounty/detail
- **Dates:** Eventbrite displays October 19–November 2, 2026 in PDT. A secondary competition summary reports a deadline of November 1, 2026 at 23:59 UTC.
- **Safety deadline:** November 1, 2026 at 23:59 UTC until manually confirmed on DoraHacks.
- **Internal target:** October 31, 2026.
- **Eligibility:** registration is open, but submission requires a whitelisted email. Selected builders from the prior dreamDEX Event Contracts hackathon were invited.
- **Team size:** unknown.
- **Rounds:** no multi-round structure found; unknown until official page is manually confirmed.

## Money and tracks

Secondary summary: https://www.competehub.dev/en/competitions/dorahacksdreamdex-perps-bounty

| Track | Reported prize | Focus | Confidence |
|---|---:|---|---|
| Feedback | Up to $1,500 pool | Reproducible API, SDK, documentation, and app issues | Secondary source |
| MVP | 3 × $500 | A perps product worth using | Secondary source |

Reported total pool: **$3,000**. Confirm on the official DoraHacks page before using this in public copy.

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

Published weights were not found.

A secondary summary says MVPs are judged on:

- Potential.
- Building evidence.
- Communication.

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
| Whitelisted DoraHacks email | Eventbrite | Verify account can open final submission | No |
| GitHub repository | Secondary summary | Public repository with reproducible setup | No |
| MVP places real perp orders on Tokyo testnet | Secondary summary | Small ETH-PERP or BTC-PERP live run | No |
| README describes product and functionality | Secondary summary | Root README | Drafted |
| Link to posts about MVP | Secondary summary | Prepare X post; publish only with approval | No |
| Submission by Nov 1 23:59 UTC | Secondary summary | Internal Oct 31 target | Unconfirmed |
| Demo video | Unknown | Prepare a sub-three-minute demo as a safe default | Unconfirmed |
| Public deployment | Unknown | Plan deployment only after local verification and owner approval | Unconfirmed |

## Public competition intel

Accessible public build:

- `Bortlesboat/dreamdex-perps-feedback`: https://github.com/Bortlesboat/dreamdex-perps-feedback
- Lane: feedback, not MVP.
- Strength: exact upstream commit, reproducible tests, measured before/after behavior, candidate patch, and honest limits.
- Lesson: evidence quality matters more than visual polish alone.

Other public MVP submissions were not discoverable through indexed sources on October 23. This does not mean none exist.

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

- Exact submission deadline and timezone.
- Exact prize split.
- Team-size rules.
- Demo video requirement and length.
- Public deployment requirement.
- Whether pre-existing Downrail branding/code must be disclosed.
- Whether an X post must exist before submission or can follow it.

