<script setup lang="ts">
defineOptions({ inheritAttrs: false });

withDefaults(defineProps<{
  readonly appearance?: 'outline' | 'ghost';
  readonly compact?: boolean;
  readonly iconOnly?: boolean;
}>(), {
  appearance: 'outline',
  compact: false,
  iconOnly: false,
});
</script>

<template>
  <button
    v-bind="$attrs"
    class="docs-button"
    type="button"
    :data-appearance="appearance"
    :data-compact="compact ? '' : undefined"
    :data-icon-only="iconOnly ? '' : undefined"
  >
    <slot />
  </button>
</template>

<style scoped>
.docs-button {
  display: inline-flex;
  min-height: 36px;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--sectile-border-control);
  border-radius: 9px;
  padding: 0 11px;
  color: var(--sectile-content-secondary);
  background: var(--sectile-surface-interactive);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.docs-button[data-compact] {
  min-height: var(--sectile-control-height-compact);
  border-radius: 8px;
  padding-inline: 10px;
}

.docs-button[data-icon-only] {
  width: 28px;
  min-height: 28px;
  padding: 0;
}

.docs-button[data-appearance='ghost'] {
  border-color: transparent;
  color: var(--sectile-content-tertiary);
  background: transparent;
}

.docs-button:hover {
  border-color: var(--sectile-border-strong);
  color: var(--sectile-content-primary);
  background: var(--sectile-surface-hover);
}

.docs-button:focus-visible {
  outline: 2px solid var(--sectile-focus-ring);
  outline-offset: 2px;
}

.docs-button:disabled {
  border-color: var(--sectile-border-subtle);
  color: var(--sectile-content-disabled);
  background: var(--sectile-surface-disabled);
  cursor: not-allowed;
}
</style>
