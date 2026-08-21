import type { Result, SectileError, StableID } from '@sectile/primitives';
import {
  createRevisionSnapshot,
  rejectRevisionInput,
  type RevisionResult,
  type RevisionSnapshot,
} from '@sectile/primitives/revision';
import {
  applyTreeGridEvent,
  createTreeGridState,
  type TreeGridCommand,
  type TreeGridEditMode,
  type TreeGridEvent,
  type TreeGridModel,
  type TreeGridPolicies,
  type TreeGridState,
} from '@sectile/primitives/tree-grid';
import { applyControllerEvent, synchronizeControllerState } from './internal/controller.js';

export interface KeyboardInput {
  readonly key: string;
  readonly altKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly isComposing?: boolean;
}

export type TreeGridEffect<CellID extends StableID = StableID> =
  | { readonly type: 'focus-element'; readonly id: CellID }
  | { readonly type: 'begin-cell-edit'; readonly id: CellID }
  | { readonly type: 'commit-cell-edit'; readonly id: CellID }
  | { readonly type: 'cancel-cell-edit'; readonly id: CellID };

export interface TreeGridValueChangeDetails<CellID extends StableID = StableID> {
  readonly value: CellID | null;
  readonly previousValue: CellID | null;
}

export interface TreeGridExpandedChangeDetails<RowID extends StableID = StableID> {
  readonly value: readonly RowID[];
  readonly previousValue: readonly RowID[];
}

export interface TreeGridHighlightChangeDetails<CellID extends StableID = StableID> {
  readonly value: CellID | null;
  readonly previousValue: CellID | null;
}

export interface TreeGridEditModeChangeDetails {
  readonly value: TreeGridEditMode;
  readonly previousValue: TreeGridEditMode;
}

export interface TreeGridControllerOptions<
  RowID extends StableID = StableID,
  CellID extends StableID = StableID,
> {
  readonly model: TreeGridModel<RowID, CellID>;
  readonly policies?: TreeGridPolicies<CellID>;
  readonly value?: CellID | null;
  readonly defaultValue?: CellID | null;
  readonly expandedValue?: readonly RowID[];
  readonly defaultExpandedValue?: readonly RowID[];
  readonly highlightedValue?: CellID | null;
  readonly defaultHighlightedValue?: CellID | null;
  readonly editMode?: TreeGridEditMode;
  readonly defaultEditMode?: TreeGridEditMode;
  readonly onValueChange?: (change: TreeGridValueChangeDetails<CellID>) => void;
  readonly onExpandedValueChange?: (change: TreeGridExpandedChangeDetails<RowID>) => void;
  readonly onHighlightedValueChange?: (change: TreeGridHighlightChangeDetails<CellID>) => void;
  readonly onEditModeChange?: (change: TreeGridEditModeChangeDetails) => void;
}

export interface TreeGridControlledValues<
  RowID extends StableID = StableID,
  CellID extends StableID = StableID,
> {
  readonly value?: CellID | null;
  readonly expandedValue?: readonly RowID[];
  readonly highlightedValue?: CellID | null;
  readonly editMode?: TreeGridEditMode;
}

export interface TreeGridController<
  RowID extends StableID = StableID,
  CellID extends StableID = StableID,
> {
  getSnapshot(): RevisionSnapshot<TreeGridState<RowID, CellID>>;
  syncControlledValues(
    values: TreeGridControlledValues<RowID, CellID>,
  ): Result<RevisionSnapshot<TreeGridState<RowID, CellID>>>;
  handleKeyboardInput(
    input: KeyboardInput,
    expectedRevision?: number,
  ): RevisionResult<TreeGridState<RowID, CellID>, TreeGridEffect<CellID>>;
}

export interface TreeGridTransitionDetails<
  RowID extends StableID = StableID,
  CellID extends StableID = StableID,
> {
  readonly event: TreeGridEvent;
  readonly result: RevisionResult<TreeGridState<RowID, CellID>, TreeGridEffect<CellID>>;
}

export interface TreeGridConnectionOptions<
  RowID extends StableID = StableID,
  CellID extends StableID = StableID,
> {
  readonly controller: TreeGridController<RowID, CellID>;
  readonly root: HTMLElement;
  readonly getCellValue: (id: CellID) => string;
  readonly setCellValue: (id: CellID, value: string) => void;
  readonly onTransition?: (details: TreeGridTransitionDetails<RowID, CellID>) => void;
  readonly onUpdate?: () => void;
}

