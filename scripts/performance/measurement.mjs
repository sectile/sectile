export const MAX_TIMING_ITERATIONS = 1_000_000;

export function calibratedTimingIterations(targetBatchNanoseconds, warmupNanosecondsPerOperation) {
  if (!Number.isFinite(targetBatchNanoseconds) || targetBatchNanoseconds <= 0) {
    throw new TypeError('target batch duration must be a positive finite number');
  }
  if (!Number.isFinite(warmupNanosecondsPerOperation) || warmupNanosecondsPerOperation <= 0) {
    throw new TypeError('warmup cost must be a positive finite number');
  }
  return Math.min(
    MAX_TIMING_ITERATIONS,
    Math.max(1, Math.ceil(targetBatchNanoseconds / warmupNanosecondsPerOperation)),
  );
}
