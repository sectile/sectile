import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide,
  shallowRef, watch, type Component, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import {
  createPagination, getPaginationView, type PaginationConnection, type PaginationControl,
  type PaginationItem as PaginationViewItem, type PaginationItemRange,
} from '@sectile/dom/pagination';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';

export interface PaginationRootProps {
  readonly total: number;
  readonly modelValue?: number;
  readonly defaultValue?: number;
  readonly itemsPerPage?: number;
  readonly defaultItemsPerPage?: number;
  readonly siblingCount?: number;
  readonly showEdges?: boolean;
  readonly showControls?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly label?: string;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface PaginationRootSlotProps {
  readonly page: number;
  readonly itemsPerPage: number;
  readonly pageCount: number;
  readonly range: PaginationItemRange;
  readonly items: readonly PaginationViewItem[];
}
export interface PaginationItemProps { readonly item: PaginationViewItem; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface PaginationItemSlotProps { readonly item: PaginationViewItem; readonly selected: boolean; readonly disabled: boolean }

interface PaginationContext {
  readonly state: ComputedRef<PaginationRootSlotProps>;
  readonly disabled: ComputedRef<boolean>;
  readonly readonly: ComputedRef<boolean>;
  register(element: HTMLElement, item: PaginationViewItem): void;
}
const key = Symbol('SectilePaginationRoot');

export const PaginationRoot = defineComponent({
  name: 'SectilePaginationRoot', inheritAttrs: false,
  props: {
    total: { type: Number, required: true },
    modelValue: { type: Number, default: undefined }, defaultValue: { type: Number, default: 1 },
    itemsPerPage: { type: Number, default: undefined }, defaultItemsPerPage: { type: Number, default: 10 },
    siblingCount: { type: Number, default: 1 }, showEdges: { type: Boolean, default: true },
    showControls: { type: Boolean, default: true }, disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false }, label: { type: String, default: 'Pagination' },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'nav' }, asChild: { type: Boolean, default: false },
  },
  emits: {
    'update:modelValue': (_value: number): boolean => true,
    'update:itemsPerPage': (_value: number): boolean => true,
  },
  slots: Object as SlotsType<{ default: (props: PaginationRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const element = shallowRef<HTMLElement>();
    const connection = shallowRef<PaginationConnection>();
    const localPage = shallowRef(props.modelValue ?? props.defaultValue);
    const localItemsPerPage = shallowRef(props.itemsPerPage ?? props.defaultItemsPerPage);
    const pageControlled = useControlledStateInvariant('PaginationRoot', 'modelValue', () => props.modelValue);
    const sizeControlled = useControlledStateInvariant('PaginationRoot', 'itemsPerPage', () => props.itemsPerPage);
    const controlled = pageControlled || sizeControlled;
    if (controlled && (props.modelValue === undefined || props.itemsPerPage === undefined)) {
      throw new TypeError('Controlled pagination requires both modelValue and itemsPerPage.');
    }
    const effectiveItemsPerPage = computed(() => props.itemsPerPage ?? localItemsPerPage.value);
    const effectivePage = computed(() => reconcilePage(
      props.modelValue ?? localPage.value,
      props.total,
      effectiveItemsPerPage.value,
    ));
    const view = computed(() => {
      const result = getPaginationView({
        total: props.total, page: effectivePage.value,
        itemsPerPage: effectiveItemsPerPage.value,
        siblingCount: props.siblingCount, showEdges: props.showEdges, showControls: props.showControls,
      });
      if (!result.ok) throw new TypeError(result.error.message);
      return result.value;
    });
    const state = computed<PaginationRootSlotProps>(() => Object.freeze({
      page: effectivePage.value,
      itemsPerPage: effectiveItemsPerPage.value,
      pageCount: view.value.pageCount, range: view.value.range, items: view.value.items,
    }));
    const connect = (): void => {
      connection.value?.disconnect();
      if (element.value === undefined) return;
      const requestedPage = props.modelValue ?? localPage.value;
      const itemsPerPage = effectiveItemsPerPage.value;
      const page = reconcilePage(requestedPage, props.total, itemsPerPage);
      localPage.value = page;
      localItemsPerPage.value = itemsPerPage;
      if (pageControlled && requestedPage !== page) emit('update:modelValue', page);
      connection.value = createPagination({
        root: element.value, total: props.total,
        ...(controlled
          ? { page, itemsPerPage }
          : { defaultPage: page, defaultItemsPerPage: itemsPerPage }),
        siblingCount: props.siblingCount, showEdges: props.showEdges, showControls: props.showControls,
        disabled: props.disabled, readOnly: props.readonly, label: props.label,
        onPageChange: (page) => { localPage.value = page; emit('update:modelValue', page); },
        onItemsPerPageChange: (value) => { localItemsPerPage.value = value; emit('update:itemsPerPage', value); },
        onUpdate: () => refreshItems(),
      });
      refreshItems();
    };
    const refreshItems = (): void => {
      if (element.value === undefined || connection.value === undefined) return;
      const rendered = element.value.querySelectorAll<HTMLElement>('[data-sectile-pagination-index]');
      const items = connection.value.getItems();
      rendered.forEach((node) => {
        const index = Number(node.dataset['sectilePaginationIndex']);
        const item = items[index];
        if (item !== undefined) connection.value?.setItemAttributes(node, item);
      });
    };
    const register = (node: HTMLElement, item: PaginationViewItem): void => connection.value?.setItemAttributes(node, item);
    provide<PaginationContext>(key, {
      state, disabled: computed(() => props.disabled), readonly: computed(() => props.readonly), register,
    });
    onMounted(connect); onBeforeUnmount(() => connection.value?.disconnect());
    watch([() => props.total, () => props.siblingCount, () => props.showEdges, () => props.showControls,
      () => props.disabled, () => props.readonly], connect);
    watch([() => props.modelValue, () => props.itemsPerPage], () => {
      if (!controlled || connection.value === undefined) return;
      const result = connection.value.syncControlledValues({
        page: props.modelValue as number, itemsPerPage: props.itemsPerPage as number,
      });
      if (!result.ok) throw new TypeError(result.error.message);
      refreshItems();
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { element.value = node instanceof HTMLElement ? node : undefined; },
      role: 'navigation', 'aria-label': props.label, 'data-scope': 'pagination', 'data-part': 'root',
      'data-disabled': props.disabled ? '' : undefined, 'data-readonly': props.readonly ? '' : undefined,
    }), { default: () => slots['default']?.(state.value) });
  },
});

