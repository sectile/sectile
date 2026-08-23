<script setup lang="ts">
import { Check, Minus } from '@lucide/vue';
import { CheckboxIndicator, CheckboxRoot, type CheckboxValue } from '@sectile/vue/checkbox';
import { computed, ref } from 'vue';
import { useDocsLocale } from '../../.vitepress/theme/locale.js';

const value = ref<CheckboxValue>('indeterminate');
const { isKorean } = useDocsLocale();
const summary = computed(() => value.value === true
  ? (isKorean.value ? '모두 선택됨' : 'All selected')
  : value.value === false
    ? (isKorean.value ? '선택 안 됨' : 'None selected')
    : (isKorean.value ? '3개 중 2개 선택됨' : '2 of 3 selected'));
</script>

<template>
  <CheckboxRoot v-model="value" class="group-checkbox" name="deployment-channels">
    <CheckboxIndicator v-slot="{ isIndeterminate }" class="group-checkbox__indicator">
      <Minus v-if="isIndeterminate" :size="16" :stroke-width="2.5" />
      <Check v-else :size="16" :stroke-width="2.5" />
    </CheckboxIndicator>
    <span>
      <strong>{{ isKorean ? '배포 채널' : 'Deployment channels' }}</strong>
      <small>{{ summary }}</small>
    </span>
  </CheckboxRoot>
</template>

<style>
.group-checkbox {
  display: flex;
  width: min(100%, 390px);
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--vp-c-border);
  border-radius: 11px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.group-checkbox:hover {
  border-color: var(--vp-c-brand-1);
}

.group-checkbox:focus-visible {
  outline: 3px solid var(--vp-c-brand-soft);
  outline-offset: 3px;
}

.group-checkbox__indicator {
  display: grid;
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 6px;
  color: white;
}

.group-checkbox[data-state='checked'] .group-checkbox__indicator,
.group-checkbox[data-state='indeterminate'] .group-checkbox__indicator {
  background: var(--vp-c-brand-1);
}

.group-checkbox strong,
.group-checkbox small {
  display: block;
}

.group-checkbox small {
  margin-top: 2px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}
</style>
