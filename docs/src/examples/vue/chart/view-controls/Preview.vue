<script setup lang="ts">
import { shallowRef } from 'vue';
import { ChartAxisView, ChartCartesian, ChartLine, ChartNavigation, ChartPanControl, ChartPlot, ChartRenderer, ChartResetView, ChartRoot, ChartViewControls, ChartXAxis, ChartYAxis, ChartZoomControl } from '@sectile/vue/chart';

const deliveries = shallowRef(Array.from({ length: 10 }, (_, index) => ({ id: `day-${index + 1}`, day: index + 1, count: 12 + (index * 7) % 18 })));
</script>

<template>
  <div data-example-chart>
    <ChartRoot v-slot="{ state }" :dom="{ accessibilityLabel: 'Delivery history with view controls', getAccessibleDatumLabel: id => { const row = deliveries.find(point => point.id === id); return row ? `Day ${row.day}: ${row.count} deliveries` : String(id); } }">
      <ChartCartesian>
        <ChartXAxis id="day" field="day" :domain="{ kind: 'numeric', minimum: 1, maximum: 10 }">
          <ChartAxisView :initial="{ kind: 'continuous', minimum: 1, maximum: 5 }" :minimum-span="1" />
        </ChartXAxis>
        <ChartYAxis id="count" field="count" :domain="{ kind: 'numeric', minimum: 0, maximum: 30 }" />
        <ChartLine id="deliveries" :data="deliveries" x-axis="day" y-axis="count" />
        <ChartNavigation :axes="['day']" drag="pan" wheel="zoom" wheel-modifier="control" keyboard />
      </ChartCartesian>
      <ChartViewControls axis="day" data-example-control-row>
        <ChartPanControl direction="backward" :step="0.5">Earlier</ChartPanControl>
        <ChartPanControl direction="forward" :step="0.5">Later</ChartPanControl>
        <ChartZoomControl direction="in">Zoom in</ChartZoomControl>
        <ChartZoomControl direction="out">Zoom out</ChartZoomControl>
        <ChartResetView>Reset range</ChartResetView>
      </ChartViewControls>
      <ChartPlot><ChartRenderer /></ChartPlot>
      <output aria-live="polite">{{ state?.view ? JSON.stringify(state.view.axes.map(axis => ({ axis: axis.axisID, visible: axis.visible }))) : 'The initial range is applied after mounting.' }}</output>
    </ChartRoot>
    <p>Only the day axis moves. Its initial range is days 1–5 and its minimum span is one day. Drag to pan, use Control+wheel to zoom, or use the buttons; an ordinary wheel keeps native page scrolling. Reset returns to the initial range.</p>
  </div>
</template>
