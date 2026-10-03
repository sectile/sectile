<script setup lang="ts">
import { computed } from 'vue';
import DocsLink from './DocsLink.vue';
import { handleRouteClick, routeHref } from '../router.js';

const props = defineProps<{ to: string }>();
const routed = computed(() => props.to.startsWith('/') && !props.to.startsWith('//') && !props.to.includes('#'));
const href = computed(() => {
  if (!props.to.startsWith('/') || props.to.startsWith('//')) return props.to;
  const [path, hash] = props.to.split('#');
  return `${routeHref(path!)}${hash === undefined ? '' : `#${hash}`}`;
});
function click(event: MouseEvent): void { if (routed.value) handleRouteClick(event, props.to); }
</script>

<template>
  <DocsLink :href="href" @click="click"><slot /></DocsLink>
</template>
