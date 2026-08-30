---
title: Chart performance contract
description: Understand chart cardinality ceilings, cost bounds, allocation, and renderer tradeoffs.
---

# Performance contract

Performance is part of Chart behavior. All public collection-producing paths have explicit ceilings, immutable generations avoid hidden partial state, and renderers consume packed typed arrays.

| Operation | Time | Additional retained space |
| --- | --- | --- |
| Build or replace model | `O(n + l)` | `O(n + l)` packed values, IDs, and indexes |
| Apply patch | `O(n + p)` | `O(n + p)` for the next immutable generation |
| Project | `O(n + k)` | `O(k + l)` where `k` is representative budget |
| Repeat identical controller projection | `O(1)` | one retained projection |
| Build query index | `O(k log k)` | `O(k)` |
| Hit test after index build | average `O(log k + h)`, worst `O(k)` | bounded result, `h <= 256` |
| Render | `O(k)` upload/work, draw calls grouped by batches | renderer-owned GPU or Canvas resources |

`n` is source datum count, `l` layer count, `p` patch size, `k` emitted representatives, and `h` returned hits. The projection budget limits draw and query cardinality; it does not make model normalization sublinear.

Use WebGL2 for high repeated mark counts and Canvas2D for compatibility, debugging, or smaller surfaces. Adaptive resolution protects frame time by reducing pixel work, while representative limits protect CPU projection, upload, query-index, and draw work. Neither policy changes semantic state.

Run direct package evidence with:

```sh
pnpm --filter @sectile/chart test
pnpm --filter @sectile/chart benchmark
```

Repository close verification also checks complexity witnesses, consumer bundles, optional-peer install cost, source maps, lifecycle retention, and public signatures.

