<script setup lang="ts">
import { computed } from 'vue';
import { componentExampleSources } from '../component-example-sources.js';
import ComponentExamplePreview from './ComponentExamplePreview.vue';
import ExampleFrame from './ExampleFrame.vue';
import TerminalComponentExample from './TerminalComponentExample.vue';

const props = withDefaults(defineProps<{
  readonly component: string;
  readonly scenario: string;
  readonly title: string;
  readonly description: string;
  readonly index?: number;
}>(), { index: 0 });

const sources = computed(() => componentExampleSources(props.component, props.scenario));
</script>

<template>
  <ExampleFrame :sources="sources" :languages="{ vue: 'vue', core: 'ts', dom: 'ts', terminal: 'ts' }">
    <ComponentExamplePreview v-bind="props" />
    <template #terminal>
      <TerminalComponentExample v-bind="props" />
    </template>
  </ExampleFrame>
</template>
