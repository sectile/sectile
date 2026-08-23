<script setup lang="ts">
import { computed, ref } from 'vue';
import { Bell, Bold } from '@lucide/vue';
import { SwitchRoot, SwitchThumb } from '@sectile/vue/switch';
import { ToggleButton } from '@sectile/vue/toggle-button';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';

const props = withDefaults(defineProps<{
  readonly kind: 'switch' | 'toggle-button';
  readonly title: string;
  readonly label: string;
  readonly description: string;
  readonly initialValue: boolean;
  readonly controlled?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
}>(), {
  controlled: false,
  disabled: false,
  readonly: false,
});

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
  [props.kind === 'switch' ? 'checked' : 'pressed']: value.value,
  ownership: props.controlled ? 'controlled' : 'uncontrolled',
}));
const sourceCode = computed(() => checkedControlSource({
  kind: props.kind,
  initialValue: props.initialValue,
  controlled: props.controlled,
  disabled: props.disabled,
  readonly: props.readonly,
}));

function handleUpdate(next: boolean): void {
  value.value = next;
  revision.value += 1;
  entries.value = [{
    revision: revision.value,
    event: 'update:modelValue',
    accepted: true,
    effects: [`set-${props.kind}-value value=${String(next)}`],
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
    <div class="checked-demo">
      <p class="demo-copy">{{ description }}</p>
      <SwitchRoot
        v-if="kind === 'switch'"
        v-bind="ownershipProps"
        :disabled="disabled"
        :readonly="readonly"
        class="switch-control"
        @update:model-value="handleUpdate"
      >
        <span class="checked-control-label">
          <Bell :size="17" aria-hidden="true" />
          <strong>{{ label }}</strong>
        </span>
        <span class="switch-track" aria-hidden="true">
          <SwitchThumb class="switch-thumb" />
        </span>
        <span class="switch-value">{{ value ? 'On' : 'Off' }}</span>
      </SwitchRoot>

      <ToggleButton
        v-else
        v-bind="ownershipProps"
        :disabled="disabled"
        :readonly="readonly"
        class="toggle-control"
        @update:model-value="handleUpdate"
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
  readonly kind: 'switch' | 'toggle-button';
  readonly initialValue: boolean;
  readonly controlled: boolean;
  readonly disabled: boolean;
  readonly: boolean;
}

function checkedControlSource(options: CheckedControlSourceOptions): string {
  const controlledSetup = options.controlled
    ? `import { ref } from 'vue';\n\nconst value = ref(${String(options.initialValue)});`
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
  return `<script setup lang="ts">\nimport { ToggleButton } from '@sectile/vue/toggle-button';${controlledSetup === '' ? '' : `\n${controlledSetup}`}\n<\/script>\n\n<template>\n  <ToggleButton\n    ${binding}${flags}\n  >\n    Bold\n  </ToggleButton>\n</template>`;
}
</script>
