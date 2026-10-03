<script setup lang="ts">
import { ref } from 'vue';
import { CarouselIndicator, CarouselIndicatorGroup, CarouselNext, CarouselPrevious, CarouselRoot, CarouselSlide, CarouselTrack, CarouselViewport } from '@sectile/vue/carousel';
const slides = ['Standard', 'Express', 'Collection'];
const selected = ref<string | null>('Standard');
const descriptions: Record<string, string> = { Standard: 'Delivered within three working days.', Express: 'Delivered on the next working day.', Collection: 'Collect from your nearest service point.' };
</script>

<template>
  <div class="crossfade-demo"><CarouselRoot v-model="selected" :slides="slides" label="Delivery services"><CarouselViewport><CarouselTrack class="crossfade-demo__track"><CarouselSlide v-for="slide in slides" :key="slide" :value="slide" class="crossfade-demo__slide"><strong>{{ slide }}</strong><p>{{ descriptions[slide] }}</p></CarouselSlide></CarouselTrack></CarouselViewport><div class="crossfade-demo__controls"><CarouselPrevious>Previous</CarouselPrevious><CarouselIndicatorGroup><CarouselIndicator v-for="slide in slides" :key="slide" :value="slide">{{ slide }}</CarouselIndicator></CarouselIndicatorGroup><CarouselNext>Next</CarouselNext></div></CarouselRoot><output aria-live="polite">Active service: {{ selected }}</output><p>An outgoing slide stays present but inert during its fade. There is no autoplay.</p></div>
</template>

<style scoped>
.crossfade-demo { width: min(100%, 440px); color: var(--docs-text, #171717); }
.crossfade-demo__track { display: grid; min-height: 160px; }
.crossfade-demo__slide { grid-area: 1 / 1; padding: var(--docs-space-5, 24px); border-radius: var(--docs-radius, 12px); background: var(--docs-bg-muted, #fafafa); opacity: 1; transition: opacity var(--docs-motion-presence, 600ms) var(--docs-ease-out, ease-out); }
.crossfade-demo__slide[data-state="inactive"] { opacity: 0; }
.crossfade-demo__slide p { margin: var(--docs-space-2, 8px) 0 0; color: var(--docs-text-muted, #666666); font: inherit; }
.crossfade-demo__controls, .crossfade-demo__controls [data-part="indicator-group"] { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: var(--docs-space-2, 8px); }
.crossfade-demo__controls { margin-top: var(--docs-space-4, 16px); }
.crossfade-demo__controls button { min-height: var(--docs-control-height, 44px); padding: 8px 12px; border: 1px solid var(--docs-control-border, #8a8a8a); border-radius: var(--docs-control-radius, 9999px); background: var(--docs-bg, #ffffff); color: inherit; font: inherit; font-size: var(--docs-font-size-label, 14px); line-height: 1.5; }
.crossfade-demo__controls [data-state="active"] { border-color: var(--docs-accent, #000000); background: var(--docs-accent-soft, #eeeeee); color: var(--docs-accent, #000000); }
.crossfade-demo output { display: block; margin-top: var(--docs-space-4, 16px); }
@media (prefers-reduced-motion: reduce) { .crossfade-demo__slide { transition: none; } }
</style>
