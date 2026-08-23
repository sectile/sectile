<script setup lang="ts">
import BasicCheckbox from '../../../examples/checkbox/BasicCheckbox.vue';
import { basicCheckboxKoSources, basicCheckboxSources } from '../../../examples/checkbox/sources.js';
import ExampleFrame from './ExampleFrame.vue';
import TerminalCheckboxDemo from './TerminalCheckboxDemo.vue';
</script>

<template>
  <ExampleFrame :sources="basicCheckboxSources" :ko-sources="basicCheckboxKoSources">
    <BasicCheckbox />
    <template #terminal>
      <TerminalCheckboxDemo />
    </template>
  </ExampleFrame>
</template>
