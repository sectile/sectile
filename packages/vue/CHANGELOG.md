# @sectile/vue

## 0.9.0

### Changes

- fix(positioning)!: keep anchored overlays visible (09923c0)
- refactor(vue)!: make tabular sources controller-owned (003507b)

## 0.8.0

### Changes

- fix(hosts)!: complete semantic runtime alignment (c0f4ed8)
- test: cover performance alignment regressions (74de555)
- docs: scope performance engineering rules (c542973)
- fix(hosts): cancel stale lifecycle work (2a36b13)
- perf(virtual): bound Vue projection work (b6cc7d6)
- refactor(positioning)!: remove floating ui (0ae4140)
- feat(vue)!: add granular form selectors (4acb2df)
- refactor(vue)!: delegate semantic reconciliation (6e78f58)
- perf(virtual)!: add bounded measurement repair (65b5c5b)
- feat(core): add bounded geometry layout (c380773)
- perf(packages): split optional consumer entrypoints (f3fe66e)
- perf(packages): standardize published source maps (75193b9)
- perf(tooling): accelerate workspace verification (9843c31)
- feat(form): track value baselines and reinitialize (1891564)
- feat(virtual): bootstrap omitted sizes from DOM (a0435b5)
- test(form): add browser integration evidence (7d7b05f)
- test(form): cover complete scenario matrix (63036f7)
- build(form): integrate package tooling (9f1675c)
- feat(form): define typed submissions (84bbd12)
- feat(form): restore uncontrolled control defaults (2c933cd)
- feat(form): harden field participation (bc99987)
- feat(form): complete submission lifecycle (2a7c7fa)
- feat(form): extract renderer-neutral form package (9825324)
- feat(tabular): add checkbox range selection (7127e60)
- refactor(hosts)!: aggregate Tabular host exports (9600493)
- refactor(hosts)!: isolate optional capability families (db31333)
- fix(tabular): reuse checkbox component for selection (3543f3d)
- refactor(vue)!: rename tabular component factories (16d5831)
- feat(vue)!: bind tabular components to typed controllers (d4027e5)
- fix(vue)!: type tabular body slots (e86043d)
- feat(vue)!: simplify tabular row composition (4bd1591)
- feat(repo): integrate tabular release surface (75eb050)
- fix(dom): preserve controlled field editing state (5e85e7e)
- test(vue): prove raw tabular virtualization (4702d81)
- feat(vue): add tabular profile components (2b59248)
- perf(vue): optimize automatic virtual list resizing (7c9daf4)
- fix(vue): preserve controlled IME composition (cdc6884)
- test(vue): register cascade list form participation (ac38911)
- feat(api): expose cascade list entry points (832dfa6)
- test(vue): cover cascade list behavior (0e4ef84)
- feat(vue): add cascade list composition (bb6b431)
- test(range): add cross-host projection evidence (42abba6)
- feat(meter-group): add host adapters (b3fece5)
- feat(progress): add exact task progress (c37253d)
- feat(meter): add exact read-only meter (2c21052)
- feat(core): add exact scalar foundation (44545d1)
- refactor(adapters)!: isolate optional virtual integrations (56f1f2d)
- fix(positioning): unify anchored overlay spacing (a07d0ce)
- perf(vue): update virtual components by changed window (9cc8078)
- perf(vue): reconcile virtual collections incrementally (5fbb361)
- feat(vue): add declarative virtual collections (05eca48)
- chore(signatures): record picker anchor API (059d392)
- fix(vue): omit children from native void elements (3fc8020)
- fix(positioning): preserve picker spacing and alignment (b509212)
- chore(signatures): record popup positioning API (1c730b1)
- feat(positioning): unify anchored popup engines (ee9b659)
- fix(positioning): keep floating layers attached on scroll (df0726d)
- fix(popover): align focus and modal contracts (fb49828)
- fix(vue): expose accessible label resolvers (d0cde6f)
- feat(vue): expose toast composable (7e301bd)

## 0.7.0

### Changes

- fix(vue)!: align public prop contracts (233ce2a)
- fix(vue)!: clarify virtual layout ownership (71336e5)

## 0.6.0

### Changes

- fix(vue): verify hydration in actual browsers (8e4f159)
- feat(temporal): require explicit calendar reference dates (06fbb40)
- refactor(result)!: localize package error codes (ff18537)
- build(api): fingerprint every public package (5dee1c2)
- feat(vue): project virtual layouts (7406222)
- fix(vue): prevent redundant popup reconnections (bfaf166)

## 0.5.0

### Changes

- fix(vue): preserve native IME ownership (1d7b6be)
- fix(vue): suppress fragment fallthrough warnings (b1300e7)
- feat(calendar): expose complete year-view composition (acd820f)
- refactor(vue)!: expose inline temporal calendar (58b410f)
- fix(vue): prevent portalled popup scroll jumps (cf196fd)
- perf(vue): define collection reconciliation costs (4423665)
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
