<script setup lang="ts">
import DocsRouteLink from './DocsRouteLink.vue';
defineProps<{ to: string }>();
</script>
<template><DocsRouteLink class="docs-sidebar__link" :to="to"><slot /></DocsRouteLink></template>
<style scoped>
.docs-sidebar__link { display: flex; min-height: 36px; align-items: center; gap: var(--docs-space-2); padding: var(--docs-space-2) var(--docs-space-3); border-radius: var(--docs-item-radius); color: var(--docs-text-muted); font-size: var(--docs-font-size-label); text-decoration: none; }
.docs-sidebar__link:hover { background: var(--docs-hover-bg); color: var(--docs-text); }
.docs-sidebar__link[aria-current="page"] { background: var(--docs-accent-soft); color: var(--docs-accent); font-weight: 600; }
.docs-sidebar__link.is-parent { color: var(--docs-text); }
.docs-sidebar__link--nested { padding-left: var(--docs-space-6); }
@media (max-width: 760px) { .docs-sidebar__link { min-height: var(--docs-control-height); } }
</style>
