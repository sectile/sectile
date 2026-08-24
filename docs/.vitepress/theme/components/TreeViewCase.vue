<script setup lang="ts">
import { Check, ChevronRight, FileCode2, FileText, Folder, FolderOpen } from '@lucide/vue';
import { computed } from 'vue';
import { TreeViewDisclosure, TreeViewGroup, TreeViewItem, TreeViewRoot } from '@sectile/vue/tree-view';

const props = defineProps<{ readonly scenario: string }>();

const nodes = Object.freeze([
  { id: 'atlas', parentID: null },
  { id: 'apps', parentID: 'atlas' },
  { id: 'dashboard', parentID: 'apps' },
  { id: 'overview', parentID: 'dashboard' },
  { id: 'settings', parentID: 'dashboard' },
  { id: 'storefront', parentID: 'apps' },
  { id: 'packages', parentID: 'atlas' },
  { id: 'tokens', parentID: 'packages' },
  { id: 'readme', parentID: 'atlas' },
]);

const multiple = computed(() => props.scenario === 'multiple');
const defaultValue = computed(() => multiple.value ? ['overview', 'settings', 'tokens'] : ['settings']);
const defaultExpanded = Object.freeze(['atlas', 'apps', 'dashboard', 'packages']);

const labels: Readonly<Record<string, string>> = Object.freeze({
  atlas: 'Atlas workspace', apps: 'Applications', dashboard: 'Dashboard', overview: 'Overview.vue',
  settings: 'Settings.vue', storefront: 'Storefront', packages: 'Packages', tokens: 'tokens.ts', readme: 'README.md',
});
const details: Readonly<Record<string, string>> = Object.freeze({
  atlas: 'Workspace', apps: '2 apps', dashboard: '2 files', overview: '4.2 KB', settings: '3.8 KB',
  storefront: '18 files', packages: '1 package', tokens: '6.1 KB', readme: '2.4 KB',
});
const expandable = new Set(['atlas', 'apps', 'dashboard', 'packages']);
const fileIcons = new Set(['overview', 'settings', 'tokens']);

function iconFor(id: string, expanded: boolean) {
  if (id === 'readme') return FileText;
  if (fileIcons.has(id)) return FileCode2;
  return expanded ? FolderOpen : Folder;
}
</script>

<template>
  <section class="tree-view-demo" :class="{ 'tree-view-demo--multiple': multiple }">
    <header class="tree-view-demo__header">
      <div>
        <strong>{{ multiple ? 'Review files' : 'Project files' }}</strong>
        <span>{{ multiple ? 'Choose files to include in the review' : 'atlas / apps / dashboard' }}</span>
      </div>
    </header>

    <TreeViewRoot
      :nodes="nodes"
      :default-value="defaultValue"
      :default-expanded-value="defaultExpanded"
      :label="multiple ? 'Files selected for review' : 'Atlas project files'"
      class="tree-view-demo__tree"
      v-slot="{ expandedValue, value }"
    >
      <div v-if="multiple" class="tree-view-demo__selection-summary">
        <span>{{ value.length }} files selected</span>
        <span>Space toggles selection</span>
      </div>

      <TreeViewItem value="atlas" :level="1" class="tree-view-demo__item" v-slot="item">
        <TreeViewDisclosure for="atlas" as="button" class="tree-view-demo__disclosure" aria-label="Toggle Atlas workspace">
          <ChevronRight aria-hidden="true" />
        </TreeViewDisclosure>
        <component :is="iconFor('atlas', item.expanded)" class="tree-view-demo__icon" aria-hidden="true" />
        <span class="tree-view-demo__label">{{ labels['atlas'] }}</span><small>{{ details['atlas'] }}</small>
        <Check v-if="multiple && item.selected" class="tree-view-demo__check" aria-hidden="true" />
      </TreeViewItem>
      <TreeViewGroup v-if="expandedValue.includes('atlas')">
        <TreeViewItem value="apps" :level="2" class="tree-view-demo__item" v-slot="item">
          <TreeViewDisclosure for="apps" as="button" class="tree-view-demo__disclosure" aria-label="Toggle Applications">
            <ChevronRight aria-hidden="true" />
          </TreeViewDisclosure>
          <component :is="iconFor('apps', item.expanded)" class="tree-view-demo__icon" aria-hidden="true" />
          <span class="tree-view-demo__label">{{ labels['apps'] }}</span><small>{{ details['apps'] }}</small>
          <Check v-if="multiple && item.selected" class="tree-view-demo__check" aria-hidden="true" />
        </TreeViewItem>
        <TreeViewGroup v-if="expandedValue.includes('apps')">
          <TreeViewItem value="dashboard" :level="3" class="tree-view-demo__item" v-slot="item">
            <TreeViewDisclosure for="dashboard" as="button" class="tree-view-demo__disclosure" aria-label="Toggle Dashboard">
              <ChevronRight aria-hidden="true" />
            </TreeViewDisclosure>
            <component :is="iconFor('dashboard', item.expanded)" class="tree-view-demo__icon" aria-hidden="true" />
            <span class="tree-view-demo__label">{{ labels['dashboard'] }}</span><small>{{ details['dashboard'] }}</small>
            <Check v-if="multiple && item.selected" class="tree-view-demo__check" aria-hidden="true" />
          </TreeViewItem>
          <TreeViewGroup v-if="expandedValue.includes('dashboard')">
            <TreeViewItem v-for="id in ['overview', 'settings']" :key="id" :value="id" :level="4" class="tree-view-demo__item" v-slot="item">
              <span class="tree-view-demo__disclosure-spacer" />
              <component :is="iconFor(id, false)" class="tree-view-demo__icon" aria-hidden="true" />
              <span class="tree-view-demo__label">{{ labels[id] }}</span><small>{{ details[id] }}</small>
              <Check v-if="multiple && item.selected" class="tree-view-demo__check" aria-hidden="true" />
            </TreeViewItem>
          </TreeViewGroup>
          <TreeViewItem value="storefront" :level="3" class="tree-view-demo__item" v-slot="item">
            <span class="tree-view-demo__disclosure-spacer" /><component :is="iconFor('storefront', item.expanded)" class="tree-view-demo__icon" aria-hidden="true" />
            <span class="tree-view-demo__label">{{ labels['storefront'] }}</span><small>{{ details['storefront'] }}</small>
            <Check v-if="multiple && item.selected" class="tree-view-demo__check" aria-hidden="true" />
          </TreeViewItem>
        </TreeViewGroup>
        <TreeViewItem value="packages" :level="2" class="tree-view-demo__item" v-slot="item">
          <TreeViewDisclosure for="packages" as="button" class="tree-view-demo__disclosure" aria-label="Toggle Packages"><ChevronRight aria-hidden="true" /></TreeViewDisclosure>
          <component :is="iconFor('packages', item.expanded)" class="tree-view-demo__icon" aria-hidden="true" />
          <span class="tree-view-demo__label">{{ labels['packages'] }}</span><small>{{ details['packages'] }}</small>
          <Check v-if="multiple && item.selected" class="tree-view-demo__check" aria-hidden="true" />
        </TreeViewItem>
        <TreeViewGroup v-if="expandedValue.includes('packages')">
          <TreeViewItem value="tokens" :level="3" class="tree-view-demo__item" v-slot="item">
            <span class="tree-view-demo__disclosure-spacer" /><FileCode2 class="tree-view-demo__icon" aria-hidden="true" />
            <span class="tree-view-demo__label">{{ labels['tokens'] }}</span><small>{{ details['tokens'] }}</small>
            <Check v-if="multiple && item.selected" class="tree-view-demo__check" aria-hidden="true" />
          </TreeViewItem>
        </TreeViewGroup>
        <TreeViewItem value="readme" :level="2" class="tree-view-demo__item" v-slot="item">
          <span class="tree-view-demo__disclosure-spacer" /><FileText class="tree-view-demo__icon" aria-hidden="true" />
          <span class="tree-view-demo__label">{{ labels['readme'] }}</span><small>{{ details['readme'] }}</small>
          <Check v-if="multiple && item.selected" class="tree-view-demo__check" aria-hidden="true" />
        </TreeViewItem>
      </TreeViewGroup>
    </TreeViewRoot>
  </section>
