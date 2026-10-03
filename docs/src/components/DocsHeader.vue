<script setup lang="ts">
import DocsRouteLink from './DocsRouteLink.vue';
import { useTemplateRef } from 'vue';
import { DisclosureTrigger } from '@sectile/vue/disclosure';
import DocsButton from './DocsButton.vue';
defineProps<{ activeHost: { id: 'vue' | 'dom'; label: string }; menuOpen: boolean }>();
const menuButton = useTemplateRef<InstanceType<typeof DocsButton>>('menuButton');
defineExpose({ focusMenu: () => menuButton.value?.focus() });
</script>

<template>
<header class="docs-header">
      <DocsRouteLink class="docs-brand" :to="'/'">
        Sectile <span>Docs</span>
      </DocsRouteLink>
      <nav class="docs-primary-nav" aria-label="Documentation environments">
        <DocsRouteLink :to="'/vue'" :aria-current="activeHost.id === 'vue' ? 'location' : undefined">Vue</DocsRouteLink>
        <DocsRouteLink :to="'/dom'" :aria-current="activeHost.id === 'dom' ? 'location' : undefined">DOM</DocsRouteLink>
      </nav>
      <DisclosureTrigger as-child><DocsButton ref="menuButton" class="docs-menu-button" :aria-expanded="menuOpen" aria-controls="docs-navigation" >{{ menuOpen ? 'Close menu' : 'Menu' }}</DocsButton></DisclosureTrigger>
    </header>
</template>

<style scoped>
.docs-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  height: var(--docs-header-height);
  align-items: center;
  gap: var(--docs-space-6);
  padding-inline: var(--docs-space-5);
  border-bottom: 1px solid var(--docs-border);
  background: var(--docs-bg);
}

.docs-brand {
  display: flex;
  align-items: center;
  gap: var(--docs-space-3);
  color: var(--docs-text);
  font-size: 19px;
  font-weight: 740;
  letter-spacing: -.025em;
  text-decoration: none;
}

.docs-brand span {
  padding-left: var(--docs-space-3);
  color: var(--docs-text-muted);
  font-size: var(--docs-font-size-label);
  font-weight: 450;
  letter-spacing: 0;
}

.docs-primary-nav {
  display: flex;
  height: 100%;
  gap: var(--docs-space-5);
  margin-left: auto;
}

.docs-primary-nav a {
  display: grid;
  min-width: 44px;
  place-items: center;
  border-bottom: 2px solid transparent;
  color: var(--docs-text-muted);
  font-size: var(--docs-font-size-label);
  text-decoration: none;
}

.docs-primary-nav a[aria-current] {
  border-bottom-color: var(--docs-accent);
  color: var(--docs-accent);
  font-weight: 650;
}

.docs-menu-button {
  --docs-button-display: none;
}

@media (max-width: 760px) {
  .docs-header {
    gap: var(--docs-space-4);
    padding-inline: var(--docs-space-5);
  }
  .docs-brand {
    font-size: 18px;
  }
  .docs-brand span {
    display: none;
  }
  .docs-primary-nav {
    gap: var(--docs-space-2);
  }
  .docs-menu-button {
    --docs-button-display: inline-flex;
    --docs-button-font-size: var(--docs-font-size-caption);
  }
}
</style>
