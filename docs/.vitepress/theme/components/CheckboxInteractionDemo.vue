<script setup lang="ts">
import InteractionCheckboxes from '../../../examples/checkbox/InteractionCheckboxes.vue';
import {
  interactionCheckboxKoSources,
  interactionCheckboxSources,
} from '../../../examples/checkbox/sources.js';
import ExampleFrame from './ExampleFrame.vue';
</script>

<template>
  <ExampleFrame :sources="interactionCheckboxSources" :ko-sources="interactionCheckboxKoSources">
    <InteractionCheckboxes />
  </ExampleFrame>
</template>
