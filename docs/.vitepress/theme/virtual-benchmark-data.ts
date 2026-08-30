export type BenchmarkOperation = 'insert' | 'move' | 'remove' | 'resize';
export type BenchmarkLocation = 'start' | 'middle' | 'end';
export type BenchmarkHeightMode = 'fixed' | 'estimated' | 'automatic';
export type BenchmarkRowProfile = 'uniform' | 'heterogeneous';
export type BenchmarkFamily = 'list' | 'flow-grid' | 'masonry' | 'track-grid' | 'spatial';
export type LayoutBenchmarkMode = BenchmarkHeightMode | 'positioned';

export interface LayoutBaselineBenchmarkResult {
  readonly runIds: readonly string[];
  readonly family: Exclude<BenchmarkFamily, 'list'>;
  readonly mode: LayoutBenchmarkMode;
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly setupMs: number;
  readonly firstItemsMs: number;
  readonly stableLayoutMs: number;
  readonly scrollMedianMs: number;
  readonly scrollP95Ms: number;
  readonly scrollMadMs: number;
  readonly scrollSampleCount: number;
  readonly completedRounds: number;
  readonly plannedRounds: number;
  readonly renderedItems: number;
  readonly domElements: number;
}

export interface LayoutBaselineBenchmarkFailure {
  readonly runIds: readonly string[];
  readonly family: Exclude<BenchmarkFamily, 'list'>;
  readonly mode: LayoutBenchmarkMode;
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly round: number;
  readonly message: string;
}

export interface LayoutMutationBenchmarkResult {
  readonly runIds: readonly string[];
  readonly family: Exclude<BenchmarkFamily, 'list'>;
  readonly mode: LayoutBenchmarkMode;
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly operation: BenchmarkOperation;
  readonly location: BenchmarkLocation;
  readonly medianMs: number | null;
  readonly medianLowerBoundMs: number | null;
  readonly p95Ms: number | null;
  readonly probeMedianMs: number | null;
  readonly samples: number;
  readonly failedSamples: number;
  readonly failureCodes: readonly string[];
  readonly plannedSamples: number;
  readonly earlyStopped: boolean;
  readonly earlyStopReason: 'interactive-budget' | 'reproducible-failure' | 'stable-statistics' | null;
}

export interface BaselineBenchmarkResult {
  readonly runIds: readonly string[];
  readonly rowProfile: BenchmarkRowProfile;
  readonly mode: BenchmarkHeightMode;
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly firstInstanceSetupMs?: number;
  readonly firstInstanceFirstRowsMs?: number;
  readonly firstInstanceLayoutReadyMs?: number;
  readonly firstInstancePresentationReadyMs?: number;
  readonly setupMs: number;
  readonly firstRowsMs: number;
  readonly mountMs: number;
  readonly initialTotalHeightErrorPercent: number;
  readonly scrollTotalHeightErrorMedianPercent: number;
  readonly scrollTotalHeightErrorP95Percent: number;
  readonly scrollMedianMs: number;
  readonly scrollMedianLowerBoundMs: number;
  readonly scrollP95Ms: number;
  readonly scrollMadMs: number;
  readonly scrollProbeMedianMs: number;
  readonly scrollChecksMedian: number;
  readonly scrollSampleCount: number;
  readonly scrollRoundMedianRangeMs: readonly [number, number];
  readonly scrollRoundP95RangeMs: readonly [number, number];
  readonly completedRounds: number;
  readonly plannedRounds: number;
  readonly earlyStopReason: 'stable-statistics' | null;
}

export interface BaselineBenchmarkFailure {
  readonly runIds: readonly string[];
  readonly rowProfile: BenchmarkRowProfile;
  readonly mode: BenchmarkHeightMode;
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly failedRounds: number;
  readonly totalRounds: number;
  readonly message: string;
}

export interface MutationBenchmarkResult {
  readonly runIds?: readonly string[];
  readonly rowProfile: BenchmarkRowProfile;
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly sizeMode: Exclude<BenchmarkHeightMode, 'fixed'>;
  readonly operation: BenchmarkOperation;
  readonly location: BenchmarkLocation;
  readonly medianMs: number | null;
  readonly p95Ms: number | null;
  readonly recoveryMedianMs: number | null;
  readonly recoveryP95Ms: number | null;
  readonly slowTailMs: readonly number[];
  readonly settledSamples: number;
  readonly correctSamples: number;
  readonly recoveredSamples: number;
  readonly failedSamples: number;
  readonly totalSamples: number;
  readonly plannedSamples?: number;
  readonly earlyStopped?: boolean;
  readonly earlyStopReason?: 'interactive-budget' | 'reproducible-failure' | 'stable-statistics' | null;
  readonly heightHandling: {
    readonly sizeInput: 'dom-measurement' | 'application-size';
    readonly initialEstimate: boolean;
    readonly resizeNotification: 'automatic' | 'dependency-signal' | 'cache-invalidation';
    readonly applicationCalculatesHeight: boolean;
  };
  readonly failureCodes: readonly string[];
}

export interface HeightModeSupport {
  readonly library: string;
  readonly fixed: true;
  readonly estimated: true;
  readonly automatic: boolean;
  readonly automaticNote: string;
}

export interface BenchmarkRowProfileConditions {
  readonly commonEstimateHeight: number;
  readonly contentCorpusVersion: number;
  readonly contentVariants: number;
  readonly heightDistribution: {
    readonly minimum: number;
    readonly median: number;
    readonly p95: number;
    readonly maximum: number;
    readonly distinct: number;
  };
}

export interface BenchmarkSource {
  readonly gitCommit: string;
  readonly gitDirty: boolean;
  readonly buildFingerprint: string;
}

export interface BenchmarkRunMetadata {
  readonly id: string;
  readonly observedAt: string;
  readonly completedAt: string;
  readonly durationMs: number;
  readonly source: BenchmarkSource;
}

