export interface DistributionSnapshot {
  readonly sampleCount: number;
  readonly median: number;
  readonly p95: number;
}

export interface DistributionStabilityOptions {
  readonly minimumSamples: number;
  readonly medianRelativeTolerance: number;
  readonly p95RelativeTolerance: number;
}

export function distributionSnapshot(values: readonly number[]): DistributionSnapshot | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((left, right) => left - right);
  return Object.freeze({
    sampleCount: sorted.length,
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
  });
}

export function distributionIsStable(
  previous: DistributionSnapshot | undefined,
  current: DistributionSnapshot | undefined,
  options: DistributionStabilityOptions,
): boolean {
  if (previous === undefined || current === undefined || current.sampleCount < options.minimumSamples) return false;
  return relativeDifference(previous.median, current.median) <= options.medianRelativeTolerance
    && relativeDifference(previous.p95, current.p95) <= options.p95RelativeTolerance;
}

export function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function relativeDifference(left: number, right: number): number {
  return Math.abs(left - right) / Math.max(Math.abs(left), Math.abs(right), 0.1);
}

function percentile(sorted: readonly number[], ratio: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))] ?? 0;
}
