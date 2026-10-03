<script setup lang="ts">
import DocsRouteLink from './DocsRouteLink.vue';
withDefaults(defineProps<{ to: string; title: string; description: string; stacked?: boolean }>(), { stacked: false });
</script>

<template>
  <DocsRouteLink :to="to" class="docs-link-card" :class="{ 'is-stacked': stacked }"><strong>{{ title }}</strong><span>{{ description }}</span></DocsRouteLink>
</template>

<style scoped>
.docs-link-card { display: grid; grid-template-columns: 160px minmax(0, 1fr); align-items: baseline; gap: var(--docs-space-4); padding-block: var(--docs-space-4); color: var(--docs-accent); text-decoration: none; }
.docs-link-card strong { color: var(--docs-text); font-size: var(--docs-font-size-label); font-weight: 600; }
.docs-link-card span { color: var(--docs-text-muted); font-size: var(--docs-font-size-label); }
.docs-link-card:hover strong { text-decoration: underline; text-underline-offset: 3px; }
.docs-link-card.is-stacked { grid-template-columns: 1fr; gap: var(--docs-space-1); margin-block: var(--docs-space-5); }
@media (max-width: 760px) { .docs-link-card { grid-template-columns: 1fr; gap: var(--docs-space-1); } }
</style>
