# @sectile/vue

## 0.5.0

### Changes

- fix(vue): preserve native IME ownership (1d7b6be)
- fix(vue): suppress fragment fallthrough warnings (b1300e7)
- docs(calendar): document temporal composition contract (5d97828)
- feat(calendar): expose complete year-view composition (acd820f)
- refactor(vue)!: expose inline temporal calendar (58b410f)
- refactor(calendar)!: project temporal dates across hosts (905447b)
- refactor(calendar)!: move date semantics to temporal (fa9cf3d)
- docs(virtual): define flexible layout contracts (7e3fe6e)
- fix(vue): prevent portalled popup scroll jumps (cf196fd)
- perf(virtual): bound masonry lane selection (77c97ec)
- perf(virtual): bulk-load the spatial index (9ef9dd5)
- perf(virtual): stream linear render extents (e09ada6)
- perf(virtual): keep large dynamic layouts on hot paths (e31b345)
- feat(virtual): add overlapping spatial layout (b1af9ba)
- feat(virtual): add adaptive masonry layout (c34bdce)
- feat(virtual): add sparse track-grid layout (db77688)
- feat(virtual)!: generalize linear layout semantics (262e9a4)
- refactor(core)!: extract virtualization engine (01b759f)
- refactor(core)!: extract temporal semantics (f89c3e4)
- perf(core): optimize virtual measurement batches (0bf0550)
- build(core): use package exports in virtualization benchmark (374b4eb)
- feat(core): add dynamic virtual layout semantics (2c23413)
- feat(core)!: publish incremental sequence patches (572b68b)
- feat(core): add persistent extent index (72473fb)
- build(core): classify semantic API changes (88bf4a7)
- perf(vue): define collection reconciliation costs (4423665)
- feat(core): publish host adapter authoring contract (ac66f5a)
- build(core): enforce internal import boundaries (9351b2c)
- docs(vue): define hydration evidence contract (b232fda)
- docs(vue): define controlled reconciliation contract (33cffee)

## 0.4.0

### Changes

- feat(form)!: harden Vue form contracts (7828c74)
- feat(vue): support unmounting closed popups (5e3ee14)
- fix(verification): suppress successful stage logs (350a390)
- fix(vue): expose camelCase event listeners (eb95454)
- feat(vue): support deferred portal targets (d07571b)
- docs(vue): define adopted element contract (9582873)
- fix(vue): preserve adopted slot element structure (e3ca4ba)
- docs: define runtime host and verification contracts (8adf47e)
- test(property): shrink cross-host parity failures (67f0bd4)
- refactor(runtime): harden text and terminal lifecycles (8031b73)
- test(verification): require vue projection evidence (77cca90)
- fix(vue): reconcile dynamic collection domains (ef33ef3)
- feat(errors): close public failure codes (952e8cb)
- refactor(runtime): centralize host controller lifecycle (1c5dafe)
- fix(vue): enforce focus and ownership contracts (05bb0fc)
- fix(selection): reconcile collection policy across hosts (be137fb)
- fix(release): make verification clean and interactive (bc4fe61)

## 0.3.0

### Changes

- docs(api): replace reference tables with definition lists (6afb424)
- feat(drawer): add cross-host drawer primitive (e4a3f45)
- fix(docs): constrain host select popup (76312c9)
- feat(popup): unify outside interaction handling (b1f97ed)
- fix(dialog): prevent documentation modal lockup (66b1b9b)
- fix(verification): run workspace checks sequentially (815c7f8)
- feat(popup): complete modal, select, and toast behavior (f191464)
- feat(vue): promote package to public release (1303f4b)
- fix(release): avoid expected failure annotations (2985c30)

## 0.2.1

### Minor Changes

- Promote the complete headless Vue package to the public release set.

## 0.1.0

### Minor Changes

- Add the initial headless Vue package and checkbox compound components.
