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
  min-height: var(--docs-control-height, 44px);
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 0;
  border-radius: var(--docs-control-radius, 7px);
  background: transparent;
  color: var(--docs-text, #3c3c43);
  font: inherit;
  cursor: pointer;
}
.styled-checkbox__box {
  box-sizing: border-box;
  display: inline-grid;
  width: var(--docs-checkbox-size, 20px);
  height: var(--docs-checkbox-size, 20px);
  flex: none;
  place-items: center;
  border: 1px solid var(--docs-text-muted, #67676c);
  border-radius: var(--docs-small-radius, 4px);
  background: var(--docs-bg, white);
  color: var(--docs-on-accent, white);
}
.styled-checkbox__box :deep([data-part="indicator"]) {
  display: grid;
  place-items: center;
  line-height: 1;
}
.styled-checkbox__box svg {
  display: block;
}
.styled-checkbox[data-state="checked"] .styled-checkbox__box,
.styled-checkbox[data-state="indeterminate"] .styled-checkbox__box {
  border-color: var(--docs-accent, #4659d4);
  background: var(--docs-accent, #4659d4);
}
.styled-checkbox:focus-visible {
  outline: 2px solid var(--docs-accent, #4659d4);
  outline-offset: 3px;
}
.styled-checkbox:disabled {
  color: var(--docs-disabled-text, #67676c);
  cursor: not-allowed;
}
.styled-checkbox:disabled .styled-checkbox__box {
  border-color: var(--docs-disabled-border, #67676c);
  background: var(--docs-disabled-bg, #eeeeef);
  color: var(--docs-disabled-text, #67676c);
}
</style>
