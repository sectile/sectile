<script setup lang="ts">
import { computed, ref } from 'vue';
import { TextField } from '@sectile/vue/text';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';

const props = withDefaults(defineProps<{
  readonly title: string;
  readonly description: string;
  readonly initialValue?: string;
  readonly controlled?: boolean;
  readonly multiline?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
}>(), {
  initialValue: '',
  controlled: false,
  multiline: false,
  disabled: false,
  readonly: false,
});

const value = ref(props.initialValue);
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const ownershipProps = computed(() => props.controlled
  ? { modelValue: value.value }
  : { defaultValue: props.initialValue });
const interaction = computed<'enabled' | 'readonly' | 'disabled'>(() => (
  props.disabled ? 'disabled' : props.readonly ? 'readonly' : 'enabled'
));
const state = computed<Readonly<Record<string, unknown>>>(() => ({
  value: value.value,
  multiline: props.multiline,
  ownership: props.controlled ? 'controlled' : 'uncontrolled',
  interaction: interaction.value,
}));
const sourceCode = computed(() => textSource(props));

function handleUpdate(next: string | number): void {
  const text = String(next);
  value.value = text;
  revision.value += 1;
  entries.value = [{
    revision: revision.value,
    event: 'update:modelValue',
    accepted: true,
    effects: [`set-text length=${text.length}`],
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
    <div class="text-demo">
      <p class="demo-copy">{{ description }}</p>
      <label class="text-label">
        <span>{{ multiline ? 'Release notes' : 'Search query' }}</span>
        <TextField
          v-bind="ownershipProps"
          :multiline="multiline"
          :disabled="disabled"
          :readonly="readonly"
          class="text-field"
          placeholder="한글과 English를 입력해 보세요"
          @update:model-value="handleUpdate"
        />
      </label>
      <p class="text-value">Current: {{ value || 'Empty' }}</p>
    </div>
  </DemoCard>
</template>

<script lang="ts">
function textSource(props: {
  initialValue: string;
  controlled: boolean;
  multiline: boolean;
}): string {
  const binding = props.controlled ? 'v-model="value"' : `default-value="${props.initialValue}"`;
  return `<script setup lang="ts">
${props.controlled ? "import { ref } from 'vue';\n" : ''}import { TextField } from '@sectile/vue/text';
${props.controlled ? "const value = ref('');\n" : ''}<\/script>

<template>
  <TextField ${binding}${props.multiline ? ' multiline' : ''} />
</template>`;
}
</script>
