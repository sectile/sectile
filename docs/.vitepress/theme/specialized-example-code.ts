const specializedComponents = new Set([
  'accordion',
  'cascade-select',
  'checkbox',
  'color-picker',
  'date-field',
  'date-range-field',
  'date-time-field',
  'disclosure',
  'editable',
  'listbox',
  'radio-group',
  'slider',
  'spin-button',
  'switch',
  'tabs',
  'text',
  'time-field',
  'time-range-field',
  'timer',
  'toast',
  'toggle-button',
  'toggle-group',
]);

function checkedControlSource(component: 'checkbox' | 'switch' | 'toggle-button', scenario: string): string {
  if (component === 'switch') {
    return `<script setup lang="ts">
import { ref } from 'vue'
import { SwitchRoot, SwitchThumb } from '@sectile/vue/switch'

const enabled = ref(false)
<\/script>

<template>
  <SwitchRoot v-model="enabled">
    <span>Deployment notifications</span>
    <SwitchThumb />
  </SwitchRoot>
</template>`;
  }
  if (component === 'checkbox') {
    const initial = scenario === 'mixed' ? "'indeterminate'" : 'false';
    return `<script setup lang="ts">
import { ref } from 'vue'
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox'

const checked = ref<boolean | 'indeterminate'>(${initial})
<\/script>

<template>
  <CheckboxRoot v-model="checked" v-slot="{ isIndeterminate }">
    <CheckboxIndicator>{{ isIndeterminate ? '−' : '✓' }}</CheckboxIndicator>
    <span>Include analytics</span>
  </CheckboxRoot>
</template>`;
  }
  return `<script setup lang="ts">
import { ref } from 'vue'
import { ToggleButton } from '@sectile/vue/toggle-button'

const pressed = ref(false)
<\/script>

<template>
  <ToggleButton v-model="pressed">Bold</ToggleButton>
</template>`;
}

function nativeFieldSource(component: 'date-field' | 'time-field' | 'date-time-field', scenario: string): string {
  const names = {
    'date-field': ['DateField', "{ year: 2026, month: 8, day: 22 }"],
    'time-field': ['TimeField', "{ hour: 9, minute: 30, second: 0, millisecond: 0 }"],
    'date-time-field': ['DateTimeField', "{ date: { year: 2026, month: 8, day: 22 }, time: { hour: 9, minute: 30, second: 0, millisecond: 0 } }"],
  } as const;
  const [name, initial] = names[component];
  const policies = component === 'date-field' && scenario === 'bounded'
    ? `\nconst policies = {\n  min: { year: 2026, month: 8, day: 1 },\n  max: { year: 2026, month: 8, day: 31 },\n}`
    : component === 'time-field' && scenario === 'stepped'
      ? `\nconst policies = { step: { minute: 15 } }`
      : '';
  const policyBinding = policies === '' ? '' : ' :policies="policies"';
  return `<script setup lang="ts">
import { ref } from 'vue'
import { ${name} } from '@sectile/vue/${component}'

const value = ref(${initial})${policies}
<\/script>

<template>
  <${name} v-model="value"${policyBinding} />
</template>`;
}

function accordionSource(scenario: string): string {
  const multiple = scenario === 'multiple';
  const required = scenario === 'required';
  return `<script setup lang="ts">
import {
  AccordionContent, AccordionHeader, AccordionItem,
  AccordionRoot, AccordionTrigger,
} from '@sectile/vue/accordion'

const items = ['general', 'deployments', 'danger']
<\/script>

<template>
  <AccordionRoot
    :items="items"
    type="${multiple ? 'multiple' : 'single'}"
    ${required ? 'default-value="deployments"' : ':collapsible="true"'}
  >
    <AccordionItem v-for="item in items" :key="item" :value="item">
      <AccordionHeader><AccordionTrigger>{{ item }}</AccordionTrigger></AccordionHeader>
      <AccordionContent>Settings for {{ item }}</AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>`;
}

function listboxSource(scenario: string): string {
  const multiple = scenario === 'multiple';
  return `<script setup lang="ts">
import { ListboxItem, ListboxItemIndicator, ListboxItemText, ListboxRoot } from '@sectile/vue/listbox'

const items = ['production', 'staging', 'development']
<\/script>

<template>
  <ListboxRoot
    :items="items"
    selection-mode="${multiple ? 'multiple' : 'single'}"
    :default-value="${multiple ? "['production', 'development']" : "'production'"}"
  >
    <ListboxItem v-for="item in items" :key="item" :value="item">
      <ListboxItemText>{{ item }}</ListboxItemText>
      <ListboxItemIndicator>Selected</ListboxItemIndicator>
    </ListboxItem>
  </ListboxRoot>
</template>`;
}

