# Roadmap

Foundational structure research and the internal state/data theories are closed for the declared scope. The current implementation state is:

1. `sequence`, `range`, `grid`, and `tree` are public canonical structures;
2. `listbox`, `slider`, `calendar`, `tree-view`, and full editable combobox behavior are public pure facades;
3. every public composite has independent revisioned DOM and terminal controller witnesses;
4. text editing is public with independent DOM and terminal input-normalization witnesses;
5. `cursor`, `selection`, and `expansion` remain internal until their own direct usage-evidence gates are met.

The declared implementation slice is complete. A new public state subpath or composite begins only when direct usage evidence identifies the next target; internal cursor, selection, and expansion utilities are not promoted speculatively.

Geometry, arbitrary DAGs, merged-cell region algebra, rich text, CRDTs, and genuinely unbounded streams remain scope-extension triggers rather than hidden callbacks in the current structures.