// Generated by benchmarks/virtual-ecosystem/scripts/commit-results.mjs.
export const baselineBenchmarkResults: readonly BaselineBenchmarkResult[] = Object.freeze([
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "setupMs": 9.1,
    "firstRowsMs": 9.1,
    "mountMs": 10,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 1.2,
    "scrollMedianLowerBoundMs": 0.6,
    "scrollP95Ms": 1.6,
    "scrollMadMs": 0.1,
    "scrollProbeMedianMs": 0.5,
    "scrollChecksMedian": 3,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      1.1,
      1.2
    ],
    "scrollRoundP95RangeMs": [
      1.2,
      1.8
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "mode": "fixed",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "setupMs": 5.3,
    "firstRowsMs": 5.3,
    "mountMs": 6.5,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 1.2,
    "scrollMedianLowerBoundMs": 0.6,
    "scrollP95Ms": 2.6,
    "scrollMadMs": 0.2,
    "scrollProbeMedianMs": 0.6,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 80,
    "scrollRoundMedianRangeMs": [
      1,
      2.3
    ],
    "scrollRoundP95RangeMs": [
      1.2,
      3.1
    ],
    "completedRounds": 4,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "mode": "fixed",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "setupMs": 1.1,
    "firstRowsMs": 1.1,
    "mountMs": 1.9,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 3.6,
    "scrollMedianLowerBoundMs": 3.1,
    "scrollP95Ms": 5.8,
    "scrollMadMs": 1.2,
    "scrollProbeMedianMs": 0.5,
    "scrollChecksMedian": 3,
    "scrollSampleCount": 80,
    "scrollRoundMedianRangeMs": [
      3.3,
      4.4
    ],
    "scrollRoundP95RangeMs": [
      4.9,
      6
    ],
    "completedRounds": 4,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "mode": "fixed",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "setupMs": 0.9,
    "firstRowsMs": 12.4,
    "mountMs": 14,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 1.2,
    "scrollMedianLowerBoundMs": 0.7,
    "scrollP95Ms": 2.5,
    "scrollMadMs": 0.2,
    "scrollProbeMedianMs": 0.5,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 80,
    "scrollRoundMedianRangeMs": [
      1,
      1.4
    ],
    "scrollRoundP95RangeMs": [
      1.4,
      2.8
    ],
    "completedRounds": 4,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "mode": "fixed",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "setupMs": 1.1,
    "firstRowsMs": 1.1,
    "mountMs": 2.1,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 1.1,
    "scrollMedianLowerBoundMs": 0.7,
    "scrollP95Ms": 2.9,
    "scrollMadMs": 0.2,
    "scrollProbeMedianMs": 0.5,
    "scrollChecksMedian": 3,
    "scrollSampleCount": 80,
    "scrollRoundMedianRangeMs": [
      1,
      2.4
    ],
    "scrollRoundP95RangeMs": [
      1.2,
      3.4
    ],
    "completedRounds": 4,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "mode": "fixed",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "setupMs": 1.1,
    "firstRowsMs": 5.5,
    "mountMs": 6.7,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 0.9,
    "scrollMedianLowerBoundMs": 0.5,
    "scrollP95Ms": 2.2,
    "scrollMadMs": 0.1,
    "scrollProbeMedianMs": 0.4,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      0.8,
      1.4
    ],
    "scrollRoundP95RangeMs": [
      0.9,
      2.2
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "mode": "fixed",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "setupMs": 11.2,
    "firstRowsMs": 11.8,
    "mountMs": 13.9,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 1.7,
    "scrollMedianLowerBoundMs": 1.3,
    "scrollP95Ms": 3.5,
    "scrollMadMs": 0.4,
    "scrollProbeMedianMs": 0.4,
    "scrollChecksMedian": 3,
    "scrollSampleCount": 100,
    "scrollRoundMedianRangeMs": [
      1.2,
      2.4
    ],
    "scrollRoundP95RangeMs": [
      1.7,
      3.6
    ],
    "completedRounds": 5,
    "plannedRounds": 5,
    "earlyStopReason": null
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "setupMs": 16.2,
    "firstRowsMs": 16.2,
    "mountMs": 17.8,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 1.7,
    "scrollMedianLowerBoundMs": 1.6,
    "scrollP95Ms": 3.5,
    "scrollMadMs": 0.3,
    "scrollProbeMedianMs": 0.1,
    "scrollChecksMedian": 3,
    "scrollSampleCount": 100,
    "scrollRoundMedianRangeMs": [
      1.4,
      1.9
    ],
    "scrollRoundP95RangeMs": [
      1.8,
      3.8
    ],
    "completedRounds": 5,
    "plannedRounds": 5,
    "earlyStopReason": null
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "mode": "estimated",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "setupMs": 15.3,
    "firstRowsMs": 15.3,
    "mountMs": 17.1,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 2.9,
    "scrollMedianLowerBoundMs": 2.4,
    "scrollP95Ms": 4.1,
    "scrollMadMs": 0.3,
    "scrollProbeMedianMs": 0.5,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 80,
    "scrollRoundMedianRangeMs": [
      2.6,
      3.1
    ],
    "scrollRoundP95RangeMs": [
      3.9,
      4.1
    ],
    "completedRounds": 4,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "mode": "estimated",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "setupMs": 1.3,
    "firstRowsMs": 1.3,
    "mountMs": 2.6,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 3.7,
    "scrollMedianLowerBoundMs": 3.2,
    "scrollP95Ms": 6,
    "scrollMadMs": 1,
    "scrollProbeMedianMs": 0.6,
    "scrollChecksMedian": 3,
    "scrollSampleCount": 80,
    "scrollRoundMedianRangeMs": [
      3.1,
      4
    ],
    "scrollRoundP95RangeMs": [
      4.5,
      6.6
    ],
    "completedRounds": 4,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "mode": "estimated",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "setupMs": 0.9,
    "firstRowsMs": 12,
    "mountMs": 13.3,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 1.1,
    "scrollMedianLowerBoundMs": 0.6,
    "scrollP95Ms": 1.4,
    "scrollMadMs": 0.1,
    "scrollProbeMedianMs": 0.5,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 80,
    "scrollRoundMedianRangeMs": [
      0.9,
      1.2
    ],
    "scrollRoundP95RangeMs": [
      1,
      1.5
    ],
    "completedRounds": 4,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "mode": "estimated",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "setupMs": 1.9,
    "firstRowsMs": 1.9,
    "mountMs": 3,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 3.7,
    "scrollMedianLowerBoundMs": 3.7,
    "scrollP95Ms": 6.1,
    "scrollMadMs": 1.6,
    "scrollProbeMedianMs": 0,
    "scrollChecksMedian": 3,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      3.5,
      3.9
    ],
    "scrollRoundP95RangeMs": [
      5.6,
      6.4
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "mode": "estimated",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "setupMs": 2.9,
    "firstRowsMs": 5.2,
    "mountMs": 6.8,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 1,
    "scrollMedianLowerBoundMs": 0.6,
    "scrollP95Ms": 2.4,
    "scrollMadMs": 0.1,
    "scrollProbeMedianMs": 0.4,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 100,
    "scrollRoundMedianRangeMs": [
      0.9,
      1.2
    ],
    "scrollRoundP95RangeMs": [
      1.1,
      2.6
    ],
    "completedRounds": 5,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "setupMs": 15.8,
    "firstRowsMs": 16.2,
    "mountMs": 18.7,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 1.4,
    "scrollMedianLowerBoundMs": 1.3,
    "scrollP95Ms": 2.5,
    "scrollMadMs": 0.2,
    "scrollProbeMedianMs": 0.1,
    "scrollChecksMedian": 3,
    "scrollSampleCount": 80,
    "scrollRoundMedianRangeMs": [
      1.2,
      1.8
    ],
    "scrollRoundP95RangeMs": [
      1.4,
      2.7
    ],
    "completedRounds": 4,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "mode": "automatic",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "setupMs": 1.1,
    "firstRowsMs": 12.8,
    "mountMs": 15,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 1.5,
    "scrollMedianLowerBoundMs": 0.8,
    "scrollP95Ms": 2.8,
    "scrollMadMs": 0.3,
    "scrollProbeMedianMs": 0.6,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 100,
    "scrollRoundMedianRangeMs": [
      1.1,
      1.7
    ],
    "scrollRoundP95RangeMs": [
      2,
      3.3
    ],
    "completedRounds": 5,
    "plannedRounds": 5,
    "earlyStopReason": null
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "mode": "automatic",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "setupMs": 3,
    "firstRowsMs": 7.5,
    "mountMs": 13.3,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 0.9,
    "scrollMedianLowerBoundMs": 0.5,
    "scrollP95Ms": 1.2,
    "scrollMadMs": 0.1,
    "scrollProbeMedianMs": 0.4,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 80,
    "scrollRoundMedianRangeMs": [
      0.8,
      1
    ],
    "scrollRoundP95RangeMs": [
      1,
      1.2
    ],
    "completedRounds": 4,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "setupMs": 8.8,
    "firstRowsMs": 8.9,
    "mountMs": 18.1,
    "initialTotalHeightErrorPercent": 40.002,
    "scrollTotalHeightErrorMedianPercent": 39.852,
    "scrollTotalHeightErrorP95Percent": 39.936,
    "scrollMedianMs": 2.9,
    "scrollMedianLowerBoundMs": 2.8,
    "scrollP95Ms": 3.9,
    "scrollMadMs": 0.3,
    "scrollProbeMedianMs": 0.1,
    "scrollChecksMedian": 4,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      2.7,
      3.4
    ],
    "scrollRoundP95RangeMs": [
      3.4,
      4
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "mode": "estimated",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "setupMs": 19.1,
    "firstRowsMs": 19.1,
    "mountMs": 27.4,
    "initialTotalHeightErrorPercent": 40.002,
    "scrollTotalHeightErrorMedianPercent": 39.852,
    "scrollTotalHeightErrorP95Percent": 39.936,
    "scrollMedianMs": 33.2,
    "scrollMedianLowerBoundMs": 33.1,
    "scrollP95Ms": 94.1,
    "scrollMadMs": 3.5,
    "scrollProbeMedianMs": 0.1,
    "scrollChecksMedian": 5,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      30.1,
      91.9
    ],
    "scrollRoundP95RangeMs": [
      34,
      94.5
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "mode": "estimated",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "setupMs": 2.1,
    "firstRowsMs": 2.1,
    "mountMs": 13.7,
    "initialTotalHeightErrorPercent": 1.153,
    "scrollTotalHeightErrorMedianPercent": 39.761,
    "scrollTotalHeightErrorP95Percent": 39.907,
    "scrollMedianMs": 146.2,
    "scrollMedianLowerBoundMs": 146.1,
    "scrollP95Ms": 202.4,
    "scrollMadMs": 9.5,
    "scrollProbeMedianMs": 0.1,
    "scrollChecksMedian": 9,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      143,
      151.5
    ],
    "scrollRoundP95RangeMs": [
      176.7,
      211
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "mode": "estimated",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "setupMs": 0.8,
    "firstRowsMs": 17.5,
    "mountMs": 29.9,
    "initialTotalHeightErrorPercent": 40.002,
    "scrollTotalHeightErrorMedianPercent": 39.852,
    "scrollTotalHeightErrorP95Percent": 39.936,
    "scrollMedianMs": 2.1,
    "scrollMedianLowerBoundMs": 0.7,
    "scrollP95Ms": 2.7,
    "scrollMadMs": 0.3,
    "scrollProbeMedianMs": 1.3,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      2,
      2.2
    ],
    "scrollRoundP95RangeMs": [
      2.6,
      3
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "mode": "estimated",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "setupMs": 2.9,
    "firstRowsMs": 2.9,
    "mountMs": 13.2,
    "initialTotalHeightErrorPercent": 40.003,
    "scrollTotalHeightErrorMedianPercent": 39.938,
    "scrollTotalHeightErrorP95Percent": 39.978,
    "scrollMedianMs": 5,
    "scrollMedianLowerBoundMs": 5,
    "scrollP95Ms": 9.4,
    "scrollMadMs": 1.1,
    "scrollProbeMedianMs": 0,
    "scrollChecksMedian": 3,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      4.7,
      6.8
    ],
    "scrollRoundP95RangeMs": [
      6.3,
      9.9
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "mode": "estimated",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "setupMs": 1.8,
    "firstRowsMs": 4.7,
    "mountMs": 20.1,
    "initialTotalHeightErrorPercent": 40.002,
    "scrollTotalHeightErrorMedianPercent": 39.904,
    "scrollTotalHeightErrorP95Percent": 39.957,
    "scrollMedianMs": 2.5,
    "scrollMedianLowerBoundMs": 2.5,
    "scrollP95Ms": 4.2,
    "scrollMadMs": 0.4,
    "scrollProbeMedianMs": 0,
    "scrollChecksMedian": 4,
    "scrollSampleCount": 100,
    "scrollRoundMedianRangeMs": [
      2.3,
      3.3
    ],
    "scrollRoundP95RangeMs": [
      2.5,
      5.7
    ],
    "completedRounds": 5,
    "plannedRounds": 5,
    "earlyStopReason": null
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "setupMs": 10.4,
    "firstRowsMs": 11.1,
    "mountMs": 20.4,
    "initialTotalHeightErrorPercent": 3.967,
    "scrollTotalHeightErrorMedianPercent": 3.955,
    "scrollTotalHeightErrorP95Percent": 3.963,
    "scrollMedianMs": 2.2,
    "scrollMedianLowerBoundMs": 2.2,
    "scrollP95Ms": 3.8,
    "scrollMadMs": 0.2,
    "scrollProbeMedianMs": 0.1,
    "scrollChecksMedian": 4,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      2.2,
      2.8
    ],
    "scrollRoundP95RangeMs": [
      2.6,
      3.9
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "mode": "automatic",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "setupMs": 1.1,
    "firstRowsMs": 11.4,
    "mountMs": 26,
    "initialTotalHeightErrorPercent": 0.847,
    "scrollTotalHeightErrorMedianPercent": 0.846,
    "scrollTotalHeightErrorP95Percent": 0.848,
    "scrollMedianMs": 1.9,
    "scrollMedianLowerBoundMs": 0.9,
    "scrollP95Ms": 2.9,
    "scrollMadMs": 0.2,
    "scrollProbeMedianMs": 1,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      1.8,
      2.3
    ],
    "scrollRoundP95RangeMs": [
      1.9,
      3
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "mode": "automatic",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "setupMs": 4.3,
    "firstRowsMs": 6.1,
    "mountMs": 25.2,
    "initialTotalHeightErrorPercent": 0.847,
    "scrollTotalHeightErrorMedianPercent": 0.847,
    "scrollTotalHeightErrorP95Percent": 0.848,
    "scrollMedianMs": 2.2,
    "scrollMedianLowerBoundMs": 2.1,
    "scrollP95Ms": 8.8,
    "scrollMadMs": 0.4,
    "scrollProbeMedianMs": 0,
    "scrollChecksMedian": 4,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      2.1,
      2.7
    ],
    "scrollRoundP95RangeMs": [
      8.6,
      8.9
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  }
]);

