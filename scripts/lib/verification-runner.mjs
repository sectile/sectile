export async function runVerificationSteps(steps, options) {
  const failures = [];
  const continueOnFailure = options.continueOnFailure === true;
  for (const [stepIndex, step] of steps.entries()) {
    options.onStep?.(step, stepIndex, steps.length);
    if (step.parallel === true) {
      if (typeof options.runAsync !== 'function') {
        throw new TypeError(`parallel verification step ${step.label} requires runAsync`);
      }
      const stepFailures = (await Promise.all(step.commands.map(async (commandEntry) => {
        const startedAt = performance.now();
        const result = await options.runAsync(commandEntry);
        if (result.error === undefined && result.status === 0) return null;
        return Object.freeze({
          command: commandEntry,
          error: result.error,
          result,
          startedAt,
          step,
        });
      }))).filter((failure) => failure !== null);
      failures.push(...stepFailures);
      for (const failure of stepFailures) options.onFailure?.(failure);
      if (stepFailures.length > 0 && !continueOnFailure) {
        return Object.freeze({ failures: Object.freeze(failures), status: 1 });
      }
      continue;
    }
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
      if (!continueOnFailure) {
        return Object.freeze({ failures: Object.freeze(failures), status: 1 });
      }
    }
  }
  return Object.freeze({ failures: Object.freeze(failures), status: failures.length === 0 ? 0 : 1 });
}
