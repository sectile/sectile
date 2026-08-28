import { unwrap } from '@sectile/core/result';
import {
  tryCreateDataTable as tryCreateSemanticDataTable,
  type DataTableCommand as SemanticDataTableCommand,
  type DataTableController as SemanticDataTableController,
  type DataTableEvent,
  type DataTableOptions as SemanticDataTableOptions,
  type DataTableProjection,
  type DataTableUpdate,
} from '@sectile/tabular/data-table';
import type {
  TabularCellAddress,
  TabularColumnID,
  TabularControlledValues,
  TabularGroupID,
  TabularHeaderNodeID,
  TabularQuery,
  TabularResult,
  TabularRowID,
  TabularSnapshot,
  TabularViewResponse,
} from '@sectile/tabular';
import {
  BindingScope,
  ColumnSizeStore,
  allMatchingSelectionState,
  bindColumnResizeHandle,
  bindEvent,
  clearAttributes,
  columnIndex,
  domFailure,
  findProjectedRow,
  headerElementID,
  headerMetrics,
  leafHeaderID,
  ok,
  queryWithFilter,
  queryWithSort,
  readEditorValue,
  rowSelected,
  setEditorAttributes,
  setColumnInlineSize,
  setBulkSelectionControlAttributes,
  setRowSelectionControlAttributes,
  validateColumnSizeOptions,
  validateRegistrationGeneration,
  type TabularDOMColumnResizeHandleOptions,
  type TabularDOMColumnSizeOptions,
  type TabularDOMColumnSizeState,
  type TabularDOMEditorElement,
  type TabularDOMEditorOptions,
  type TabularDOMEditorValueParser,
  type TabularDOMRegistrationOptions,
} from './internal/tabular-dom.js';

export type DataTableDOMCommand = SemanticDataTableCommand;
export type DataTableDOMCommandHandler = (command: DataTableDOMCommand) => void;
export type DataTableSnapshotChangeHandler = (snapshot: TabularSnapshot) => void;
export type DataTableColumnSizeChangeHandler = (state: DataTableColumnSizeState) => void;
export type DataTableColumnSizeState = TabularDOMColumnSizeState;

export interface DataTableControlledValues extends TabularControlledValues {
  readonly columnSizes?: Readonly<Record<TabularColumnID, number>>;
}

export interface DataTableConnectionOptions extends TabularDOMColumnSizeOptions {
  readonly controller: SemanticDataTableController;
  readonly table: HTMLTableElement;
  readonly onCommand?: DataTableDOMCommandHandler;
  readonly onSnapshotChange?: DataTableSnapshotChangeHandler;
}

export interface DataTableOptions extends SemanticDataTableOptions, Omit<DataTableConnectionOptions, 'controller'> {}

export interface DataTableHeaderCellOptions {
  readonly headerNodeID: TabularHeaderNodeID;
}

export interface DataTableRowOptions extends TabularDOMRegistrationOptions {
  readonly rowID: TabularRowID | TabularGroupID;
}

export interface DataTableCellOptions extends TabularDOMRegistrationOptions {
  readonly cell: TabularCellAddress;
}

export interface DataTableSortTriggerOptions {
  readonly columnID: TabularColumnID;
  readonly comparator: string;
}

export type DataTableFilterControlOptions =
  | { readonly scope: 'global'; readonly id: string; readonly predicate: string }
  | { readonly scope: 'column'; readonly id: string; readonly predicate: string; readonly columnID: TabularColumnID };

export interface DataTableSelectionControlOptions {
  readonly rowID: TabularRowID;
  readonly name: string;
  readonly value: string;
  readonly form?: string;
  readonly disabled?: boolean;
}

export type DataTableBulkSelectionControlOptions =
  | { readonly target: { readonly kind: 'all-matching' }; readonly disabled?: boolean }
  | { readonly target: { readonly kind: 'group-leaves'; readonly groupID: TabularGroupID }; readonly disabled?: boolean };

export interface DataTableDisclosureOptions {
  readonly rowID: TabularGroupID;
  readonly disabled?: boolean;
}

export type DataTableColumnResizeHandleOptions = TabularDOMColumnResizeHandleOptions;
export type DataTableEditorElement = TabularDOMEditorElement;
export type DataTableEditorValueParser = TabularDOMEditorValueParser;
export interface DataTableEditorOptions extends TabularDOMEditorOptions {
  readonly commitOnChange?: boolean;
}

