<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useFullscreen } from '@sectile/vue/fullscreen';

const element = useTemplateRef<HTMLElement>('viewer');
const { snapshot, error, enter, exit } = useFullscreen({ element });
</script>

<template>
  <section ref="viewer" aria-label="Media viewer">
    <button type="button" :disabled="!snapshot?.available" @click="enter()">Enter fullscreen</button>
    <button type="button" :disabled="!snapshot?.active" @click="exit()">Exit fullscreen</button>
    <output>{{ error }}</output>
  </section>
</template>