export const baselineBenchmarkFailures: readonly BaselineBenchmarkFailure[] = Object.freeze([
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "mode": "estimated",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "failedRounds": 1,
    "totalRounds": 5,
    "message": "Interactive runner stopped Vue Virtual Scroller after a 541.1ms scroll exceeded the 250ms responsiveness budget."
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "mode": "estimated",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "failedRounds": 1,
    "totalRounds": 5,
    "message": "Interactive runner stopped Vue Virtual Scroller after a 1505.8ms scroll exceeded the 250ms responsiveness budget."
  }
]);

export const mutationBenchmarkResults: readonly MutationBenchmarkResult[] = Object.freeze([
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "start",
    "medianMs": 2.2,
    "p95Ms": 5.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      11.8
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 2.3,
    "p95Ms": 4.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.6
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 2.1,
    "p95Ms": 5.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.6
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "start",
    "medianMs": 2.1,
    "p95Ms": 2.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2.8
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 2,
    "p95Ms": 4.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4.9
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 1.9,
    "p95Ms": 4.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4.9
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 2,
    "p95Ms": 4.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 2.1,
    "p95Ms": 5.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.6
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 1.7,
    "p95Ms": 2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2.5,
      2.9
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 1.4,
    "p95Ms": 3.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4.5
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 1.5,
    "p95Ms": 3.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 1.3,
    "p95Ms": 3.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4.6,
      4.6
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 2.7,
    "p95Ms": 3.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4.4
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 2.6,
    "p95Ms": 3.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      6.5
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 2.6,
    "p95Ms": 5.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      7.2
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 2.6,
    "p95Ms": 4.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.8
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 2.7,
    "p95Ms": 5.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.8
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 2.6,
    "p95Ms": 3.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      6
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 4.2,
    "p95Ms": 4.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4.7
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 2,
    "p95Ms": 2.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 2,
    "p95Ms": 2.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2.6
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 2,
    "p95Ms": 2.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2.4
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 6,
    "p95Ms": 9.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      14.2
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 11.5,
    "p95Ms": 13.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      13.9
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 5.7,
    "p95Ms": 9.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      11.1
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 11.1,
    "p95Ms": 13.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      13.6
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 1,
    "p95Ms": 1.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      3.7
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 5.8,
    "p95Ms": 8.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.9
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 11.6,
    "p95Ms": 59.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      73,
      105.5
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 0.4,
    "p95Ms": 6.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      14.8,
      18.5
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 5.3,
    "p95Ms": 8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.5
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 10.8,
    "p95Ms": 127.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      180,
      387.1
    ],
    "settledSamples": 44,
    "correctSamples": 44,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 44,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 1.1,
    "p95Ms": 16.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      20.4,
      47.3
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 0.9,
    "p95Ms": 1.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4.3
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 1,
    "p95Ms": 4.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.2,
      8.5
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 1,
    "p95Ms": 8.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      25.8,
      26.3
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 1,
    "p95Ms": 3.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      3.6
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 1,
    "p95Ms": 1.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      3.2
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 1.1,
    "p95Ms": 1.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1.5
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 0.5,
    "p95Ms": 0.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1.5
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 0.6,
    "p95Ms": 9.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      11.9,
      13.1
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 0.6,
    "p95Ms": 5.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.7,
      7
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 4.5,
    "p95Ms": 6.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      6.9
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 5,
    "p95Ms": 7.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      7.9
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 1.4,
    "p95Ms": 1.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 1.2,
    "p95Ms": 8.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10.3,
      25.1
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 1.6,
    "p95Ms": 13.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      14.2,
      17.3
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 4.5,
    "p95Ms": 6.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      7.2
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 5.7,
    "p95Ms": 8.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.9
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 1.4,
    "p95Ms": 13.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      13.7,
      16.1
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 1.5,
    "p95Ms": 4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4.9
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 1,
    "p95Ms": 1.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "start",
    "medianMs": 1.3,
    "p95Ms": 1.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      3.1
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 0.9,
    "p95Ms": 1.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1.3
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 1,
    "p95Ms": 6.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      7.6,
      9.4
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 0.7,
    "p95Ms": 1.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1.8
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 0.7,
    "p95Ms": 5.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      12.1,
      17.5
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 1.2,
    "p95Ms": 2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2.9
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 0.8,
    "p95Ms": 1.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 4.6,
    "p95Ms": 11.7,
    "recoveryMedianMs": 4.6,
    "recoveryP95Ms": 11.7,
    "slowTailMs": [
      12.8,
      55.5
    ],
    "settledSamples": 50,
    "correctSamples": 0,
    "recoveredSamples": 50,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "blank-viewport"
    ]
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 0.3,
    "p95Ms": 0.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      0.7
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 0.4,
    "p95Ms": 4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      14,
      19.3
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 0.3,
    "p95Ms": 0.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2.6
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "start",
    "medianMs": 1138.7,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 1,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 1762.6,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 1,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 2181.8,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 1,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "start",
    "medianMs": 657,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 1,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 1540.9,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 1,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 1264.8,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 1,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 1314.1,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 1,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 2025.5,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 1,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 1888.6,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 1,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 622,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 1,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 1152.6,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 1,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 1200.9,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 1,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "start",
    "medianMs": 2.3,
    "p95Ms": 9.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      13.5,
      74.6
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "middle",
    "medianMs": 2.6,
    "p95Ms": 9.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.4,
      11.1
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "end",
    "medianMs": 2.3,
    "p95Ms": 6.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      7.3,
      10.2
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "start",
    "medianMs": 2.1,
    "p95Ms": 2.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.4
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "middle",
    "medianMs": 2.1,
    "p95Ms": 4.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4.7
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "end",
    "medianMs": 2,
    "p95Ms": 5.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.9
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "start",
    "medianMs": 2.1,
    "p95Ms": 5.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.6
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "middle",
    "medianMs": 2.3,
    "p95Ms": 6.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      7.8
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "end",
    "medianMs": 1.9,
    "p95Ms": 2.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      3
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "start",
    "medianMs": 1.6,
    "p95Ms": 8.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9,
      11.1
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "middle",
    "medianMs": 1.5,
    "p95Ms": 4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      6,
      7.8
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "end",
    "medianMs": 1.4,
    "p95Ms": 5.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.5,
      5.6
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "middle",
    "medianMs": 0.9,
    "p95Ms": 5.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      7.2,
      9.6
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "end",
    "medianMs": 1,
    "p95Ms": 3.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      3.9,
      3.9
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "middle",
    "medianMs": 1,
    "p95Ms": 2.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2.9,
      3
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "end",
    "medianMs": 0.9,
    "p95Ms": 3.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4.3,
      4.9
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "start",
    "medianMs": 1,
    "p95Ms": 3.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.8,
      10.3
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "middle",
    "medianMs": 1,
    "p95Ms": 2.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      3.1,
      4.8
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "end",
    "medianMs": 1.2,
    "p95Ms": 3.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4.3,
      5.2
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "start",
    "medianMs": 0.5,
    "p95Ms": 1.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      6.9,
      13.9
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "middle",
    "medianMs": 0.5,
    "p95Ms": 2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      3.1,
      3.3
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "end",
    "medianMs": 0.4,
    "p95Ms": 1.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2.1,
      2.2
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "start",
    "medianMs": 1.2,
    "p95Ms": 1.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4.2
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "middle",
    "medianMs": 0.9,
    "p95Ms": 1.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "end",
    "medianMs": 1,
    "p95Ms": 1.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1.7
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "middle",
    "medianMs": 0.7,
    "p95Ms": 1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4.5
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "end",
    "medianMs": 0.7,
    "p95Ms": 0.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2.4
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "start",
    "medianMs": 1.2,
    "p95Ms": 1.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "middle",
    "medianMs": 0.9,
    "p95Ms": 1.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1.3
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "end",
    "medianMs": 4.5,
    "p95Ms": 5.6,
    "recoveryMedianMs": 4.5,
    "recoveryP95Ms": 5.6,
    "slowTailMs": [
      5.8,
      5.9
    ],
    "settledSamples": 50,
    "correctSamples": 0,
    "recoveredSamples": 50,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "blank-viewport"
    ]
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "start",
    "medianMs": 0.3,
    "p95Ms": 0.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "middle",
    "medianMs": 0.3,
    "p95Ms": 0.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      0.7,
      0.7
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "37185643-196c-428f-b4a2-5fd11f9e53fc"
    ],
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "end",
    "medianMs": 0.3,
    "p95Ms": 0.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      0.7
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "start",
    "medianMs": 2.4,
    "p95Ms": 5.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.9
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 2.6,
    "p95Ms": 6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      6.2,
      6.7
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 2.3,
    "p95Ms": 6.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      7.4
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "start",
    "medianMs": 2.2,
    "p95Ms": 2.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2.6
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 2.2,
    "p95Ms": 5.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 2,
    "p95Ms": 5.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.6
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 2.1,
    "p95Ms": 5.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.9,
      6.4
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 2.4,
    "p95Ms": 5.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      6.5
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 1.7,
    "p95Ms": 2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 2,
    "p95Ms": 5.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.4
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 2,
    "p95Ms": 5.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.3,
      5.4
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 1.9,
    "p95Ms": 5.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.4,
      5.5
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 3.6,
    "p95Ms": 6.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      7
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 3.2,
    "p95Ms": 6.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      6.5,
      6.8
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 3.3,
    "p95Ms": 4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.6,
      6.8
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 3.3,
    "p95Ms": 5.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      7.7,
      7.8
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 3.4,
    "p95Ms": 6.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      7.2
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 3.4,
    "p95Ms": 3.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4,
      4
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 5.1,
    "p95Ms": 5.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.7,
      5.8
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 5.9,
    "p95Ms": 6.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      7.3
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 5.8,
    "p95Ms": 6.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      7,
      12.4
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 5.2,
    "p95Ms": 6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10.8
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "row-overlap",
      "row-gap",
      "blank-viewport",
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "row-gap",
      "row-overlap"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 29.3,
    "p95Ms": 34.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      44.3
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 5.9,
    "p95Ms": 7.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.2
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "row-overlap"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "row-gap",
      "row-overlap",
      "blank-viewport"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "row-overlap",
      "row-gap"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 11.6,
    "p95Ms": 16.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      44.4
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 1,
    "p95Ms": 1.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      3.8
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 13.6,
    "p95Ms": 18.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      27.7
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 29.6,
    "p95Ms": 49,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      122.7
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 1.2,
    "p95Ms": 2.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2.4
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 1.1,
    "p95Ms": 1.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2.1,
      2.7
    ],
    "settledSamples": 44,
    "correctSamples": 44,
    "recoveredSamples": 0,
    "failedSamples": 6,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "target-position"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 1,
    "p95Ms": 1.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      3.6,
      3.9
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 0.9,
    "p95Ms": 4.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.8
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 1.1,
    "p95Ms": 2.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      3.2
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 1.2,
    "p95Ms": 1.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 1.3,
    "p95Ms": 5.2,
    "recoveryMedianMs": 4.6,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.4,
      8.1
    ],
    "settledSamples": 44,
    "correctSamples": 38,
    "recoveredSamples": 6,
    "failedSamples": 6,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "target-position",
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 0.9,
    "p95Ms": 1.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.3
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 1,
    "p95Ms": 1.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 0.9,
    "p95Ms": 1.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1.4,
      1.5
    ],
    "settledSamples": 42,
    "correctSamples": 42,
    "recoveredSamples": 0,
    "failedSamples": 8,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "target-position",
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 5.7,
    "p95Ms": 8.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.7
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 5.8,
    "p95Ms": 9.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      15,
      20.7
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 1.6,
    "p95Ms": 4.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.1
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 1.8,
    "p95Ms": 4.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.5,
      5.6
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 2.3,
    "p95Ms": 4.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.5
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 5.5,
    "p95Ms": 12.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      13
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 2,
    "p95Ms": 7.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.3
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 1.8,
    "p95Ms": 4.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4.9,
      6.2
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 1.4,
    "p95Ms": 5.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      6.2
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 1.2,
    "p95Ms": 3.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4.3,
      5.6
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 0.9,
    "p95Ms": 4.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 136.2,
    "p95Ms": 138.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      139
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 1.6,
    "p95Ms": 2.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2.7,
      3.1
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 1.3,
    "p95Ms": 2.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2.8
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 5.2,
    "p95Ms": 14.1,
    "recoveryMedianMs": 5.2,
    "recoveryP95Ms": 14.1,
    "slowTailMs": [
      14.7,
      15
    ],
    "settledSamples": 50,
    "correctSamples": 0,
    "recoveredSamples": 50,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "blank-viewport",
      "row-overlap"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 1.1,
    "p95Ms": 2.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2.4
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 1,
    "p95Ms": 1.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.7
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 0.9,
    "p95Ms": 2.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4.9
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "start",
    "medianMs": 1143.3,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 1,
    "totalSamples": 2,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "row-overlap",
      "row-gap",
      "timeout"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 1171.7,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 1,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 1273.7,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 1,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "start",
    "medianMs": 622.7,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 1,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 623.3,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 1,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 660.7,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 1,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 1249.8,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 1,
    "totalSamples": 2,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "row-gap",
      "row-overlap",
      "blank-viewport",
      "timeout"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 650,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 1,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 618.3,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 1,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "row-overlap",
      "timeout"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "row-overlap",
      "timeout"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 633.3,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 1,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "interactive-budget",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "start",
    "medianMs": 2.3,
    "p95Ms": 2.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2.9
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "middle",
    "medianMs": 2.3,
    "p95Ms": 5.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.9
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "end",
    "medianMs": 2.3,
    "p95Ms": 5.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "start",
    "medianMs": 2.2,
    "p95Ms": 2.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2.7
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "middle",
    "medianMs": 2.1,
    "p95Ms": 5.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      6.3
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "end",
    "medianMs": 2.1,
    "p95Ms": 5.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "start",
    "medianMs": 2.1,
    "p95Ms": 6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      6.5
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "middle",
    "medianMs": 2.2,
    "p95Ms": 5.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.8
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "end",
    "medianMs": 1.8,
    "p95Ms": 3.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.7
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "start",
    "medianMs": 2.1,
    "p95Ms": 5.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.6,
      6.4
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "middle",
    "medianMs": 2.1,
    "p95Ms": 5.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      6.9
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "end",
    "medianMs": 1.8,
    "p95Ms": 4.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.3
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "middle",
    "medianMs": 1.2,
    "p95Ms": 1.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2.8
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "end",
    "medianMs": 1,
    "p95Ms": 1.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4.1
    ],
    "settledSamples": 42,
    "correctSamples": 42,
    "recoveredSamples": 0,
    "failedSamples": 8,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "target-position",
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "middle",
    "medianMs": 1,
    "p95Ms": 1.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1.9,
      2.7
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "end",
    "medianMs": 0.9,
    "p95Ms": 1.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1.7,
      2.4
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "start",
    "medianMs": 1.1,
    "p95Ms": 1.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1.5,
      1.5
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "middle",
    "medianMs": 1.1,
    "p95Ms": 1.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1.5
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "end",
    "medianMs": 1.3,
    "p95Ms": 2.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.2,
      5.5
    ],
    "settledSamples": 44,
    "correctSamples": 44,
    "recoveredSamples": 0,
    "failedSamples": 6,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "target-position"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "start",
    "medianMs": 1,
    "p95Ms": 1.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2.5,
      4.2
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "middle",
    "medianMs": 1,
    "p95Ms": 1.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1.3,
      1.6
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "end",
    "medianMs": 1,
    "p95Ms": 1.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4.8
    ],
    "settledSamples": 44,
    "correctSamples": 44,
    "recoveredSamples": 0,
    "failedSamples": 6,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "target-position"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "middle",
    "medianMs": 1.6,
    "p95Ms": 2.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4.2
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "end",
    "medianMs": 1.1,
    "p95Ms": 1.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1.6
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "start",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 10,
    "totalSamples": 10,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "reproducible-failure",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "scroll-anchor"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "middle",
    "medianMs": 0.9,
    "p95Ms": 1.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      3.4,
      5.3
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "end",
    "medianMs": 1.1,
    "p95Ms": 137.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      138.5,
      139.1
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "start",
    "medianMs": 1.6,
    "p95Ms": 2.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      4.9,
      5.2
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "middle",
    "medianMs": 1.5,
    "p95Ms": 2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2.4
    ],
    "settledSamples": 40,
    "correctSamples": 40,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 40,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "end",
    "medianMs": 5,
    "p95Ms": 8.9,
    "recoveryMedianMs": 5,
    "recoveryP95Ms": 8.9,
    "slowTailMs": [
      12.2,
      13.8
    ],
    "settledSamples": 50,
    "correctSamples": 0,
    "recoveredSamples": 50,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": [
      "blank-viewport"
    ]
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "start",
    "medianMs": 1.2,
    "p95Ms": 2.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      3.8,
      4.8
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "middle",
    "medianMs": 1,
    "p95Ms": 1.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      3.5
    ],
    "settledSamples": 30,
    "correctSamples": 30,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 30,
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics",
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "runIds": [
      "670125ea-dfec-4760-ba53-4c8a8cf1501e"
    ],
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "end",
    "medianMs": 0.9,
    "p95Ms": 1.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1.6
    ],
    "settledSamples": 50,
    "correctSamples": 50,
    "recoveredSamples": 0,
    "failedSamples": 0,
    "totalSamples": 50,
    "plannedSamples": 50,
    "earlyStopped": false,
    "earlyStopReason": null,
    "heightHandling": {
      "sizeInput": "dom-measurement",
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  }
]);

