export interface VirtualBenchmarkPlanTarget {
  readonly family: 'list' | 'flow-grid' | 'masonry' | 'track-grid' | 'spatial';
  readonly preset: 'quick' | 'standard' | 'custom';
  readonly profile: 'all' | 'uniform' | 'heterogeneous';
  readonly phase: 'both' | 'baseline' | 'mutations';
  readonly library: string | 'all';
  readonly baselineMode: 'all' | 'fixed' | 'estimated' | 'automatic' | 'positioned';
  readonly mutationMode: 'all' | 'fixed' | 'estimated' | 'automatic' | 'positioned';
  readonly operation: 'all' | 'insert' | 'move' | 'remove' | 'resize';
  readonly location: 'all' | 'start' | 'middle' | 'end';
  readonly rows: number;
  readonly baselineRounds: number;
  readonly scrollSamples: number;
  readonly mutationRounds: number;
  readonly mutationSamples: number;
}

export interface VirtualBenchmarkPlanOptions {
  readonly libraries: readonly string[];
  readonly automaticLibraries: ReadonlySet<string>;
}

export interface VirtualBenchmarkPlanSummary {
  readonly profileRuns: number;
  readonly baselineConditions: number;
  readonly mutationConditions: number;
  readonly maximumSamples: number;
  readonly minimumDurationSeconds: number;
  readonly maximumDurationSeconds: number;
}

type RowProfile = 'uniform' | 'heterogeneous';
type BaselineMode = 'fixed' | 'estimated' | 'automatic' | 'positioned';
type MutationMode = BaselineMode;

export function summarizeVirtualBenchmarkPlan(
  targets: readonly VirtualBenchmarkPlanTarget[],
  options: VirtualBenchmarkPlanOptions,
): VirtualBenchmarkPlanSummary {
  let profileRuns = 0;
  let baselineConditions = 0;
  let mutationConditions = 0;
  let maximumSamples = 0;
  let minimumDurationSeconds = 0;
  let maximumDurationSeconds = 0;

  for (const target of targets) {
    const profiles = target.family === 'list' && target.profile === 'all'
      ? ['uniform', 'heterogeneous'] as const
      : [target.profile === 'all' ? 'uniform' : target.profile] as const;
    const rowScale = Math.max(0.8, Math.min(1.2, 0.8 + Math.log10(target.rows / 10_000) * 0.2));

    for (const profile of profiles) {
      profileRuns += 1;
      let profileBaselineConditions = 0;
      let profileMutationConditions = 0;

      if (target.phase !== 'mutations') {
        for (const mode of baselineModes(target, profile)) {
          profileBaselineConditions += libraryCount(target, mode, options);
        }
      }

      if (target.phase !== 'baseline') {
        const operations = target.operation === 'all'
          ? ['insert', 'move', 'remove', 'resize'] as const
          : [target.operation] as const;
        const locationCount = target.location === 'all' ? 3 : 1;
        for (const mode of mutationModes(target)) {
          for (const operation of operations) {
            profileMutationConditions += mutationLibraryCount(target, mode, operation, options)
              * locationCount;
          }
        }
      }

      const baselineSamples = profileBaselineConditions
        * target.baselineRounds
        * target.scrollSamples;
      const mutationSamples = profileMutationConditions * mutationSamplesPerCondition(target);

      baselineConditions += profileBaselineConditions;
      mutationConditions += profileMutationConditions;
      maximumSamples += baselineSamples + mutationSamples;

      // Range intentionally includes mount/frame overhead and leaves room for device variance.
      minimumDurationSeconds += rowScale * (
        profileBaselineConditions * (0.18 + target.baselineRounds * 0.1)
        + baselineSamples * 0.025
        + profileMutationConditions * 0.12
        + mutationSamples * 0.025
        + 0.25
      );
      maximumDurationSeconds += rowScale * (
        profileBaselineConditions * (0.6 + target.baselineRounds * 0.2)
        + baselineSamples * 0.075
        + profileMutationConditions * 0.4
        + mutationSamples * 0.09
        + 0.7
      );
    }
  }

  return Object.freeze({
    profileRuns,
    baselineConditions,
    mutationConditions,
    maximumSamples,
    minimumDurationSeconds: targets.length === 0 ? 0 : Math.max(1, Math.round(minimumDurationSeconds)),
    maximumDurationSeconds: targets.length === 0 ? 0 : Math.max(1, Math.round(maximumDurationSeconds)),
  });
}

