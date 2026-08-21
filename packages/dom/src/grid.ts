import type { Result, StableID } from '@sectile/primitives';
import { applyGridEvent, createGrid, createGridState, type Grid, type GridCommand, type GridEditMode, type GridEvent, type GridOptions as StructureGridOptions, type GridPolicies, type GridState } from '@sectile/primitives/grid';
import type { RevisionSnapshot } from '@sectile/primitives/revision';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';

export interface GridOptions<ID extends StableID = StableID> extends StructureGridOptions {
  readonly root: HTMLElement;
  readonly rows: readonly (readonly (ID | null)[])[];
  readonly value?: ID | null; readonly defaultValue?: ID | null;
  readonly highlightedValue?: ID | null; readonly defaultHighlightedValue?: ID | null;
  readonly editMode?: GridEditMode; readonly defaultEditMode?: GridEditMode;
  readonly policies?: GridPolicies<ID>;
  readonly disabledItems?: readonly ID[];
  readonly label?: string;
  readonly onValueChange?: (value: ID | null) => void;
  readonly onHighlightedValueChange?: (value: ID | null) => void;
  readonly onEditModeChange?: (mode: GridEditMode) => void;
  readonly onEditStart?: (id: ID) => void;
  readonly onEditCommit?: (id: ID) => void;
  readonly onEditCancel?: (id: ID) => void;
  readonly onUpdate?: () => void;
}
export interface GridControlledValues<ID extends StableID = StableID> { readonly value?: ID | null; readonly highlightedValue?: ID | null; readonly editMode?: GridEditMode }
export interface GridConnection<ID extends StableID = StableID> {
  readonly grid: Grid<ID>;
  getSnapshot(): RevisionSnapshot<GridState<ID>>;
  syncControlledValues(values: GridControlledValues<ID>): Result<RevisionSnapshot<GridState<ID>>>;
  setCellAttributes(element: HTMLElement, id: ID): void;
  handleEvent(event: GridEvent<ID>): boolean;
  focusCurrent(): void;
  disconnect(): void;
}

