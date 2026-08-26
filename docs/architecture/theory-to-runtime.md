# Theory to runtime

Every public structure follows the same refinement chain:

```text
carrier + observations + laws + failures + costs
  → independent executable reference
  → bounded law verification
  → indexed production representation
  → deterministic differential comparison
  → public subpath
```

Runtime sources are grouped by theory role inside `@sectile/core`: public structures under `src/structures`, internal state under `src/internal/state`, editing under `src/internal/editing`, composites under `src/internal/composites`, revision wrappers under `src/internal/runtime`, and shared mechanisms under `src/internal/kernel`. Public listbox, slider, calendar, tree-view, tree-grid, combobox, text, and revision facades expose pure state construction and event application. Semantic events include directional operations and direct identities or ticks; pointer adapters dispatch the latter instead of synthesizing keyboard input. DOM and terminal controllers live in the independent `@sectile/dom` and `@sectile/terminal` packages; they own uncontrolled state, accept synchronized controlled values, translate host input, and project semantic commands into host effects. Reference models mirror the semantic theory groups under `src/internal/reference` and are compiled only into `.verification-dist`. Production builds exclude them. Public declarations are fingerprinted so a signature change cannot be merged as an incidental implementation edit.

The production import graph is enforced as a directed boundary. Foundation and kernel cannot depend on semantic structures or components; structures can use kernel; state can use structures; editing can use state; composites can compose all lower semantic layers. Runtime revision helpers depend only on foundation and kernel. Root-level public facades may re-export lower layers, and the `grid` subpath has one declared facade re-export for grid-control state. Any other upward import fails `check:import-boundaries`.

The root module exports types only. This prevents an ambient service, event loop, or renderer binding from becoming accidental shared authority.
