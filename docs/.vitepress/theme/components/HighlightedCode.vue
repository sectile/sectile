<script setup lang="ts">
import { useData } from 'vitepress';
import { ref, watch } from 'vue';
import { renderCodeSource } from '../code-rendering.js';

const props = withDefaults(defineProps<{
  readonly source: string;
  readonly language?: string;
}>(), {
  language: 'ts',
});

const { isDark } = useData();
const formatted = ref(props.source);
const highlighted = ref('');
let request = 0;

watch(
  [() => props.source, () => props.language, isDark],
  async ([source, language, dark]) => {
    const current = ++request;
    formatted.value = source;
    highlighted.value = '';
    const rendered = await renderCodeSource(
      source,
      language,
      dark ? 'github-dark-default' : 'github-light-default',
    );
    if (current !== request) return;
    formatted.value = rendered.formatted;
    highlighted.value = rendered.html;
  },
  { immediate: true },
);
</script>

<template>
  <div class="highlighted-code">
    <div v-if="highlighted" v-html="highlighted" />
    <pre v-else><code>{{ formatted }}</code></pre>
  </div>
</template>