export interface TreeGridRowAttributes {
  readonly rowIndex: number;
  readonly level: number;
  readonly expanded?: boolean;
}

export interface TreeGridCellAttributes<CellID extends StableID = StableID> {
  readonly id: CellID;
  readonly columnIndex: number;
}

export interface TreeGridEditorOptions<CellID extends StableID = StableID> {
  readonly id: CellID;
  readonly label?: string;
}

export interface TreeGridConnection<
  RowID extends StableID = StableID,
  CellID extends StableID = StableID,
> {
  getSnapshot(): RevisionSnapshot<TreeGridState<RowID, CellID>>;
  setGridAttributes(rowCount: number, columnCount: number): void;
  setRowAttributes(element: HTMLElement, attributes: TreeGridRowAttributes): void;
  setCellAttributes(
    element: HTMLElement,
    attributes: TreeGridCellAttributes<CellID>,
  ): void;
  bindEditor(element: HTMLInputElement, options: TreeGridEditorOptions<CellID>): void;
  handleKeyboardEvent(event: KeyboardEvent): boolean;
  focusCurrent(): void;
  disconnect(): void;
}

export function createTreeGridController<
  RowID extends StableID,
  CellID extends StableID,
>(
  options: TreeGridControllerOptions<RowID, CellID>,
): Result<TreeGridController<RowID, CellID>> {
  const value = options.value !== undefined ? options.value : options.defaultValue ?? null;
  const initial = createTreeGridState(options.model, {
    selected: value === null ? [] : [value],
    anchor: value,
    expanded: options.expandedValue ?? options.defaultExpandedValue ?? [],
    current: options.highlightedValue !== undefined
      ? options.highlightedValue
      : options.defaultHighlightedValue ?? null,
    editMode: options.editMode ?? options.defaultEditMode ?? 'navigation',
  });
  if (!initial.ok) return initial;
  const snapshot = createRevisionSnapshot(initial.value);
  if (!snapshot.ok) return snapshot;
  return { ok: true, value: new DOMTreeGridController(options, snapshot.value) };
}

export function connectTreeGrid<RowID extends StableID, CellID extends StableID>(
  options: TreeGridConnectionOptions<RowID, CellID>,
): TreeGridConnection<RowID, CellID> {
  return new DOMTreeGridConnection(options);
}

export function toTreeGridEvent(
  input: KeyboardInput,
  editMode: TreeGridEditMode = 'navigation',
): TreeGridEvent | null {
  if (input.isComposing === true) return null;
  if (input.ctrlKey === true || input.metaKey === true) return null;
  if (editMode === 'editing') {
    if (input.altKey === true) return null;
    if (input.key === 'Enter') return 'commit-edit';
    if (input.key === 'Escape') return 'cancel-edit';
    if (input.key === 'F2') return 'start-edit';
    return null;
  }
  if (input.altKey === true) {
    if (input.key === 'ArrowRight') return 'expand';
    if (input.key === 'ArrowLeft') return 'collapse';
    return null;
  }
  if (input.key === 'ArrowLeft') return 'left';
  if (input.key === 'ArrowRight') return 'right';
  if (input.key === 'ArrowUp') return 'up';
  if (input.key === 'ArrowDown') return 'down';
  if (input.key === ' ') return 'select';
  if (input.key === 'Enter' || input.key === 'F2') return 'start-edit';
  return null;
}

export function toTreeGridEffect<CellID extends StableID>(
  command: TreeGridCommand<CellID>,
): TreeGridEffect<CellID> {
  if (command.type === 'focus') {
    return Object.freeze({ type: 'focus-element', id: command.id });
  }
  if (command.type === 'begin-edit') {
    return Object.freeze({ type: 'begin-cell-edit', id: command.id });
  }
  if (command.type === 'commit-edit') {
    return Object.freeze({ type: 'commit-cell-edit', id: command.id });
  }
  return Object.freeze({ type: 'cancel-cell-edit', id: command.id });
}

