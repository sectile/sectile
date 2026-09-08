# Form path and output bounds

Reviewed for GitHub #43 and #46 on 2026-09-08. This decision replaces the lookup representation in `form-path-owner-index.md`; that file retains the historical #39 measurements.

## Path ownership

Form owns path resolution. The first query in a canonical name/order generation still scans its existing field chunks. The second builds a lexical token tree. A token starts at the beginning of a name or at a dot/open bracket and ends before the next such delimiter. Keeping the delimiter on the next token preserves the existing raw-name ownership rule, including numeric/bracket distinctions and names that are not independently parsed paths. The first registered owner wins duplicate names. Queries traverse disjoint tokens once, retaining the longest owner and stopping at a missing edge or leaf.

Existing Core identity/result/collection foundations and the current Form name cache were inspected. No Core export provides this raw-name prefix ownership contract. The tree therefore remains a private Form implementation in the existing owner file, not a new public structure or dependency. Metadata-only generations share it; name/order changes invalidate it. External mutable snapshots retain the uncached scan. Nodes hold ID/token data rather than fields or previous states. Leaves allocate no child map.

For F fields, N total name code units, P queries and maximum encoded query length L, generation work is expected O(F*L + N + P*L), including the first scan, token hashing and normalization. A retained query is expected O(L), with no full-prefix hashing at each depth. Retention is O(N + F); query token substrings cover disjoint intervals totaling at most L. The tradeoff is extra tree-node storage compared with the complete-name map. One-shot consumers still allocate no retained index.

## Representation evidence

Measured the saved pre-change production Form build against the new production exports on Node v24.20.0, Linux. State construction and index warmup were outside batch timing; three warmup batches and seven samples, reporting medians. Deep batches contain fifty array paths with seventeen-character non-root segments and a distinct tail. These are scoped diagnostics, not release certification.

| Shape | Previous batch ms | Token-tree batch ms |
| --- | ---: | ---: |
| 10 fields, shallow | 0.0276 | 0.0291 |
| 100 fields, shallow | 0.1821 | 0.1124 |
| 1000 fields, shallow | 0.7700 | 0.7514 |
| 4000 fields, shallow | 2.4811 | 2.4265 |
| 128 segments, 50 paths | 7.6887 | 0.3595 |
| 256 segments, 50 paths | 30.0100 | 0.6448 |
| 512 segments, 50 paths | 117.4903 | 1.1563 |
| 1024 segments, 50 paths | 365.8709 | 2.3822 |

The 1024-segment paths contain approximately 18420 code units, within the existing public limits. Second-query index construction at 4000 fields measured 0.2479 ms before and 0.3961 ms after; small-form differences were tens of microseconds. The representation preserves the broad/shallow batch benefit while removing the independent quadratic path-depth factor. No additional threshold or alternative cache is introduced.

With twelve live 4000-field owners and explicit GC, the old name maps added 1383904 retained bytes; token trees added 3315768 bytes (about 276314 per owner). All twelve owner WeakRefs cleared after releasing each cohort and yielding before GC. The additional approximately 161 KB per large owner is the accepted tradeoff for linear-in-path lookup; storage remains tied to the immutable name/order generation. The temporary diagnostic programs and reports are under ignored `.tmp/`.

Production-bound tests preserve duplicate order, rename/register/unregister/reorder, metadata sharing, external mutation and dot/bracket ownership. A fifty-path witness at depths 128/256/512/1024 includes both a full-depth owner and early root-owner termination; total sliced code units do not exceed encoded input size, and probes stay below depth + 100. A second fifty-path witness follows an entire shared 1023-token owner branch and bounds both hashed and sliced code units by total encoded input size. DOM validation covers fifty deeply nested primary/related issue pairs using the same public owner helper.

A follow-up run of the same production diagnostic retained the earlier measurements above and confirmed the tradeoffs: fifty 1024-segment root-owned paths measured 425.817 ms versus 3.031 ms, and 4000 shallow paths measured 3.426 ms versus 3.014 ms. The contrasting case with a full-depth shared owner measured 3.878 ms versus 5.533 ms for fifty paths: the old map can find that near-exact owner in few probes, whereas the tree traverses the shared branch. Both are linear in encoded input size in this case. This bounded 1.655 ms batch increase, and the tree's larger retained storage, are accepted in exchange for removing the quadratic worst shape; this is not a claim that every input becomes faster. Second-query construction at 4000 fields measured 0.296 ms versus 0.246 ms in this rerun. Heap deltas were 1362312 versus 3320048 bytes for twelve owners, with all twelve collected on both sides. These scoped diagnostic timings are not statistical release certification.

