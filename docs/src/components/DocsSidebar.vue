<script setup lang="ts">
import DocsSidebarLink from './DocsSidebarLink.vue';
import DocsSidebarGroup from './DocsSidebarGroup.vue';
import { areas, areaPath, examplesFor } from '../examples/catalog.js';
import { currentPath, currentRoute, routes } from '../router.js';
defineProps<{ activeHost: { id: 'vue' | 'dom'; label: string }; menuOpen: boolean }>();
const componentRoutes = routes.filter(route => route.kind === 'component');
const guideRoutes = routes.filter(route => route.kind === 'guide');
</script>

<template>
<aside id="docs-navigation" class="docs-sidebar" :class="{ 'is-open': menuOpen }">
        <nav :aria-label="`${activeHost.label} documentation`">
          <DocsSidebarGroup :label="`${activeHost.label} documentation`">
            <DocsSidebarLink :to="activeHost.id === 'vue' ? '/' : '/dom'" :aria-current="currentRoute?.kind === 'home' || currentRoute?.kind === 'host' ? 'page' : undefined">Overview</DocsSidebarLink>
            <DocsSidebarLink v-if="activeHost.id === 'vue'" :to="'/vue/getting-started'" :aria-current="currentPath === '/vue/getting-started' ? 'page' : undefined">Getting started</DocsSidebarLink>
          </DocsSidebarGroup>
          <DocsSidebarGroup v-if="activeHost.id === 'vue'" label="Guides">
            <DocsSidebarLink v-for="route in guideRoutes.filter((route) => route.guide !== 'getting-started')" :key="route.path" :to="route.path" :aria-current="currentPath === route.path ? 'page' : undefined">{{ route.label }}</DocsSidebarLink>
          </DocsSidebarGroup>
          <DocsSidebarGroup label="Explore">
            <template v-for="area in areas" :key="area.id">
              <DocsSidebarLink :class="{ 'is-parent': currentRoute?.area === area.id }" :to="areaPath(activeHost.id, area.id)" :aria-current="currentPath === areaPath(activeHost.id, area.id) ? 'page' : undefined">{{ area.label }}<span class="docs-sidebar__count" :aria-label="`${examplesFor(activeHost.id, area.id).length} examples`">{{ examplesFor(activeHost.id, area.id).length }}</span></DocsSidebarLink>
              <template v-if="activeHost.id === 'vue' && area.id === 'components' && currentRoute?.area === 'components'">
                <DocsSidebarLink v-for="route in componentRoutes" :key="route.path" class="docs-sidebar__link--nested" :class="{ 'is-parent': currentPath.startsWith(`${route.path}/`) }" :to="route.path" :aria-current="currentPath === route.path ? 'page' : undefined">{{ route.label }}</DocsSidebarLink>
              </template>
            </template>
          </DocsSidebarGroup>
        </nav>
        <p class="docs-sidebar__note">Headless components.<br>Your visual system.</p>
      </aside>
</template>

<style scoped>
.docs-sidebar {
  position: sticky;
  top: var(--docs-header-height);
  align-self: start;
  height: calc(100dvh - var(--docs-header-height));
  overflow-y: auto;
  padding: var(--docs-space-6) var(--docs-space-5) var(--docs-space-5);
  background: var(--docs-bg);
}

.docs-sidebar__count {
  margin-left: auto;
  color: var(--docs-text-muted);
  font-size: var(--docs-font-size-caption);
  font-variant-numeric: tabular-nums;
}

.docs-sidebar__note {
  margin: var(--docs-space-6) var(--docs-space-3) 0;
  padding-top: var(--docs-space-5);
  color: var(--docs-text-muted);
  font-size: var(--docs-font-size-caption);
}

@media (max-width: 760px) {
  .docs-sidebar {
    display: none;
    position: fixed;
    right: 0;
    left: 0;
    z-index: 19;
    border-right: 0;
    border-bottom: 1px solid var(--docs-border);
  }
  .docs-sidebar.is-open {
    display: block;
  }
}
</style>
