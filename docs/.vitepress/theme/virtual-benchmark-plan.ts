export interface VirtualBenchmarkPlanTarget {
  readonly preset: 'quick' | 'standard' | 'custom';
  readonly profile: 'all' | 'uniform' | 'heterogeneous';
  readonly phase: 'both' | 'baseline' | 'mutations';
  readonly library: string | 'all';
  readonly baselineMode: 'all' | 'fixed' | 'estimated' | 'automatic';
  readonly mutationMode: 'all' | 'estimated' | 'automatic';
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
type BaselineMode = 'fixed' | 'estimated' | 'automatic';
type MutationMode = 'estimated' | 'automatic';

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
    const profiles = target.profile === 'all'
      ? ['uniform', 'heterogeneous'] as const
      : [target.profile] as const;
    const rowScale = Math.max(0.8, Math.min(1.2, 0.8 + Math.log10(target.rows / 10_000) * 0.2));

    for (const profile of profiles) {
      profileRuns += 1;
      let profileBaselineConditions = 0;
      let profileMutationConditions = 0;

      if (target.phase !== 'mutations') {
        for (const mode of baselineModes(target.baselineMode, profile)) {
          profileBaselineConditions += libraryCount(target.library, mode, options);
        }
      }

      if (target.phase !== 'baseline') {
        const operationCount = target.operation === 'all' ? 4 : 1;
        const locationCount = target.location === 'all' ? 3 : 1;
        for (const mode of mutationModes(target.mutationMode)) {
          profileMutationConditions += libraryCount(target.library, mode, options)
            * operationCount
            * locationCount;
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
  selection: VirtualBenchmarkPlanTarget['baselineMode'],
  profile: RowProfile,
): readonly BaselineMode[] {
  if (selection !== 'all') return selection === 'fixed' && profile !== 'uniform' ? [] : [selection];
  return profile === 'uniform'
    ? ['fixed', 'estimated', 'automatic']
    : ['estimated', 'automatic'];
}

function mutationModes(selection: VirtualBenchmarkPlanTarget['mutationMode']): readonly MutationMode[] {
  return selection === 'all' ? ['estimated', 'automatic'] : [selection];
}

function libraryCount(
  selection: VirtualBenchmarkPlanTarget['library'],
  mode: BaselineMode | MutationMode,
  options: VirtualBenchmarkPlanOptions,
): number {
  if (selection !== 'all') return mode !== 'automatic' || options.automaticLibraries.has(selection) ? 1 : 0;
  return mode === 'automatic' ? options.automaticLibraries.size : options.libraries.length;
}

function mutationSamplesPerCondition(target: VirtualBenchmarkPlanTarget): number {
  if (target.preset === 'quick') return 1;
  if (target.preset === 'custom') return target.mutationRounds * target.mutationSamples;
  return 50;
}
