<script setup lang="ts">
import { codeToHtml } from 'shiki';
import { useData } from 'vitepress';
import { computed, ref, watch } from 'vue';
import { hostLabels, type Host, useHostPreference } from '../host-preference.js';

const props = defineProps<{
  sources: Partial<Record<Host, string>>;
  languages?: Partial<Record<Host, string>>;
}>();

const { host } = useHostPreference();
const { isDark } = useData();
const highlighted = ref('');
const source = computed(() => props.sources[host.value] ?? '');
const language = computed(() => props.languages?.[host.value] ?? (host.value === 'vue' ? 'vue' : 'ts'));
let request = 0;

watch(
  [source, language, isDark],
  async ([nextSource, nextLanguage, dark]) => {
    const current = ++request;
    const html = await codeToHtml(nextSource, {
      lang: nextLanguage,
      theme: dark ? 'github-dark-default' : 'github-light-default',
    });
    if (current === request) highlighted.value = html;
  },
  { immediate: true },
);
</script>

<template>
  <figure class="host-code">
    <figcaption>{{ hostLabels[host] }}</figcaption>
    <div v-if="highlighted" v-html="highlighted" />
    <pre v-else><code>{{ source }}</code></pre>
  </figure>
</template>
