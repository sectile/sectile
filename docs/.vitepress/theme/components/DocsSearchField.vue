<script setup lang="ts">
import { Search as SearchIcon } from '@lucide/vue';

defineProps<{
  readonly label: string;
  readonly compact?: boolean;
}>();
</script>

<template>
  <search class="docs-search-field" :data-size="compact ? 'compact' : 'default'">
    <label class="docs-search-field__control">
      <span class="docs-search-field__label">{{ label }}</span>
      <SearchIcon :size="16" aria-hidden="true" />
      <slot />
    </label>
  </search>
</template>

<style scoped>
.docs-search-field {
  display: block;
  min-width: 0;
  color: var(--sectile-content-tertiary);
}

.docs-search-field__control {
  display: flex;
  width: 100%;
  min-height: var(--sectile-control-height);
  box-sizing: border-box;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--sectile-border-control);
  border-radius: var(--sectile-radius-control);
  padding: 0 12px;
  background: var(--sectile-surface);
  transition:
    border-color var(--sectile-motion-fast) var(--sectile-ease-standard),
    box-shadow var(--sectile-motion-fast) var(--sectile-ease-standard);
}

.docs-search-field[data-size='compact'] .docs-search-field__control {
  min-height: 36px;
  padding-inline: 11px;
}

.docs-search-field__control:focus-within {
  border-color: var(--sectile-action);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--sectile-focus-ring) 22%, transparent);
}

.docs-search-field__control > svg {
  flex: none;
}

.docs-search-field__control :deep(input) {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  padding: 0;
  color: var(--sectile-content-primary);
  background: transparent;
  box-shadow: none;
  font: inherit;
}

.docs-search-field__control :deep(input:focus-visible) {
  outline: 0;
  box-shadow: none;
}

.docs-search-field__control :deep(input::placeholder) {
  color: var(--sectile-content-tertiary);
  opacity: 1;
}

.docs-search-field__label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
</style>