export function createGridControl<ID extends StableID>(options: GridOptions<ID>): Result<GridConnection<ID>> {
  const grid = createGrid(options.rows, options); if (!grid.ok) return grid;
  const disabled = new Set(options.disabledItems ?? []);
  for (const id of disabled) if (grid.value.positionOf(id) === null) return { ok: false, error: { class: 'construction', code: 'disabled-item-outside-domain', message: 'Every disabled grid cell must exist in the grid.', details: { id } } };
  const suppliedEligibility = options.policies?.eligible;
  const policies: GridPolicies<ID> = { ...options.policies, eligible: (id) => !disabled.has(id) && (suppliedEligibility?.(id) ?? true) };
  const valueControlled = options.value !== undefined; const highlightControlled = options.highlightedValue !== undefined; const editControlled = options.editMode !== undefined;
  const selected = options.value !== undefined ? options.value : options.defaultValue ?? null;
  const runtime = createSemanticController<GridState<ID>, GridEvent<ID>, GridCommand<ID>, GridCommand<ID>>({
    initial: createGridState(grid.value, { current: options.highlightedValue !== undefined ? options.highlightedValue : options.defaultHighlightedValue ?? null, selected: selected === null ? [] : [selected], anchor: selected, editMode: options.editMode ?? options.defaultEditMode ?? 'navigation' }),
    reducer: (state, event) => applyGridEvent(grid.value, state, event, policies),
    reconcile: (previous, proposed) => createGridState(grid.value, { current: highlightControlled ? previous.cursor.current : proposed.cursor.current, selected: valueControlled ? previous.selection.selected : proposed.selection.selected, anchor: valueControlled ? previous.selection.anchor : proposed.selection.anchor, editMode: editControlled ? previous.editMode : proposed.editMode }),
    notify: (previous, proposed) => { const before = previous.selection.selected[0] ?? null; const after = proposed.selection.selected[0] ?? null; if (before !== after) options.onValueChange?.(after); if (previous.cursor.current !== proposed.cursor.current) options.onHighlightedValueChange?.(proposed.cursor.current); if (previous.editMode !== proposed.editMode) options.onEditModeChange?.(proposed.editMode); },
    toEffect: (command) => command,
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new DOMGrid(options, grid.value, runtime.value, disabled, valueControlled, highlightControlled, editControlled) };
}

class DOMGrid<ID extends StableID> implements GridConnection<ID> {
  public readonly grid: Grid<ID>; readonly #options: GridOptions<ID>; readonly #runtime: SemanticController<GridState<ID>, GridEvent<ID>, GridCommand<ID>>; readonly #elements = new Map<ID, HTMLElement>();
  readonly #disabled: ReadonlySet<ID>; readonly #valueControlled: boolean; readonly #highlightControlled: boolean; readonly #editControlled: boolean;
  readonly #keydown: (event: KeyboardEvent) => void; readonly #click: (event: MouseEvent) => void; readonly #focus: (event: FocusEvent) => void;
  public constructor(options: GridOptions<ID>, grid: Grid<ID>, runtime: SemanticController<GridState<ID>, GridEvent<ID>, GridCommand<ID>>, disabled: ReadonlySet<ID>, valueControlled: boolean, highlightControlled: boolean, editControlled: boolean) {
    this.#options = options; this.grid = grid; this.#runtime = runtime;
    this.#disabled = disabled; this.#valueControlled = valueControlled; this.#highlightControlled = highlightControlled; this.#editControlled = editControlled;
    this.#keydown = (event) => { const semantic = toGridEvent(event, this.getSnapshot().state.editMode); if (semantic !== null && this.handleEvent(semantic)) event.preventDefault(); };
    this.#click = (event) => { const id = this.#findID(event.target); if (id !== null) this.handleEvent({ type: 'select', id }); };
    this.#focus = (event) => { const id = this.#findID(event.target); if (id === null || id === this.getSnapshot().state.cursor.current) return; const result = this.#runtime.handle({ type: 'focus', id }); if (result.ok) this.#refresh(); queueMicrotask(() => { this.#options.onUpdate?.(); this.focusCurrent(); }); };
    options.root.addEventListener('keydown', this.#keydown); options.root.addEventListener('click', this.#click); options.root.addEventListener('focusin', this.#focus);
    options.root.setAttribute('role', 'grid'); options.root.setAttribute('aria-rowcount', String(grid.rowCount)); options.root.setAttribute('aria-colcount', String(grid.columnCount)); if (options.label !== undefined) options.root.setAttribute('aria-label', options.label);
  }
  public getSnapshot(): RevisionSnapshot<GridState<ID>> { return this.#runtime.getSnapshot(); }
  public syncControlledValues(values: GridControlledValues<ID>): Result<RevisionSnapshot<GridState<ID>>> {
    if (this.#valueControlled !== (values.value !== undefined) || this.#highlightControlled !== (values.highlightedValue !== undefined) || this.#editControlled !== (values.editMode !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled grid values must preserve their construction-time shape.' } };
    const current = this.getSnapshot().state; const selected = values.value === undefined ? current.selection.selected : values.value === null ? [] : [values.value];
    const result = this.#runtime.replace(createGridState(this.grid, { current: values.highlightedValue === undefined ? current.cursor.current : values.highlightedValue, selected, anchor: values.value === undefined ? current.selection.anchor : values.value, editMode: values.editMode ?? current.editMode })); if (result.ok) { this.#refresh(); this.#options.onUpdate?.(); this.focusCurrent(); } return result;
  }
  public setCellAttributes(element: HTMLElement, id: ID): void { if (this.grid.positionOf(id) !== null) { this.#elements.set(id, element); this.#refresh(); } }
  public handleEvent(event: GridEvent<ID>): boolean { const result = this.#runtime.handle(event); if (result.ok) { for (const command of result.commands) { if (command.type === 'focus') this.#elements.get(command.id)?.focus(); else if (command.type === 'begin-edit') this.#options.onEditStart?.(command.id); else if (command.type === 'commit-edit') this.#options.onEditCommit?.(command.id); else this.#options.onEditCancel?.(command.id); } this.#refresh(); } this.#options.onUpdate?.(); this.focusCurrent(); return true; }
  public focusCurrent(): void { queueMicrotask(() => { const current = this.getSnapshot().state.cursor.current; if (current === null) this.#options.root.focus(); else this.#elements.get(current)?.focus(); }); }
  public disconnect(): void { this.#options.root.removeEventListener('keydown', this.#keydown); this.#options.root.removeEventListener('click', this.#click); this.#options.root.removeEventListener('focusin', this.#focus); this.#elements.clear(); }
  #findID(target: EventTarget | null): ID | null { for (const [id, element] of this.#elements) if (target === element || (target instanceof Node && element.contains(target))) return id; return null; }
  #refresh(): void { const state = this.getSnapshot().state; for (const [id, element] of this.#elements) { const position = this.grid.positionOf(id); if (position === null) continue; element.setAttribute('role', 'gridcell'); element.setAttribute('aria-rowindex', String(position.row + 1)); element.setAttribute('aria-colindex', String(position.column + 1)); element.setAttribute('aria-selected', String(state.selection.has(id))); if (this.#disabled.has(id)) element.setAttribute('aria-disabled', 'true'); else element.removeAttribute('aria-disabled'); element.tabIndex = state.cursor.current === id ? 0 : -1; } }
}

function toGridEvent(event: KeyboardEvent, editMode: GridEditMode): Extract<GridEvent, string> | null {
  if (event.isComposing || event.ctrlKey || event.metaKey) return null;
  if (editMode === 'editing') { if (event.key === 'Enter') return 'commit-edit'; if (event.key === 'Escape') return 'cancel-edit'; return null; }
  if (event.altKey) return null; if (event.key === 'ArrowLeft') return 'left'; if (event.key === 'ArrowRight') return 'right'; if (event.key === 'ArrowUp') return 'up'; if (event.key === 'ArrowDown') return 'down'; if (event.key === ' ') return 'select'; if (event.key === 'Enter' || event.key === 'F2') return 'start-edit'; return null;
}
