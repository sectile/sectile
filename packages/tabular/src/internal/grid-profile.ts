import { type DataTableController, type DataTableEvent, type DataTableOptions, tryCreateDataTable } from '../data-table.js';
import { fail, ok } from './foundation.js';
import type {
  TabularCellAddress,
  TabularColumnSchema,
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

interface GridProfileDomain {
  readonly generation: number;
  readonly rows: readonly GridProfileRow[];
  readonly columns: GridProfileProjection['columns'];
  readonly orderedColumns: readonly TabularColumnID[];
  readonly cells: readonly TabularCellAddress[];
  readonly cellsByRow: ReadonlyMap<TabularRowID | TabularGroupID, ReadonlyMap<TabularColumnID, TabularCellAddress>>;
  readonly rowByID: ReadonlyMap<TabularRowID | TabularGroupID, GridProfileRow>;
  readonly rowIndexByID: ReadonlyMap<TabularRowID | TabularGroupID, number>;
  readonly columnIndexByID: ReadonlyMap<TabularColumnID, number>;
  readonly editableColumnIDs: ReadonlySet<TabularColumnID>;
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
  #domain: GridProfileDomain | null = null;
  #domainRows: readonly TabularRow[] | null = null;
  #domainColumnState: TabularSnapshot['state']['columnState'] | null = null;
  #domainSchema: TabularColumnSchema | null = null;
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
    const base = this.#base.getProjection();
    return projectDomain(this.#domainFor(this.#snapshot, base), this.#snapshot, base);
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
    const previousBase = this.#base.getProjection();
    const previous = this.#domainFor(this.#snapshot, previousBase);
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
    const nextBase = this.#base.getProjection();
    const reconciled = reconcileInteractionState(this.#kind, previous, this.#domainFor(candidate, nextBase), candidate, this.#options, event.type === 'replace-source' ? 'source-reset' : 'cell-removed');
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
    const previousBase = this.#base.getProjection();
    const previous = this.#domainFor(this.#snapshot, previousBase);
    const synchronized = this.#base.synchronizeView(response);
    if (!synchronized.ok) return synchronized;
    const candidate = freezeState(
      this.#snapshot.revision,
      synchronized.value,
      this.#snapshot.cursor.current,
      this.#snapshot.edit.kind === 'editing' ? this.#snapshot.edit.cell : null,
    );
    const nextBase = this.#base.getProjection();
    const reconciled = reconcileInteractionState(this.#kind, previous, this.#domainFor(candidate, nextBase), candidate, this.#options, 'cell-removed');
    this.#snapshot = freezeState(this.#snapshot.revision + 1, synchronized.value, reconciled.cursor.current, reconciled.edit.kind === 'editing' ? reconciled.edit.cell : null);
    this.#emitAll(reconciled.commands);
    return ok(this.#snapshot);
  }

  public syncControlledValues(values: TabularControlledValues): TabularResult<GridProfileState> {
    const previousBase = this.#base.getProjection();
    const previous = this.#domainFor(this.#snapshot, previousBase);
    const synchronized = this.#base.syncControlledValues(values);
    if (!synchronized.ok) return synchronized;
    const candidate = freezeState(
      this.#snapshot.revision,
      synchronized.value,
      this.#snapshot.cursor.current,
      this.#snapshot.edit.kind === 'editing' ? this.#snapshot.edit.cell : null,
    );
    const nextBase = this.#base.getProjection();
    const reconciled = reconcileInteractionState(this.#kind, previous, this.#domainFor(candidate, nextBase), candidate, this.#options, 'cell-removed');
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
    this.#domain = null;
    this.#domainRows = null;
    this.#domainColumnState = null;
    this.#domainSchema = null;
    this.#base.dispose();
  }

  #dispatchInteraction(event: Exclude<GridInteractionEvent, { readonly type: 'set-row-expanded' }>): TabularResult<GridProfileUpdate> {
    const base = this.#base.getProjection();
    const result = reduceInteraction(this.#kind, this.#snapshot, this.#domainFor(this.#snapshot, base), event, this.#options);
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
    const base = this.#base.getProjection();
    const row = this.#domainFor(this.#snapshot, base).rowByID.get(rowID)?.row;
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

  #domainFor(
    state: GridProfileState,
    base: ReturnType<DataTableController['getProjection']>,
  ): GridProfileDomain {
    const schema = state.tabular.state.acceptedViewState.kind === 'none'
      ? null
      : state.tabular.state.acceptedViewState.view.columnSchema;
    if (this.#domain !== null
      && this.#domainRows === base.rows
      && this.#domainColumnState === state.tabular.state.columnState
      && this.#domainSchema === schema) return this.#domain;
    this.#domain = createProfileDomain(this.#kind, state, base);
    this.#domainRows = base.rows;
    this.#domainColumnState = state.tabular.state.columnState;
    this.#domainSchema = schema;
    return this.#domain;
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
  domain: GridProfileDomain,
  event: Exclude<GridInteractionEvent, { readonly type: 'set-row-expanded' }>,
  options: GridProfileOptions,
): TabularResult<{ readonly cursor: GridCursorState; readonly edit: GridEditState; readonly commands: readonly GridEditCommand[] }> {
  if (event.type === 'focus-cell') {
    const target = findCell(domain, event.cell);
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
    const target = moveCell(domain, state.cursor.current, event.direction, event.boundary ?? 'stop', options);
    return ok(Object.freeze({ cursor: freezeCursor(target), edit: state.edit, commands: Object.freeze([]) }));
  }
  if (event.type === 'begin-edit') {
    const cell = event.cell ?? state.cursor.current;
    if (cell === null || !editableCell(kind, domain, cell, options)) return invalidEditTarget(cell, 'Editing requires an enabled editable leaf cell.');
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

function projectDomain(
  domain: GridProfileDomain,
  state: GridProfileState,
  base: ReturnType<DataTableController['getProjection']>,
): GridProfileProjection {
  return Object.freeze({
    generation: domain.generation,
    rows: domain.rows,
    columns: domain.columns,
    cursor: state.cursor,
    edit: state.edit,
    rowSelection: base.rowSelection,
    expansion: Object.freeze({ expandedRowIDs: base.expansion }),
  });
}

function createProfileDomain(
  kind: GridProfileKind,
  state: GridProfileState,
  base: ReturnType<DataTableController['getProjection']>,
): GridProfileDomain {
  const columns = Object.freeze({ start: base.columns.start, center: base.columns.center, end: base.columns.end });
  const orderedColumns = Object.freeze([...columns.start, ...columns.center, ...columns.end]);
  const cells: TabularCellAddress[] = [];
  const cellsByRow = new Map<TabularRowID | TabularGroupID, ReadonlyMap<TabularColumnID, TabularCellAddress>>();
  const rowByID = new Map<TabularRowID | TabularGroupID, GridProfileRow>();
  const rowIndexByID = new Map<TabularRowID | TabularGroupID, number>();
  const columnIndexByID = new Map<TabularColumnID, number>();
  for (let index = 0; index < orderedColumns.length; index += 1) columnIndexByID.set(orderedColumns[index]!, index);
  const rows = profileRows(kind, base.rows, orderedColumns, cells, cellsByRow, rowByID, rowIndexByID);
  const schema = state.tabular.state.acceptedViewState.kind === 'none'
    ? Object.freeze([])
    : state.tabular.state.acceptedViewState.view.columnSchema.columns;
  const editableColumnIDs = new Set(schema.filter((column) => column.capabilities?.includes('edit') === true).map((column) => column.id));
  return Object.freeze({
    generation: base.generation,
    rows,
    columns,
    orderedColumns,
    cells: Object.freeze(cells),
    cellsByRow,
    rowByID,
    rowIndexByID,
    columnIndexByID,
    editableColumnIDs,
  });
}

function profileRows(
  kind: GridProfileKind,
  rows: readonly TabularRow[],
  columns: readonly TabularColumnID[],
  cells: TabularCellAddress[],
  cellsByRow: Map<TabularRowID | TabularGroupID, ReadonlyMap<TabularColumnID, TabularCellAddress>>,
  rowByID: Map<TabularRowID | TabularGroupID, GridProfileRow>,
  rowIndexByID: Map<TabularRowID | TabularGroupID, number>,
): readonly GridProfileRow[] {
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
    const rowCells = columns.map((columnID) => freezeCell({ rowID: row.id, columnID }));
    const byColumn = new Map<TabularColumnID, TabularCellAddress>();
    for (const cell of rowCells) byColumn.set(cell.columnID, cell);
    const profile = Object.freeze({
      row,
      rowID: row.id,
      parentRowID,
      depth,
      cells: Object.freeze(rowCells),
    });
    rowIndexByID.set(row.id, output.length);
    rowByID.set(row.id, profile);
    cellsByRow.set(row.id, byColumn);
    cells.push(...rowCells);
    output.push(profile);
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
  previous: GridProfileDomain,
  next: GridProfileDomain,
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
    && editableCell(kind, next, fallback, options);
  const commands = state.edit.kind === 'editing' && !editRetained
    ? Object.freeze([freezeCancel(state.edit.cell, reason)])
    : Object.freeze([]);
  return Object.freeze({ cursor: freezeCursor(fallback), edit: editRetained ? state.edit : freezeNavigation(), commands });
}

function fallbackCell(
  previous: GridProfileDomain,
  next: GridProfileDomain,
  current: TabularCellAddress,
  options: GridProfileOptions,
): TabularCellAddress | null {
  const row = previous.rowIndexByID.get(current.rowID) ?? -1;
  const column = previous.columnIndexByID.get(current.columnID) ?? -1;
  const index = row < 0 || column < 0 ? -1 : row * previous.orderedColumns.length + column;
  for (let cursor = index + 1; cursor < previous.cells.length; cursor += 1) {
    const before = previous.cells[cursor]!;
    const candidate = findCell(next, before);
    if (candidate !== null && !disabled(options, candidate)) return candidate;
  }
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const before = previous.cells[cursor]!;
    const candidate = findCell(next, before);
    if (candidate !== null && !disabled(options, candidate)) return candidate;
  }
  for (const candidate of next.cells) if (!disabled(options, candidate)) return candidate;
  return null;
}

function moveCell(
  domain: GridProfileDomain,
  current: TabularCellAddress | null,
  direction: GridDirection,
  boundary: 'stop' | 'wrap-axis',
  options: GridProfileOptions,
): TabularCellAddress | null {
  if (boundary !== 'stop' && boundary !== 'wrap-axis') return current;
  const rows = domain.rows;
  const columns = domain.orderedColumns;
  if (rows.length === 0 || columns.length === 0) return null;
  if (current === null) {
    if (direction === 'left' || direction === 'up') {
      for (let index = domain.cells.length - 1; index >= 0; index -= 1) if (!disabled(options, domain.cells[index]!)) return domain.cells[index]!;
      return null;
    }
    for (const cell of domain.cells) if (!disabled(options, cell)) return cell;
    return null;
  }
  let row = domain.rowIndexByID.get(current.rowID) ?? -1;
  let column = domain.columnIndexByID.get(current.columnID) ?? -1;
  if (row < 0 || column < 0) return fallbackCell(domain, domain, current, options);
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
    const candidate = findCell(domain, { rowID: rows[row]!.rowID, columnID: columns[column]! });
    if (candidate !== null && !disabled(options, candidate)) return candidate;
  }
  return current;
}

function editableCell(
  kind: GridProfileKind,
  domain: GridProfileDomain,
  cell: TabularCellAddress,
  options: GridProfileOptions,
): boolean {
  const row = domain.rowByID.get(cell.rowID)?.row;
  if (row === undefined || row.kind !== 'leaf' || disabled(options, cell)) return false;
  return domain.editableColumnIDs.has(cell.columnID) && (kind === 'data-grid' || row.kind === 'leaf');
}

function findCell(domain: GridProfileDomain, cell: TabularCellAddress): TabularCellAddress | null {
  return domain.cellsByRow.get(cell.rowID)?.get(cell.columnID) ?? null;
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
function disabled(options: GridProfileOptions, cell: TabularCellAddress): boolean { return options.isCellDisabled?.(cell) === true; }

function invalidEditTarget<T>(cell: TabularCellAddress | null, message: string): TabularResult<T> {
  return fail('transition-rejection', 'invalid-edit-target', message, { cell });
}

function profileFailure<T>(message: string): TabularResult<T> {
  return fail('transition-rejection', 'profile-view-mismatch', message);
}
