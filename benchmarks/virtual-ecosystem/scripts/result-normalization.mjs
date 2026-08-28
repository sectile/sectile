const TARGET_POSITION_PATTERN = /^Could not position row \d+ in the viewport\.$/;

export function normalizeMutationResult(result) {
  const failures = (result.failures ?? []).map((failure) => (
    isTargetPositionFailure(failure) ? { ...failure, code: 'target-position' } : failure
  ));
  const samples = (result.samples ?? []).map((sample) => {
    const failureCodes = sample.failureCodes.map((code) => (
      code === 'exception' && failures.some((failure) => failure.sample === sample.sample && failure.code === 'target-position')
        ? 'target-position'
        : code
    ));
    return { ...sample, failureCodes };
  });

  return {
    ...result,
    correctSamples: samples.filter((sample) => sample.outcome === 'clean').length,
    recoveredSamples: samples.filter((sample) => sample.outcome === 'recovered').length,
    failedSamples: samples.filter((sample) => sample.outcome === 'failed').length,
    totalSamples: samples.length,
    samples,
    failures,
  };
}

function isTargetPositionFailure(failure) {
  return failure?.code === 'target-position'
    || (failure?.code === 'exception' && TARGET_POSITION_PATTERN.test(failure?.message ?? ''));
}
