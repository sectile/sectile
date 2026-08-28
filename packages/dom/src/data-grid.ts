import { unwrap } from '@sectile/core/result';
import {
  tryCreateDataGrid as tryCreateSemanticDataGrid,
  type DataGridCommand as SemanticDataGridCommand,
  type DataGridController as SemanticDataGridController,
  type DataGridEvent,
  type DataGridOptions as SemanticDataGridOptions,
  type DataGridProjection,
  type DataGridState,
} from '@sectile/tabular/data-grid';
import type { TabularCellAddress, TabularResult, TabularViewResponse } from '@sectile/tabular';
import {
  DOMTabularGrid,
  type GridDOMBulkSelectionControlOptions,
  type GridDOMCellOptions,
  type GridDOMColumnHeaderOptions,
  type GridDOMConnectionOptions,
  type GridDOMControlledValues,
  type GridDOMEditorOptions,
  type GridDOMFilterControlOptions,
  type GridDOMRowOptions,
  type GridDOMSelectionControlOptions,
  type GridDOMSortTriggerOptions,
  type GridRevealCellCommand,
} from './internal/tabular-grid-dom.js';
import type { TabularDOMColumnResizeHandleOptions, TabularDOMColumnSizeState, TabularDOMEditorElement, TabularDOMEditorValueParser } from './internal/tabular-dom.js';
import { validateColumnSizeOptions } from './internal/tabular-dom.js';

export type DataGridDOMCommand = SemanticDataGridCommand | GridRevealCellCommand;
export type DataGridDOMCommandHandler = (command: DataGridDOMCommand) => void;
export type DataGridSnapshotChangeHandler = (snapshot: DataGridState) => void;
export type DataGridColumnSizeChangeHandler = (state: DataGridColumnSizeState) => void;
export type DataGridColumnSizeState = TabularDOMColumnSizeState;
export interface DataGridControlledValues extends GridDOMControlledValues {}
export interface DataGridColumnHeaderOptions extends GridDOMColumnHeaderOptions {}
export interface DataGridRowOptions extends GridDOMRowOptions {}
export interface DataGridCellOptions extends GridDOMCellOptions {}
export interface DataGridSortTriggerOptions extends GridDOMSortTriggerOptions {}
export type DataGridFilterControlOptions = GridDOMFilterControlOptions;
export interface DataGridRowSelectionControlOptions extends GridDOMSelectionControlOptions {}
export type DataGridBulkSelectionControlOptions = GridDOMBulkSelectionControlOptions;
export type DataGridColumnResizeHandleOptions = TabularDOMColumnResizeHandleOptions;
export type DataGridEditorElement = TabularDOMEditorElement;
export type DataGridEditorValueParser = TabularDOMEditorValueParser;
export interface DataGridEditorOptions extends GridDOMEditorOptions {}

export interface DataGridConnectionOptions extends Omit<GridDOMConnectionOptions<SemanticDataGridController, SemanticDataGridCommand>, 'onCommand' | 'onSnapshotChange'> {
  readonly controller: SemanticDataGridController;
  readonly onCommand?: DataGridDOMCommandHandler;
  readonly onSnapshotChange?: DataGridSnapshotChangeHandler;
}

export interface DataGridOptions extends SemanticDataGridOptions, Omit<DataGridConnectionOptions, 'controller'> {}

export interface DataGridConnection {
  readonly controller: SemanticDataGridController;
  getSnapshot(): DataGridState;
  getProjection(): DataGridProjection;
  getColumnSizeState(): DataGridColumnSizeState;
  syncControlledValues(values: DataGridControlledValues): TabularResult<DataGridState>;
  synchronizeView(response: TabularViewResponse): TabularResult<DataGridState>;
  requestView(): TabularResult<DataGridState>;
  abandonRequest(requestID: number): TabularResult<DataGridState>;
  handleEvent(event: DataGridEvent): boolean;
  setGridAttributes(element?: HTMLElement): void;
  setColumnHeaderAttributes(element: HTMLElement, options: DataGridColumnHeaderOptions): void;
  setRowAttributes(element: HTMLElement, options: DataGridRowOptions): void;
  setCellAttributes(element: HTMLElement, options: DataGridCellOptions): void;
  registerRow(element: HTMLElement, options: DataGridRowOptions): TabularResult<() => void>;
  registerCell(element: HTMLElement, options: DataGridCellOptions): TabularResult<() => void>;
  bindSortTrigger(element: HTMLElement, options: DataGridSortTriggerOptions): () => void;
  bindFilterControl(element: HTMLInputElement | HTMLSelectElement, options: DataGridFilterControlOptions): () => void;
  bindRowSelectionControl(element: HTMLElement, options: DataGridRowSelectionControlOptions): () => void;
  bindBulkSelectionControl(element: HTMLElement, options: DataGridBulkSelectionControlOptions): () => void;
  bindEditor(element: DataGridEditorElement, options: DataGridEditorOptions): () => void;
  bindColumnResizeHandle(element: HTMLElement, options: DataGridColumnResizeHandleOptions): () => void;
  requestRevealCell(cell: TabularCellAddress, expectedProjectionGeneration?: number): boolean;
  focusCurrent(): void;
  refresh(): void;
  disconnect(): void;
}

