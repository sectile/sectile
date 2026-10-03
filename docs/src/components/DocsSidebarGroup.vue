<script setup lang="ts">defineProps<{ label: string }>();</script>
<template><div class="docs-sidebar__group"><p class="docs-sidebar__label">{{ label }}</p><slot /></div></template>
<style scoped>
.docs-sidebar__group + .docs-sidebar__group { margin-top: var(--docs-space-6); }
.docs-sidebar__label { margin: 0 var(--docs-space-3) var(--docs-space-2); color: var(--docs-text); font-size: var(--docs-font-size-caption); font-weight: 650; }
</style>
