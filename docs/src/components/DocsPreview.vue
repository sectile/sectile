<script setup lang="ts">
import type { ExampleDefinition } from '../examples/catalog.js';
defineProps<{ fixture: ExampleDefinition['fixture'] }>();
</script>

<template><div class="docs-preview" data-docs-toc-exclude :class="`docs-preview--${fixture}`"><div class="docs-preview-layout"><slot /></div></div></template>

<style scoped>
.docs-preview { display: grid; min-height: 240px; place-items: center; padding: var(--docs-space-6); border: var(--docs-border-width) solid var(--docs-border); border-radius: var(--docs-radius); background: var(--docs-bg); }
.docs-preview-layout { min-width: 0; max-width: 100%; }
@media (max-width: 760px) { .docs-preview { padding: var(--docs-space-5); } }
</style>
