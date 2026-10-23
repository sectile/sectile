# @sectile/core

Renderer-neutral structures and deterministic interaction state transitions.

```sh
pnpm add @sectile/core
```

Import runtime operations from focused entries such as `@sectile/core/sequence`
and `@sectile/core/checkbox`. Core owns no rendering or host resources.

`@sectile/core/json` snapshots plain JSON data under explicit byte, value, depth
and string limits. `tryMeasureJSON` performs the same validation and accounting
without copying a data tree.
