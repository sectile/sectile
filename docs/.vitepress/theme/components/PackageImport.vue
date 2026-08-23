<script setup lang="ts">
import { computed } from 'vue';
import { type Host } from '../host-preference.js';
import HostCode from './HostCode.vue';

const props = defineProps<{ component: string }>();

const variable = computed(() => props.component.replace(/-([a-z])/gu, (_match, letter: string) => letter.toUpperCase()));
const vueImport = computed(() => props.component === 'checkbox'
  ? `import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox'`
  : `import * as ${variable.value} from '@sectile/vue/${props.component}'`);
const sources = computed<Readonly<Record<Host, string>>>(() => Object.freeze({
  core: `import * as ${variable.value} from '@sectile/core/${props.component}'`,
  dom: `import * as ${variable.value} from '@sectile/dom/${props.component}'`,
  terminal: `import * as ${variable.value} from '@sectile/terminal/${props.component}'`,
  vue: vueImport.value,
}));
</script>

<template>
  <HostCode :sources="sources" />
</template>
