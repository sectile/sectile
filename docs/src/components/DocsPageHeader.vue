<script setup lang="ts">
withDefaults(defineProps<{ title: string; description: string; level?: 1 | 2; headingId?: string | undefined }>(), { level: 1 });
</script>

<template>
  <div class="docs-page-header"><component :is="`h${level}`" :id="headingId" class="docs-page-header__title">{{ title }}</component><p class="docs-page__lede" :class="{ 'docs-page-header__description--embedded': level === 2 }">{{ description }}</p></div>
</template>

<style scoped>
.docs-page-header__title { margin-top: 0; scroll-margin-top: calc(var(--docs-header-height) + var(--docs-space-5)); }
.docs-page-header__description--embedded { font-size: var(--docs-font-size-body); }
</style>
