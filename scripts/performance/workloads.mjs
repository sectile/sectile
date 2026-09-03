import {
  PERFORMANCE_TIMING_PACKAGES,
  normalizePerformanceSelection,
  performanceMetricSelected,
} from './schema.mjs';
import { timed } from './workloads/shared.mjs';

const OWNER_MODULES = Object.freeze({
  core: Object.freeze({ path: './workloads/core.mjs', factory: 'createCoreWorkloadGroups' }),
  chart: Object.freeze({ path: './workloads/chart.mjs', factory: 'createChartWorkloadGroups' }),
  tabular: Object.freeze({ path: './workloads/tabular.mjs', factory: 'createTabularWorkloadGroups' }),
  virtual: Object.freeze({ path: './workloads/virtual.mjs', factory: 'createVirtualWorkloadGroups' }),
});

export async function* createWorkloadGroups(options = {}) {
  const { quick = false } = options;
  const selection = workloadSelection(options);
  const owners = selection.owners.length === 0 ? PERFORMANCE_TIMING_PACKAGES : selection.owners;
  yield Object.freeze(() => Object.freeze([createCalibrationWorkload(quick)]));
  for (const owner of owners) {
    const registration = OWNER_MODULES[owner];
    if (registration === undefined) throw new Error(`missing performance workload module for ${owner}`);
    const module = await import(registration.path);
    const factory = module[registration.factory];
    if (typeof factory !== 'function') throw new Error(`missing performance workload group factory ${registration.factory}`);
    yield* factory({ quick, selection });
  }
}

export async function createWorkloads(options = {}) {
  const selection = workloadSelection(options);
  const workloads = [];
  for await (const createGroup of createWorkloadGroups(options)) {
    for (const workload of await createGroup()) {
      if (performanceMetricSelected(workload.metadata, selection)) workloads.push(workload);
    }
  }
  return Object.freeze(workloads);
}

function workloadSelection({ quick = false, packages = PERFORMANCE_TIMING_PACKAGES, selection = null } = {}) {
  return selection === null
    ? normalizePerformanceSelection({ owners: packages, scales: quick ? ['representative'] : [] })
    : normalizePerformanceSelection(selection);
}

function createCalibrationWorkload(quick) {
  return timed('runner:calibration', 'runner', { operation: 'integer-mix' }, quick ? 200_000 : 1_000_000, (iteration) => {
    let value = iteration | 0;
    for (let round = 0; round < 32; round += 1) value = Math.imul(value ^ round, 1_664_525) + 1_013_904_223;
    return value;
  });
}
