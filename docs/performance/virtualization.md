# Virtualization benchmark

Run:

```sh
pnpm --filter @sectile/core benchmark:virtualization
```

The benchmark uses Pretext 0.0.8 as a same-process arithmetic-layout reference. It prepares text before timing, then measures `layout()` only. Sectile measurements cover a persistent extent index at 100,000 and 1,000,000 items, viewport reduction, a 32-item visible measurement batch, and the combined Pretext-plus-VirtualLayout path. These operations are not identical work, so absolute time and added bookkeeping are more useful than a raw ratio.

Observed on Node 24.19.0, Apple Silicon, macOS:

| Operation | Median time |
|---|---:|
| Pretext `layout()` | 0.180 µs |
| Extent lookup pair, 100k | 0.659 µs |
| Extent lookup pair, 1m | 1.805 µs |
| VirtualLayout viewport update, 100k | 1.657 µs |
| VirtualLayout 32-item measurement batch, 100k | 6.871 µs |
| Pretext 32 layouts + VirtualLayout measurement batch | 11.774 µs |
| Added VirtualLayout bookkeeping in the combined batch | 6.856 µs |

The script emits one JSON line and has no machine-dependent pass/fail threshold. Compare changes on the same runner and investigate allocation, lookup depth, and batch locality separately.
