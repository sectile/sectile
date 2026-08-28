<template>
  <footer class="docs-demo-footer">
    <span><slot /></span>
    <strong><slot name="summary" /></strong>
  </footer>
</template>

<style scoped>
.docs-demo-footer {
  display: flex;
  min-height: 52px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-top: 1px solid var(--sectile-border-subtle);
  padding: 15px 16px;
  color: var(--sectile-content-tertiary);
  font-size: 11px;
  line-height: 1.5;
}

.docs-demo-footer strong {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--sectile-content-secondary);
  white-space: nowrap;
}

@media (max-width: 720px) {
  .docs-demo-footer { align-items: flex-start; }
}

@media (max-width: 520px) {
  .docs-demo-footer {
    display: grid;
    gap: 8px;
  }
}
</style>
