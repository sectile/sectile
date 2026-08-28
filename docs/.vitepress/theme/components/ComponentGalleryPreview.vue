<script setup lang="ts">
import { computed, defineAsyncComponent, hydrateOnVisible } from 'vue';
import { pinInputExampleOptions } from '../pin-input-example-options.js';

const ComponentExamplePreview = defineAsyncComponent({
  loader: () => import('./ComponentExamplePreview.vue'),
  hydrate: hydrateOnVisible({ rootMargin: '720px 0px' }),
});

const props = defineProps<{
  readonly component: string;
  readonly scenario: string;
}>();

const pinOptions = computed(() => props.component === 'pin-input'
  ? pinInputExampleOptions(props.scenario)
  : undefined);
</script>

<template>
  <div
    class="component-gallery-preview"
    :data-component="component"
    aria-hidden="true"
    inert
  >
    <div class="component-gallery-preview__render">
      <ComponentExamplePreview
        :component="component"
        :scenario="scenario"
        title=""
        description=""
        :pin-input-options="pinOptions"
        preview
      />
    </div>
  </div>
</template>

<style scoped>
.component-gallery-preview {
  position: relative;
  height: 360px;
  overflow: hidden;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--sectile-canvas);
  pointer-events: none;
  user-select: none;
}

.component-gallery-preview__render {
  width: 100%;
  height: 100%;
}

.component-gallery-preview :deep(.component-example-stage) {
  min-height: 360px;
}
</style>
