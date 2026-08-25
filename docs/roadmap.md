# Roadmap

Foundational structure research and the internal state/data theories are closed for the declared scope. The current implementation state is:

1. `sequence`, `range`, `grid`, and `tree` are public canonical structures;
2. `listbox`, `slider`, `calendar`, `tree-view`, `tree-grid`, and full editable combobox behavior are public pure facades;
3. every public composite has independent revisioned DOM and terminal controller witnesses;
4. text editing is public with independent DOM and terminal input-normalization witnesses;
5. generation-bound Form work, finite collection windows, nested layer ownership, and identity-based reorder are public coordination theories;
6. `cursor`, `selection`, and `expansion` remain internal until their own direct usage-evidence gates are met.

The original implementation slice is complete. Direct usage now identifies pointer input for the existing DOM facades and a broader APG composite set as the next targets. Pointer input extends the existing semantic events with direct identities or ticks; adapters do not synthesize keyboard events.

New candidates follow the [composite proof plan](architecture/composite-proof-plan.md). The proof audit decides whether a role receives a distinct primitive composite, shares an existing state machine, remains adapter-only semantics, or requires a new theory. Internal cursor, selection, and expansion utilities are still not promoted speculatively.

Geometry, arbitrary DAGs, merged-cell region algebra, rich text, CRDTs, and genuinely unbounded streams remain scope-extension triggers rather than hidden callbacks in the current structures.