class DOMTreeGridConnection<RowID extends StableID, CellID extends StableID>
  implements TreeGridConnection<RowID, CellID> {
  readonly #controller: TreeGridController<RowID, CellID>;
  readonly #root: HTMLElement;
  readonly #getCellValue: (id: CellID) => string;
  readonly #setCellValue: (id: CellID, value: string) => void;
  readonly #onTransition:
    | ((details: TreeGridTransitionDetails<RowID, CellID>) => void)
    | undefined;
  readonly #onUpdate: (() => void) | undefined;
  readonly #handleKeydown: (event: KeyboardEvent) => void;
  #editBaseline: { readonly id: CellID; readonly value: string } | null = null;
  #composing = false;
  #commitAfterComposition = false;

  public constructor(options: TreeGridConnectionOptions<RowID, CellID>) {
    this.#controller = options.controller;
    this.#root = options.root;
    this.#getCellValue = options.getCellValue;
    this.#setCellValue = options.setCellValue;
    this.#onTransition = options.onTransition;
    this.#onUpdate = options.onUpdate;
    this.#handleKeydown = (event): void => {
      if (this.handleKeyboardEvent(event)) event.preventDefault();
    };
    this.#root.addEventListener('keydown', this.#handleKeydown);
  }

  public getSnapshot(): RevisionSnapshot<TreeGridState<RowID, CellID>> {
    return this.#controller.getSnapshot();
  }

  public setGridAttributes(rowCount: number, columnCount: number): void {
    this.#root.setAttribute('role', 'treegrid');
    this.#root.setAttribute('aria-rowcount', String(rowCount));
    this.#root.setAttribute('aria-colcount', String(columnCount));
  }

  public setRowAttributes(element: HTMLElement, attributes: TreeGridRowAttributes): void {
    element.setAttribute('role', 'row');
    element.setAttribute('aria-rowindex', String(attributes.rowIndex));
    element.setAttribute('aria-level', String(attributes.level));
    if (attributes.expanded === undefined) {
      element.removeAttribute('aria-expanded');
    } else {
      element.setAttribute('aria-expanded', String(attributes.expanded));
    }
  }

  public setCellAttributes(
    element: HTMLElement,
    attributes: TreeGridCellAttributes<CellID>,
  ): void {
    const state = this.#controller.getSnapshot().state;
    const current = state.cursor.current === attributes.id;
    element.dataset['cellId'] = String(attributes.id);
    element.tabIndex = current ? 0 : -1;
    element.setAttribute('role', 'gridcell');
    element.setAttribute('aria-colindex', String(attributes.columnIndex));
    element.setAttribute('aria-selected', String(state.selection.has(attributes.id)));
  }

  public bindEditor(element: HTMLInputElement, options: TreeGridEditorOptions<CellID>): void {
    element.value = this.#getCellValue(options.id);
    element.setAttribute('aria-label', options.label ?? `Edit ${String(options.id)}`);
    element.addEventListener('input', (): void => {
      this.#setCellValue(options.id, element.value);
    });
    element.addEventListener('compositionstart', (): void => {
      this.#composing = true;
      this.#commitAfterComposition = false;
    });
    element.addEventListener('compositionend', (): void => {
      this.#composing = false;
      if (!this.#commitAfterComposition) return;
      this.#commitAfterComposition = false;
      setTimeout((): void => {
        if (this.#controller.getSnapshot().state.editMode !== 'editing') return;
        this.#dispatchKeyboardInput({ key: 'Enter' });
      }, 0);
    });
  }

  public handleKeyboardEvent(event: KeyboardEvent): boolean {
    const isComposing = event.isComposing || this.#composing;
    if (
      isComposing
      && event.key === 'Enter'
      && this.#controller.getSnapshot().state.editMode === 'editing'
    ) {
      this.#commitAfterComposition = true;
    }
    return this.#dispatchKeyboardInput({
      key: event.key,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      isComposing,
    });
  }

  public focusCurrent(): void {
    queueMicrotask((): void => {
      const current = this.#controller.getSnapshot().state.cursor.current;
      if (current === null) {
        this.#root.focus();
        return;
      }
      for (const element of this.#root.querySelectorAll<HTMLElement>('[data-cell-id]')) {
        if (element.dataset['cellId'] !== String(current)) continue;
        const input = element.querySelector<HTMLInputElement>('input');
        if (input !== null) {
          input.focus();
          input.select();
        } else {
          element.focus();
        }
        return;
      }
    });
  }

  public disconnect(): void {
    this.#root.removeEventListener('keydown', this.#handleKeydown);
  }

  #dispatchKeyboardInput(input: KeyboardInput): boolean {
    const event = toTreeGridEvent(input, this.#controller.getSnapshot().state.editMode);
    if (event === null) return false;
    const result = this.#controller.handleKeyboardInput(input);
    if (result.ok) this.#applyEffects(result.commands);
    this.#onTransition?.(Object.freeze({ event, result }));
    this.#onUpdate?.();
    this.focusCurrent();
    return true;
  }

  #applyEffects(effects: readonly TreeGridEffect<CellID>[]): void {
    for (const effect of effects) {
      if (effect.type === 'begin-cell-edit') {
        this.#editBaseline = Object.freeze({
          id: effect.id,
          value: this.#getCellValue(effect.id),
        });
      } else if (effect.type === 'cancel-cell-edit') {
        if (this.#editBaseline?.id === effect.id) {
          this.#setCellValue(effect.id, this.#editBaseline.value);
        }
        this.#editBaseline = null;
      } else if (effect.type === 'commit-cell-edit') {
        this.#editBaseline = null;
      }
    }
  }
}

