<script setup lang="ts">
import DocsLinkCard from './DocsLinkCard.vue';
defineProps<{ items: readonly { to: string; title: string; description: string }[] }>();
</script>

<template>
  <div class="docs-link-list"><DocsLinkCard v-for="item in items" :key="item.to" v-bind="item" /></div>
</template>

<style scoped>
.docs-link-list { margin-top: var(--docs-space-5); }
</style>
