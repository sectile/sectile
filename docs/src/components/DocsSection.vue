<script setup lang="ts">
import { Primitive } from '@sectile/vue/primitive';
</script>

<template><Primitive as="section" class="docs-prose-section"><slot /></Primitive></template>

<style scoped>
.docs-prose-section { margin-top: var(--docs-space-7); }
.docs-prose-section > :deep(h2:not(:first-child)) { margin-top: var(--docs-space-6); }
.docs-prose-section :deep(p) { margin: var(--docs-space-4) 0; }
</style>