## State output budget

`maxEntries` continues to count constructor field/issue records. For Form state, `maxOutputNodes` counts field records, canonical issue records and related-ID slots. Input relation lengths reserve the budget before ID normalization, including entries later removed because they equal the primary owner. This conservative preflight bounds temporary work as well as retained logical output. Accepted relation lists still receive complete stable-ID and duplicate validation. Existing opaque-value and path construction semantics are unchanged.

Canonical states retain their configured output ceiling privately, and issue stores retain the current normalized issue-record-plus-relation total. Registration, field replacement/upsert and source-wide replacement subtract the replaced record costs before reserving new input. Server submission failures use the same source replacement owner. Metadata changes, removals, reset and reinitialization preserve the ceiling. External snapshots are revalidated under the constructor's default limits when entering the transition API.

This deliberately extends the state output budget to later issue mutations, closing the cumulative-growth path rather than validating only initial construction. No new public option or parallel symbolic `maxIssueFieldRelations` limit is introduced. The default remains 200000 nodes. A configured higher budget is honored, while all arithmetic checks remaining capacity before adding relation lengths. Over-budget results use the existing `form-output-node-ceiling-exceeded` resource failure, with no state or command publication.

Reservation work is O(incoming records + removed records), reading relation lengths but not their elements. The existing canonical issue store owns the aggregate count, so unchanged updates do not rescan the relation graph just to determine remaining capacity. Accepted normalization/projection remains proportional to the bounded relation output. The implementation adds one ceiling scalar per private state and one count per issue store; resource ownership and cleanup are unchanged.

## Shipped cost decision

The pre-change package was already at 64849 JavaScript bytes against its package-local strict ceiling of 65000, leaving only 150 integer bytes of capacity. The token index and state-wide relation reservation together produce 67879 JavaScript bytes (+3030, 4.67%), 14862 declaration bytes (+115 from the budget documentation), and 49358 external-map bytes (+2190). Required contributors are token construction/traversal, early relation reservation at each input boundary, and propagation/accounting of the private state budget. No external dependency, public runtime export or bundled test was added.

The reviewed replacement for the package-local JavaScript check is 70000 bytes (strict less-than comparison, unchanged). Declaration and source-map ceilings remain 35000 and 80000. Existing consumer/package checks remain release gates.

The original consumer-install and source-maps units subsequently rejected their older Form size records. Those records predate this task: runtime JavaScript was 63906 bytes, compared with the actual pre-task 64849 bytes, and external maps were 46312 compared with 47168. The diagnostic collector inspected the existing publication tarball with the packed-package owner and invoked the existing source-map collector. Replacing only the Form source-map record satisfied every package comparison; unrelated records remain intact.

| Measured category | Previous reference | Current reviewed reference | Previous ceiling | Reviewed ceiling |
| --- | ---: | ---: | ---: | ---: |
| pnpm tarball | 29652 | 31338 | 31167 | 32937 |
| Packed runtime JavaScript | 63906 | 67879 | 67134 | 71305 |
| Packed external maps | 46312 | 49358 | 48660 | 51858 |
| npm dry-run tarball | 29373 | 31052 | 30858 | 32621 |
| npm unpacked package | 129130 | 136191 | 135603 | 143017 |

Only Form's records in the install and source-map baselines are aligned with these measured artifacts. Both still contain 27 files: eight JavaScript, eight declarations, eight external maps and three metadata files. The pnpm unpacked total is 136180 bytes; npm's package-metadata packing produces the independently measured 136191 bytes. Declaration bytes are 14862, and the pnpm metadata category decreases from 4159 to 4081 bytes. No temporary diagnostics or tests are shipped.

The install formula remains ceil(value * 1.05) + 32 and the source-map formula remains ceil(value * 1.05) + 16. All other packages, installed-dependency budgets, dependency rules, map privacy/structure checks and consumer-bundle baselines remain unchanged. The release continuation aligns only the active full-catalog certification reference `provenance.packageFootprint.form` from 125007 to 132099 dist bytes: 67879 JavaScript + 14862 declarations + 49358 external maps. The previously reviewed implementation accounts for this 7092-byte reference delta, including pre-task baseline drift. This is a footprint contract update, not a replacement statistical measurement. Timing, allocation, retained-heap samples, calibration, provenance timestamps/fingerprints, workload selection, other packages and the 5% comparison policy remain unchanged. The full ten-process release certification must still pass against those unchanged runtime criteria before publication. The original failed unit executions remain historical evidence and are rerun without weakening their checks.
