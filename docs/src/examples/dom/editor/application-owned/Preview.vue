<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue';
import { mountExample } from './example.js';

const root = useTemplateRef<HTMLElement>('root');
let cleanup: (() => void) | undefined;

onMounted(() => {
  if (root.value !== null) cleanup = mountExample(root.value);
});

onBeforeUnmount(() => cleanup?.());
</script>

<template>
  <div ref="root" />
</template>
