# Roadmap

Foundational structure research and the internal state/data theories are closed for the declared scope. The current implementation state is:

1. `sequence`, `range`, `grid`, and `tree` are public canonical structures;
2. `listbox`, `slider`, `calendar`, `tree-view`, `tree-grid`, and full editable combobox behavior are public pure facades;
3. every public composite has independent revisioned DOM and terminal controller witnesses;
4. text editing is public with independent DOM and terminal input-normalization witnesses;
5. generation-bound Form work and Feed responses carry their originating generation through every host boundary;
6. trigger-owned DOM popups share one document layer stack, terminal applications can own an explicit layer scope, and sequence/tree reorder have DOM, terminal, and Vue host witnesses;
7. every semantic family declares its DOM and terminal input channels alongside concrete host tests;
8. `cursor`, `selection`, and `expansion` remain internal until their own direct usage-evidence gates are met.

The original implementation slice and the coordination-host integration slice are complete. Further component candidates come from direct product usage and the broader APG audit. Direct input extends semantic events with identities, ticks, or reorder placements; adapters do not synthesize keyboard events.

New candidates follow the [composite proof plan](architecture/composite-proof-plan.md). The proof audit decides whether a role receives a distinct primitive composite, shares an existing state machine, remains adapter-only semantics, or requires a new theory. Internal cursor, selection, and expansion utilities are still not promoted speculatively.

Geometry, arbitrary DAGs, merged-cell region algebra, rich text, CRDTs, and genuinely unbounded streams remain scope-extension triggers rather than hidden callbacks in the current structures.
