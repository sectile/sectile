<script setup lang="ts">
import { computed } from 'vue';
import { ProgressIndicator, ProgressRoot, ProgressTrack, ProgressValueText } from '@sectile/vue/progress';

const props = defineProps<{
  readonly value: number;
  readonly max: number;
  readonly label: string;
  readonly detail?: string;
}>();

const progressScale = computed(() => Math.max(0, Math.min(1, props.value / Math.max(1, props.max))));
const percentage = computed(() => Math.round(progressScale.value * 100));
</script>

<template>
  <ProgressRoot
    :value="value"
    :max="max"
    :label="label"
    class="demo-progress"
    :format-value="() => `${percentage}%`"
  >
    <div class="demo-progress__meta">
      <strong>{{ label }}</strong>
      <ProgressValueText class="demo-progress__value" />
    </div>
    <ProgressTrack class="demo-progress__track">
      <ProgressIndicator class="demo-progress__indicator" :style="{ transform: `scaleX(${progressScale})` }" />
    </ProgressTrack>
    <p v-if="detail">{{ detail }}</p>
  </ProgressRoot>
</template>

<style scoped>
.demo-progress {
  display: grid;
  gap: .75rem;
}

.demo-progress__meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  color: var(--sectile-content-secondary);
  font-size: .78rem;
  font-variant-numeric: tabular-nums;
}

.demo-progress__meta strong {
  color: var(--sectile-content-primary);
}

.demo-progress__value {
  display: inline-block;
  width: 4ch;
  flex: 0 0 4ch;
  color: var(--sectile-content-primary);
  font-weight: 700;
  text-align: right;
}

.demo-progress__track {
  display: block;
  height: .65rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--sectile-border-subtle);
}

.demo-progress__indicator {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: var(--sectile-action);
  transform-origin: left center;
  transition: transform var(--sectile-motion-standard) var(--sectile-ease-standard);
}

.demo-progress p {
  margin: 0;
  color: var(--sectile-content-secondary);
  font-size: .78rem;
}

@media (prefers-reduced-motion: reduce) {
  .demo-progress__indicator { transition: none; }
}
</style>
