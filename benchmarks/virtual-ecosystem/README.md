# Virtualization ecosystem benchmark

This browser benchmark compares the complete adapter and framework path for seven virtualizers:

- Sectile Virtual 0.7.0 with Vue 3.5.22
- TanStack Virtual 3.14.10 with React 19.2.8
- react-window 2.3.0 with React 19.2.8
- React Virtuoso 4.18.12 with React 19.2.8
- react-virtualized 9.22.6 with React 19.2.8
- Virtua 0.50.5 with React 19.2.8
- Vue Virtual Scroller 3.0.5 with Vue 3.5.22

## Fixed-row baseline

Every adapter receives 100,000 rows, a 720 by 480 pixel viewport, a 48 pixel row height, the same row text and CSS, and an eight-row overscan target. Each library uses its public API and recommended framework adapter.

The runner rotates library order across five rounds. Each round performs five warm-up scrolls followed by 40 recorded scrolls across the full collection. A scroll sample starts when `scrollTop` changes and ends when the expected row appears in the DOM. Initial render starts before the adapter mounts and ends after its first rows appear and one animation frame completes.

The reported values include framework and adapter work. They are not isolated layout-algorithm timings. Overscan options differ between libraries, so the result also reports the actual rendered row and DOM element counts. Dynamic measurement, collection anchoring, grids, masonry, and spatial layouts are outside this common-denominator scenario.

## Run

```sh
pnpm --filter @sectile/benchmark-virtual-ecosystem dev
```

Open the printed URL in Chrome and choose **Run benchmark**. Commit raw results only with the browser version, operating system, viewport, package versions, and conditions emitted by the page.

The observation committed in `results/chrome-151-macos-arm64.json` is descriptive, not a release threshold. Compare revisions on the same machine before treating a difference as a regression.
