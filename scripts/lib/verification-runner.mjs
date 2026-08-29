export function runVerificationSteps(steps, options) {
  const failures = [];
  for (const [stepIndex, step] of steps.entries()) {
    options.onStep?.(step, stepIndex, steps.length);
    for (const commandEntry of step.commands) {
      const startedAt = performance.now();
      const result = options.run(commandEntry);
      if (result.error === undefined && result.status === 0) continue;
      const failure = Object.freeze({
        command: commandEntry,
        error: result.error,
        result,
        startedAt,
        step,
      });
      failures.push(failure);
      options.onFailure?.(failure);
    }
  }
  return Object.freeze({ failures: Object.freeze(failures), status: failures.length === 0 ? 0 : 1 });
}
