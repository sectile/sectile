# Roadmap

Foundational structure research and the internal state/data theories are closed for the declared scope. The current implementation state is:

1. `sequence`, `range`, `grid`, and `tree` are public canonical structures;
2. `listbox`, `slider`, `calendar`, `tree-view`, and combobox candidate acceptance are public pure facades;
3. every public composite has independent revisioned DOM and terminal controller witnesses;
4. `cursor`, `selection`, `expansion`, and text editing remain internal until their own direct usage-evidence gates are met.

The next promotion candidate is text editing. It requires a semantic `TextEvent` facade plus independent DOM and terminal input-normalization witnesses before `@sectile/primitives/text` becomes public. Full combobox text input, IME handling, filtering, and popup navigation remain separate from the existing acceptance-only contract.

Geometry, arbitrary DAGs, merged-cell region algebra, rich text, CRDTs, and genuinely unbounded streams remain scope-extension triggers rather than hidden callbacks in the current structures.
