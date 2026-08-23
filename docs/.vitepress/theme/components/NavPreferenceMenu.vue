<script setup lang="ts">
import { Check, ChevronDown } from '@lucide/vue';
import { onBeforeUnmount, onMounted, ref } from 'vue';

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

const root = ref<HTMLDetailsElement | null>(null);

function close(): void {
  if (root.value) root.value.open = false;
}

function select(value: string): void {
  emit('update:modelValue', value);
  close();
}

function handlePointerDown(event: PointerEvent): void {
  if (root.value && !root.value.contains(event.target as Node)) close();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !root.value?.open) return;
  close();
  root.value.querySelector('summary')?.focus();
}

onMounted(() => {
  document.addEventListener('pointerdown', handlePointerDown);
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDown);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <details ref="root" class="nav-preference-menu" :class="{ 'nav-preference-menu--mobile': props.mobile }">
    <summary :aria-label="props.accessibleLabel">
      <slot name="icon" />
      <span class="nav-preference-menu__label">{{ props.label }}</span>
      <strong>{{ props.currentLabel }}</strong>
      <ChevronDown class="nav-preference-menu__chevron" :size="14" aria-hidden="true" />
    </summary>

    <div class="nav-preference-menu__items" role="radiogroup" :aria-label="props.accessibleLabel">
      <button
        v-for="option in props.options"
        :key="option.value"
        type="button"
        role="radio"
        :aria-checked="props.modelValue === option.value"
        @click="select(option.value)"
      >
        {{ option.label }}
        <Check v-if="props.modelValue === option.value" :size="15" aria-hidden="true" />
      </button>
    </div>
  </details>
</template>

<style scoped>
.nav-preference-menu {
  position: relative;
  height: var(--vp-nav-height);
}

.nav-preference-menu summary {
  display: flex;
  height: var(--vp-nav-height);
  align-items: center;
  padding: 0 12px;
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  list-style: none;
  transition: color 0.2s;
}

.nav-preference-menu summary::-webkit-details-marker {
  display: none;
}

.nav-preference-menu summary:hover,
.nav-preference-menu summary:focus-visible {
  outline: 0;
  color: var(--vp-c-text-2);
}

.nav-preference-menu summary:focus-visible {
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

.nav-preference-menu[open] .nav-preference-menu__chevron {
  transform: rotate(180deg);
}

.nav-preference-menu__items {
  position: absolute;
  z-index: 20;
  top: calc(var(--vp-nav-height) / 2 + 20px);
  right: 0;
  min-width: 144px;
  max-height: calc(100vh - var(--vp-nav-height));
  overflow-y: auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 12px;
  background: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-3);
}

.nav-preference-menu__items button {
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

.nav-preference-menu__items button:hover,
.nav-preference-menu__items button:focus-visible {
  outline: 0;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-brand-1);
}

.nav-preference-menu__items button[aria-checked="true"] {
  color: var(--vp-c-brand-1);
}

.nav-preference-menu--mobile {
  height: auto;
  margin: 12px 24px 0;
  border-top: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
}

.nav-preference-menu--mobile summary {
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
