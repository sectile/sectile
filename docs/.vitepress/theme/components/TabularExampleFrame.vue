<script setup lang="ts">
import { CodeXml, Eye } from '@lucide/vue';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '@sectile/vue/tabs';
import { computed, ref } from 'vue';
import { hostLabels, type Host, useHostPreference } from '../host-preference.js';
import { useDocsLocale } from '../locale.js';
import HighlightedCode from './HighlightedCode.vue';

const props = defineProps<{
  sources: Readonly<Partial<Record<Host, string>>>;
  title: string;
  description: string;
}>();

const modes = ['view', 'code'] as const;
const mode = ref<(typeof modes)[number]>('view');
const { host } = useHostPreference();
const { isKorean } = useDocsLocale();
const source = computed(() => props.sources[host.value] ?? null);
const language = computed(() => host.value === 'vue' ? 'vue' : 'ts');
const unavailableMessage = computed(() => isKorean.value
  ? `${hostLabels[host.value]} 환경용 Tabular 예제가 없습니다. 페이지 헤더에서 Vue, DOM 또는 Core를 선택하세요.`
  : `No Tabular example is available for ${hostLabels[host.value]}. Choose Vue, DOM, or Core in the page header.`);
</script>

<template>
  <TabsRoot v-model="mode" :items="modes" class="tabular-example" as="section">
    <header class="tabular-example__header">
      <div class="tabular-example__heading">
        <strong>{{ title }}</strong>
        <span>{{ description }}</span>
      </div>
      <TabsList class="tabular-example__mode-tabs" :label="isKorean ? '예시 표시 방식' : 'Example display'">
        <TabsTrigger class="tabular-example__mode" value="view">
          <Eye :size="15" aria-hidden="true" />
          {{ isKorean ? '실행 화면' : 'View' }}
        </TabsTrigger>
        <TabsTrigger class="tabular-example__mode" value="code">
          <CodeXml :size="15" aria-hidden="true" />
          {{ isKorean ? '코드' : 'Code' }}
        </TabsTrigger>
      </TabsList>
    </header>

    <TabsContent class="tabular-example__preview" value="view">
      <slot />
    </TabsContent>

    <TabsContent class="tabular-example__code" value="code">
      <HighlightedCode v-if="source !== null" :source="source" :language="language" />
      <p v-else class="tabular-example__unavailable" role="status">{{ unavailableMessage }}</p>
    </TabsContent>
  </TabsRoot>
</template>
