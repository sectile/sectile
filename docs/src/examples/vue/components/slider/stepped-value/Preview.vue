<script setup lang="ts">
import { ref } from 'vue';
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from '@sectile/vue/slider';
const volume = ref('40');
</script>

<template>
  <div data-example-range><SliderRoot v-model="volume" :min="0" :max="100" :step="5" label="Notification volume"><SliderTrack><SliderRange /><SliderThumb /></SliderTrack></SliderRoot><output aria-live="polite">Volume: {{ volume }}%</output><p>Drag the thumb or focus it and use the arrow keys. Values advance in steps of 5.</p></div>
</template>
