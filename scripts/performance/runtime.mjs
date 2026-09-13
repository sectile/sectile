import assert from 'node:assert/strict';

export function collectWorkerRuntime(runtime = process) {
  return normalizeWorkerRuntime({
    node: runtime.version,
    v8: runtime.versions?.v8,
    runtimeOptions: {
      execArgv: runtime.execArgv,
      nodeOptions: runtime.env?.NODE_OPTIONS,
    },
  });
}

export function normalizeWorkerRuntime(runtime) {
  assert.equal(typeof runtime?.node, 'string', 'worker Node version is required');
  assert.equal(typeof runtime?.v8, 'string', 'worker V8 version is required');
  assert.ok(Array.isArray(runtime?.runtimeOptions?.execArgv), 'worker execArgv is required');
  assert.ok(
    runtime.runtimeOptions.execArgv.every((value) => typeof value === 'string'),
    'worker execArgv must contain strings',
  );
  const nodeOptions = normalizeNodeOptions(runtime.runtimeOptions.nodeOptions);
  return Object.freeze({
    node: runtime.node,
    v8: runtime.v8,
    runtimeOptions: Object.freeze({
      execArgv: Object.freeze([...runtime.runtimeOptions.execArgv]),
      nodeOptions,
    }),
  });
}

export function commonWorkerRuntime(processReports) {
  assert.ok(Array.isArray(processReports) && processReports.length > 0, 'performance worker reports are required');
  const runtime = normalizeWorkerRuntime(processReports[0]?.runtime);
  for (let index = 1; index < processReports.length; index += 1) {
    assert.deepEqual(
      normalizeWorkerRuntime(processReports[index]?.runtime),
      runtime,
      `performance worker ${index} used different runtime options`,
    );
  }
  return runtime;
}

function normalizeNodeOptions(value) {
  if (value === undefined || value === null) return null;
  assert.equal(typeof value, 'string', 'worker NODE_OPTIONS must be a string');
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
