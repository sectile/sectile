<script setup lang="ts">
import { computed, ref } from 'vue';
import { TabsContent, TabsIndicator, TabsList, TabsRoot, TabsTrigger } from '@sectile/vue/tabs';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';

const props = withDefaults(defineProps<{ readonly manual?: boolean; readonly controlled?: boolean }>(), { manual: false, controlled: false });
const tabs = [
  { value: 'overview', label: 'Overview', content: 'Release health and deployment summary.' },
  { value: 'activity', label: 'Activity', content: 'Recent changes across adapters.' },
  { value: 'settings', label: 'Settings', content: 'Visibility and notification preferences.' },
] as const;
const items = tabs.map((tab) => tab.value);
const value = ref('overview');
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const ownership = computed(() => props.controlled ? { modelValue: value.value } : { defaultValue: 'overview' });
const state = computed(() => ({ value: value.value, activationMode: props.manual ? 'manual' : 'automatic', ownership: props.controlled ? 'controlled' : 'uncontrolled' }));
const code = `<script setup lang="ts">
import { TabsContent, TabsIndicator, TabsList, TabsRoot, TabsTrigger } from '@sectile/vue/tabs';

const tabs = [
  { value: 'overview', label: 'Overview', content: 'Release summary.' },
  { value: 'activity', label: 'Activity', content: 'Recent changes.' },
  { value: 'settings', label: 'Settings', content: 'Preferences.' },
];
const items = tabs.map(tab => tab.value);
<\/script>

<template>
  <TabsRoot :items="items" default-value="overview">
    <TabsList>
      <TabsTrigger v-for="tab in tabs" :key="tab.value" :value="tab.value">
        {{ tab.label }}
      </TabsTrigger>
      <TabsIndicator />
    </TabsList>
    <TabsContent v-for="tab in tabs" :key="tab.value" :value="tab.value">
      {{ tab.content }}
    </TabsContent>
  </TabsRoot>
</template>`;
function update(next: string): void {
  value.value = next;
  revision.value += 1;
  entries.value = [{ revision: revision.value, event: 'update:modelValue', accepted: true, effects: [`activate-tab value=${next}`] }, ...entries.value];
}
</script>

<template>
  <DemoCard :title="manual ? 'Manual activation' : 'Automatic activation'" :revision="revision" :state="state" :entries="entries" :code="code" interaction="enabled">
    <div class="tabs-demo">
      <p class="demo-copy">Panels stay mounted. Arrow keys either activate immediately or wait for Enter and Space.</p>
      <TabsRoot v-bind="ownership" :items="items" :activation-mode="manual ? 'manual' : 'automatic'" class="tabs-control" @update:model-value="update">
        <TabsList class="tabs-list">
          <TabsTrigger v-for="tab in tabs" :key="tab.value" :value="tab.value" class="tabs-trigger">{{ tab.label }}</TabsTrigger>
          <TabsIndicator class="tabs-indicator" />
        </TabsList>
        <TabsContent v-for="tab in tabs" :key="tab.value" :value="tab.value" class="tabs-content"><strong>{{ tab.label }}</strong><p>{{ tab.content }}</p></TabsContent>
      </TabsRoot>
    </div>
  </DemoCard>
</template>
