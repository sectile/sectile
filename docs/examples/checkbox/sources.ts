import type { Host } from '../../.vitepress/theme/host-preference.js';

export const basicCheckboxSources = Object.freeze({
  core: `import { applyCheckboxEvent, createCheckboxState } from '@sectile/core/checkbox'
import { unwrap } from '@sectile/core/result'

let state = unwrap(createCheckboxState(false))
state = unwrap(applyCheckboxEvent(state, 'toggle')).state`,
  dom: `import { createCheckbox } from '@sectile/dom/checkbox'

const checkbox = createCheckbox({
  element: document.querySelector('[data-checkbox]')!,
  defaultValue: false,
  onValueChange(value) {
    console.log(value)
  },
})`,
  terminal: `import { createCheckbox } from '@sectile/terminal/checkbox'

const checkbox = createCheckbox({
  defaultValue: false,
  onValueChange(value) {
    render(value)
  },
})`,
  vue: `<script setup lang="ts">
import { Check } from '@lucide/vue'
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox'
import { ref } from 'vue'

const checked = ref(false)
<\/script>

<template>
  <CheckboxRoot v-model="checked" name="analytics">
    <CheckboxIndicator>
      <Check :size="15" />
    </CheckboxIndicator>
    Include analytics
  </CheckboxRoot>
</template>`,
} satisfies Readonly<Record<Host, string>>);

export const basicCheckboxKoSources = Object.freeze({
  ...basicCheckboxSources,
  vue: basicCheckboxSources.vue.replaceAll('Include analytics', '분석 기능 포함'),
} satisfies Readonly<Record<Host, string>>);

export const indeterminateCheckboxSources = Object.freeze({
  core: `import { applyCheckboxEvent, createCheckboxState } from '@sectile/core/checkbox'
import { unwrap } from '@sectile/core/result'

let state = unwrap(createCheckboxState('mixed'))
state = unwrap(applyCheckboxEvent(state, 'toggle')).state`,
  dom: `import { createCheckbox } from '@sectile/dom/checkbox'

const checkbox = createCheckbox({
  element: document.querySelector('[data-group-checkbox]')!,
  defaultValue: 'mixed',
  onValueChange(value) {
    console.log(value)
  },
})`,
  terminal: `import { createCheckbox } from '@sectile/terminal/checkbox'

const checkbox = createCheckbox({
  defaultValue: 'mixed',
  onValueChange(value) {
    render(value)
  },
})`,
  vue: `<script setup lang="ts">
import { Check, Minus } from '@lucide/vue'
import { CheckboxIndicator, CheckboxRoot, type CheckboxValue } from '@sectile/vue/checkbox'
import { ref } from 'vue'

const value = ref<CheckboxValue>('indeterminate')
<\/script>

<template>
  <CheckboxRoot v-model="value" name="deployment-channels">
    <CheckboxIndicator v-slot="{ isIndeterminate }">
      <Minus v-if="isIndeterminate" :size="16" />
      <Check v-else :size="16" />
    </CheckboxIndicator>
    Deployment channels
  </CheckboxRoot>
</template>`,
} satisfies Readonly<Record<Host, string>>);

export const indeterminateCheckboxKoSources = Object.freeze({
  ...indeterminateCheckboxSources,
  vue: indeterminateCheckboxSources.vue.replaceAll('Deployment channels', '배포 채널'),
} satisfies Readonly<Record<Host, string>>);