class DOMTreeGridController<RowID extends StableID, CellID extends StableID>
  implements TreeGridController<RowID, CellID> {
  readonly #model: TreeGridModel<RowID, CellID>;
  readonly #policies: TreeGridPolicies<CellID>;
  readonly #valueControlled: boolean;
  readonly #expandedControlled: boolean;
  readonly #highlightControlled: boolean;
  readonly #editModeControlled: boolean;
  readonly #onValueChange:
    | ((change: TreeGridValueChangeDetails<CellID>) => void)
    | undefined;
  readonly #onExpandedValueChange:
    | ((change: TreeGridExpandedChangeDetails<RowID>) => void)
    | undefined;
  readonly #onHighlightedValueChange:
    | ((change: TreeGridHighlightChangeDetails<CellID>) => void)
    | undefined;
  readonly #onEditModeChange:
    | ((change: TreeGridEditModeChangeDetails) => void)
    | undefined;
  #snapshot: RevisionSnapshot<TreeGridState<RowID, CellID>>;

  public constructor(
    options: TreeGridControllerOptions<RowID, CellID>,
    snapshot: RevisionSnapshot<TreeGridState<RowID, CellID>>,
  ) {
    this.#model = options.model;
    this.#policies = options.policies ?? {};
    this.#valueControlled = options.value !== undefined;
    this.#expandedControlled = options.expandedValue !== undefined;
    this.#highlightControlled = options.highlightedValue !== undefined;
    this.#editModeControlled = options.editMode !== undefined;
    this.#onValueChange = options.onValueChange;
    this.#onExpandedValueChange = options.onExpandedValueChange;
    this.#onHighlightedValueChange = options.onHighlightedValueChange;
    this.#onEditModeChange = options.onEditModeChange;
    this.#snapshot = snapshot;
  }

  public getSnapshot(): RevisionSnapshot<TreeGridState<RowID, CellID>> {
    return this.#snapshot;
  }

  public syncControlledValues(
    values: TreeGridControlledValues<RowID, CellID>,
  ): Result<RevisionSnapshot<TreeGridState<RowID, CellID>>> {
    const error = controlledInputError(
      this.#valueControlled,
      this.#expandedControlled,
      this.#highlightControlled,
      this.#editModeControlled,
      values,
    );
    if (error !== null) return { ok: false, error };
    const selected = this.#valueControlled
      ? (values.value as CellID | null)
      : selectedValue(this.#snapshot.state);
    const state = createTreeGridState(this.#model, {
      selected: selected === null ? [] : [selected],
      anchor: this.#valueControlled ? selected : this.#snapshot.state.selection.anchor,
      expanded: this.#expandedControlled
        ? (values.expandedValue as readonly RowID[])
        : this.#snapshot.state.expansion.ids,
      current: this.#highlightControlled
        ? (values.highlightedValue as CellID | null)
        : this.#snapshot.state.cursor.current,
      editMode: this.#editModeControlled
        ? (values.editMode as TreeGridEditMode)
        : this.#snapshot.state.editMode,
    });
    const snapshot = synchronizeControllerState(this.#snapshot, state);
    if (!snapshot.ok) return snapshot;
    this.#snapshot = snapshot.value;
    return snapshot;
  }

  public handleKeyboardInput(
    input: KeyboardInput,
    expectedRevision = this.#snapshot.revision,
  ): RevisionResult<TreeGridState<RowID, CellID>, TreeGridEffect<CellID>> {
    const event = toTreeGridEvent(input, this.#snapshot.state.editMode);
    if (event === null) {
      return rejectRevisionInput(this.#snapshot, {
        class: 'transition-rejection',
        code: 'unsupported-dom-key',
        message: 'DOM keyboard input does not map to a tree-grid semantic event.',
        details: { key: input.key },
      });
    }
    const result = applyControllerEvent(
      this.#snapshot,
      expectedRevision,
      event,
      (state, semanticEvent) => applyTreeGridEvent(
        this.#model,
        state,
        semanticEvent,
        this.#policies,
      ),
      (previous, proposed) => controlledState(
        this.#model,
        previous,
        proposed,
        this.#valueControlled,
        this.#expandedControlled,
        this.#highlightControlled,
        this.#editModeControlled,
      ),
      (previous, proposed) => this.#notify(previous, proposed),
      toTreeGridEffect,
    );
    if (result.ok) this.#snapshot = result.snapshot;
    return result;
  }

  #notify(
    previous: TreeGridState<RowID, CellID>,
    proposed: TreeGridState<RowID, CellID>,
  ): void {
    const previousValue = selectedValue(previous);
    const value = selectedValue(proposed);
    if (previousValue !== value) {
      this.#onValueChange?.(Object.freeze({ value, previousValue }));
    }
    if (!sameIDs(previous.expansion.ids, proposed.expansion.ids)) {
      this.#onExpandedValueChange?.(Object.freeze({
        value: proposed.expansion.ids,
        previousValue: previous.expansion.ids,
      }));
    }
    if (previous.cursor.current !== proposed.cursor.current) {
      this.#onHighlightedValueChange?.(Object.freeze({
        value: proposed.cursor.current,
        previousValue: previous.cursor.current,
      }));
    }
    if (previous.editMode !== proposed.editMode) {
      this.#onEditModeChange?.(Object.freeze({
        value: proposed.editMode,
        previousValue: previous.editMode,
      }));
    }
  }
}