function textSource(scenario: string): string {
  const multiline = scenario === 'multiline';
  const initial = scenario === 'unicode-selection' ? '한글과 emoji 👋' : 'Sectile';
  return `<script setup lang="ts">
import { ref } from 'vue'
import { TextField } from '@sectile/vue/text'

const value = ref('${initial}')
<\/script>

<template>
  <TextField v-model="value"${multiline ? ' multiline' : ''} />
</template>`;
}

function timerSource(scenario: string): string {
  const countdown = scenario === 'countdown';
  const target = scenario === 'target';
  return `<script setup lang="ts">
import { TimerActionTrigger, TimerArea, TimerItem, TimerRoot, TimerSeparator } from '@sectile/vue/timer'
<\/script>

<template>
  <TimerRoot${countdown ? ' countdown :start-ms="10_000" auto-start' : ''}${target ? ' :target-ms="15_000"' : ''}>
    <TimerArea>
      <TimerItem type="minutes" /><TimerSeparator>:</TimerSeparator><TimerItem type="seconds" />
    </TimerArea>
    <TimerActionTrigger action="start">Start</TimerActionTrigger>
    <TimerActionTrigger action="pause">Pause</TimerActionTrigger>
    <TimerActionTrigger action="reset">Reset</TimerActionTrigger>
  </TimerRoot>
</template>`;
}

function toastSource(scenario: string): string {
  const persistent = scenario === 'persistent';
  const limit = scenario === 'limited' ? 2 : 3;
  return `<script setup lang="ts">
import { ToastClose, ToastProvider, ToastRoot, ToastTitle, ToastViewport } from '@sectile/vue/toast'
<\/script>

<template>
  <ToastProvider :default-duration-ms="${persistent ? 'null' : '5000'}" :max-visible="${limit}" v-slot="{ toasts, toast }">
    <button @click="toast({ id: crypto.randomUUID(), title: 'Release saved', kind: 'success' })">Notify</button>
    <ToastViewport>
      <ToastRoot v-for="item in toasts" :key="item.id" :value="item.id">
        <ToastTitle /><ToastClose>Dismiss</ToastClose>
      </ToastRoot>
    </ToastViewport>
  </ToastProvider>
</template>`;
}

function toggleGroupSource(scenario: string): string {
  const multiple = scenario === 'multiple';
  return `<script setup lang="ts">
import { ref } from 'vue'
import { ToggleGroupItem, ToggleGroupRoot } from '@sectile/vue/toggle-group'

const items = ${multiple ? "['bold', 'italic', 'underline']" : "['left', 'center', 'right']"}
const value = ref(${multiple ? "['bold', 'italic']" : "['left']"})
<\/script>

<template>
  <ToggleGroupRoot :items="items" v-model="value"${multiple ? ' multiple' : ''}>
    <ToggleGroupItem v-for="item in items" :key="item" :value="item">{{ item }}</ToggleGroupItem>
  </ToggleGroupRoot>
</template>`;
}

