import type {
  TabularCellAddress,
  TabularColumnDefinition,
  TabularColumnID,
  TabularHeaderNode,
  TabularHeaderNodeID,
  TabularQuery,
  TabularResult,
  TabularRow,
  TabularRowID,
  TabularRowSelection,
  TabularSnapshot,
  TabularView,
  TabularWireValue,
} from '@sectile/tabular';
import { rowSelectionContains } from '@sectile/tabular/data-table';
import { stableIDElementToken } from '../identity.js';

export interface TabularDOMColumnSizeState {
  readonly revision: number;
  readonly values: Readonly<Record<TabularColumnID, number>>;
}

export interface TabularDOMColumnSizeOptions {
  readonly columnSizes?: Readonly<Record<TabularColumnID, number>>;
  readonly defaultColumnSizes?: Readonly<Record<TabularColumnID, number>>;
  readonly onColumnSizesChange?: (state: TabularDOMColumnSizeState) => void;
}

export interface TabularDOMRegistrationOptions {
  readonly expectedProjectionGeneration?: number;
}

export interface TabularDOMColumnResizeHandleOptions {
  readonly columnID: TabularColumnID;
  readonly minSize?: number;
  readonly maxSize?: number;
  readonly step?: number;
}

export type TabularDOMEditorElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
export type TabularDOMEditorValueParser = (value: string) => TabularResult<TabularWireValue>;

export interface TabularDOMEditorOptions {
  readonly cell: TabularCellAddress;
  readonly parseValue?: TabularDOMEditorValueParser;
  readonly commitOnBlur?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly label?: string;
}

export interface TabularHeaderMetrics {
  readonly headerNodeID: TabularHeaderNodeID;
  readonly columnID: TabularColumnID | null;
  readonly columnIndex: number;
  readonly colSpan: number;
  readonly rowSpan: number;
  readonly depth: number;
}

export type TabularDOMHeaderReference =
  | { readonly columnID: TabularColumnID; readonly headerNodeID?: never }
  | { readonly headerNodeID: TabularHeaderNodeID; readonly columnID?: never };

export interface ResolvedTabularHeaderReference {
  readonly headerNodeID: TabularHeaderNodeID;
  readonly metric: TabularHeaderMetrics | undefined;
}

export type TabularDOMBulkSelectionState = 'unchecked' | 'indeterminate' | 'checked';

export interface TabularDOMRowSelectionAnchor {
  readonly rowID: TabularRowID;
  readonly projectionGeneration: number;
}

export type TabularDOMRowSelectionEvent =
  | { readonly type: 'toggle-row-selection'; readonly rowID: TabularRowID }
  | { readonly type: 'set-row-selection-range'; readonly anchorRowID: TabularRowID; readonly rowID: TabularRowID; readonly selected: boolean };

export interface TabularDOMRowSelectionActivation {
  readonly event: TabularDOMRowSelectionEvent;
  readonly anchor: TabularDOMRowSelectionAnchor;
}

export class ColumnSizeStore {
  readonly #controlled: boolean;
  readonly #onChange: ((state: TabularDOMColumnSizeState) => void) | undefined;
  #state: TabularDOMColumnSizeState;

  public constructor(options: TabularDOMColumnSizeOptions) {
    this.#controlled = options.columnSizes !== undefined;
    this.#onChange = options.onColumnSizesChange;
    const initial = options.columnSizes ?? options.defaultColumnSizes ?? {};
    this.#state = freezeColumnSizes(0, initial);
  }

