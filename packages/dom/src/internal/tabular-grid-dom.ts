import type {
  TabularCellAddress,
  TabularColumnID,
  TabularControlledValues,
  TabularGroupID,
  TabularHeaderNodeID,
  TabularResult,
  TabularRow,
  TabularRowID,
  TabularRowSelection,
  TabularSnapshot,
  TabularViewResponse,
} from '@sectile/tabular';
import {
  BindingScope,
  ColumnSizeStore,
  bindColumnResizeHandle,
  bindEvent,
  cellKey,
  clearAttributes,
  columnIndex,
  currentView,
  domFailure,
  headerElementID,
  headerMetrics,
  ok,
  queryWithFilter,
  queryWithSort,
  readEditorValue,
  rowSelected,
  setColumnInlineSize,
  setEditorAttributes,
  validateRegistrationGeneration,
  type TabularDOMColumnResizeHandleOptions,
  type TabularDOMColumnSizeOptions,
  type TabularDOMColumnSizeState,
  type TabularDOMEditorElement,
  type TabularDOMEditorOptions,
  type TabularDOMRegistrationOptions,
} from './tabular-dom.js';

export interface GridDOMCursorState { readonly current: TabularCellAddress | null }
export type GridDOMEditState = { readonly kind: 'navigation' } | { readonly kind: 'editing'; readonly cell: TabularCellAddress };
export interface GridDOMState {
  readonly revision: number;
  readonly tabular: TabularSnapshot;
  readonly cursor: GridDOMCursorState;
  readonly edit: GridDOMEditState;
}
export interface GridDOMRow {
  readonly row: TabularRow;
  readonly rowID: TabularRowID | TabularGroupID;
  readonly parentRowID: TabularGroupID | null;
  readonly depth: number;
  readonly cells: readonly TabularCellAddress[];
}
export interface GridDOMProjection {
  readonly generation: number;
  readonly rows: readonly GridDOMRow[];
  readonly columns: {
    readonly start: readonly TabularColumnID[];
    readonly center: readonly TabularColumnID[];
    readonly end: readonly TabularColumnID[];
  };
  readonly cursor: GridDOMCursorState;
  readonly edit: GridDOMEditState;
  readonly rowSelection: TabularRowSelection;
  readonly expansion: { readonly expandedRowIDs: readonly TabularGroupID[] };
}

export interface GridDOMController<Event, Command, State extends GridDOMState, Projection extends GridDOMProjection> {
  getSnapshot(): State;
  getProjection(): Projection;
  dispatch(event: Event, expectedRevision?: number): TabularResult<{ readonly snapshot: State; readonly commands: readonly Command[] }>;
  synchronizeView(response: TabularViewResponse): TabularResult<State>;
  syncControlledValues(values: TabularControlledValues): TabularResult<State>;
  requestView(): TabularResult<State>;
  abandonRequest(requestID: number): TabularResult<State>;
  subscribeCommands(listener: (command: Command) => void): () => void;
  dispose(): void;
}

export type GridRevealCellCommand = {
  readonly type: 'request-reveal-cell';
  readonly cell: TabularCellAddress;
  readonly expectedProjectionGeneration: number;
};
export type GridRevealRowCommand = {
  readonly type: 'request-reveal-row';
  readonly rowID: TabularRowID;
  readonly expectedProjectionGeneration: number;
};

export interface GridDOMConnectionOptions<Controller, Command> extends TabularDOMColumnSizeOptions {
  readonly controller: Controller;
  readonly root: HTMLElement;
  readonly onCommand?: (command: Command | GridRevealCellCommand | GridRevealRowCommand) => void;
  readonly onSnapshotChange?: (snapshot: GridDOMState) => void;
}

export interface GridDOMControlledValues extends TabularControlledValues {
  readonly columnSizes?: Readonly<Record<TabularColumnID, number>>;
}
export interface GridDOMColumnHeaderOptions { readonly headerNodeID: TabularHeaderNodeID }
export interface GridDOMRowOptions extends TabularDOMRegistrationOptions { readonly rowID: TabularRowID | TabularGroupID; readonly disabled?: boolean }
export interface GridDOMCellOptions extends TabularDOMRegistrationOptions { readonly cell: TabularCellAddress; readonly disabled?: boolean }
export interface GridDOMSortTriggerOptions { readonly columnID: TabularColumnID; readonly comparator: string }
export type GridDOMFilterControlOptions =
  | { readonly scope: 'global'; readonly id: string; readonly predicate: string }
  | { readonly scope: 'column'; readonly id: string; readonly predicate: string; readonly columnID: TabularColumnID };
