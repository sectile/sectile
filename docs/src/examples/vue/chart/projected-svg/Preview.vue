<script setup lang="ts">
import { computed, ref } from 'vue';
import { useChart } from '@sectile/vue/chart';
import type { ChartDefinition } from '@sectile/chart/definition';

type Mode = 'line' | 'scatter' | 'bar' | 'heatmap' | 'pie' | 'donut';
type Shape =
  | { kind: 'line'; points: string }
  | { kind: 'point'; x: number; y: number }
  | { kind: 'rectangle'; x: number; y: number; width: number; height: number; intensity: number }
  | { kind: 'arc'; path: string };
const mode = ref<Mode>('line');
const revised = ref(false);
const deliveries = computed(() => [
  { id: 'mon', day: 1, label: 'Monday', count: 12 },
  { id: 'tue', day: 2, label: 'Tuesday', count: 18 },
  { id: 'wed', day: 3, label: 'Wednesday', count: revised.value ? 26 : 14 },
  { id: 'thu', day: 4, label: 'Thursday', count: 24 },
  { id: 'fri', day: 5, label: 'Friday', count: 20 },
]);
const definition = computed<ChartDefinition<(typeof deliveries.value)[number], string>>(() => {
  if (mode.value === 'pie' || mode.value === 'donut')
    return {
      coordinate: { kind: 'radial' },
      layers: [
        {
          id: 'deliveries',
          kind: mode.value,
          data: deliveries.value,
          valueField: 'count',
          labelField: 'label',
          ...(mode.value === 'donut' ? { innerRadius: 0.6 } : {}),
        },
      ],
    };
  return {
    coordinate: {
      kind: 'cartesian',
      axes: [
        mode.value === 'bar' || mode.value === 'heatmap'
          ? {
              id: 'day',
              orientation: 'x',
              scale: 'categorical',
              field: 'label',
              domain: { kind: 'categorical', values: deliveries.value.map((row) => row.label) },
            }
          : {
              id: 'day',
              orientation: 'x',
              scale: 'linear',
              field: 'day',
              domain: { kind: 'numeric', minimum: 0.5, maximum: 5.5 },
            },
        mode.value === 'heatmap'
          ? {
              id: 'count',
              orientation: 'y',
              scale: 'categorical',
              getValue: () => 'Week',
              domain: { kind: 'categorical', values: ['Week'] },
            }
          : {
              id: 'count',
              orientation: 'y',
              scale: 'linear',
              field: 'count',
              domain: { kind: 'numeric', minimum: 0, maximum: 30 },
            },
      ],
    },
    layers: [
      {
        id: 'deliveries',
        kind: mode.value,
        data: deliveries.value,
        xAxis: 'day',
        yAxis: 'count',
        ...(mode.value === 'heatmap' ? { valueField: 'count' } : {}),
      },
    ],
  };
});
const chart = useChart({ definition });
const projection = computed(() => {
  // The snapshot invalidates drawing when the controller accepts a definition update.
  void chart.snapshot.value;
  return chart.controller.project({
    viewport: { width: 360, height: 220 },
    insets: { top: 16, right: 16, bottom: 16, left: 16 },
  });
});
const shapes = computed(() => {
  if (!projection.value.ok) return [];
  return projection.value.value.batches.flatMap<Shape>((batch) => {
    if (batch.type === 'polyline') {
      return Array.from(batch.offsets.slice(0, -1), (start, index) => ({
        kind: 'line' as const,
        points: Array.from({ length: (batch.offsets[index + 1] ?? start) - start }, (_, offset) => {
          const point = (start + offset) * 2;
          return `${batch.positions[point]},${batch.positions[point + 1]}`;
        }).join(' '),
      }));
    }
    if (batch.type === 'point') {
      return Array.from(batch.identityIndices, (_, index) => ({
        kind: 'point' as const,
        x: batch.positions[index * 2] ?? 0,
        y: batch.positions[index * 2 + 1] ?? 0,
      }));
    }
    if (batch.type === 'rectangle') {
      return Array.from(batch.identityIndices, (_, index) => ({
        kind: 'rectangle' as const,
        x: batch.rectangles[index * 4] ?? 0,
        y: batch.rectangles[index * 4 + 1] ?? 0,
        width: batch.rectangles[index * 4 + 2] ?? 0,
        height: batch.rectangles[index * 4 + 3] ?? 0,
        intensity: 1,
      }));
    }
    if (batch.type === 'cell') {
      return Array.from(batch.identityIndices, (_, index) => ({
        kind: 'rectangle' as const,
        x: batch.cells[index * 5] ?? 0,
        y: batch.cells[index * 5 + 1] ?? 0,
        width: batch.cells[index * 5 + 2] ?? 0,
        height: batch.cells[index * 5 + 3] ?? 0,
        intensity: Math.max(0.25, Math.min(1, (batch.cells[index * 5 + 4] ?? 0) / 30)),
      }));
    }
    if (batch.type === 'arc') {
      return Array.from(batch.identityIndices, (_, index) => {
        const offset = index * 6;
        const [cx = 0, cy = 0, inner = 0, outer = 0, start = 0, end = 0] = batch.arcs.slice(
          offset,
          offset + 6,
        );
        const point = (radius: number, angle: number) =>
          `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
        const large = end - start > Math.PI ? 1 : 0;
        const outside = `M ${point(outer, start)} A ${outer},${outer} 0 ${large} 1 ${point(outer, end)}`;
        const inside =
          inner > 0
            ? `L ${point(inner, end)} A ${inner},${inner} 0 ${large} 0 ${point(inner, start)}`
            : `L ${cx},${cy}`;
        return { kind: 'arc' as const, path: `${outside} ${inside} Z` };
      });
    }
    return [];
  });
});
</script>

<template>
  <div data-example-chart-svg>
    <div data-example-control-row>
      <label>
        Drawing
        <select v-model="mode">
          <option value="line">Line</option>
          <option value="scatter">Scatter</option>
          <option value="bar">Bar</option>
          <option value="heatmap">Heatmap</option>
          <option value="pie">Pie</option>
          <option value="donut">Donut</option>
        </select>
      </label>
      <button type="button" @click="revised = !revised">
        {{ revised ? 'Restore Wednesday' : 'Update Wednesday' }}
      </button>
    </div>
    <svg viewBox="0 0 360 220" aria-hidden="true" focusable="false">
      <template v-for="(shape, index) in shapes" :key="index">
        <polyline v-if="shape.kind === 'line'" :points="shape.points" />
        <circle v-else-if="shape.kind === 'point'" :cx="shape.x" :cy="shape.y" r="4" />
        <rect
          v-else-if="shape.kind === 'rectangle'"
          :x="shape.x"
          :y="shape.y"
          :width="shape.width"
          :height="shape.height"
          :fill-opacity="shape.intensity"
        />
        <path v-else :d="shape.path" />
      </template>
    </svg>
    <p v-if="!projection.ok" role="alert">The chart could not be projected.</p>
    <table>
      <caption>Weekday deliveries</caption>
      <thead>
        <tr>
          <th scope="col">Day</th>
          <th scope="col">Deliveries</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in deliveries" :key="row.id">
          <th scope="row">{{ row.label }}</th>
          <td>{{ row.count }}</td>
        </tr>
      </tbody>
    </table>
    <p>
      Sectile projects the data; the application draws its borrowed geometry without modifying it.
      This SVG uses documentation color tokens. Heatmap intensity uses a fixed 0–30 scale, so
      updating data does not rescale the other cells. The table supplies the exact values; chart
      navigation and hit testing are not attached in this example.
    </p>
  </div>
</template>
