import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import { tryCreateGrid, type Grid, type GridOptions as StructureGridOptions } from '@sectile/core/grid';
import { applyGridEvent, tryCreateGridState, type GridCommand, type GridEditMode, type GridEvent, type GridPolicies, type GridState } from '@sectile/core/grid-control';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';
import { setInteractionAttributes } from './internal/interaction.js';
import { DOMCompositeFocusEntry } from './internal/composite-focus-entry.js';

export type { GridEditMode, GridPolicies } from '@sectile/core/grid-control';

export interface GridOptions<ID extends StableID = StableID> extends StructureGridOptions {
  readonly root: HTMLElement;
  readonly rows: readonly (readonly (ID | null)[])[];
  readonly value?: ID | null; readonly defaultValue?: ID | null;
  readonly highlightedValue?: ID | null; readonly defaultHighlightedValue?: ID | null;
  readonly editMode?: GridEditMode; readonly defaultEditMode?: GridEditMode;
  readonly policies?: GridPolicies<ID>;
  readonly disabledItems?: readonly ID[];
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly label?: string;
  readonly onValueChange?: (value: ID | null) => void;
  readonly onHighlightedValueChange?: (value: ID | null) => void;
  readonly onEditModeChange?: (mode: GridEditMode) => void;
  readonly onEditStart?: (id: ID) => void;
  readonly onEditCommit?: (id: ID) => void;
  readonly onEditCancel?: (id: ID) => void;
  readonly onUpdate?: () => void;
}

export type GridValueChangeHandler<ID extends StableID = StableID> = NonNullable<GridOptions<ID>['onValueChange']>;
export type GridHighlightedValueChangeHandler<ID extends StableID = StableID> = NonNullable<GridOptions<ID>['onHighlightedValueChange']>;
export type GridEditModeChangeHandler<ID extends StableID = StableID> = NonNullable<GridOptions<ID>['onEditModeChange']>;
export type GridEditStartHandler<ID extends StableID = StableID> = NonNullable<GridOptions<ID>['onEditStart']>;
export type GridEditCommitHandler<ID extends StableID = StableID> = NonNullable<GridOptions<ID>['onEditCommit']>;
export type GridEditCancelHandler<ID extends StableID = StableID> = NonNullable<GridOptions<ID>['onEditCancel']>;
export type GridUpdateHandler<ID extends StableID = StableID> = NonNullable<GridOptions<ID>['onUpdate']>;
export interface GridControlledValues<ID extends StableID = StableID> { readonly value?: ID | null; readonly highlightedValue?: ID | null; readonly editMode?: GridEditMode }
export interface GridCellAttributes { readonly disabled?: boolean }
export interface GridConnection<ID extends StableID = StableID> {
  readonly grid: Grid<ID>;
  getSnapshot(): RevisionSnapshot<GridState<ID>>;
  syncControlledValues(values: GridControlledValues<ID>): Result<RevisionSnapshot<GridState<ID>>>;
  /** Register or update one cell; pass undefined to release its host and per-cell disabled state. */
  setCellAttributes(element: HTMLElement | undefined, id: ID, attributes?: GridCellAttributes): void;
  handleEvent(event: GridEvent<ID>): boolean;
  focusCurrent(): void;
  disconnect(): void;
}

export function createGridControl<ID extends StableID>(options: GridOptions<ID>): FacadeConnection<GridConnection<ID>> {
  return unwrap(tryCreateGridControl(options));
}

export function tryCreateGridControl<ID extends StableID>(options: GridOptions<ID>): Result<FacadeConnection<GridConnection<ID>>> {
  return createFacadeConnection(options, (options) => tryCreateGridControlConnection(options));
}

