export async function runVerificationSteps(steps, options) {
  const failures = [];
  const continueOnFailure = options.continueOnFailure === true;
  for (const [stepIndex, step] of steps.entries()) {
    options.onStep?.(step, stepIndex, steps.length);
    if (step.parallel === true) {
      if (typeof options.runAsync !== 'function') {
        throw new TypeError(`parallel verification step ${step.label} requires runAsync`);
      }
      const lanes = step.lanes ?? step.commands.map((commandEntry) => [commandEntry]);
      let stopRequested = false;
      const laneFailures = await Promise.all(lanes.map(async (lane) => {
        const result = [];
        for (const commandEntry of lane) {
          if (stopRequested && !continueOnFailure) break;
          const startedAt = performance.now();
          const commandResult = await options.runAsync(commandEntry);
          if (commandResult.error === undefined && commandResult.status === 0) continue;
          result.push(failureFor(commandEntry, commandResult, startedAt, step));
          if (!continueOnFailure) {
            stopRequested = true;
            break;
          }
        }
        return result;
      }));
      const stepFailures = laneFailures.flat();
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
      const failure = failureFor(commandEntry, result, startedAt, step);
      failures.push(failure);
      options.onFailure?.(failure);
      if (!continueOnFailure) {
        return Object.freeze({ failures: Object.freeze(failures), status: 1 });
      }
    }
  }
  return Object.freeze({ failures: Object.freeze(failures), status: failures.length === 0 ? 0 : 1 });
}

function failureFor(command, result, startedAt, step) {
  return Object.freeze({
    command,
    error: result.error,
    result,
    startedAt,
    step,
  });
}
