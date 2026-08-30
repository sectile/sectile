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
  readonly p95Ms: number | null;
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
      "749d5d65-0d7a-4005-84fd-2c3973d993a4"
    ],
    "rowProfile": "uniform",
    "mode": "fixed",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "setupMs": 7.7,
    "firstRowsMs": 7.8,
    "mountMs": 8.6,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 0.8,
    "scrollMedianLowerBoundMs": 0.5,
    "scrollP95Ms": 1.1,
    "scrollMadMs": 0.1,
    "scrollProbeMedianMs": 0.4,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      0.8,
      1
    ],
    "scrollRoundP95RangeMs": [
      0.9,
      1.1
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "749d5d65-0d7a-4005-84fd-2c3973d993a4"
    ],
    "rowProfile": "uniform",
    "mode": "fixed",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "setupMs": 0,
    "firstRowsMs": 5.9,
    "mountMs": 7,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 1.1,
    "scrollMedianLowerBoundMs": 0.8,
    "scrollP95Ms": 1.5,
    "scrollMadMs": 0.1,
    "scrollProbeMedianMs": 0.3,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 100,
    "scrollRoundMedianRangeMs": [
      1,
      1.4
    ],
    "scrollRoundP95RangeMs": [
      1.2,
      1.5
    ],
    "completedRounds": 5,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "749d5d65-0d7a-4005-84fd-2c3973d993a4"
    ],
    "rowProfile": "uniform",
    "mode": "fixed",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "setupMs": 0,
    "firstRowsMs": 2,
    "mountMs": 2.8,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 3.8,
    "scrollMedianLowerBoundMs": 3.4,
    "scrollP95Ms": 5,
    "scrollMadMs": 0.9,
    "scrollProbeMedianMs": 0.4,
    "scrollChecksMedian": 3,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      3.6,
      3.9
    ],
    "scrollRoundP95RangeMs": [
      4.8,
      5.4
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "749d5d65-0d7a-4005-84fd-2c3973d993a4"
    ],
    "rowProfile": "uniform",
    "mode": "fixed",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "setupMs": 0.2,
    "firstRowsMs": 13.6,
    "mountMs": 14.8,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 1.9,
    "scrollMedianLowerBoundMs": 1.6,
    "scrollP95Ms": 2,
    "scrollMadMs": 0.1,
    "scrollProbeMedianMs": 0.3,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      1.8,
      1.9
    ],
    "scrollRoundP95RangeMs": [
      1.9,
      2
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "749d5d65-0d7a-4005-84fd-2c3973d993a4"
    ],
    "rowProfile": "uniform",
    "mode": "fixed",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "setupMs": 0,
    "firstRowsMs": 1.6,
    "mountMs": 2.5,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 1.5,
    "scrollMedianLowerBoundMs": 1.2,
    "scrollP95Ms": 1.9,
    "scrollMadMs": 0.1,
    "scrollProbeMedianMs": 0.3,
    "scrollChecksMedian": 3,
    "scrollSampleCount": 80,
    "scrollRoundMedianRangeMs": [
      1.4,
      1.8
    ],
    "scrollRoundP95RangeMs": [
      1.5,
      1.9
    ],
    "completedRounds": 4,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "749d5d65-0d7a-4005-84fd-2c3973d993a4"
    ],
    "rowProfile": "uniform",
    "mode": "fixed",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "setupMs": 0,
    "firstRowsMs": 6.6,
    "mountMs": 7.7,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 1.6,
    "scrollMedianLowerBoundMs": 1.3,
    "scrollP95Ms": 2,
    "scrollMadMs": 0.1,
    "scrollProbeMedianMs": 0.2,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      1.4,
      1.8
    ],
    "scrollRoundP95RangeMs": [
      1.6,
      2
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "749d5d65-0d7a-4005-84fd-2c3973d993a4"
    ],
    "rowProfile": "uniform",
    "mode": "fixed",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "setupMs": 10.6,
    "firstRowsMs": 11.9,
    "mountMs": 13.1,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 0.1,
    "scrollMedianLowerBoundMs": 0,
    "scrollP95Ms": 0.1,
    "scrollMadMs": 0,
    "scrollProbeMedianMs": 0.1,
    "scrollChecksMedian": 1,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      0,
      0.1
    ],
    "scrollRoundP95RangeMs": [
      0.1,
      0.1
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "749d5d65-0d7a-4005-84fd-2c3973d993a4"
    ],
    "rowProfile": "uniform",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "setupMs": 7.7,
    "firstRowsMs": 8,
    "mountMs": 8.8,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 1.2,
    "scrollMedianLowerBoundMs": 1.1,
    "scrollP95Ms": 1.4,
    "scrollMadMs": 0.1,
    "scrollProbeMedianMs": 0.1,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 80,
    "scrollRoundMedianRangeMs": [
      1,
      1.3
    ],
    "scrollRoundP95RangeMs": [
      1.3,
      1.6
    ],
    "completedRounds": 4,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "749d5d65-0d7a-4005-84fd-2c3973d993a4"
    ],
    "rowProfile": "uniform",
    "mode": "estimated",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "setupMs": 0.1,
    "firstRowsMs": 9.9,
    "mountMs": 10.9,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 3.3,
    "scrollMedianLowerBoundMs": 2.9,
    "scrollP95Ms": 3.7,
    "scrollMadMs": 0.1,
    "scrollProbeMedianMs": 0.4,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      3.2,
      3.6
    ],
    "scrollRoundP95RangeMs": [
      3.4,
      3.8
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "749d5d65-0d7a-4005-84fd-2c3973d993a4"
    ],
    "rowProfile": "uniform",
    "mode": "estimated",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "setupMs": 0.1,
    "firstRowsMs": 2,
    "mountMs": 2.9,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 4,
    "scrollMedianLowerBoundMs": 3.5,
    "scrollP95Ms": 5.5,
    "scrollMadMs": 0.9,
    "scrollProbeMedianMs": 0.4,
    "scrollChecksMedian": 3,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      3.8,
      4
    ],
    "scrollRoundP95RangeMs": [
      5.3,
      5.6
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "749d5d65-0d7a-4005-84fd-2c3973d993a4"
    ],
    "rowProfile": "uniform",
    "mode": "estimated",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "setupMs": 0.1,
    "firstRowsMs": 13.1,
    "mountMs": 14.2,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 1.9,
    "scrollMedianLowerBoundMs": 1.5,
    "scrollP95Ms": 2.1,
    "scrollMadMs": 0.1,
    "scrollProbeMedianMs": 0.3,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 80,
    "scrollRoundMedianRangeMs": [
      1.7,
      2
    ],
    "scrollRoundP95RangeMs": [
      1.9,
      2.2
    ],
    "completedRounds": 4,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "749d5d65-0d7a-4005-84fd-2c3973d993a4"
    ],
    "rowProfile": "uniform",
    "mode": "estimated",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "setupMs": 0.1,
    "firstRowsMs": 3.8,
    "mountMs": 4.7,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 4.8,
    "scrollMedianLowerBoundMs": 4.8,
    "scrollP95Ms": 7.1,
    "scrollMadMs": 1.3,
    "scrollProbeMedianMs": 0.1,
    "scrollChecksMedian": 3,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      4.6,
      5.9
    ],
    "scrollRoundP95RangeMs": [
      5.9,
      7.7
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "749d5d65-0d7a-4005-84fd-2c3973d993a4"
    ],
    "rowProfile": "uniform",
    "mode": "estimated",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "setupMs": 0.1,
    "firstRowsMs": 4.9,
    "mountMs": 6.1,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 1.7,
    "scrollMedianLowerBoundMs": 1.4,
    "scrollP95Ms": 2,
    "scrollMadMs": 0.1,
    "scrollProbeMedianMs": 0.3,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 80,
    "scrollRoundMedianRangeMs": [
      1.5,
      1.8
    ],
    "scrollRoundP95RangeMs": [
      1.7,
      2
    ],
    "completedRounds": 4,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "749d5d65-0d7a-4005-84fd-2c3973d993a4"
    ],
    "rowProfile": "uniform",
    "mode": "estimated",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "setupMs": 564.5,
    "firstRowsMs": 939.3,
    "mountMs": 1512.1,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 0.1,
    "scrollMedianLowerBoundMs": 0,
    "scrollP95Ms": 0.1,
    "scrollMadMs": 0,
    "scrollProbeMedianMs": 0,
    "scrollChecksMedian": 1,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      0,
      0.1
    ],
    "scrollRoundP95RangeMs": [
      0.1,
      0.1
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "749d5d65-0d7a-4005-84fd-2c3973d993a4"
    ],
    "rowProfile": "uniform",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "setupMs": 34.3,
    "firstRowsMs": 35.3,
    "mountMs": 36.3,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 1.2,
    "scrollMedianLowerBoundMs": 1.1,
    "scrollP95Ms": 1.5,
    "scrollMadMs": 0.1,
    "scrollProbeMedianMs": 0.1,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      1.1,
      1.3
    ],
    "scrollRoundP95RangeMs": [
      1.3,
      1.5
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "749d5d65-0d7a-4005-84fd-2c3973d993a4"
    ],
    "rowProfile": "uniform",
    "mode": "automatic",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "setupMs": 0.1,
    "firstRowsMs": 15.3,
    "mountMs": 17.5,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 1.9,
    "scrollMedianLowerBoundMs": 1.5,
    "scrollP95Ms": 2.1,
    "scrollMadMs": 0.1,
    "scrollProbeMedianMs": 0.3,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      1.7,
      2
    ],
    "scrollRoundP95RangeMs": [
      1.9,
      2.1
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "749d5d65-0d7a-4005-84fd-2c3973d993a4"
    ],
    "rowProfile": "uniform",
    "mode": "automatic",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "setupMs": 0,
    "firstRowsMs": 7.4,
    "mountMs": 10.8,
    "initialTotalHeightErrorPercent": 0,
    "scrollTotalHeightErrorMedianPercent": 0,
    "scrollTotalHeightErrorP95Percent": 0,
    "scrollMedianMs": 1.7,
    "scrollMedianLowerBoundMs": 1.4,
    "scrollP95Ms": 1.9,
    "scrollMadMs": 0.1,
    "scrollProbeMedianMs": 0.3,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      1.6,
      1.8
    ],
    "scrollRoundP95RangeMs": [
      1.8,
      2
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "0745871b-e535-4726-a0f4-b7596e442741"
    ],
    "rowProfile": "heterogeneous",
    "mode": "estimated",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "setupMs": 8.8,
    "firstRowsMs": 9.5,
    "mountMs": 16.6,
    "initialTotalHeightErrorPercent": 40.002,
    "scrollTotalHeightErrorMedianPercent": 39.852,
    "scrollTotalHeightErrorP95Percent": 39.936,
    "scrollMedianMs": 2.5,
    "scrollMedianLowerBoundMs": 2.5,
    "scrollP95Ms": 4.1,
    "scrollMadMs": 0.3,
    "scrollProbeMedianMs": 0.1,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      2.2,
      3.4
    ],
    "scrollRoundP95RangeMs": [
      2.4,
      5.3
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "0745871b-e535-4726-a0f4-b7596e442741"
    ],
    "rowProfile": "heterogeneous",
    "mode": "estimated",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "setupMs": 0.1,
    "firstRowsMs": 20.6,
    "mountMs": 27.7,
    "initialTotalHeightErrorPercent": 40.002,
    "scrollTotalHeightErrorMedianPercent": 39.852,
    "scrollTotalHeightErrorP95Percent": 39.936,
    "scrollMedianMs": 49.9,
    "scrollMedianLowerBoundMs": 49.8,
    "scrollP95Ms": 116.4,
    "scrollMadMs": 9.9,
    "scrollProbeMedianMs": 0.2,
    "scrollChecksMedian": 5,
    "scrollSampleCount": 100,
    "scrollRoundMedianRangeMs": [
      39.8,
      111.8
    ],
    "scrollRoundP95RangeMs": [
      55.8,
      119.1
    ],
    "completedRounds": 5,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "0745871b-e535-4726-a0f4-b7596e442741"
    ],
    "rowProfile": "heterogeneous",
    "mode": "estimated",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "setupMs": 0.1,
    "firstRowsMs": 3.7,
    "mountMs": 13.3,
    "initialTotalHeightErrorPercent": 1.153,
    "scrollTotalHeightErrorMedianPercent": 39.761,
    "scrollTotalHeightErrorP95Percent": 39.907,
    "scrollMedianMs": 172.8,
    "scrollMedianLowerBoundMs": 172.7,
    "scrollP95Ms": 345.8,
    "scrollMadMs": 23.9,
    "scrollProbeMedianMs": 0.1,
    "scrollChecksMedian": 9,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      155.8,
      210
    ],
    "scrollRoundP95RangeMs": [
      184.6,
      591.9
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "0745871b-e535-4726-a0f4-b7596e442741"
    ],
    "rowProfile": "heterogeneous",
    "mode": "estimated",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "setupMs": 0.1,
    "firstRowsMs": 14.1,
    "mountMs": 28.2,
    "initialTotalHeightErrorPercent": 40.002,
    "scrollTotalHeightErrorMedianPercent": 39.852,
    "scrollTotalHeightErrorP95Percent": 39.936,
    "scrollMedianMs": 4.5,
    "scrollMedianLowerBoundMs": 3.3,
    "scrollP95Ms": 5.1,
    "scrollMadMs": 0.2,
    "scrollProbeMedianMs": 1.2,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      4.3,
      4.8
    ],
    "scrollRoundP95RangeMs": [
      4.7,
      5.3
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "0745871b-e535-4726-a0f4-b7596e442741"
    ],
    "rowProfile": "heterogeneous",
    "mode": "estimated",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "setupMs": 0.1,
    "firstRowsMs": 5.3,
    "mountMs": 12.3,
    "initialTotalHeightErrorPercent": 40.003,
    "scrollTotalHeightErrorMedianPercent": 39.938,
    "scrollTotalHeightErrorP95Percent": 39.978,
    "scrollMedianMs": 8.9,
    "scrollMedianLowerBoundMs": 8.9,
    "scrollP95Ms": 13.5,
    "scrollMadMs": 2.4,
    "scrollProbeMedianMs": 0.1,
    "scrollChecksMedian": 3,
    "scrollSampleCount": 80,
    "scrollRoundMedianRangeMs": [
      6.4,
      11.2
    ],
    "scrollRoundP95RangeMs": [
      9,
      15.2
    ],
    "completedRounds": 4,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "0745871b-e535-4726-a0f4-b7596e442741"
    ],
    "rowProfile": "heterogeneous",
    "mode": "estimated",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "setupMs": 0.1,
    "firstRowsMs": 6.3,
    "mountMs": 16.5,
    "initialTotalHeightErrorPercent": 40.002,
    "scrollTotalHeightErrorMedianPercent": 39.904,
    "scrollTotalHeightErrorP95Percent": 39.957,
    "scrollMedianMs": 4.5,
    "scrollMedianLowerBoundMs": 4.5,
    "scrollP95Ms": 7.1,
    "scrollMadMs": 1.4,
    "scrollProbeMedianMs": 0,
    "scrollChecksMedian": 4,
    "scrollSampleCount": 100,
    "scrollRoundMedianRangeMs": [
      3,
      6.3
    ],
    "scrollRoundP95RangeMs": [
      3.2,
      8.4
    ],
    "completedRounds": 5,
    "plannedRounds": 5,
    "earlyStopReason": null
  },
  {
    "runIds": [
      "0745871b-e535-4726-a0f4-b7596e442741"
    ],
    "rowProfile": "heterogeneous",
    "mode": "estimated",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "setupMs": 626.3,
    "firstRowsMs": 963.7,
    "mountMs": 1699.5,
    "initialTotalHeightErrorPercent": 40.005,
    "scrollTotalHeightErrorMedianPercent": 39.92,
    "scrollTotalHeightErrorP95Percent": 39.967,
    "scrollMedianMs": 1425.4,
    "scrollMedianLowerBoundMs": 1425.2,
    "scrollP95Ms": 2306.5,
    "scrollMadMs": 266.4,
    "scrollProbeMedianMs": 0.1,
    "scrollChecksMedian": 3,
    "scrollSampleCount": 80,
    "scrollRoundMedianRangeMs": [
      1152.9,
      1640.3
    ],
    "scrollRoundP95RangeMs": [
      1254.8,
      2355.4
    ],
    "completedRounds": 4,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "0745871b-e535-4726-a0f4-b7596e442741"
    ],
    "rowProfile": "heterogeneous",
    "mode": "automatic",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "setupMs": 16.9,
    "firstRowsMs": 19.7,
    "mountMs": 33,
    "initialTotalHeightErrorPercent": 3.967,
    "scrollTotalHeightErrorMedianPercent": 3.955,
    "scrollTotalHeightErrorP95Percent": 3.962,
    "scrollMedianMs": 2.3,
    "scrollMedianLowerBoundMs": 2.3,
    "scrollP95Ms": 4.2,
    "scrollMadMs": 0.3,
    "scrollProbeMedianMs": 0.1,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      2.1,
      3
    ],
    "scrollRoundP95RangeMs": [
      2.7,
      4.7
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  },
  {
    "runIds": [
      "0745871b-e535-4726-a0f4-b7596e442741"
    ],
    "rowProfile": "heterogeneous",
    "mode": "automatic",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "setupMs": 0.3,
    "firstRowsMs": 14.5,
    "mountMs": 25.1,
    "initialTotalHeightErrorPercent": 0.847,
    "scrollTotalHeightErrorMedianPercent": 0.847,
    "scrollTotalHeightErrorP95Percent": 0.848,
    "scrollMedianMs": 3.7,
    "scrollMedianLowerBoundMs": 2.7,
    "scrollP95Ms": 8.6,
    "scrollMadMs": 0.6,
    "scrollProbeMedianMs": 1,
    "scrollChecksMedian": 2,
    "scrollSampleCount": 100,
    "scrollRoundMedianRangeMs": [
      2.9,
      6.4
    ],
    "scrollRoundP95RangeMs": [
      3.6,
      61.5
    ],
    "completedRounds": 5,
    "plannedRounds": 5,
    "earlyStopReason": null
  },
  {
    "runIds": [
      "0745871b-e535-4726-a0f4-b7596e442741"
    ],
    "rowProfile": "heterogeneous",
    "mode": "automatic",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "setupMs": 0,
    "firstRowsMs": 9.3,
    "mountMs": 20.2,
    "initialTotalHeightErrorPercent": 0.847,
    "scrollTotalHeightErrorMedianPercent": 0.847,
    "scrollTotalHeightErrorP95Percent": 0.848,
    "scrollMedianMs": 3.8,
    "scrollMedianLowerBoundMs": 3.8,
    "scrollP95Ms": 9.8,
    "scrollMadMs": 1.1,
    "scrollProbeMedianMs": 0,
    "scrollChecksMedian": 4,
    "scrollSampleCount": 60,
    "scrollRoundMedianRangeMs": [
      3.4,
      4.1
    ],
    "scrollRoundP95RangeMs": [
      9.4,
      10.9
    ],
    "completedRounds": 3,
    "plannedRounds": 5,
    "earlyStopReason": "stable-statistics"
  }
]);

