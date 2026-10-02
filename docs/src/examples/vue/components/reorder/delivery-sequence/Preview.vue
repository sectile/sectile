<script setup lang="ts">
import { ref } from 'vue';
import { SequenceReorderItem, SequenceReorderRoot } from '@sectile/vue/reorder';

const order = ref<readonly string[]>(['reception', 'warehouse', 'office']);
const labels: Record<string, string> = { reception: 'Reception', warehouse: 'Warehouse', office: 'Office' };
</script>

<template>
  <div data-example-reorder>
    <SequenceReorderRoot v-slot="sequence" v-model:items="order" aria-label="Delivery stop order">
      <SequenceReorderItem v-for="id in sequence.items" :key="id" v-slot="item" :value="id">
        <span aria-hidden="true">⋮⋮</span><span>{{ item.position }}. {{ labels[id] }}</span>
      </SequenceReorderItem>
    </SequenceReorderRoot>
    <output aria-live="polite">Order: {{ order.map(id => labels[id]).join(' → ') }}</output>
    <p>Drag a stop to reorder it. With a stop focused, Alt+ArrowUp or Alt+ArrowDown moves it; Alt+Home and Alt+End move it to a boundary.</p>
  </div>
</template>
