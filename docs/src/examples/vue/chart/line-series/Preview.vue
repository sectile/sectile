<script setup lang="ts">
import { shallowRef } from 'vue';
import {
  ChartCartesian,
  ChartLine,
  ChartNavigation,
  ChartPlot,
  ChartRenderer,
  ChartRoot,
  ChartXAxis,
  ChartYAxis,
} from '@sectile/vue/chart';

const deliveries = shallowRef([
  { id: 'mon', day: 1, count: 12 },
  { id: 'tue', day: 2, count: 18 },
  { id: 'wed', day: 3, count: 14 },
  { id: 'thu', day: 4, count: 24 },
  { id: 'fri', day: 5, count: 20 },
]);
</script>

<template>
  <div data-example-chart>
    <ChartRoot
      :dom="{
        accessibilityLabel: 'Weekday deliveries',
        getAccessibleDatumLabel: (id) => {
          const row = deliveries.find((point) => point.id === id);
          return row ? `Day ${row.day}: ${row.count} deliveries` : String(id);
        },
      }"
    >
      <ChartCartesian>
        <ChartXAxis id="day" field="day" label="Weekday" />
        <ChartYAxis id="count" field="count" label="Deliveries" />
        <ChartLine
          id="deliveries"
          :data="deliveries"
          x-axis="day"
          y-axis="count"
          label="Deliveries"
        />
        <ChartNavigation keyboard />
      </ChartCartesian>
      <ChartPlot><ChartRenderer /></ChartPlot>
    </ChartRoot>
    <p>The canvas is drawn after mounting. Keyboard navigation exposes a label for each record.</p>
  </div>
</template>
