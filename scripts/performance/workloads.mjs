import {
  PERFORMANCE_TIMING_PACKAGES,
  normalizePerformanceSelection,
} from './schema.mjs';
import { timed } from './workloads/shared.mjs';

const OWNER_MODULES = Object.freeze({
  core: Object.freeze({ path: './workloads/core.mjs', factory: 'createCoreWorkloads' }),
  chart: Object.freeze({ path: './workloads/chart.mjs', factory: 'createChartWorkloads' }),
  tabular: Object.freeze({ path: './workloads/tabular.mjs', factory: 'createTabularWorkloads' }),
  virtual: Object.freeze({ path: './workloads/virtual.mjs', factory: 'createVirtualWorkloads' }),
});

export async function createWorkloads({ quick = false, packages = PERFORMANCE_TIMING_PACKAGES, selection = null } = {}) {
  const normalizedSelection = selection === null
    ? normalizePerformanceSelection({ owners: packages, scales: quick ? ['representative'] : [] })
    : normalizePerformanceSelection(selection);
  const owners = normalizedSelection.owners.length === 0 ? PERFORMANCE_TIMING_PACKAGES : normalizedSelection.owners;
  const workloads = [createCalibrationWorkload(quick)];
  for (const owner of owners) {
    const registration = OWNER_MODULES[owner];
    if (registration === undefined) throw new Error(`missing performance workload module for ${owner}`);
    const module = await import(registration.path);
    const factory = module[registration.factory];
    if (typeof factory !== 'function') throw new Error(`missing performance workload factory ${registration.factory}`);
    workloads.push(...await factory({ quick, selection: normalizedSelection }));
  }
  return Object.freeze(workloads);
}

function createCalibrationWorkload(quick) {
  return timed('runner:calibration', 'runner', { operation: 'integer-mix' }, quick ? 200_000 : 1_000_000, (iteration) => {
    let value = iteration | 0;
    for (let round = 0; round < 32; round += 1) value = Math.imul(value ^ round, 1_664_525) + 1_013_904_223;
    return value;
  });
}
