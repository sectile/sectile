<script setup lang="ts">
import { ref } from 'vue';
import {
  WindowSplitterHandle,
  WindowSplitterPane,
  WindowSplitterRoot,
} from '@sectile/vue/window-splitter';

const percentage = ref('50');
</script>

<template>
  <div data-example-window-splitter>
    <WindowSplitterRoot
      v-model="percentage"
      :min="25"
      :max="75"
      :step="1"
      label="Resize delivery panels"
    >
      <WindowSplitterPane side="before">
        <strong>Delivery</strong>
        <p>Parcel A</p>
      </WindowSplitterPane>
      <WindowSplitterHandle aria-label="Resize delivery panels" />
      <WindowSplitterPane side="after">
        <strong>Details</strong>
        <p>Ready to dispatch</p>
      </WindowSplitterPane>
    </WindowSplitterRoot>
    <output aria-live="polite">First pane: {{ percentage }}%</output>
    <p>
      Drag the separator or use arrow keys. Both panes retain at least 25% of the available width.
    </p>
  </div>
</template>