export function createDataGrid(options: DataGridOptions): DataGridConnection {
  return unwrap(tryCreateDataGrid(options));
}

export function tryCreateDataGrid(options: DataGridOptions): TabularResult<DataGridConnection> {
  const host = validateColumnSizeOptions(options);
  if (!host.ok) return host;
  const semantic = tryCreateSemanticDataGrid(options);
  if (!semantic.ok) return semantic;
  return { ok: true, value: createDataGridConnection({ ...options, controller: semantic.value }, true) };
}

export function connectDataGrid(options: DataGridConnectionOptions): DataGridConnection {
  return createDataGridConnection(options, false);
}

function createDataGridConnection(options: DataGridConnectionOptions, ownsController: boolean): DataGridConnection {
  const base = new DOMTabularGrid<DataGridEvent, SemanticDataGridCommand, DataGridState, DataGridProjection>(
    options as GridDOMConnectionOptions<SemanticDataGridController, SemanticDataGridCommand>,
    false,
    ownsController,
  );
  return Object.freeze({
    controller: options.controller,
    getSnapshot: () => base.getSnapshot(),
    getProjection: () => base.getProjection(),
    getColumnSizeState: () => base.getColumnSizeState(),
    syncControlledValues: (values: DataGridControlledValues) => base.syncControlledValues(values),
    synchronizeView: (response: TabularViewResponse) => base.synchronizeView(response),
    requestView: () => base.requestView(),
    abandonRequest: (requestID: number) => base.abandonRequest(requestID),
    handleEvent: (event: DataGridEvent) => base.handleEvent(event),
    setGridAttributes: (element?: HTMLElement) => base.setGridAttributes(element),
    setColumnHeaderAttributes: (element: HTMLElement, value: DataGridColumnHeaderOptions) => base.setColumnHeaderAttributes(element, value),
    setRowAttributes: (element: HTMLElement, value: DataGridRowOptions) => base.setRowAttributes(element, value),
    setCellAttributes: (element: HTMLElement, value: DataGridCellOptions) => base.setCellAttributes(element, value),
    registerRow: (element: HTMLElement, value: DataGridRowOptions) => base.registerRow(element, value),
    registerCell: (element: HTMLElement, value: DataGridCellOptions) => base.registerCell(element, value),
    bindSortTrigger: (element: HTMLElement, value: DataGridSortTriggerOptions) => base.bindSortTrigger(element, value),
    bindFilterControl: (element: HTMLInputElement | HTMLSelectElement, value: DataGridFilterControlOptions) => base.bindFilterControl(element, value),
    bindRowSelectionControl: (element: HTMLElement, value: DataGridRowSelectionControlOptions) => base.bindRowSelectionControl(element, value),
    bindBulkSelectionControl: (element: HTMLElement, value: DataGridBulkSelectionControlOptions) => base.bindBulkSelectionControl(element, value),
    bindEditor: (element: DataGridEditorElement, value: DataGridEditorOptions) => base.bindEditor(element, value),
    bindColumnResizeHandle: (element: HTMLElement, value: DataGridColumnResizeHandleOptions) => base.bindColumnResizeHandle(element, value),
    requestRevealCell: (cell: TabularCellAddress, generation?: number) => base.requestRevealCell(cell, generation),
    focusCurrent: () => base.focusCurrent(),
    refresh: () => base.refresh(),
    disconnect: () => base.disconnect(),
  });
}

export type {
  DataGridCommand,
  DataGridController,
  DataGridCursorState,
  DataGridEditState,
  DataGridEvent,
  DataGridProjection,
  DataGridState,
  DataGridUpdate,
} from '@sectile/tabular/data-grid';
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
