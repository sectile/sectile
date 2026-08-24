<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { BookOpen, ChevronRight, FileCode2, Folder, FolderOpen } from '@lucide/vue';
import {
  TreeGridCell,
  TreeGridDisclosure,
  TreeGridEditor,
  TreeGridRoot,
  TreeGridRow,
} from '@sectile/vue/tree-grid';
import DemoCard from './DemoCard.vue';

const props = defineProps<{
  readonly scenario: string;
  readonly title: string;
  readonly description: string;
}>();

const rows = Object.freeze([
  { id: 'platform', parentID: null, cells: ['platform-name', 'platform-owner', 'platform-status'] },
  { id: 'storefront', parentID: 'platform', cells: ['storefront-name', 'storefront-owner', 'storefront-status'] },
  { id: 'checkout', parentID: 'storefront', cells: ['checkout-name', 'checkout-owner', 'checkout-status'] },
  { id: 'docs', parentID: 'platform', cells: ['docs-name', 'docs-owner', 'docs-status'] },
]);

const values = reactive(new Map<string, string>([
  ['platform-name', 'Commerce platform'], ['platform-owner', 'Platform team'], ['platform-status', 'Healthy'],
  ['storefront-name', 'Storefront'], ['storefront-owner', 'Mina Kim'], ['storefront-status', 'Modified'],
  ['checkout-name', 'Checkout flow'], ['checkout-owner', 'Alex Chen'], ['checkout-status', 'In review'],
  ['docs-name', 'Documentation'], ['docs-owner', 'Technical writing'], ['docs-status', 'Published'],
]));

const revision = ref(0);
const editable = computed(() => props.scenario === 'editable');
const state = computed(() => ({
  scenario: props.scenario,
  resources: rows.length,
  editableColumn: 'Owner',
}));

function valueFor(id: string): string {
  return values.get(id) ?? '';
}

function updateValue(id: string, value: string): void {
  values.set(id, value);
  revision.value += 1;
}

function statusTone(value: string): string {
  if (value === 'Healthy' || value === 'Published') return 'success';
  if (value === 'In review') return 'review';
  return 'neutral';
}
</script>

