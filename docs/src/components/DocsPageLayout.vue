<script setup lang="ts">
import { shallowRef } from 'vue';
import DocsTableOfContents from './DocsTableOfContents.vue';
const content = shallowRef<HTMLElement | null>(null);
</script>

<template>
  <div class="docs-page-layout"><DocsTableOfContents :content="content" /><article ref="content" class="docs-page"><div class="docs-page__inner"><slot /></div></article></div>
</template>

<style scoped>
.docs-page-layout { display: grid; grid-template-columns: minmax(0, 1fr) var(--docs-toc-width); align-items: start; }
.docs-page { min-width: 0; grid-column: 1; grid-row: 1; }
.docs-page-layout > :deep(.docs-toc) { grid-column: 2; grid-row: 1; }
.docs-page :deep(h2), .docs-page :deep(h3) { scroll-margin-top: calc(var(--docs-header-height) + var(--docs-space-5)); }
@media (max-width: 1279px) { .docs-page-layout { display: flex; flex-direction: column; } .docs-page { width: 100%; } }
</style>
