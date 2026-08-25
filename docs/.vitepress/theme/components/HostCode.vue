<script setup lang="ts">
import { computed } from 'vue';
import { hostLabels, type Host, useHostPreference } from '../host-preference.js';
import HighlightedCode from './HighlightedCode.vue';

const props = defineProps<{
  sources: Partial<Record<Host, string>>;
  languages?: Partial<Record<Host, string>>;
}>();

const { host } = useHostPreference();
const source = computed(() => props.sources[host.value] ?? '');
const language = computed(() => props.languages?.[host.value] ?? (host.value === 'vue' ? 'vue' : 'ts'));
</script>

<template>
  <figure class="host-code">
    <figcaption>{{ hostLabels[host] }}</figcaption>
    <HighlightedCode :source="source" :language="language" />
  </figure>
</template>