export interface GridDOMSelectionControlOptions { readonly rowID: TabularRowID; readonly name: string; readonly value: string; readonly form?: string; readonly disabled?: boolean }
export type GridDOMBulkSelectionControlOptions =
  | { readonly target: { readonly kind: 'all-matching' }; readonly disabled?: boolean }
  | { readonly target: { readonly kind: 'group-leaves'; readonly groupID: TabularGroupID }; readonly disabled?: boolean };
export interface GridDOMDisclosureOptions { readonly rowID: TabularGroupID; readonly disabled?: boolean }
export interface GridDOMEditorOptions extends TabularDOMEditorOptions {}

interface GridDOMEditorRegistration {
  readonly element: TabularDOMEditorElement;
  readonly options: GridDOMEditorOptions;
  composing: boolean;
  commit: () => boolean;
}

type BaseGridEvent =
  | { readonly type: 'focus-cell'; readonly cell: TabularCellAddress }
  | { readonly type: 'move-cell'; readonly direction: 'left' | 'right' | 'up' | 'down'; readonly boundary?: 'stop' | 'wrap-axis' }
  | { readonly type: 'toggle-row-selection'; readonly rowID: TabularRowID }
  | { readonly type: 'select-all-matching' }
  | { readonly type: 'request-group-leaf-selection'; readonly groupID: TabularGroupID }
  | { readonly type: 'set-query'; readonly query: TabularSnapshot['state']['query'] };

export class DOMTabularGrid<
  Event,
  Command,
  State extends GridDOMState,
  Projection extends GridDOMProjection,
