import { unwrap } from '@sectile/core/result';
import {
  createGridProfileController,
  type GridCursorState,
  type GridEditState,
  type GridProfileCommand,
  type GridProfileControlledValues,
  type GridProfileController,
  type GridProfileEvent,
  type GridProfileOptions,
  type GridProfileProjection,
  type GridProfileState,
  type GridProfileUpdate,
} from './internal/grid-profile.js';
import type { TabularResult } from './contracts.js';

export type DataGridCursorState = GridCursorState;
export type DataGridEditState = GridEditState;
export type DataGridState = GridProfileState;
export type DataGridProjection = GridProfileProjection;
export type DataGridEvent = GridProfileEvent;
export type DataGridCommand = GridProfileCommand;
export type DataGridControlledValues = GridProfileControlledValues;
export type DataGridUpdate = GridProfileUpdate;
export interface DataGridOptions extends GridProfileOptions {}
export interface DataGridController extends GridProfileController {}

export function createDataGrid(options: DataGridOptions): DataGridController {
  return unwrap(tryCreateDataGrid(options));
}

export function tryCreateDataGrid(options: DataGridOptions): TabularResult<DataGridController> {
  return createGridProfileController('data-grid', options);
}

export function applyDataGridEvent(
  controller: DataGridController,
  event: DataGridEvent,
  expectedRevision?: number,
): TabularResult<DataGridUpdate> {
  return controller.dispatch(event, expectedRevision);
}

export type {
  TabularCellAddress,
  TabularControlledValues,
  TabularViewResponse,
  TabularWireValue,
} from './contracts.js';
