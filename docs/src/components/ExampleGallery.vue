<script setup lang="ts">
import { computed } from 'vue';
import type { ExampleDefinition } from '../examples/catalog.js';
import DocsExampleCard from './DocsExampleCard.vue';
const props = defineProps<{ examples: readonly ExampleDefinition[]; componentIndex?: boolean }>();
const entries = computed(() => props.componentIndex
  ? props.examples.filter((example, index, all) => all.findIndex(entry => entry.subject === example.subject) === index)
  : props.examples);
</script>

<template>
  <div class="docs-example-grid"><DocsExampleCard v-for="example in entries" :key="example.id" :example="example" :component-index="componentIndex" :count="examples.filter(entry => entry.subject === example.subject).length" /></div>
</template>

<style scoped>
.docs-example-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--docs-space-5);
  margin-top: var(--docs-space-6);
}


@media (max-width: 760px) { .docs-example-grid { gap: var(--docs-space-5); } }
@media (max-width: 520px) { .docs-example-grid { grid-template-columns: 1fr; } }
</style>
