import type {
  TabularCellAddress,
  TabularColumnID,
  TabularControlledValues,
  TabularGroupID,
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
  allMatchingSelectionState,
  bindCheckboxActivation,
  bindColumnResizeHandle,
  bindEvent,
  bindRowSelectionActivation,
  cellKey,
  clearAttributes,
  currentView,
  domFailure,
  headerElementID,
  ok,
  queryWithFilter,
  queryWithSort,
  readEditorValue,
  resolveHeaderReference,
  rowSelected,
  rowSelectionActivation,
  setColumnInlineSize,
  setBulkSelectionControlAttributes,
  setRowSelectionControlAttributes,
  setEditorAttributes,
  validateRegistrationGeneration,
  type TabularDOMColumnResizeHandleOptions,
  type TabularDOMColumnSizeOptions,
  type TabularDOMColumnSizeState,
  type TabularDOMEditorElement,
  type TabularDOMEditorOptions,
  type TabularDOMHeaderReference,
  type TabularDOMRegistrationOptions,
  type TabularDOMRowSelectionAnchor,
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
export type GridDOMColumnHeaderOptions = TabularDOMHeaderReference;
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

type GridDOMCellRegistration = readonly [key: string, element: HTMLElement, options: GridDOMCellOptions];
type GridDOMRowLookup = readonly [row: GridDOMRow, index: number, positionInSet: number, setSize: number];

type BaseGridEvent =
  | { readonly type: 'focus-cell'; readonly cell: TabularCellAddress }
  | { readonly type: 'move-cell'; readonly direction: 'left' | 'right' | 'up' | 'down'; readonly boundary?: 'stop' | 'wrap-axis' }
  | { readonly type: 'toggle-row-selection'; readonly rowID: TabularRowID }
  | { readonly type: 'set-row-selection-range'; readonly anchorRowID: TabularRowID; readonly rowID: TabularRowID; readonly selected: boolean }
  | { readonly type: 'set-row-selection'; readonly selection: TabularRowSelection }
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
  readonly #cells = new Map<string, GridDOMCellRegistration>();
  readonly #cellOwners = new WeakMap<HTMLElement, GridDOMCellRegistration>();
  readonly #editors = new Map<string, GridDOMEditorRegistration>();
  readonly #projectedRowsByID = new Map<TabularRowID | TabularGroupID, GridDOMRowLookup>();
  readonly #projectedColumnIndexes = new Map<TabularColumnID, number>();
  readonly #refreshers = new Set<() => void>();
  readonly #unsubscribeCommands: () => void;
  #projectedRows: readonly GridDOMRow[] | null = null;
  #projectedColumnGeneration: number | null = null;
  #projectedColumnSchemaRevision: number | null = null;
  #pendingCell: GridRevealCellCommand | null = null;
  #pendingRow: GridRevealRowCommand | null = null;
  #projectionGeneration: number;
  #selectionAnchor: TabularDOMRowSelectionAnchor | null = null;

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
    const projection = this.getProjection();
    const view = currentView(this.#semanticSnapshot());
    const rowCount = view?.visibleRowCount.kind === 'known' ? view.visibleRowCount.value : projection.rows.length;
    element.setAttribute('role', this.#tree ? 'treegrid' : 'grid');
    element.setAttribute('data-scope', this.#tree ? 'data-tree-grid' : 'data-grid');
    element.setAttribute('data-part', 'root');
    element.setAttribute('aria-rowcount', String(rowCount));
    element.setAttribute('aria-colcount', String(projection.columns.start.length + projection.columns.center.length + projection.columns.end.length));
  }

  public setColumnHeaderAttributes(element: HTMLElement, options: GridDOMColumnHeaderOptions): void {
    const snapshot = this.#semanticSnapshot();
    const resolved = resolveHeaderReference(snapshot, options);
    const metric = resolved.metric;
    element.setAttribute('role', 'columnheader');
    element.setAttribute('data-part', 'column-header');
    element.setAttribute('data-header-node-id', resolved.headerNodeID);
    element.id = headerElementID(resolved.headerNodeID);
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
    this.#ensureProjectedRows(projection.rows);
    this.#setRowAttributes(element, options, projection, this.#projectedRowsByID.get(options.rowID));
  }

  public setCellAttributes(element: HTMLElement, options: GridDOMCellOptions): void {
    const projection = this.getProjection();
    this.#ensureProjectedRows(projection.rows);
    this.#ensureProjectedColumns(projection, this.#semanticSnapshot());
    this.#setCellAttributes(element, options, projection, this.#projectedRowsByID.get(options.cell.rowID), this.#projectedColumnIndexes.get(options.cell.columnID));
  }

  public registerRow(element: HTMLElement, options: GridDOMRowOptions): TabularResult<() => void> {
    const projection = this.getProjection();
    const valid = validateRegistrationGeneration(projection.generation, options);
    if (!valid.ok) return valid;
    this.#ensureProjectedRows(projection.rows);
    const row = this.#projectedRowsByID.get(options.rowID);
    if (row === undefined) return domFailure('profile-view-mismatch', 'Registered grid row is not projected.', { rowID: options.rowID });
    const current = this.#rows.get(options.rowID);
    if (current !== undefined && current.element !== element) return domFailure('profile-view-mismatch', 'Grid row is already registered.', { rowID: options.rowID });
    this.#rows.set(options.rowID, { element, options });
    this.#setRowAttributes(element, options, projection, row);
    if (this.#pendingRow?.rowID === options.rowID && this.#pendingRow.expectedProjectionGeneration === projection.generation) this.#pendingRow = null;
    return ok(this.#scope.retain(() => { if (this.#rows.get(options.rowID)?.element === element) this.#rows.delete(options.rowID); }));
  }

  public registerCell(element: HTMLElement, options: GridDOMCellOptions): TabularResult<() => void> {
    const projection = this.getProjection();
    const valid = validateRegistrationGeneration(projection.generation, options);
    if (!valid.ok) return valid;
    this.#ensureProjectedRows(projection.rows);
    this.#ensureProjectedColumns(projection, this.#semanticSnapshot());
    const row = this.#projectedRowsByID.get(options.cell.rowID);
    const columnIndex = this.#projectedColumnIndexes.get(options.cell.columnID);
    if (row === undefined || columnIndex === undefined) return domFailure('profile-view-mismatch', 'Registered grid cell is not projected.', { cell: options.cell });
    const key = cellKey(options.cell);
    const current = this.#cells.get(key);
    if (current !== undefined && current[1] !== element) return domFailure('profile-view-mismatch', 'Grid cell is already registered.', { cell: options.cell });
    const owner = this.#cellOwners.get(element);
    if (owner !== undefined && owner[0] !== key && this.#cells.get(owner[0]) === owner) this.#cells.delete(owner[0]);
    const registration: GridDOMCellRegistration = [key, element, options];
    this.#cells.set(key, registration);
    this.#cellOwners.set(element, registration);
    this.#setCellAttributes(element, options, projection, row, columnIndex);
    const pending = this.#pendingCell;
    if (pending !== null && cellKey(pending.cell) === key && pending.expectedProjectionGeneration === projection.generation) {
      this.#pendingCell = null;
      queueMicrotask(() => { if (this.#scope.active) element.focus({ preventScroll: true }); });
    }
    return ok(this.#scope.retain(() => {
      if (this.#cells.get(key) === registration) this.#cells.delete(key);
      if (this.#cellOwners.get(element) === registration) this.#cellOwners.delete(element);
    }));
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

  public bindRowSelectionControl(element: HTMLElement, options: GridDOMSelectionControlOptions): () => void {
    const input = element.tagName === 'INPUT' ? element as HTMLInputElement : null;
    if (input !== null) {
      input.type = 'checkbox';
      input.value = options.value;
      if (options.form === undefined) input.removeAttribute('form');
      else input.setAttribute('form', options.form);
    }
    element.setAttribute('data-part', 'row-selection-control');
    element.setAttribute('data-row-id', options.rowID);
    const update = (): void => {
      const selection = this.getProjection().rowSelection;
      setRowSelectionControlAttributes(element, rowSelected(selection, options.rowID), options.disabled === true);
      if (input !== null) {
        if (selection.kind === 'explicit-rows') input.name = options.name;
        else input.removeAttribute('name');
      }
    };
    const activate = (shiftKey: boolean): void => {
      if (options.disabled === true) return;
      const projection = this.getProjection();
      const activation = rowSelectionActivation(
        projection.rowSelection,
        projection.generation,
        this.#selectionAnchor,
        options.rowID,
        shiftKey,
      );
      if (this.handleEvent(activation.event as Event)) this.#selectionAnchor = activation.anchor;
      else if (activation.event.type === 'set-row-selection-range') {
        const fallback = rowSelectionActivation(projection.rowSelection, projection.generation, null, options.rowID, false);
        if (this.handleEvent(fallback.event as Event)) this.#selectionAnchor = fallback.anchor;
      }
    };
    const disposers = bindRowSelectionActivation(this.#scope, element, activate);
    this.#refreshers.add(update);
    update();
    return this.#scope.retain(() => { for (const dispose of disposers) dispose(); this.#refreshers.delete(update); });
  }

  public bindBulkSelectionControl(element: HTMLElement, options: GridDOMBulkSelectionControlOptions): () => void {
    element.setAttribute('data-part', 'bulk-selection-control');
    const update = (): void => {
      if (options.target.kind !== 'all-matching') {
        setBulkSelectionControlAttributes(element, 'unchecked', options.disabled === true);
        return;
      }
      setBulkSelectionControlAttributes(element, allMatchingSelectionState(this.#semanticSnapshot()), options.disabled === true);
    };
    const activate = (): void => {
      if (options.disabled === true) return;
      const event: BaseGridEvent = options.target.kind === 'all-matching'
        ? allMatchingSelectionState(this.#semanticSnapshot()) === 'checked'
          ? { type: 'set-row-selection', selection: { kind: 'explicit-rows', rowIDs: [] } }
          : { type: 'select-all-matching' }
        : { type: 'request-group-leaf-selection', groupID: options.target.groupID };
      this.handleEvent(event as Event);
    };
    const disposers = bindCheckboxActivation(this.#scope, element, activate);
    this.#refreshers.add(update);
    update();
    return this.#scope.retain(() => { for (const dispose of disposers) dispose(); this.#refreshers.delete(update); });
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
    return bindColumnResizeHandle(this.#scope, element, this.#columnSizes, options, this.#refreshers, () => this.#updated());
  }

  public requestRevealCell(cell: TabularCellAddress, expectedProjectionGeneration: number = this.getProjection().generation): boolean {
    if (!this.#scope.active) return false;
    const projection = this.getProjection();
    if (expectedProjectionGeneration !== projection.generation || !this.#hasCell(projection, cell)) return false;
    const command = Object.freeze({ type: 'request-reveal-cell' as const, cell: Object.freeze({ ...cell }), expectedProjectionGeneration });
    if (this.#pendingCell !== null && cellKey(this.#pendingCell.cell) === cellKey(cell) && this.#pendingCell.expectedProjectionGeneration === expectedProjectionGeneration) return true;
    this.#pendingCell = command;
    this.#options.onCommand?.(command);
    return true;
  }

  public requestRevealRow(rowID: TabularRowID, expectedProjectionGeneration: number = this.getProjection().generation): boolean {
    if (!this.#tree || !this.#scope.active) return false;
    const projection = this.getProjection();
    if (expectedProjectionGeneration !== projection.generation) return false;
    this.#ensureProjectedRows(projection.rows);
    if (!this.#projectedRowsByID.has(rowID)) return false;
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
    const element = this.#cells.get(cellKey(current))?.[1];
    if (element !== undefined) {
      this.#pendingCell = null;
      queueMicrotask(() => { if (this.#scope.active) element.focus({ preventScroll: true }); });
    } else this.requestRevealCell(current);
  }

  public refresh(): void {
    if (!this.#scope.active) return;
    const projection = this.getProjection();
    const snapshot = this.#semanticSnapshot();
    const generation = projection.generation;
    if (generation !== this.#projectionGeneration) {
      this.#projectionGeneration = generation;
      this.#pendingCell = null;
      this.#pendingRow = null;
      this.#selectionAnchor = null;
    }
    this.#ensureProjectedRows(projection.rows);
    this.#ensureProjectedColumns(projection, snapshot);
    this.setGridAttributes();
    for (const registration of this.#rows.values()) this.#setRowAttributes(registration.element, registration.options, projection, this.#projectedRowsByID.get(registration.options.rowID));
    for (const registration of this.#cells.values()) this.#setCellAttributes(registration[1], registration[2], projection, this.#projectedRowsByID.get(registration[2].cell.rowID), this.#projectedColumnIndexes.get(registration[2].cell.columnID));
    for (const refresh of this.#refreshers) refresh();
  }

  public disconnect(): void {
    if (!this.#scope.active) return;
    this.#scope.disconnect();
    this.#unsubscribeCommands();
    this.#rows.clear();
    this.#cells.clear();
    this.#editors.clear();
    this.#projectedRowsByID.clear();
    this.#projectedColumnIndexes.clear();
    this.#projectedRows = null;
    this.#projectedColumnGeneration = null;
    this.#projectedColumnSchemaRevision = null;
    this.#refreshers.clear();
    this.#pendingCell = null;
    this.#pendingRow = null;
    this.#selectionAnchor = null;
    clearAttributes(this.#options.root, ['role', 'data-scope', 'data-part', 'aria-rowcount', 'aria-colcount']);
    if (this.#ownsController) this.controller.dispose();
  }

  #updated(): void {
    this.refresh();
    this.#options.onSnapshotChange?.(this.getSnapshot());
    this.focusCurrent();
  }

  #setRowAttributes(
    element: HTMLElement,
    options: GridDOMRowOptions,
    projection: Projection,
    lookup: GridDOMRowLookup | undefined,
  ): void {
    const row = lookup?.[0];
    element.setAttribute('role', 'row');
    element.setAttribute('data-part', 'row');
    element.setAttribute('data-row-id', options.rowID);
    if (lookup === undefined) element.removeAttribute('aria-rowindex');
    else element.setAttribute('aria-rowindex', String(lookup[1] + 1));
    element.setAttribute('aria-disabled', String(options.disabled === true));
    if (row?.row.kind === 'leaf') element.setAttribute('aria-selected', String(rowSelected(projection.rowSelection, row.row.id)));
    else element.removeAttribute('aria-selected');
    if (!this.#tree || row === undefined || lookup === undefined) {
      clearAttributes(element, ['aria-level', 'aria-expanded', 'aria-posinset', 'aria-setsize']);
      return;
    }
    element.setAttribute('aria-level', String(row.depth + 1));
    if (row.row.kind === 'group') element.setAttribute('aria-expanded', String(row.row.expanded));
    else element.removeAttribute('aria-expanded');
    element.setAttribute('aria-posinset', String(lookup[2]));
    element.setAttribute('aria-setsize', String(lookup[3]));
  }

  #setCellAttributes(
    element: HTMLElement,
    options: GridDOMCellOptions,
    projection: Projection,
    rowLookup: GridDOMRowLookup | undefined,
    columnIndex: number | undefined,
  ): void {
    const row = rowLookup?.[0];
    const selected = row?.row.kind === 'leaf' && rowSelected(projection.rowSelection, row.row.id);
    const current = projection.cursor.current;
    element.setAttribute('role', 'gridcell');
    element.setAttribute('data-part', 'cell');
    element.setAttribute('data-row-id', options.cell.rowID);
    element.setAttribute('data-column-id', options.cell.columnID);
    if (rowLookup === undefined) element.removeAttribute('aria-rowindex');
    else element.setAttribute('aria-rowindex', String(rowLookup[1] + 1));
    if (columnIndex === undefined) element.removeAttribute('aria-colindex');
    else element.setAttribute('aria-colindex', String(Math.abs(columnIndex)));
    element.setAttribute('aria-selected', String(selected));
    element.setAttribute('aria-disabled', String(options.disabled === true));
    element.tabIndex = current !== null && current.rowID === options.cell.rowID && current.columnID === options.cell.columnID ? 0 : -1;
    element.setAttribute('aria-readonly', String(row?.row.kind !== 'leaf' || columnIndex === undefined || columnIndex < 0));
    setColumnInlineSize(element, options.cell.columnID, this.#columnSizes.getState());
  }

  #ensureProjectedRows(rows: readonly GridDOMRow[]): void {
    if (this.#projectedRows === rows) return;
    this.#projectedRows = rows;
    this.#projectedRowsByID.clear();
    if (!this.#tree) {
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index]!;
        this.#projectedRowsByID.set(row.rowID, [row, index, 1, 1]);
      }
      return;
    }
    const siblingCounts = new Map<TabularGroupID | null, number>();
    for (const row of rows) siblingCounts.set(row.parentRowID, (siblingCounts.get(row.parentRowID) ?? 0) + 1);
    const siblingPositions = new Map<TabularGroupID | null, number>();
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]!;
      const position = (siblingPositions.get(row.parentRowID) ?? 0) + 1;
      siblingPositions.set(row.parentRowID, position);
      this.#projectedRowsByID.set(row.rowID, [row, index, position, siblingCounts.get(row.parentRowID) ?? 1]);
    }
  }

  #ensureProjectedColumns(projection: Projection, snapshot: TabularSnapshot): void {
    const schemaRevision = snapshot.state.acceptedViewState.kind === 'none' ? null : snapshot.state.columnSchemaRevision;
    if (this.#projectedColumnGeneration === projection.generation && this.#projectedColumnSchemaRevision === schemaRevision) return;
    this.#projectedColumnGeneration = projection.generation;
    this.#projectedColumnSchemaRevision = schemaRevision;
    this.#projectedColumnIndexes.clear();
    const editable = new Set<TabularColumnID>();
    for (const column of currentView(snapshot)?.columnSchema.columns ?? []) {
      if (column.capabilities?.includes('edit') === true) editable.add(column.id);
    }
    let index = 1;
    for (const partition of [projection.columns.start, projection.columns.center, projection.columns.end]) {
      for (const columnID of partition) this.#projectedColumnIndexes.set(columnID, editable.has(columnID) ? index++ : -index++);
    }
  }

  #semanticSnapshot(): TabularSnapshot { return this.getSnapshot().tabular; }
  #hasCell(projection: Projection, cell: TabularCellAddress): boolean {
    this.#ensureProjectedRows(projection.rows);
    this.#ensureProjectedColumns(projection, this.#semanticSnapshot());
    return this.#projectedRowsByID.has(cell.rowID) && this.#projectedColumnIndexes.has(cell.columnID);
  }
  #findCell(target: EventTarget | null): GridDOMCellOptions | null {
    let node = target as Node | null;
    while (node !== null) {
      const registration = this.#cellOwners.get(node as HTMLElement);
      if (registration !== undefined && this.#cells.get(registration[0]) === registration) return registration[2];
      if (node === this.#options.root) break;
      node = node.parentNode;
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
    const projection = this.getProjection();
    const current = projection.cursor.current;
    this.#ensureProjectedRows(projection.rows);
    const row = current === null ? undefined : this.#projectedRowsByID.get(current.rowID)?.[0].row;
    if (row?.kind === 'leaf' && this.handleEvent({ type: 'toggle-row-selection', rowID: row.id } as Event)) event.preventDefault();
  }
}
