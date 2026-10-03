<script setup lang="ts">
withDefaults(defineProps<{ name: 'chevron' | 'check'; size?: number; expanded?: boolean }>(), { size: 16 });
const paths = { chevron: 'm5 3 5 5-5 5', check: 'm3 8 3 3 7-7' };
</script>

<template>
  <svg class="docs-icon" :class="{ 'is-expanded': expanded }" :width="size" :height="size" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path :d="paths[name]" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
</template>

<style scoped>
.docs-icon { display: block; flex: none; }
.docs-icon.is-expanded { transform: rotate(90deg); }
</style>