export const layoutBaselineBenchmarkResults: readonly LayoutBaselineBenchmarkResult[] = Object.freeze([
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "setupMs": 19.2,
    "firstItemsMs": 19.2,
    "stableLayoutMs": 19.5,
    "scrollMedianMs": 3,
    "scrollP95Ms": 4,
    "scrollMadMs": 0.3,
    "scrollSampleCount": 100,
    "completedRounds": 5,
    "plannedRounds": 5,
    "renderedItems": 52,
    "domElements": 106
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "setupMs": 14.6,
    "firstItemsMs": 14.6,
    "stableLayoutMs": 14.8,
    "scrollMedianMs": 2.8,
    "scrollP95Ms": 3.6,
    "scrollMadMs": 0.2,
    "scrollSampleCount": 100,
    "completedRounds": 5,
    "plannedRounds": 5,
    "renderedItems": 52,
    "domElements": 106
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "setupMs": 16.3,
    "firstItemsMs": 16.3,
    "stableLayoutMs": 16.5,
    "scrollMedianMs": 1.9,
    "scrollP95Ms": 2.4,
    "scrollMadMs": 0.2,
    "scrollSampleCount": 100,
    "completedRounds": 5,
    "plannedRounds": 5,
    "renderedItems": 36,
    "domElements": 74
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "setupMs": 0.9,
    "firstItemsMs": 11.9,
    "stableLayoutMs": 12,
    "scrollMedianMs": 0.5,
    "scrollP95Ms": 0.7,
    "scrollMadMs": 0.1,
    "scrollSampleCount": 100,
    "completedRounds": 5,
    "plannedRounds": 5,
    "renderedItems": 36,
    "domElements": 75
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "setupMs": 15.2,
    "firstItemsMs": 15.2,
    "stableLayoutMs": 15.4,
    "scrollMedianMs": 2.8,
    "scrollP95Ms": 3.5,
    "scrollMadMs": 0.2,
    "scrollSampleCount": 100,
    "completedRounds": 5,
    "plannedRounds": 5,
    "renderedItems": 52,
    "domElements": 106
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "setupMs": 9.6,
    "firstItemsMs": 9.6,
    "stableLayoutMs": 9.9,
    "scrollMedianMs": 6.4,
    "scrollP95Ms": 8.9,
    "scrollMadMs": 0.5,
    "scrollSampleCount": 100,
    "completedRounds": 5,
    "plannedRounds": 5,
    "renderedItems": 54,
    "domElements": 110
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "setupMs": 15.8,
    "firstItemsMs": 15.8,
    "stableLayoutMs": 16.1,
    "scrollMedianMs": 6.1,
    "scrollP95Ms": 21,
    "scrollMadMs": 0.8,
    "scrollSampleCount": 100,
    "completedRounds": 5,
    "plannedRounds": 5,
    "renderedItems": 35,
    "domElements": 72
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "setupMs": 18,
    "firstItemsMs": 18,
    "stableLayoutMs": 18.2,
    "scrollMedianMs": 0.4,
    "scrollP95Ms": 0.6,
    "scrollMadMs": 0.1,
    "scrollSampleCount": 100,
    "completedRounds": 5,
    "plannedRounds": 5,
    "renderedItems": 28,
    "domElements": 30
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "setupMs": 12.6,
    "firstItemsMs": 12.6,
    "stableLayoutMs": 13.2,
    "scrollMedianMs": 8.7,
    "scrollP95Ms": 13.5,
    "scrollMadMs": 0.8,
    "scrollSampleCount": 100,
    "completedRounds": 5,
    "plannedRounds": 5,
    "renderedItems": 372,
    "domElements": 746
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "setupMs": 2.7,
    "firstItemsMs": 2.7,
    "stableLayoutMs": 3.5,
    "scrollMedianMs": 8,
    "scrollP95Ms": 9.5,
    "scrollMadMs": 0.5,
    "scrollSampleCount": 100,
    "completedRounds": 5,
    "plannedRounds": 5,
    "renderedItems": 345,
    "domElements": 370
  },
  {
    "runIds": [
      "068467ac-e069-4d87-9c9d-713e24fb7cfc"
    ],
    "family": "spatial",
    "mode": "positioned",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "setupMs": 90,
    "firstItemsMs": 90,
    "stableLayoutMs": 90.4,
    "scrollMedianMs": 7.2,
    "scrollP95Ms": 12,
    "scrollMadMs": 0.6,
    "scrollSampleCount": 100,
    "completedRounds": 5,
    "plannedRounds": 5,
    "renderedItems": 164,
    "domElements": 330
  }
]);

