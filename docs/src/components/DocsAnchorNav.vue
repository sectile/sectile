<script setup lang="ts">
import DocsRouteLink from './DocsRouteLink.vue';
defineProps<{ items: readonly { to: string; label: string }[]; label: string }>();
</script>

<template>
  <nav class="docs-anchor-nav" :aria-label="label"><DocsRouteLink v-for="item in items" :key="item.to" :to="item.to">{{ item.label }}</DocsRouteLink></nav>
</template>

<style scoped>
.docs-anchor-nav { display: flex; flex-wrap: wrap; gap: var(--docs-space-3) var(--docs-space-5); margin-top: var(--docs-space-5); color: var(--docs-accent); font-size: var(--docs-font-size-label); }
</style>
