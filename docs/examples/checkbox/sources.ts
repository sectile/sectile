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

export const ownershipCheckboxSources = Object.freeze({
  core: `import { applyCheckboxEvent, createCheckboxState } from '@sectile/core/checkbox'

const initial = createCheckboxState(true)
if (!initial.ok) throw initial.error

const update = applyCheckboxEvent(initial.value, 'toggle')
if (!update.ok) throw update.error

console.log(update.value.state.checked)`,
  dom: `import { createCheckbox } from '@sectile/dom/checkbox'

let checked = true
const checkbox = createCheckbox({
  element: document.querySelector('[data-checkbox]')!,
  value: checked,
  onValueChange(next) {
    checked = next === true
    checkbox.update(checked)
  },
})

document.querySelector('[data-parent-toggle]')!
  .addEventListener('click', () => {
    checked = !checked
    checkbox.update(checked)
  })`,
  terminal: `import { createCheckbox } from '@sectile/terminal/checkbox'

let checked = true
const checkbox = createCheckbox({
  value: checked,
  onValueChange(next) {
    checked = next === true
    checkbox.update(checked)
    render(checked)
  },
})

checkbox.send({ key: 'space' })`,
  vue: `<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox'
import { ref } from 'vue'

const checked = ref(true)
<\/script>

<template>
  <CheckboxRoot v-model="checked" name="release-approval">
    <CheckboxIndicator>✓</CheckboxIndicator>
    Approve release
  </CheckboxRoot>

  <button type="button" @click="checked = !checked">
    Change from parent
  </button>
</template>`,
} satisfies Readonly<Record<Host, string>>);

export const ownershipCheckboxKoSources = Object.freeze({
  ...ownershipCheckboxSources,
  vue: ownershipCheckboxSources.vue
    .replaceAll('Approve release', '배포 승인')
    .replaceAll('Change from parent', '부모에서 값 변경'),
} satisfies Readonly<Record<Host, string>>);

export const formCheckboxSources = Object.freeze({
  core: `import { createCheckboxState } from '@sectile/core/checkbox'

const result = createCheckboxState(true)
if (!result.ok) throw result.error

const formValue = result.value.checked === true
  ? { notifications: 'release' }
  : {}

submit(formValue)`,
  dom: `import { createCheckbox } from '@sectile/dom/checkbox'

const input = document.querySelector<HTMLInputElement>('[name="notifications"]')!
createCheckbox({ element: input, defaultValue: true })

document.querySelector('form')!.addEventListener('submit', (event) => {
  event.preventDefault()
  const data = new FormData(event.currentTarget as HTMLFormElement)
  console.log(data.get('notifications'))
})`,
  terminal: `import { createCheckbox } from '@sectile/terminal/checkbox'

const checkbox = createCheckbox({ defaultValue: true })
const payload = checkbox.state.checked === true
  ? { notifications: 'release' }
  : {}

submit(payload)`,
  vue: `<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox'

function submit(event: Event) {
  const form = event.currentTarget as HTMLFormElement
  console.log(new FormData(form).get('notifications'))
}
<\/script>

<template>
  <form @submit.prevent="submit">
    <CheckboxRoot
      :default-value="true"
      name="notifications"
      value="release"
    >
      <CheckboxIndicator>✓</CheckboxIndicator>
      Receive release notifications
    </CheckboxRoot>
    <button type="submit">Submit form</button>
  </form>
</template>`,
} satisfies Readonly<Record<Host, string>>);

export const formCheckboxKoSources = Object.freeze({
  ...formCheckboxSources,
  vue: formCheckboxSources.vue
    .replaceAll('Receive release notifications', '배포 알림 받기')
    .replaceAll('Submit form', '양식 제출'),
} satisfies Readonly<Record<Host, string>>);

export const interactionCheckboxSources = Object.freeze({
  core: `import { createCheckboxState } from '@sectile/core/checkbox'

const result = createCheckboxState(true)
if (!result.ok) throw result.error

// The host decides whether interaction is disabled or readonly.
render(result.value, { disabled: true })`,
  dom: `import { createCheckbox } from '@sectile/dom/checkbox'

createCheckbox({
  element: document.querySelector('[data-policy]')!,
  defaultValue: true,
  disabled: true,
})

createCheckbox({
  element: document.querySelector('[data-audit-log]')!,
  defaultValue: true,
  readOnly: true,
})`,
  terminal: `import { createCheckbox } from '@sectile/terminal/checkbox'

const policy = createCheckbox({
  defaultValue: true,
  disabled: true,
})

const auditLog = createCheckbox({
  defaultValue: true,
  readOnly: true,
})`,
  vue: `<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox'
<\/script>

<template>
  <CheckboxRoot :default-value="true" disabled>
    <CheckboxIndicator>✓</CheckboxIndicator>
    Organization policy
  </CheckboxRoot>

  <CheckboxRoot :default-value="true" readonly>
    <CheckboxIndicator>✓</CheckboxIndicator>
    Retain audit log
  </CheckboxRoot>
</template>`,
} satisfies Readonly<Record<Host, string>>);

export const interactionCheckboxKoSources = Object.freeze({
  ...interactionCheckboxSources,
  vue: interactionCheckboxSources.vue
    .replaceAll('Organization policy', '조직 정책 적용')
    .replaceAll('Retain audit log', '감사 기록 보존'),
} satisfies Readonly<Record<Host, string>>);
