<script setup lang="ts">
import { computed, ref } from 'vue';
import { ColorPickerChannelInput, ColorPickerControl, ColorPickerFormatTrigger, ColorPickerLabel, ColorPickerNativeInput, ColorPickerRoot, ColorPickerSwatch, ColorPickerTextInput, ColorPickerValueText } from '@sectile/vue/color-picker';
import DemoCard from './DemoCard.vue'; import type { EventEntry } from '../types.js';
const props = withDefaults(defineProps<{ readonly title: string; readonly description: string; readonly initialValue?: string; readonly alpha?: boolean; readonly controlled?: boolean; readonly readonly?: boolean }>(), { initialValue: '#5b6df6', alpha: true, controlled: false, readonly: false });
const value = ref(props.initialValue); const draft = ref<string | null>(null); const format = ref<'hex' | 'rgb'>('hex'); const revision = ref(0); const entries = ref<EventEntry[]>([]);
const state = computed(() => ({ value: value.value, draft: draft.value, format: format.value, ownership: props.controlled ? 'controlled' : 'uncontrolled', alpha: props.alpha }));
const code = `<script setup lang="ts">
import { ColorPickerChannelInput, ColorPickerNativeInput, ColorPickerRoot, ColorPickerSwatch, ColorPickerTextInput } from '@sectile/vue/color-picker'
<\/script>
<template>
  <ColorPickerRoot v-slot="color" default-value="#5b6df680" allow-alpha name="accent">
    <ColorPickerSwatch />
    <ColorPickerNativeInput />
    <ColorPickerTextInput />
    <ColorPickerChannelInput channel="alpha" />
    {{ color.text }}
  </ColorPickerRoot>
</template>`;
function record(event: string, next: string | null): void { revision.value += 1; entries.value = [{ revision: revision.value, event, accepted: true, effects: [String(next)] }, ...entries.value].slice(0, 12); }
function updateValue(next: string): void { value.value = next; record('value-change', next); }
function updateDraft(next: string | null): void { draft.value = next; record('draft-change', next); }
function updateFormat(next: 'hex' | 'rgb'): void { format.value = next; record('format-change', next); }
</script>
<template>
  <DemoCard :title="title" :revision="revision" :state="state" :entries="entries" interaction="enabled" :code="code">
    <ColorPickerRoot v-slot="color" class="color-picker-demo" :default-value="initialValue" v-bind="controlled ? { modelValue: value } : {}" :allow-alpha="alpha" :readonly="readonly" label="Accent color" name="accent" @update:model-value="updateValue" @update:draft="updateDraft" @update:format="updateFormat">
      <p class="demo-copy">{{ description }}</p>
      <ColorPickerLabel>Accent color</ColorPickerLabel>
      <ColorPickerControl class="color-picker-control">
        <ColorPickerSwatch class="color-picker-swatch" />
        <ColorPickerNativeInput class="color-picker-native" />
        <ColorPickerTextInput class="color-picker-text" />
      </ColorPickerControl>
      <div class="color-picker-channels">
        <label v-for="channel in (alpha ? ['red', 'green', 'blue', 'alpha'] : ['red', 'green', 'blue'])" :key="channel">
          <span>{{ channel[0]?.toUpperCase() }}</span>
          <ColorPickerChannelInput :channel="channel as 'red' | 'green' | 'blue' | 'alpha'" />
        </label>
      </div>
      <div class="color-picker-formats">
        <ColorPickerFormatTrigger format="hex">HEX</ColorPickerFormatTrigger>
        <ColorPickerFormatTrigger format="rgb">RGB</ColorPickerFormatTrigger>
        <ColorPickerValueText class="color-picker-value">{{ color.text }}</ColorPickerValueText>
      </div>
    </ColorPickerRoot>
  </DemoCard>
</template>
