<script setup lang="ts">
import { computed, ref } from 'vue';
import { ColorPickerAlphaSlider, ColorPickerArea, ColorPickerAreaThumb, ColorPickerControl, ColorPickerCoordinateInput, ColorPickerCoordinateSlider, ColorPickerFormatTrigger, ColorPickerHueSlider, ColorPickerLabel, ColorPickerNativeInput, ColorPickerRoot, ColorPickerSwatch, ColorPickerTextInput, ColorPickerValueText, type ColorCoordinateValue, type ColorFormat, type ColorModel } from '@sectile/vue/color-picker';
import DemoCard from './DemoCard.vue'; import type { EventEntry } from '../types.js';
const props = withDefaults(defineProps<{ readonly title: string; readonly description: string; readonly initialValue?: string; readonly alpha?: boolean; readonly controlled?: boolean; readonly readonly?: boolean }>(), { initialValue: '#5b6df6', alpha: true, controlled: false, readonly: false });
const formats = ['hex', 'rgb', 'hsl', 'hsv', 'cmyk', 'oklch'] as const satisfies readonly ColorFormat[];
const value = ref(props.initialValue); const draft = ref<string | null>(null); const format = ref<ColorFormat>('hex'); const revision = ref(0); const entries = ref<EventEntry[]>([]);
const state = computed(() => ({ value: value.value, draft: draft.value, format: format.value, ownership: props.controlled ? 'controlled' : 'uncontrolled', alpha: props.alpha }));
const code = `<script setup lang="ts">
import { ColorPickerAlphaSlider, ColorPickerArea, ColorPickerAreaThumb, ColorPickerCoordinateSlider, ColorPickerFormatTrigger, ColorPickerHueSlider, ColorPickerRoot } from '@sectile/vue/color-picker'
<\/script>
<template>
  <ColorPickerRoot v-slot="color" default-value="#5b6df680" allow-alpha name="accent">
    <template v-if="color.format === 'hex' || color.format === 'hsv'">
      <ColorPickerArea><ColorPickerAreaThumb /></ColorPickerArea>
      <ColorPickerHueSlider />
    </template>
    <template v-else>
      <ColorPickerCoordinateSlider v-for="field in color.coordinates.filter(field => field.coordinate !== 'alpha')" :key="field.coordinate" :format="color.format" :coordinate="field.coordinate" />
    </template>
    <ColorPickerAlphaSlider />
    <ColorPickerFormatTrigger format="hsv">HSV</ColorPickerFormatTrigger>
  </ColorPickerRoot>
</template>`;
function record(event: string, next: string | null): void { revision.value += 1; entries.value = [{ revision: revision.value, event, accepted: true, effects: [String(next)] }, ...entries.value].slice(0, 12); }
function updateValue(next: string): void { value.value = next; record('value-change', next); }
function updateDraft(next: string | null): void { draft.value = next; record('draft-change', next); }
function updateFormat(next: ColorFormat): void { format.value = next; record('format-change', next); }
</script>
<template>
  <DemoCard :title="title" :revision="revision" :state="state" :entries="entries" interaction="enabled" :code="code">
    <ColorPickerRoot v-slot="color" class="color-picker-demo" :default-value="initialValue" v-bind="controlled ? { modelValue: value } : {}" :allow-alpha="alpha" :readonly="readonly" label="Accent color" name="accent" @update:model-value="updateValue" @update:draft="updateDraft" @update:format="updateFormat">
      <p class="demo-copy">{{ description }}</p>
      <ColorPickerLabel>Accent color</ColorPickerLabel>
      <div class="color-picker-visual" :data-format="color.format">
        <template v-if="color.format === 'hex' || color.format === 'hsv'">
          <ColorPickerArea class="color-picker-area">
            <ColorPickerAreaThumb class="color-picker-area-thumb" />
          </ColorPickerArea>
          <div class="color-picker-sliders">
            <label>
              <span>Hue</span>
              <ColorPickerHueSlider class="color-picker-hue" />
            </label>
          </div>
        </template>
        <div v-else class="color-picker-model-sliders">
          <label v-for="field in color.coordinates.filter((entry: ColorCoordinateValue) => entry.coordinate !== 'alpha')" :key="`slider-${color.format}-${field.coordinate}`">
            <span>{{ field.label }}</span>
            <ColorPickerCoordinateSlider :format="color.format as ColorModel" :coordinate="field.coordinate" />
            <output>{{ field.value }}{{ field.unit }}</output>
          </label>
        </div>
        <div v-if="alpha" class="color-picker-sliders color-picker-opacity">
          <label>
            <span>Alpha</span>
            <ColorPickerAlphaSlider class="color-picker-alpha" />
          </label>
        </div>
      </div>
      <div class="color-picker-formats">
        <ColorPickerFormatTrigger v-for="entry in formats" :key="entry" :format="entry">{{ entry.toUpperCase() }}</ColorPickerFormatTrigger>
      </div>
      <div class="color-picker-editor">
        <ColorPickerControl class="color-picker-control">
          <ColorPickerSwatch class="color-picker-swatch" />
          <div class="color-picker-text-field">
            <span>{{ color.format.toUpperCase() }}</span>
            <ColorPickerTextInput class="color-picker-text" />
          </div>
          <label class="color-picker-native-control">
            <span>System</span>
            <ColorPickerNativeInput class="color-picker-native" />
          </label>
        </ColorPickerControl>
        <div v-if="color.format !== 'hex'" class="color-picker-coordinates">
          <label v-for="field in color.coordinates.filter((entry: ColorCoordinateValue) => alpha || entry.coordinate !== 'alpha')" :key="`${color.format}-${field.coordinate}`">
            <span>{{ field.label }}</span>
            <span class="color-picker-coordinate-control">
              <ColorPickerCoordinateInput :format="color.format as ColorModel" :coordinate="field.coordinate" />
              <small>{{ field.unit }}</small>
            </span>
          </label>
        </div>
      </div>
      <ColorPickerValueText class="color-picker-value">{{ color.text }}</ColorPickerValueText>
    </ColorPickerRoot>
  </DemoCard>
</template>