</template>

<style scoped>
.tree-view-demo { width: min(100%, 44rem); border: 1px solid var(--vp-c-divider); border-radius: 1rem; overflow: hidden; background: var(--vp-c-bg); box-shadow: 0 14px 34px rgb(28 32 52 / 8%); }
.tree-view-demo__header { display: flex; justify-content: space-between; padding: 1rem 1.1rem; border-bottom: 1px solid var(--vp-c-divider); }
.tree-view-demo__header div { display: grid; gap: .2rem; }
.tree-view-demo__header span, .tree-view-demo__item small, .tree-view-demo__selection-summary { color: var(--vp-c-text-2); font-size: .78rem; }
.tree-view-demo__tree { padding: .55rem; }
.tree-view-demo__selection-summary { display: flex; justify-content: space-between; padding: .45rem .6rem .7rem; }
.tree-view-demo__item { --level: 1; display: grid; grid-template-columns: 1.5rem 1.35rem minmax(0, 1fr) auto 1.25rem; align-items: center; min-height: 2.75rem; padding: .35rem .65rem .35rem calc(.65rem + (var(--level) - 1) * 1.35rem); border: 1px solid transparent; border-radius: .65rem; color: var(--vp-c-text-1); }
.tree-view-demo__item[data-sectile-tree-view-level="2"] { --level: 2; }
.tree-view-demo__item[data-sectile-tree-view-level="3"] { --level: 3; }
.tree-view-demo__item[data-sectile-tree-view-level="4"] { --level: 4; }
.tree-view-demo__item:hover { background: var(--vp-c-bg-soft); }
.tree-view-demo__item[data-highlighted] { outline: 2px solid var(--vp-c-brand-1); outline-offset: -2px; }
.tree-view-demo__item[data-selected] { background: color-mix(in srgb, var(--vp-c-brand-soft) 76%, var(--vp-c-bg)); color: var(--vp-c-brand-1); }
.tree-view-demo__disclosure { display: grid; place-items: center; width: 1.5rem; height: 1.5rem; border: 0; padding: 0; color: inherit; background: transparent; border-radius: .35rem; }
.tree-view-demo__disclosure svg { width: 1rem; transition: transform 140ms ease; }
.tree-view-demo__disclosure[data-state="open"] svg { transform: rotate(90deg); }
.tree-view-demo__disclosure-spacer { width: 1.5rem; }
.tree-view-demo__icon { width: 1.05rem; color: var(--vp-c-text-2); }
.tree-view-demo__label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tree-view-demo__check { width: 1rem; color: var(--vp-c-brand-1); }
.tree-view-demo:not(.tree-view-demo--multiple) .tree-view-demo__check { display: none; }
@media (max-width: 560px) { .tree-view-demo__item small { display: none; } .tree-view-demo__item { grid-template-columns: 1.5rem 1.35rem minmax(0, 1fr) 1.25rem; } }
</style>
