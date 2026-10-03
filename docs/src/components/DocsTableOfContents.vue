<script setup lang="ts">
import { onMounted, onScopeDispose, shallowRef, watch } from 'vue';
import { Primitive } from '@sectile/vue/primitive';
import DocsLink from './DocsLink.vue';
import { connectOutline, type OutlineEntry } from '../page-outline.js';
const props = defineProps<{ content: HTMLElement | null }>();
const entries = shallowRef<OutlineEntry[]>([]);
const active = shallowRef('');
let stop: (() => void) | undefined;
onMounted(() => {
  stop = watch(() => props.content, (content, _, cleanup) => {
    entries.value = [];
    active.value = '';
    if (content) cleanup(connectOutline(content, value => { entries.value = value; }, id => { active.value = id; }));
  }, { immediate: true, flush: 'post' });
});
onScopeDispose(() => stop?.());
</script>

<template>
  <Primitive v-if="entries.length" as="nav" class="docs-toc" aria-label="On this page">
    <p class="docs-toc__title">On this page</p>
    <ul><li v-for="entry in entries" :key="entry.id"><DocsLink :href="`#${entry.id}`" class="docs-toc__link" :style="{ '--docs-toc-depth': entry.depth }" :aria-current="active === entry.id ? 'location' : undefined">{{ entry.label }}</DocsLink></li></ul>
  </Primitive>
</template>

<style scoped>
.docs-toc { position: sticky; top: calc(var(--docs-header-height) + var(--docs-space-5)); align-self: start; max-height: calc(100dvh - var(--docs-header-height) - 2 * var(--docs-space-5)); overflow-y: auto; margin-top: var(--docs-page-gutter); padding-inline-end: var(--docs-space-5); font-size: var(--docs-font-size-label); }
.docs-toc__title { margin: 0 0 var(--docs-space-3); color: var(--docs-text); font-weight: 600; }
.docs-toc ul { list-style: none; margin: 0; padding: 0; border-inline-start: var(--docs-border-width) solid var(--docs-border); }
.docs-toc__link { --docs-toc-depth: 0; display: block; min-height: var(--docs-space-6); padding: var(--docs-space-1) var(--docs-space-3); padding-inline-start: calc(var(--docs-space-3) * (1 + var(--docs-toc-depth))); margin-inline-start: calc(-1 * var(--docs-border-width)); border-inline-start: var(--docs-border-width) solid transparent; color: var(--docs-text-muted); line-height: 1.4; text-decoration: none; overflow-wrap: anywhere; }
.docs-toc__link:hover { color: var(--docs-text); text-decoration: underline; text-underline-offset: 3px; }
.docs-toc__link[aria-current] { border-inline-start-color: var(--docs-focus); color: var(--docs-text); }
@media (max-width: 1279px) { .docs-toc { position: static; width: calc(100% - 2 * var(--docs-page-gutter)); margin: 0 var(--docs-page-gutter); padding: var(--docs-space-5) 0 0; max-height: 220px; } }
@media (pointer: coarse) { .docs-toc__link { min-height: var(--docs-control-height); } }
</style>