export type PaginationValueChangeHandler = (value: number) => void;

function reconcilePage(page: number, total: number, itemsPerPage: number): number {
  if (!Number.isSafeInteger(page) || !Number.isSafeInteger(total) || total < 0
    || !Number.isSafeInteger(itemsPerPage) || itemsPerPage < 1) return page;
  const pageCount = Math.max(1, Math.ceil(total / itemsPerPage));
  return Math.min(pageCount, Math.max(1, page));
}
export type PaginationItemsPerPageChangeHandler = (value: number) => void;

export const PaginationItem = defineComponent({
  name: 'SectilePaginationItem', inheritAttrs: false,
  props: {
    item: { type: Object as PropType<PaginationViewItem>, required: true },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: (props: PaginationItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('PaginationItem');
    const selected = computed(() => props.item.type === 'page' && props.item.page === root.state.value.page);
    const disabled = computed(() => root.disabled.value || (props.item.type === 'control' && props.item.disabled));
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild,
      elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.register(node, props.item); },
      type: props.as === 'button' ? 'button' : undefined,
      'data-sectile-pagination-index': root.state.value.items.indexOf(props.item),
      'data-scope': 'pagination', 'data-part': props.item.type,
      'data-selected': selected.value ? '' : undefined,
    }), { default: () => slots['default']?.({ item: props.item, selected: selected.value, disabled: disabled.value }) });
  },
});

function control(control: PaginationControl) {
  return defineComponent({
    name: `SectilePagination${control}`, inheritAttrs: false,
    props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
    slots: Object as SlotsType<{ default: () => VNodeChild }>,
    setup(props, { attrs, slots }) {
      const root = useRoot(control);
      const item = computed(() => root.state.value.items.find((candidate) => candidate.type === 'control' && candidate.control === control));
      return (): VNodeChild => item.value === undefined ? null : h(PaginationItem as Component, mergeProps(attrs, {
        as: props.as, asChild: props.asChild, item: item.value,
      }), { default: slots['default'] });
    },
  });
}

export const PaginationFirst = control('first-page');
export const PaginationPrevious = control('previous-page');
export const PaginationNext = control('next-page');
export const PaginationLast = control('last-page');

function useRoot(part: string): PaginationContext {
  const root = inject<PaginationContext>(key);
  if (root === undefined) throw new TypeError(`${part} must be used inside PaginationRoot.`);
  return root;
}
