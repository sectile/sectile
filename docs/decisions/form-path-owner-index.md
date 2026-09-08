# Form path ownership index

Historical #39 decision. The current lookup representation and evidence are in [Form path and output bounds](form-path-and-output-bounds.md).

Accepted for GitHub #39 on 2026-09-08.

Form owns path-to-field resolution. A canonical field-name/order generation performs its first query directly over existing field chunks and builds a first-owner-by-name map on its second query. Further queries probe the exact normalized path and then its dot/bracket boundary prefixes, longest first. The first field in current registration order wins equal names.

Metadata and issue patches share the private cache while names and order remain unchanged. Renaming invalidates it. Register, unregister, reorder and reinitialization construct a new field store. The cache retains existing name and ID strings, not prior states or field objects. External, potentially mutable state snapshots use the uncached scan.

For F fields and P queried paths, a generation performs at most two full-field traversals. Index construction additionally hashes registered name strings. A retained lookup costs expected O(L × D) for encoded path length L and boundary count D, including substring hashing, rather than O(F) candidate checks per path. Retention is O(F) map entries. One-shot queries allocate no name map and no materialized field array.

## Evidence

`packages/form/tests/state/form.test.mjs` exercises the production helper on canonical states and compares results with its external-state scan path. It covers longest ownership, dot/bracket/numeric boundaries, duplicate names, invalid and missing paths, rename, registration, removal, reorder and prior snapshot stability. The `ISSUE-039` work witness instruments production string-prefix and Map operations: proportional 250, 500 and 1,000-field/path batches stay below eight owner operations per field; doubling both cardinalities does not quadruple work. Metadata-only changes trigger neither scans nor map insertions. DOM Form also checks primary and related path ownership in one validation result.

A Node v24.20.0 Linux probe used `id-N` / `fieldN` fields and `fieldN.value` paths. State construction was excluded, every result was checked, both paths received three warm-up batches, and the following are medians of nine samples. The baseline called the same public helper on an external snapshot, retaining the full-scan implementation. These are diagnostic measurements, not performance certification or a release-to-release claim.

| Fields / paths | Full scan batch | Indexed batch | Initial scan | Index build on second query |
| ---: | ---: | ---: | ---: | ---: |
| 10 | 0.038 ms | 0.026 ms | 0.011 ms | 0.007 ms |
| 100 | 0.368 ms | 0.078 ms | 0.009 ms | 0.005 ms |
| 1,000 | 26.979 ms | 0.620 ms | 0.030 ms | 0.036 ms |
| 4,000 | 413.099 ms | 2.781 ms | 0.124 ms | 0.154 ms |

The batch benefit is material before large cardinalities. Delaying construction until the second lookup keeps one-shot callers free of retained map cost; repeated batches pay the build once per name/order generation. No field-count threshold is needed.

With explicit GC and twelve live 4,000-field owners, warming the maps added 1,377,960 retained bytes, approximately 114,830 bytes per owner in this engine. All twelve owner WeakRefs cleared after releasing the input states and yielding before GC. The asynchronous measurement used a separate callback for warming, so its loop variable did not keep the final owner alive. Heap figures are engine-dependent; lifetime ownership and the deterministic work witness are the durable contract.
