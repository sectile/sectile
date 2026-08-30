<script setup lang="ts">
import type { ChartSelection } from '@sectile/chart/interaction';
import { ChartCanvas, ChartRoot, type UseChartOptions } from '../../.verification-dist/chart.js';

type ID = 'layer' | 1 | '1';

const options: UseChartOptions<ID> = {
  model: { layers: [{ id: 'layer', profile: 'point', data: [
    { id: 1, x: 0, y: 0 },
    { id: '1', x: 1, y: 1 },
  ] }] },
};
const selection = (value: ChartSelection<ID>): ChartSelection<ID> => value;
</script>

<template>
  <ChartRoot :options="options" v-slot="{ state, projection }">
    <ChartCanvas />
    {{ selection(state.selection).type }} · {{ projection?.diagnostics.representedDatums ?? 0 }}
  </ChartRoot>
</template>
