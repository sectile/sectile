# @sectile/dom

## 0.11.0

### Changes

- build(packages): compact published JavaScript (19a4ba7)
- feat(form)!: model submission outcomes and related issues (db8abf1)

## 0.10.0

### Changes

- fix(dom)!: preserve native text editing semantics (8317807)

## 0.9.0

### Changes

- fix(positioning)!: keep anchored overlays visible (09923c0)

## 0.8.0

### Changes

- fix(hosts)!: complete semantic runtime alignment (c0f4ed8)
- test: cover performance alignment regressions (74de555)
- docs: scope performance engineering rules (c542973)
- fix(hosts): cancel stale lifecycle work (2a36b13)
- perf(virtual): bound Vue projection work (b6cc7d6)
- refactor(positioning)!: remove floating ui (0ae4140)
- feat(dom)!: add granular form subscriptions (c9cb0ee)
- refactor(dom): use canonical core controllers (50b22d0)
- feat(dom): add internal positioning engine (a29610f)
- feat(core): add selection expression algebra (6a2311a)
- perf(packages): split optional consumer entrypoints (f3fe66e)
- perf(packages): standardize published source maps (75193b9)
- refactor(core): enforce module DAG (5526b11)
- perf(tooling): accelerate workspace verification (9843c31)
- feat(form): track value baselines and reinitialize (1891564)
- test(form): cover complete scenario matrix (63036f7)
- build(form): integrate package tooling (9f1675c)
- feat(form): define typed submissions (84bbd12)
- feat(form): harden field participation (bc99987)
- feat(form): complete submission lifecycle (2a7c7fa)
- feat(form): extract renderer-neutral form package (9825324)
- feat(tabular): add checkbox range selection (7127e60)
- refactor(hosts)!: aggregate Tabular host exports (9600493)
- refactor(hosts)!: isolate optional capability families (db31333)
- fix(tabular): reuse checkbox component for selection (3543f3d)
- fix(tabular): make bulk selection controls tri-state (bd933af)
- fix(dom): preserve controlled field editing state (5e85e7e)
- feat(dom): coordinate tabular editing (3b14257)
- feat(dom): add tabular profile adapters (1c2fb05)
- fix(vue): preserve controlled IME composition (cdc6884)
- feat(api): expose cascade list entry points (832dfa6)
- feat(vue): add cascade list composition (bb6b431)
- feat(adapters): add cascade list projections (cef18fc)
- feat(meter-group): add host adapters (b3fece5)
- feat(progress): add exact task progress (c37253d)
- feat(meter): add exact read-only meter (2c21052)
- refactor(adapters)!: isolate optional virtual integrations (56f1f2d)
- fix(positioning): unify anchored overlay spacing (a07d0ce)
- chore(signatures): record picker anchor API (059d392)
- fix(positioning): preserve picker spacing and alignment (b509212)
- chore(signatures): record popup positioning API (1c730b1)
- feat(positioning): unify anchored popup engines (ee9b659)
- fix(positioning): keep floating layers attached on scroll (df0726d)
- fix(popover): align focus and modal contracts (fb49828)
- perf(dom): publish virtual scroll plans immediately (f9f8725)
- fix(toast): preserve controlled runtime state (2dfef60)

## 0.7.0

### Changes

- fix(dom): preserve virtual measurement failures (13d3cec)

## 0.6.0

### Changes

- fix(api): keep signature checks inside workspace boundary (15e5c85)
- feat(temporal): require explicit calendar reference dates (06fbb40)
- refactor(result)!: localize package error codes (ff18537)
- build(api): fingerprint every public package (5dee1c2)
- feat(dom): add virtualizer host adapter (68e29aa)

## 0.5.0

### Changes

- feat(calendar): expose complete year-view composition (acd820f)
- refactor(calendar)!: project temporal dates across hosts (905447b)
- fix(vue): prevent portalled popup scroll jumps (cf196fd)
- refactor(core)!: extract temporal semantics (f89c3e4)
- feat(core)!: publish incremental sequence patches (572b68b)

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

### Changes

- fix(release): validate built package artifacts (ff75428)
- fix(release): gate deployment on clean verification (7715121)

## 0.2.0

### Changes