export const layoutBaselineBenchmarkFailures: readonly LayoutBaselineBenchmarkFailure[] = Object.freeze([
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "estimated",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "round": 1,
    "message": "geometry:item-37215"
  }
]);

export const layoutMutationBenchmarkResults: readonly LayoutMutationBenchmarkResult[] = Object.freeze([
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "start",
    "medianMs": 8.1,
    "medianLowerBoundMs": 3.6,
    "p95Ms": 9.1,
    "probeMedianMs": 0.4,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "middle",
    "medianMs": 8.1,
    "medianLowerBoundMs": 3.8,
    "p95Ms": 9.2,
    "probeMedianMs": 0.4,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "end",
    "medianMs": 8.1,
    "medianLowerBoundMs": 3,
    "p95Ms": 9.1,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "start",
    "medianMs": 8,
    "medianLowerBoundMs": 3.1,
    "p95Ms": 9.1,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "middle",
    "medianMs": 8.1,
    "medianLowerBoundMs": 3.2,
    "p95Ms": 9.2,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "end",
    "medianMs": 8,
    "medianLowerBoundMs": 2.8,
    "p95Ms": 9,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "start",
    "medianMs": 8.1,
    "medianLowerBoundMs": 3.4,
    "p95Ms": 9,
    "probeMedianMs": 0.4,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "middle",
    "medianMs": 8.1,
    "medianLowerBoundMs": 3.5,
    "p95Ms": 9.2,
    "probeMedianMs": 0.4,
    "samples": 50,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "end",
    "medianMs": 8.1,
    "medianLowerBoundMs": 2.6,
    "p95Ms": 9.1,
    "probeMedianMs": 0.1,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "start",
    "medianMs": 8.2,
    "medianLowerBoundMs": 2.5,
    "p95Ms": 9.3,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "start",
    "medianMs": 8.2,
    "medianLowerBoundMs": 2.8,
    "p95Ms": 9.1,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "operation": "insert",
    "location": "start",
    "medianMs": 8.2,
    "medianLowerBoundMs": 0.4,
    "p95Ms": 9.2,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "middle",
    "medianMs": 7.9,
    "medianLowerBoundMs": 3,
    "p95Ms": 8.3,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "middle",
    "medianMs": 8,
    "medianLowerBoundMs": 3,
    "p95Ms": 8.9,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "operation": "insert",
    "location": "middle",
    "medianMs": 8.2,
    "medianLowerBoundMs": 0.5,
    "p95Ms": 8.8,
    "probeMedianMs": 0.4,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "end",
    "medianMs": 8.1,
    "medianLowerBoundMs": 2.6,
    "p95Ms": 9.1,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "end",
    "medianMs": 8.1,
    "medianLowerBoundMs": 2.3,
    "p95Ms": 8.5,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "operation": "insert",
    "location": "end",
    "medianMs": 8.2,
    "medianLowerBoundMs": 0.3,
    "p95Ms": 9.1,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "start",
    "medianMs": 8.1,
    "medianLowerBoundMs": 2.6,
    "p95Ms": 9,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "start",
    "medianMs": 8.2,
    "medianLowerBoundMs": 2.6,
    "p95Ms": 8.3,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "operation": "move",
    "location": "start",
    "medianMs": 8.1,
    "medianLowerBoundMs": 0.3,
    "p95Ms": 9.1,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "middle",
    "medianMs": 8,
    "medianLowerBoundMs": 2.8,
    "p95Ms": 8.9,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "middle",
    "medianMs": 8.1,
    "medianLowerBoundMs": 2.7,
    "p95Ms": 9,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "operation": "move",
    "location": "middle",
    "medianMs": 8.2,
    "medianLowerBoundMs": 0.4,
    "p95Ms": 9.1,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "end",
    "medianMs": 8.1,
    "medianLowerBoundMs": 2.6,
    "p95Ms": 9,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "end",
    "medianMs": 8.1,
    "medianLowerBoundMs": 2.4,
    "p95Ms": 9,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "operation": "move",
    "location": "end",
    "medianMs": 8.1,
    "medianLowerBoundMs": 0.3,
    "p95Ms": 9.2,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "start",
    "medianMs": 8.2,
    "medianLowerBoundMs": 2.9,
    "p95Ms": 8.4,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "start",
    "medianMs": 8.2,
    "medianLowerBoundMs": 2.8,
    "p95Ms": 8.3,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "operation": "remove",
    "location": "start",
    "medianMs": 8.2,
    "medianLowerBoundMs": 0.4,
    "p95Ms": 9.2,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "middle",
    "medianMs": 8.1,
    "medianLowerBoundMs": 3,
    "p95Ms": 8.8,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "middle",
    "medianMs": 8,
    "medianLowerBoundMs": 3.3,
    "p95Ms": 8.4,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "operation": "remove",
    "location": "middle",
    "medianMs": 8.2,
    "medianLowerBoundMs": 0.4,
    "p95Ms": 9.2,
    "probeMedianMs": 0.4,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "end",
    "medianMs": 8.1,
    "medianLowerBoundMs": 2.3,
    "p95Ms": 8.9,
    "probeMedianMs": 0.1,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "end",
    "medianMs": 8.1,
    "medianLowerBoundMs": 2.1,
    "p95Ms": 8.3,
    "probeMedianMs": 0.1,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "operation": "remove",
    "location": "end",
    "medianMs": 8.2,
    "medianLowerBoundMs": 0.3,
    "p95Ms": 8.9,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "resize",
    "location": "start",
    "medianMs": 8,
    "medianLowerBoundMs": 2,
    "p95Ms": 8.8,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "resize",
    "location": "start",
    "medianMs": 7.7,
    "medianLowerBoundMs": 2,
    "p95Ms": 9.3,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "operation": "resize",
    "location": "start",
    "medianMs": 8.2,
    "medianLowerBoundMs": 0.2,
    "p95Ms": 9.3,
    "probeMedianMs": 0.1,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "resize",
    "location": "middle",
    "medianMs": 8.1,
    "medianLowerBoundMs": 2.3,
    "p95Ms": 9.2,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "resize",
    "location": "middle",
    "medianMs": 8.1,
    "medianLowerBoundMs": 2.4,
    "p95Ms": 8.6,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "operation": "resize",
    "location": "middle",
    "medianMs": 8.2,
    "medianLowerBoundMs": 0.3,
    "p95Ms": 9.2,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "resize",
    "location": "end",
    "medianMs": 8.1,
    "medianLowerBoundMs": 1.8,
    "p95Ms": 8.3,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "resize",
    "location": "end",
    "medianMs": 8.2,
    "medianLowerBoundMs": 1.8,
    "p95Ms": 8.3,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "d020616f-2ce8-4a79-b21e-de94007bb1ba"
    ],
    "family": "flow-grid",
    "mode": "automatic",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "operation": "resize",
    "location": "end",
    "medianMs": 8.1,
    "medianLowerBoundMs": 0.3,
    "p95Ms": 8.7,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "start",
    "medianMs": 8.1,
    "medianLowerBoundMs": 3.7,
    "p95Ms": 8.3,
    "probeMedianMs": 0.4,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "middle",
    "medianMs": 8.2,
    "medianLowerBoundMs": 3.7,
    "p95Ms": 9.2,
    "probeMedianMs": 0.4,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "end",
    "medianMs": 8.1,
    "medianLowerBoundMs": 3,
    "p95Ms": 9,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "start",
    "medianMs": 8.1,
    "medianLowerBoundMs": 3.1,
    "p95Ms": 8.9,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "middle",
    "medianMs": 8.1,
    "medianLowerBoundMs": 3,
    "p95Ms": 9.1,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "end",
    "medianMs": 8.1,
    "medianLowerBoundMs": 3.1,
    "p95Ms": 9.1,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "start",
    "medianMs": 8.2,
    "medianLowerBoundMs": 3.4,
    "p95Ms": 9.2,
    "probeMedianMs": 0.4,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "middle",
    "medianMs": 8.1,
    "medianLowerBoundMs": 3.5,
    "p95Ms": 9.2,
    "probeMedianMs": 0.4,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "end",
    "medianMs": 8.1,
    "medianLowerBoundMs": 3,
    "p95Ms": 8.2,
    "probeMedianMs": 0.1,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "start",
    "medianMs": 81.4,
    "medianLowerBoundMs": 80.8,
    "p95Ms": 134,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "start",
    "medianMs": 68.4,
    "medianLowerBoundMs": 67.8,
    "p95Ms": 138.9,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "operation": "insert",
    "location": "start",
    "medianMs": 8.3,
    "medianLowerBoundMs": 5.7,
    "p95Ms": 9.6,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "middle",
    "medianMs": 43.2,
    "medianLowerBoundMs": 42.7,
    "p95Ms": 74.8,
    "probeMedianMs": 0.3,
    "samples": 40,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "middle",
    "medianMs": 51.1,
    "medianLowerBoundMs": 50.4,
    "p95Ms": 85.3,
    "probeMedianMs": 0.4,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "operation": "insert",
    "location": "middle",
    "medianMs": 8.6,
    "medianLowerBoundMs": 6.3,
    "p95Ms": 11.1,
    "probeMedianMs": 0.4,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "end",
    "medianMs": 7,
    "medianLowerBoundMs": 6.6,
    "p95Ms": 7.8,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "end",
    "medianMs": 6.8,
    "medianLowerBoundMs": 6.5,
    "p95Ms": 7.3,
    "probeMedianMs": 0.1,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "operation": "insert",
    "location": "end",
    "medianMs": 8.2,
    "medianLowerBoundMs": 5.7,
    "p95Ms": 9.7,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "start",
    "medianMs": 68.3,
    "medianLowerBoundMs": 67.7,
    "p95Ms": 136.1,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "start",
    "medianMs": 67.8,
    "medianLowerBoundMs": 67.3,
    "p95Ms": 136.2,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "operation": "move",
    "location": "start",
    "medianMs": 8.3,
    "medianLowerBoundMs": 5.7,
    "p95Ms": 9.8,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "middle",
    "medianMs": 37.8,
    "medianLowerBoundMs": 37.3,
    "p95Ms": 72.7,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "middle",
    "medianMs": 38.9,
    "medianLowerBoundMs": 38.6,
    "p95Ms": 72.7,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "operation": "move",
    "location": "middle",
    "medianMs": 8.2,
    "medianLowerBoundMs": 5.6,
    "p95Ms": 10.3,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "end",
    "medianMs": 6.9,
    "medianLowerBoundMs": 6.6,
    "p95Ms": 8.6,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "end",
    "medianMs": 6.8,
    "medianLowerBoundMs": 6.4,
    "p95Ms": 7.2,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "operation": "move",
    "location": "end",
    "medianMs": 8.3,
    "medianLowerBoundMs": 5.5,
    "p95Ms": 9.3,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "start",
    "medianMs": 73.6,
    "medianLowerBoundMs": 73,
    "p95Ms": 136.7,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "start",
    "medianMs": 71.9,
    "medianLowerBoundMs": 71.4,
    "p95Ms": 141.3,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "operation": "remove",
    "location": "start",
    "medianMs": 8.3,
    "medianLowerBoundMs": 5.4,
    "p95Ms": 10.2,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "middle",
    "medianMs": 40.4,
    "medianLowerBoundMs": 39.8,
    "p95Ms": 76.5,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "middle",
    "medianMs": 40.1,
    "medianLowerBoundMs": 39.6,
    "p95Ms": 71.6,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "operation": "remove",
    "location": "middle",
    "medianMs": 8.3,
    "medianLowerBoundMs": 5.5,
    "p95Ms": 9.3,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "end",
    "medianMs": 6.4,
    "medianLowerBoundMs": 6.2,
    "p95Ms": 6.8,
    "probeMedianMs": 0.1,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "end",
    "medianMs": 6.6,
    "medianLowerBoundMs": 6.1,
    "p95Ms": 7.2,
    "probeMedianMs": 0.1,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "operation": "remove",
    "location": "end",
    "medianMs": 8.3,
    "medianLowerBoundMs": 5.6,
    "p95Ms": 9.3,
    "probeMedianMs": 0.1,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "resize",
    "location": "start",
    "medianMs": 3.1,
    "medianLowerBoundMs": 1.8,
    "p95Ms": 4.4,
    "probeMedianMs": 0.2,
    "samples": 40,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "resize",
    "location": "start",
    "medianMs": 3.2,
    "medianLowerBoundMs": 1.8,
    "p95Ms": 3.7,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "operation": "resize",
    "location": "start",
    "medianMs": 8.3,
    "medianLowerBoundMs": 5.6,
    "p95Ms": 9.6,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "resize",
    "location": "middle",
    "medianMs": 3.1,
    "medianLowerBoundMs": 2,
    "p95Ms": 3.4,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "resize",
    "location": "middle",
    "medianMs": 3,
    "medianLowerBoundMs": 2,
    "p95Ms": 5.9,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "operation": "resize",
    "location": "middle",
    "medianMs": 8.2,
    "medianLowerBoundMs": 5.4,
    "p95Ms": 9.3,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "resize",
    "location": "end",
    "medianMs": 3.2,
    "medianLowerBoundMs": 1.6,
    "p95Ms": 4.3,
    "probeMedianMs": 0.1,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "resize",
    "location": "end",
    "medianMs": 3.1,
    "medianLowerBoundMs": 1.6,
    "p95Ms": 4.2,
    "probeMedianMs": 0.1,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "e5426464-d1b6-4d46-b037-d185d20a8d91"
    ],
    "family": "masonry",
    "mode": "estimated",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "operation": "resize",
    "location": "end",
    "medianMs": 8.2,
    "medianLowerBoundMs": 5.6,
    "p95Ms": 10.2,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "start",
    "medianMs": 11.4,
    "medianLowerBoundMs": 8.9,
    "p95Ms": 16.6,
    "probeMedianMs": 1.8,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "operation": "insert",
    "location": "start",
    "medianMs": 7.9,
    "medianLowerBoundMs": 1.3,
    "p95Ms": 8.3,
    "probeMedianMs": 0.4,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "middle",
    "medianMs": 12.4,
    "medianLowerBoundMs": 9.5,
    "p95Ms": 17.6,
    "probeMedianMs": 2.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "operation": "insert",
    "location": "middle",
    "medianMs": 7.7,
    "medianLowerBoundMs": 1.7,
    "p95Ms": 8,
    "probeMedianMs": 0.7,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "end",
    "medianMs": 9.7,
    "medianLowerBoundMs": 8.7,
    "p95Ms": 14.3,
    "probeMedianMs": 0.8,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "operation": "insert",
    "location": "end",
    "medianMs": 7.5,
    "medianLowerBoundMs": 1.1,
    "p95Ms": 8.4,
    "probeMedianMs": 0.6,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "start",
    "medianMs": 9.1,
    "medianLowerBoundMs": 8.2,
    "p95Ms": 13.9,
    "probeMedianMs": 0.6,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "operation": "move",
    "location": "start",
    "medianMs": 7.8,
    "medianLowerBoundMs": 0.7,
    "p95Ms": 8.8,
    "probeMedianMs": 0.5,
    "samples": 50,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "middle",
    "medianMs": 10.1,
    "medianLowerBoundMs": 8.7,
    "p95Ms": 15.6,
    "probeMedianMs": 1.1,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "operation": "move",
    "location": "middle",
    "medianMs": 7.5,
    "medianLowerBoundMs": 1,
    "p95Ms": 7.9,
    "probeMedianMs": 0.7,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "end",
    "medianMs": 10.2,
    "medianLowerBoundMs": 8.8,
    "p95Ms": 15.6,
    "probeMedianMs": 0.9,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "operation": "move",
    "location": "end",
    "medianMs": 7.5,
    "medianLowerBoundMs": 0.9,
    "p95Ms": 10.9,
    "probeMedianMs": 0.5,
    "samples": 50,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "start",
    "medianMs": 11.3,
    "medianLowerBoundMs": 8.7,
    "p95Ms": 16.6,
    "probeMedianMs": 1.8,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "operation": "remove",
    "location": "start",
    "medianMs": 7.9,
    "medianLowerBoundMs": 1.3,
    "p95Ms": 8.2,
    "probeMedianMs": 0.4,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "middle",
    "medianMs": 12.4,
    "medianLowerBoundMs": 9.5,
    "p95Ms": 18.8,
    "probeMedianMs": 2.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "operation": "remove",
    "location": "middle",
    "medianMs": 7.4,
    "medianLowerBoundMs": 1.9,
    "p95Ms": 8.3,
    "probeMedianMs": 0.7,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "end",
    "medianMs": 10.2,
    "medianLowerBoundMs": 9,
    "p95Ms": 15.5,
    "probeMedianMs": 0.9,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "operation": "remove",
    "location": "end",
    "medianMs": 7.5,
    "medianLowerBoundMs": 0.9,
    "p95Ms": 8.7,
    "probeMedianMs": 0.5,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "resize",
    "location": "start",
    "medianMs": 9.6,
    "medianLowerBoundMs": 8.3,
    "p95Ms": 14.6,
    "probeMedianMs": 0.9,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "operation": "resize",
    "location": "start",
    "medianMs": 7.9,
    "medianLowerBoundMs": 1,
    "p95Ms": 8.8,
    "probeMedianMs": 0.7,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "resize",
    "location": "middle",
    "medianMs": 10.7,
    "medianLowerBoundMs": 9.1,
    "p95Ms": 16.1,
    "probeMedianMs": 1.4,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "operation": "resize",
    "location": "middle",
    "medianMs": 7.5,
    "medianLowerBoundMs": 1.6,
    "p95Ms": 8.3,
    "probeMedianMs": 1.1,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "resize",
    "location": "end",
    "medianMs": 9.5,
    "medianLowerBoundMs": 8.6,
    "p95Ms": 14.5,
    "probeMedianMs": 0.8,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c"
    ],
    "family": "track-grid",
    "mode": "fixed",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "operation": "resize",
    "location": "end",
    "medianMs": 7.5,
    "medianLowerBoundMs": 1.1,
    "p95Ms": 8.4,
    "probeMedianMs": 0.6,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "068467ac-e069-4d87-9c9d-713e24fb7cfc"
    ],
    "family": "spatial",
    "mode": "positioned",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "start",
    "medianMs": 141,
    "medianLowerBoundMs": 139.5,
    "p95Ms": 168.5,
    "probeMedianMs": 1.1,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "068467ac-e069-4d87-9c9d-713e24fb7cfc"
    ],
    "family": "spatial",
    "mode": "positioned",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "middle",
    "medianMs": 100.9,
    "medianLowerBoundMs": 99.6,
    "p95Ms": 130.8,
    "probeMedianMs": 0.9,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "068467ac-e069-4d87-9c9d-713e24fb7cfc"
    ],
    "family": "spatial",
    "mode": "positioned",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "insert",
    "location": "end",
    "medianMs": 8.2,
    "medianLowerBoundMs": 4.2,
    "p95Ms": 9.2,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "068467ac-e069-4d87-9c9d-713e24fb7cfc"
    ],
    "family": "spatial",
    "mode": "positioned",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "start",
    "medianMs": 8.1,
    "medianLowerBoundMs": 4.8,
    "p95Ms": 9.2,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "068467ac-e069-4d87-9c9d-713e24fb7cfc"
    ],
    "family": "spatial",
    "mode": "positioned",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "middle",
    "medianMs": 8,
    "medianLowerBoundMs": 5.5,
    "p95Ms": 9,
    "probeMedianMs": 0.4,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "068467ac-e069-4d87-9c9d-713e24fb7cfc"
    ],
    "family": "spatial",
    "mode": "positioned",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "move",
    "location": "end",
    "medianMs": 8,
    "medianLowerBoundMs": 4.2,
    "p95Ms": 9.5,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "068467ac-e069-4d87-9c9d-713e24fb7cfc"
    ],
    "family": "spatial",
    "mode": "positioned",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "start",
    "medianMs": 139.5,
    "medianLowerBoundMs": 138,
    "p95Ms": 161.7,
    "probeMedianMs": 1,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "068467ac-e069-4d87-9c9d-713e24fb7cfc"
    ],
    "family": "spatial",
    "mode": "positioned",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "middle",
    "medianMs": 98.9,
    "medianLowerBoundMs": 97.4,
    "p95Ms": 130.7,
    "probeMedianMs": 0.9,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "068467ac-e069-4d87-9c9d-713e24fb7cfc"
    ],
    "family": "spatial",
    "mode": "positioned",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "remove",
    "location": "end",
    "medianMs": 8,
    "medianLowerBoundMs": 4.3,
    "p95Ms": 8.5,
    "probeMedianMs": 0.2,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "068467ac-e069-4d87-9c9d-713e24fb7cfc"
    ],
    "family": "spatial",
    "mode": "positioned",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "resize",
    "location": "start",
    "medianMs": 8.1,
    "medianLowerBoundMs": 4.4,
    "p95Ms": 9,
    "probeMedianMs": 0.4,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "068467ac-e069-4d87-9c9d-713e24fb7cfc"
    ],
    "family": "spatial",
    "mode": "positioned",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "resize",
    "location": "middle",
    "medianMs": 8,
    "medianLowerBoundMs": 5.1,
    "p95Ms": 9,
    "probeMedianMs": 0.4,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "068467ac-e069-4d87-9c9d-713e24fb7cfc"
    ],
    "family": "spatial",
    "mode": "positioned",
    "library": "Sectile Virtual",
    "version": "0.11.1",
    "stack": "Vue 3.5.22",
    "operation": "resize",
    "location": "end",
    "medianMs": 8,
    "medianLowerBoundMs": 4,
    "p95Ms": 8.6,
    "probeMedianMs": 0.3,
    "samples": 30,
    "failedSamples": 0,
    "failureCodes": [],
    "plannedSamples": 50,
    "earlyStopped": true,
    "earlyStopReason": "stable-statistics"
  }
]);

