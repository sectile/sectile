<script setup lang="ts">
import ComponentGalleryPreview from './ComponentGalleryPreview.vue';

defineProps<{
  readonly component: string;
  readonly familyLabel: string;
  readonly href: string;
  readonly scenario: string;
  readonly title: string;
}>();
</script>

<template>
  <li class="component-gallery-card">
    <ComponentGalleryPreview :component="component" :scenario="scenario" />
    <span class="component-gallery-card__body">
      <strong>{{ title }}</strong>
      <span>{{ familyLabel }}</span>
    </span>
    <a class="component-gallery-card__link" :href="href" :aria-label="title" />
  </li>
</template>

<style scoped>
.component-gallery-card {
  position: relative;
  isolation: isolate;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg);
  transition: border-color 140ms ease, background-color 140ms ease;
}

.component-gallery-card:has(.component-gallery-card__link:hover) {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}

.component-gallery-card__link {
  position: absolute;
  z-index: 2;
  inset: 0;
}

.component-gallery-card:has(.component-gallery-card__link:focus-visible) {
  outline: 3px solid var(--vp-c-brand-soft);
  outline-offset: 3px;
}

.component-gallery-card__body {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 15px;
}

.component-gallery-card__body strong {
  min-width: 0;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.35;
}

.component-gallery-card__body span {
  flex: none;
  color: var(--vp-c-text-3);
  font-size: 11px;
  line-height: 1.35;
}
</style>
