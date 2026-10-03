<script setup lang="ts">
import { Primitive } from '@sectile/vue/primitive';
withDefaults(defineProps<{ live?: boolean; tone?: 'neutral' | 'error' }>(), { live: false, tone: 'neutral' });
</script>

<template>
  <Primitive as="p" class="docs-notice" :class="`docs-notice--${tone}`" :role="live ? 'status' : undefined"><slot /></Primitive>
</template>

<style scoped>
.docs-notice { margin: var(--docs-space-4) 0 0; color: var(--docs-text-muted); font-size: var(--docs-font-size-label); }
.docs-notice--error { color: var(--docs-error); }
</style>
