export const benchmarkFamilies = Object.freeze([
  'list',
  'flow-grid',
  'masonry',
  'track-grid',
  'spatial',
] as const);

export type BenchmarkFamily = typeof benchmarkFamilies[number];

export interface BenchmarkSource {
  readonly gitCommit: string;
  readonly gitDirty: boolean;
  readonly buildFingerprint: string;
}

export interface BenchmarkCapability {
  readonly family: BenchmarkFamily;
  readonly library: string;
  readonly baseline: boolean;
  readonly mutations: boolean;
  readonly modes: readonly ('fixed' | 'estimated' | 'automatic' | 'positioned')[];
  readonly note: string;
}

export function parseBenchmarkFamily(value: string | null): BenchmarkFamily {
  return benchmarkFamilies.includes(value as BenchmarkFamily)
    ? value as BenchmarkFamily
    : 'list';
}

export function isLayoutBenchmarkFamily(
  family: BenchmarkFamily,
): family is Exclude<BenchmarkFamily, 'list'> {
  return family !== 'list';
}

export function benchmarkFamilyLabel(family: BenchmarkFamily): string {
  switch (family) {
    case 'list': return 'List';
    case 'flow-grid': return 'Flow grid';
    case 'masonry': return 'Masonry';
    case 'track-grid': return 'Track grid';
    case 'spatial': return 'Spatial';
  }
}