export const heightModeSupport: readonly HeightModeSupport[] = Object.freeze([
  {
    "library": "Sectile Virtual",
    "fixed": true,
    "estimated": true,
    "automatic": true,
    "automaticNote": "The application does not provide a height or estimate."
  },
  {
    "library": "TanStack Virtual",
    "fixed": true,
    "estimated": true,
    "automatic": false,
    "automaticNote": "estimateSize is required by the public API."
  },
  {
    "library": "react-window",
    "fixed": true,
    "estimated": true,
    "automatic": false,
    "automaticNote": "A numeric rowHeight or dynamic defaultRowHeight is required."
  },
  {
    "library": "React Virtuoso",
    "fixed": true,
    "estimated": true,
    "automatic": true,
    "automaticNote": "The application does not provide a height or estimate."
  },
  {
    "library": "react-virtualized",
    "fixed": true,
    "estimated": true,
    "automatic": false,
    "automaticNote": "CellMeasurerCache needs a defaultHeight to estimate unmeasured rows."
  },
  {
    "library": "Virtua",
    "fixed": true,
    "estimated": true,
    "automatic": true,
    "automaticNote": "The application does not provide a height or estimate."
  },
  {
    "library": "Vue Virtual Scroller",
    "fixed": true,
    "estimated": true,
    "automatic": false,
    "automaticNote": "DynamicScroller requires minItemSize for its initial layout."
  }
]);

