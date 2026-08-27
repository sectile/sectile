<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChevronDown } from '@lucide/vue';
import {
  DisclosureContent,
  DisclosureRoot,
  DisclosureTrigger,
} from '@sectile/vue/disclosure';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';

const props = withDefaults(defineProps<{
  readonly title: string;
  readonly label: string;
  readonly description: string;
  readonly initialValue: boolean;
  readonly controlled?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly preview?: boolean;
}>(), {
  controlled: false,
  disabled: false,
  readonly: false,
  preview: false,
});

const previewStates = [
  { open: false, label: 'Closed' },
  { open: true, label: 'Open' },
] as const;

const value = ref(props.initialValue);
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const interaction = computed<'enabled' | 'readonly' | 'disabled'>(() => (
  props.disabled ? 'disabled' : props.readonly ? 'readonly' : 'enabled'
));
const ownershipProps = computed(() => props.controlled
  ? { modelValue: value.value }
  : { defaultValue: props.initialValue });
const state = computed<Readonly<Record<string, unknown>>>(() => ({
  open: value.value,
  ownership: props.controlled ? 'controlled' : 'uncontrolled',
}));
const sourceCode = computed(() => disclosureSource(props.initialValue, props.controlled));

function handleUpdate(next: boolean): void {
  value.value = next;
  revision.value += 1;
  entries.value = [{
    revision: revision.value,
    event: 'update:modelValue',
    accepted: true,
    effects: [`set-open value=${String(next)}`],
  }, ...entries.value].slice(0, 12);
}
</script>

<template>
  <DemoCard
    :title="title"
    :revision="revision"
    :state="state"
    :entries="entries"
    :interaction="interaction"
    :code="sourceCode"
  >
    <div class="disclosure-demo" :class="{ 'disclosure-demo--preview': preview }">
      <p v-if="!preview" class="demo-copy">{{ description }}</p>
      <template v-if="preview">
        <DisclosureRoot
          v-for="item in previewStates"
          :key="item.label"
          :default-value="item.open"
          class="disclosure-control"
        >
          <DisclosureTrigger class="disclosure-trigger">
            <span class="disclosure-preview-heading"><span>Advanced options</span><small>{{ item.label }}</small></span>
            <ChevronDown :size="17" aria-hidden="true" />
          </DisclosureTrigger>
          <DisclosureContent class="disclosure-content">
            Browser-defined focus with Sectile-owned open state.
          </DisclosureContent>
        </DisclosureRoot>
      </template>
      <DisclosureRoot
        v-else
        v-bind="ownershipProps"
        :disabled="disabled"
        :readonly="readonly"
        class="disclosure-control"
        @update:model-value="handleUpdate"
      >
        <DisclosureTrigger class="disclosure-trigger">
          <span>{{ label }}</span>
          <ChevronDown :size="17" aria-hidden="true" />
        </DisclosureTrigger>
        <DisclosureContent class="disclosure-content">
          Browser-defined button focus stays intact while Sectile owns only the open-state transition.
        </DisclosureContent>
      </DisclosureRoot>
    </div>
  </DemoCard>
</template>

<script lang="ts">
function disclosureSource(initialValue: boolean, controlled: boolean): string {
  const setup = controlled ? `import { ref } from 'vue';\n\nconst open = ref(${String(initialValue)});` : '';
  const binding = controlled ? 'v-model="open"' : `:default-value="${String(initialValue)}"`;
  return `<script setup lang="ts">\n${setup === '' ? '' : `${setup}\n`}import {\n  DisclosureContent,\n  DisclosureRoot,\n  DisclosureTrigger,\n} from '@sectile/vue/disclosure';\n<\/script>\n\n<template>\n  <DisclosureRoot ${binding}>\n    <DisclosureTrigger>Advanced options</DisclosureTrigger>\n    <DisclosureContent>Configuration</DisclosureContent>\n  </DisclosureRoot>\n</template>`;
}
</script>