- fix(release): allow fast-forward local main (f970e39)
- fix(release): correct repository and Node targets (b1e2294)
- feat(coordination)!: integrate host coordination primitives (b741804)
- docs(vue): sync generated API references (690b7c0)
- feat(core)!: add coordination primitives (cc94b34)
- docs(vue): document host provider defaults (34a0844)
- feat(vue): add host provider defaults (5e7d0cc)
- feat(dom): support RTL host direction (cbd32f7)
- docs(form): document root validation contracts (b47d8b9)
- feat(form)!: centralize validation lifecycle (599be73)
- feat(vue): export prop and event handler types (db24deb)
- feat(terminal): export callback function types (ab613c5)
- feat(dom): export callback function types (ee9b7dd)
- feat(core): export callback function types (b8055e0)
- docs(catalog): sync form and stepper contracts (8f6cd93)
- feat(stepper): export navigation actions (4954eb0)
- feat(form)!: manage submission lifecycle (0dea57d)
- feat(stepper): add previous and next actions (2a1b87c)
- refactor(accordion)!: remove deprecated policies option (818cc26)
- fix(text): preserve controlled IME composition (873dca7)
- fix(docs): unify temporal component styling (9eaa899)
- fix(docs): refine quantity field examples (63559f4)
- fix(dom): restore invalid numeric drafts on blur (6e1b48f)
- chore(docs): remove behavior and design tests (8f16004)
- refactor(docs): unify interactive component demos (2b773e8)
- refactor(docs): reuse Sectile controls in docs chrome (1842c76)
- feat(docs): render exact formatted example sources (4e336c8)
- feat(docs): generate complete component references (8f242d6)
- feat(tree-view): simplify selection and expansion state (89c732c)
- fix(vue): constrain window splitter panes (20955d4)
- fix(vue): stabilize reactive form fields (7edbb9c)
- fix(vue): preserve combobox IME composition (3cb6d49)
- fix(vue): make pin input OTP behavior opt in (b992746)
- fix(dom): preserve controlled pin input progression (8a770c7)
- chore(core): refresh form verification baselines (1a85adc)
- fix(vue): harden form control participation (0b0a469)
- fix(docs): sync text modifier examples (5975f9d)
- docs(form): add production form examples (4311844)
- feat(vue): support text model modifiers (99efa2e)
- feat(vue): integrate compound form controls (a8ba10c)
- feat(vue): integrate form value controls (010de3c)
- feat(vue): add form control participation (f539c8e)
- feat(dom): expose structured form submissions (8817317)
- feat(core): add structured form values (67da868)
- fix(verification): cover generated form contracts (cc8d663)
- feat(docs): document cross-host form coordination (0bd6a87)
- feat(terminal): add form coordination adapter (cbc3b84)
- feat(vue): add compound form coordination (13cd421)
- feat(dom): coordinate native forms (c9294b8)
- feat(core): add form coordination state machine (42f8147)
- chore(workstream): isolate local task state (206f3d1)
- docs(core): add executable component examples (ba2e891)
- refactor(core)!: split throwing and result constructors (ddb1499)
- fix(terminal): align temporal range scenarios (8aa9c7f)
- fix(terminal): clarify stepper and temporal interactions (1ec22da)
- fix(fields): recover temporal segment adjustments (b1ff64d)
- fix(docs): render terminal tabs as boxed panels (a4fd674)
- refactor(docs): consolidate anatomy into parts contracts (9f065a7)
- refactor(docs): simplify DOM example queries (fdcae3e)
- fix(pickers): stabilize year pages and current year state (0be4512)
- feat(terminal): complete interactive component examples (0356eaa)
- docs(navigation): simplify component entry points (16c643c)
- fix(pickers): align period picker state and navigation (0235217)
- docs(pickers): document period picker family (9924e64)
- feat(pickers): add period picker family (c2a3b40)
- docs(anatomy): align interactive inspection previews (e571e7e)
- docs(examples): replace generic component demos (a58cdbe)
- fix(controls): stabilize slider and spin interactions (f99fcc7)
- fix(calendar): reconnect cells after paging (7d6843d)
- fix(fields): support native temporal controls (c200bdf)
- fix(docs): require Vue code for every component example (734fcc9)
- docs(anatomy): stabilize menu preview layout (4e06be0)
- docs(examples): refine menu and dialog demonstrations (996a75c)
- docs(components): remove standalone secondary state examples (e9827ea)
- docs(navigation): regroup component sidebar (5b5c512)
- chore(playgrounds): remove standalone demo apps (71ff742)
- docs(packages): expand host integration guides (bc0ed2e)
- docs(ui): unify interactive previews and anatomy (868d52b)
- docs(components): generate complete component references (1d230eb)
- feat(terminal): add screen rendering primitives (8b6bdb2)
- fix(vue): restore client interaction behavior (32ec085)
- fix(vue): preserve composed part contracts (bb6c21b)
- fix(dom): expose composed parts and menu levels (ecbecc2)
- docs: expand interactive component catalog (497dcba)
- feat(playground): refine terminal component demos (c35476f)
- fix(terminal): align hierarchical menu keyboard navigation (72f3cb7)
- docs(checkbox): add complete interactive examples (539a154)
- docs: refine end-user documentation (efa20df)
- docs: add end-user documentation site (3d9c03e)
- feat(date-pickers): add week and year views (57f42d2)
- feat(color-picker): add model-aware visual controls (a15bad2)
- fix(vue): restore date-time picker calendars (45b524d)
- feat(overlays): add collision-aware floating positioning (b41ee19)
- chore: ignore local pnpm store (e13194c)
- fix(vue): consume semantics through DOM adapters (987ab09)
- feat(components): add color picker across hosts (d394951)
- feat(components): add cascade select across hosts (0d06b7a)
- feat(components): add timer across hosts (ee7582e)
- feat(components): add toast across hosts (b163e18)
- feat(components): add time range field across hosts (32150dc)
- feat(components): add date range field across hosts (8724d6f)
- feat(components): add editable across hosts (4d97c75)
- feat(components): add navigation menu across hosts (1d46c88)
- feat(components): add popover across hosts (7aa0cb4)
- feat(components): add toggle group across hosts (bac2f76)
- feat(playgrounds): expand Vue pagination examples (08434d4)
- feat(playgrounds): add complete DOM and Vue examples (53d5749)
- feat(vue): add complete headless component adapters (910df31)
- feat(dom): expose framework-ready component projections (5558250)
- feat(checkbox)!: align framework API with native hosts (2dc8fab)
- feat(vue): add headless checkbox package and playground (d002976)
- feat(dom): expose declarative checkbox projections (15373ee)
- fix(ci): omit empty directories from repository tree (18dca87)

## 0.1.0

### Minor Changes

- Publish the initial renderer-neutral core and DOM and terminal host adapters.

### Patch Changes

- Updated dependencies
  - @sectile/core@0.1.0
