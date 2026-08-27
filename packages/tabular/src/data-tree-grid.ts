import { unwrap } from '@sectile/core/result';
import {
  createGridProfileController,
  type GridCursorState,
  type GridEditState,
  type GridExpansionState,
  type GridProfileCommand,
  type GridProfileController,
  type GridProfileEvent,
  type GridProfileOptions,
  type GridProfileProjection,
  type GridProfileRow,
  type GridProfileState,
  type GridProfileUpdate,
} from './internal/grid-profile.js';
import type { TabularResult } from './contracts.js';

export type DataTreeGridCursorState = GridCursorState;
export type DataTreeGridEditState = GridEditState;
export type DataTreeGridExpansionState = GridExpansionState;
export type DataTreeGridRow = GridProfileRow;
export type DataTreeGridState = GridProfileState;
export type DataTreeGridProjection = GridProfileProjection;
export type DataTreeGridEvent = GridProfileEvent;
export type DataTreeGridCommand = GridProfileCommand;
export type DataTreeGridUpdate = GridProfileUpdate;
export interface DataTreeGridOptions extends GridProfileOptions {}
export interface DataTreeGridController extends GridProfileController {}

export function createDataTreeGrid(options: DataTreeGridOptions): DataTreeGridController {
  return unwrap(tryCreateDataTreeGrid(options));
}

export function tryCreateDataTreeGrid(options: DataTreeGridOptions): TabularResult<DataTreeGridController> {
  return createGridProfileController('data-tree-grid', options);
}

export function applyDataTreeGridEvent(
  controller: DataTreeGridController,
  event: DataTreeGridEvent,
  expectedRevision?: number,
): TabularResult<DataTreeGridUpdate> {
  return controller.dispatch(event, expectedRevision);
}

export type {
  TabularCellAddress,
  TabularControlledValues,
  TabularViewResponse,
  TabularWireValue,
} from './contracts.js';
