import { computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide, shallowRef, ssrContextKey, useId, watch,
  type ComputedRef, type DefineSetupFnComponent, type EmitsToProps, type PropType, type PublicProps, type ShallowRef, type SlotsType, type VNodeChild } from 'vue';
import { createTree, type TreeNodeInput } from '@sectile/core/tree';
import { unwrap } from '@sectile/core/result';
import type { TreeSelectSearchRequest, TreeSelectPolicies, TreeSelectState } from '@sectile/core/tree-select';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { connectTreeSelect, createTreeSelectController, type TreeSelectConnection, type TreeSelectController, type TreeSelectControlledValues } from '@sectile/dom/tree-select';
import { stableIDElementToken } from '@sectile/dom/identity';
import type { DOMLayerPresentationSnapshot } from '@sectile/dom/dialog';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { usePopupPresentation } from './internal/popup-presentation.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';
import { useNextTickTask } from './internal/scheduled-task.js';
import { reconcileCollectionState, sameIDs } from './internal/collection.js';
import { createTreeGroup, createTreeItem, createTreeDisclosure, provideTreeParts } from './internal/tree-parts.js';
import { usePresence } from './presence/presence.js';
import { provideHostLayerParent } from './host-provider.js';
import { hiddenSelectSubmissionCapabilities, provideFormControlOwner, useCompositeFormControl, useFormControlFlags, useFormSubmissionProps } from './form/control.js';
import { visuallyHiddenInputStyle } from './input/native-input.js';
import type { TreeViewGroupProps, TreeViewItemSlotProps, TreeViewPartProps } from './tree-view.js';

export type { TreeSelectSearchRequest, TreeSelectPolicies } from '@sectile/core/tree-select';
export interface TreeSelectRootProps<ID extends string = string> extends TreeViewPartProps {
  readonly nodes: readonly TreeNodeInput<ID>[];
  readonly selectionMode?: 'single' | 'multiple';
  readonly modelValue?: readonly NoInfer<ID>[]; readonly defaultValue?: readonly NoInfer<ID>[];
  readonly expandedValues?: readonly NoInfer<ID>[]; readonly defaultExpandedValues?: readonly NoInfer<ID>[];
  readonly highlightedValue?: NoInfer<ID> | null; readonly defaultHighlightedValue?: NoInfer<ID> | null;
  readonly query?: string; readonly defaultQuery?: string; readonly open?: boolean; readonly defaultOpen?: boolean;
  readonly matches?: readonly NoInfer<ID>[];
  readonly results?: TreeSelectControlledValues<NoInfer<ID>>['results'];
  readonly disabledItems?: readonly NoInfer<ID>[]; readonly policies?: TreeSelectPolicies<NoInfer<ID>>;
  readonly disabled?: boolean; readonly?: boolean; readonly label?: string; readonly position?: boolean;
  readonly name?: string; readonly form?: string; readonly required?: boolean;
}
export interface TreeSelectRootSlotProps<ID extends string = string> {
  readonly value: readonly ID[]; readonly expandedValues: readonly ID[]; readonly highlightedValue: ID | null;
  readonly query: string; readonly open: boolean; readonly pending: boolean; readonly disabled: boolean; readonly: boolean;
  readonly request: TreeSelectSearchRequest;
  getChildren(parent: ID | null): readonly ID[];
  isBranch(id: ID): boolean;
}
export type TreeSelectEmits<ID extends string = string> = {
  'update:modelValue': [value: readonly NoInfer<ID>[]]; 'update:expandedValues': [value: readonly NoInfer<ID>[]];
  'update:highlightedValue': [value: NoInfer<ID> | null]; 'update:query': [query: string]; 'update:open': [open: boolean];
  search: [request: TreeSelectSearchRequest];
};
export interface TreeSelectSlots<ID extends string = string> { default?: (state: TreeSelectRootSlotProps<ID>) => VNodeChild }
export interface TreeSelectExpose<ID extends string = string> {
  readonly element: HTMLInputElement | null;
  focus(options?: FocusOptions): void;
  resolveSearch(request: TreeSelectSearchRequest, matches: readonly NoInfer<ID>[]): boolean;
}
export interface TreeSelectItemProps extends TreeViewPartProps { readonly value: string; readonly disabled?: never }
export type TreeSelectGroupProps = TreeViewGroupProps;
export interface TreeSelectDisclosureProps extends TreeViewPartProps { readonly for: string }
export type TreeSelectPartProps = TreeViewPartProps;
interface Context {
  readonly state: ComputedRef<TreeSelectRootSlotProps>;
  readonly snapshot: ComputedRef<TreeSelectState<string>>;
  readonly inputID: string; readonly popupID: string; readonly position: ComputedRef<boolean>;
  readonly label: ComputedRef<string | undefined>; readonly controlProps: ComputedRef<Readonly<Record<string, unknown>>>;
  readonly connection: ShallowRef<TreeSelectConnection<string> | undefined>;
  readonly active: Readonly<ShallowRef<boolean>>; readonly presentation: Readonly<ShallowRef<DOMLayerPresentationSnapshot | undefined>>;
  registerPresence(present: ShallowRef<boolean>): () => void;
  registerInput(element: unknown): void; registerPopup(element: unknown): void;
  setInputComposing(composing: boolean): void;
  elementID(id: string): string;
}
const key = /* @__PURE__ */ Symbol('SectileTreeSelect');
const empty: readonly string[] = /* @__PURE__ */ Object.freeze([]);
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } };
function useRoot(name: string): Context { const root = inject<Context>(key); if (!root) throw new TypeError(`${name} must be used inside TreeSelectRoot.`); return root; }

