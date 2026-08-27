import { type DataTableController, type DataTableEvent, type DataTableOptions, tryCreateDataTable } from '../data-table.js';
import { encodeTabularCellID } from '../model.js';
import { fail, ok } from './foundation.js';
import type {
  TabularCellAddress,
  TabularColumnDefinition,
  TabularColumnID,
  TabularCommand,
  TabularControlledValues,
  TabularGroupID,
  TabularResult,
  TabularRow,
  TabularRowID,
  TabularRowSelection,
  TabularSnapshot,
  TabularViewResponse,
  TabularWireValue,
} from '../contracts.js';

export type GridProfileKind = 'data-grid' | 'data-tree-grid';
export type GridDirection = 'left' | 'right' | 'up' | 'down';
export type GridEditCancelReason = 'escape' | 'focus-transfer' | 'cell-removed' | 'source-reset' | 'application';

export interface GridCursorState {
  readonly current: TabularCellAddress | null;
}

export type GridEditState =
  | { readonly kind: 'navigation' }
  | { readonly kind: 'editing'; readonly cell: TabularCellAddress };

export interface GridProfileState {
  readonly revision: number;
  readonly tabular: TabularSnapshot;
  readonly cursor: GridCursorState;
  readonly edit: GridEditState;
}

export interface GridProfileRow {
  readonly row: TabularRow;
  readonly rowID: TabularRowID | TabularGroupID;
  readonly parentRowID: TabularGroupID | null;
  readonly depth: number;
  readonly cells: readonly TabularCellAddress[];
}

export interface GridExpansionState {
  readonly expandedRowIDs: readonly TabularGroupID[];
}

export interface GridProfileProjection {
  readonly generation: number;
  readonly rows: readonly GridProfileRow[];
  readonly columns: {
    readonly start: readonly TabularColumnID[];
    readonly center: readonly TabularColumnID[];
    readonly end: readonly TabularColumnID[];
  };
  readonly cursor: GridCursorState;
  readonly edit: GridEditState;
  readonly rowSelection: TabularRowSelection;
  readonly expansion: GridExpansionState;
}

export type GridInteractionEvent =
  | { readonly type: 'focus-cell'; readonly cell: TabularCellAddress }
  | { readonly type: 'move-cell'; readonly direction: GridDirection; readonly boundary?: 'stop' | 'wrap-axis' }
  | { readonly type: 'begin-edit'; readonly cell?: TabularCellAddress }
  | { readonly type: 'commit-edit'; readonly value: TabularWireValue }
  | { readonly type: 'cancel-edit'; readonly reason: GridEditCancelReason }
  | { readonly type: 'set-row-expanded'; readonly rowID: TabularGroupID; readonly open: boolean };

export type GridProfileEvent = Exclude<DataTableEvent, { readonly type: 'request-value-commit' }> | GridInteractionEvent;

export type GridEditCommand =
  | { readonly type: 'begin-edit'; readonly cell: TabularCellAddress }
  | { readonly type: 'commit-edit'; readonly cell: TabularCellAddress; readonly value: TabularWireValue }
  | { readonly type: 'cancel-edit'; readonly cell: TabularCellAddress; readonly reason: GridEditCancelReason };

export type GridProfileCommand = TabularCommand | GridEditCommand;

export interface GridProfileUpdate {
  readonly snapshot: GridProfileState;
  readonly commands: readonly GridProfileCommand[];
}

export interface GridProfileOptions extends DataTableOptions {
  readonly isCellDisabled?: (cell: TabularCellAddress) => boolean;
}

export interface GridProfileController {
  getSnapshot(): GridProfileState;
  getProjection(): GridProfileProjection;
  dispatch(event: GridProfileEvent, expectedRevision?: number): TabularResult<GridProfileUpdate>;
  synchronizeView(response: TabularViewResponse): TabularResult<GridProfileState>;
  syncControlledValues(values: TabularControlledValues): TabularResult<GridProfileState>;
  requestView(): TabularResult<GridProfileState>;
  abandonRequest(requestID: number): TabularResult<GridProfileState>;
  subscribeCommands(listener: (command: GridProfileCommand) => void): () => void;
  attachRequestExecutor(listener: (command: Extract<GridProfileCommand, { readonly type: 'request-view' }>) => void): TabularResult<() => void>;
  dispose(): void;
}

