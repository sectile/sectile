# Sectile

Sectile is a pnpm monorepo for deterministic, renderer-neutral interaction semantics and host adapters. The current workspace contains:

- `@sectile/primitives`: canonical structures, composite semantics, and revision control;
- `@sectile/dom`: controlled/uncontrolled DOM interaction controllers;
- `@sectile/terminal`: controlled/uncontrolled terminal interaction controllers.

Each package owns its source, build, tests, and package-specific verification. The workspace root only orchestrates package scripts, enforces package boundaries, and runs true cross-package verification.

```sh
pnpm verify
pnpm verify:theory
pnpm verify:reproducible-build
```

Start with [the documentation index](docs/README.md), the [accepted theory](docs/references/sectile-theory.md), and the [verification record](docs/references/verification.md).
