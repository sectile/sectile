<script setup lang="ts">
import DocsRouteLink from './DocsRouteLink.vue';
defineProps<{ items: readonly { to: string; label: string }[] }>();
</script>

<template>
  <nav class="docs-breadcrumb" aria-label="Breadcrumb"><template v-for="(item, index) in items" :key="item.to"><span v-if="index" aria-hidden="true">/</span><DocsRouteLink :to="item.to">{{ item.label }}</DocsRouteLink></template></nav>
</template>

<style scoped>
.docs-breadcrumb { display: flex; flex-wrap: wrap; gap: var(--docs-space-3); margin-bottom: var(--docs-space-5); color: var(--docs-text-muted); font-size: var(--docs-font-size-code); }
.docs-breadcrumb :deep(a) { text-decoration: none; }
.docs-breadcrumb :deep(a:hover) { color: var(--docs-accent); }
</style>
