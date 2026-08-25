<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { componentExampleSources } from '../component-example-sources.js';
import { pinInputExampleOptions, type PinInputExampleOptions } from '../pin-input-example-options.js';
import ComponentExamplePreview from './ComponentExamplePreview.vue';
import ExampleFrame from './ExampleFrame.vue';
import PinInputExampleControls from './PinInputExampleControls.vue';
import TerminalComponentExample from './TerminalComponentExample.vue';

const props = withDefaults(defineProps<{
  readonly component: string;
  readonly scenario: string;
  readonly title: string;
  readonly description: string;
  readonly index?: number;
}>(), { index: 0 });

const sources = computed(() => componentExampleSources(props.component, props.scenario));
const pinDefaults = computed(() => pinInputExampleOptions(props.scenario));
const pinOptions = ref<PinInputExampleOptions>(pinDefaults.value);
const hasPinControl = computed(() => props.component === 'pin-input' && props.scenario !== 'verification-code');
watch([() => props.component, () => props.scenario], () => {
  pinOptions.value = pinDefaults.value;
});
</script>

<template>
  <ExampleFrame :sources="sources" :languages="{ vue: 'vue', core: 'ts', dom: 'ts', terminal: 'ts' }">
    <template v-if="hasPinControl" #toolbar>
      <PinInputExampleControls v-model="pinOptions" :scenario="scenario" />
    </template>
    <ComponentExamplePreview v-bind="props" :pin-input-options="component === 'pin-input' ? pinOptions : undefined" />
    <template #terminal>
      <TerminalComponentExample v-bind="props" />
    </template>
  </ExampleFrame>
</template>