const staticSources: Readonly<Record<string, string>> = {
  'cascade-select': `<script setup lang="ts">
import { CascadeSelectColumn, CascadeSelectContent, CascadeSelectItem, CascadeSelectRoot, CascadeSelectTrigger, CascadeSelectValue } from '@sectile/vue/cascade-select'
const nodes = [{ id: 'asia', parentID: null }, { id: 'kr', parentID: 'asia' }, { id: 'seoul', parentID: 'kr' }]
<\/script>
<template>
  <CascadeSelectRoot :nodes="nodes" default-value="seoul" v-slot="{ columns }">
    <CascadeSelectTrigger><CascadeSelectValue placeholder="Choose a destination" /></CascadeSelectTrigger>
    <CascadeSelectContent>
      <CascadeSelectColumn v-for="(_, depth) in columns" :key="depth" :depth="depth" v-slot="{ items }">
        <CascadeSelectItem v-for="item in items" :key="item" :value="item">{{ item }}</CascadeSelectItem>
      </CascadeSelectColumn>
    </CascadeSelectContent>
  </CascadeSelectRoot>
</template>`,
  'color-picker': `<script setup lang="ts">
import { ColorPickerAlphaSlider, ColorPickerArea, ColorPickerAreaThumb, ColorPickerFormatTrigger, ColorPickerHueSlider, ColorPickerRoot } from '@sectile/vue/color-picker'
<\/script>
<template>
  <ColorPickerRoot v-slot="color" default-value="#5b6df680" allow-alpha name="accent">
    <ColorPickerArea><ColorPickerAreaThumb /></ColorPickerArea>
    <ColorPickerHueSlider /><ColorPickerAlphaSlider />
    <ColorPickerFormatTrigger format="hsv">HSV</ColorPickerFormatTrigger>
    <output>{{ color.text }}</output>
  </ColorPickerRoot>
</template>`,
  'date-range-field': `<script setup lang="ts">
import { DateRangeFieldEndInput, DateRangeFieldRoot, DateRangeFieldStartInput } from '@sectile/vue/date-range-field'
const range = { start: { year: 2026, month: 8, day: 22 }, end: { year: 2026, month: 8, day: 25 } }
<\/script>
<template>
  <DateRangeFieldRoot :default-value="range">
    <DateRangeFieldStartInput name="start" /><span>to</span><DateRangeFieldEndInput name="end" />
  </DateRangeFieldRoot>
</template>`,
  disclosure: `<script setup lang="ts">
import { DisclosureContent, DisclosureRoot, DisclosureTrigger } from '@sectile/vue/disclosure'
<\/script>
<template>
  <DisclosureRoot :default-value="false">
    <DisclosureTrigger>Advanced options</DisclosureTrigger>
    <DisclosureContent>Configuration</DisclosureContent>
  </DisclosureRoot>
</template>`,
  editable: `<script setup lang="ts">
import { EditableArea, EditableCancelTrigger, EditableEditTrigger, EditableInput, EditablePreview, EditableRoot, EditableSubmitTrigger } from '@sectile/vue/editable'
<\/script>
<template>
  <EditableRoot default-value="release-candidate" v-slot="{ value }">
    <EditableArea><EditablePreview>{{ value }}</EditablePreview><EditableInput />
      <EditableEditTrigger>Edit</EditableEditTrigger><EditableSubmitTrigger>Save</EditableSubmitTrigger><EditableCancelTrigger>Cancel</EditableCancelTrigger>
    </EditableArea>
  </EditableRoot>
</template>`,
  'radio-group': `<script setup lang="ts">
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from '@sectile/vue/radio-group'
const items = ['email', 'push', 'sms']
<\/script>
<template>
  <RadioGroupRoot :items="items" default-value="email" name="channel">
    <RadioGroupItem v-for="item in items" :key="item" :value="item">{{ item }}<RadioGroupIndicator /></RadioGroupItem>
  </RadioGroupRoot>
</template>`,
  slider: `<script setup lang="ts">
import { ref } from 'vue'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from '@sectile/vue/slider'
const value = ref('40')
<\/script>
<template><SliderRoot v-model="value" min="0" max="100" step="1"><SliderTrack><SliderRange /><SliderThumb /></SliderTrack></SliderRoot></template>`,
  'spin-button': `<script setup lang="ts">
import { ref } from 'vue'
import { SpinButtonDecrement, SpinButtonIncrement, SpinButtonInput, SpinButtonRoot } from '@sectile/vue/spin-button'
const value = ref('1.5')
<\/script>
<template><SpinButtonRoot v-model="value" min="-10" max="10" step="0.5"><SpinButtonDecrement>−</SpinButtonDecrement><SpinButtonInput /><SpinButtonIncrement>+</SpinButtonIncrement></SpinButtonRoot></template>`,
  tabs: `<script setup lang="ts">
import { TabsContent, TabsIndicator, TabsList, TabsRoot, TabsTrigger } from '@sectile/vue/tabs'
const tabs = ['overview', 'activity', 'settings']
<\/script>
<template><TabsRoot :items="tabs" default-value="overview"><TabsList><TabsTrigger v-for="tab in tabs" :key="tab" :value="tab">{{ tab }}</TabsTrigger><TabsIndicator /></TabsList><TabsContent v-for="tab in tabs" :key="tab" :value="tab">{{ tab }}</TabsContent></TabsRoot></template>`,
  'time-range-field': `<script setup lang="ts">
import { TimeRangeFieldEndInput, TimeRangeFieldRoot, TimeRangeFieldStartInput } from '@sectile/vue/time-range-field'
const hours = { start: { hour: 9, minute: 30 }, end: { hour: 17, minute: 45 } }
<\/script>
<template><TimeRangeFieldRoot :default-value="hours"><TimeRangeFieldStartInput name="start" /><span>to</span><TimeRangeFieldEndInput name="end" /></TimeRangeFieldRoot></template>`,
};

export function specializedVueCodeFor(component: string, scenario: string): string {
  if (!specializedComponents.has(component)) return '';
  if (component === 'checkbox' || component === 'switch' || component === 'toggle-button') return checkedControlSource(component, scenario);
  if (component === 'date-field' || component === 'time-field' || component === 'date-time-field') return nativeFieldSource(component, scenario);
  if (component === 'accordion') return accordionSource(scenario);
  if (component === 'listbox') return listboxSource(scenario);
  if (component === 'text') return textSource(scenario);
  if (component === 'timer') return timerSource(scenario);
  if (component === 'toast') return toastSource(scenario);
  if (component === 'toggle-group') return toggleGroupSource(scenario);
  return staticSources[component] ?? '';
}

export function hasSpecializedVueCode(component: string): boolean {
  return specializedComponents.has(component);
}
