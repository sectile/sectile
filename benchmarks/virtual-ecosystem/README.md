# Virtualization ecosystem benchmark

This browser benchmark compares equivalent public framework paths across list, flow-grid, masonry, track-grid, and spatial families. The committed `chrome-151-macos-arm64*.json` files are a historical Sectile Virtual 0.11.1 observation from commit `ce84a7b1`; they are not current-release results. The list family in that observation covers seven virtualizers:

- Sectile Virtual 0.11.1 with Vue 3.5.22
- TanStack Virtual 3.14.10 with React 19.2.8
- react-window 2.3.0 with React 19.2.8
- React Virtuoso 4.18.12 with React 19.2.8
- react-virtualized 9.22.6 with React 19.2.8
- Virtua 0.50.5 with React 19.2.8
- Vue Virtual Scroller 3.0.5 with Vue 3.5.22

The runner always injects the current `@sectile/virtual/package.json` version into newly generated reports. A result describes only its recorded package version, browser, operating system, source commit, dirty-worktree flag, and build fingerprint. Publish a current-release comparison only after a fresh complete run in the declared environment; never relabel an older result.

## Row profiles and height conditions

Every adapter renders the same 100,000 items in a 720 by 480 pixel viewport. The runner has two row profiles:

- `uniform`: every row is exactly 72px tall;
- `heterogeneous`: 256 deterministic content variants produce natural DOM heights, including wrapped summaries, tags, and expanded details. The application never receives or calculates per-item heights.

The heterogeneous oracle renders every content variant in a hidden calibration fixture twice. It supplies expected geometry only to the benchmark validator. Adapter and library code cannot access those measurements.

The runner separates three height-input conditions:

- `fixed`: the application supplies the exact 72px row height;
- `estimated`: the application supplies 72px as an initial estimate and the library measures the DOM;
- `automatic`: the application supplies no height or estimate and the library discovers the size from the DOM.

Non-list families use deterministic two-dimensional fixtures and a family-specific correctness oracle. Flow-grid compares Sectile with React Virtuoso, masonry compares Sectile with TanStack Virtual, track-grid compares Sectile with react-window and Virtua, and spatial currently records Sectile's positioned public API. Unsupported library/mode pairs remain explicit capabilities rather than synthetic adapters. Benchmark scrollbars are visually hidden so the declared 720 by 480 pixel viewport is also the DOM client viewport on both overlay-scrollbar and classic-scrollbar platforms.

Exact layout modes require the fixture's full content extent, absolute item geometry, identity, and coverage of the content-bearing viewport region. Browser scroll extent is the larger of logical content extent and client viewport extent, so collections shorter than the viewport retain an exact zero-range scroll contract without being required to fill blank space after their final item. A clamped scroll request that cannot change the current offset is retained as a no-op correctness sample with zero scroll latency and a separately recorded geometry-probe cost; it is not presented as native scroll work. A library that accepts exact per-item sizes but lazily derives their aggregate extent keeps exact item geometry checks while the unseen total extent remains provisional. Estimated and DOM-discovered modes retain both provisional extent and placement semantics: the runner requires the requested revision to be committed, finite scroll extents, correct rendered-item identity and size, and a non-empty content region, without treating an unseen-item estimate or an implementation-defined masonry lane choice as exact geometry. Mutation completion requires the affected inserted, moved, removed, or resized items to be observable in the rendered DOM. Fixed flow-grid and masonry inputs remain uniform, and content-driven resize scenarios run only for modes whose public contract can change item size.

The uniform profile uses an exact 72px estimate. The heterogeneous profile deliberately keeps the same common 72px estimate even though actual rows differ. This exposes how each library refines an initial estimate from DOM measurements. The automatic path starts without an application estimate.

The automatic condition includes only libraries whose public API can start without application-provided size information. Unsupported libraries remain listed in the result metadata with the required input.

Before measured rounds, the runner measures one first instance for every active condition in a fresh same-origin browsing context. It records DOM and layout readiness separately from the next browser presentation opportunity, then excludes that instance from warm medians. The main runner completes one additional untimed mount per condition before rotating library order with a step that is coprime to the active condition count, including focused three-condition runs. Each round performs five warm-up scrolls followed by 20 recorded scrolls across the full collection. After three rounds, a condition stops when its cumulative median changes by no more than 5% and its p95 by no more than 10%. Unstable conditions continue through all five rounds. The harness changes `scrollTop` after a frame boundary, then starts timing when the browser begins delivering the native scroll event. It reads row geometry and records the time immediately after those DOM reads. Correctness validation runs against that snapshot outside the timed interval.

Each raw scroll sample retains its round and sample number, a lower bound taken before geometry reads, a conservative upper bound taken after those reads, the probe cost between both bounds, and the number of correctness checks. The reported median and p95 use the conservative upper bound. MAD and per-round ranges remain in the result so a slow round is not hidden by the pooled median. Warm initial rendering reports the committed scroller shell, first row output, and the first correct viewport layout. First-instance presentation is a separate diagnostic and is never pooled into that warm score.

The reported values include framework and adapter work. They are not isolated layout-algorithm timings. Raw results retain rendered-row and DOM-element counts as diagnostics; the documentation chart does not use them as performance scores.

