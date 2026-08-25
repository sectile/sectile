<script setup lang="ts">
import { Check, ChevronDown } from '@lucide/vue';
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
} from '@sectile/vue/select';
import { computed } from 'vue';

interface Option {
  readonly label: string;
  readonly value: string;
}

const props = defineProps<{
  readonly accessibleLabel: string;
  readonly currentLabel: string;
  readonly label: string;
  readonly mobile?: boolean;
  readonly modelValue: string;
  readonly options: readonly Option[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();
const values = computed(() => props.options.map((option) => option.value));
</script>

<template>
  <SelectRoot
    :items="values"
    :model-value="props.modelValue"
    :label="props.accessibleLabel"
    :position="!props.mobile"
    :text-value="(value) => props.options.find((option) => option.value === value)?.label ?? value"
    class="nav-preference-menu"
    :class="{ 'nav-preference-menu--mobile': props.mobile }"
    @update:model-value="emit('update:modelValue', $event ?? props.modelValue)"
  >
    <SelectTrigger class="nav-preference-menu__trigger">
      <slot name="icon" />
      <span class="nav-preference-menu__label">{{ props.label }}</span>
      <strong>{{ props.currentLabel }}</strong>
      <ChevronDown class="nav-preference-menu__chevron" :size="14" aria-hidden="true" />
    </SelectTrigger>

    <SelectPortal :disabled="props.mobile">
      <SelectContent class="nav-preference-menu__items">
        <SelectItem
          v-for="option in props.options"
          :key="option.value"
          :value="option.value"
          class="nav-preference-menu__item"
        >
          {{ option.label }}
          <SelectItemIndicator><Check :size="15" aria-hidden="true" /></SelectItemIndicator>
        </SelectItem>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<style scoped>
.nav-preference-menu {
  position: relative;
  height: var(--vp-nav-height);
}

.nav-preference-menu__trigger {
  display: flex;
  width: 100%;
  height: var(--vp-nav-height);
  align-items: center;
  border: 0;
  padding: 0 12px;
  color: var(--vp-c-text-1);
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-preference-menu__trigger:hover,
.nav-preference-menu__trigger:focus-visible {
  outline: 0;
  color: var(--vp-c-text-2);
}

.nav-preference-menu__trigger:focus-visible {
  box-shadow: inset 0 -2px var(--vp-c-brand-1);
}

.nav-preference-menu__label {
  margin-left: 7px;
  color: var(--vp-c-text-2);
}

.nav-preference-menu strong {
  margin-left: 6px;
  color: var(--vp-c-text-1);
  font-weight: 700;
}

.nav-preference-menu__chevron {
  margin-left: 4px;
  transition: transform 0.2s;
}

.nav-preference-menu[data-state="open"] .nav-preference-menu__chevron {
  transform: rotate(180deg);
}

.nav-preference-menu__items {
  z-index: 20;
  box-sizing: border-box;
  width: max-content;
  min-width: max(144px, var(--sectile-floating-anchor-width, 0px));
  max-width: calc(100vw - 16px);
  max-height: calc(100vh - var(--vp-nav-height));
  overflow-y: auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 12px;
  background: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-3);
}

.nav-preference-menu__item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-radius: 6px;
  padding: 0 12px;
  color: var(--vp-c-text-1);
  font-size: 14px;
  font-weight: 500;
  line-height: 32px;
  text-align: left;
  white-space: nowrap;
  transition: background-color 0.2s, color 0.2s;
}

.nav-preference-menu__item:hover,
.nav-preference-menu__item:focus-visible,
.nav-preference-menu__item[data-highlighted] {
  outline: 0;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-brand-1);
}

.nav-preference-menu__item[data-selected] {
  color: var(--vp-c-brand-1);
}

.nav-preference-menu--mobile {
  height: auto;
  margin: 12px 24px 0;
  border-top: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
}

.nav-preference-menu--mobile .nav-preference-menu__trigger {
  height: 48px;
  padding: 0;
}

.nav-preference-menu--mobile .nav-preference-menu__chevron {
  margin-left: auto;
}

.nav-preference-menu--mobile .nav-preference-menu__items {
  position: static;
  max-height: none;
  border: 0;
  border-radius: 0;
  padding: 0 0 12px 24px;
  background: transparent;
  box-shadow: none;
}
</style>
