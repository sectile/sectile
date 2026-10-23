<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue';
import { useMediaGesture } from '@sectile/vue/media-gesture';
const element = useTemplateRef<HTMLElement>('scene');
const kind = shallowRef('idle');
const { error, measure, cancel } = useMediaGesture({ element, onStart: () => true, onMove(input) { kind.value = input.kind; } });
const projection = measure([{ x: 0, y: 0 }]);
if (projection.ok) { const x: number = projection.value.points[0].x; void x; }
void cancel;
</script>

<template>
  <section ref="scene" aria-label="Media viewer"><output>{{ kind }} {{ error }}</output></section>
</template>
