<script setup lang="ts">
import { ref } from 'vue';
import {
  MultiThumbSliderRange,
  MultiThumbSliderRoot,
  MultiThumbSliderThumb,
  MultiThumbSliderTrack,
} from '@sectile/vue/multi-thumb-slider';
const thumbs = ['minimum', 'maximum'];
const values = ref<readonly string[]>(['20', '80']);
</script>

<template>
  <div data-example-range>
    <MultiThumbSliderRoot
      v-model="values"
      :thumbs="thumbs"
      :min="0"
      :max="100"
      :step="5"
      label="Price interval"
      :get-thumb-label="(id) => (id === 'minimum' ? 'Minimum price' : 'Maximum price')"
    >
      <MultiThumbSliderTrack>
        <MultiThumbSliderRange />
        <MultiThumbSliderThumb v-for="thumb in thumbs" :key="thumb" :value="thumb" />
      </MultiThumbSliderTrack>
    </MultiThumbSliderRoot>
    <output aria-live="polite">Interval: {{ values.join(' – ') }}</output>
    <p>Each thumb has an accessible name and its own keyboard target.</p>
  </div>
</template>
