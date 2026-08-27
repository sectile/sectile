<script setup lang="ts">
import ComponentGalleryPreview from './ComponentGalleryPreview.vue';

defineProps<{
  readonly component: string;
  readonly family: string;
  readonly familyLabel: string;
  readonly href: string;
  readonly title: string;
}>();
</script>

<template>
  <li class="component-gallery-card">
    <a class="component-gallery-card__link" :href="href">
      <ComponentGalleryPreview :component="component" :family="family" />
      <span class="component-gallery-card__body">
        <strong>{{ title }}</strong>
        <span>{{ familyLabel }}</span>
      </span>
    </a>
  </li>
</template>

<style scoped>
.component-gallery-card {
  min-width: 0;
  margin: 0;
}

.component-gallery-card__link {
  display: block;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  color: var(--vp-c-text-1) !important;
  text-decoration: none !important;
  transition: border-color 140ms ease, background-color 140ms ease;
}

.component-gallery-card__link:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}

.component-gallery-card__link:focus-visible {
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
