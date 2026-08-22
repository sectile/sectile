<script setup lang="ts">
import { computed, ref } from 'vue';
import { Check, Minus } from '@lucide/vue';
import {
  CheckboxIndicator,
  CheckboxRoot,
  type CheckboxValue,
} from '@sectile/vue/checkbox';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';

const props = withDefaults(defineProps<{
  readonly caseId: string;
  readonly title: string;
  readonly label: string;
  readonly helper: string;
  readonly description: string;
  readonly initialValue: CheckboxValue;
  readonly controlled?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly asChild?: boolean;
}>(), {
  controlled: false,
  disabled: false,
  readonly: false,
  asChild: false,
});

const value = ref<CheckboxValue>(props.initialValue);
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const interaction = computed<'enabled' | 'readonly' | 'disabled'>(() => (
  props.disabled ? 'disabled' : props.readonly ? 'readonly' : 'enabled'
));
const ownershipProps = computed(() => props.controlled
  ? { modelValue: value.value }
  : { defaultValue: props.initialValue });
const state = computed<Readonly<Record<string, unknown>>>(() => ({
  checked: value.value,
  ownership: props.controlled ? 'controlled' : 'uncontrolled',
  asChild: props.asChild,
}));
const status = computed(() => value.value === 'indeterminate'
  ? 'Partially selected'
  : value.value ? 'Checked' : 'Unchecked');
const preview = computed(() => value.value === 'indeterminate'
  ? 'Some deployment channels are included.'
  : value.value ? 'The option is active.' : 'The option is inactive.');
const sourceCode = computed(() => checkboxSource({
  initialValue: props.initialValue,
  controlled: props.controlled,
  disabled: props.disabled,
  readonly: props.readonly,
  asChild: props.asChild,
}));

function handleUpdate(next: CheckboxValue): void {
  value.value = next;
  revision.value += 1;
  entries.value = [{
    revision: revision.value,
    event: 'update:modelValue',
    accepted: true,
    effects: [`set-checkbox-value value=${String(next)}`],
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
    <div class="checkbox-demo" :data-case="caseId">
      <p class="demo-copy">{{ description }}</p>
      <div class="checkbox-toolbar">
        <CheckboxRoot
          v-bind="ownershipProps"
          :disabled="disabled"
          :readonly="readonly"
          :as-child="asChild"
          class="checkbox-control"
          @update:model-value="handleUpdate"
        >
          <button v-if="asChild" type="button" class="consumer-checkbox">
            <span class="checkbox-marker" aria-hidden="true">
              <CheckboxIndicator v-slot="{ checked }" class="checkbox-indicator">
                <Minus v-if="checked === 'indeterminate'" :size="15" :stroke-width="2.4" />
                <Check v-else-if="checked" :size="15" :stroke-width="2.4" />
              </CheckboxIndicator>
            </span>
            <span class="checked-control-label">
              <strong>{{ label }}</strong>
              <small>{{ helper }}</small>
            </span>
          </button>

          <template v-else>
            <span class="checkbox-marker" aria-hidden="true">
              <CheckboxIndicator v-slot="{ checked }" class="checkbox-indicator">
                <Minus v-if="checked === 'indeterminate'" :size="15" :stroke-width="2.4" />
                <Check v-else-if="checked" :size="15" :stroke-width="2.4" />
              </CheckboxIndicator>
            </span>
            <span class="checked-control-label">
              <strong>{{ label }}</strong>
              <small>{{ helper }}</small>
            </span>
          </template>
        </CheckboxRoot>
        <span class="checkbox-status" aria-live="polite">{{ status }}</span>
      </div>
      <p class="checkbox-preview">{{ preview }}</p>
    </div>
  </DemoCard>
</template>

<script lang="ts">
interface CheckboxSourceOptions {
  readonly initialValue: boolean | 'indeterminate';
  readonly controlled: boolean;
  readonly disabled: boolean;
  readonly: boolean;
  readonly asChild: boolean;
}

function checkboxSource(options: CheckboxSourceOptions): string {
  const serializedValue = typeof options.initialValue === 'string'
    ? `'${options.initialValue}'`
    : String(options.initialValue);
  const imports = options.controlled
    ? `import { ref } from 'vue';\nimport { Check, Minus } from '@lucide/vue';\nimport {\n  CheckboxIndicator,\n  CheckboxRoot,\n  type CheckboxValue,\n} from '@sectile/vue/checkbox';`
    : `import { Check, Minus } from '@lucide/vue';\nimport { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox';`;
  const setup = options.controlled
    ? `\n\nconst value = ref<CheckboxValue>(${serializedValue});`
    : '';
  const valueBinding = options.controlled
    ? 'v-model="value"'
    : typeof options.initialValue === 'string'
      ? `default-value="${options.initialValue}"`
      : `:default-value="${String(options.initialValue)}"`;
  const flags = [
    options.disabled ? 'disabled' : '',
    options.readonly ? 'readonly' : '',
    options.asChild ? 'as-child' : '',
  ].filter(Boolean).map((flag) => `\n    ${flag}`).join('');
  const content = `\n    <span class="checkbox-marker">\n      <CheckboxIndicator v-slot="{ checked }">\n        <Minus v-if="checked === 'indeterminate'" :size="15" />\n        <Check v-else-if="checked" :size="15" />\n      </CheckboxIndicator>\n    </span>\n    <span>Deployment channels</span>`;

  return `<script setup lang="ts">\n${imports}${setup}\n<\/script>\n\n<template>\n  <CheckboxRoot\n    ${valueBinding}${flags}\n  >${options.asChild ? `\n    <button type="button">${content}\n    </button>` : content}\n  </CheckboxRoot>\n</template>`;
}
</script>
