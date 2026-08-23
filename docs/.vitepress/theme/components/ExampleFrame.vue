<script setup lang="ts">
import { CodeXml, Eye } from '@lucide/vue';
import { codeToHtml } from 'shiki';
import { useData } from 'vitepress';
import { computed, ref, watch } from 'vue';
import { type Host, useHostPreference } from '../host-preference.js';
import { useDocsLocale } from '../locale.js';

const props = defineProps<{
  sources: Partial<Record<Host, string>>;
  koSources?: Partial<Record<Host, string>>;
  languages?: Partial<Record<Host, string>>;
}>();

const mode = ref<'view' | 'code'>('view');
const highlighted = ref('');
const { host } = useHostPreference();
const { isKorean } = useDocsLocale();
const { isDark } = useData();
const source = computed(() => (isKorean.value ? props.koSources?.[host.value] : undefined)
  ?? props.sources[host.value]
  ?? (isKorean.value ? '이 환경에서 사용할 수 있는 예시가 아직 없습니다.' : 'No example is available for this environment yet.'));
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
  <section class="sectile-example">
    <header class="sectile-example__toolbar">
      <div class="sectile-example__tabs" role="tablist" :aria-label="isKorean ? '예시 표시 방식' : 'Example display'">
        <button
          class="sectile-example__tab"
          role="tab"
          type="button"
          :aria-selected="mode === 'view'"
          @click="mode = 'view'"
        >
          <Eye :size="15" aria-hidden="true" />
          {{ isKorean ? '실행 화면' : 'View' }}
        </button>
        <button
          class="sectile-example__tab"
          role="tab"
          type="button"
          :aria-selected="mode === 'code'"
          @click="mode = 'code'"
        >
          <CodeXml :size="15" aria-hidden="true" />
          {{ isKorean ? '코드' : 'Code' }}
        </button>
      </div>
    </header>
    <div v-show="mode === 'view'" class="sectile-example__preview" role="tabpanel">
      <slot v-if="host !== 'terminal' || !$slots['terminal']" />
      <slot v-else name="terminal" />
    </div>
    <div v-show="mode === 'code'" class="sectile-example__code" role="tabpanel">
      <div v-if="highlighted" v-html="highlighted" />
      <pre v-else><code>{{ source }}</code></pre>
    </div>
  </section>
</template>
