import type {
  TabularCellAddress,
  TabularSnapshot,
  TabularRow,
  TabularRowID,
  TabularGroupID,
  TabularColumnID,
  TabularRowSelection,
  TabularResult,
  TabularViewResponse,
  TabularControlledValues,
} from '@sectile/tabular';
import type {
  TabularDOMColumnSizeOptions,
  TabularDOMHeaderReference,
  TabularDOMRegistrationOptions,
  TabularDOMEditorOptions,
} from '../contracts.js';

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
