<script setup lang="ts">
import IndeterminateCheckbox from '../../../examples/checkbox/IndeterminateCheckbox.vue';
import { indeterminateCheckboxKoSources, indeterminateCheckboxSources } from '../../../examples/checkbox/sources.js';
import ExampleFrame from './ExampleFrame.vue';
import TerminalCheckboxDemo from './TerminalCheckboxDemo.vue';
</script>

<template>
  <ExampleFrame :sources="indeterminateCheckboxSources" :ko-sources="indeterminateCheckboxKoSources">
    <IndeterminateCheckbox />
    <template #terminal>
      <TerminalCheckboxDemo mixed />
    </template>
  </ExampleFrame>
</template>
