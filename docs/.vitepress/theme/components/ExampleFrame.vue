<script setup lang="ts">
import { CodeXml, Eye } from '@lucide/vue';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '@sectile/vue/tabs';
import { computed, ref } from 'vue';
import { type Host, useHostPreference } from '../host-preference.js';
import { useDocsLocale } from '../locale.js';
import HighlightedCode from './HighlightedCode.vue';

const props = defineProps<{
  sources: Partial<Record<Host, string>>;
  koSources?: Partial<Record<Host, string>>;
  languages?: Partial<Record<Host, string>>;
  fixedHost?: Host;
}>();

const modes = ['view', 'code'] as const;
const mode = ref('view');
const { host } = useHostPreference();
const { isKorean } = useDocsLocale();
const activeHost = computed(() => props.fixedHost ?? host.value);
const source = computed(() => {
  const value = (isKorean.value ? props.koSources?.[activeHost.value] : undefined) ?? props.sources[activeHost.value];
  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing ${activeHost.value} example source`);
  }
  return value;
});
const language = computed(() => props.languages?.[activeHost.value] ?? (activeHost.value === 'vue' ? 'vue' : 'ts'));
</script>

<template>
  <TabsRoot v-model="mode" :items="modes" class="sectile-example" as="section">
    <header class="sectile-example__toolbar">
      <div v-if="$slots['toolbar']" class="sectile-example__toolbar-start">
        <slot name="toolbar" />
      </div>
      <TabsList class="sectile-example__tabs" :label="isKorean ? '예시 표시 방식' : 'Example display'">
        <TabsTrigger
          class="sectile-example__tab"
          value="view"
        >
          <Eye :size="15" aria-hidden="true" />
          {{ isKorean ? '실행 화면' : 'View' }}
        </TabsTrigger>
        <TabsTrigger
          class="sectile-example__tab"
          value="code"
        >
          <CodeXml :size="15" aria-hidden="true" />
          {{ isKorean ? '코드' : 'Code' }}
        </TabsTrigger>
      </TabsList>
    </header>
    <TabsContent
      class="sectile-example__preview"
      value="view"
    >
      <slot v-if="activeHost !== 'terminal' || !$slots['terminal']" />
      <slot v-else name="terminal" />
    </TabsContent>
    <TabsContent
      class="sectile-example__code"
      value="code"
    >
      <HighlightedCode :source="source" :language="language" />
    </TabsContent>
  </TabsRoot>
</template>
