import { type DataTableController, type DataTableEvent, type DataTableOptions, tryCreateDataTable } from '../data-table.js';
import { scanGridAxis } from '@sectile/core/grid';
import { fail, ok } from './foundation.js';
import type {
  TabularCellAddress,
  TabularColumnSchema,
  TabularColumnID,
  TabularCommand,
  TabularControlledValues,
  TabularControlledOwnership,
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

export interface GridProfileControlledOwnership extends TabularControlledOwnership {
  readonly cursor?: boolean;
  readonly edit?: boolean;
}

export interface GridProfileControlledValues extends TabularControlledValues {
  readonly cursor?: GridCursorState;
  readonly edit?: GridEditState;
}

export interface GridProfileOptions extends Omit<DataTableOptions, 'controlled' | 'initialValues'> {
  readonly controlled?: GridProfileControlledOwnership;
  readonly initialValues?: GridProfileControlledValues;
  readonly isCellDisabled?: (cell: TabularCellAddress) => boolean;
  readonly onCursorChange?: (state: GridCursorState) => void;
  readonly onEditStateChange?: (state: GridEditState) => void;
}

export interface GridProfileController {
  getSnapshot(): GridProfileState;
  getProjection(): GridProfileProjection;
  dispatch(event: GridProfileEvent, expectedRevision?: number): TabularResult<GridProfileUpdate>;
  synchronizeView(response: TabularViewResponse): TabularResult<GridProfileState>;
  syncControlledValues(values: GridProfileControlledValues): TabularResult<GridProfileState>;
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
  const interaction = normalizeInteractionOptions(options);
  if (!interaction.ok) return interaction;
  const controlled = options.controlled ?? {};
  const initialValues = options.initialValues ?? {};
  const base = tryCreateDataTable({
    ...options,
    controlled: {
      ...(controlled.query === undefined ? {} : { query: controlled.query }),
      ...(controlled.rowSelection === undefined ? {} : { rowSelection: controlled.rowSelection }),
      ...(controlled.columnState === undefined ? {} : { columnState: controlled.columnState }),
      ...(controlled.accessState === undefined ? {} : { accessState: controlled.accessState }),
      ...(controlled.expansion === undefined ? {} : { expansion: controlled.expansion }),
    },
    initialValues: {
      ...(initialValues.query === undefined ? {} : { query: initialValues.query }),
      ...(initialValues.rowSelection === undefined ? {} : { rowSelection: initialValues.rowSelection }),
      ...(initialValues.columnState === undefined ? {} : { columnState: initialValues.columnState }),
      ...(initialValues.accessState === undefined ? {} : { accessState: initialValues.accessState }),
      ...(initialValues.expansion === undefined ? {} : { expansion: initialValues.expansion }),
    },
  });
  return base.ok ? ok(new GridProfileRuntime(kind, options, base.value, interaction.value)) : base;
}

interface NormalizedInteractionOptions {
  readonly controlledCursor: boolean;
  readonly controlledEdit: boolean;
  readonly cursor: GridCursorState | undefined;
  readonly edit: GridEditState | undefined;
}

class GridProfileRuntime implements GridProfileController {
  readonly #kind: GridProfileKind;
  readonly #options: GridProfileOptions;
  readonly #base: DataTableController;
  readonly #controlledCursor: boolean;
  readonly #controlledEdit: boolean;
  readonly #listeners = new Set<(command: GridProfileCommand) => void>();
  readonly #unsubscribeBase: () => void;
  #snapshot: GridProfileState;
  #domain: GridProfileDomain | null = null;
  #domainRows: readonly TabularRow[] | null = null;
  #domainColumnState: TabularSnapshot['state']['columnState'] | null = null;
  #domainSchema: TabularColumnSchema | null = null;
  #pendingDefaultCursor: GridCursorState | undefined;
  #pendingDefaultEdit: GridEditState | undefined;
  #baseCommandSuppressionDepth = 0;
  #disposed = false;

  public constructor(kind: GridProfileKind, options: GridProfileOptions, base: DataTableController, interaction: NormalizedInteractionOptions) {
    this.#kind = kind;
    this.#options = options;
    this.#base = base;
    this.#controlledCursor = interaction.controlledCursor;
    this.#controlledEdit = interaction.controlledEdit;
    this.#pendingDefaultCursor = interaction.controlledCursor ? undefined : interaction.cursor;
    this.#pendingDefaultEdit = interaction.controlledEdit ? undefined : interaction.edit;
    const initialCursor = interaction.controlledCursor ? interaction.cursor?.current ?? null : null;
    const initialEdit = interaction.controlledEdit && interaction.edit?.kind === 'editing' ? interaction.edit.cell : null;
    this.#snapshot = freezeState(0, base.getSnapshot(), initialCursor, initialEdit);
    this.#unsubscribeBase = base.subscribeCommands((command) => {
      if (this.#baseCommandSuppressionDepth === 0 && command.type !== 'request-value-commit') this.#emit(command);
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
    const operationBase = this.#snapshot;
    if ((event as { readonly type: string }).type === 'request-value-commit') return profileFailure('Grid profiles use explicit edit events.');
    if (event.type === 'set-row-expanded') return this.#setRowExpanded(event.rowID, event.open);
    if (isInteractionEvent(event)) return this.#dispatchInteraction(event);

    const previousBase = this.#base.getProjection();
    const previous = this.#domainFor(this.#snapshot, previousBase);
    const changed = this.#withoutBaseEmission(() => this.#base.dispatch(event));
    if (!changed.ok) return changed;
    const candidate = freezeState(
      this.#snapshot.revision,
      changed.value.snapshot,
      this.#snapshot.cursor.current,
      this.#snapshot.edit.kind === 'editing' ? this.#snapshot.edit.cell : null,
    );
    const nextBase = this.#base.getProjection();
    const reconciled = reconcileInteractionState(this.#kind, previous, this.#domainFor(candidate, nextBase), candidate, this.#options, event.type === 'replace-source' ? 'source-reset' : 'cell-removed');
    const interaction = this.#resolveInteraction(reconciled.cursor, reconciled.edit, reconciled.commands);
    const commands = Object.freeze([...interaction.commands, ...withoutNativeCommit(changed.value.commands)]);
    const operationSnapshot = freezeState(
      operationBase.revision + 1,
      changed.value.snapshot,
      interaction.cursor.current,
      interaction.edit.kind === 'editing' ? interaction.edit.cell : null,
    );
    if (this.#snapshot === operationBase) this.#snapshot = operationSnapshot;
    this.#notifyInteraction(operationBase, reconciled.cursor, reconciled.edit);
    this.#emitAll(commands);
    return ok(Object.freeze({ snapshot: operationSnapshot, commands }));
  }

  public synchronizeView(response: TabularViewResponse): TabularResult<GridProfileState> {
    if (this.#disposed) return gridProfileDisposed('synchronize view responses');
    const interactionBefore = this.#snapshot;
    const profile = validateProfileRows(this.#kind, response.rows);
    if (!profile.ok) return profile;
    const previousBase = this.#base.getProjection();
    const previous = this.#domainFor(this.#snapshot, previousBase);
    const synchronized = this.#base.synchronizeView(response);
    if (!synchronized.ok) return synchronized;
    let cursor = this.#snapshot.cursor;
    let edit = this.#snapshot.edit;
    const nextBase = this.#base.getProjection();
    const provisional = freezeState(this.#snapshot.revision, synchronized.value, cursor.current, edit.kind === 'editing' ? edit.cell : null);
    const nextDomain = this.#domainFor(provisional, nextBase);
    if (nextDomain.cells.length > 0 && this.#pendingDefaultCursor !== undefined) {
      cursor = this.#pendingDefaultCursor;
      this.#pendingDefaultCursor = undefined;
    }
    if (nextDomain.cells.length > 0 && this.#pendingDefaultEdit !== undefined) {
      edit = this.#pendingDefaultEdit;
      this.#pendingDefaultEdit = undefined;
    }
    const candidate = freezeState(
      this.#snapshot.revision,
      synchronized.value,
      cursor.current,
      edit.kind === 'editing' ? edit.cell : null,
    );
    const reconciled = reconcileInteractionState(this.#kind, previous, this.#domainFor(candidate, nextBase), candidate, this.#options, 'cell-removed');
    const interaction = this.#resolveInteraction(reconciled.cursor, reconciled.edit, reconciled.commands);
    this.#snapshot = freezeState(this.#snapshot.revision + 1, synchronized.value, interaction.cursor.current, interaction.edit.kind === 'editing' ? interaction.edit.cell : null);
    this.#notifyInteraction(interactionBefore, reconciled.cursor, reconciled.edit);
    this.#emitAll(interaction.commands);
    return ok(this.#snapshot);
  }

  public syncControlledValues(values: GridProfileControlledValues): TabularResult<GridProfileState> {
    if (this.#disposed) return gridProfileDisposed('synchronize controlled values');
    if ((values.cursor !== undefined) !== this.#controlledCursor || (values.edit !== undefined) !== this.#controlledEdit) {
      return fail('transition-rejection', 'invalid-controlled-shape', 'Controlled grid values must preserve construction-time cursor and edit ownership.');
    }
    const cursor = values.cursor === undefined ? ok(this.#snapshot.cursor) : normalizeCursor(values.cursor);
    if (!cursor.ok) return cursor;
    const edit = values.edit === undefined ? ok(this.#snapshot.edit) : normalizeEdit(values.edit);
    if (!edit.ok) return edit;
    const previousBase = this.#base.getProjection();
    const previous = this.#domainFor(this.#snapshot, previousBase);
    const { cursor: _cursor, edit: _edit, ...tabularValues } = values;
    const previousRequestID = this.#snapshot.tabular.state.requestState.pendingRequest?.requestID ?? null;
    const synchronized = this.#withoutBaseEmission(() => this.#base.syncControlledValues(tabularValues));
    if (!synchronized.ok) return synchronized;
    const candidate = freezeState(
      this.#snapshot.revision,
      synchronized.value,
      cursor.value.current,
      edit.value.kind === 'editing' ? edit.value.cell : null,
    );
    const nextBase = this.#base.getProjection();
    const nextDomain = this.#domainFor(candidate, nextBase);
    const valid = validateInteractionState(this.#kind, nextDomain, cursor.value, edit.value, this.#options);
    if (!valid.ok) return valid;
    const reconciled = reconcileInteractionState(this.#kind, previous, nextDomain, candidate, this.#options, 'cell-removed');
    const nextCursor = this.#controlledCursor ? cursor.value : reconciled.cursor;
    const nextEdit = this.#controlledEdit ? edit.value : reconciled.edit;
    this.#snapshot = freezeState(this.#snapshot.revision + 1, synchronized.value, nextCursor.current, nextEdit.kind === 'editing' ? nextEdit.cell : null);
    const pending = synchronized.value.state.requestState.pendingRequest;
    const baseCommands: readonly GridProfileCommand[] = pending !== null && pending.requestID !== previousRequestID
      ? Object.freeze([Object.freeze({ type: 'request-view' as const, request: pending })])
      : Object.freeze([]);
    const interactionCommands = this.#controlledCursor || this.#controlledEdit ? Object.freeze([]) : reconciled.commands;
    this.#emitAll(Object.freeze([...interactionCommands, ...baseCommands]));
    return ok(this.#snapshot);
  }

  public requestView(): TabularResult<GridProfileState> {
    const updated = this.dispatch({ type: 'request-view' });
    return updated.ok ? ok(updated.value.snapshot) : updated;
  }

  public abandonRequest(requestID: number): TabularResult<GridProfileState> {
    if (this.#disposed) return gridProfileDisposed('abandon requests');
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
    if (this.#disposed) return gridProfileDisposed('attach request executors');
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
    const interactionBefore = this.#snapshot;
    const base = this.#base.getProjection();
    const result = reduceInteraction(this.#kind, this.#snapshot, this.#domainFor(this.#snapshot, base), event, this.#options);
    if (!result.ok) return result;
    const interaction = this.#resolveInteraction(result.value.cursor, result.value.edit, result.value.commands);
    this.#snapshot = freezeState(
      this.#snapshot.revision + 1,
      this.#snapshot.tabular,
      interaction.cursor.current,
      interaction.edit.kind === 'editing' ? interaction.edit.cell : null,
    );
    this.#notifyInteraction(interactionBefore, result.value.cursor, result.value.edit);
    this.#emitAll(interaction.commands);
    return ok(Object.freeze({ snapshot: this.#snapshot, commands: interaction.commands }));
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
    if (this.#disposed) return gridProfileDisposed('dispatch events');
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

  #withoutBaseEmission<Value>(operation: () => Value): Value {
    this.#baseCommandSuppressionDepth += 1;
    try { return operation(); }
    finally { this.#baseCommandSuppressionDepth -= 1; }
  }

  #resolveInteraction(
    cursor: GridCursorState,
    edit: GridEditState,
    commands: readonly GridEditCommand[],
  ): { readonly cursor: GridCursorState; readonly edit: GridEditState; readonly commands: readonly GridEditCommand[] } {
    const cursorChanged = !sameCursor(this.#snapshot.cursor, cursor);
    const editChanged = !sameEdit(this.#snapshot.edit, edit);
    const blocked = (cursorChanged && this.#controlledCursor) || (editChanged && this.#controlledEdit);
    return blocked
      ? Object.freeze({ cursor: this.#snapshot.cursor, edit: this.#snapshot.edit, commands: Object.freeze([]) })
      : Object.freeze({ cursor, edit, commands });
  }

  #notifyInteraction(previous: GridProfileState, cursor: GridCursorState, edit: GridEditState): void {
    if (!sameCursor(previous.cursor, cursor)) this.#options.onCursorChange?.(cursor);
    if (!sameEdit(previous.edit, edit)) this.#options.onEditStateChange?.(edit);
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
  const row = domain.rowIndexByID.get(current.rowID) ?? -1;
  const column = domain.columnIndexByID.get(current.columnID) ?? -1;
  if (row < 0 || column < 0) return fallbackCell(domain, domain, current, options);
  const movement = scanGridAxis(rows.length, columns.length, { row, column }, direction, {
    boundary,
    accepts: (candidateRow, candidateColumn) => {
      const candidate = domain.cellsByRow
        .get(rows[candidateRow]!.rowID)
        ?.get(columns[candidateColumn]!);
      return candidate !== undefined && !disabled(options, candidate);
    },
  });
  if (movement.kind !== 'found') return current;
  return domain.cellsByRow
    .get(rows[movement.position.row]!.rowID)
    ?.get(columns[movement.position.column]!)
    ?? current;
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

function normalizeInteractionOptions(options: GridProfileOptions): TabularResult<NormalizedInteractionOptions> {
  const controlledCursor = options.controlled?.cursor ?? false;
  const controlledEdit = options.controlled?.edit ?? false;
  if (typeof controlledCursor !== 'boolean' || typeof controlledEdit !== 'boolean') {
    return fail('construction', 'invalid-controlled-shape', 'Grid cursor and edit controlled flags must be boolean.');
  }
  if (controlledCursor && options.initialValues?.cursor === undefined) {
    return fail('construction', 'controlled-value-required', 'Controlled grid cursor requires an initial value.');
  }
  if (controlledEdit && options.initialValues?.edit === undefined) {
    return fail('construction', 'controlled-value-required', 'Controlled grid edit state requires an initial value.');
  }
  const cursor = options.initialValues?.cursor === undefined ? ok(undefined) : normalizeCursor(options.initialValues.cursor);
  if (!cursor.ok) return cursor;
  const edit = options.initialValues?.edit === undefined ? ok(undefined) : normalizeEdit(options.initialValues.edit);
  if (!edit.ok) return edit;
  return ok(Object.freeze({ controlledCursor, controlledEdit, cursor: cursor.value, edit: edit.value }));
}

function normalizeCursor(input: GridCursorState): TabularResult<GridCursorState> {
  if (input === null || typeof input !== 'object' || !('current' in input)) {
    return fail('construction', 'invalid-controlled-shape', 'Grid cursor must contain a current cell or null.');
  }
  if (input.current === null) return ok(freezeCursor(null));
  const cell = normalizeCell(input.current);
  return cell.ok ? ok(freezeCursor(cell.value)) : cell;
}

function normalizeEdit(input: GridEditState): TabularResult<GridEditState> {
  if (input === null || typeof input !== 'object') {
    return fail('construction', 'invalid-controlled-shape', 'Grid edit state must be navigation or editing.');
  }
  if (input.kind === 'navigation') return ok(freezeNavigation());
  if (input.kind !== 'editing') return fail('construction', 'invalid-controlled-shape', 'Grid edit state must be navigation or editing.');
  const cell = normalizeCell(input.cell);
  return cell.ok ? ok(freezeEditing(cell.value)) : cell;
}

function normalizeCell(input: TabularCellAddress): TabularResult<TabularCellAddress> {
  if (input === null || typeof input !== 'object'
    || typeof input.rowID !== 'string' || input.rowID.length === 0
    || typeof input.columnID !== 'string' || input.columnID.length === 0) {
    return fail('construction', 'invalid-controlled-shape', 'Grid interaction cells require non-empty row and column IDs.');
  }
  return ok(freezeCell(input));
}

function validateInteractionState(
  kind: GridProfileKind,
  domain: GridProfileDomain,
  cursor: GridCursorState,
  edit: GridEditState,
  options: GridProfileOptions,
): TabularResult<true> {
  if (cursor.current !== null && (findCell(domain, cursor.current) === null || disabled(options, cursor.current))) {
    return invalidEditTarget(cursor.current, 'Controlled cursor must identify an enabled projected cell or null.');
  }
  if (edit.kind === 'editing'
    && (cursor.current === null || !sameCell(cursor.current, edit.cell) || !editableCell(kind, domain, edit.cell, options))) {
    return invalidEditTarget(edit.cell, 'Controlled editing requires the same enabled editable projected cursor cell.');
  }
  return ok(true);
}

function freezeCursor(cell: TabularCellAddress | null): GridCursorState {
  return Object.freeze({ current: cell === null ? null : freezeCell(cell) });
}

function freezeNavigation(): GridEditState { return Object.freeze({ kind: 'navigation' }); }
function freezeEditing(cell: TabularCellAddress): GridEditState { return Object.freeze({ kind: 'editing', cell: freezeCell(cell) }); }
function freezeCell(cell: TabularCellAddress): TabularCellAddress { return Object.freeze({ rowID: cell.rowID, columnID: cell.columnID }); }
function freezeCancel(cell: TabularCellAddress, reason: GridEditCancelReason): GridEditCommand { return Object.freeze({ type: 'cancel-edit', cell: freezeCell(cell), reason }); }
function sameCell(left: TabularCellAddress, right: TabularCellAddress): boolean { return left.rowID === right.rowID && left.columnID === right.columnID; }
function sameCursor(left: GridCursorState, right: GridCursorState): boolean {
  return left.current === null ? right.current === null : right.current !== null && sameCell(left.current, right.current);
}
function sameEdit(left: GridEditState, right: GridEditState): boolean {
  return left.kind === 'navigation' ? right.kind === 'navigation' : right.kind === 'editing' && sameCell(left.cell, right.cell);
}
function disabled(options: GridProfileOptions, cell: TabularCellAddress): boolean { return options.isCellDisabled?.(cell) === true; }

function invalidEditTarget<T>(cell: TabularCellAddress | null, message: string): TabularResult<T> {
  return fail('transition-rejection', 'invalid-edit-target', message, { cell });
}

function profileFailure<T>(message: string): TabularResult<T> {
  return fail('transition-rejection', 'profile-view-mismatch', message);
}

function gridProfileDisposed<T>(operation: string): TabularResult<T> {
  return fail('transition-rejection', 'controller-disposed', `Disposed grid profile controller cannot ${operation}.`);
}
