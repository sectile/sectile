<script setup lang="ts">
import { ref } from 'vue';
import { ToggleButton } from '@sectile/vue/toggle-button';

const pinned = ref(false);
</script>

<template>
  <div>
    <ToggleButton v-model="pinned">Pin conversation</ToggleButton>
    <output aria-live="polite">Pinned: {{ pinned }}</output>
  </div>
</template>
