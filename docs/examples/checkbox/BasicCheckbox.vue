<script setup lang="ts">
import { Check, Minus } from '@lucide/vue';
import { CheckboxIndicator, CheckboxRoot, type CheckboxValue } from '@sectile/vue/checkbox';
import { ref } from 'vue';

const value = ref<CheckboxValue>('indeterminate');
</script>

<template>
  <div class="permission-example">
    <p class="eyebrow">Deployment access</p>
    <CheckboxRoot v-model="value" class="permission" name="deployment-access">
      <CheckboxIndicator v-slot="{ isIndeterminate }" class="indicator">
        <Minus v-if="isIndeterminate" :size="16" :stroke-width="2.5" />
        <Check v-else :size="16" :stroke-width="2.5" />
      </CheckboxIndicator>
      <span>
        <strong>Select deployment channels</strong>
        <small>Partially selected values remain explicit.</small>
      </span>
    </CheckboxRoot>
    <p class="status">Current value: <code>{{ value }}</code></p>
  </div>
</template>

<style scoped>
.permission-example {
  width: min(100%, 520px);
}

.eyebrow {
  margin: 0 0 10px;
  color: var(--vp-c-text-3);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.permission {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  text-align: left;
  cursor: pointer;
}

.permission:hover {
  border-color: var(--vp-c-brand-1);
}

.permission:focus-visible {
  outline: 3px solid var(--vp-c-brand-soft);
  outline-offset: 3px;
}

.indicator {
  display: grid;
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 6px;
  color: white;
}

.permission[data-state='checked'] .indicator,
.permission[data-state='indeterminate'] .indicator {
  background: var(--vp-c-brand-1);
}

.permission strong,
.permission small {
  display: block;
}

.permission small {
  margin-top: 3px;
  color: var(--vp-c-text-2);
}

.status {
  margin: 12px 2px 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}
</style>
