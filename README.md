# Sectile

Sectile is a renderer-neutral TypeScript package for deterministic logical interaction structures. The current public runtime consists of four canonical structures:

- `@sectile/primitives/sequence`
- `@sectile/primitives/range`
- `@sectile/primitives/grid`
- `@sectile/primitives/tree`

The implementation follows an explicit refinement pipeline: independent reference models, normative law suites, indexed production implementations, deterministic differential verification, and transactional public migration. The package root is intentionally type-only.

```sh
npm run verify
npm run verify:theory
npm run verify:reproducible-build
```

Start with [the documentation index](docs/README.md), the [accepted theory](docs/references/sectile-theory.md), and the [verification record](docs/references/verification.md).
