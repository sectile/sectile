<script setup lang="ts">
import { CodeXml, Eye } from '@lucide/vue';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '@sectile/vue/tabs';
import { computed, ref } from 'vue';
import { useDocsLocale } from '../locale.js';
import HighlightedCode from './HighlightedCode.vue';

type TabularHost = 'vue' | 'dom' | 'core';

const props = defineProps<{
  sources: Readonly<Record<TabularHost, string>>;
  title: string;
  description: string;
}>();

const modes = ['view', 'code'] as const;
const hosts = ['vue', 'dom', 'core'] as const;
const mode = ref<(typeof modes)[number]>('view');
const host = ref<TabularHost>('vue');
const { isKorean } = useDocsLocale();
const source = computed(() => props.sources[host.value]);
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
      <div class="tabular-example__code-toolbar">
        <span>{{ isKorean ? '사용 환경' : 'Host' }}</span>
        <div class="tabular-example__host-tabs" role="group" :aria-label="isKorean ? '코드 사용 환경' : 'Code host'">
          <button
            v-for="option in hosts"
            :key="option"
            type="button"
            :aria-pressed="host === option"
            @click="host = option"
          >
            {{ option === 'vue' ? 'Vue' : option === 'dom' ? 'DOM' : 'Core' }}
          </button>
        </div>
      </div>
      <HighlightedCode :source="source" :language="host === 'vue' ? 'vue' : 'ts'" />
    </TabsContent>
  </TabsRoot>
</template>