  public getState(): TabularDOMColumnSizeState { return this.#state; }

  public synchronize(values: Readonly<Record<TabularColumnID, number>> | undefined): TabularResult<TabularDOMColumnSizeState> {
    if (this.#controlled !== (values !== undefined)) {
      return domFailure('invalid-controlled-shape', 'Controlled column sizes must preserve construction-time ownership.');
    }
    if (values === undefined) return ok(this.#state);
    const valid = validateColumnSizes(values);
    if (!valid.ok) return valid;
    this.#state = freezeColumnSizes(this.#state.revision + 1, values);
    return ok(this.#state);
  }

  public propose(columnID: TabularColumnID, size: number): TabularResult<TabularDOMColumnSizeState> {
    if (!Number.isFinite(size) || size <= 0) return domFailure('invalid-column-definition', 'Column size must be a positive finite number.', { columnID, size });
    const next = freezeColumnSizes(this.#state.revision + 1, { ...this.#state.values, [columnID]: size });
    this.#onChange?.(next);
    if (!this.#controlled) this.#state = next;
    return ok(this.#controlled ? this.#state : next);
  }
}

export function validateColumnSizeOptions(options: TabularDOMColumnSizeOptions): TabularResult<true> {
  return validateColumnSizes(options.columnSizes ?? options.defaultColumnSizes ?? {});
}

export class BindingScope {
  readonly #disposers = new Set<() => void>();
  #active = true;

  public get active(): boolean { return this.#active; }

  public retain(dispose: () => void): () => void {
    if (!this.#active) return () => {};
    let retained = true;
    const wrapped = (): void => {
      if (!retained) return;
      retained = false;
      this.#disposers.delete(wrapped);
      dispose();
    };
    this.#disposers.add(wrapped);
    return wrapped;
  }

  public disconnect(): void {
    if (!this.#active) return;
    this.#active = false;
    for (const dispose of [...this.#disposers]) dispose();
    this.#disposers.clear();
  }
}

export function bindEvent<K extends keyof HTMLElementEventMap>(
  scope: BindingScope,
  element: HTMLElement,
  type: K,
  listener: (event: HTMLElementEventMap[K]) => void,
): () => void {
  const typed = listener as EventListener;
  element.addEventListener(type, typed);
  return scope.retain(() => element.removeEventListener(type, typed));
}

export function readEditorValue(
  element: TabularDOMEditorElement,
  parser: TabularDOMEditorValueParser | undefined,
): TabularResult<TabularWireValue> {
  return parser?.(element.value) ?? ok(element.value);
}

export function setEditorAttributes(
  element: TabularDOMEditorElement,
  options: TabularDOMEditorOptions,
  part: string,
): void {
  element.setAttribute('data-part', part);
  element.setAttribute('data-row-id', options.cell.rowID);
  element.setAttribute('data-column-id', options.cell.columnID);
  if (options.label === undefined) element.removeAttribute('aria-label');
  else element.setAttribute('aria-label', options.label);
  element.disabled = options.disabled === true;
  if ('readOnly' in element) element.readOnly = options.readOnly === true;
}

export function bindColumnResizeHandle(
  scope: BindingScope,
  element: HTMLElement,
  store: ColumnSizeStore,
  options: TabularDOMColumnResizeHandleOptions,
  refreshers: Set<() => void>,
  onUpdate: () => void,
): () => void {
  const minimum = options.minSize ?? 24;
  const maximum = options.maxSize ?? Number.MAX_SAFE_INTEGER;
  const step = options.step ?? 8;
  element.setAttribute('role', 'separator');
  element.setAttribute('aria-orientation', 'vertical');
  element.setAttribute('data-column-id', options.columnID);
  element.tabIndex = 0;
  const refresh = (): void => {
    element.setAttribute('aria-valuemin', String(minimum));
    element.setAttribute('aria-valuemax', String(maximum));
    element.setAttribute('aria-valuenow', String(store.getState().values[options.columnID] ?? minimum));
  };
  const propose = (size: number): void => {
    const bounded = Math.min(maximum, Math.max(minimum, size));
    if (store.propose(options.columnID, bounded).ok) onUpdate();
  };
  const keydown = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const current = store.getState().values[options.columnID] ?? minimum;
    propose(current + (event.key === 'ArrowRight' ? step : -step));
  };
  const pointerdown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    const start = event.clientX;
    const initial = store.getState().values[options.columnID] ?? Math.max(minimum, element.getBoundingClientRect().width);
    const view = element.ownerDocument.defaultView;
    if (view === null) return;
    const move = (next: PointerEvent): void => propose(initial + next.clientX - start);
    const end = (): void => {
      view.removeEventListener('pointermove', move);
      view.removeEventListener('pointerup', end);
      view.removeEventListener('pointercancel', end);
    };
    view.addEventListener('pointermove', move);
    view.addEventListener('pointerup', end, { once: true });
    view.addEventListener('pointercancel', end, { once: true });
    scope.retain(end);
  };
  const removeKey = bindEvent(scope, element, 'keydown', keydown);
  const removePointer = bindEvent(scope, element, 'pointerdown', pointerdown);
  refreshers.add(refresh);
  refresh();
  return scope.retain(() => { removeKey(); removePointer(); refreshers.delete(refresh); });
}

export function validateRegistrationGeneration(
  current: number,
  options: TabularDOMRegistrationOptions,
): TabularResult<true> {
  if (options.expectedProjectionGeneration !== undefined && options.expectedProjectionGeneration !== current) {
    return domFailure('stale-revision', 'DOM registration projection generation is stale.', {
      expectedProjectionGeneration: options.expectedProjectionGeneration,
      currentProjectionGeneration: current,
    });
  }
  return ok(true);
}

export function currentView(snapshot: TabularSnapshot): TabularView | null {
  return snapshot.state.acceptedViewState.kind === 'none' ? null : snapshot.state.acceptedViewState.view;
}

export function projectedColumns(snapshot: TabularSnapshot): readonly TabularColumnDefinition[] {
  const view = currentView(snapshot);
  return view?.columnSchema.columns ?? [];
}

export function projectedRows(snapshot: TabularSnapshot): readonly TabularRow[] {
  return currentView(snapshot)?.rows ?? [];
}

export function findProjectedRow(snapshot: TabularSnapshot, rowID: string): TabularRow | undefined {
  return projectedRows(snapshot).find((row) => row.id === rowID);
}

export function orderedColumnIDs(snapshot: TabularSnapshot): readonly TabularColumnID[] {
  const state = snapshot.state.columnState;
  const hidden = new Set(state.hidden);
  const start = new Set(state.pinnedStart);
  const end = new Set(state.pinnedEnd);
  const visible = state.order.filter((id) => !hidden.has(id));
  return Object.freeze([
    ...visible.filter((id) => start.has(id)),
    ...visible.filter((id) => !start.has(id) && !end.has(id)),
    ...visible.filter((id) => end.has(id)),
  ]);
}

export function columnIndex(snapshot: TabularSnapshot, columnID: TabularColumnID): number {
  return orderedColumnIDs(snapshot).indexOf(columnID) + 1;
}

export function rowIndex(snapshot: TabularSnapshot, rowID: string): number {
  return projectedRows(snapshot).findIndex((row) => row.id === rowID) + 1;
}

export function rowSelected(selection: TabularRowSelection, rowID: TabularRowID): boolean {
  return rowSelectionContains(selection, rowID);
}

export function rowSelectionActivation(
  selection: TabularRowSelection,
  projectionGeneration: number,
  anchor: TabularDOMRowSelectionAnchor | null,
  rowID: TabularRowID,
  shiftKey: boolean,
): TabularDOMRowSelectionActivation {
  const current = Object.freeze({ rowID, projectionGeneration });
  if (!shiftKey || anchor === null || anchor.projectionGeneration !== projectionGeneration) {
    return Object.freeze({ event: Object.freeze({ type: 'toggle-row-selection' as const, rowID }), anchor: current });
  }
  return Object.freeze({
    event: Object.freeze({
      type: 'set-row-selection-range' as const,
      anchorRowID: anchor.rowID,
      rowID,
      selected: !rowSelected(selection, rowID),
    }),
    anchor,
  });
}

export function setRowSelectionControlAttributes(
  element: HTMLElement,
  checked: boolean,
  disabled: boolean,
): void {
  if (element.tagName === 'INPUT') {
    const input = element as HTMLInputElement;
    input.checked = checked;
    input.indeterminate = false;
    input.disabled = disabled;
    return;
  }
  if (element.tagName === 'BUTTON') (element as HTMLButtonElement).disabled = disabled;
  else element.tabIndex = disabled ? -1 : 0;
  element.setAttribute('role', 'checkbox');
  element.setAttribute('aria-checked', String(checked));
  element.setAttribute('aria-disabled', String(disabled));
  element.setAttribute('data-state', checked ? 'checked' : 'unchecked');
}

export function allMatchingSelectionState(snapshot: TabularSnapshot): TabularDOMBulkSelectionState {
  const selection = snapshot.state.rowSelection;
  const view = currentView(snapshot);
  const count = view?.matchingLeafCount;
  const total = count?.kind === 'known' ? count.value : null;
  if (total === 0) return 'unchecked';
  if (selection.kind === 'explicit-rows') {
    const visibleLeafIDs = view?.rows.filter((row) => row.kind === 'leaf').map((row) => row.id) ?? [];
    const selectedVisibleCount = visibleLeafIDs.filter((rowID) => rowSelected(selection, rowID)).length;
    if (selectedVisibleCount === 0) return 'unchecked';
    return total !== null && visibleLeafIDs.length === total && selectedVisibleCount === total ? 'checked' : 'indeterminate';
  }
  if (selection.excludedRowIDs.length === 0) return 'checked';
  return total !== null && selection.excludedRowIDs.length >= total ? 'unchecked' : 'indeterminate';
}

export function setBulkSelectionControlAttributes(
  element: HTMLElement,
  state: TabularDOMBulkSelectionState,
  disabled: boolean,
): void {
  if (element.tagName === 'INPUT') {
    const input = element as HTMLInputElement;
    input.type = 'checkbox';
    input.checked = state === 'checked';
    input.indeterminate = state === 'indeterminate';
    input.disabled = disabled;
  } else if (element.tagName === 'BUTTON') {
    (element as HTMLButtonElement).disabled = disabled;
  } else {
    element.tabIndex = disabled ? -1 : 0;
  }
  element.setAttribute('role', 'checkbox');
  element.setAttribute('aria-checked', state === 'indeterminate' ? 'mixed' : String(state === 'checked'));
  element.setAttribute('aria-disabled', String(disabled));
  element.setAttribute('data-state', state);
}

export function bindRowSelectionActivation(
  scope: BindingScope,
  element: HTMLElement,
  activate: (shiftKey: boolean) => void,
): readonly (() => void)[] {
  return Object.freeze([
    bindEvent(scope, element, 'click', (event) => activate(event.shiftKey)),
    bindEvent(scope, element, 'keydown', (event) => {
      if (event.key !== ' ' || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      const native = element.tagName === 'INPUT' || element.tagName === 'BUTTON';
      if (native && !event.shiftKey) return;
      activate(event.shiftKey);
      event.preventDefault();
    }),
  ]);
}

export function bindCheckboxActivation(
  scope: BindingScope,
  element: HTMLElement,
  activate: () => void,
): readonly (() => void)[] {
  return Object.freeze([
    bindEvent(scope, element, 'click', activate),
    bindEvent(scope, element, 'keydown', (event) => {
      if (event.key !== ' ' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (element.tagName === 'INPUT' || element.tagName === 'BUTTON') return;
      activate();
      event.preventDefault();
    }),
  ]);
}

export function queryWithSort(
  query: TabularQuery,
  columnID: TabularColumnID,
  comparator: string,
  direction: 'ascending' | 'descending' | null,
): TabularQuery {
  const retained = query.sort.filter((sort) => sort.columnID !== columnID);
  const sort = direction === null ? retained : [...retained, { id: `sort:${columnID}`, columnID, comparator, direction }];
  return Object.freeze({ ...query, sort: Object.freeze(sort) });
}

export function queryWithFilter(
  query: TabularQuery,
  id: string,
  scope: 'global' | 'column',
  predicate: string,
  value: string,
  columnID?: TabularColumnID,
): TabularQuery {
  const retained = query.filters.filter((filter) => filter.id !== id);
  const filters = value.length === 0
    ? retained
    : [...retained, { id, scope, predicate, value, enabled: true, ...(columnID === undefined ? {} : { columnID }) }];
  return Object.freeze({ ...query, filters: Object.freeze(filters) });
}

export function headerMetrics(snapshot: TabularSnapshot): readonly TabularHeaderMetrics[] {
  const view = currentView(snapshot);
  const columns = orderedColumnIDs(snapshot);
  const columnIndexes = new Map<TabularColumnID, number>();
  for (let index = 0; index < columns.length; index += 1) columnIndexes.set(columns[index]!, index + 1);
  const source: readonly TabularHeaderNode[] = view?.columnSchema.headers.length
    ? view.columnSchema.headers
    : (view?.columnSchema.columns ?? []).map((column) => ({
        kind: 'column' as const,
        id: column.headerNodeID ?? column.id,
        columnID: column.id,
        ...(column.label === undefined ? {} : { label: column.label }),
      }));
  const maximumDepth = Math.max(0, ...source.map(nodeDepth));
  const output: TabularHeaderMetrics[] = [];
  type Interval = { readonly start: number; readonly end: number; readonly count: number };
  const visit = (node: TabularHeaderNode, depth: number): Interval | null => {
    if (node.kind === 'column') {
      const index = columnIndexes.get(node.columnID);
      if (index === undefined) return null;
      output.push(Object.freeze({ headerNodeID: node.id, columnID: node.columnID, columnIndex: index, colSpan: 1, rowSpan: maximumDepth - depth + 1, depth }));
      return { start: index, end: index, count: 1 };
    }
    let start = Number.MAX_SAFE_INTEGER;
    let end = -1;
    let count = 0;
    for (const child of node.children) {
      const interval = visit(child, depth + 1);
      if (interval === null) continue;
      start = Math.min(start, interval.start);
      end = Math.max(end, interval.end);
      count += interval.count;
    }
    if (count === 0) return null;
    const span = end - start + 1;
    output.push(Object.freeze({ headerNodeID: node.id, columnID: null, columnIndex: start, colSpan: span, rowSpan: 1, depth }));
    return { start, end, count };
  };
  for (const node of source) visit(node, 0);
  return Object.freeze(output);
}

export function resolveHeaderReference(
  snapshot: TabularSnapshot,
  reference: TabularDOMHeaderReference,
): ResolvedTabularHeaderReference {
  const metrics = headerMetrics(snapshot);
  const metric = reference.columnID === undefined
    ? metrics.find((entry) => entry.headerNodeID === reference.headerNodeID)
    : metrics.find((entry) => entry.columnID === reference.columnID);
  const fallback = reference.columnID === undefined ? reference.headerNodeID : reference.columnID;
  return Object.freeze({
    headerNodeID: metric?.headerNodeID ?? fallback,
    metric,
  });
}

export function headerElementID(headerNodeID: TabularHeaderNodeID): string {
  return `sectile-tabular-header-${stableIDElementToken(headerNodeID)}`;
}

export function leafHeaderID(snapshot: TabularSnapshot, columnID: TabularColumnID): string | null {
  const metric = headerMetrics(snapshot).find((entry) => entry.columnID === columnID);
  return metric === undefined ? null : headerElementID(metric.headerNodeID);
}

export function setColumnInlineSize(
  element: HTMLElement,
  columnID: TabularColumnID,
  state: TabularDOMColumnSizeState,
): void {
  const size = state.values[columnID];
  if (size === undefined) element.style.removeProperty('inline-size');
  else element.style.inlineSize = `${size}px`;
}

export function clearAttributes(element: HTMLElement, names: readonly string[]): void {
  for (const name of names) element.removeAttribute(name);
}

export function cellKey(cell: TabularCellAddress): string {
  return JSON.stringify([cell.rowID, cell.columnID]);
}

export function sameCell(left: TabularCellAddress, right: TabularCellAddress): boolean {
  return left.rowID === right.rowID && left.columnID === right.columnID;
}

export function domFailure<T>(
  code: 'invalid-controlled-shape' | 'invalid-column-definition' | 'profile-view-mismatch' | 'stale-revision',
  message: string,
  details?: Readonly<Record<string, unknown>>,
): TabularResult<T> {
  return { ok: false, error: { class: 'construction', code, message, ...(details === undefined ? {} : { details }) } };
}

export function ok<T>(value: T): TabularResult<T> { return { ok: true, value }; }

function validateColumnSizes(values: Readonly<Record<TabularColumnID, number>>): TabularResult<true> {
  for (const [columnID, size] of Object.entries(values)) {
    if (!Number.isFinite(size) || size <= 0) return domFailure('invalid-column-definition', 'Column sizes must be positive finite numbers.', { columnID, size });
  }
  return ok(true);
}

function freezeColumnSizes(revision: number, values: Readonly<Record<TabularColumnID, number>>): TabularDOMColumnSizeState {
  return Object.freeze({ revision, values: Object.freeze({ ...values }) });
}

function nodeDepth(node: TabularHeaderNode): number {
  return node.kind === 'column' ? 0 : 1 + Math.max(0, ...node.children.map(nodeDepth));
}
