# Package boundary

Production build input is `src/**/*.ts` excluding `src/internal/reference/**/*.ts`. Public runtime structures live under `src/structures`; internal state, editing, composites, revision wrappers, host adapters, and kernel mechanisms remain non-exported. Verification build input includes the mirrored reference models and emits to `.verification-dist`, which is never packaged.

Recurring verification requires these canonical exports:

```text
.
./sequence
./range
./grid
./tree
./package.json
```

The check is additive: it verifies that these required entries exist and resolve to their expected production files. It does not treat every additional export as a regression. The absence of the pre-migration names was checked when the migration was performed; it is not maintained as a permanent blacklist.

The root runtime must remain empty. Consumer import checks execute the required canonical subpaths through Node package resolution and compile a separate strict TypeScript project against the emitted declarations.

The package footprint gate rejects reference files and output larger than 250 KB.
