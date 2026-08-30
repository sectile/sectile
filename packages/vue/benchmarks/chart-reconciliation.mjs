import { performance } from 'node:perf_hooks';
import { effectScope, nextTick, shallowRef } from 'vue';
import { useChart } from '../dist/chart.js';

const size = Number(process.env['SECTILE_CHART_BENCH_SIZE'] ?? 50_000);
const data = Object.freeze(Array.from({ length: size }, (_, index) => Object.freeze({
  id: index,
  time: index,
  value: Math.sin(index / 100),
})));
const definition = (values) => Object.freeze({
  coordinate: Object.freeze({ kind: 'cartesian', axes: Object.freeze([
    Object.freeze({ id: 'time', orientation: 'x', scale: 'temporal', field: 'time' }),
    Object.freeze({ id: 'value', orientation: 'y', scale: 'linear', field: 'value' }),
  ]) }),
  layers: Object.freeze([
    Object.freeze({ id: 'series', kind: 'line', data: values, xAxis: 'time', yAxis: 'value' }),
  ]),
});

const source = shallowRef(definition(data));
const scope = effectScope();
const chart = scope.run(() => useChart({ definition: source }));
const startedAt = performance.now();
source.value = definition(Object.freeze([...data, Object.freeze({ id: size, time: size, value: 0 })]));
await nextTick();
const elapsedMs = performance.now() - startedAt;

process.stdout.write(`${JSON.stringify({
  benchmark: 'VAL-007:vue-chart-shallow-reconciliation',
  datums: size + 1,
  generations: chart.controller.getModel().generation,
  resolvedAxes: chart.controller.getDefinition().diagnostics.resolvedAxes,
  resolvedLayers: chart.controller.getDefinition().diagnostics.resolvedLayers,
  elapsedMs,
})}\n`);
scope.stop();