function tryCreateGridControlConnection<ID extends StableID>(options: GridOptions<ID>): Result<GridConnection<ID>> {
  const grid = tryCreateGrid(options.rows, options); if (!grid.ok) return grid;
  const disabled = new Set(options.disabledItems ?? []);
  const itemDisabled = new Set<ID>();
  for (const id of disabled) if (grid.value.positionOf(id) === null) return { ok: false, error: { class: 'construction', code: 'disabled-item-outside-domain', message: 'Every disabled grid cell must exist in the grid.', details: { id } } };
  const suppliedEligibility = options.policies?.eligible;
  const policies: GridPolicies<ID> = { ...options.policies, eligible: (id) => !disabled.has(id) && !itemDisabled.has(id) && (suppliedEligibility?.(id) ?? true) };
  const valueControlled = options.value !== undefined; const highlightControlled = options.highlightedValue !== undefined; const editControlled = options.editMode !== undefined;
  const selected = options.value !== undefined ? options.value : options.defaultValue ?? null;
  const runtime = createSemanticController<GridState<ID>, GridEvent<ID>, GridCommand<ID>, GridCommand<ID>>({
    initial: tryCreateGridState(grid.value, { current: options.highlightedValue !== undefined ? options.highlightedValue : options.defaultHighlightedValue ?? null, selected: selected === null ? [] : [selected], anchor: selected, editMode: options.editMode ?? options.defaultEditMode ?? 'navigation' }),
    reducer: (state, event) => applyGridEvent(grid.value, state, event, policies),
    reconcile: (previous, proposed) => tryCreateGridState(grid.value, { current: highlightControlled ? previous.cursor.current : proposed.cursor.current, selected: valueControlled ? previous.selection.selected : proposed.selection.selected, anchor: valueControlled ? previous.selection.anchor : proposed.selection.anchor, editMode: editControlled ? previous.editMode : proposed.editMode }),
    notify: [
      (previous, proposed) => { const before = previous.selection.selected[0] ?? null; const after = proposed.selection.selected[0] ?? null; if (before !== after) options.onValueChange?.(after); },
      (previous, proposed) => { if (previous.cursor.current !== proposed.cursor.current) options.onHighlightedValueChange?.(proposed.cursor.current); },
      (previous, proposed) => { if (previous.editMode !== proposed.editMode) options.onEditModeChange?.(proposed.editMode); },
    ],
    toEffect: (command) => command,
    interaction: options,
    interactionIntent: gridIntent,
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new DOMGrid(options, grid.value, runtime.value, disabled, itemDisabled, valueControlled, highlightControlled, editControlled) };
}

class DOMGrid<ID extends StableID> implements GridConnection<ID> {
  public readonly grid: Grid<ID>; readonly #options: GridOptions<ID>; readonly #runtime: SemanticController<GridState<ID>, GridEvent<ID>, GridCommand<ID>>; readonly #elements = new Map<ID, HTMLElement>();
  readonly #elementOwners = new WeakMap<HTMLElement, ID>();
  readonly #focusEntry: DOMCompositeFocusEntry<ID>;
  #active = true;
  #projectedCurrent: ID | null;
  #projectedValue: ID | null;
  readonly #disabled: ReadonlySet<ID>; readonly #itemDisabled: Set<ID>; readonly #valueControlled: boolean; readonly #highlightControlled: boolean; readonly #editControlled: boolean;
  readonly #keydown: (event: KeyboardEvent) => void; readonly #click: (event: MouseEvent) => void; readonly #focus: (event: FocusEvent) => void;
  public constructor(options: GridOptions<ID>, grid: Grid<ID>, runtime: SemanticController<GridState<ID>, GridEvent<ID>, GridCommand<ID>>, disabled: ReadonlySet<ID>, itemDisabled: Set<ID>, valueControlled: boolean, highlightControlled: boolean, editControlled: boolean) {
    this.#options = options; this.grid = grid; this.#runtime = runtime;
    this.#disabled = disabled; this.#itemDisabled = itemDisabled; this.#valueControlled = valueControlled; this.#highlightControlled = highlightControlled; this.#editControlled = editControlled;
    const state = runtime.getSnapshot().state;
    this.#focusEntry = new DOMCompositeFocusEntry({
      mode: 'root', root: options.root, current: state.cursor.current, rootEnabled: options.disabled !== true,
    });
    this.#projectedCurrent = state.cursor.current;
    this.#projectedValue = state.selection.selected[0] ?? null;
    this.#keydown = (event) => { const semantic = toGridEvent(event, this.getSnapshot().state.editMode); if (semantic !== null && this.handleEvent(semantic)) event.preventDefault(); };
    this.#click = (event) => { const id = this.#findID(event.target); if (id !== null) this.handleEvent({ type: 'select', id }); };
    this.#focus = (event) => { const id = this.#findID(event.target); if (id === null || id === this.getSnapshot().state.cursor.current) return; const result = this.#runtime.handle({ type: 'focus', id }); if (result.ok) this.#projectTransition(); queueMicrotask(() => { if (!this.#active) return; this.#options.onUpdate?.(); this.focusCurrent(); }); };
    options.root.addEventListener('keydown', this.#keydown); options.root.addEventListener('click', this.#click); options.root.addEventListener('focusin', this.#focus);
    options.root.setAttribute('role', 'grid'); options.root.setAttribute('aria-rowcount', String(grid.rowCount)); options.root.setAttribute('aria-colcount', String(grid.columnCount)); if (options.label !== undefined) options.root.setAttribute('aria-label', options.label);
    setInteractionAttributes(options.root, options, { readOnly: true });
  }
  public getSnapshot(): RevisionSnapshot<GridState<ID>> { return this.#runtime.getSnapshot(); }
  public syncControlledValues(values: GridControlledValues<ID>): Result<RevisionSnapshot<GridState<ID>>> {
    if (this.#valueControlled !== (values.value !== undefined) || this.#highlightControlled !== (values.highlightedValue !== undefined) || this.#editControlled !== (values.editMode !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled grid values must preserve their construction-time shape.' } };
    const current = this.getSnapshot().state; const selected = values.value === undefined ? current.selection.selected : values.value === null ? [] : [values.value];
    const result = this.#runtime.replace(tryCreateGridState(this.grid, { current: values.highlightedValue === undefined ? current.cursor.current : values.highlightedValue, selected, anchor: values.value === undefined ? current.selection.anchor : values.value, editMode: values.editMode ?? current.editMode })); if (result.ok) { this.#projectTransition(); this.#options.onUpdate?.(); this.focusCurrent(); } return result;
  }
  public setCellAttributes(element: HTMLElement | undefined, id: ID, attributes?: GridCellAttributes): void {
    if (!this.#active || this.grid.positionOf(id) === null) return;
    const current = this.#elements.get(id);
    const disabled = element !== undefined && attributes?.disabled === true;
    if (current === element && this.#itemDisabled.has(id) === disabled) return;
    if (current !== undefined && current !== element) this.#releaseCell(id, current);
    if (element === undefined) return;
    const owner = this.#elementOwners.get(element);
    if (owner !== undefined && owner !== id && this.#elements.get(owner) === element) this.#releaseCell(owner, element);
    if (disabled) this.#itemDisabled.add(id);
    else this.#itemDisabled.delete(id);
    this.#elements.set(id, element);
    this.#elementOwners.set(element, id);
    this.#projectCell(id, element);
  }
  public handleEvent(event: GridEvent<ID>): boolean { const result = this.#runtime.handle(event); if (result.ok) { for (const command of result.commands) { if (command.type === 'focus') this.#elements.get(command.id)?.focus(); else if (command.type === 'begin-edit') this.#options.onEditStart?.(command.id); else if (command.type === 'commit-edit') this.#options.onEditCommit?.(command.id); else this.#options.onEditCancel?.(command.id); } this.#projectTransition(); this.#options.onUpdate?.(); this.focusCurrent(); } return result.ok; }
  public focusCurrent(): void { queueMicrotask(() => { if (!this.#active) return; const current = this.getSnapshot().state.cursor.current; if (current === null) this.#options.root.focus(); else this.#elements.get(current)?.focus(); }); }
  public disconnect(): void {
    this.#active = false;
    this.#options.root.removeEventListener('keydown', this.#keydown);
    this.#options.root.removeEventListener('click', this.#click);
    this.#options.root.removeEventListener('focusin', this.#focus);
    this.#focusEntry.disconnect();
    this.#elements.clear();
    this.#itemDisabled.clear();
    this.#projectedCurrent = null;
    this.#projectedValue = null;
  }
  #releaseCell(id: ID, element: HTMLElement): void {
    this.#focusEntry.release(id, element);
    this.#elements.delete(id);
    if (this.#elementOwners.get(element) === id) this.#elementOwners.delete(element);
    this.#itemDisabled.delete(id);
  }
  #findID(target: EventTarget | null): ID | null {
    // Follow the light-DOM target ancestry, including text nodes, without a cell scan.
    let node = target as Node | null;
    while (node != null) {
      const element = node as HTMLElement;
      const id = this.#elementOwners.get(element);
      if (id !== undefined && this.#elements.get(id) === element) return id;
      if (node === this.#options.root) break;
      node = node.parentNode;
    }
    return null;
  }
  #projectCell(id: ID, element: HTMLElement): void {
    const position = this.grid.positionOf(id);
    if (position === null) return;
    const state = this.getSnapshot().state;
    element.setAttribute('role', 'gridcell');
    element.setAttribute('aria-rowindex', String(position.row + 1));
    element.setAttribute('aria-colindex', String(position.column + 1));
    element.setAttribute('aria-selected', String(state.selection.has(id)));
    if (this.#disabled.has(id) || this.#itemDisabled.has(id)) element.setAttribute('aria-disabled', 'true');
    else element.removeAttribute('aria-disabled');
    this.#focusEntry.bind(element, id, {
      available: this.#options.disabled !== true && !this.#disabled.has(id) && !this.#itemDisabled.has(id),
    });
  }
  #projectTransition(): void {
    const state = this.getSnapshot().state;
    const current = state.cursor.current;
    // Core's Grid selection is single-valued, including controlled replacements.
    const value = state.selection.selected[0] ?? null;
    const previousCurrent = this.#projectedCurrent;
    const previousValue = this.#projectedValue;
    this.#projectedCurrent = current;
    this.#projectedValue = value;
    if (previousCurrent !== current) this.#focusEntry.setCurrent(current);
    if (previousValue !== value) {
      if (previousValue !== null) this.#elements.get(previousValue)?.setAttribute('aria-selected', 'false');
      if (value !== null) this.#elements.get(value)?.setAttribute('aria-selected', 'true');
    }
  }
}

function gridIntent<ID extends StableID>(event: GridEvent<ID>): 'navigate' | 'mutate' {
  const type = typeof event === 'object' ? event.type : event;
  return type === 'select' || type === 'start-edit' || type === 'commit-edit' || type === 'cancel-edit' ? 'mutate' : 'navigate';
}

function toGridEvent(event: KeyboardEvent, editMode: GridEditMode): Extract<GridEvent, string> | null {
  if (event.isComposing || event.ctrlKey || event.metaKey) return null;
  if (editMode === 'editing') { if (event.key === 'Enter') return 'commit-edit'; if (event.key === 'Escape') return 'cancel-edit'; return null; }
  if (event.altKey) return null; if (event.key === 'ArrowLeft') return 'left'; if (event.key === 'ArrowRight') return 'right'; if (event.key === 'ArrowUp') return 'up'; if (event.key === 'ArrowDown') return 'down'; if (event.key === ' ') return 'select'; if (event.key === 'Enter' || event.key === 'F2') return 'start-edit'; return null;
}
