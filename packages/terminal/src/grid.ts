import type { Result, StableID } from '@sectile/primitives';
import { applyGridEvent, createGrid, createGridState, type Grid, type GridCommand, type GridEditMode, type GridEvent, type GridOptions as StructureGridOptions, type GridPolicies, type GridState } from '@sectile/primitives/grid';
import type { RevisionSnapshot } from '@sectile/primitives/revision';
import type { TerminalKeyboardInput } from './keyboard.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';

export interface GridOptions<ID extends StableID = StableID> extends StructureGridOptions { readonly rows: readonly (readonly (ID | null)[])[]; readonly value?: ID | null; readonly defaultValue?: ID | null; readonly highlightedValue?: ID | null; readonly defaultHighlightedValue?: ID | null; readonly editMode?: GridEditMode; readonly defaultEditMode?: GridEditMode; readonly policies?: GridPolicies<ID>; readonly onValueChange?: (value: ID | null) => void; readonly onUpdate?: () => void }
export interface GridControlledValues<ID extends StableID = StableID> { readonly value?: ID | null; readonly highlightedValue?: ID | null; readonly editMode?: GridEditMode }
export interface GridConnection<ID extends StableID = StableID> { readonly grid: Grid<ID>; getSnapshot(): RevisionSnapshot<GridState<ID>>; syncControlledValues(values: GridControlledValues<ID>): Result<RevisionSnapshot<GridState<ID>>>; handleEvent(event: GridEvent<ID>): boolean; handleKeyboardInput(input: TerminalKeyboardInput): boolean }

export function createGridControl<ID extends StableID>(options: GridOptions<ID>): Result<GridConnection<ID>> {
  const grid = createGrid(options.rows, options); if (!grid.ok) return grid; const selected = options.value !== undefined ? options.value : options.defaultValue ?? null;
  const runtime = createSemanticController<GridState<ID>, GridEvent<ID>, GridCommand<ID>, GridCommand<ID>>({ initial: createGridState(grid.value, { current: options.highlightedValue !== undefined ? options.highlightedValue : options.defaultHighlightedValue ?? null, selected: selected === null ? [] : [selected], anchor: selected, editMode: options.editMode ?? options.defaultEditMode ?? 'navigation' }), reducer: (state, event) => applyGridEvent(grid.value, state, event, options.policies), reconcile: (previous, proposed) => createGridState(grid.value, { current: options.highlightedValue !== undefined ? previous.cursor.current : proposed.cursor.current, selected: options.value !== undefined ? previous.selection.selected : proposed.selection.selected, anchor: options.value !== undefined ? previous.selection.anchor : proposed.selection.anchor, editMode: options.editMode !== undefined ? previous.editMode : proposed.editMode }), notify: (previous, proposed) => { const before = previous.selection.selected[0] ?? null; const after = proposed.selection.selected[0] ?? null; if (before !== after) options.onValueChange?.(after); }, toEffect: (command) => command });
  if (!runtime.ok) return runtime; return { ok: true, value: new TerminalGrid(options, grid.value, runtime.value) };
}

class TerminalGrid<ID extends StableID> implements GridConnection<ID> {
  public readonly grid: Grid<ID>; readonly #options: GridOptions<ID>; readonly #runtime: SemanticController<GridState<ID>, GridEvent<ID>, GridCommand<ID>>;
  public constructor(options: GridOptions<ID>, grid: Grid<ID>, runtime: SemanticController<GridState<ID>, GridEvent<ID>, GridCommand<ID>>) { this.#options = options; this.grid = grid; this.#runtime = runtime; }
  public getSnapshot(): RevisionSnapshot<GridState<ID>> { return this.#runtime.getSnapshot(); }
  public syncControlledValues(values: GridControlledValues<ID>): Result<RevisionSnapshot<GridState<ID>>> { const current = this.getSnapshot().state; const selected = values.value === undefined ? current.selection.selected : values.value === null ? [] : [values.value]; return this.#runtime.replace(createGridState(this.grid, { current: values.highlightedValue === undefined ? current.cursor.current : values.highlightedValue, selected, anchor: values.value === undefined ? current.selection.anchor : values.value, editMode: values.editMode ?? current.editMode })); }
  public handleEvent(event: GridEvent<ID>): boolean { this.#runtime.handle(event); this.#options.onUpdate?.(); return true; }
  public handleKeyboardInput(input: TerminalKeyboardInput): boolean { const event = toGridEvent(input, this.getSnapshot().state.editMode); return event === null ? false : this.handleEvent(event); }
}

function toGridEvent(input: TerminalKeyboardInput, editMode: GridEditMode): Extract<GridEvent, string> | null { if (input.ctrlKey) return null; if (editMode === 'editing') { if (input.key === 'enter') return 'commit-edit'; if (input.key === 'escape') return 'cancel-edit'; return null; } if (input.altKey) return null; if (input.key === 'left' || input.key === 'right' || input.key === 'up' || input.key === 'down') return input.key; if (input.key === 'space') return 'select'; if (input.key === 'enter' || input.key === 'edit') return 'start-edit'; return null; }
