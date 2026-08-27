<script setup lang="ts">
import { computed } from 'vue';
import { pinInputExampleOptions } from '../pin-input-example-options.js';
import ComponentExamplePreview from './ComponentExamplePreview.vue';

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
      />
    </div>
  </div>
</template>

<style scoped>
.component-gallery-preview {
  --gallery-preview-scale: 0.5;
  --gallery-preview-width: 480px;
  position: relative;
  height: 168px;
  overflow: hidden;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--sectile-canvas);
  pointer-events: none;
  user-select: none;
}

.component-gallery-preview__render {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--gallery-preview-width);
  transform: translate(-50%, -50%) scale(var(--gallery-preview-scale));
  transform-origin: center;
}

.component-gallery-preview[data-component='color-picker'] {
  --gallery-preview-scale: 0.3;
  --gallery-preview-width: 720px;
}

.component-gallery-preview:is(
  [data-component='calendar'],
  [data-component='range-calendar'],
  [data-component='date-picker'],
  [data-component='date-range-picker'],
  [data-component='date-time-picker'],
  [data-component='date-time-range-picker'],
  [data-component='month-picker'],
  [data-component='month-range-picker'],
  [data-component='year-picker'],
  [data-component='year-range-picker']
) {
  --gallery-preview-scale: 0.36;
  --gallery-preview-width: 640px;
}

.component-gallery-preview:is(
  [data-component='carousel'],
  [data-component='feed'],
  [data-component='form'],
  [data-component='grid'],
  [data-component='tree-grid'],
  [data-component='tree-view'],
  [data-component='window-splitter']
) {
  --gallery-preview-scale: 0.4;
  --gallery-preview-width: 600px;
}

.component-gallery-preview[data-component='toast'] {
  --gallery-preview-scale: 0.42;
  --gallery-preview-width: 560px;
}

.component-gallery-preview :deep(.component-example-stage) {
  min-height: 0;
}
</style>
