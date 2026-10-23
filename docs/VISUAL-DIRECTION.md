# Visual Direction: Black Box Evidence Lab

## Perception

Downrail Flight Recorder should feel forensic, exact, high-stakes, and operational. It is not a trading terminal and should not inherit the mint-and-lime protection-product language of the earlier Downrail interface.

## Directions considered

### Physical black box

Safety orange, carbon hardware, stamped identifiers, machined geometry, and a single recorder-like focal object. Strongest product recognition, but can become novelty hardware if the information hierarchy is weak.

### Mission telemetry

Midnight blue, instrument cyan, compact status rows, and animated traces informed by modern spacecraft displays. Excellent for the app surface, but a full HUD treatment risks feeling like generic sci-fi.

### Incident report

Warm evidence paper, redactions, case stamps, and document-led layouts. Strong for receipts and exports, but too static for a live recorder workspace.

## Selected system

**Black Box Evidence Lab** combines the physical black-box focal point with mission-telemetry interaction and incident-report receipts.

- Carbon is the operational base.
- Recorder orange is reserved for capture, active state, and proof.
- Instrument blue marks live indexed data.
- Bone white carries readable reports and long copy.
- Corners are clipped or lightly rounded rather than soft fintech capsules.
- Monospace is used for chain data, timestamps, hashes, and provenance.
- Motion represents scanning, recording, and event progression; it is disabled under reduced-motion preferences.

## References and extracted principles

- [NASA Human Factors Design Across the Artemis Fleet](https://ntrs.nasa.gov/api/citations/20240008838/downloads/AABI%20Keynote%20July%202024%20FINAL.pdf) — prioritize system state, hierarchy, and human-readable critical information.
- [SpaceX Dragon](https://new.spacex.com/vehicles/dragon) — focus a complex system into a small number of deliberate surfaces.
- [Teenage Engineering](https://teenage.engineering/) — let product-object character, compact labels, and industrial restraint create memorability.
- [Altara telemetry components](https://github.com/JayaSaiKishanChapparam/altara) — MIT-licensed implementation reference for telemetry vocabulary and instrument patterns; no source is copied into this build.
- [Spline examples](https://spline.design/examples) — future reference for a scoped recorder-object scene only if it explains the capture model and ships with static/mobile fallbacks.
- [Motion for React](https://motion.dev/docs/react) — optional implementation reference for future event transitions; the first slice uses CSS only.
- [Radix Primitives](https://www.radix-ui.com/primitives) — optional accessible behavior layer for future dialogs, tabs, and disclosures.

## Translation across surfaces

- Landing: large thesis, physical recorder/evidence object, live connection strip, one primary action.
- App: dark operations panel with orange active states and instrument-blue live data.
- Receipt: bone evidence sheet with hashes, provenance, and no decorative dashboard chrome.
- Docs: bone canvas, black typographic hierarchy, orange callouts, blue source links.
- Mobile: product thesis first, recorder object second, horizontal data tables converted into grouped rows.

## Boundaries

- No fake telemetry or decorative metrics.
- No full-screen 3D behind text.
- No neon-green fintech palette, glass cards, gradient blobs, or pill-heavy component styling.
- No claims that are not backed by the live indexer or saved evidence.