export interface DataTableConnection {
  readonly controller: SemanticDataTableController;
  getSnapshot(): TabularSnapshot;
  getProjection(): DataTableProjection;
  getColumnSizeState(): DataTableColumnSizeState;
  syncControlledValues(values: DataTableControlledValues): TabularResult<TabularSnapshot>;
  synchronizeView(response: TabularViewResponse): TabularResult<TabularSnapshot>;
  requestView(): TabularResult<TabularSnapshot>;
  abandonRequest(requestID: number): TabularResult<TabularSnapshot>;
  handleEvent(event: DataTableEvent): boolean;
  setTableAttributes(element?: HTMLTableElement): void;
  setHeaderCellAttributes(element: HTMLTableCellElement, options: DataTableHeaderCellOptions): void;
  setRowAttributes(element: HTMLTableRowElement, options: DataTableRowOptions): void;
  setCellAttributes(element: HTMLTableCellElement, options: DataTableCellOptions): void;
  registerRow(element: HTMLTableRowElement, options: DataTableRowOptions): TabularResult<() => void>;
  registerCell(element: HTMLTableCellElement, options: DataTableCellOptions): TabularResult<() => void>;
  bindSortTrigger(element: HTMLElement, options: DataTableSortTriggerOptions): () => void;
  bindFilterControl(element: HTMLInputElement | HTMLSelectElement, options: DataTableFilterControlOptions): () => void;
  bindSelectionControl(element: HTMLElement, options: DataTableSelectionControlOptions): () => void;
  bindBulkSelectionControl(element: HTMLElement, options: DataTableBulkSelectionControlOptions): () => void;
  bindDisclosure(element: HTMLElement, options: DataTableDisclosureOptions): () => void;
  bindEditor(element: DataTableEditorElement, options: DataTableEditorOptions): () => void;
  bindColumnResizeHandle(element: HTMLElement, options: DataTableColumnResizeHandleOptions): () => void;
  refresh(): void;
  disconnect(): void;
}

export function createDataTable(options: DataTableOptions): DataTableConnection {
  return unwrap(tryCreateDataTable(options));
}

export function tryCreateDataTable(options: DataTableOptions): TabularResult<DataTableConnection> {
  const host = validateColumnSizeOptions(options);
  if (!host.ok) return host;
  const semantic = tryCreateSemanticDataTable(options);
  if (!semantic.ok) return semantic;
  return ok(new DOMDataTable({ ...options, controller: semantic.value }, true));
}

export function connectDataTable(options: DataTableConnectionOptions): DataTableConnection {
  return new DOMDataTable(options, false);
}

class DOMDataTable implements DataTableConnection {
  public readonly controller: SemanticDataTableController;
  readonly #options: DataTableConnectionOptions;
  readonly #ownsController: boolean;
  readonly #scope = new BindingScope();
  readonly #columnSizes: ColumnSizeStore;
  readonly #rows = new Map<string, { readonly element: HTMLTableRowElement; readonly options: DataTableRowOptions }>();
  readonly #cells = new Map<string, { readonly element: HTMLTableCellElement; readonly options: DataTableCellOptions }>();
  readonly #refreshers = new Set<() => void>();
  readonly #unsubscribeCommands: () => void;

  public constructor(options: DataTableConnectionOptions, ownsController: boolean) {
    this.#options = options;
    this.controller = options.controller;
    this.#ownsController = ownsController;
    this.#columnSizes = new ColumnSizeStore(options);
    this.#unsubscribeCommands = this.controller.subscribeCommands((command) => options.onCommand?.(command));
    this.setTableAttributes();
  }

