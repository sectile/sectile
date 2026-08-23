<script setup lang="ts">
import { Check } from '@lucide/vue';
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox';
import { ref } from 'vue';
import { useDocsLocale } from '../../.vitepress/theme/locale.js';

const checked = ref(false);
const { isKorean } = useDocsLocale();
</script>

<template>
  <div class="checkbox-example">
    <CheckboxRoot v-model="checked" class="checkbox" name="analytics">
      <CheckboxIndicator class="checkbox__indicator">
        <Check :size="15" :stroke-width="2.5" />
      </CheckboxIndicator>
      <span>{{ isKorean ? '분석 기능 포함' : 'Include analytics' }}</span>
    </CheckboxRoot>
  </div>
</template>

<style>
.checkbox-example {
  display: inline-flex;
  align-items: center;
}

.checkbox {
  display: inline-grid;
  grid-template-columns: 20px minmax(0, auto);
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--vp-c-text-1);
  font: inherit;
  font-weight: 600;
  line-height: 1.35;
  white-space: nowrap;
  cursor: pointer;
}

.checkbox:hover {
  background: var(--vp-c-bg-soft);
}

.checkbox:focus-visible {
  outline: 3px solid var(--vp-c-brand-soft);
  outline-offset: 2px;
}

.checkbox__indicator {
  display: grid;
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 5px;
  color: white;
}

.checkbox[data-state='checked'] .checkbox__indicator {
  background: var(--vp-c-brand-1);
}

</style>
