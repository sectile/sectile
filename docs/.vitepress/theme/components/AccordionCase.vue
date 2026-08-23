<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChevronDown } from '@lucide/vue';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
  type AccordionValue,
} from '@sectile/vue/accordion';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';

const props = withDefaults(defineProps<{
  readonly title: string;
  readonly description: string;
  readonly type?: 'single' | 'multiple';
  readonly initialValue?: AccordionValue;
  readonly collapsible?: boolean;
  readonly controlled?: boolean;
}>(), {
  type: 'single',
  initialValue: '',
  collapsible: true,
  controlled: false,
});

const items = [
  { value: 'general', label: 'General', content: 'Workspace name, ownership, and visibility.' },
  { value: 'deployments', label: 'Deployments', content: 'Build targets and release protection.' },
  { value: 'danger', label: 'Danger zone', content: 'Destructive project operations.' },
] as const;
const itemIDs = items.map((item) => item.value);
const value = ref<AccordionValue>(props.initialValue);
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const ownershipProps = computed(() => props.controlled
  ? { modelValue: value.value }
  : { defaultValue: props.initialValue });
const state = computed<Readonly<Record<string, unknown>>>(() => ({
  type: props.type,
  value: value.value,
  collapsible: props.collapsible,
  ownership: props.controlled ? 'controlled' : 'uncontrolled',
}));
const sourceCode = computed(() => accordionSource(props));

function handleUpdate(next: AccordionValue): void {
  value.value = next;
  revision.value += 1;
  entries.value = [{
    revision: revision.value,
    event: 'update:modelValue',
    accepted: true,
    effects: [`set-expanded value=${JSON.stringify(next)}`],
  }, ...entries.value].slice(0, 12);
}
</script>

<template>
  <DemoCard
    :title="title"
    :revision="revision"
    :state="state"
    :entries="entries"
    :code="sourceCode"
    interaction="enabled"
  >
    <div class="accordion-demo">
      <p class="demo-copy">{{ description }}</p>
      <AccordionRoot
        v-bind="ownershipProps"
        :items="itemIDs"
        :type="type"
        :collapsible="collapsible"
        class="accordion-control"
        @update:model-value="handleUpdate"
      >
        <AccordionItem
          v-for="item in items"
          :key="item.value"
          v-slot="{ open }"
          :value="item.value"
          class="accordion-item"
        >
          <AccordionHeader class="accordion-header">
            <AccordionTrigger class="accordion-trigger">
              <span>{{ item.label }}</span>
              <ChevronDown :size="17" aria-hidden="true" />
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent class="accordion-content">
            {{ item.content }}
            <span class="accordion-status">{{ open ? 'Expanded' : 'Collapsed' }}</span>
          </AccordionContent>
        </AccordionItem>
      </AccordionRoot>
    </div>
  </DemoCard>
</template>

<script lang="ts">
function accordionSource(props: {
  type: 'single' | 'multiple';
  initialValue: AccordionValue;
  collapsible: boolean;
}): string {
  const initial = typeof props.initialValue === 'string'
    ? `'${props.initialValue}'`
    : JSON.stringify(props.initialValue);
  return `<script setup lang="ts">
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
} from '@sectile/vue/accordion';

const items = ['general', 'deployments', 'danger'];
<\/script>

<template>
  <AccordionRoot
    :items="items"
    type="${props.type}"
    :default-value="${initial}"
    :collapsible="${String(props.collapsible)}"
  >
    <AccordionItem v-for="item in items" :key="item" :value="item">
      <AccordionHeader>
        <AccordionTrigger>{{ item }}</AccordionTrigger>
      </AccordionHeader>
      <AccordionContent>Content</AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>`;
}
</script>
