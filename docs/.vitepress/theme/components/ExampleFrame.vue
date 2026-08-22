<script setup lang="ts">
import { CodeXml, Eye } from '@lucide/vue';
import { codeToHtml } from 'shiki';
import { useData } from 'vitepress';
import { ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  source: string;
  language?: string;
}>(), {
  language: 'vue',
});

const mode = ref<'view' | 'code'>('view');
const highlighted = ref('');
const { isDark } = useData();

watch(
  [() => props.source, isDark],
  async ([source, dark]) => {
    highlighted.value = await codeToHtml(source, {
      lang: props.language,
      theme: dark ? 'github-dark-default' : 'github-light-default',
    });
  },
  { immediate: true },
);
</script>

<template>
  <section class="sectile-example">
    <header class="sectile-example__toolbar">
      <div class="sectile-example__tabs" role="tablist" aria-label="Example display">
        <button
          class="sectile-example__tab"
          role="tab"
          type="button"
          :aria-selected="mode === 'view'"
          @click="mode = 'view'"
        >
          <Eye :size="15" aria-hidden="true" />
          View
        </button>
        <button
          class="sectile-example__tab"
          role="tab"
          type="button"
          :aria-selected="mode === 'code'"
          @click="mode = 'code'"
        >
          <CodeXml :size="15" aria-hidden="true" />
          Code
        </button>
      </div>
    </header>
    <div v-show="mode === 'view'" class="sectile-example__preview" role="tabpanel">
      <slot />
    </div>
    <div v-show="mode === 'code'" class="sectile-example__code" role="tabpanel">
      <div v-if="highlighted" v-html="highlighted" />
      <pre v-else><code>{{ source }}</code></pre>
    </div>
  </section>
</template>
