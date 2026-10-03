<script setup lang="ts">
import type { ExampleDefinition } from '../examples/catalog.js';
defineProps<{ fixture: ExampleDefinition['fixture'] }>();
</script>

<template><div class="docs-preview" data-docs-toc-exclude :class="`docs-preview--${fixture}`"><div class="docs-preview-layout"><slot /></div></div></template>

<style scoped>
.docs-preview {
  --docs-preview-width: var(--docs-preview-control-width);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  padding: var(--docs-space-6);
  border: var(--docs-border-width) solid var(--docs-border);
  border-radius: var(--docs-radius);
  background: var(--docs-bg);
}
.docs-preview--surface { --docs-preview-width: var(--docs-preview-surface-width); }
.docs-preview--form { --docs-preview-width: var(--docs-preview-form-width); }
.docs-preview--table,
.docs-preview--viewport,
.docs-preview--chart { --docs-preview-width: 100%; }
.docs-preview-layout { width: 100%; min-width: 0; max-width: var(--docs-preview-width); }
@media (max-width: 760px) { .docs-preview { padding: var(--docs-space-5); } }
</style>