  public getSnapshot(): TabularSnapshot { return this.controller.getSnapshot(); }
  public getProjection(): DataTableProjection { return this.controller.getProjection(); }
  public getColumnSizeState(): DataTableColumnSizeState { return this.#columnSizes.getState(); }

  public syncControlledValues(values: DataTableControlledValues): TabularResult<TabularSnapshot> {
    const sizes = this.#columnSizes.synchronize(values.columnSizes);
    if (!sizes.ok) return sizes;
    const { columnSizes: _columnSizes, ...semanticValues } = values;
    const result = this.controller.syncControlledValues(semanticValues);
    if (result.ok) this.#updated();
    return result;
  }

  public synchronizeView(response: TabularViewResponse): TabularResult<TabularSnapshot> {
    const result = this.controller.synchronizeView(response);
    if (result.ok) this.#updated();
    return result;
  }

  public requestView(): TabularResult<TabularSnapshot> {
    const result = this.controller.requestView();
    if (result.ok) this.#updated();
    return result;
  }

  public abandonRequest(requestID: number): TabularResult<TabularSnapshot> {
    const result = this.controller.abandonRequest(requestID);
    if (result.ok) this.#updated();
    return result;
  }

  public handleEvent(event: DataTableEvent): boolean {
    if (!this.#scope.active) return false;
    const result = this.controller.dispatch(event);
    if (result.ok) this.#updated();
    return result.ok;
  }

  public setTableAttributes(element: HTMLTableElement = this.#options.table): void {
    element.setAttribute('data-scope', 'data-table');
    element.setAttribute('data-part', 'root');
    element.removeAttribute('role');
  }

  public setHeaderCellAttributes(element: HTMLTableCellElement, options: DataTableHeaderCellOptions): void {
    const metric = headerMetrics(this.getSnapshot()).find((entry) => entry.headerNodeID === options.headerNodeID);
    element.setAttribute('data-part', 'column-header');
    element.setAttribute('data-header-node-id', options.headerNodeID);
    element.id = headerElementID(options.headerNodeID);
    if (metric === undefined) {
      element.colSpan = 1;
      element.rowSpan = 1;
      element.removeAttribute('aria-sort');
      return;
    }
    element.colSpan = metric.colSpan;
    element.rowSpan = metric.rowSpan;
    if (metric.columnID === null) {
      element.scope = 'colgroup';
      element.removeAttribute('aria-sort');
      return;
    }
    element.scope = 'col';
    const sort = this.getSnapshot().state.query.sort.find((entry) => entry.columnID === metric.columnID);
    if (sort === undefined) element.removeAttribute('aria-sort');
    else element.setAttribute('aria-sort', sort.direction);
    setColumnInlineSize(element, metric.columnID, this.#columnSizes.getState());
  }

  public setRowAttributes(element: HTMLTableRowElement, options: DataTableRowOptions): void {
    const row = findProjectedRow(this.getSnapshot(), options.rowID);
    element.setAttribute('data-part', 'row');
    element.setAttribute('data-row-id', options.rowID);
    if (row?.kind === 'group') {
      element.setAttribute('aria-level', String(row.depth + 1));
      element.setAttribute('aria-expanded', String(row.expanded));
    } else clearAttributes(element, ['aria-level', 'aria-expanded']);
  }

  public setCellAttributes(element: HTMLTableCellElement, options: DataTableCellOptions): void {
    element.setAttribute('data-part', 'cell');
    element.setAttribute('data-row-id', options.cell.rowID);
    element.setAttribute('data-column-id', options.cell.columnID);
    const headerID = leafHeaderID(this.getSnapshot(), options.cell.columnID);
    if (headerID === null) element.removeAttribute('headers');
    else element.setAttribute('headers', headerID);
    setColumnInlineSize(element, options.cell.columnID, this.#columnSizes.getState());
  }

  public registerRow(element: HTMLTableRowElement, options: DataTableRowOptions): TabularResult<() => void> {
    const valid = validateRegistrationGeneration(this.getProjection().generation, options);
    if (!valid.ok) return valid;
    if (findProjectedRow(this.getSnapshot(), options.rowID) === undefined) return domFailure('profile-view-mismatch', 'Registered DataTable row is not projected.', { rowID: options.rowID });
    const current = this.#rows.get(options.rowID);
    if (current !== undefined && current.element !== element) return domFailure('profile-view-mismatch', 'DataTable row is already registered.', { rowID: options.rowID });
    this.#rows.set(options.rowID, { element, options });
    this.setRowAttributes(element, options);
    return ok(this.#scope.retain(() => { if (this.#rows.get(options.rowID)?.element === element) this.#rows.delete(options.rowID); }));
  }

  public registerCell(element: HTMLTableCellElement, options: DataTableCellOptions): TabularResult<() => void> {
    const valid = validateRegistrationGeneration(this.getProjection().generation, options);
    if (!valid.ok) return valid;
    if (!this.#hasCell(options.cell)) return domFailure('profile-view-mismatch', 'Registered DataTable cell is not projected.', { cell: options.cell });
    const key = JSON.stringify([options.cell.rowID, options.cell.columnID]);
    const current = this.#cells.get(key);
    if (current !== undefined && current.element !== element) return domFailure('profile-view-mismatch', 'DataTable cell is already registered.', { cell: options.cell });
    this.#cells.set(key, { element, options });
    this.setCellAttributes(element, options);
    return ok(this.#scope.retain(() => { if (this.#cells.get(key)?.element === element) this.#cells.delete(key); }));
  }

  public bindSortTrigger(element: HTMLElement, options: DataTableSortTriggerOptions): () => void {
    element.setAttribute('data-part', 'sort-trigger');
    element.setAttribute('data-column-id', options.columnID);
    const update = (): void => {
      const current = this.getSnapshot().state.query.sort.find((entry) => entry.columnID === options.columnID)?.direction;
      element.setAttribute('aria-pressed', String(current !== undefined));
    };
    const dispose = bindEvent(this.#scope, element, 'click', () => {
      const query = this.getSnapshot().state.query;
      const current = query.sort.find((entry) => entry.columnID === options.columnID)?.direction;
      const direction = current === undefined ? 'ascending' : current === 'ascending' ? 'descending' : null;
      this.handleEvent({ type: 'set-query', query: queryWithSort(query, options.columnID, options.comparator, direction) });
    });
    this.#refreshers.add(update);
    update();
    return this.#scope.retain(() => { dispose(); this.#refreshers.delete(update); });
  }

  public bindFilterControl(element: HTMLInputElement | HTMLSelectElement, options: DataTableFilterControlOptions): () => void {
    element.setAttribute('data-part', 'filter-control');
    if (options.scope === 'column') element.setAttribute('data-column-id', options.columnID);
    const listener = (): void => {
      const query = this.getSnapshot().state.query;
      this.handleEvent({
        type: 'set-query',
        query: queryWithFilter(query, options.id, options.scope, options.predicate, element.value, options.scope === 'column' ? options.columnID : undefined),
      });
    };
    return bindEvent(this.#scope, element, 'input', listener);
  }

  public bindSelectionControl(element: HTMLElement, options: DataTableSelectionControlOptions): () => void {
    const input = element.tagName === 'INPUT' ? element as HTMLInputElement : null;
    if (input !== null) {
      input.type = 'checkbox';
      input.value = options.value;
      if (options.form === undefined) input.removeAttribute('form');
      else input.setAttribute('form', options.form);
    }
    element.setAttribute('data-part', 'selection-control');
    element.setAttribute('data-row-id', options.rowID);
    const update = (): void => {
      const selection = this.getSnapshot().state.rowSelection;
      setRowSelectionControlAttributes(element, rowSelected(selection, options.rowID), options.disabled === true);
      if (input !== null) {
        if (selection.kind === 'explicit-rows') input.name = options.name;
        else input.removeAttribute('name');
      }
    };
    const dispose = bindEvent(this.#scope, element, input === null ? 'click' : 'change', () => {
      if (options.disabled !== true) this.handleEvent({ type: 'toggle-row-selection', rowID: options.rowID });
    });
    this.#refreshers.add(update);
    update();
    return this.#scope.retain(() => { dispose(); this.#refreshers.delete(update); });
  }

  public bindBulkSelectionControl(element: HTMLElement, options: DataTableBulkSelectionControlOptions): () => void {
    element.setAttribute('data-part', 'bulk-selection-control');
    const update = (): void => {
      if (options.target.kind !== 'all-matching') {
        element.setAttribute('aria-disabled', String(options.disabled === true));
        return;
      }
      setBulkSelectionControlAttributes(element, allMatchingSelectionState(this.getSnapshot()), options.disabled === true);
    };
    const dispose = bindEvent(this.#scope, element, 'click', () => {
      if (options.disabled === true) return;
      if (options.target.kind === 'all-matching') {
        const event: DataTableEvent = allMatchingSelectionState(this.getSnapshot()) === 'checked'
          ? { type: 'set-row-selection', selection: { kind: 'explicit-rows', rowIDs: [] } }
          : { type: 'select-all-matching' };
        this.handleEvent(event);
      }
      else this.handleEvent({ type: 'request-group-leaf-selection', groupID: options.target.groupID });
    });
    this.#refreshers.add(update);
    update();
    return this.#scope.retain(() => { dispose(); this.#refreshers.delete(update); });
  }

  public bindDisclosure(element: HTMLElement, options: DataTableDisclosureOptions): () => void {
    element.setAttribute('data-part', 'disclosure');
    element.setAttribute('data-row-id', options.rowID);
    const update = (): void => {
      const open = this.getSnapshot().state.expansion.includes(options.rowID);
      element.setAttribute('aria-expanded', String(open));
      element.setAttribute('aria-disabled', String(options.disabled === true));
    };
    const dispose = bindEvent(this.#scope, element, 'click', () => {
      if (options.disabled === true) return;
      const expansion = this.getSnapshot().state.expansion;
      const next = expansion.includes(options.rowID) ? expansion.filter((id) => id !== options.rowID) : [...expansion, options.rowID];
      this.handleEvent({ type: 'set-expansion', expansion: next });
    });
    this.#refreshers.add(update);
    update();
    return this.#scope.retain(() => { dispose(); this.#refreshers.delete(update); });
  }

  public bindEditor(element: DataTableEditorElement, options: DataTableEditorOptions): () => void {
    setEditorAttributes(element, options, 'editor');
    let composing = false;
    const commit = (): boolean => {
      if (composing || !this.#scope.active || options.disabled === true || options.readOnly === true) return false;
      const value = readEditorValue(element, options.parseValue);
      element.setAttribute('aria-invalid', String(!value.ok));
      return value.ok && this.handleEvent({ type: 'request-value-commit', cell: options.cell, value: value.value });
    };
    const keydown = (event: KeyboardEvent): void => {
      if (event.isComposing || composing || event.key !== 'Enter' || (element.tagName === 'TEXTAREA' && event.shiftKey)) return;
      if (commit()) event.preventDefault();
    };
    const input = (): void => element.setAttribute('aria-invalid', 'false');
    const change = (): void => { if (options.commitOnChange !== false) commit(); };
    const blur = (): void => { if (options.commitOnBlur === true) commit(); };
    const compositionStart = (): void => { composing = true; };
    const compositionEnd = (): void => { composing = false; };
    const disposers = [
      bindEvent(this.#scope, element, 'keydown', keydown),
      bindEvent(this.#scope, element, 'input', input),
      bindEvent(this.#scope, element, 'change', change),
      bindEvent(this.#scope, element, 'blur', blur),
      bindEvent(this.#scope, element, 'compositionstart', compositionStart),
      bindEvent(this.#scope, element, 'compositionend', compositionEnd),
    ];
    return this.#scope.retain(() => { for (const dispose of disposers) dispose(); });
  }

  public bindColumnResizeHandle(element: HTMLElement, options: DataTableColumnResizeHandleOptions): () => void {
    return bindColumnResizeHandle(this.#scope, element, this.#columnSizes, options, () => this.#updated());
  }

  public refresh(): void {
    if (!this.#scope.active) return;
    this.setTableAttributes();
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
    this.#refreshers.clear();
    clearAttributes(this.#options.table, ['data-scope', 'data-part']);
    if (this.#ownsController) this.controller.dispose();
  }

  #updated(): void {
    this.refresh();
    this.#options.onSnapshotChange?.(this.getSnapshot());
  }

  #hasCell(cell: TabularCellAddress): boolean {
    return findProjectedRow(this.getSnapshot(), cell.rowID) !== undefined && columnIndex(this.getSnapshot(), cell.columnID) > 0;
  }
}

export type {
  DataTableController,
  DataTableEvent,
  DataTableProjection,
  DataTableUpdate,
} from '@sectile/tabular/data-table';
export type {
  TabularCellAddress,
  TabularColumnDefinition,
  TabularColumnID,
  TabularError,
  TabularHeaderNode,
  TabularQuery,
  TabularRow,
  TabularRowSelection,
  TabularViewResponse,
} from '@sectile/tabular';