export const baselineBenchmarkFailures: readonly BaselineBenchmarkFailure[] = Object.freeze([]);

export const mutationBenchmarkResults: readonly MutationBenchmarkResult[] = Object.freeze([
  {
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "start",
    "medianMs": 6.9,
    "p95Ms": 8.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10.4,
      11.2
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 6.9,
    "p95Ms": 7.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.2,
      9.3
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 7,
    "p95Ms": 8.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.2,
      8.2
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "start",
    "medianMs": 7.2,
    "p95Ms": 8.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.8,
      11.5
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 7,
    "p95Ms": 8.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.5,
      8.6
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 7.1,
    "p95Ms": 7.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.1,
      8.2
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 7,
    "p95Ms": 9.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10,
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
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 6.8,
    "p95Ms": 7.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.2,
      9.9
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 7.3,
    "p95Ms": 8.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.7,
      9.2
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 7.1,
    "p95Ms": 8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.2,
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 6.9,
    "p95Ms": 8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.6,
      8.6
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 7.2,
    "p95Ms": 9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.3,
      9.3
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 3.4,
    "p95Ms": 7.4,
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
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 7.6,
    "p95Ms": 8.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9,
      9.2
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 3.4,
    "p95Ms": 4.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      6,
      6.9
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
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 7.3,
    "p95Ms": 10.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10.3,
      10.6
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
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 7.8,
    "p95Ms": 8.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.1,
      9.1
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
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 3.7,
    "p95Ms": 6.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      7,
      7.9
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
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 9.1,
    "p95Ms": 10.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      11.2,
      11.5
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
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 7.5,
    "p95Ms": 8.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.4,
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
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 7.3,
    "p95Ms": 8.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.3
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
    "rowProfile": "uniform",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 7.7,
    "p95Ms": 8.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.4,
      8.9
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
    "failedSamples": 20,
    "totalSamples": 20,
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
      "scroll-anchor",
      "timeout"
    ]
  },
  {
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 498.1,
    "p95Ms": 1021.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1198.8,
      1500.3
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
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 36.8,
    "p95Ms": 51.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      53.6,
      56.5
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 65.1,
    "p95Ms": 106.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      136.4,
      169.1
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
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 38.2,
    "p95Ms": 53.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      58.3,
      59.6
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
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 828.7,
    "p95Ms": 1050.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1085,
      1101.8
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
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 557.2,
    "p95Ms": 1003.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 16,
    "correctSamples": 16,
    "recoveredSamples": 0,
    "failedSamples": 24,
    "totalSamples": 40,
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
      "timeout",
      "exception"
    ]
  },
  {
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 39.9,
    "p95Ms": 56.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      57.1,
      58
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
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 32.5,
    "p95Ms": 99,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      173,
      227.1
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
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 44.7,
    "p95Ms": 77.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      78.4,
      127.4
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
    "rowProfile": "uniform",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 39.5,
    "p95Ms": 49.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      51.2,
      51.9
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
    "failedSamples": 30,
    "totalSamples": 30,
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
      "timeout",
      "exception"
    ]
  },
  {
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
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
    "failedSamples": 30,
    "totalSamples": 30,
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
      "timeout",
      "exception"
    ]
  },
  {
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 8.3,
    "p95Ms": 9.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10.2,
      11.6
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 8.9,
    "p95Ms": 12.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      14.5,
      15.6
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
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 8.1,
    "p95Ms": 10.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      11.3,
      11.4
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
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 159.7,
    "p95Ms": 183.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      188.5
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
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
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
    "failedSamples": 30,
    "totalSamples": 30,
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
      "timeout",
      "exception"
    ]
  },
  {
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 8.9,
    "p95Ms": 10.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      11.1,
      12.1
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
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 7.8,
    "p95Ms": 8.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.5,
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
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 7.9,
    "p95Ms": 9.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.8,
      12.6
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
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 7.8,
    "p95Ms": 9.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10.1,
      11
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 5.3,
    "p95Ms": 10.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      11.1,
      33.7
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
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 7.9,
    "p95Ms": 9.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.7,
      10
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 3.2,
    "p95Ms": 6.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      6.3,
      6.5
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
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 7.6,
    "p95Ms": 8.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.6,
      8.9
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
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 7.5,
    "p95Ms": 8.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.1,
      12
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
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 4.7,
    "p95Ms": 8.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
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
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 7.6,
    "p95Ms": 10.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10.9,
      11.6
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
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 7,
    "p95Ms": 9.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10,
      10.9
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
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 6.9,
    "p95Ms": 7.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8,
      10
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
    "rowProfile": "uniform",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 7.6,
    "p95Ms": 8.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9,
      12.7
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
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "start",
    "medianMs": 322.8,
    "p95Ms": 366.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      367.7,
      374.9
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
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 58.2,
    "p95Ms": 58.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 29,
    "totalSamples": 30,
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
      "exception"
    ]
  },
  {
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 15,
    "p95Ms": 17.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      17.7,
      19.5
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 15.5,
    "p95Ms": 22.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      23.3,
      24
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
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 13.5,
    "p95Ms": 14.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      14.9,
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
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 328.4,
    "p95Ms": 379.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      384.6,
      441
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
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 72.6,
    "p95Ms": 72.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 29,
    "totalSamples": 30,
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
      "exception"
    ]
  },
  {
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 23.6,
    "p95Ms": 24.6,
    "recoveryMedianMs": 23.6,
    "recoveryP95Ms": 24.6,
    "slowTailMs": [
      24.8,
      30
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
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 13.7,
    "p95Ms": 15.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      18.1,
      18.2
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
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 13.8,
    "p95Ms": 15,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      18.2,
      19
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
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 13.2,
    "p95Ms": 14.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      14.8,
      17.7
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
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "start",
    "medianMs": 648.8,
    "p95Ms": 1161.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1178.2,
      1180.8
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
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 649.1,
    "p95Ms": 1270.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1289.8,
      1351.4
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
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 674.1,
    "p95Ms": 1374.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1377,
      1392.1
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
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "start",
    "medianMs": 597.5,
    "p95Ms": 668.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      677.3,
      697
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
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 1139,
    "p95Ms": 1269,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1344.1
    ],
    "settledSamples": 25,
    "correctSamples": 25,
    "recoveredSamples": 0,
    "failedSamples": 25,
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
      "timeout"
    ]
  },
  {
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 684,
    "p95Ms": 1318,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1363.9
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
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 723.7,
    "p95Ms": 1397.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1422.1,
      1574.7
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
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 633.9,
    "p95Ms": 1229.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1247.7,
      1362.1
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
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 1145.6,
    "p95Ms": 1398.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1542.8
    ],
    "settledSamples": 35,
    "correctSamples": 35,
    "recoveredSamples": 0,
    "failedSamples": 15,
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
      "timeout"
    ]
  },
  {
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 604.5,
    "p95Ms": 700.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      710.8,
      711.1
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
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 635,
    "p95Ms": 1834.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1878,
      1910.3
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
    "rowProfile": "uniform",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 634.1,
    "p95Ms": 1243.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1262.7,
      1281.5
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "start",
    "medianMs": 6.9,
    "p95Ms": 9.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10,
      10.9
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "middle",
    "medianMs": 6.9,
    "p95Ms": 8.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10.9
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "end",
    "medianMs": 7.1,
    "p95Ms": 8.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "start",
    "medianMs": 7.1,
    "p95Ms": 8.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.2,
      12.1
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "middle",
    "medianMs": 6.8,
    "p95Ms": 7.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      7.9,
      7.9
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "end",
    "medianMs": 7.3,
    "p95Ms": 8.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "start",
    "medianMs": 7.2,
    "p95Ms": 9.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.8,
      10.7
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "middle",
    "medianMs": 7,
    "p95Ms": 8.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.2,
      10
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "end",
    "medianMs": 7.2,
    "p95Ms": 8.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.8,
      11.6
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "start",
    "medianMs": 6.9,
    "p95Ms": 8.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.7,
      9
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "middle",
    "medianMs": 6.9,
    "p95Ms": 8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
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
    "rowProfile": "uniform",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "end",
    "medianMs": 7.2,
    "p95Ms": 8.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.5,
      9.8
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "middle",
    "medianMs": 79.6,
    "p95Ms": 93.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      93.9,
      101.5
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
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "end",
    "medianMs": 8.3,
    "p95Ms": 9.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10.1,
      10.6
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "middle",
    "medianMs": 8.4,
    "p95Ms": 10.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10.6,
      13.8
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
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "end",
    "medianMs": 8.2,
    "p95Ms": 9.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10.5
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
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "start",
    "medianMs": 167.4,
    "p95Ms": 193.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      193.9,
      201.4
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
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "middle",
    "medianMs": 79.5,
    "p95Ms": 89.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      90.2,
      92.1
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
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "end",
    "medianMs": 8.8,
    "p95Ms": 10.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      11.2,
      14
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
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "start",
    "medianMs": 7.7,
    "p95Ms": 11.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      11.5,
      11.5
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
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "middle",
    "medianMs": 8.2,
    "p95Ms": 11.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      12.5,
      13.7
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
    "rowProfile": "uniform",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "end",
    "medianMs": 7.8,
    "p95Ms": 8.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.1,
      9.8
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
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "start",
    "medianMs": 340.1,
    "p95Ms": 417,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      424.2,
      506.3
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
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "middle",
    "medianMs": 153.8,
    "p95Ms": 171.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      183.2,
      186.3
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
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "end",
    "medianMs": 15.2,
    "p95Ms": 17.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      18.8,
      19.4
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "middle",
    "medianMs": 14,
    "p95Ms": 15.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      16.8,
      18.9
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
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "end",
    "medianMs": 13.4,
    "p95Ms": 14.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      15,
      18.7
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
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "start",
    "medianMs": 330.7,
    "p95Ms": 384.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      392.1,
      483
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
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "middle",
    "medianMs": 157.7,
    "p95Ms": 176.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      180.2,
      181
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
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "end",
    "medianMs": 23.7,
    "p95Ms": 24.8,
    "recoveryMedianMs": 23.7,
    "recoveryP95Ms": 24.8,
    "slowTailMs": [
      30.8
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
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "start",
    "medianMs": 13.8,
    "p95Ms": 16.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      17.9,
      18.8
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
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "middle",
    "medianMs": 13.5,
    "p95Ms": 15.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      18.8,
      19
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
    "rowProfile": "uniform",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "end",
    "medianMs": 13,
    "p95Ms": 14.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      14.7,
      17
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "start",
    "medianMs": 7,
    "p95Ms": 9.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.3,
      11.4
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 7,
    "p95Ms": 8.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.2,
      9.8
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 7.1,
    "p95Ms": 8.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.5,
      8.8
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "start",
    "medianMs": 7.2,
    "p95Ms": 9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.4,
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
      "initialEstimate": true,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 7.2,
    "p95Ms": 8.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.7,
      8.9
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 7,
    "p95Ms": 8.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10.8
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 7.3,
    "p95Ms": 8.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9,
      10.4
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 7.4,
    "p95Ms": 8.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.9,
      8.9
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 7.6,
    "p95Ms": 9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.1
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 7.4,
    "p95Ms": 8.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.9
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 7.4,
    "p95Ms": 9.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      11.9,
      19.1
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 6.4,
    "p95Ms": 8.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.6,
      8.8
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 7.3,
    "p95Ms": 10,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10.3,
      12.4
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
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 7.6,
    "p95Ms": 8.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9,
      9.2
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 7.7,
    "p95Ms": 9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.1,
      13
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
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 7.4,
    "p95Ms": 10,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10.2,
      10.4
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
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 7.9,
    "p95Ms": 8.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.9
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
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 7.3,
    "p95Ms": 8.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.9,
      10.1
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
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 10.7,
    "p95Ms": 11.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      13.3,
      13.8
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
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 8,
    "p95Ms": 10.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10.9,
      10.9
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
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 8.3,
    "p95Ms": 10.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10.9,
      11.2
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
    "rowProfile": "heterogeneous",
    "library": "TanStack Virtual",
    "version": "3.14.10",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 8,
    "p95Ms": 10.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10.6,
      10.7
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
    "failedSamples": 20,
    "totalSamples": 20,
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
      "scroll-anchor",
      "timeout"
    ]
  },
  {
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
    "failedSamples": 20,
    "totalSamples": 20,
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
      "timeout"
    ]
  },
  {
    "rowProfile": "heterogeneous",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 77.1,
    "p95Ms": 102,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      102.8,
      107.3
    ],
    "settledSamples": 45,
    "correctSamples": 45,
    "recoveredSamples": 0,
    "failedSamples": 5,
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
      "row-overlap"
    ]
  },
  {
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "heterogeneous",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 84.7,
    "p95Ms": 94,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      97,
      103.5
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
    "failedSamples": 50,
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
      "row-overlap",
      "blank-viewport"
    ]
  },
  {
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
    "failedSamples": 20,
    "totalSamples": 20,
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
      "blank-viewport",
      "timeout"
    ]
  },
  {
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
    "failedSamples": 20,
    "totalSamples": 20,
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
      "timeout"
    ]
  },
  {
    "rowProfile": "heterogeneous",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 68.8,
    "p95Ms": 76.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      84.8,
      85
    ],
    "settledSamples": 45,
    "correctSamples": 45,
    "recoveredSamples": 0,
    "failedSamples": 5,
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
      "row-overlap"
    ]
  },
  {
    "rowProfile": "heterogeneous",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 59,
    "p95Ms": 72.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      76.9,
      78.2
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
    "rowProfile": "heterogeneous",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 93.2,
    "p95Ms": 111.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      116.3,
      134.5
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
    "rowProfile": "heterogeneous",
    "library": "react-window",
    "version": "2.3.0",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 85.3,
    "p95Ms": 104.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      106.1
    ],
    "settledSamples": 45,
    "correctSamples": 45,
    "recoveredSamples": 0,
    "failedSamples": 5,
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
      "row-overlap"
    ]
  },
  {
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 82.4,
    "p95Ms": 99.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      101.1,
      101.4
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
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 8.7,
    "p95Ms": 11.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      12.8
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 9.2,
    "p95Ms": 11.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      11.4,
      12.9
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
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 8.4,
    "p95Ms": 11.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      12.1,
      14.5
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
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 158.7,
    "p95Ms": 190.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      192,
      201.1
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
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 80.8,
    "p95Ms": 99.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      102.2,
      160.8
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
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 9.8,
    "p95Ms": 12.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      12.7,
      13
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
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 8.7,
    "p95Ms": 10.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      11.5,
      11.8
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
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 11,
    "p95Ms": 14.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      15.2,
      17.9
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
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 8.6,
    "p95Ms": 11.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      11.8,
      12.3
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "heterogeneous",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 7.1,
    "p95Ms": 8.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.2,
      11.2
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
    "rowProfile": "heterogeneous",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 7.3,
    "p95Ms": 8.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.3,
      9.7
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "heterogeneous",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 6.6,
    "p95Ms": 8.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.3,
      9.9
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
    "rowProfile": "heterogeneous",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 7.3,
    "p95Ms": 9.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.4,
      9.9
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
    "rowProfile": "heterogeneous",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 7.9,
    "p95Ms": 9.6,
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
      "initialEstimate": true,
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "rowProfile": "heterogeneous",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 6.8,
    "p95Ms": 7.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.7,
      10.6
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "heterogeneous",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 7.8,
    "p95Ms": 11.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      11.7,
      12.3
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
    "rowProfile": "heterogeneous",
    "library": "react-virtualized",
    "version": "9.22.6",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 6.3,
    "p95Ms": 7.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      7.5,
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
      "resizeNotification": "cache-invalidation",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 159.7,
    "p95Ms": 176.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      198.3,
      253.2
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
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 16.1,
    "p95Ms": 17.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      18.9,
      20.8
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": 15,
    "p95Ms": 18,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      18.1,
      18.3
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
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 15.3,
    "p95Ms": 17.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      18,
      21
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
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 334.6,
    "p95Ms": 400.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      420.4,
      421
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
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "middle",
    "medianMs": 161.8,
    "p95Ms": 186.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      189.4,
      190.1
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
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 23.3,
    "p95Ms": 40.5,
    "recoveryMedianMs": 23.3,
    "recoveryP95Ms": 40.5,
    "slowTailMs": [
      41.5,
      48.6
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
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "start",
    "medianMs": 16.2,
    "p95Ms": 17.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      20.5,
      20.6
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
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "middle",
    "medianMs": 17.3,
    "p95Ms": 22.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      22.7,
      24.9
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
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 15,
    "p95Ms": 16.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      17.6,
      20.4
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
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "start",
    "medianMs": 1156.7,
    "p95Ms": 1156.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 29,
    "totalSamples": 30,
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
      "timeout"
    ]
  },
  {
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "middle",
    "medianMs": 1702.3,
    "p95Ms": 1926.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      2076.7
    ],
    "settledSamples": 24,
    "correctSamples": 24,
    "recoveredSamples": 0,
    "failedSamples": 26,
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
      "row-overlap",
      "timeout"
    ]
  },
  {
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "insert",
    "location": "end",
    "medianMs": 649.6,
    "p95Ms": 1236.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1281.4,
      1354.1
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
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "start",
    "medianMs": 579.8,
    "p95Ms": 702.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      708.1,
      764.9
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
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "middle",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 50,
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
      "row-overlap",
      "timeout"
    ]
  },
  {
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "move",
    "location": "end",
    "medianMs": 782,
    "p95Ms": 1433.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      1749.8
    ],
    "settledSamples": 20,
    "correctSamples": 20,
    "recoveredSamples": 0,
    "failedSamples": 30,
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
      "row-overlap",
      "row-gap",
      "timeout"
    ]
  },
  {
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "start",
    "medianMs": 1178.5,
    "p95Ms": 1178.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 1,
    "correctSamples": 1,
    "recoveredSamples": 0,
    "failedSamples": 29,
    "totalSamples": 30,
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
      "blank-viewport",
      "timeout"
    ]
  },
  {
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
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
    "failedSamples": 50,
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
      "row-overlap",
      "timeout"
    ]
  },
  {
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "remove",
    "location": "end",
    "medianMs": 625.6,
    "p95Ms": 696.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      704.6
    ],
    "settledSamples": 24,
    "correctSamples": 24,
    "recoveredSamples": 0,
    "failedSamples": 26,
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
      "timeout",
      "row-overlap"
    ]
  },
  {
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "failedSamples": 50,
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
      "row-overlap",
      "timeout"
    ]
  },
  {
    "rowProfile": "heterogeneous",
    "library": "Vue Virtual Scroller",
    "version": "3.0.5",
    "stack": "Vue 3.5.22",
    "sizeMode": "estimated",
    "operation": "resize",
    "location": "end",
    "medianMs": 621.6,
    "p95Ms": 680.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      682.4,
      1891.2
    ],
    "settledSamples": 46,
    "correctSamples": 46,
    "recoveredSamples": 0,
    "failedSamples": 4,
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
      "row-overlap"
    ]
  },
  {
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "start",
    "medianMs": 7.4,
    "p95Ms": 9.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.4,
      11.5
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "middle",
    "medianMs": 5.3,
    "p95Ms": 7.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8,
      9.9
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "end",
    "medianMs": 7.6,
    "p95Ms": 8.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.9,
      9
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "start",
    "medianMs": 7,
    "p95Ms": 8.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.5
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "middle",
    "medianMs": 4.8,
    "p95Ms": 5.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      6.2,
      8.9
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "end",
    "medianMs": 7.5,
    "p95Ms": 8.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
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
      "initialEstimate": false,
      "resizeNotification": "automatic",
      "applicationCalculatesHeight": false
    },
    "failureCodes": []
  },
  {
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "start",
    "medianMs": 7.4,
    "p95Ms": 9.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.2,
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "middle",
    "medianMs": 4.9,
    "p95Ms": 7.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.2,
      10.7
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "end",
    "medianMs": 7.5,
    "p95Ms": 8.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.9
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "start",
    "medianMs": 7.2,
    "p95Ms": 9.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      9.7,
      11
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "middle",
    "medianMs": 2.1,
    "p95Ms": 5.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      5.8,
      6.1
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
    "rowProfile": "heterogeneous",
    "library": "Sectile Virtual",
    "version": "0.7.0",
    "stack": "Vue 3.5.22",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "end",
    "medianMs": 7.8,
    "p95Ms": 8.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      8.8,
      8.8
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "middle",
    "medianMs": 76.5,
    "p95Ms": 86,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      88.5,
      114
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
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "end",
    "medianMs": null,
    "p95Ms": null,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [],
    "settledSamples": 0,
    "correctSamples": 0,
    "recoveredSamples": 0,
    "failedSamples": 20,
    "totalSamples": 20,
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "middle",
    "medianMs": 8.9,
    "p95Ms": 11.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      11.6,
      12.5
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
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "start",
    "medianMs": 166.6,
    "p95Ms": 188.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      192,
      205.7
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
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "middle",
    "medianMs": 76.7,
    "p95Ms": 90.2,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      96.5,
      108.9
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
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "end",
    "medianMs": 9.2,
    "p95Ms": 10.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      13.6,
      15
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
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "start",
    "medianMs": 8.7,
    "p95Ms": 9.7,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      10.6,
      11.6
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
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "middle",
    "medianMs": 9,
    "p95Ms": 10.5,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      11.9,
      14.9
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
    "rowProfile": "heterogeneous",
    "library": "React Virtuoso",
    "version": "4.18.12",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "middle",
    "medianMs": 161.6,
    "p95Ms": 196,
    "recoveryMedianMs": 193.3,
    "recoveryP95Ms": 193.3,
    "slowTailMs": [
      200.6,
      211.5
    ],
    "settledSamples": 50,
    "correctSamples": 49,
    "recoveredSamples": 1,
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
      "row-gap"
    ]
  },
  {
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "insert",
    "location": "end",
    "medianMs": 17.9,
    "p95Ms": 20.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      20.6,
      23.1
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
    "failedSamples": 20,
    "totalSamples": 20,
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
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "middle",
    "medianMs": 14.4,
    "p95Ms": 15.3,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      16.5,
      18.4
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
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "move",
    "location": "end",
    "medianMs": 16.9,
    "p95Ms": 20.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      20.9,
      22.4
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
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "start",
    "medianMs": 347.9,
    "p95Ms": 456.6,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      459.2,
      517.9
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
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "middle",
    "medianMs": 155.6,
    "p95Ms": 180.8,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      183,
      224.4
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
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "remove",
    "location": "end",
    "medianMs": 23.6,
    "p95Ms": 24.8,
    "recoveryMedianMs": 23.7,
    "recoveryP95Ms": 24.8,
    "slowTailMs": [
      24.9,
      30.2
    ],
    "settledSamples": 50,
    "correctSamples": 5,
    "recoveredSamples": 45,
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
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "start",
    "medianMs": 15.7,
    "p95Ms": 17.1,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      19.9,
      20.2
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
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "middle",
    "medianMs": 15.7,
    "p95Ms": 16.9,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      18.8,
      20.1
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
    "rowProfile": "heterogeneous",
    "library": "Virtua",
    "version": "0.50.5",
    "stack": "React 19.2.8",
    "sizeMode": "automatic",
    "operation": "resize",
    "location": "end",
    "medianMs": 15.9,
    "p95Ms": 17.4,
    "recoveryMedianMs": null,
    "recoveryP95Ms": null,
    "slowTailMs": [
      18.1,
      21.6
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
  "gitCommit": "5c4d7c08e8a0789810ee285ec3ea7f1a286a730a",
  "gitDirty": true,
  "buildFingerprint": "1b4da435c17b78c54f4162e67d39fad4577b3a0265f7a73d6e233b4fb654c935"
});

