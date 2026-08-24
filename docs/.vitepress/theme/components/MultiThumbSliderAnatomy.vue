<script setup lang="ts">
import {
  MultiThumbSliderRange,
  MultiThumbSliderRoot,
  MultiThumbSliderThumb,
  MultiThumbSliderTrack,
} from '@sectile/vue/multi-thumb-slider';
import { ref } from 'vue';

defineProps<{
  activePart: string;
  korean: boolean;
}>();

const emit = defineEmits<{
  select: [part: string];
  hover: [part: string | null];
}>();

const thumbs = ['minimum', 'maximum'] as const;
const selectedThumb = ref<string | null>(null);
const hoveredThumb = ref<string | null>(null);

function select(part: string, instance: string | null = null): void {
  selectedThumb.value = part === 'thumb' ? instance : null;
  emit('select', part);
}

function hover(part: string | null, instance: string | null = null): void {
  hoveredThumb.value = part === 'thumb' ? instance : null;
  emit('hover', part);
}
</script>

<template>
  <MultiThumbSliderRoot
    v-slot="{ values }"
    :thumbs="thumbs"
    :default-value="[30, 72]"
    :min="0"
    :max="100"
    :step="1"
    :label="korean ? '가격 범위' : 'Price range'"
    :get-thumb-label="(id) => id === 'minimum'
      ? (korean ? '최저 가격' : 'Minimum price')
      : (korean ? '최고 가격' : 'Maximum price')"
    :format-value="(value) => `$${value}`"
    class="anatomy-multi-thumb"
    :class="{ 'anatomy-part-active': activePart === 'root' }"
    @click.self="select('root')"
    @focus.self="select('root')"
    @pointerenter.self="hover('root')"
    @pointerleave="hover(null)"
  >
    <span v-if="activePart === 'root'" class="anatomy-multi-thumb__part-label anatomy-part-label">root</span>

    <div class="anatomy-multi-thumb__heading">
      <strong>{{ korean ? '가격 범위' : 'Price range' }}</strong>
      <output :aria-label="korean ? '선택한 가격 범위' : 'Selected price range'">
        ${{ values[0] }} – ${{ values[1] }}
      </output>
    </div>

    <MultiThumbSliderTrack
      class="anatomy-multi-thumb__track"
      :class="{ 'anatomy-part-active': activePart === 'track' }"
      @pointerdown.self="select('track')"
      @pointerenter="hover('track')"
    >
      <span v-if="activePart === 'track'" class="anatomy-multi-thumb__part-label anatomy-part-label">track</span>
      <MultiThumbSliderRange
        class="anatomy-multi-thumb__range"
        :class="{ 'anatomy-part-active': activePart === 'range' }"
        @pointerdown="select('range')"
        @pointerenter="hover('range')"
      >
        <span v-if="activePart === 'range'" class="anatomy-multi-thumb__part-label anatomy-part-label">range</span>
      </MultiThumbSliderRange>
      <MultiThumbSliderThumb
        v-for="(thumb, index) in thumbs"
        :key="thumb"
        :value="thumb"
        class="anatomy-multi-thumb__thumb"
        :class="{
          'anatomy-part-active': activePart === 'thumb' && (hoveredThumb ?? selectedThumb) === thumb,
        }"
        @pointerdown="select('thumb', thumb)"
        @focus="select('thumb', thumb)"
        @pointerenter="hover('thumb', thumb)"
      >
        <span>${{ values[index] }}</span>
        <span v-if="activePart === 'thumb' && (hoveredThumb ?? selectedThumb) === thumb" class="anatomy-multi-thumb__part-label anatomy-part-label">thumb</span>
      </MultiThumbSliderThumb>
    </MultiThumbSliderTrack>

    <p class="anatomy-multi-thumb__hint">
      {{ korean
        ? '핸들을 끌거나 트랙을 클릭하세요. 핸들에 초점을 둔 뒤 방향키로도 조정할 수 있습니다.'
        : 'Drag a thumb or click the track. Focused thumbs also respond to the arrow keys.' }}
    </p>
  </MultiThumbSliderRoot>
</template>

<style scoped>
.anatomy-multi-thumb {
  position: relative;
  display: grid;
  width: min(100%, 680px);
  gap: 30px;
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg);
}

.anatomy-multi-thumb__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.anatomy-multi-thumb__heading output {
  font-size: 20px;
  font-weight: 700;
}

.anatomy-multi-thumb__track {
  position: relative;
  height: 8px;
  border-radius: 999px;
  background: var(--vp-c-bg-alt);
  cursor: pointer;
  touch-action: none;
}

.anatomy-multi-thumb__range {
  position: absolute;
  inset-block: 0;
  left: var(--sectile-range-start);
  right: calc(100% - var(--sectile-range-end));
  border-radius: inherit;
  background: var(--vp-c-brand-1);
}

.anatomy-multi-thumb__thumb {
  position: absolute;
  top: 50%;
  left: var(--sectile-thumb-percentage);
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 3px solid var(--vp-c-brand-1);
  border-radius: 50%;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 9px;
  cursor: grab;
  touch-action: none;
  transform: translate(-50%, -50%);
}

.anatomy-multi-thumb__thumb:active { cursor: grabbing; }
.anatomy-multi-thumb__thumb:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }

.anatomy-multi-thumb__part-label {
  top: -15px;
  left: 12px;
}

.anatomy-multi-thumb__thumb .anatomy-multi-thumb__part-label {
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
}

.anatomy-multi-thumb__hint {
  margin: -10px 0 0;
  color: var(--vp-c-text-2);
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 640px) {
  .anatomy-multi-thumb { padding: 20px 18px; }
  .anatomy-multi-thumb__heading output { font-size: 17px; }
}
</style>
