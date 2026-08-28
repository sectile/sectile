import { unwrap } from '@sectile/core/result';
import {
  tryCreateDataTreeGrid as tryCreateSemanticDataTreeGrid,
  type DataTreeGridCommand as SemanticDataTreeGridCommand,
  type DataTreeGridController as SemanticDataTreeGridController,
  type DataTreeGridEvent,
  type DataTreeGridOptions as SemanticDataTreeGridOptions,
  type DataTreeGridProjection,
  type DataTreeGridState,
} from '@sectile/tabular/data-tree-grid';
import type { TabularCellAddress, TabularResult, TabularRowID, TabularViewResponse } from '@sectile/tabular';
import {
  DOMTabularGrid,
  type GridDOMBulkSelectionControlOptions,
  type GridDOMCellOptions,
  type GridDOMColumnHeaderOptions,
  type GridDOMConnectionOptions,
  type GridDOMControlledValues,
  type GridDOMDisclosureOptions,
  type GridDOMEditorOptions,
  type GridDOMFilterControlOptions,
  type GridDOMRowOptions,
  type GridDOMSelectionControlOptions,
  type GridDOMSortTriggerOptions,
  type GridRevealCellCommand,
  type GridRevealRowCommand,
} from './internal/tabular-grid-dom.js';
import type { TabularDOMColumnResizeHandleOptions, TabularDOMColumnSizeState, TabularDOMEditorElement, TabularDOMEditorValueParser } from './internal/tabular-dom.js';
import { validateColumnSizeOptions } from './internal/tabular-dom.js';

export type DataTreeGridDOMCommand = SemanticDataTreeGridCommand | GridRevealCellCommand | GridRevealRowCommand;
export type DataTreeGridDOMCommandHandler = (command: DataTreeGridDOMCommand) => void;
export type DataTreeGridSnapshotChangeHandler = (snapshot: DataTreeGridState) => void;
export type DataTreeGridColumnSizeChangeHandler = (state: DataTreeGridColumnSizeState) => void;
export type DataTreeGridColumnSizeState = TabularDOMColumnSizeState;
export interface DataTreeGridControlledValues extends GridDOMControlledValues {}
export type DataTreeGridColumnHeaderOptions = GridDOMColumnHeaderOptions;
export interface DataTreeGridRowOptions extends GridDOMRowOptions {}
export interface DataTreeGridTreeRowOptions extends GridDOMRowOptions {}
export interface DataTreeGridCellOptions extends GridDOMCellOptions {}
export interface DataTreeGridSortTriggerOptions extends GridDOMSortTriggerOptions {}
export type DataTreeGridFilterControlOptions = GridDOMFilterControlOptions;
export interface DataTreeGridRowSelectionControlOptions extends GridDOMSelectionControlOptions {}
export type DataTreeGridBulkSelectionControlOptions = GridDOMBulkSelectionControlOptions;
export interface DataTreeGridRowDisclosureOptions extends GridDOMDisclosureOptions {}
export type DataTreeGridColumnResizeHandleOptions = TabularDOMColumnResizeHandleOptions;
export type DataTreeGridEditorElement = TabularDOMEditorElement;
export type DataTreeGridEditorValueParser = TabularDOMEditorValueParser;
export interface DataTreeGridEditorOptions extends GridDOMEditorOptions {}

export interface DataTreeGridConnectionOptions extends Omit<GridDOMConnectionOptions<SemanticDataTreeGridController, SemanticDataTreeGridCommand>, 'onCommand' | 'onSnapshotChange'> {
  readonly controller: SemanticDataTreeGridController;
  readonly onCommand?: DataTreeGridDOMCommandHandler;
  readonly onSnapshotChange?: DataTreeGridSnapshotChangeHandler;
}

export interface DataTreeGridOptions extends SemanticDataTreeGridOptions, Omit<DataTreeGridConnectionOptions, 'controller'> {}

export interface DataTreeGridConnection {
  readonly controller: SemanticDataTreeGridController;
  getSnapshot(): DataTreeGridState;
  getProjection(): DataTreeGridProjection;
  getColumnSizeState(): DataTreeGridColumnSizeState;
  syncControlledValues(values: DataTreeGridControlledValues): TabularResult<DataTreeGridState>;
  synchronizeView(response: TabularViewResponse): TabularResult<DataTreeGridState>;
  requestView(): TabularResult<DataTreeGridState>;
  abandonRequest(requestID: number): TabularResult<DataTreeGridState>;
  handleEvent(event: DataTreeGridEvent): boolean;
  setGridAttributes(element?: HTMLElement): void;
  setColumnHeaderAttributes(element: HTMLElement, options: DataTreeGridColumnHeaderOptions): void;
  setRowAttributes(element: HTMLElement, options: DataTreeGridRowOptions): void;
  setTreeRowAttributes(element: HTMLElement, options: DataTreeGridTreeRowOptions): void;
  setCellAttributes(element: HTMLElement, options: DataTreeGridCellOptions): void;
  registerRow(element: HTMLElement, options: DataTreeGridRowOptions): TabularResult<() => void>;
  registerCell(element: HTMLElement, options: DataTreeGridCellOptions): TabularResult<() => void>;
  bindSortTrigger(element: HTMLElement, options: DataTreeGridSortTriggerOptions): () => void;
  bindFilterControl(element: HTMLInputElement | HTMLSelectElement, options: DataTreeGridFilterControlOptions): () => void;
  bindRowSelectionControl(element: HTMLElement, options: DataTreeGridRowSelectionControlOptions): () => void;
  bindBulkSelectionControl(element: HTMLElement, options: DataTreeGridBulkSelectionControlOptions): () => void;
  bindRowDisclosure(element: HTMLElement, options: DataTreeGridRowDisclosureOptions): () => void;
  bindEditor(element: DataTreeGridEditorElement, options: DataTreeGridEditorOptions): () => void;
  bindColumnResizeHandle(element: HTMLElement, options: DataTreeGridColumnResizeHandleOptions): () => void;
  requestRevealCell(cell: TabularCellAddress, expectedProjectionGeneration?: number): boolean;
  requestRevealRow(rowID: TabularRowID, expectedProjectionGeneration?: number): boolean;
  focusCurrent(): void;
  refresh(): void;
  disconnect(): void;
}

