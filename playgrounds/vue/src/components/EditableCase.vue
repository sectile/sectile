<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  EditableArea,
  EditableCancelTrigger,
  EditableEditTrigger,
  EditableInput,
  EditablePreview,
  EditableRoot,
  EditableSubmitTrigger,
} from '@sectile/vue/editable';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';

const props = withDefaults(defineProps<{
  readonly title: string;
  readonly description: string;
  readonly initialValue: string;
  readonly controlled?: boolean;
  readonly validated?: boolean;
}>(), { controlled: false, validated: false });

const value = ref(props.initialValue);
const editing = ref(false);
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const ownershipProps = computed(() => props.controlled ? { modelValue: value.value } : { defaultValue: props.initialValue });
const policies = computed(() => props.validated ? {
  allowEmpty: false,
  normalize: (draft: string) => draft.trim().toLowerCase(),
  validate: (draft: string) => /^[a-z0-9-]+$/.test(draft),
} : undefined);
const policyProps = computed(() => policies.value === undefined ? {} : { policies: policies.value });
const rootProps = computed(() => ({ ...ownershipProps.value, ...policyProps.value }));
const state = computed(() => ({ value: value.value, editing: editing.value, ownership: props.controlled ? 'controlled' : 'uncontrolled', validated: props.validated }));
const sourceCode = computed(() => editableSource(props.initialValue, props.controlled, props.validated));

function updateValue(next: string): void {
  value.value = next; revision.value += 1;
  entries.value = [{ revision: revision.value, event: 'update:modelValue', accepted: true, effects: [`commit value=${next}`] }, ...entries.value].slice(0, 12);
}
function updateEditing(next: boolean): void {
  editing.value = next;
}
</script>

<template>
  <DemoCard :title="title" :revision="revision" :state="state" :entries="entries" interaction="enabled" :code="sourceCode">
    <div class="editable-case">
      <p class="demo-copy">{{ description }}</p>
      <EditableRoot
        v-bind="rootProps"
        name="release-title"
        label="Release title"
        @update:model-value="updateValue"
        @update:editing="updateEditing"
        v-slot="{ value: currentValue, editing: isEditing }"
        class="editable-root"
      >
        <EditableArea class="editable-area">
          <EditablePreview class="editable-preview">{{ currentValue }}</EditablePreview>
          <EditableInput class="editable-input" />
          <div class="editable-actions">
            <EditableEditTrigger>Edit</EditableEditTrigger>
            <EditableSubmitTrigger>Save</EditableSubmitTrigger>
            <EditableCancelTrigger>Cancel</EditableCancelTrigger>
          </div>
          <small>{{ isEditing ? 'Enter saves · Escape cancels' : validated ? 'Lowercase letters, numbers, and hyphens' : 'Click the value or Edit' }}</small>
        </EditableArea>
      </EditableRoot>
    </div>
  </DemoCard>
</template>

<script lang="ts">
function editableSource(initialValue: string, controlled: boolean, validated: boolean): string {
  const setup = controlled ? `import { ref } from 'vue'\n\nconst value = ref('${initialValue}')` : '';
  const ownership = controlled ? 'v-model="value"' : `default-value="${initialValue}"`;
  const policy = validated ? `\n    :policies="{ allowEmpty: false, normalize: value => value.trim().toLowerCase(), validate: value => /^[a-z0-9-]+$/.test(value) }"` : '';
  return `<script setup lang="ts">
${setup}
import {
  EditableArea, EditableCancelTrigger, EditableEditTrigger,
  EditableInput, EditablePreview, EditableRoot, EditableSubmitTrigger,
} from '@sectile/vue/editable'
<\/script>

<template>
  <EditableRoot ${ownership}${policy} v-slot="{ value }">
    <EditableArea>
      <EditablePreview>{{ value }}</EditablePreview>
      <EditableInput />
      <EditableEditTrigger>Edit</EditableEditTrigger>
      <EditableSubmitTrigger>Save</EditableSubmitTrigger>
      <EditableCancelTrigger>Cancel</EditableCancelTrigger>
    </EditableArea>
  </EditableRoot>
</template>`;
}
</script>
