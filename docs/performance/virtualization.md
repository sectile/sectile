# Virtualization benchmark

Run:

```sh
pnpm --filter @sectile/virtual benchmark
```

The benchmark uses Pretext 0.0.8 as a same-process arithmetic-layout reference. It prepares text before timing, then measures `layout()` only. Sectile measurements cover a persistent extent index at 100,000 and 1,000,000 items, viewport reduction, a 32-item visible measurement batch, and the combined Pretext-plus-VirtualLayout path. These operations are not identical work, so absolute time and added bookkeeping are more useful than a raw ratio.

Observed on Node 24.19.0, Apple Silicon, macOS:

| Operation | Median time |
|---|---:|
| Pretext `layout()` | 0.181 µs |
| Extent lookup pair, 100k | 0.621 µs |
| Extent lookup pair, 1m | 0.885 µs |
| VirtualLayout viewport update, 100k | 1.729 µs |
| VirtualLayout changed 32-item measurement batch, 100k | 5.288 µs |
| VirtualLayout idempotent 32-item measurement batch, 100k | 4.276 µs |
| Pretext 32 layouts + changed VirtualLayout measurement batch | 9.959 µs |
| Added VirtualLayout bookkeeping in the combined batch | 5.082 µs |

The script emits one JSON line and has no machine-dependent pass/fail threshold. Compare changes on the same runner and investigate allocation, lookup depth, and batch locality separately.
