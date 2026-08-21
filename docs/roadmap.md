# Roadmap

Foundational structure research and the internal state/data theories are closed for the declared scope. The current implementation state is:

1. `sequence`, `range`, `grid`, and `tree` are public canonical structures;
2. `listbox`, `slider`, `calendar`, `tree-view`, and combobox candidate acceptance are public pure facades;
3. every public composite has independent revisioned DOM and terminal controller witnesses;
4. text editing is public with independent DOM and terminal input-normalization witnesses;
5. `cursor`, `selection`, and `expansion` remain internal until their own direct usage-evidence gates are met.

The next composite slice is full combobox input: connect the public text facade to candidate filtering and popup navigation while keeping DOM IME phases explicit. The existing combobox contract remains acceptance-only until that complete slice has both host witnesses.

Geometry, arbitrary DAGs, merged-cell region algebra, rich text, CRDTs, and genuinely unbounded streams remain scope-extension triggers rather than hidden callbacks in the current structures.
