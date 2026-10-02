<script setup lang="ts">
import { ref } from 'vue';
import { VirtualList } from '@sectile/vue/virtual/list';

const rows = Array.from({ length: 500 }, (_, index) => ({ id: index, label: `Delivery ${index + 1}` }));
const getID = (row: (typeof rows)[number]) => row.id;
const rendered = ref(0);
</script>

<template>
  <div data-example-virtual-list>
    <VirtualList :items="rows" :get-i-d="getID" :size-policy="{ kind: 'fixed', extent: 44 }" :initial-viewport="{ x: 0, y: 0, width: 360, height: 264 }" :overscan="88" aria-label="Delivery list" @plan-change="plan => rendered = plan.placements.length">
      <template #item="{ value: row }"><div data-example-virtual-row>{{ row.label }}</div></template>
      <template #empty>No deliveries.</template>
    </VirtualList>
    <output aria-live="polite">{{ rows.length }} items · {{ rendered }} mounted placements</output>
  </div>
</template>
