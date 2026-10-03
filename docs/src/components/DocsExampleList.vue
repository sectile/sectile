<script setup lang="ts">
import { computed } from 'vue';
import type { ExampleDefinition } from '../examples/catalog.js';
import DocsAnchorNav from './DocsAnchorNav.vue';
import ExamplePage from './ExamplePage.vue';
const props = defineProps<{ examples: readonly ExampleDefinition[] }>();
const jumps = computed(() => props.examples.map(example => ({ to: `#${example.id}-title`, label: example.title })));
</script>

<template>
  <DocsAnchorNav v-if="examples.length > 1" :items="jumps" label="Examples on this page" />
  <div class="docs-inline-examples"><section v-for="example in examples" :key="example.id" :aria-labelledby="`${example.id}-title`"><ExamplePage :example="example" embedded /></section></div>
</template>

<style scoped>
.docs-inline-examples { display: grid; gap: var(--docs-space-7); margin-top: var(--docs-space-7); }
</style>
