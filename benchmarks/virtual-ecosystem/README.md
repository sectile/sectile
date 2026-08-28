# Virtualization ecosystem benchmark

This browser benchmark compares the complete adapter and framework path for seven virtualizers:

- Sectile Virtual 0.7.0 with Vue 3.5.22
- TanStack Virtual 3.14.10 with React 19.2.8
- react-window 2.3.0 with React 19.2.8
- React Virtuoso 4.18.12 with React 19.2.8
- react-virtualized 9.22.6 with React 19.2.8
- Virtua 0.50.5 with React 19.2.8
- Vue Virtual Scroller 3.0.5 with Vue 3.5.22

## Row profiles and height conditions

Every adapter renders the same 100,000 items in a 720 by 480 pixel viewport. The runner has two row profiles:

- `uniform`: every row is exactly 72px tall;
- `heterogeneous`: 256 deterministic content variants produce natural DOM heights, including wrapped summaries, tags, and expanded details. The application never receives or calculates per-item heights.

The heterogeneous oracle renders every content variant in a hidden calibration fixture twice. It supplies expected geometry only to the benchmark validator. Adapter and library code cannot access those measurements.

The runner separates three height-input conditions:

- `fixed`: the application supplies the exact 72px row height;
- `estimated`: the application supplies 72px as an initial estimate and the library measures the DOM;
- `automatic`: the application supplies no height or estimate and the library discovers the size from the DOM.

The uniform profile uses an exact 72px estimate. The heterogeneous profile deliberately keeps the same common 72px estimate even though actual rows differ. This exposes how each library refines an initial estimate from DOM measurements. The automatic path starts without an application estimate.

The automatic condition includes only libraries whose public API can start without application-provided size information. Unsupported libraries remain listed in the result metadata with the required input.

The runner rotates library order across five rounds. Each round performs five warm-up scrolls followed by 40 recorded scrolls across the full collection. The harness changes `scrollTop` after a frame boundary, then starts timing when the browser begins delivering the native scroll event. It reads row geometry and records the time immediately after those DOM reads. Correctness validation runs against that snapshot outside the timed interval.

Each raw scroll sample retains its round and sample number, a lower bound taken before geometry reads, a conservative upper bound taken after those reads, the probe cost between both bounds, and the number of correctness checks. The reported median and p95 use the conservative upper bound. MAD and per-round ranges remain in the result so a slow round is not hidden by the pooled median. Initial rendering reports synchronous setup, first row output, and the first correct viewport layout.

The reported values include framework and adapter work. They are not isolated layout-algorithm timings. Raw results retain rendered-row and DOM-element counts as diagnostics; the documentation chart does not use them as performance scores.

Mutation timings cover insertion, movement, removal, and content-driven height changes at the start, middle, and end of the collection. Every scenario plans 50 samples across five independent mounts. Each mount performs ten measured mutations and restores a verified initial collection between samples. A failed restore discards that instance and starts a new one. Before timing starts, the harness uses the calibrated fixture layout and visible DOM rows to place the target row without supplying those heights to the library. A target that still cannot be reached after 32 frame-by-frame corrections is a hard failure. Once a mutation becomes visible in the DOM, every frame is checked for row order, geometry, viewport coverage, and scroll anchoring. Uniform rows also require an exact total scroll height. Heterogeneous rows record total-height estimation error separately because unseen DOM has no measured height yet. A sample that recovers keeps both the time to its first correct frame and a transient-failure record. Recovery within 200ms is responsive, while recovery from 200ms through 500ms is recorded as slow. A sample that has not reached a correct frame within 500ms is a hard failure. An incorrect layout that remains identical for at least 300ms and eight consecutive frames can fail earlier. When the same hard-failure code set occurs in all ten samples of two consecutive independent rounds, the runner records the 20 executed samples and stops the remaining 30 as a reproducible failure.

Initial-render failures are recorded per round and do not abort the remaining libraries. The same stable-failure rule shortens a layout that has stopped changing, while a layout that is still converging keeps the full recovery window.

## Run

```sh
pnpm --filter @sectile/benchmark-virtual-ecosystem dev
```

Open the printed URL in Chrome and choose **Run benchmark**. Commit raw results only with the browser version, operating system, viewport, package versions, and conditions emitted by the page.

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

If one baseline library exceeds the browser session limit, keep all 40 recorded scrolls and split only its independent rounds. Merge the five one-round reports afterward:

```text
?row-profile=heterogeneous&library=Vue%20Virtual%20Scroller&baseline-only&baseline-rounds=1
```

Merge that focused report into the matching mutation entry while preserving every other committed result:

```sh
node benchmarks/virtual-ecosystem/scripts/commit-results.mjs --merge-mutations /tmp/sectile-virtual-benchmark.json
```

Merge a baseline profile independently with:

```sh
node benchmarks/virtual-ecosystem/scripts/commit-results.mjs --merge-baseline /tmp/sectile-virtual-benchmark.json
```

Both merge modes include `rowProfile` in their result key, so uniform and heterogeneous shards cannot overwrite one another.

The observation committed in `results/chrome-151-macos-arm64.json` is descriptive, not a release threshold. Compare revisions on the same machine before treating a difference as a regression.
