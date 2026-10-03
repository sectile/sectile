<script setup lang="ts">
import { onMounted, onScopeDispose, shallowRef, watch } from 'vue';
import { Primitive } from '@sectile/vue/primitive';
import DocsLink from './DocsLink.vue';
import { connectOutline, outlineRailOffset, outlineRailPath, type OutlineEntry, type OutlineWindow } from '../page-outline.js';
const props = defineProps<{ content: HTMLElement | null }>();
const entries = shallowRef<OutlineEntry[]>([]);
const visible = shallowRef({ first: -1, last: -1 });
const list = shallowRef<HTMLElement | null>(null);
const rail = shallowRef<SVGElement | null>(null);
const geometry = shallowRef({ path: '', height: 0, width: 0 });
let boundaries: number[] = [];
let viewport: OutlineWindow = { start: 0, end: 0, first: -1, last: -1 };
let stop: (() => void) | undefined;
function paint() {
  const top = outlineRailOffset(boundaries, viewport.start);
  const bottom = outlineRailOffset(boundaries, viewport.end);
  rail.value?.style?.setProperty('--docs-toc-start', `${top}px`);
  rail.value?.style?.setProperty('--docs-toc-end', `${Math.max(0, geometry.value.height - bottom)}px`);
}
function measureRail() {
  const element = list.value;
  if (!element?.getBoundingClientRect) return;
  const origin = element.getBoundingClientRect().top;
  const rows = Array.from(element.children);
  boundaries = rows.map(row => row.getBoundingClientRect().top - origin);
  boundaries.push(rows.length ? rows[rows.length - 1]!.getBoundingClientRect().bottom - origin : 0);
  const indent = Number.parseFloat(element.ownerDocument.defaultView!.getComputedStyle(element).getPropertyValue('--docs-toc-indent'));
  geometry.value = { path: outlineRailPath(entries.value, boundaries, indent), height: boundaries.at(-1) ?? 0, width: indent + 2 };
  paint();
}
onMounted(() => {
  stop = watch(() => props.content, (content, _, cleanup) => {
    entries.value = [];
    visible.value = { first: -1, last: -1 };
    viewport = { start: 0, end: 0, first: -1, last: -1 };
    boundaries = [];
    geometry.value = { path: '', height: 0, width: 0 };
    if (content) cleanup(connectOutline(content, value => { entries.value = value; }, value => {
      viewport = value;
      if (value.first !== visible.value.first || value.last !== visible.value.last) visible.value = { first: value.first, last: value.last };
      paint();
    }));
  }, { immediate: true, flush: 'post' });
  watch([list, entries], ([element], _, cleanup) => {
    if (!element?.getBoundingClientRect) return;
    const view = element.ownerDocument.defaultView;
    let disposed = false;
    let frame: number | undefined;
    const schedule = () => {
      if (!disposed && frame === undefined) frame = view!.requestAnimationFrame(() => { frame = undefined; if (!disposed) measureRail(); });
    };
    const observer = view?.ResizeObserver ? new view.ResizeObserver(schedule) : undefined;
    observer?.observe(element);
    for (const row of element.children) observer?.observe(row);
    measureRail();
    cleanup(() => { disposed = true; observer?.disconnect(); if (frame !== undefined) view!.cancelAnimationFrame(frame); });
  }, { immediate: true, flush: 'post' });
  watch(rail, paint, { flush: 'post' });
});
onScopeDispose(() => stop?.());
</script>

<template>
  <Primitive v-if="entries.length" as="nav" class="docs-toc" aria-label="On this page">
    <p class="docs-toc__title">On this page</p>
    <div class="docs-toc__body">
      <svg v-if="geometry.path" ref="rail" class="docs-toc__rail" :width="geometry.width" :height="geometry.height" aria-hidden="true">
        <path :d="geometry.path" class="docs-toc__track" />
        <path :d="geometry.path" class="docs-toc__range" />
      </svg>
      <ul ref="list"><li v-for="(entry, index) in entries" :key="entry.id"><DocsLink :href="`#${entry.id}`" class="docs-toc__link" :style="{ '--docs-toc-depth': entry.depth }" :data-visible="index >= visible.first && index <= visible.last || undefined" :aria-current="index === visible.first ? 'location' : undefined">{{ entry.label }}</DocsLink></li></ul>
    </div>
  </Primitive>
</template>

<style scoped>
.docs-toc { position: sticky; top: calc(var(--docs-header-height) + var(--docs-space-5)); align-self: start; max-height: calc(100dvh - var(--docs-header-height) - 2 * var(--docs-space-5)); overflow-y: auto; margin-top: var(--docs-page-gutter); padding-inline-end: var(--docs-space-5); font-size: var(--docs-font-size-label); }
.docs-toc__title { margin: 0 0 var(--docs-space-3); color: var(--docs-text); font-weight: 600; }
.docs-toc__body { --docs-toc-indent: var(--docs-space-3); position: relative; }
.docs-toc ul { list-style: none; margin: 0; padding: 0; }
.docs-toc__rail { --docs-toc-start: 0px; --docs-toc-end: 100%; position: absolute; inset-block-start: 0; inset-inline-start: 0; overflow: visible; pointer-events: none; fill: none; stroke-width: var(--docs-border-width); }
.docs-toc__track { stroke: var(--docs-border); }
.docs-toc__range { stroke: var(--docs-accent); clip-path: inset(var(--docs-toc-start) 0 var(--docs-toc-end) 0) view-box; }
.docs-toc__link { --docs-toc-depth: 0; display: block; min-height: var(--docs-space-6); padding: var(--docs-space-1) var(--docs-space-3); padding-inline-start: calc(var(--docs-space-3) + var(--docs-toc-depth) * var(--docs-toc-indent)); color: var(--docs-text-muted); line-height: 1.4; text-decoration: none; overflow-wrap: anywhere; }
.docs-toc__link:hover { color: var(--docs-text); text-decoration: underline; text-underline-offset: 3px; }
.docs-toc__link[data-visible] { color: var(--docs-text); }
@media (max-width: 1279px) { .docs-toc { position: static; width: calc(100% - 2 * var(--docs-page-gutter)); margin: 0 var(--docs-page-gutter); padding: var(--docs-space-5) 0 0; max-height: 220px; } }
@media (pointer: coarse) { .docs-toc__link { min-height: var(--docs-control-height); } }
</style>