export const benchmarkRowProfiles: Readonly<Partial<Record<BenchmarkRowProfile, BenchmarkRowProfileConditions>>> = Object.freeze({
  "uniform": {
    "commonEstimateHeight": 72,
    "contentCorpusVersion": 1,
    "contentVariants": 1,
    "heightDistribution": {
      "minimum": 72,
      "median": 72,
      "p95": 72,
      "maximum": 72,
      "distinct": 1
    }
  },
  "heterogeneous": {
    "commonEstimateHeight": 72,
    "contentCorpusVersion": 1,
    "contentVariants": 256,
    "heightDistribution": {
      "minimum": 71,
      "median": 119,
      "p95": 159,
      "maximum": 159,
      "distinct": 8
    }
  }
});

export const benchmarkSource: BenchmarkSource = Object.freeze({
  "gitCommit": "ce84a7b1f4b9fb2e0468d86f2b3c81b0d8ba06ec",
  "gitDirty": false,
  "buildFingerprint": "4788170244f819e40c13402fd3b2365325217708d11cc6e93753ae12119a130c"
});

export const benchmarkRuns: Readonly<Record<string, BenchmarkRunMetadata>> = Object.freeze({
  "37185643-196c-428f-b4a2-5fd11f9e53fc": {
    "id": "37185643-196c-428f-b4a2-5fd11f9e53fc",
    "observedAt": "2026-08-30T15:49:00.637Z",
    "completedAt": "2026-08-30T15:54:30.182Z",
    "durationMs": 329548.9,
    "source": {
      "gitCommit": "ce84a7b1f4b9fb2e0468d86f2b3c81b0d8ba06ec",
      "gitDirty": false,
      "buildFingerprint": "4788170244f819e40c13402fd3b2365325217708d11cc6e93753ae12119a130c"
    }
  },
  "670125ea-dfec-4760-ba53-4c8a8cf1501e": {
    "id": "670125ea-dfec-4760-ba53-4c8a8cf1501e",
    "observedAt": "2026-08-30T15:54:30.422Z",
    "completedAt": "2026-08-30T16:01:48.258Z",
    "durationMs": 437842.7,
    "source": {
      "gitCommit": "ce84a7b1f4b9fb2e0468d86f2b3c81b0d8ba06ec",
      "gitDirty": false,
      "buildFingerprint": "4788170244f819e40c13402fd3b2365325217708d11cc6e93753ae12119a130c"
    }
  },
  "d020616f-2ce8-4a79-b21e-de94007bb1ba": {
    "id": "d020616f-2ce8-4a79-b21e-de94007bb1ba",
    "observedAt": "2026-08-30T16:03:50.343Z",
    "completedAt": "2026-08-30T16:04:38.737Z",
    "durationMs": 48384.9,
    "source": {
      "gitCommit": "ce84a7b1f4b9fb2e0468d86f2b3c81b0d8ba06ec",
      "gitDirty": false,
      "buildFingerprint": "4788170244f819e40c13402fd3b2365325217708d11cc6e93753ae12119a130c"
    }
  },
  "e5426464-d1b6-4d46-b037-d185d20a8d91": {
    "id": "e5426464-d1b6-4d46-b037-d185d20a8d91",
    "observedAt": "2026-08-30T16:04:59.134Z",
    "completedAt": "2026-08-30T16:06:27.998Z",
    "durationMs": 88864.4,
    "source": {
      "gitCommit": "ce84a7b1f4b9fb2e0468d86f2b3c81b0d8ba06ec",
      "gitDirty": false,
      "buildFingerprint": "4788170244f819e40c13402fd3b2365325217708d11cc6e93753ae12119a130c"
    }
  },
  "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c": {
    "id": "10ee1635-cf70-4dd6-9108-7f2ec3cbc87c",
    "observedAt": "2026-08-30T16:06:44.757Z",
    "completedAt": "2026-08-30T16:07:15.153Z",
    "durationMs": 30396,
    "source": {
      "gitCommit": "ce84a7b1f4b9fb2e0468d86f2b3c81b0d8ba06ec",
      "gitDirty": false,
      "buildFingerprint": "4788170244f819e40c13402fd3b2365325217708d11cc6e93753ae12119a130c"
    }
  },
  "068467ac-e069-4d87-9c9d-713e24fb7cfc": {
    "id": "068467ac-e069-4d87-9c9d-713e24fb7cfc",
    "observedAt": "2026-08-30T16:08:04.199Z",
    "completedAt": "2026-08-30T16:08:51.167Z",
    "durationMs": 46968.3,
    "source": {
      "gitCommit": "ce84a7b1f4b9fb2e0468d86f2b3c81b0d8ba06ec",
      "gitDirty": false,
      "buildFingerprint": "4788170244f819e40c13402fd3b2365325217708d11cc6e93753ae12119a130c"
    }
  }
});
