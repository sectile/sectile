<script setup lang="ts">
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from '@sectile/vue/slider';

defineProps<{
  activePart: string;
  korean: boolean;
}>();

const emit = defineEmits<{
  select: [part: string];
  hover: [part: string | null];
}>();
</script>

<template>
  <SliderRoot
    v-slot="{ value }"
    :default-value="40"
    :min="0"
    :max="100"
    :step="1"
    :label="korean ? '배포 비율' : 'Deployment traffic'"
    :format-value="(next) => `${next}%`"
    class="anatomy-slider"
    :class="{ 'anatomy-part-active': activePart === 'root' }"
    @click.self="emit('select', 'root')"
    @focus.self="emit('select', 'root')"
    @pointerenter.self="emit('hover', 'root')"
    @pointerleave="emit('hover', null)"
  >
    <span v-if="activePart === 'root'" class="anatomy-slider__part-label anatomy-part-label">root</span>
    <div class="anatomy-slider__heading">
      <strong>{{ korean ? '배포 비율' : 'Deployment traffic' }}</strong>
      <output>{{ value }}%</output>
    </div>
    <SliderTrack
      class="anatomy-slider__track"
      :class="{ 'anatomy-part-active': activePart === 'track' }"
      @pointerdown.self="emit('select', 'track')"
      @pointerenter="emit('hover', 'track')"
    >
      <span v-if="activePart === 'track'" class="anatomy-slider__part-label anatomy-part-label">track</span>
      <SliderRange
        class="anatomy-slider__range"
        :class="{ 'anatomy-part-active': activePart === 'range' }"
        @pointerdown="emit('select', 'range')"
        @pointerenter="emit('hover', 'range')"
      >
        <span v-if="activePart === 'range'" class="anatomy-slider__part-label anatomy-part-label">range</span>
      </SliderRange>
      <SliderThumb
        class="anatomy-slider__thumb"
        :class="{ 'anatomy-part-active': activePart === 'thumb' }"
        @pointerdown="emit('select', 'thumb')"
        @focus="emit('select', 'thumb')"
        @pointerenter="emit('hover', 'thumb')"
      >
        <span>{{ value }}</span>
        <span v-if="activePart === 'thumb'" class="anatomy-slider__part-label anatomy-part-label">thumb</span>
      </SliderThumb>
    </SliderTrack>
    <p class="anatomy-slider__hint">
      {{ korean
        ? '핸들을 끌거나 트랙을 클릭하세요. 방향키로도 값을 조정할 수 있습니다.'
        : 'Drag the thumb or click the track. Arrow keys adjust the focused thumb.' }}
    </p>
  </SliderRoot>
</template>

<style scoped>
.anatomy-slider {
  position: relative;
  display: grid;
  width: min(100%, 680px);
  gap: 30px;
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg);
}
.anatomy-slider__heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.anatomy-slider__heading output { font-size: 20px; font-weight: 700; }
.anatomy-slider__track {
  position: relative;
  height: 8px;
  border-radius: 999px;
  background: var(--vp-c-bg-alt);
  cursor: pointer;
  touch-action: none;
}
.anatomy-slider__range {
  position: absolute;
  inset-block: 0;
  left: 0;
  width: var(--sectile-slider-percentage);
  border-radius: inherit;
  background: var(--vp-c-brand-1);
}
.anatomy-slider__thumb {
  position: absolute;
  top: 50%;
  left: var(--sectile-slider-percentage);
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
.anatomy-slider__thumb:active { cursor: grabbing; }
.anatomy-slider__thumb:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }
.anatomy-slider__part-label {
  top: -15px;
  left: 12px;
}
.anatomy-slider__thumb .anatomy-slider__part-label { top: -24px; left: 50%; transform: translateX(-50%); }
.anatomy-slider__hint { margin: -10px 0 0; color: var(--vp-c-text-2); font-size: 12px; line-height: 1.5; }
</style>
