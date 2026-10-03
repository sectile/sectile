<script setup lang="ts">
import type { ExampleDefinition } from '../examples/catalog.js';
import ExamplePage from './ExamplePage.vue';
defineProps<{ examples: readonly ExampleDefinition[] }>();
</script>

<template>
  <div class="docs-inline-examples"><section v-for="example in examples" :key="example.id" :aria-labelledby="`${example.id}-title`"><ExamplePage :example="example" embedded /></section></div>
</template>

<style scoped>
.docs-inline-examples { display: grid; gap: var(--docs-space-7); margin-top: var(--docs-space-7); }
</style>
