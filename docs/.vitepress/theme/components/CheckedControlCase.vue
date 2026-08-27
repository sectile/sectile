<script setup lang="ts">
import { computed, ref } from 'vue';
import { Bell, Bold, Check, Minus } from '@lucide/vue';
import { CheckboxIndicator, CheckboxRoot, type CheckboxValue } from '@sectile/vue/checkbox';
import { SwitchRoot, SwitchThumb } from '@sectile/vue/switch';
import { ToggleButton } from '@sectile/vue/toggle-button';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';

const props = withDefaults(defineProps<{
  readonly kind: 'checkbox' | 'switch' | 'toggle-button';
  readonly title: string;
  readonly label: string;
  readonly description: string;
  readonly initialValue: CheckboxValue;
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

const booleanPreviewStates = [
  { value: false, label: 'Off' },
  { value: true, label: 'On' },
] as const;
const checkboxPreviewStates = [
  { value: false, label: 'Unchecked', description: 'No value selected' },
  { value: true, label: 'Checked', description: 'Value selected' },
  { value: 'indeterminate', label: 'Mixed', description: 'Partial selection' },
] as const satisfies readonly { readonly value: CheckboxValue; readonly label: string; readonly description: string }[];

const value = ref<CheckboxValue>(props.initialValue);
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const interaction = computed<'enabled' | 'readonly' | 'disabled'>(() => (
  props.disabled ? 'disabled' : props.readonly ? 'readonly' : 'enabled'
));
const checkboxOwnershipProps = computed(() => props.controlled
  ? { modelValue: value.value }
  : { defaultValue: props.initialValue });
const booleanOwnershipProps = computed(() => props.controlled
  ? { modelValue: value.value === true }
  : { defaultValue: props.initialValue === true });
const state = computed<Readonly<Record<string, unknown>>>(() => ({
  [props.kind === 'toggle-button' ? 'pressed' : 'checked']: value.value,
  ownership: props.controlled ? 'controlled' : 'uncontrolled',
}));
const sourceCode = computed(() => checkedControlSource({
  kind: props.kind,
  initialValue: props.initialValue,
  controlled: props.controlled,
  disabled: props.disabled,
  readonly: props.readonly,
}));

function handleUpdate(next: CheckboxValue): void {
  value.value = next;
  revision.value += 1;
  entries.value = [{
    revision: revision.value,
    event: 'update:modelValue',
    accepted: true,
    effects: [`set-${props.kind}-value value=${String(next)}`],
  }, ...entries.value].slice(0, 12);
}

function handleBooleanUpdate(next: boolean): void {
  handleUpdate(next);
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
    <div class="checked-demo" :class="{ 'checked-demo--preview': preview }">
      <p v-if="!preview" class="demo-copy">{{ description }}</p>
      <template v-if="preview">
        <SwitchRoot
          v-if="kind === 'switch'"
          v-for="item in booleanPreviewStates"
          :key="item.label"
          :default-value="item.value"
          class="switch-control"
        >
          <span class="checked-control-label">
            <Bell :size="17" aria-hidden="true" />
            <span class="state-preview-copy"><strong>Notifications</strong><small>{{ item.label }}</small></span>
          </span>
          <span class="switch-track" aria-hidden="true"><SwitchThumb class="switch-thumb" /></span>
        </SwitchRoot>

        <CheckboxRoot
          v-else-if="kind === 'checkbox'"
          v-for="item in checkboxPreviewStates"
          :key="item.label"
          v-slot="{ isIndeterminate }"
          :default-value="item.value"
          class="checkbox-control"
        >
          <span class="checkbox-marker" aria-hidden="true">
            <CheckboxIndicator class="checkbox-indicator">
              <Minus v-if="isIndeterminate" :size="15" :stroke-width="2.5" />
              <Check v-else :size="15" :stroke-width="2.5" />
            </CheckboxIndicator>
          </span>
          <span class="state-preview-copy"><strong>{{ item.label }}</strong><small>{{ item.description }}</small></span>
        </CheckboxRoot>

        <ToggleButton
          v-else
          v-for="item in booleanPreviewStates"
          :key="item.label"
          :default-value="item.value"
          class="toggle-control"
        >
          <Bold :size="18" aria-hidden="true" />
          <span>Bold</span>
          <span class="toggle-value">{{ item.label }}</span>
        </ToggleButton>
      </template>

      <SwitchRoot
        v-else-if="kind === 'switch'"
        v-bind="booleanOwnershipProps"
        :disabled="disabled"
        :readonly="readonly"
        class="switch-control"
        @update:model-value="handleBooleanUpdate"
      >
        <span class="checked-control-label">
          <Bell :size="17" aria-hidden="true" />
          <strong>{{ label }}</strong>
        </span>
        <span class="switch-track" aria-hidden="true">
          <SwitchThumb class="switch-thumb" />
        </span>
      </SwitchRoot>

      <CheckboxRoot
        v-else-if="kind === 'checkbox'"
        v-slot="{ isIndeterminate }"
        v-bind="checkboxOwnershipProps"
        :disabled="disabled"
        :readonly="readonly"
        class="checkbox-control"
        @update:model-value="handleUpdate"
      >
        <span class="checkbox-marker" aria-hidden="true">
          <CheckboxIndicator class="checkbox-indicator">
            <Minus v-if="isIndeterminate" :size="15" :stroke-width="2.5" />
            <Check v-else :size="15" :stroke-width="2.5" />
          </CheckboxIndicator>
        </span>
        <strong>{{ label }}</strong>
        <span class="toggle-value">{{ value === 'indeterminate' ? 'Mixed' : value ? 'Checked' : 'Unchecked' }}</span>
      </CheckboxRoot>

      <ToggleButton
        v-else
        v-bind="booleanOwnershipProps"
        :disabled="disabled"
        :readonly="readonly"
        class="toggle-control"
        @update:model-value="handleBooleanUpdate"
      >
        <Bold :size="18" aria-hidden="true" />
        <span>{{ label }}</span>
        <span class="toggle-value">{{ value ? 'Active' : 'Inactive' }}</span>
      </ToggleButton>
    </div>
  </DemoCard>
</template>

<script lang="ts">
interface CheckedControlSourceOptions {
  readonly kind: 'checkbox' | 'switch' | 'toggle-button';
  readonly initialValue: CheckboxValue;
  readonly controlled: boolean;
  readonly disabled: boolean;
  readonly: boolean;
}

function checkedControlSource(options: CheckedControlSourceOptions): string {
  const initialValue = typeof options.initialValue === 'string' ? `'${options.initialValue}'` : String(options.initialValue);
  const controlledSetup = options.controlled
    ? `import { ref } from 'vue';\n\nconst value = ref(${initialValue});`
    : '';
  const binding = options.controlled
    ? 'v-model="value"'
    : `:default-value="${String(options.initialValue)}"`;
  const flags = [options.disabled ? 'disabled' : '', options.readonly ? 'readonly' : '']
    .filter(Boolean)
    .map((flag) => `\n    ${flag}`)
    .join('');
  if (options.kind === 'switch') {
    return `<script setup lang="ts">\nimport { SwitchRoot, SwitchThumb } from '@sectile/vue/switch';${controlledSetup === '' ? '' : `\n${controlledSetup}`}\n<\/script>\n\n<template>\n  <SwitchRoot\n    ${binding}${flags}\n  >\n    <span>Notifications</span>\n    <SwitchThumb />\n  </SwitchRoot>\n</template>`;
  }
  if (options.kind === 'checkbox') {
    const checkboxBinding = options.controlled ? 'v-model="value"' : `:default-value="${initialValue}"`;
    return `<script setup lang="ts">\nimport { Check, Minus } from '@lucide/vue';\nimport { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox';${controlledSetup === '' ? '' : `\n${controlledSetup}`}\n<\/script>\n\n<template>\n  <CheckboxRoot\n    v-slot="{ isIndeterminate }"\n    ${checkboxBinding}${flags}\n  >\n    <span class="checkbox-marker" aria-hidden="true">\n      <CheckboxIndicator>\n        <Minus v-if="isIndeterminate" />\n        <Check v-else />\n      </CheckboxIndicator>\n    </span>\n    <span>Include analytics</span>\n  </CheckboxRoot>\n</template>`;
  }
  return `<script setup lang="ts">\nimport { ToggleButton } from '@sectile/vue/toggle-button';${controlledSetup === '' ? '' : `\n${controlledSetup}`}\n<\/script>\n\n<template>\n  <ToggleButton\n    ${binding}${flags}\n  >\n    Bold\n  </ToggleButton>\n</template>`;
}
</script>