Mutation timings cover insertion, adjacent movement, removal, and content-driven height changes at the start, middle, and end of the collection. Every scenario allows up to 50 samples in independent batches of 5, 5, 10, 10, 10, and 10. A clean condition stops after at least 30 samples when its cumulative median changes by no more than 5% and its p95 by no more than 10%. A p95 is not reported below 30 settled samples. Each batch mounts a fresh instance, and each sample restores a verified initial collection. A failed restore discards that instance and starts a new one. Two-dimensional fixtures retain the object identity of semantically unchanged adapter inputs while keeping their independently recomputed oracle geometry. List and two-dimensional runners share the same target-positioning, DOM-readiness, and frame-settlement kernel; only the family-specific snapshot and oracle checks differ. The runner positions the actual target item in each implementation, then requires the affected DOM state before stopping the timer. This prevents an outer framework commit from being mistaken for completed virtualizer work. Uniform rows also require an exact total scroll height. Heterogeneous rows record total-height estimation error separately because unseen DOM has no measured height yet. A sample that recovers keeps both the time to its first correct frame and a transient-failure record. Recovery within 200ms is responsive, while recovery from 200ms through 500ms is recorded as slow. A sample that has not reached a correct frame within 500ms is a hard failure. An incorrect layout that remains identical for at least 300ms and eight consecutive frames can fail earlier. When the same hard-failure code set occurs in all five samples of two consecutive independent batches, the runner records the 10 executed samples and stops the remaining work as a reproducible failure.

Initial-render failures are recorded per round and do not abort the remaining libraries. The same stable-failure rule shortens a layout that has stopped changing, while a layout that is still converging keeps the full recovery window.

## Run

```sh
pnpm --filter @sectile/benchmark-virtual-ecosystem dev
```

Open the printed URL in Chrome and choose **Run benchmark**. Commit raw results only with the browser version, operating system, viewport, package versions, and conditions emitted by the page.

List protocol 12 separates a fresh-context first-instance presentation boundary from warm layout readiness and normalizes short-collection scroll extent and attainable target positioning. Layout protocol 11 fixes the client viewport across operating-system scrollbar models. Successful warm timings still resolve directly from DOM and size observations without an animation-frame floor. Protocol versions are part of shard compatibility, so list protocol 12 results cannot be merged with earlier list protocols or layout protocol 11. Every browser run receives a UUID, start and completion timestamps, and wall-clock duration. Results retain the run IDs that contributed to them, and the report stores the corresponding Git commit, dirty-worktree flag, and SHA-256 fingerprint of the benchmark harness plus the Sectile virtual source used by that build. A partial commit or shard merge rejects reports with missing provenance or a different build fingerprint. This prevents a focused rerun from silently mixing measurements produced by different code.

Select a non-list family with `family`, for example:

```text
?family=masonry&library=Sectile%20Virtual&baseline-only&quick
```

To rerun one mutation without repeating the full suite, add focused query parameters. This example runs only Sectile's automatic-height resize at the middle of the collection:

```text
?sectile&mutations-only&mutation-mode=automatic&mutation-operation=resize&mutation-location=middle
```

Use `library` to isolate any one adapter while validating the harness itself:

```text
?library=react-window&mutations-only&mutation-mode=estimated&mutation-operation=insert&mutation-location=start&quick
```

For a long observation, run and save the baseline first, then run mutations one library at a time. Each completed library can be merged immediately, so an interruption never forces the entire suite to restart:

```text
?row-profile=uniform&baseline-only
?row-profile=heterogeneous&baseline-only
?row-profile=heterogeneous&library=Sectile%20Virtual&mutations-only
?row-profile=heterogeneous&library=TanStack%20Virtual&mutations-only
```

Keep the browser otherwise idle and run these shards sequentially. Parallel browser runs compete for the same CPU and change the timing distribution.

Merge the uniform and heterogeneous baseline shards, then commit that complete baseline observation independently:

```sh
pnpm --filter @sectile/benchmark-virtual-ecosystem merge-shards \
  /tmp/sectile-virtual-baselines.json \
  /tmp/sectile-virtual-baseline-uniform.json \
  /tmp/sectile-virtual-baseline-heterogeneous.json
node benchmarks/virtual-ecosystem/scripts/commit-results.mjs \
  --baseline-only \
  /tmp/sectile-virtual-baselines.json
```

The historical 0.11.1 baseline is stored in `results/chrome-151-macos-arm64-baseline.json`. Mutation observations remain in the matching full-suite result file, so updating initial-render measurements never rewrites them with a different source build.

Commit the four completed non-list sessions together. The command rejects missing families, mixed source fingerprints, non-standard item counts, and any Sectile correctness failure:

```sh
pnpm --filter @sectile/benchmark-virtual-ecosystem commit-layout-results \
  /tmp/sectile-flow-grid-session.json \
  /tmp/sectile-masonry-session.json \
  /tmp/sectile-track-grid-session.json \
  /tmp/sectile-spatial-session.json
```

The historical 0.11.1 layout bundle is stored in `results/chrome-151-macos-arm64-layouts.json`. `commit-results.mjs` reads that bundle when generating the documentation data and rejects it when its source fingerprint differs from the list result.

If one baseline library exceeds the browser session limit, keep all 40 recorded scrolls and split only its independent rounds. Merge the five one-round reports afterward:

```text
?row-profile=heterogeneous&library=Vue%20Virtual%20Scroller&baseline-only&baseline-rounds=1
```

Merge that focused report into the matching mutation entry while preserving every other committed result:

```sh
node benchmarks/virtual-ecosystem/scripts/commit-results.mjs --merge-mutations /tmp/sectile-virtual-benchmark.json
```

Mutation merge keys include `rowProfile`, so uniform and heterogeneous shards cannot overwrite one another.

All shards within one observation must come from the same benchmark build. Restarting the page is safe because each run keeps its own ID, but rebuilding after source changes produces a new fingerprint and requires both baseline profiles again. Mutation shards still require one shared build for the complete mutation observation.

The 0.11.1 observation committed in `results/chrome-151-macos-arm64.json` is descriptive, not a release threshold. Compare revisions on the same machine before treating a difference as a regression.
