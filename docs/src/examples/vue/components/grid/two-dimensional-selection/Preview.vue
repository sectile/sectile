<script setup lang="ts">
import { ref } from 'vue';
import { GridCell, GridRoot, GridRow } from '@sectile/vue/grid';
const rows = [['A1', 'A2', 'A3'], ['B1', 'B2', 'B3']];
const selected = ref<string | null>('A1');
</script>

<template>
  <div><GridRoot v-model="selected" :rows="rows" label="Delivery slots"><GridRow v-for="(row, index) in rows" :key="index"><GridCell v-for="cell in row" :key="cell" :value="cell">{{ cell }}</GridCell></GridRow></GridRoot><output aria-live="polite">Selected slot: {{ selected ?? 'none' }}</output><p>Arrow keys navigate in two dimensions. Activating a cell selects its stable value.</p></div>
</template>
