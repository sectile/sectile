<script setup lang="ts">
import { Primitive } from '@sectile/vue/primitive';
defineProps<{ headers: readonly string[]; rows: readonly (readonly string[])[] }>();
</script>

<template>
  <Primitive as="table" class="docs-table"><thead><tr><th v-for="header in headers" :key="header" scope="col">{{ header }}</th></tr></thead><tbody><tr v-for="(row, index) in rows" :key="index"><component :is="column === 0 ? 'th' : 'td'" v-for="(value, column) in row" :key="column" :scope="column === 0 ? 'row' : undefined"><slot name="cell" :value="value" :column="column">{{ value }}</slot></component></tr></tbody></Primitive>
</template>

<style scoped>
.docs-table { width: 100%; table-layout: fixed; border-collapse: collapse; margin-block: var(--docs-space-4); text-align: left; font-size: var(--docs-font-size-label); }
.docs-table th, .docs-table td { padding: var(--docs-space-3); vertical-align: top; overflow-wrap: anywhere; }
.docs-table th:first-child { width: 36%; padding-inline-start: 0; }
.docs-table td:last-child { padding-inline-end: 0; }
.docs-table thead { color: var(--docs-text-muted); border-bottom: var(--docs-border-width) solid var(--docs-border); }
.docs-table tbody th { font-weight: 400; }
.docs-table :deep(kbd) { font-family: var(--docs-font-mono); font-size: var(--docs-font-size-code); }
</style>
