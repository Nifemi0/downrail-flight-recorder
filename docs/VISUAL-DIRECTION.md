# Downrail visual direction: Precision Ledger

## Product perception

Downrail should feel understandable, credible, active, and polished. It is a position-intelligence product for dreamDEX Perps—not a cyberpunk terminal, insurance storefront, or generic crypto dashboard.

## Directions considered

### Precision Ledger — selected

A calm, product-led financial interface where the working receipt is the visual identity. Warm neutral space, crisp typography, one electric blue accent, a small lime confirmation color, and interactive product proof.

- Best fit: makes a complex product easier to understand while still feeling distinctive.
- Risk: can become generic SaaS if the position receipt and evidence model are not kept prominent.
- Reference principles: [Tessel Finance](https://www.framer.com/marketplace/templates/tessel-finance/) for interactive product demonstration, [Basis Treasury](https://www.framer.com/marketplace/templates/basis-treasury/) for live proof instead of claims, and [Saasyy](https://www.framer.com/marketplace/templates/saasyy/) for spacing and type discipline.

### Signal Room

A darker market-intelligence interface built around dense charts and monitoring states.

- Strength: technical and immediate.
- Rejected: too close to the previous black-box direction and too intimidating for first-time users.

### Position Journal

An editorial report aesthetic that treats each trade like a clean case study.

- Strength: excellent for exported receipts and documentation.
- Rejected as the primary language: too static for the live recorder workspace.

## Visual system

- Canvas: warm neutral `#F5F5F0`
- Surface: white `#FFFFFF`
- Ink: near-black `#111217`
- Primary accent: electric blue `#5361FF`
- Confirmation accent: lime `#C6FF5E`
- Success: deep teal `#13866F`
- Type: modern grotesk/system sans for explanations; monospace only for addresses, data, and provenance.
- Geometry: 10–26px radii, disciplined cards, no glassmorphism, no giant decorative capsules.
- Motion: one chart pulse and subtle hover lift; all motion disabled under reduced-motion preferences.

## Signature moves

1. The hero shows a believable position receipt instead of abstract decoration.
2. The live recorder workspace is the visual centerpiece, not a screenshot buried below marketing copy.
3. Blue communicates active analysis; lime is reserved for confirmation and action completion.
4. Every technical number remains paired with a plain-language label.

## Translation across surfaces

- Landing: plain-language promise, input/output preview, concrete PnL breakdown, three-step explanation, live recorder workspace, network proof, final CTA.
- App: the same cards, typography, selection states, receipt timeline, and address inspection control.
- Docs: warm canvas, restrained blue callouts, narrower reading width, identical evidence terminology.
- Mobile: single-column narrative, no hidden primary action, simplified preview labels, full-width controls.

## Boundaries

- Do not reuse Downrail's former mint/orange editorial language.
- Do not use decorative slash-number labels.
- Do not invent live data in functional areas; illustrative values must be labeled as product preview.
- Preserve all current market and wallet-reading mechanics during visual work.
- Keep local until the owner explicitly requests deployment.

## Product story hierarchy

The landing page must answer these questions in order:

1. What is it? A readable trade record for dreamDEX perpetual positions.
2. What does the user provide? A public testnet wallet address.
3. What does Downrail do? It joins supported order, fill, funding, and position-change events chronologically.
4. What does the user receive? A readable position record with the available source behind each claim.
5. What does it not do? It does not take custody, request a private key, move funds, or sign from the current interface.
