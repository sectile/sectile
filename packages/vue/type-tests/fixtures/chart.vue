<script setup lang="ts">
import type { ChartViewState } from '@sectile/chart/contract';
import type { ChartSelection } from '@sectile/chart/interaction';
import { ref } from 'vue';
import {
  ChartAxisView,
  ChartBar,
  ChartCartesian,
  ChartDonut,
  ChartGridLines,
  ChartHeatmap,
  ChartLegend,
  ChartLine,
  ChartNavigation,
  ChartPanControl,
  ChartPie,
  ChartPlot,
  ChartRadial,
  ChartRenderer,
  ChartResetView,
  ChartRoot,
  ChartScatter,
  ChartTicks,
  ChartViewControls,
  ChartXAxis,
  ChartYAxis,
  ChartZoomControl,
} from '../../.verification-dist/chart.js';

type ID = number | 'month' | 'revenue' | 'sales' | 'forecast' | 'accounts' | 'density' | 'region-share' | 'channel-share';

const sales = [
  { id: 1, month: new Date('2026-01-01T00:00:00Z'), revenue: 120 },
  { id: 2, month: Date.parse('2026-02-01T00:00:00Z'), revenue: 148 },
] as const;
const forecast = sales.map((datum) => ({ ...datum, id: datum.id + 10, revenue: datum.revenue * 1.08 }));
const accounts = sales.map((datum) => ({ ...datum, id: datum.id + 20 }));
const density = sales.map((datum) => ({ ...datum, id: datum.id + 30, value: datum.revenue }));
const shares = [
  { id: 101, label: 'Enterprise', value: 72 },
  { id: 102, label: 'SMB', value: 28 },
] as const;
const channelShares = shares.map((datum) => ({ ...datum, id: datum.id + 100 }));
const selection = ref<ChartSelection<ID>>({ type: 'points', ids: [] });
const view = ref<ChartViewState<ID> | null>(null);
</script>

<template>
  <ChartRoot v-model="selection" v-model:view="view">
    <ChartCartesian>
      <ChartXAxis id="month" scale="temporal" field="month" label="Month">
        <ChartTicks />
        <ChartAxisView update="follow-end" />
        <ChartViewControls>
          <ChartPanControl direction="backward">Earlier</ChartPanControl>
          <ChartPanControl direction="forward">Later</ChartPanControl>
          <ChartZoomControl direction="in">Zoom in</ChartZoomControl>
          <ChartZoomControl direction="out">Zoom out</ChartZoomControl>
          <ChartResetView to="latest">Latest</ChartResetView>
        </ChartViewControls>
      </ChartXAxis>
      <ChartYAxis id="revenue" field="revenue" label="Revenue" unit="USD" />
      <ChartGridLines />
      <ChartLine id="sales" :data="sales" x-axis="month" y-axis="revenue" label="Actual" />
      <ChartScatter id="forecast" :data="forecast" x-axis="month" y-axis="revenue" projection="density" />
      <ChartBar id="accounts" :data="accounts" x-axis="month" y-axis="revenue" />
      <ChartHeatmap id="density" :data="density" x-axis="month" y-axis="revenue" />
      <ChartNavigation :axes="['month']" drag="pan" wheel="zoom" keyboard />
    </ChartCartesian>
    <ChartLegend />
    <ChartPlot><ChartRenderer /></ChartPlot>
  </ChartRoot>

  <ChartRoot>
    <ChartRadial>
      <ChartPie id="region-share" :data="shares" />
      <ChartDonut id="channel-share" :data="channelShares" :inner-radius="0.6" />
    </ChartRadial>
    <ChartLegend />
    <ChartPlot><ChartRenderer /></ChartPlot>
  </ChartRoot>
</template>