<template>
  <DemoCard :title="title" :revision="revision" :state="state" :entries="[]" interaction="enabled" code="">
    <TreeGridRoot
      :rows="rows"
      :get-cell-value="valueFor"
      :set-cell-value="updateValue"
      :default-expanded-value="['platform', 'storefront']"
      :default-highlighted-value="editable ? 'storefront-owner' : 'platform-name'"
      :default-edit-mode="editable ? 'editing' : 'navigation'"
      class="tree-grid-demo"
      aria-label="Project inventory"
      v-slot="{ expandedValue }"
    >
      <header class="tree-grid-demo__summary">
        <div>
          <strong>Project inventory</strong>
          <span>Production workspace</span>
        </div>
        <span>{{ rows.length }} resources</span>
      </header>

      <div class="tree-grid-demo__table">
        <div class="tree-grid-demo__header" role="row">
          <span role="columnheader">Resource</span>
          <span role="columnheader">Owner</span>
          <span role="columnheader">Status</span>
        </div>

        <TreeGridRow value="platform" :row-index="1" :expandable="true" class="tree-grid-demo__row tree-grid-demo__row--parent">
          <TreeGridCell value="platform-name" :column-index="1" class="tree-grid-demo__cell tree-grid-demo__resource tree-grid-demo__resource--level-1">
            <TreeGridDisclosure v-slot="{ expanded }" for="platform" as="button" class="tree-grid-demo__disclosure" aria-label="Toggle Commerce platform">
              <ChevronRight :size="16" :class="{ 'is-expanded': expanded }" aria-hidden="true" />
            </TreeGridDisclosure>
            <FolderOpen v-if="expandedValue.includes('platform')" :size="18" aria-hidden="true" />
            <Folder v-else :size="18" aria-hidden="true" />
            <span class="tree-grid-demo__label"><strong>{{ valueFor('platform-name') }}</strong><small>Workspace</small></span>
          </TreeGridCell>
          <TreeGridCell value="platform-owner" :column-index="2" class="tree-grid-demo__cell tree-grid-demo__owner" v-slot="{ editing }">
            <span v-if="!editing">{{ valueFor('platform-owner') }}</span>
            <TreeGridEditor for="platform-owner" label="Commerce platform owner" />
          </TreeGridCell>
          <TreeGridCell value="platform-status" :column-index="3" class="tree-grid-demo__cell">
            <span class="tree-grid-demo__status" :data-tone="statusTone(valueFor('platform-status'))">{{ valueFor('platform-status') }}</span>
          </TreeGridCell>
        </TreeGridRow>

        <TreeGridRow v-if="expandedValue.includes('platform')" value="storefront" :row-index="2" :level="2" :expandable="true" class="tree-grid-demo__row">
          <TreeGridCell value="storefront-name" :column-index="1" class="tree-grid-demo__cell tree-grid-demo__resource tree-grid-demo__resource--level-2">
            <TreeGridDisclosure v-slot="{ expanded }" for="storefront" as="button" class="tree-grid-demo__disclosure" aria-label="Toggle Storefront">
              <ChevronRight :size="16" :class="{ 'is-expanded': expanded }" aria-hidden="true" />
            </TreeGridDisclosure>
            <FolderOpen v-if="expandedValue.includes('storefront')" :size="18" aria-hidden="true" />
            <Folder v-else :size="18" aria-hidden="true" />
            <span class="tree-grid-demo__label"><strong>{{ valueFor('storefront-name') }}</strong><small>Application</small></span>
          </TreeGridCell>
          <TreeGridCell value="storefront-owner" :column-index="2" class="tree-grid-demo__cell tree-grid-demo__owner" v-slot="{ editing }">
            <span v-if="!editing">{{ valueFor('storefront-owner') }}</span>
            <TreeGridEditor for="storefront-owner" label="Storefront owner" />
          </TreeGridCell>
          <TreeGridCell value="storefront-status" :column-index="3" class="tree-grid-demo__cell">
            <span class="tree-grid-demo__status" :data-tone="statusTone(valueFor('storefront-status'))">{{ valueFor('storefront-status') }}</span>
          </TreeGridCell>
        </TreeGridRow>

        <TreeGridRow v-if="expandedValue.includes('platform') && expandedValue.includes('storefront')" value="checkout" :row-index="3" :level="3" class="tree-grid-demo__row">
          <TreeGridCell value="checkout-name" :column-index="1" class="tree-grid-demo__cell tree-grid-demo__resource tree-grid-demo__resource--level-3">
            <span class="tree-grid-demo__spacer" aria-hidden="true" />
            <FileCode2 :size="18" aria-hidden="true" />
            <span class="tree-grid-demo__label"><strong>{{ valueFor('checkout-name') }}</strong><small>Feature</small></span>
          </TreeGridCell>
          <TreeGridCell value="checkout-owner" :column-index="2" class="tree-grid-demo__cell tree-grid-demo__owner" v-slot="{ editing }">
            <span v-if="!editing">{{ valueFor('checkout-owner') }}</span>
            <TreeGridEditor for="checkout-owner" label="Checkout flow owner" />
          </TreeGridCell>
          <TreeGridCell value="checkout-status" :column-index="3" class="tree-grid-demo__cell">
            <span class="tree-grid-demo__status" :data-tone="statusTone(valueFor('checkout-status'))">{{ valueFor('checkout-status') }}</span>
          </TreeGridCell>
        </TreeGridRow>

        <TreeGridRow v-if="expandedValue.includes('platform')" value="docs" :row-index="4" :level="2" class="tree-grid-demo__row">
          <TreeGridCell value="docs-name" :column-index="1" class="tree-grid-demo__cell tree-grid-demo__resource tree-grid-demo__resource--level-2">
            <span class="tree-grid-demo__spacer" aria-hidden="true" />
            <BookOpen :size="18" aria-hidden="true" />
            <span class="tree-grid-demo__label"><strong>{{ valueFor('docs-name') }}</strong><small>Content</small></span>
          </TreeGridCell>
          <TreeGridCell value="docs-owner" :column-index="2" class="tree-grid-demo__cell tree-grid-demo__owner" v-slot="{ editing }">
            <span v-if="!editing">{{ valueFor('docs-owner') }}</span>
            <TreeGridEditor for="docs-owner" label="Documentation owner" />
          </TreeGridCell>
          <TreeGridCell value="docs-status" :column-index="3" class="tree-grid-demo__cell">
            <span class="tree-grid-demo__status" :data-tone="statusTone(valueFor('docs-status'))">{{ valueFor('docs-status') }}</span>
          </TreeGridCell>
        </TreeGridRow>
      </div>

      <footer class="tree-grid-demo__hint">
        <span>{{ editable ? 'Editing Storefront owner' : 'Arrow keys move between cells' }}</span>
        <span>Enter edits · Alt + ←/→ folds</span>
      </footer>
    </TreeGridRoot>
  </DemoCard>
</template>
