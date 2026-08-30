<script setup lang="ts">
import { ChartCanvas, ChartRoot, type ChartSelection, type UseChartOptions } from '../../.verification-dist/chart.js';

const options: UseChartOptions<1 | '1'> = {
  model: { layers: [{ id: 'layer', profile: 'point', data: [
    { id: 1, x: 0, y: 0 },
    { id: '1', x: 1, y: 1 },
  ] }] },
};
const selection = (value: ChartSelection<1 | '1'>): ChartSelection<1 | '1'> => value;
</script>

<template>
  <ChartRoot :options="options" v-slot="{ state, projection }">
    <ChartCanvas />
    {{ selection(state.selection).type }} · {{ projection?.diagnostics.representedDatums ?? 0 }}
  </ChartRoot>
</template>
