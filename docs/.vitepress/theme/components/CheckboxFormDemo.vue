<script setup lang="ts">
import FormCheckbox from '../../../examples/checkbox/FormCheckbox.vue';
import { formCheckboxKoSources, formCheckboxSources } from '../../../examples/checkbox/sources.js';
import ExampleFrame from './ExampleFrame.vue';
</script>

<template>
  <ExampleFrame :sources="formCheckboxSources" :ko-sources="formCheckboxKoSources">
    <FormCheckbox />
  </ExampleFrame>
</template>
