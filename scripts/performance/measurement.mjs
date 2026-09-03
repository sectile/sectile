export const MAX_TIMING_ITERATIONS = 1_000_000;
export const MIN_TIMING_CALIBRATION_NANOSECONDS = 1_000_000;

export function timingCalibrationComplete(elapsedNanoseconds, iterations, maximumIterations) {
  if (!Number.isFinite(elapsedNanoseconds) || elapsedNanoseconds < 0) {
    throw new TypeError('calibration duration must be a finite non-negative number');
  }
  if (!Number.isSafeInteger(iterations) || iterations < 1) {
    throw new TypeError('calibration iterations must be a positive safe integer');
  }
  if (!Number.isSafeInteger(maximumIterations) || maximumIterations < iterations) {
    throw new TypeError('maximum calibration iterations must cover completed iterations');
  }
  return elapsedNanoseconds >= MIN_TIMING_CALIBRATION_NANOSECONDS || iterations >= maximumIterations;
}

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
