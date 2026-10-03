<script setup lang="ts">
import { ref } from 'vue';
import {
  ColorPickerNativeInput,
  ColorPickerRoot,
  ColorPickerTextInput,
  ColorPickerValueText,
} from '@sectile/vue/color-picker';

const color = ref('#4659d4');
</script>

<template>
  <div>
    <ColorPickerRoot
      v-slot="picker"
      v-model="color"
      :allow-alpha="false"
      label="Delivery label color"
    >
      <div data-example-control-row>
        <ColorPickerNativeInput type="color" :value="color" aria-label="Choose label color" />
        <ColorPickerTextInput :value="picker.text" aria-label="Label color text" />
      </div>
      <ColorPickerValueText />
    </ColorPickerRoot>
    <output aria-live="polite">Committed color: {{ color }}</output>
    <p>
      The native color picker and text editor share one committed value. Alpha is disabled here. The
      operating system owns the native picker’s appearance.
    </p>
  </div>
</template>
