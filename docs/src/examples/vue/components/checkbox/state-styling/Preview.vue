<script setup lang="ts">
import { ref } from 'vue';
import { CheckboxIndicator, CheckboxRoot, type CheckboxValue } from '@sectile/vue/checkbox';

const checked = ref<CheckboxValue>(false);
</script>

<template>
  <CheckboxRoot v-model="checked" class="styled-checkbox">
    <span class="styled-checkbox__box" aria-hidden="true">
      <CheckboxIndicator>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="m3 8 3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </CheckboxIndicator>
    </span>
    Deployment notifications
  </CheckboxRoot>
</template>

<style scoped>
.styled-checkbox {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #3c3c43;
  font: inherit;
  cursor: pointer;
}
.styled-checkbox__box {
  display: inline-grid;
  width: 20px;
  height: 20px;
  flex: none;
  place-items: center;
  border: 1px solid #67676c;
  border-radius: 4px;
  background: white;
  color: white;
}
.styled-checkbox[data-state="checked"] .styled-checkbox__box,
.styled-checkbox[data-state="indeterminate"] .styled-checkbox__box {
  border-color: #4659d4;
  background: #4659d4;
}
.styled-checkbox:focus-visible {
  outline: 2px solid #4659d4;
  outline-offset: 3px;
}
.styled-checkbox:disabled {
  opacity: .5;
  cursor: not-allowed;
}
</style>
