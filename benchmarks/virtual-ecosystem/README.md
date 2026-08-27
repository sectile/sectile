# Virtualization ecosystem benchmark

This browser benchmark compares the complete adapter and framework path for seven virtualizers:

- Sectile Virtual 0.7.0 with Vue 3.5.22
- TanStack Virtual 3.14.10 with React 19.2.8
- react-window 2.3.0 with React 19.2.8
- React Virtuoso 4.18.12 with React 19.2.8
- react-virtualized 9.22.6 with React 19.2.8
- Virtua 0.50.5 with React 19.2.8
- Vue Virtual Scroller 3.0.5 with Vue 3.5.22

## Height conditions

Every adapter renders the same 100,000 rows in a 720 by 480 pixel viewport with the same row text and CSS. The runner separates three conditions:

- `fixed`: the application supplies the exact 48px row height;
- `estimated`: the application supplies 48px as an initial estimate and the library measures the DOM;
- `automatic`: the application supplies no height or estimate and the library discovers the size from the DOM.

The automatic condition includes only libraries whose public API can start without application-provided size information. Unsupported libraries remain listed in the result metadata with the required input.

The runner rotates library order across five rounds. Each round performs five warm-up scrolls followed by 40 recorded scrolls across the full collection. The harness changes `scrollTop` after a frame boundary, then starts timing when the browser begins delivering the native scroll event. It reads row geometry and records the time immediately after those DOM reads. Correctness validation runs against that snapshot outside the timed interval.

Each raw scroll sample retains its round and sample number, a lower bound taken before geometry reads, a conservative upper bound taken after those reads, the probe cost between both bounds, and the number of correctness checks. The reported median and p95 use the conservative upper bound. MAD and per-round ranges remain in the result so a slow round is not hidden by the pooled median. Initial rendering reports synchronous setup, first row output, and the first correct viewport layout.

The reported values include framework and adapter work. They are not isolated layout-algorithm timings. Raw results retain rendered-row and DOM-element counts as diagnostics; the documentation chart does not use them as performance scores.

Mutation timings cover insertion, movement, removal, and height changes at the start, middle, and end of the collection. Every scenario runs 50 times. Once a mutation becomes visible in the DOM, every frame is checked for row order, geometry, total height, viewport coverage, and scroll anchoring. A sample that recovers keeps both the time to its first correct frame and a transient-failure record. A sample that does not recover within two seconds is a hard failure.

## Run

```sh
pnpm --filter @sectile/benchmark-virtual-ecosystem dev
```

Open the printed URL in Chrome and choose **Run benchmark**. Commit raw results only with the browser version, operating system, viewport, package versions, and conditions emitted by the page.

To rerun one mutation without repeating the full suite, add focused query parameters. This example runs only Sectile's automatic-height resize at the middle of the collection:

```text
?sectile&mutations-only&mutation-mode=automatic&mutation-operation=resize&mutation-location=middle
```

Merge that focused report into the matching mutation entry while preserving every other committed result:

```sh
node benchmarks/virtual-ecosystem/scripts/commit-results.mjs --merge-mutations /tmp/sectile-virtual-benchmark.json
```

The observation committed in `results/chrome-151-macos-arm64.json` is descriptive, not a release threshold. Compare revisions on the same machine before treating a difference as a regression.