export function createDataTreeGrid(options: DataTreeGridOptions): DataTreeGridConnection {
  return unwrap(tryCreateDataTreeGrid(options));
}

export function tryCreateDataTreeGrid(options: DataTreeGridOptions): TabularResult<DataTreeGridConnection> {
  const host = validateColumnSizeOptions(options);
  if (!host.ok) return host;
  const semantic = tryCreateSemanticDataTreeGrid(options);
  if (!semantic.ok) return semantic;
  return { ok: true, value: createDataTreeGridConnection({ ...options, controller: semantic.value }, true) };
}

export function connectDataTreeGrid(options: DataTreeGridConnectionOptions): DataTreeGridConnection {
  return createDataTreeGridConnection(options, false);
}

function createDataTreeGridConnection(options: DataTreeGridConnectionOptions, ownsController: boolean): DataTreeGridConnection {
  const base = new DOMTabularGrid<DataTreeGridEvent, SemanticDataTreeGridCommand, DataTreeGridState, DataTreeGridProjection>(
    options as GridDOMConnectionOptions<SemanticDataTreeGridController, SemanticDataTreeGridCommand>,
    true,
    ownsController,
  );
  return Object.freeze({
    controller: options.controller,
    getSnapshot: () => base.getSnapshot(),
    getProjection: () => base.getProjection(),
    getColumnSizeState: () => base.getColumnSizeState(),
    syncControlledValues: (values: DataTreeGridControlledValues) => base.syncControlledValues(values),
    synchronizeView: (response: TabularViewResponse) => base.synchronizeView(response),
    requestView: () => base.requestView(),
    abandonRequest: (requestID: number) => base.abandonRequest(requestID),
    handleEvent: (event: DataTreeGridEvent) => base.handleEvent(event),
    setGridAttributes: (element?: HTMLElement) => base.setGridAttributes(element),
    setColumnHeaderAttributes: (element: HTMLElement, value: DataTreeGridColumnHeaderOptions) => base.setColumnHeaderAttributes(element, value),
    setRowAttributes: (element: HTMLElement, value: DataTreeGridRowOptions) => base.setRowAttributes(element, value),
    setTreeRowAttributes: (element: HTMLElement, value: DataTreeGridTreeRowOptions) => base.setRowAttributes(element, value),
    setCellAttributes: (element: HTMLElement, value: DataTreeGridCellOptions) => base.setCellAttributes(element, value),
    registerRow: (element: HTMLElement, value: DataTreeGridRowOptions) => base.registerRow(element, value),
    registerCell: (element: HTMLElement, value: DataTreeGridCellOptions) => base.registerCell(element, value),
    bindSortTrigger: (element: HTMLElement, value: DataTreeGridSortTriggerOptions) => base.bindSortTrigger(element, value),
    bindFilterControl: (element: HTMLInputElement | HTMLSelectElement, value: DataTreeGridFilterControlOptions) => base.bindFilterControl(element, value),
    bindRowSelectionControl: (element: HTMLElement, value: DataTreeGridRowSelectionControlOptions) => base.bindRowSelectionControl(element, value),
    bindBulkSelectionControl: (element: HTMLElement, value: DataTreeGridBulkSelectionControlOptions) => base.bindBulkSelectionControl(element, value),
    bindRowDisclosure: (element: HTMLElement, value: DataTreeGridRowDisclosureOptions) => base.bindRowDisclosure(element, value),
    bindEditor: (element: DataTreeGridEditorElement, value: DataTreeGridEditorOptions) => base.bindEditor(element, value),
    bindColumnResizeHandle: (element: HTMLElement, value: DataTreeGridColumnResizeHandleOptions) => base.bindColumnResizeHandle(element, value),
    requestRevealCell: (cell: TabularCellAddress, generation?: number) => base.requestRevealCell(cell, generation),
    requestRevealRow: (rowID: TabularRowID, generation?: number) => base.requestRevealRow(rowID, generation),
    focusCurrent: () => base.focusCurrent(),
    refresh: () => base.refresh(),
    disconnect: () => base.disconnect(),
  });
}

export type {
  DataTreeGridCommand,
  DataTreeGridController,
  DataTreeGridCursorState,
  DataTreeGridEditState,
  DataTreeGridEvent,
  DataTreeGridExpansionState,
  DataTreeGridProjection,
  DataTreeGridRow,
  DataTreeGridState,
  DataTreeGridUpdate,
} from '@sectile/tabular/data-tree-grid';
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