function baselineModes(
  target: VirtualBenchmarkPlanTarget,
  profile: RowProfile,
): readonly BaselineMode[] {
  const selection = target.baselineMode;
  if (target.family === 'spatial') return selection === 'all' || selection === 'positioned' ? ['positioned'] : [];
  if (target.family !== 'list') return selection === 'all' ? ['fixed', 'estimated', 'automatic'] : selection === 'positioned' ? [] : [selection];
  if (selection !== 'all') return selection === 'fixed' && profile !== 'uniform' ? [] : [selection];
  return profile === 'uniform'
    ? ['fixed', 'estimated', 'automatic']
    : ['estimated', 'automatic'];
}

function mutationModes(target: VirtualBenchmarkPlanTarget): readonly MutationMode[] {
  const selection = target.mutationMode;
  if (target.family === 'spatial') return selection === 'all' || selection === 'positioned' ? ['positioned'] : [];
  if (target.family !== 'list') return selection === 'all' ? ['fixed', 'estimated', 'automatic'] : selection === 'positioned' ? [] : [selection];
  return selection === 'all' ? ['estimated', 'automatic'] : selection === 'fixed' || selection === 'positioned' ? [] : [selection];
}

function libraryCount(
  target: VirtualBenchmarkPlanTarget,
  mode: BaselineMode | MutationMode,
  options: VirtualBenchmarkPlanOptions,
): number {
  const selection = target.library;
  if (target.family !== 'list') {
    const supported = layoutModeLibraries(target.family, mode);
    return selection === 'all' ? supported.length : Number(supported.includes(selection));
  }
  if (selection !== 'all') return mode !== 'automatic' || options.automaticLibraries.has(selection) ? 1 : 0;
  return mode === 'automatic' ? options.automaticLibraries.size : options.libraries.length;
}

function layoutModeLibraries(family: Exclude<VirtualBenchmarkPlanTarget['family'], 'list'>, mode: BaselineMode): readonly string[] {
  if (family === 'flow-grid') return mode === 'automatic' ? ['Sectile Virtual', 'React Virtuoso'] : ['Sectile Virtual'];
  if (family === 'masonry') return mode === 'estimated' ? ['Sectile Virtual', 'TanStack Virtual'] : mode === 'automatic' || mode === 'fixed' ? ['Sectile Virtual'] : [];
  if (family === 'track-grid') return mode === 'fixed' ? ['Sectile Virtual', 'react-window'] : mode === 'estimated' ? ['Sectile Virtual', 'Virtua'] : [];
  return mode === 'positioned' ? ['Sectile Virtual'] : [];
}

function mutationLibraryCount(
  target: VirtualBenchmarkPlanTarget,
  mode: MutationMode,
  operation: Exclude<VirtualBenchmarkPlanTarget['operation'], 'all'>,
  options: VirtualBenchmarkPlanOptions,
): number {
  if (target.family === 'list') return libraryCount(target, mode, options);
  const supported = layoutModeLibraries(target.family, mode).filter((library) => {
    if (operation !== 'resize') return true;
    if ((target.family === 'flow-grid' || target.family === 'masonry') && mode === 'fixed') {
      return library !== 'Sectile Virtual';
    }
    return !(target.family === 'track-grid' && mode === 'estimated' && library === 'Virtua');
  });
  return target.library === 'all' ? supported.length : Number(supported.includes(target.library));
}

function mutationSamplesPerCondition(target: VirtualBenchmarkPlanTarget): number {
  if (target.preset === 'quick') return 1;
  if (target.preset === 'custom') return target.mutationRounds * target.mutationSamples;
  return 50;
}