> {
  public readonly controller: GridDOMController<Event, Command, State, Projection>;
  readonly #options: GridDOMConnectionOptions<GridDOMController<Event, Command, State, Projection>, Command>;
  readonly #tree: boolean;
  readonly #ownsController: boolean;
  readonly #scope = new BindingScope();
  readonly #columnSizes: ColumnSizeStore;
  readonly #rows = new Map<string, { readonly element: HTMLElement; readonly options: GridDOMRowOptions }>();
  readonly #cells = new Map<string, { readonly element: HTMLElement; readonly options: GridDOMCellOptions }>();
  readonly #editors = new Map<string, GridDOMEditorRegistration>();
  readonly #refreshers = new Set<() => void>();
  readonly #unsubscribeCommands: () => void;
  #pendingCell: GridRevealCellCommand | null = null;
  #pendingRow: GridRevealRowCommand | null = null;
  #projectionGeneration: number;

  public constructor(
    options: GridDOMConnectionOptions<GridDOMController<Event, Command, State, Projection>, Command>,
    tree: boolean,
    ownsController: boolean,
  ) {
    this.#options = options;
    this.controller = options.controller;
    this.#tree = tree;
    this.#ownsController = ownsController;
    this.#columnSizes = new ColumnSizeStore(options);
    this.#projectionGeneration = this.controller.getProjection().generation;
    this.#unsubscribeCommands = this.controller.subscribeCommands((command) => options.onCommand?.(command));
    bindEvent(this.#scope, options.root, 'keydown', (event) => this.#keydown(event));
    bindEvent(this.#scope, options.root, 'focusin', (event) => this.#focusTarget(event.target));
    bindEvent(this.#scope, options.root, 'click', (event) => this.#focusTarget(event.target));
    this.setGridAttributes();
  }

  public getSnapshot(): State { return this.controller.getSnapshot(); }
  public getProjection(): Projection { return this.controller.getProjection(); }
  public getColumnSizeState(): TabularDOMColumnSizeState { return this.#columnSizes.getState(); }

  public syncControlledValues(values: GridDOMControlledValues): TabularResult<State> {
    const sizes = this.#columnSizes.synchronize(values.columnSizes);
    if (!sizes.ok) return sizes as TabularResult<State>;
    const { columnSizes: _columnSizes, ...semantic } = values;
    const result = this.controller.syncControlledValues(semantic);
    if (result.ok) this.#updated();
    return result;
  }

  public synchronizeView(response: TabularViewResponse): TabularResult<State> {
    const result = this.controller.synchronizeView(response);
    if (result.ok) this.#updated();
    return result;
  }

  public requestView(): TabularResult<State> {
    const result = this.controller.requestView();
    if (result.ok) this.#updated();
    return result;
  }

  public abandonRequest(requestID: number): TabularResult<State> {
    const result = this.controller.abandonRequest(requestID);
    if (result.ok) this.#updated();
    return result;
  }

  public handleEvent(event: Event): boolean {
    if (!this.#scope.active) return false;
    const result = this.controller.dispatch(event);
    if (result.ok) this.#updated();
    return result.ok;
  }

  public setGridAttributes(element: HTMLElement = this.#options.root): void {
    const snapshot = this.#semanticSnapshot();
    const view = currentView(snapshot);
    const rowCount = view?.visibleRowCount.kind === 'known' ? view.visibleRowCount.value : this.getProjection().rows.length;
    element.setAttribute('role', this.#tree ? 'treegrid' : 'grid');
    element.setAttribute('data-scope', this.#tree ? 'data-tree-grid' : 'data-grid');
    element.setAttribute('data-part', 'root');
    element.setAttribute('aria-rowcount', String(rowCount));
    element.setAttribute('aria-colcount', String(this.#orderedColumns().length));
  }

  public setColumnHeaderAttributes(element: HTMLElement, options: GridDOMColumnHeaderOptions): void {
    const snapshot = this.#semanticSnapshot();
    const metric = headerMetrics(snapshot).find((entry) => entry.headerNodeID === options.headerNodeID);
    element.setAttribute('role', 'columnheader');
    element.setAttribute('data-part', 'column-header');
    element.setAttribute('data-header-node-id', options.headerNodeID);
    element.id = headerElementID(options.headerNodeID);
    if (metric === undefined) {
      clearAttributes(element, ['aria-colindex', 'aria-colspan', 'aria-rowspan', 'aria-sort']);
      return;
    }
    element.setAttribute('aria-colindex', String(metric.columnIndex));
    element.setAttribute('aria-colspan', String(metric.colSpan));
    element.setAttribute('aria-rowspan', String(metric.rowSpan));
    if (metric.columnID === null) {
      element.removeAttribute('aria-sort');
      return;
    }
    const sort = snapshot.state.query.sort.find((entry) => entry.columnID === metric.columnID);
    if (sort === undefined) element.removeAttribute('aria-sort');
    else element.setAttribute('aria-sort', sort.direction);
    setColumnInlineSize(element, metric.columnID, this.#columnSizes.getState());
  }

  public setRowAttributes(element: HTMLElement, options: GridDOMRowOptions): void {
    const projection = this.getProjection();
    const index = projection.rows.findIndex((row) => row.rowID === options.rowID);
    const row = projection.rows[index];
    element.setAttribute('role', 'row');
    element.setAttribute('data-part', 'row');
    element.setAttribute('data-row-id', options.rowID);
    if (index >= 0) element.setAttribute('aria-rowindex', String(index + 1));
    else element.removeAttribute('aria-rowindex');
    element.setAttribute('aria-disabled', String(options.disabled === true));
    if (row?.row.kind === 'leaf') element.setAttribute('aria-selected', String(rowSelected(projection.rowSelection, row.row.id)));
    else element.removeAttribute('aria-selected');
    if (!this.#tree || row === undefined) {
      clearAttributes(element, ['aria-level', 'aria-expanded', 'aria-posinset', 'aria-setsize']);
      return;
    }
    element.setAttribute('aria-level', String(row.depth + 1));
    if (row.row.kind === 'group') element.setAttribute('aria-expanded', String(row.row.expanded));
    else element.removeAttribute('aria-expanded');
    const siblings = projection.rows.filter((entry) => entry.parentRowID === row.parentRowID && entry.depth === row.depth);
    element.setAttribute('aria-setsize', String(siblings.length));
    element.setAttribute('aria-posinset', String(siblings.findIndex((entry) => entry.rowID === row.rowID) + 1));
  }

  public setCellAttributes(element: HTMLElement, options: GridDOMCellOptions): void {
    const projection = this.getProjection();
    const row = projection.rows.find((entry) => entry.rowID === options.cell.rowID);
    const selected = row?.row.kind === 'leaf' && rowSelected(projection.rowSelection, row.row.id);
    const current = projection.cursor.current;
    element.setAttribute('role', 'gridcell');
    element.setAttribute('data-part', 'cell');
    element.setAttribute('data-row-id', options.cell.rowID);
    element.setAttribute('data-column-id', options.cell.columnID);
    const rowPosition = projection.rows.findIndex((entry) => entry.rowID === options.cell.rowID);
    const columnPosition = this.#orderedColumns().indexOf(options.cell.columnID);
    if (rowPosition >= 0) element.setAttribute('aria-rowindex', String(rowPosition + 1));
    else element.removeAttribute('aria-rowindex');
    if (columnPosition >= 0) element.setAttribute('aria-colindex', String(columnPosition + 1));
    else element.removeAttribute('aria-colindex');
    element.setAttribute('aria-selected', String(selected));
    element.setAttribute('aria-disabled', String(options.disabled === true));
    element.tabIndex = current !== null && current.rowID === options.cell.rowID && current.columnID === options.cell.columnID ? 0 : -1;
    const definition = currentView(this.#semanticSnapshot())?.columnSchema.columns.find((column) => column.id === options.cell.columnID);
    element.setAttribute('aria-readonly', String(row?.row.kind !== 'leaf' || definition?.capabilities?.includes('edit') !== true));
    setColumnInlineSize(element, options.cell.columnID, this.#columnSizes.getState());
  }

  public registerRow(element: HTMLElement, options: GridDOMRowOptions): TabularResult<() => void> {
    const valid = validateRegistrationGeneration(this.getProjection().generation, options);
    if (!valid.ok) return valid;
    if (!this.getProjection().rows.some((row) => row.rowID === options.rowID)) return domFailure('profile-view-mismatch', 'Registered grid row is not projected.', { rowID: options.rowID });
    const current = this.#rows.get(options.rowID);
    if (current !== undefined && current.element !== element) return domFailure('profile-view-mismatch', 'Grid row is already registered.', { rowID: options.rowID });
    this.#rows.set(options.rowID, { element, options });
    this.setRowAttributes(element, options);
    if (this.#pendingRow?.rowID === options.rowID && this.#pendingRow.expectedProjectionGeneration === this.getProjection().generation) this.#pendingRow = null;
    return ok(this.#scope.retain(() => { if (this.#rows.get(options.rowID)?.element === element) this.#rows.delete(options.rowID); }));
  }

  public registerCell(element: HTMLElement, options: GridDOMCellOptions): TabularResult<() => void> {
    const valid = validateRegistrationGeneration(this.getProjection().generation, options);
    if (!valid.ok) return valid;
    if (!this.#hasCell(options.cell)) return domFailure('profile-view-mismatch', 'Registered grid cell is not projected.', { cell: options.cell });
    const key = cellKey(options.cell);
    const current = this.#cells.get(key);
    if (current !== undefined && current.element !== element) return domFailure('profile-view-mismatch', 'Grid cell is already registered.', { cell: options.cell });
    this.#cells.set(key, { element, options });
    this.setCellAttributes(element, options);
    const pending = this.#pendingCell;
    if (pending !== null && cellKey(pending.cell) === key && pending.expectedProjectionGeneration === this.getProjection().generation) {
      this.#pendingCell = null;
      queueMicrotask(() => { if (this.#scope.active) element.focus({ preventScroll: true }); });
    }
    return ok(this.#scope.retain(() => { if (this.#cells.get(key)?.element === element) this.#cells.delete(key); }));
  }

  public bindSortTrigger(element: HTMLElement, options: GridDOMSortTriggerOptions): () => void {
    element.setAttribute('data-part', 'sort-trigger');
    element.setAttribute('data-column-id', options.columnID);
    const update = (): void => {
      const current = this.#semanticSnapshot().state.query.sort.find((entry) => entry.columnID === options.columnID)?.direction;
      element.setAttribute('aria-pressed', String(current !== undefined));
    };
    const dispose = bindEvent(this.#scope, element, 'click', () => {
      const query = this.#semanticSnapshot().state.query;
      const current = query.sort.find((entry) => entry.columnID === options.columnID)?.direction;
      const direction = current === undefined ? 'ascending' : current === 'ascending' ? 'descending' : null;
      this.handleEvent({ type: 'set-query', query: queryWithSort(query, options.columnID, options.comparator, direction) } as Event);
    });
    this.#refreshers.add(update);
    update();
    return this.#scope.retain(() => { dispose(); this.#refreshers.delete(update); });
  }

  public bindFilterControl(element: HTMLInputElement | HTMLSelectElement, options: GridDOMFilterControlOptions): () => void {
    element.setAttribute('data-part', 'filter-control');
    if (options.scope === 'column') element.setAttribute('data-column-id', options.columnID);
    return bindEvent(this.#scope, element, 'input', () => {
      const query = this.#semanticSnapshot().state.query;
      this.handleEvent({
        type: 'set-query',
        query: queryWithFilter(query, options.id, options.scope, options.predicate, element.value, options.scope === 'column' ? options.columnID : undefined),
      } as Event);
    });
  }

  public bindRowSelectionControl(element: HTMLInputElement, options: GridDOMSelectionControlOptions): () => void {
    element.type = 'checkbox';
    element.value = options.value;
    element.disabled = options.disabled === true;
    if (options.form === undefined) element.removeAttribute('form');
    else element.setAttribute('form', options.form);
    element.setAttribute('data-part', 'row-selection-control');
    element.setAttribute('data-row-id', options.rowID);
    const update = (): void => {
      const selection = this.getProjection().rowSelection;
      element.checked = rowSelected(selection, options.rowID);
      if (selection.kind === 'explicit-rows') element.name = options.name;
      else element.removeAttribute('name');
    };
    const dispose = bindEvent(this.#scope, element, 'change', () => this.handleEvent({ type: 'toggle-row-selection', rowID: options.rowID } as Event));
    this.#refreshers.add(update);
    update();
    return this.#scope.retain(() => { dispose(); this.#refreshers.delete(update); });
  }

  public bindBulkSelectionControl(element: HTMLElement, options: GridDOMBulkSelectionControlOptions): () => void {
    element.setAttribute('data-part', 'bulk-selection-control');
    element.setAttribute('aria-disabled', String(options.disabled === true));
    return bindEvent(this.#scope, element, 'click', () => {
      if (options.disabled === true) return;
      const event: BaseGridEvent = options.target.kind === 'all-matching'
        ? { type: 'select-all-matching' }
        : { type: 'request-group-leaf-selection', groupID: options.target.groupID };
      this.handleEvent(event as Event);
    });
  }

  public bindRowDisclosure(element: HTMLElement, options: GridDOMDisclosureOptions): () => void {
    element.setAttribute('data-part', 'row-disclosure');
    element.setAttribute('data-row-id', options.rowID);
    const update = (): void => {
      element.setAttribute('aria-expanded', String(this.getProjection().expansion.expandedRowIDs.includes(options.rowID)));
      element.setAttribute('aria-disabled', String(options.disabled === true));
    };
    const dispose = bindEvent(this.#scope, element, 'click', () => {
      if (!this.#tree || options.disabled === true) return;
      const open = !this.getProjection().expansion.expandedRowIDs.includes(options.rowID);
      this.handleEvent({ type: 'set-row-expanded', rowID: options.rowID, open } as Event);
    });
    this.#refreshers.add(update);
    update();
    return this.#scope.retain(() => { dispose(); this.#refreshers.delete(update); });
  }

  public bindEditor(element: TabularDOMEditorElement, options: GridDOMEditorOptions): () => void {
    const key = cellKey(options.cell);
    const registration: GridDOMEditorRegistration = { element, options, composing: false, commit: () => false };
    this.#editors.set(key, registration);
    setEditorAttributes(element, options, 'editor');
    const update = (): void => {
      const edit = this.getSnapshot().edit;
      const active = edit.kind === 'editing' && cellKey(edit.cell) === key;
      element.hidden = !active;
      element.tabIndex = active && options.disabled !== true ? 0 : -1;
      element.setAttribute('data-state', active ? 'editing' : 'idle');
    };
    const commit = (): boolean => {
      if (registration.composing || options.disabled === true || options.readOnly === true) return false;
      const value = readEditorValue(element, options.parseValue);
      element.setAttribute('aria-invalid', String(!value.ok));
      return value.ok && this.handleEvent({ type: 'commit-edit', value: value.value } as Event);
    };
    registration.commit = commit;
    const keydown = (event: KeyboardEvent): void => {
      if (event.isComposing || registration.composing) return;
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (this.handleEvent({ type: 'cancel-edit', reason: 'escape' } as Event)) event.preventDefault();
      } else if (event.key === 'Enter' && !(element.tagName === 'TEXTAREA' && event.shiftKey)) {
        event.stopPropagation();
        if (commit()) event.preventDefault();
      }
    };
    const input = (): void => element.setAttribute('aria-invalid', 'false');
    const blur = (): void => { if (options.commitOnBlur === true && this.getSnapshot().edit.kind === 'editing') commit(); };
    const compositionStart = (): void => { registration.composing = true; };
    const compositionEnd = (): void => { registration.composing = false; };
    const disposers = [
      bindEvent(this.#scope, element, 'keydown', keydown),
      bindEvent(this.#scope, element, 'input', input),
      bindEvent(this.#scope, element, 'blur', blur),
      bindEvent(this.#scope, element, 'compositionstart', compositionStart),
      bindEvent(this.#scope, element, 'compositionend', compositionEnd),
    ];
    this.#refreshers.add(update);
    update();
    return this.#scope.retain(() => {
      for (const dispose of disposers) dispose();
      this.#refreshers.delete(update);
      if (this.#editors.get(key) === registration) this.#editors.delete(key);
    });
  }

  public bindColumnResizeHandle(element: HTMLElement, options: TabularDOMColumnResizeHandleOptions): () => void {
    return bindColumnResizeHandle(this.#scope, element, this.#columnSizes, options, () => this.#updated());
  }

  public requestRevealCell(cell: TabularCellAddress, expectedProjectionGeneration: number = this.getProjection().generation): boolean {
    if (!this.#scope.active || expectedProjectionGeneration !== this.getProjection().generation || !this.#hasCell(cell)) return false;
    const command = Object.freeze({ type: 'request-reveal-cell' as const, cell: Object.freeze({ ...cell }), expectedProjectionGeneration });
    if (this.#pendingCell !== null && cellKey(this.#pendingCell.cell) === cellKey(cell) && this.#pendingCell.expectedProjectionGeneration === expectedProjectionGeneration) return true;
    this.#pendingCell = command;
    this.#options.onCommand?.(command);
    return true;
  }

  public requestRevealRow(rowID: TabularRowID, expectedProjectionGeneration: number = this.getProjection().generation): boolean {
    if (!this.#tree || !this.#scope.active || expectedProjectionGeneration !== this.getProjection().generation || !this.getProjection().rows.some((row) => row.rowID === rowID)) return false;
    const command = Object.freeze({ type: 'request-reveal-row' as const, rowID, expectedProjectionGeneration });
    if (this.#pendingRow?.rowID === rowID && this.#pendingRow.expectedProjectionGeneration === expectedProjectionGeneration) return true;
    this.#pendingRow = command;
    this.#options.onCommand?.(command);
    return true;
  }

  public focusCurrent(): void {
    if (!this.#scope.active) return;
    const current = this.getProjection().cursor.current;
    if (current === null) {
      this.#options.root.focus({ preventScroll: true });
      return;
    }
    const edit = this.getSnapshot().edit;
    const editorRegistration = edit.kind === 'editing' ? this.#editors.get(cellKey(edit.cell)) : undefined;
    const editor = editorRegistration?.options.disabled === true ? undefined : editorRegistration?.element;
    if (editor !== undefined) {
      queueMicrotask(() => {
        if (!this.#scope.active || this.getSnapshot().edit.kind !== 'editing') return;
        editor.focus({ preventScroll: true });
        if ('select' in editor && typeof editor.select === 'function') editor.select();
      });
      return;
    }
    const element = this.#cells.get(cellKey(current))?.element;
    if (element !== undefined) {
      this.#pendingCell = null;
      queueMicrotask(() => { if (this.#scope.active) element.focus({ preventScroll: true }); });
    } else this.requestRevealCell(current);
  }

  public refresh(): void {
    if (!this.#scope.active) return;
    const generation = this.getProjection().generation;
    if (generation !== this.#projectionGeneration) {
      this.#projectionGeneration = generation;
      this.#pendingCell = null;
      this.#pendingRow = null;
    }
    this.setGridAttributes();
    for (const registration of this.#rows.values()) this.setRowAttributes(registration.element, registration.options);
    for (const registration of this.#cells.values()) this.setCellAttributes(registration.element, registration.options);
    for (const refresh of this.#refreshers) refresh();
  }

  public disconnect(): void {
    if (!this.#scope.active) return;
    this.#scope.disconnect();
    this.#unsubscribeCommands();
    this.#rows.clear();
    this.#cells.clear();
    this.#editors.clear();
    this.#refreshers.clear();
    this.#pendingCell = null;
    this.#pendingRow = null;
    clearAttributes(this.#options.root, ['role', 'data-scope', 'data-part', 'aria-rowcount', 'aria-colcount']);
    if (this.#ownsController) this.controller.dispose();
  }

  #updated(): void {
    this.refresh();
    this.#options.onSnapshotChange?.(this.getSnapshot());
    this.focusCurrent();
  }

  #semanticSnapshot(): TabularSnapshot { return this.getSnapshot().tabular; }
  #orderedColumns(): readonly TabularColumnID[] {
    const columns = this.getProjection().columns;
    return [...columns.start, ...columns.center, ...columns.end];
  }
  #hasCell(cell: TabularCellAddress): boolean {
    return this.getProjection().rows.some((row) => row.rowID === cell.rowID && row.cells.some((candidate) => candidate.columnID === cell.columnID));
  }
  #findCell(target: EventTarget | null): GridDOMCellOptions | null {
    if (target === null) return null;
    for (const registration of this.#cells.values()) {
      if (target === registration.element || registration.element.contains(target as Node)) return registration.options;
    }
    return null;
  }
  #focusTarget(target: EventTarget | null): void {
    const registration = this.#findCell(target);
    if (registration === null || registration.disabled === true) return;
    const current = this.getProjection().cursor.current;
    if (current !== null && cellKey(current) === cellKey(registration.cell)) return;
    this.handleEvent({ type: 'focus-cell', cell: registration.cell } as Event);
  }
  #keydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    const edit = this.getSnapshot().edit;
    if (edit.kind === 'editing') {
      if (event.key === 'Escape') {
        if (this.handleEvent({ type: 'cancel-edit', reason: 'escape' } as Event)) event.preventDefault();
      } else if (event.key === 'Enter') {
        if (this.#editors.get(cellKey(edit.cell))?.commit() === true) event.preventDefault();
      }
      return;
    }
    if (event.key === 'Enter' || event.key === 'F2') {
      if (this.handleEvent({ type: 'begin-edit' } as Event)) event.preventDefault();
      return;
    }
    const direction = event.key === 'ArrowLeft' ? 'left' : event.key === 'ArrowRight' ? 'right' : event.key === 'ArrowUp' ? 'up' : event.key === 'ArrowDown' ? 'down' : null;
    if (direction !== null) {
      if (this.handleEvent({ type: 'move-cell', direction } as Event)) event.preventDefault();
      return;
    }
    if (event.key !== ' ') return;
    const current = this.getProjection().cursor.current;
    const row = current === null ? undefined : this.getProjection().rows.find((entry) => entry.rowID === current.rowID)?.row;
    if (row?.kind === 'leaf' && this.handleEvent({ type: 'toggle-row-selection', rowID: row.id } as Event)) event.preventDefault();
  }
}
