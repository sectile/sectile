<script setup lang="ts">
defineProps<{
  readonly title: string;
  readonly titleId: string;
  readonly subtitle: string;
  readonly meta?: string;
}>();
</script>

<template>
  <header class="docs-demo-header">
    <div class="docs-demo-header__identity">
      <span class="docs-demo-header__icon"><slot name="icon" /></span>
      <div>
        <strong :id="titleId">{{ title }}</strong>
        <small>{{ subtitle }}<template v-if="meta"> · {{ meta }}</template></small>
      </div>
    </div>
    <slot name="action" />
  </header>
</template>

<style scoped>
.docs-demo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid var(--sectile-border-subtle);
  padding: 15px 16px;
}

.docs-demo-header__identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 11px;
}

.docs-demo-header__icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex: none;
  place-items: center;
  border-radius: 10px;
  color: var(--tabular-accent, var(--sectile-action));
  background: var(--tabular-accent-soft, var(--sectile-action-subtle));
}

.docs-demo-header__identity > div {
  display: grid;
  min-width: 0;
  gap: 1px;
}

.docs-demo-header strong {
  font-size: 13px;
  line-height: 1.35;
}

.docs-demo-header small {
  overflow: hidden;
  color: var(--sectile-content-tertiary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 720px) {
  .docs-demo-header { align-items: flex-start; }
}

@media (max-width: 520px) {
  .docs-demo-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    justify-content: stretch;
  }
}
</style>
