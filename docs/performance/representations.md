# Representation crossovers

This generated record freezes WI-018 representation choices before implementation. Timings are medians from five isolated Node processes; deterministic work, allocation units, retained bytes, observed heap delta, and prototype source bytes are separate evidence dimensions. A selected adaptive representation includes the fallback named in its rule.

| Family | Selected | Frozen rule | Evidence range |
|---|---|---|---|
| sequence | `adaptive-flat-overlay` | Keep a flat indexed base plus at most 32 overlay patches; compact when depth exceeds 32, cumulative changed cardinality exceeds n/8, or projected overlay reads exceed one materialization. | 0.175–2,521 µs; retained 781.3 KiB–784.3 KiB |
| selection | `sorted-sparse-vector` | Store selected domain indexes in one sorted vector; do not retain a dense fallback until a consumer workload proves that conversion plus deterministic materialization beats the vector above 1/16 density. | 1.613–1,721 µs; retained 7.813 KiB–1,563 KiB |
| grid | `dense-flat` | Retain dense row-major storage and one ID-position map through the current one-million-cell ceiling; reconsider CSR/CSC only for a new workload below 5% occupancy with repeated row/column reads. | 17.9–3,584 µs; retained 119.5 KiB–1,173 KiB |
| tree | `lazy-euler-cache` | Build immutable preorder, postorder, child views, and Euler subtree intervals lazily once per Tree owner, then reuse them by owner identity. | 13.46–1,307 µs; retained 78.13 KiB–156.3 KiB |
| text | `local-boundary-proof` | For a canonical well-formed source, validate the replacement and the two adjacent UTF-16 boundaries only; externally supplied text still receives a full scan. | 0.018–237.8 µs; retained 0 KiB–0 KiB |
| reorder | `retained-index-one-materialization` | Resolve source/destination through the retained canonical index and perform exactly one unavoidable output materialization; never reconstruct the same index in the transition. | 79.89–5,210 µs; retained 781.3 KiB–3,906 KiB |
| exact-ratio | `euclidean-reduce` | Reduce once with Euclidean GCD under explicit operand/result bit ceilings; cache only the fixed powers of ten 0..18 and never memoize arbitrary operand pairs. | 181.7–386.5 µs; retained 0 KiB–144 KiB |
| index-span-set | `flat-normalized-vector` | Store sorted non-overlapping half-open spans in a frozen flat vector, merge adjacency, use binary membership, and merge set algebra linearly in input span counts. | 57.65–185.7 µs; retained 156.3 KiB–468.8 KiB |
| selection-expression | `set-plus-vector` | Retain one deterministic frozen exception vector plus one private Set for expected-O(1) membership; return the same owner on semantic no-ops. | 2,661–4,538 µs; retained 32 KiB–160 KiB |
| metric-index | `balanced-kd` | Use packed scan for x<=128, d>8, fewer than 128 nearest/radius queries per immutable owner, or update-heavy owners; otherwise build a balanced kd index and fall back when one query inspects more than x/2 candidates. | 635.1–58,560 µs; retained 64 KiB–640 KiB |
| geometry | `scalar-bounded-scoring` | Expose immutable finite-number records at API boundaries but evaluate at most 12 normalized placement candidates through scalar locals and materialize only the winning result. | 174.5–15,020 µs; retained 0 KiB–0 KiB |
| tabular-cache | `single-current` | Retain exactly one normalized source/query/projection generation keyed by all governing revisions; invalidate once on generation change and never retain an LRU by default. | 951.9–7,054 µs; retained 0 KiB–1,250 KiB |
| virtual-spatial | `blocked-path-copy` | incremental iff n>=1024 and repairBound(j,n)<n/2; otherwise abandon repair storage and perform one packed full rebuild. | 2.28–575.1 µs; retained 781.3 KiB–3,906 KiB |
| virtual-track | `blocked-path-copy` | incremental iff n>=1024 and repairBound(j,n)<n/2; otherwise discard the bounded attempt and rebuild packed prefix/track state once. | 2.278–573.6 µs; retained 781.3 KiB–3,906 KiB |
| color-value | `immutable-boundary-scalar-internal` | Use explicit frozen normalized color records only at public/state boundaries and scalar locals through conversion matrices, transfer curves, polar transforms, and gamut loops. | 709.7–3,559 µs; retained 0 KiB–0 KiB |
| color-gamut | `fixed-12-chroma` | Expose reject and clip as O(1) explicit policies; implement reduce-chroma with exactly 12 monotonic OKLCH iterations and no tolerance-controlled unbounded loop. | 6.531–294.4 µs; retained 0 KiB–0 KiB |

## Rejected alternatives

- **sequence:** `flat-rebuild` — Copies the complete domain for every bounded patch. `chunked-piece-table` — Adds block indirection and retained objects without an end-to-end win before the bounded overlay compacts.
- **selection:** `dense-bitset` — Dense toggles are fast but every immutable write copies the universe-sized bitset and deterministic ID output still scans the universe. `persistent-hash-set` — Per-entry object and hashing overhead exceeds the sorted vector on supported sparse workloads.
- **grid:** `csr-csc` — No measured CPU/allocation crossover at or above the supported 5% occupancy boundary.
- **tree:** `repeated-dfs` — Repeats full-domain traversal and allocation for unchanged immutable input.
- **text:** `full-utf16-scan` — Redundantly scans the unchanged canonical prefix and suffix.
- **reorder:** `rebuild-and-reindex` — Performs redundant linear lookup and a second full index allocation.
- **exact-ratio:** `memoized-gcd-and-powers` — Unbounded operand-key retention and serialization erase any low-reuse arithmetic gain.
- **index-span-set:** `interval-tree` — Adds node/max metadata while normalized non-overlapping spans need only binary search.
- **selection-expression:** `sorted-vector-only` — Saves the Set but makes every membership logarithmic and repeated algebra lookup more expensive.
- **metric-index:** `packed-vector-scan` — Remains the fallback but cannot be the sole representation for large low-dimensional query-heavy owners. `spatial-hash` — Requires distribution- and radius-specific cell sizing and has unstable sparse/skewed worst cases.
- **geometry:** `immutable-object-candidates` — Allocates and sorts every bounded candidate despite requiring only one minimum.
- **tabular-cache:** `repeat-resolution` — Repeats filter/sort/group/projection for access-only observations. `multi-entry-lru` — Retains multiple large generations with no measured active-view hit-rate advantage.
- **virtual-spatial:** `packed-full-rebuild` — Retained below crossover but cannot be the sole path for small updates to large owners. `per-item-persistent-tree` — Per-item nodes and path copies exceed retained-memory and bundle budgets.
- **virtual-track:** `packed-full-rebuild` — Retained for small or update-dense owners but scales with total tracks for a one-track measurement. `per-item-persistent-tree` — Fine-grained nodes increase allocation and retained heap beyond blocked summaries.
- **color-value:** `mutable-class-plugin` — Adds mutable identity, method dispatch, plugin closure, and one object per conversion step. `immutable-object-every-step` — Preserves semantics but allocates intermediate records in every scalar stage.
- **color-gamut:** `reject` — Remains the default policy but cannot serve callers explicitly requesting perceptual gamut projection. `clip` — Remains available but may change hue/lightness relationships more than bounded chroma reduction.

The machine-readable source of truth is `verification/representation-crossovers/decisions.json`; `pnpm check:crossovers` rejects source, decision, evidence, threshold, or documentation drift.