export function createGridProfileController(
  kind: GridProfileKind,
  options: GridProfileOptions,
): TabularResult<GridProfileController> {
  const base = tryCreateDataTable(options);
  return base.ok ? ok(new GridProfileRuntime(kind, options, base.value)) : base;
}

class GridProfileRuntime implements GridProfileController {
  readonly #kind: GridProfileKind;
  readonly #options: GridProfileOptions;
  readonly #base: DataTableController;
  readonly #listeners = new Set<(command: GridProfileCommand) => void>();
  readonly #unsubscribeBase: () => void;
  #snapshot: GridProfileState;
  #disposed = false;

  public constructor(kind: GridProfileKind, options: GridProfileOptions, base: DataTableController) {
    this.#kind = kind;
    this.#options = options;
    this.#base = base;
    this.#snapshot = freezeState(0, base.getSnapshot(), null, null);
    this.#unsubscribeBase = base.subscribeCommands((command) => {
      if (command.type !== 'request-value-commit') this.#emit(command);
    });
  }

  public getSnapshot(): GridProfileState { return this.#snapshot; }

  public getProjection(): GridProfileProjection {
    return createProjection(this.#kind, this.#snapshot, this.#base.getProjection());
  }

  public dispatch(event: GridProfileEvent, expectedRevision: number = this.#snapshot.revision): TabularResult<GridProfileUpdate> {
    const ready = this.#ready(expectedRevision);
    if (!ready.ok) return ready;
    if ((event as { readonly type: string }).type === 'request-value-commit') return profileFailure('Grid profiles use explicit edit events.');
    if (event.type === 'set-row-expanded') return this.#setRowExpanded(event.rowID, event.open);
    if (isInteractionEvent(event)) return this.#dispatchInteraction(event);

    const leading: GridProfileCommand[] = [];
    if (event.type === 'replace-source' && this.#snapshot.edit.kind === 'editing') {
      leading.push(freezeCancel(this.#snapshot.edit.cell, 'source-reset'));
      this.#emit(leading[0]!);
    }
    const previous = this.getProjection();
    const interactionBefore = event.type === 'replace-source'
      ? freezeState(this.#snapshot.revision, this.#snapshot.tabular, this.#snapshot.cursor.current, null)
      : this.#snapshot;
    const changed = this.#base.dispatch(event);
    if (!changed.ok) return changed;
    const candidate = freezeState(
      this.#snapshot.revision,
      changed.value.snapshot,
      interactionBefore.cursor.current,
      interactionBefore.edit.kind === 'editing' ? interactionBefore.edit.cell : null,
    );
    const reconciled = reconcileInteractionState(
      this.#kind,
      previous,
      createProjection(this.#kind, candidate, this.#base.getProjection()),
      candidate,
      this.#options,
      event.type === 'replace-source' ? 'source-reset' : 'cell-removed',
    );
    const commands = Object.freeze([...leading, ...withoutNativeCommit(changed.value.commands), ...reconciled.commands]);
    this.#snapshot = freezeState(
      this.#snapshot.revision + 1,
      changed.value.snapshot,
      reconciled.cursor.current,
      reconciled.edit.kind === 'editing' ? reconciled.edit.cell : null,
    );
    this.#emitAll(reconciled.commands);
    return ok(Object.freeze({ snapshot: this.#snapshot, commands }));
  }

  public synchronizeView(response: TabularViewResponse): TabularResult<GridProfileState> {
    const profile = validateProfileRows(this.#kind, response.rows);
    if (!profile.ok) return profile;
    const previous = this.getProjection();
    const synchronized = this.#base.synchronizeView(response);
    if (!synchronized.ok) return synchronized;
    const candidate = freezeState(
      this.#snapshot.revision,
      synchronized.value,
      this.#snapshot.cursor.current,
      this.#snapshot.edit.kind === 'editing' ? this.#snapshot.edit.cell : null,
    );
    const reconciled = reconcileInteractionState(this.#kind, previous, createProjection(this.#kind, candidate, this.#base.getProjection()), candidate, this.#options, 'cell-removed');
    this.#snapshot = freezeState(this.#snapshot.revision + 1, synchronized.value, reconciled.cursor.current, reconciled.edit.kind === 'editing' ? reconciled.edit.cell : null);
    this.#emitAll(reconciled.commands);
    return ok(this.#snapshot);
  }

  public syncControlledValues(values: TabularControlledValues): TabularResult<GridProfileState> {
    const previous = this.getProjection();
    const synchronized = this.#base.syncControlledValues(values);
    if (!synchronized.ok) return synchronized;
    const candidate = freezeState(
      this.#snapshot.revision,
      synchronized.value,
      this.#snapshot.cursor.current,
      this.#snapshot.edit.kind === 'editing' ? this.#snapshot.edit.cell : null,
    );
    const reconciled = reconcileInteractionState(this.#kind, previous, createProjection(this.#kind, candidate, this.#base.getProjection()), candidate, this.#options, 'cell-removed');
    this.#snapshot = freezeState(this.#snapshot.revision + 1, synchronized.value, reconciled.cursor.current, reconciled.edit.kind === 'editing' ? reconciled.edit.cell : null);
    this.#emitAll(reconciled.commands);
    return ok(this.#snapshot);
  }

  public requestView(): TabularResult<GridProfileState> {
    const updated = this.dispatch({ type: 'request-view' });
    return updated.ok ? ok(updated.value.snapshot) : updated;
  }

  public abandonRequest(requestID: number): TabularResult<GridProfileState> {
    if (this.#disposed) return profileFailure('Disposed grid controller cannot abandon requests.');
    const abandoned = this.#base.abandonRequest(requestID);
    if (!abandoned.ok) return abandoned;
    this.#snapshot = freezeState(
      this.#snapshot.revision + 1,
      abandoned.value,
      this.#snapshot.cursor.current,
      this.#snapshot.edit.kind === 'editing' ? this.#snapshot.edit.cell : null,
    );
    return ok(this.#snapshot);
  }

  public subscribeCommands(listener: (command: GridProfileCommand) => void): () => void {
    if (!this.#disposed) this.#listeners.add(listener);
    let active = true;
    return () => { if (active) { active = false; this.#listeners.delete(listener); } };
  }

  public attachRequestExecutor(listener: (command: Extract<GridProfileCommand, { readonly type: 'request-view' }>) => void): TabularResult<() => void> {
    return this.#base.attachRequestExecutor(listener);
  }

  public dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#unsubscribeBase();
    this.#listeners.clear();
    this.#base.dispose();
  }

  #dispatchInteraction(event: Exclude<GridInteractionEvent, { readonly type: 'set-row-expanded' }>): TabularResult<GridProfileUpdate> {
    const projection = this.getProjection();
    const result = reduceInteraction(this.#kind, this.#snapshot, projection, event, this.#options);
    if (!result.ok) return result;
    this.#snapshot = freezeState(
      this.#snapshot.revision + 1,
      this.#snapshot.tabular,
      result.value.cursor.current,
      result.value.edit.kind === 'editing' ? result.value.edit.cell : null,
    );
    this.#emitAll(result.value.commands);
    return ok(Object.freeze({ snapshot: this.#snapshot, commands: result.value.commands }));
  }

  #setRowExpanded(rowID: TabularGroupID, open: boolean): TabularResult<GridProfileUpdate> {
    if (this.#kind !== 'data-tree-grid') return profileFailure('DataGrid does not own hierarchical expansion.');
    const row = this.getProjection().rows.find((entry) => entry.rowID === rowID)?.row;
    if (row?.kind !== 'group') return profileFailure('Tree-grid expansion requires a projected group row.');
    const current = this.#snapshot.tabular.state.expansion;
    const next = open
      ? current.includes(rowID) ? current : Object.freeze([...current, rowID])
      : Object.freeze(current.filter((id) => id !== rowID));
    return this.dispatch({ type: 'set-expansion', expansion: next });
  }

  #ready(expectedRevision: number): TabularResult<true> {
    if (this.#disposed) return profileFailure('Disposed grid controller cannot dispatch.');
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== this.#snapshot.revision) {
      return fail('transition-rejection', 'stale-revision', 'Expected grid profile revision is stale.', { expectedRevision, currentRevision: this.#snapshot.revision });
    }
    if (expectedRevision === Number.MAX_SAFE_INTEGER) return fail('resource-rejection', 'revision-ceiling-reached', 'Grid profile revision is exhausted.');
    return ok(true);
  }

  #emit(command: GridProfileCommand): void {
    for (const listener of this.#listeners) listener(command);
  }

  #emitAll(commands: readonly GridProfileCommand[]): void {
    for (const command of commands) this.#emit(command);
  }
}

function reduceInteraction(
  kind: GridProfileKind,
  state: GridProfileState,
  projection: GridProfileProjection,
  event: Exclude<GridInteractionEvent, { readonly type: 'set-row-expanded' }>,
  options: GridProfileOptions,
): TabularResult<{ readonly cursor: GridCursorState; readonly edit: GridEditState; readonly commands: readonly GridEditCommand[] }> {
  if (event.type === 'focus-cell') {
    const target = findCell(projection, event.cell);
    if (target === null || disabled(options, event.cell)) return invalidEditTarget(event.cell, 'Focus target must be an enabled projected cell.');
    if (state.edit.kind === 'editing' && sameCell(state.edit.cell, event.cell)) {
      return ok(Object.freeze({ cursor: freezeCursor(event.cell), edit: state.edit, commands: Object.freeze([]) }));
    }
    const commands = state.edit.kind === 'editing' && !sameCell(state.edit.cell, event.cell)
      ? Object.freeze([freezeCancel(state.edit.cell, 'focus-transfer')])
      : Object.freeze([]);
    return ok(Object.freeze({ cursor: freezeCursor(event.cell), edit: freezeNavigation(), commands }));
  }
  if (event.type === 'move-cell') {
    if (state.edit.kind === 'editing') return invalidEditTarget(state.edit.cell, 'Navigation is suspended while editing.');
    const target = moveCell(projection, state.cursor.current, event.direction, event.boundary ?? 'stop', options);
    return ok(Object.freeze({ cursor: freezeCursor(target), edit: state.edit, commands: Object.freeze([]) }));
  }
  if (event.type === 'begin-edit') {
    const cell = event.cell ?? state.cursor.current;
    if (cell === null || !editableCell(kind, projection, state.tabular, cell, options)) return invalidEditTarget(cell, 'Editing requires an enabled editable leaf cell.');
    const commands: GridEditCommand[] = [];
    if (state.edit.kind === 'editing' && !sameCell(state.edit.cell, cell)) commands.push(freezeCancel(state.edit.cell, 'focus-transfer'));
    if (state.edit.kind !== 'editing' || !sameCell(state.edit.cell, cell)) commands.push(Object.freeze({ type: 'begin-edit', cell: freezeCell(cell) }));
    return ok(Object.freeze({ cursor: freezeCursor(cell), edit: freezeEditing(cell), commands: Object.freeze(commands) }));
  }
  if (state.edit.kind !== 'editing') return invalidEditTarget(state.cursor.current, 'Edit completion requires an active edit.');
  if (event.type === 'commit-edit') {
    return ok(Object.freeze({
      cursor: state.cursor,
      edit: freezeNavigation(),
      commands: Object.freeze([Object.freeze({ type: 'commit-edit', cell: state.edit.cell, value: event.value })]),
    }));
  }
  return ok(Object.freeze({
    cursor: state.cursor,
    edit: freezeNavigation(),
    commands: Object.freeze([freezeCancel(state.edit.cell, event.reason)]),
  }));
}

function createProjection(
  kind: GridProfileKind,
  state: GridProfileState,
  base: ReturnType<DataTableController['getProjection']>,
): GridProfileProjection {
  const columns = Object.freeze({ start: base.columns.start, center: base.columns.center, end: base.columns.end });
  const orderedColumns = [...columns.start, ...columns.center, ...columns.end];
  const rows = profileRows(kind, base.rows, orderedColumns);
  return Object.freeze({
    generation: base.generation,
    rows,
    columns,
    cursor: state.cursor,
    edit: state.edit,
    rowSelection: base.rowSelection,
    expansion: Object.freeze({ expandedRowIDs: base.expansion }),
  });
}

function profileRows(kind: GridProfileKind, rows: readonly TabularRow[], columns: readonly TabularColumnID[]): readonly GridProfileRow[] {
  const output: GridProfileRow[] = [];
  const ancestors: TabularGroupID[] = [];
  for (const row of rows) {
    let parentRowID: TabularGroupID | null = null;
    let depth = 0;
    if (row.kind === 'group') {
      ancestors.length = row.depth;
      parentRowID = row.parentGroupID;
      depth = row.depth;
      ancestors[row.depth] = row.id;
    } else if (kind === 'data-tree-grid') {
      parentRowID = ancestors.at(-1) ?? null;
      depth = ancestors.length;
    }
    output.push(Object.freeze({
      row,
      rowID: row.id,
      parentRowID,
      depth,
      cells: Object.freeze(columns.map((columnID) => freezeCell({ rowID: row.id, columnID }))),
    }));
  }
  return Object.freeze(output);
}

function validateProfileRows(kind: GridProfileKind, rows: readonly TabularRow[]): TabularResult<true> {
  if (kind === 'data-grid' && rows.some((row) => row.kind === 'group')) return profileFailure('DataGrid accepts only flat leaf-row views.');
  if (kind === 'data-grid') return ok(true);
  const ancestors: TabularGroupID[] = [];
  for (const row of rows) {
    if (row.kind !== 'group') continue;
    const expectedParent = row.depth === 0 ? null : ancestors[row.depth - 1] ?? null;
    if (row.parentGroupID !== expectedParent) return profileFailure('DataTreeGrid group rows must form one ordered visible ancestry.');
    ancestors.length = row.depth;
    ancestors[row.depth] = row.id;
  }
  return ok(true);
}

function reconcileInteractionState(
  kind: GridProfileKind,
  previous: GridProfileProjection,
  next: GridProfileProjection,
  state: GridProfileState,
  options: GridProfileOptions,
  reason: GridEditCancelReason,
): { readonly cursor: GridCursorState; readonly edit: GridEditState; readonly commands: readonly GridEditCommand[] } {
  const current = state.cursor.current;
  const retained = current !== null && findCell(next, current) !== null && !disabled(options, current);
  const fallback = retained ? current : current === null ? null : fallbackCell(previous, next, current, options);
  const editRetained = state.edit.kind === 'editing'
    && fallback !== null
    && sameCell(state.edit.cell, fallback)
    && editableCell(kind, next, state.tabular, fallback, options);
  const commands = state.edit.kind === 'editing' && !editRetained
    ? Object.freeze([freezeCancel(state.edit.cell, reason)])
    : Object.freeze([]);
  return Object.freeze({ cursor: freezeCursor(fallback), edit: editRetained ? state.edit : freezeNavigation(), commands });
}

function fallbackCell(
  previous: GridProfileProjection,
  next: GridProfileProjection,
  current: TabularCellAddress,
  options: GridProfileOptions,
): TabularCellAddress | null {
  const before = flatCells(previous);
  const after = new Map(flatCells(next).filter((cell) => !disabled(options, cell)).map((cell) => [cellKey(cell), cell]));
  const index = before.findIndex((cell) => sameCell(cell, current));
  for (let cursor = index + 1; cursor < before.length; cursor += 1) {
    const candidate = after.get(cellKey(before[cursor]!));
    if (candidate !== undefined) return candidate;
  }
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const candidate = after.get(cellKey(before[cursor]!));
    if (candidate !== undefined) return candidate;
  }
  return after.values().next().value ?? null;
}

function moveCell(
  projection: GridProfileProjection,
  current: TabularCellAddress | null,
  direction: GridDirection,
  boundary: 'stop' | 'wrap-axis',
  options: GridProfileOptions,
): TabularCellAddress | null {
  if (boundary !== 'stop' && boundary !== 'wrap-axis') return current;
  const rows = projection.rows;
  const columns = [...projection.columns.start, ...projection.columns.center, ...projection.columns.end];
  if (rows.length === 0 || columns.length === 0) return null;
  if (current === null) {
    const cells = flatCells(projection).filter((cell) => !disabled(options, cell));
    return direction === 'left' || direction === 'up' ? cells.at(-1) ?? null : cells[0] ?? null;
  }
  let row = rows.findIndex((entry) => entry.rowID === current.rowID);
  let column = columns.indexOf(current.columnID);
  if (row < 0 || column < 0) return fallbackCell(projection, projection, current, options);
  const rowStep = direction === 'down' ? 1 : direction === 'up' ? -1 : 0;
  const columnStep = direction === 'right' ? 1 : direction === 'left' ? -1 : 0;
  const limit = rowStep === 0 ? columns.length : rows.length;
  for (let scanned = 0; scanned < limit - (boundary === 'wrap-axis' ? 0 : 1); scanned += 1) {
    row += rowStep;
    column += columnStep;
    if (row < 0 || row >= rows.length || column < 0 || column >= columns.length) {
      if (boundary === 'stop') return current;
      row = (row + rows.length) % rows.length;
      column = (column + columns.length) % columns.length;
    }
    const candidate = freezeCell({ rowID: rows[row]!.rowID, columnID: columns[column]! });
    if (!disabled(options, candidate)) return candidate;
  }
  return current;
}

function editableCell(
  kind: GridProfileKind,
  projection: GridProfileProjection,
  tabular: TabularSnapshot,
  cell: TabularCellAddress,
  options: GridProfileOptions,
): boolean {
  const row = projection.rows.find((entry) => entry.rowID === cell.rowID)?.row;
  if (row === undefined || row.kind !== 'leaf' || disabled(options, cell)) return false;
  const view = tabular.state.acceptedViewState.kind === 'none' ? null : tabular.state.acceptedViewState.view;
  const column: TabularColumnDefinition | undefined = view?.columnSchema.columns.find(({ id }) => id === cell.columnID);
  return column?.capabilities?.includes('edit') === true && (kind === 'data-grid' || row.kind === 'leaf');
}

function flatCells(projection: GridProfileProjection): readonly TabularCellAddress[] {
  return Object.freeze(projection.rows.flatMap((row) => row.cells));
}

function findCell(projection: GridProfileProjection, cell: TabularCellAddress): TabularCellAddress | null {
  return flatCells(projection).find((candidate) => sameCell(candidate, cell)) ?? null;
}

function withoutNativeCommit(commands: readonly { readonly type: string }[]): readonly GridProfileCommand[] {
  return Object.freeze(commands.filter((command) => command.type !== 'request-value-commit') as GridProfileCommand[]);
}

function isInteractionEvent(event: GridProfileEvent): event is Exclude<GridInteractionEvent, { readonly type: 'set-row-expanded' }> {
  return event.type === 'focus-cell' || event.type === 'move-cell' || event.type === 'begin-edit' || event.type === 'commit-edit' || event.type === 'cancel-edit';
}

function freezeState(
  revision: number,
  tabular: TabularSnapshot,
  current: TabularCellAddress | null,
  editing: TabularCellAddress | null,
): GridProfileState {
  return Object.freeze({ revision, tabular, cursor: freezeCursor(current), edit: editing === null ? freezeNavigation() : freezeEditing(editing) });
}

function freezeCursor(cell: TabularCellAddress | null): GridCursorState {
  return Object.freeze({ current: cell === null ? null : freezeCell(cell) });
}

function freezeNavigation(): GridEditState { return Object.freeze({ kind: 'navigation' }); }
function freezeEditing(cell: TabularCellAddress): GridEditState { return Object.freeze({ kind: 'editing', cell: freezeCell(cell) }); }
function freezeCell(cell: TabularCellAddress): TabularCellAddress { return Object.freeze({ rowID: cell.rowID, columnID: cell.columnID }); }
function freezeCancel(cell: TabularCellAddress, reason: GridEditCancelReason): GridEditCommand { return Object.freeze({ type: 'cancel-edit', cell: freezeCell(cell), reason }); }
function sameCell(left: TabularCellAddress, right: TabularCellAddress): boolean { return left.rowID === right.rowID && left.columnID === right.columnID; }
function cellKey(cell: TabularCellAddress): string { return encodeTabularCellID(cell); }
function disabled(options: GridProfileOptions, cell: TabularCellAddress): boolean { return options.isCellDisabled?.(cell) === true; }

function invalidEditTarget<T>(cell: TabularCellAddress | null, message: string): TabularResult<T> {
  return fail('transition-rejection', 'invalid-edit-target', message, { cell });
}

function profileFailure<T>(message: string): TabularResult<T> {
  return fail('transition-rejection', 'profile-view-mismatch', message);
}