const RootImplementation = /* @__PURE__ */ defineComponent({
  name: 'SectileTreeSelectRoot', inheritAttrs: false,
  props: {
    nodes: { type: Array as PropType<readonly TreeNodeInput<string>[]>, required: true }, selectionMode: { type: String as PropType<'single' | 'multiple'>, default: 'single' },
    modelValue: { type: Array as PropType<readonly string[]>, default: undefined }, defaultValue: { type: Array as PropType<readonly string[]>, default: () => empty },
    expandedValues: { type: Array as PropType<readonly string[]>, default: undefined }, defaultExpandedValues: { type: Array as PropType<readonly string[]>, default: () => empty },
    highlightedValue: { type: String as PropType<string | null>, default: undefined }, defaultHighlightedValue: { type: String as PropType<string | null>, default: null },
    query: { type: String, default: undefined }, defaultQuery: { type: String, default: '' }, open: { type: Boolean, default: undefined }, defaultOpen: { type: Boolean, default: false },
    matches: { type: Array as PropType<readonly string[]>, default: undefined }, results: { type: Object as PropType<TreeSelectControlledValues<string>['results']>, default: undefined },
    disabledItems: { type: Array as PropType<readonly string[]>, default: () => empty }, policies: { type: Object as PropType<TreeSelectPolicies<string>>, default: undefined },
    disabled: { type: Boolean, default: undefined }, readonly: { type: Boolean, default: undefined }, required: { type: Boolean, default: undefined },
    label: String, name: String, form: String, position: { type: Boolean, default: true },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_value: readonly string[]): boolean => true, 'update:expandedValues': (_value: readonly string[]): boolean => true,
    'update:highlightedValue': (_value: string | null): boolean => true, 'update:query': (_value: string): boolean => true, 'update:open': (_value: boolean): boolean => true,
    search: (_request: TreeSelectSearchRequest): boolean => true },
  slots: Object as SlotsType<TreeSelectSlots>,
  setup(props, { attrs, emit, slots, expose }) {
    const input = shallowRef<HTMLInputElement>(), popup = shallowRef<HTMLElement>(), submission = shallowRef<HTMLSelectElement>();
    const controller = shallowRef<TreeSelectController<string>>(), accepted = shallowRef<RevisionSnapshot<TreeSelectState<string>>>();
    const connection = shallowRef<TreeSelectConnection<string>>();
    const flags = useFormControlFlags(props);
    const disabled = computed(() => flags.value.disabled), readonly = computed(() => flags.value.readonly);
    const required = computed(() => flags.value.required);
    const inputID = `sectile-tree-select-${useId()}`, popupID = `${inputID}-popup`;
    const elementID = (id: string): string => `${popupID}-${stableIDElementToken(id)}`;
    const items = new Map<HTMLElement, string>(), disclosures = new Map<HTMLElement, string>();
    let alive = true, mounted = false, generation = 0;
    let inputComposing = false, buildPending = false, attachPending = false;
    let compositionTimer: ReturnType<typeof setTimeout> | undefined;
    const compositionRevision = shallowRef(0);
    const controlled = {
      value: useControlledStateInvariant('TreeSelectRoot', 'modelValue', () => props.modelValue),
      expansion: useControlledStateInvariant('TreeSelectRoot', 'expandedValues', () => props.expandedValues),
      cursor: useControlledStateInvariant('TreeSelectRoot', 'highlightedValue', () => props.highlightedValue),
      query: useControlledStateInvariant('TreeSelectRoot', 'query', () => props.query), open: useControlledStateInvariant('TreeSelectRoot', 'open', () => props.open),
    };
    const initial = { value: props.defaultValue, expansion: props.defaultExpandedValues, cursor: props.defaultHighlightedValue, query: props.defaultQuery, open: props.defaultOpen };
    const snapshot = computed(() => accepted.value!.state);
    const navigation = computed(() => (snapshot.value.results?.tree ?? controller.value!.tree).visible(snapshot.value.view.expansion.ids));
    const publish = (): void => { if (alive && controller.value) accepted.value = controller.value.getSnapshot(); };
    const refreshParts = (): void => {
      const current = connection.value; if (!current) return;
      for (const [element, id] of items) current.setItemAttributes(element, { id });
      for (const [element, id] of disclosures) current.setDisclosureAttributes(element, id);
    };
    const refresh = (): void => { publish(); refreshParts(); connection.value?.render(); };
    const disconnect = (): void => { try { lifecycle.release(); } finally { try { connection.value?.disconnect(); } finally { connection.value = undefined; } } };
    const attach = (): void => {
      if (inputComposing) { attachPending = true; return; }
      disconnect();
      if (!alive || !mounted || !input.value || !popup.value || !controller.value) return;
      connection.value = connectTreeSelect({ controller: controller.value, input: input.value, popup: popup.value, position: props.position, manageVisibility: false,
        ...(lifecycle.layerHost.value === undefined ? {} : { layerHost: lifecycle.layerHost.value }),
        getItemElementID: elementID, onUpdate: () => { publish(); refreshParts(); lifecycle.update(); } });
      refresh();
    };
    const open = computed(() => accepted.value?.state.open ?? props.open ?? props.defaultOpen);
    const lifecycle = usePopupPresentation({ connection, open, connect: attach, refresh, trackLayerHost: true });
    const attachmentTask = useNextTickTask(() => { if (alive && mounted) lifecycle.reconnect(); });
    const scheduleAttach = (): void => { if (alive && mounted) attachmentTask.schedule(); };
    const values = (): TreeSelectControlledValues<string> => ({
      ...(controlled.value ? { value: props.modelValue as readonly string[] } : {}),
      ...(controlled.expansion ? { expandedValues: props.expandedValues as readonly string[] } : {}),
      ...(controlled.cursor ? { highlightedValue: props.highlightedValue as string | null } : {}),
      ...(controlled.query ? { query: props.query as string } : {}), ...(controlled.open ? { open: props.open as boolean } : {}),
      ...(props.results === undefined ? {} : { results: props.results }),
    });
    const build = (reset = false): void => {
      if (!alive) return;
      if (inputComposing && !reset) { buildPending = true; return; }
      buildPending = false; attachPending = false;
      const prior = controller.value?.getSnapshot().state, previous = reset ? undefined : prior, tree = createTree(props.nodes);
      const requested = controlled.value ? props.modelValue as readonly string[] : previous?.selection.selected ?? initial.value;
      const value = prior ? reconcileCollectionState(tree.preorder().ids, requested, null, empty, props.selectionMode, { preserveNullCurrent: true }).selected : requested;
      const expanded = tree.normalizeExpansion(controlled.expansion ? props.expandedValues as readonly string[] : previous?.expansion.ids ?? initial.expansion).ids;
      const query = controlled.query ? props.query as string : previous?.request.query ?? initial.query;
      const requestedCursor = controlled.cursor ? props.highlightedValue as string | null : previous?.view.cursor.current ?? initial.cursor;
      const visible = tree.visible(expanded).ids;
      const cursor = !prior ? requestedCursor : query === ''
        ? reconcileCollectionState(visible, empty, requestedCursor, props.disabledItems, 'multiple', { preserveNullCurrent: true }).current
        : controlled.cursor ? requestedCursor : null;
      const nextGeneration = generation + 1, current = (): boolean => alive && generation === nextGeneration;
      const next = unwrap(createTreeSelectController({ tree, selectionMode: props.selectionMode, disabled: disabled.value, readOnly: readonly.value, disabledItems: props.disabledItems,
        ...(props.policies === undefined ? {} : { policies: props.policies }), ...(props.matches === undefined ? {} : { matches: props.matches }),
        ...(controlled.value ? { value } : { defaultValue: value }), ...(controlled.expansion ? { expandedValues: expanded } : { defaultExpandedValues: expanded }),
        ...(controlled.cursor ? { highlightedValue: cursor } : { defaultHighlightedValue: cursor }), ...(controlled.query ? { query } : { defaultQuery: query }),
        ...(controlled.open ? { open: props.open as boolean } : { defaultOpen: previous?.open ?? initial.open }),
        onValueChange: value => { if (current()) emit('update:modelValue', value); }, onExpandedValuesChange: value => { if (current()) emit('update:expandedValues', value); },
        onHighlightedValueChange: value => { if (current()) emit('update:highlightedValue', value); }, onQueryChange: value => { if (current()) emit('update:query', value); },
        onOpenChange: value => { if (current()) emit('update:open', value); }, onSearch: request => { if (current()) emit('search', request); },
        onUpdate: () => { if (current()) refresh(); },
      }));
      const old = controller.value; disconnect(); generation = nextGeneration; controller.value = next; old?.dispose(); publish();
      if (previous && !sameIDs(requested, value)) emit('update:modelValue', value);
      if (previous && requestedCursor !== cursor) emit('update:highlightedValue', cursor);
      scheduleAttach();
    };
    build();
    const getChildren = (parent: string | null): readonly string[] => {
      if (!alive || !controller.value) return empty;
      const tree = snapshot.value.results?.tree ?? controller.value!.tree;
      return parent === null ? tree.roots.ids : tree.childrenOf(parent)?.ids ?? empty;
    };
    const isBranch = (id: string): boolean => alive && controller.value?.tree.isLeaf(id) === false;
    const state = computed<TreeSelectRootSlotProps>(() => ({ value: snapshot.value.selection.selected, expandedValues: snapshot.value.view.expansion.ids,
      highlightedValue: snapshot.value.view.cursor.current, query: snapshot.value.request.query, open: snapshot.value.open, pending: snapshot.value.pending,
      request: snapshot.value.request, disabled: disabled.value || !lifecycle.active.value, readonly: readonly.value, getChildren, isBranch }));
    const resetTask = useNextTickTask(() => { if (alive) build(true); });
    const submissionProps = useFormSubmissionProps({ element: submission, capabilities: hiddenSelectSubmissionCapabilities }, props);
    const participation = useCompositeFormControl({ root: input, focusTarget: input, validationTarget: submission, labelMode: 'for',
      submissions: [{ element: submission, capabilities: hiddenSelectSubmissionCapabilities }],
      getValue: () => snapshot.value.selection.selected, isValueEqual: (left, right) => Array.isArray(left) && Array.isArray(right) && sameIDs(left, right),
      reset: resetTask.schedule,
    });
    provideFormControlOwner();
    provide<Context>(key, { state, snapshot, inputID, popupID, elementID, position: computed(() => props.position), label: computed(() => props.label), controlProps: participation.controlProps,
      connection, active: lifecycle.active, presentation: lifecycle.presentation, registerPresence: lifecycle.registerPresence,
      setInputComposing: composing => {
        if (!alive) return;
        inputComposing = composing;
        if (composing || (!buildPending && !attachPending) || compositionTimer !== undefined) return;
        compositionTimer = setTimeout(() => {
          compositionTimer = undefined; if (!alive || inputComposing) return;
          if (buildPending) compositionRevision.value++; else if (attachPending) { attachPending = false; scheduleAttach(); }
        }, 0);
      },
      registerInput: node => { const next = typeof HTMLInputElement !== 'undefined' && node instanceof HTMLInputElement ? node : undefined; if (input.value !== next) { input.value = next; scheduleAttach(); } },
      registerPopup: node => { const next = typeof HTMLElement !== 'undefined' && node instanceof HTMLElement ? node : undefined; if (popup.value !== next) { popup.value = next; scheduleAttach(); } },
    });
    provideTreeParts({ scope: 'tree-select', state,
      selectedItems: computed(() => snapshot.value.selection), expandedItems: computed(() => snapshot.value.view.expansion),
      disabledItems: computed(() => { accepted.value; return { has: (id: string) => snapshot.value.pending || controller.value?.isDisabled(id) !== false }; }),
      selecting: { levelOf: id => (controller.value!.tree.depthOf(id) ?? 0) + 1, isLeaf: id => controller.value!.tree.isLeaf(id) !== false,
        isVisible: id => navigation.value.contains(id), elementID },
      registerItem: (element, id) => { items.set(element, id); connection.value?.setItemAttributes(element, { id }); },
      unregisterItem: (element, id) => { if (items.get(element) === id) { items.delete(element); connection.value?.releaseItem(element, id); } },
      registerDisclosure: (element, id) => { disclosures.set(element, id); connection.value?.setDisclosureAttributes(element, id); },
      unregisterDisclosure: (element, id) => { if (disclosures.get(element) === id) disclosures.delete(element); },
    });
    expose({ get element() { return input.value ?? null; }, focus(options?: FocusOptions) { if (alive && lifecycle.active.value) input.value?.focus(options); },
      resolveSearch(request: TreeSelectSearchRequest, matches: readonly string[]): boolean { return alive && !!controller.value?.resolveSearch(request, matches).ok; } });
    onMounted(() => { mounted = true; lifecycle.reconnect(); });
    onBeforeUnmount(() => {
      alive = false; mounted = false; generation++; attachmentTask.cancel(); resetTask.cancel();
      if (compositionTimer !== undefined) clearTimeout(compositionTimer);
      compositionTimer = undefined; buildPending = false; attachPending = false;
      try { disconnect(); } finally { try { controller.value?.dispose(); } finally { controller.value = undefined; items.clear(); disclosures.clear(); } }
    });
    watch([() => props.nodes, () => props.disabledItems, () => props.selectionMode, () => props.policies, () => props.matches, compositionRevision], () => build());
    watch([disabled, readonly], () => { if (controller.value) unwrap(controller.value.syncInteraction({ disabled: disabled.value, readOnly: readonly.value })); });
    watch([() => props.modelValue, () => props.expandedValues, () => props.highlightedValue, () => props.query, () => props.open, () => props.results], () => {
      if (!alive || !controller.value) return; lifecycle.prepareModelUpdate();
      const supplied = values(), result = controller.value.syncControlledValues(supplied);
      if (!result.ok && result.error.code === 'tree-select-stale-results') {
        const { results: _stale, ...controls } = supplied;
        unwrap(controller.value.syncControlledValues(controls));
      } else unwrap(result);
    }, { flush: 'post' });
    watch(() => props.position, scheduleAttach);
    const selected = computed(() => snapshot.value.selection), sourceIDs = computed(() => controller.value!.tree.preorder().ids);
    const encoding = computed(() => h('select', { ref: (node: unknown) => { submission.value = typeof HTMLSelectElement !== 'undefined' && node instanceof HTMLSelectElement ? node : undefined; },
      ...submissionProps.value, required: required.value, disabled: disabled.value, multiple: props.selectionMode === 'multiple',
      tabindex: -1, 'aria-hidden': 'true', style: visuallyHiddenInputStyle,
    }, [ ...(props.selectionMode === 'single' ? [h('option', { value: '', selected: selected.value.size === 0 })] : []),
      ...sourceIDs.value.map(id => h('option', { key: id, value: id, selected: selected.value.has(id) }, id)) ]));
    return (): VNodeChild => [h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, 'data-scope': 'tree-select', 'data-part': 'root', 'data-state': state.value.open ? 'open' : 'closed' }),
      { default: () => slots.default?.(state.value) }), ...(participation.participating || props.name !== undefined || props.form !== undefined || required.value ? [encoding.value] : [])];
  },
});
type RootProps<ID extends string> = TreeSelectRootProps<ID> & PublicProps & EmitsToProps<TreeSelectEmits<ID>>;
type RootInstance<ID extends string> = InstanceType<DefineSetupFnComponent<TreeSelectRootProps<ID>, TreeSelectEmits<ID>, SlotsType<TreeSelectSlots<ID>>>> & TreeSelectExpose<ID>;
export const TreeSelectRoot: new <const ID extends string = string>(props: RootProps<ID>) => Omit<RootInstance<ID>, '$props'> & { readonly $props: RootProps<ID> } = RootImplementation as unknown as new <const ID extends string = string>(props: RootProps<ID>) => Omit<RootInstance<ID>, '$props'> & { readonly $props: RootProps<ID> };

