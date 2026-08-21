# Sectile

Sectile is a pnpm monorepo for deterministic, renderer-neutral interaction semantics and host adapters. The current workspace contains:

- `@sectile/primitives`: canonical structures, composite semantics, and revision control;
- `@sectile/dom`: controlled/uncontrolled DOM interaction controllers;
- `@sectile/terminal`: controlled/uncontrolled terminal interaction controllers.

Adapter playgrounds are independent projects under `playgrounds/*` so new hosts can be added as siblings without coupling their dependencies, builds, or tests.

Each workspace project owns its source, build, tests, and project-specific verification. The workspace root only orchestrates project scripts, enforces package boundaries, and runs true cross-package verification.

```sh
pnpm verify
pnpm verify:theory
pnpm verify:reproducible-build
```

Run the playgrounds:

```sh
pnpm --filter @sectile/playground-dom dev
pnpm --filter @sectile/playground-terminal dev
```

Start with [the documentation index](docs/README.md), the [accepted theory](docs/references/sectile-theory.md), and the [verification record](docs/references/verification.md).
