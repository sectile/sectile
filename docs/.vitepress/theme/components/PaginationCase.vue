<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Ellipsis,
} from '@lucide/vue';
import { ToggleButton } from '@sectile/vue/toggle-button';
import {
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationNext,
  PaginationPrevious,
  PaginationRoot,
} from '@sectile/vue/pagination';
import DemoCard from './DemoCard.vue';
import DemoSelect from './DemoSelect.vue';
import type { EventEntry } from '../types.js';

type PaginationVariant =
  | 'standard'
  | 'compact'
  | 'large'
  | 'page-size'
  | 'controlled'
  | 'readonly'
  | 'disabled'
  | 'empty';

const props = withDefaults(defineProps<{
  readonly title: string;
  readonly description: string;
  readonly variant: PaginationVariant;
  readonly total?: number;
  readonly initialPage?: number;
  readonly initialItemsPerPage?: number;
  readonly siblingCount?: number;
  readonly showEdges?: boolean;
  readonly boundaryControls?: boolean;
  readonly controlled?: boolean;
  readonly adjustable?: boolean;
  readonly readonly?: boolean;
  readonly disabled?: boolean;
}>(), {
  total: 240,
  initialPage: 1,
  initialItemsPerPage: 20,
  siblingCount: 1,
  showEdges: true,
  boundaryControls: true,
  controlled: false,
  adjustable: false,
  readonly: false,
  disabled: false,
});

const page = ref(props.initialPage);
const itemsPerPage = ref(props.initialItemsPerPage);
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const usesControlledOwnership = computed(() => props.controlled || props.adjustable);
const ownership = computed(() => usesControlledOwnership.value
  ? { modelValue: page.value, itemsPerPage: itemsPerPage.value }
  : { defaultValue: props.initialPage, defaultItemsPerPage: props.initialItemsPerPage });
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / itemsPerPage.value)));
const range = computed(() => {
  if (props.total === 0) return { start: 0, end: 0, total: 0 };
  const start = (page.value - 1) * itemsPerPage.value + 1;
  return { start, end: Math.min(props.total, start + itemsPerPage.value - 1), total: props.total };
});
const state = computed(() => ({
  page: page.value,
  itemsPerPage: itemsPerPage.value,
  pageCount: pageCount.value,
  range: range.value,
  ownership: usesControlledOwnership.value ? 'controlled' : 'uncontrolled',
}));
const interaction = computed(() => props.disabled ? 'disabled' : props.readonly ? 'readonly' : 'enabled');
const pageSizes = [10, 25, 50] as const;
const pageSizeIDs = pageSizes.map(String);
const pageSizeOptions = pageSizeIDs.map((id) => ({ id, label: id }));

const code = computed(() => {
  if (props.adjustable) {
    return `<script setup lang="ts">
import { ref } from 'vue';
import { PaginationRoot, PaginationPrevious, PaginationItem, PaginationNext } from '@sectile/vue/pagination';
import { SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValue } from '@sectile/vue/select';

const page = ref(${props.initialPage});
const itemsPerPage = ref(${props.initialItemsPerPage});
const pageSizes = ['10', '25', '50'];
<\/script>

<template>
  <PaginationRoot
    v-model="page"
    v-model:items-per-page="itemsPerPage"
    :total="${props.total}"
    v-slot="{ items, range }"
  >
    <span>{{ range.start }}–{{ range.end }} of {{ range.total }}</span>
    <SelectRoot
      :items="pageSizes"
      :model-value="String(itemsPerPage)"
      @update:model-value="itemsPerPage = Number($event); page = 1"
    >
      <SelectTrigger><SelectValue /> per page</SelectTrigger>
      <SelectContent>
        <SelectItem v-for="size in pageSizes" :key="size" :value="size">
          {{ size }} per page
        </SelectItem>
      </SelectContent>
    </SelectRoot>
    <PaginationPrevious>Previous</PaginationPrevious>
    <template v-for="item in items.filter(item => item.type !== 'control')" :key="JSON.stringify(item)">
      <span v-if="item.type === 'ellipsis'">…</span>
      <PaginationItem v-else :item="item">{{ item.page }}</PaginationItem>
    </template>
    <PaginationNext>Next</PaginationNext>
  </PaginationRoot>
</template>`;
  }

  const ownershipSource = props.controlled
    ? `const page = ref(${props.initialPage});\nconst itemsPerPage = ref(${props.initialItemsPerPage});`
    : '';
  const ownershipAttributes = props.controlled
    ? 'v-model="page" v-model:items-per-page="itemsPerPage"'
    : `:default-value="${props.initialPage}" :default-items-per-page="${props.initialItemsPerPage}"`;
  const setupImports = props.controlled ? "import { ref } from 'vue';\n" : '';
  const interactionAttributes = `${props.readonly ? ' readonly' : ''}${props.disabled ? ' disabled' : ''}`;
  return `<script setup lang="ts">
${setupImports}import { PaginationRoot, PaginationFirst, PaginationPrevious, PaginationItem, PaginationNext, PaginationLast } from '@sectile/vue/pagination';
${ownershipSource}
<\/script>

<template>
  <PaginationRoot
    ${ownershipAttributes}
    :total="${props.total}"
    :sibling-count="${props.siblingCount}"
    :show-edges="${props.showEdges}"
    v-slot="{ items, page, pageCount }"${interactionAttributes}
  >
    <span>Page {{ page }} of {{ pageCount }}</span>
    <PaginationFirst>First</PaginationFirst>
    <PaginationPrevious>Previous</PaginationPrevious>
    <template v-for="item in items.filter(item => item.type !== 'control')" :key="JSON.stringify(item)">
      <span v-if="item.type === 'ellipsis'">…</span>
      <PaginationItem v-else :item="item">{{ item.page }}</PaginationItem>
    </template>
    <PaginationNext>Next</PaginationNext>
    <PaginationLast>Last</PaginationLast>
  </PaginationRoot>
</template>`;
});

