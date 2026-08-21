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

Reference models remain under `src/internal/reference` and are compiled only into `.verification-dist`. Production builds exclude them. Public declarations are fingerprinted so a signature change cannot be merged as an incidental implementation edit.

The root module exports types only. This prevents an ambient service, event loop, or renderer binding from becoming accidental shared authority.