function controlledState<RowID extends StableID, CellID extends StableID>(
  model: TreeGridModel<RowID, CellID>,
  previous: TreeGridState<RowID, CellID>,
  proposed: TreeGridState<RowID, CellID>,
  valueControlled: boolean,
  expandedControlled: boolean,
  highlightControlled: boolean,
  editModeControlled: boolean,
): Result<TreeGridState<RowID, CellID>> {
  return createTreeGridState(model, {
    selected: valueControlled ? previous.selection.selected : proposed.selection.selected,
    anchor: valueControlled ? previous.selection.anchor : proposed.selection.anchor,
    expanded: expandedControlled ? previous.expansion.ids : proposed.expansion.ids,
    current: highlightControlled ? previous.cursor.current : proposed.cursor.current,
    editMode: editModeControlled ? previous.editMode : proposed.editMode,
  });
}

function selectedValue<RowID extends StableID, CellID extends StableID>(
  state: TreeGridState<RowID, CellID>,
): CellID | null {
  return state.selection.selected[0] ?? null;
}

function controlledInputError<RowID extends StableID, CellID extends StableID>(
  valueControlled: boolean,
  expandedControlled: boolean,
  highlightControlled: boolean,
  editModeControlled: boolean,
  values: TreeGridControlledValues<RowID, CellID>,
): SectileError | null {
  return fieldError(valueControlled, values.value !== undefined, 'value', 'tree-grid selection')
    ?? fieldError(
      expandedControlled,
      values.expandedValue !== undefined,
      'expanded-value',
      'tree-grid expansion',
    )
    ?? fieldError(
      highlightControlled,
      values.highlightedValue !== undefined,
      'highlighted-value',
      'tree-grid highlight',
    )
    ?? fieldError(
      editModeControlled,
      values.editMode !== undefined,
      'edit-mode',
      'tree-grid edit mode',
    );
}

function fieldError(
  controlled: boolean,
  provided: boolean,
  codeName: string,
  label: string,
): SectileError | null {
  if (controlled === provided) return null;
  return {
    class: 'construction',
    code: controlled ? `controlled-${codeName}-required` : `uncontrolled-${codeName}-update`,
    message: controlled
      ? `Controlled ${label} sync requires its external value.`
      : `Uncontrolled ${label} cannot be synchronized externally.`,
  };
}

function sameIDs<ID extends StableID>(left: readonly ID[], right: readonly ID[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}