function addEntry(event: string, effect: string): void {
  revision.value += 1;
  entries.value = [{ revision: revision.value, event, accepted: true, effects: [effect] }, ...entries.value];
}

function updatePage(next: number): void {
  page.value = next;
  addEntry('update:modelValue', `set-page page=${next}`);
}

function updateItemsPerPage(next: number): void {
  itemsPerPage.value = next;
  addEntry('update:itemsPerPage', `set-items-per-page value=${next}`);
}

function changePageSize(value: string | null): void {
  if (value === null) return;
  const next = Number(value);
  page.value = 1;
  itemsPerPage.value = next;
  addEntry('change-page-size', `set-items-per-page value=${next}, set-page page=1`);
}

function goToPage(next: number): void {
  page.value = next;
  addEntry('external-page-change', `sync-page page=${next}`);
}

function togglePage(next: number, pressed: boolean): void {
  if (pressed) goToPage(next);
}
</script>

<template>
  <DemoCard
    :title="title"
    :revision="revision"
    :state="state"
    :entries="entries"
    :interaction="interaction"
    :code="code"
  >
    <div class="pagination-demo">
      <p class="demo-copy">{{ description }}</p>
      <PaginationRoot
        v-bind="ownership"
        :total="total"
        :sibling-count="siblingCount"
        :show-edges="showEdges"
        :readonly="readonly"
        :disabled="disabled"
        :label="`${title} pages`"
        class="pagination-control"
        v-slot="{ items, page: currentPage, pageCount: currentPageCount, range: currentRange }"
        @update:model-value="updatePage"
        @update:items-per-page="updateItemsPerPage"
      >
        <div class="pagination-summary">
          <div>
            <strong v-if="total > 0">{{ currentRange.start }}–{{ currentRange.end }}</strong>
            <strong v-else>No results</strong>
            <span>{{ total > 0 ? `of ${currentRange.total} results` : 'Try changing the filters.' }}</span>
          </div>
          <span class="pagination-page-status">Page {{ currentPage }} of {{ currentPageCount }}</span>
        </div>

        <div v-if="adjustable" class="pagination-size-row">
          <span>Rows per page</span>
          <DemoSelect
            :options="pageSizeOptions"
            :model-value="String(itemsPerPage)"
            :disabled="disabled"
            label="Rows per page"
            compact
            @update:model-value="changePageSize"
          />
        </div>

        <div v-if="controlled" class="pagination-jump" aria-label="External page controls">
          <span>Parent state</span>
          <ToggleButton
            v-for="target in [1, Math.ceil(currentPageCount / 2), currentPageCount]"
            :key="target"
            class="secondary"
            :model-value="currentPage === target"
            @update:model-value="togglePage(target, $event)"
          >
            {{ target }}
          </ToggleButton>
        </div>

        <div v-if="variant === 'compact'" class="pagination-compact">
          <PaginationPrevious class="pagination-text-control">
            <ChevronLeft :size="16" aria-hidden="true" /> Previous
          </PaginationPrevious>
          <span>{{ currentPage }} / {{ currentPageCount }}</span>
          <PaginationNext class="pagination-text-control">
            Next <ChevronRight :size="16" aria-hidden="true" />
          </PaginationNext>
        </div>

        <div v-else class="pagination-items">
          <PaginationFirst v-if="boundaryControls" class="pagination-icon-control" aria-label="First page">
            <ChevronsLeft :size="16" aria-hidden="true" />
          </PaginationFirst>
          <PaginationPrevious class="pagination-icon-control" aria-label="Previous page">
            <ChevronLeft :size="16" aria-hidden="true" />
          </PaginationPrevious>
          <template v-for="item in items.filter(item => item.type !== 'control')" :key="JSON.stringify(item)">
            <span v-if="item.type === 'ellipsis'" class="pagination-ellipsis" aria-hidden="true">
              <Ellipsis :size="17" />
            </span>
            <PaginationItem v-else :item="item" class="pagination-page">{{ item.page }}</PaginationItem>
          </template>
          <PaginationNext class="pagination-icon-control" aria-label="Next page">
            <ChevronRight :size="16" aria-hidden="true" />
          </PaginationNext>
          <PaginationLast v-if="boundaryControls" class="pagination-icon-control" aria-label="Last page">
            <ChevronsRight :size="16" aria-hidden="true" />
          </PaginationLast>
        </div>
      </PaginationRoot>
    </div>
  </DemoCard>
</template>
