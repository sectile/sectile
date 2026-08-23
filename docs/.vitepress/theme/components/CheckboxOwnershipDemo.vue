<script setup lang="ts">
import ControlledCheckbox from '../../../examples/checkbox/ControlledCheckbox.vue';
import {
  ownershipCheckboxKoSources,
  ownershipCheckboxSources,
} from '../../../examples/checkbox/sources.js';
import ExampleFrame from './ExampleFrame.vue';
</script>

<template>
  <ExampleFrame :sources="ownershipCheckboxSources" :ko-sources="ownershipCheckboxKoSources">
    <ControlledCheckbox />
  </ExampleFrame>
</template>