export const TreeSelectInput = /* @__PURE__ */ defineComponent({
  name: 'SectileTreeSelectInput', inheritAttrs: false, props: { asChild: { type: Boolean, default: false } },
  setup(props, { attrs, slots }) {
    const root = useRoot('TreeSelectInput'), server = inject(ssrContextKey, undefined) !== undefined, element = shallowRef<HTMLInputElement>();
    watch(element, () => root.setInputComposing(false));
    onBeforeUnmount(() => root.setInputComposing(false));
    return (): VNodeChild => h(Primitive, mergeProps(attrs, root.controlProps.value, {
    as: 'input', asChild: props.asChild, elementRef: (node: unknown) => { element.value = typeof HTMLInputElement !== 'undefined' && node instanceof HTMLInputElement ? node : undefined; root.registerInput(node); },
    id: attrs['id'] ?? root.controlProps.value['id'] ?? root.inputID, name: undefined, required: false, type: 'text', ...(server ? { value: root.state.value.query } : {}),
    onCompositionstart: () => root.setInputComposing(true), onCompositionend: () => root.setInputComposing(false),
    role: 'combobox', 'aria-haspopup': 'tree', 'aria-autocomplete': 'list', 'aria-controls': root.popupID, 'aria-expanded': root.active.value && root.state.value.open,
    'aria-activedescendant': element.value ? element.value.getAttribute('aria-activedescendant') ?? undefined
      : root.active.value && root.state.value.open && !root.state.value.pending && root.state.value.highlightedValue !== null ? root.elementID(root.state.value.highlightedValue) : undefined,
    'aria-label': root.label.value ?? attrs['aria-label'], disabled: root.state.value.disabled, readonly: root.state.value.readonly, 'data-scope': 'tree-select', 'data-part': 'input',
  }), slots); },
});
export const TreeSelectContent = /* @__PURE__ */ defineComponent({
  name: 'SectileTreeSelectContent', inheritAttrs: false, props: partProps, slots: Object as SlotsType<TreeSelectSlots>,
  setup(props, { attrs, slots }) {
    const root = useRoot('TreeSelectContent'), element = shallowRef<HTMLElement>(), open = computed(() => root.state.value.open);
    provideHostLayerParent({ active: root.active, open, element, presentation: root.presentation });
    const present = usePresence(open, element, undefined, root.active); onBeforeUnmount(root.registerPresence(present));
    return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild,
      elementRef: (node: unknown) => { element.value = typeof HTMLElement !== 'undefined' && node instanceof HTMLElement ? node : undefined; root.registerPopup(node); },
      id: root.popupID, role: 'tree', tabindex: -1, hidden: !root.active.value || !present.value, 'aria-label': root.label.value, 'aria-busy': root.state.value.pending,
      'aria-multiselectable': root.snapshot.value.selectionMode === 'multiple' ? 'true' : undefined,
      ...(!open.value || !root.active.value ? { inert: true, 'aria-hidden': 'true' } : {}),
      style: root.position.value ? { position: 'absolute', visibility: element.value === undefined ? 'hidden' : undefined } : undefined,
      'data-scope': 'tree-select', 'data-part': 'content', 'data-state': open.value ? 'open' : 'closed',
    }), { default: () => slots.default?.(root.state.value) });
  },
});
export const TreeSelectItem: DefineSetupFnComponent<TreeSelectItemProps, {}, SlotsType<{ default?: (state: TreeViewItemSlotProps) => VNodeChild }>> = /* @__PURE__ */ createTreeItem('SectileTreeSelectItem', 'tree-select') as unknown as DefineSetupFnComponent<TreeSelectItemProps, {}, SlotsType<{ default?: (state: TreeViewItemSlotProps) => VNodeChild }>>;
export const TreeSelectGroup = /* @__PURE__ */ createTreeGroup('SectileTreeSelectGroup', 'tree-select');
export const TreeSelectDisclosure = /* @__PURE__ */ createTreeDisclosure('SectileTreeSelectDisclosure', 'tree-select');