export const benchmarkRuns: Readonly<Record<string, BenchmarkRunMetadata>> = Object.freeze({
  "749d5d65-0d7a-4005-84fd-2c3973d993a4": {
    "id": "749d5d65-0d7a-4005-84fd-2c3973d993a4",
    "observedAt": "2026-08-28T10:24:34.806Z",
    "completedAt": "2026-08-28T10:25:21.396Z",
    "durationMs": 46589.5,
    "source": {
      "gitCommit": "5c4d7c08e8a0789810ee285ec3ea7f1a286a730a",
      "gitDirty": true,
      "buildFingerprint": "1b4da435c17b78c54f4162e67d39fad4577b3a0265f7a73d6e233b4fb654c935"
    }
  },
  "0745871b-e535-4726-a0f4-b7596e442741": {
    "id": "0745871b-e535-4726-a0f4-b7596e442741",
    "observedAt": "2026-08-28T10:26:45.642Z",
    "completedAt": "2026-08-28T10:31:27.189Z",
    "durationMs": 281548.4,
    "source": {
      "gitCommit": "5c4d7c08e8a0789810ee285ec3ea7f1a286a730a",
      "gitDirty": true,
      "buildFingerprint": "1b4da435c17b78c54f4162e67d39fad4577b3a0265f7a73d6e233b4fb654c935"
    }
  }
});
