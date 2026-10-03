<script setup lang="ts">
import { ref } from 'vue';
import {
  CarouselIndicator,
  CarouselIndicatorGroup,
  CarouselNext,
  CarouselPrevious,
  CarouselRoot,
  CarouselSlide,
  CarouselTrack,
  CarouselViewport,
} from '@sectile/vue/carousel';
const slides = ['Standard', 'Express', 'Collection'];
const selected = ref<string | null>('Standard');
const descriptions: Record<string, string> = {
  Standard: 'Delivered within three working days.',
  Express: 'Delivered on the next working day.',
  Collection: 'Collect from your nearest service point.',
};
</script>

<template>
  <div class="crossfade-demo">
    <CarouselRoot v-model="selected" :slides="slides" label="Delivery services">
      <CarouselViewport>
        <CarouselTrack class="crossfade-demo__track">
          <CarouselSlide
            v-for="slide in slides"
            :key="slide"
            :value="slide"
            class="crossfade-demo__slide"
          >
            <strong>{{ slide }}</strong>
            <p>{{ descriptions[slide] }}</p>
          </CarouselSlide>
        </CarouselTrack>
      </CarouselViewport>
      <div class="crossfade-demo__controls">
        <CarouselPrevious>Previous</CarouselPrevious>
        <CarouselIndicatorGroup>
          <CarouselIndicator v-for="slide in slides" :key="slide" :value="slide">
            {{ slide }}
          </CarouselIndicator>
        </CarouselIndicatorGroup>
        <CarouselNext>Next</CarouselNext>
      </div>
    </CarouselRoot>
    <output aria-live="polite">Active service: {{ selected }}</output>
    <p>An outgoing slide stays present but inert during its fade. There is no autoplay.</p>
  </div>
</template>
