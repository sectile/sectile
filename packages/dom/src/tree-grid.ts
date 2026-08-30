import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { controlledFieldError as fieldError } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, SectileError, StableID } from '@sectile/core';
import {
  tryCreateInteractionState,
  requireInteraction,
  type InteractionState,
} from '@sectile/core/interaction';
import {
  tryCreateRevisionSnapshot,
  rejectRevisionInput,
  type RevisionResult,
  type RevisionSnapshot,
} from '@sectile/core/revision';
import {
  applyTreeGridEvent,
  tryCreateTreeGridModelFromRows,
  tryCreateTreeGridState,
  type TreeGridCommand,
  type TreeGridEditMode,
  type TreeGridEvent,
  type TreeGridModel,
  type TreeGridPolicies,
  type TreeGridRowInput,
  type TreeGridState,
} from '@sectile/core/tree-grid';
import { applyControllerEvent, synchronizeControllerState } from '@sectile/core/adapter-runtime';
import { findDelegatedStableID } from './internal/delegated-event.js';
import { stableIDToken } from './internal/stable-id-token.js';
import { setInteractionAttributes } from './internal/interaction.js';

export type {
  TreeGridEditMode,
  TreeGridPolicies,
  TreeGridRowInput,
} from '@sectile/core/tree-grid';

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
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
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

export type TreeGridControllerValueChangeHandler<RowID extends StableID = StableID, CellID extends StableID = StableID> = NonNullable<TreeGridControllerOptions<RowID, CellID>['onValueChange']>;
export type TreeGridControllerExpandedValueChangeHandler<RowID extends StableID = StableID, CellID extends StableID = StableID> = NonNullable<TreeGridControllerOptions<RowID, CellID>['onExpandedValueChange']>;
export type TreeGridControllerHighlightedValueChangeHandler<RowID extends StableID = StableID, CellID extends StableID = StableID> = NonNullable<TreeGridControllerOptions<RowID, CellID>['onHighlightedValueChange']>;
export type TreeGridControllerEditModeChangeHandler<RowID extends StableID = StableID, CellID extends StableID = StableID> = NonNullable<TreeGridControllerOptions<RowID, CellID>['onEditModeChange']>;

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
  readonly model: TreeGridModel<RowID, CellID>;
  getSnapshot(): RevisionSnapshot<TreeGridState<RowID, CellID>>;
  syncControlledValues(
    values: TreeGridControlledValues<RowID, CellID>,
  ): Result<RevisionSnapshot<TreeGridState<RowID, CellID>>>;
  handleKeyboardInput(
    input: KeyboardInput,
    expectedRevision?: number,
  ): RevisionResult<TreeGridState<RowID, CellID>, TreeGridEffect<CellID>>;
  handleEvent(
    event: TreeGridEvent<RowID, CellID>,
    expectedRevision?: number,
  ): RevisionResult<TreeGridState<RowID, CellID>, TreeGridEffect<CellID>>;
}

export interface TreeGridTransitionDetails<
  RowID extends StableID = StableID,
  CellID extends StableID = StableID,
> {
  readonly event: TreeGridEvent<RowID, CellID>;
  readonly result: RevisionResult<TreeGridState<RowID, CellID>, TreeGridEffect<CellID>>;
}

export interface TreeGridConnectionOptions<
  RowID extends StableID = StableID,
  CellID extends StableID = StableID,
> {
  readonly controller: TreeGridController<RowID, CellID>;
  readonly root: HTMLElement;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly getCellValue: (id: CellID) => string;
  readonly setCellValue: (id: CellID, value: string) => void;
  readonly onTransition?: (details: TreeGridTransitionDetails<RowID, CellID>) => void;
  readonly onUpdate?: () => void;
}

export type TreeGridConnectionCellValueResolver<RowID extends StableID = StableID, CellID extends StableID = StableID> = NonNullable<TreeGridConnectionOptions<RowID, CellID>['getCellValue']>;
export type TreeGridConnectionCellValueSetter<RowID extends StableID = StableID, CellID extends StableID = StableID> = NonNullable<TreeGridConnectionOptions<RowID, CellID>['setCellValue']>;
export type TreeGridConnectionTransitionHandler<RowID extends StableID = StableID, CellID extends StableID = StableID> = NonNullable<TreeGridConnectionOptions<RowID, CellID>['onTransition']>;
export type TreeGridConnectionUpdateHandler<RowID extends StableID = StableID, CellID extends StableID = StableID> = NonNullable<TreeGridConnectionOptions<RowID, CellID>['onUpdate']>;

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
  readonly model: TreeGridModel<RowID, CellID>;
  getSnapshot(): RevisionSnapshot<TreeGridState<RowID, CellID>>;
  syncControlledValues(
    values: TreeGridControlledValues<RowID, CellID>,
  ): Result<RevisionSnapshot<TreeGridState<RowID, CellID>>>;
  setGridAttributes(rowCount: number, columnCount: number): void;
  setRowAttributes(element: HTMLElement, attributes: TreeGridRowAttributes): void;
  setCellAttributes(
    element: HTMLElement,
    attributes: TreeGridCellAttributes<CellID>,
  ): void;
  setDisclosureAttributes(element: HTMLElement, id: RowID): void;
  bindEditor(element: HTMLInputElement, options: TreeGridEditorOptions<CellID>): void;
  handleEvent(event: TreeGridEvent<RowID, CellID>): boolean;
  handleKeyboardEvent(event: KeyboardEvent): boolean;
  focusCurrent(): void;
  disconnect(): void;
}

export type TreeGridOptions<
  RowID extends StableID = StableID,
  CellID extends StableID = StableID,
> = Omit<TreeGridControllerOptions<RowID, CellID>, 'model'>
  & Omit<TreeGridConnectionOptions<RowID, CellID>, 'controller'>
  & { readonly rows: readonly TreeGridRowInput<RowID, CellID>[] };

export function createTreeGridController<
  RowID extends StableID,
  CellID extends StableID,
>(
  options: TreeGridControllerOptions<RowID, CellID>,
): Result<TreeGridController<RowID, CellID>> {
  const value = options.value !== undefined ? options.value : options.defaultValue ?? null;
  const initial = tryCreateTreeGridState(options.model, {
    selected: value === null ? [] : [value],
    anchor: value,
    expanded: options.expandedValue ?? options.defaultExpandedValue ?? [],
    current: options.highlightedValue !== undefined
      ? options.highlightedValue
      : options.defaultHighlightedValue ?? null,
    editMode: options.editMode ?? options.defaultEditMode ?? 'navigation',
  });
  if (!initial.ok) return initial;
  const snapshot = tryCreateRevisionSnapshot(initial.value);
  if (!snapshot.ok) return snapshot;
  const interaction = tryCreateInteractionState(options);
  if (!interaction.ok) return interaction;
  return { ok: true, value: new DOMTreeGridController(options, snapshot.value, interaction.value) };
}

export function createTreeGrid<RowID extends StableID, CellID extends StableID>(
  options: TreeGridOptions<RowID, CellID>,
): FacadeConnection<TreeGridConnection<RowID, CellID>> {
  return unwrap(tryCreateTreeGrid(options));
}

export function tryCreateTreeGrid<RowID extends StableID, CellID extends StableID>(
  options: TreeGridOptions<RowID, CellID>,
): Result<FacadeConnection<TreeGridConnection<RowID, CellID>>> {
  return createFacadeConnection(options, (options) => tryCreateTreeGridConnection(options));
}

function tryCreateTreeGridConnection<RowID extends StableID, CellID extends StableID>(
  options: TreeGridOptions<RowID, CellID>,
): Result<TreeGridConnection<RowID, CellID>> {
  const model = tryCreateTreeGridModelFromRows(options.rows);
  if (!model.ok) return model;
  const controller = createTreeGridController({ ...options, model: model.value });
  if (!controller.ok) return controller;
  return { ok: true, value: connectTreeGrid({ ...options, controller: controller.value }) };
}

export function connectTreeGrid<RowID extends StableID, CellID extends StableID>(
  options: TreeGridConnectionOptions<RowID, CellID>,
): TreeGridConnection<RowID, CellID> {
  return new DOMTreeGridConnection(options);
}

export function toTreeGridEvent<
  RowID extends StableID = StableID,
  CellID extends StableID = StableID,
>(
  input: KeyboardInput,
  editMode: TreeGridEditMode = 'navigation',
): TreeGridEvent<RowID, CellID> | null {
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
  public readonly model: TreeGridModel<RowID, CellID>;
  readonly #controller: TreeGridController<RowID, CellID>;
  readonly #root: HTMLElement;
  readonly #getCellValue: (id: CellID) => string;
  readonly #setCellValue: (id: CellID, value: string) => void;
  readonly #onTransition:
    | ((details: TreeGridTransitionDetails<RowID, CellID>) => void)
    | undefined;
  readonly #onUpdate: (() => void) | undefined;
  readonly #disabled: boolean;
  readonly #readOnly: boolean;
  readonly #handleKeydown: (event: KeyboardEvent) => void;
  readonly #handleClick: (event: MouseEvent) => void;
  readonly #handleDoubleClick: (event: MouseEvent) => void;
  readonly #editors = new Map<HTMLInputElement, {
    readonly input: () => void;
    readonly compositionStart: () => void;
    readonly compositionEnd: () => void;
  }>();
  #lastCellClick: { readonly id: CellID; readonly time: number } | null = null;
  #editBaseline: { readonly id: CellID; readonly value: string } | null = null;
  #composing = false;
  #commitAfterComposition = false;
  #active = true;
  #compositionCommitTimer: ReturnType<typeof setTimeout> | null = null;

  public constructor(options: TreeGridConnectionOptions<RowID, CellID>) {
    this.#controller = options.controller;
    this.model = options.controller.model;
    this.#root = options.root;
    this.#getCellValue = options.getCellValue;
    this.#setCellValue = options.setCellValue;
    this.#onTransition = options.onTransition;
    this.#onUpdate = options.onUpdate;
    this.#disabled = options.disabled === true;
    this.#readOnly = options.readOnly === true;
    setInteractionAttributes(this.#root, options, { readOnly: true });
    this.#handleKeydown = (event): void => {
      if (this.handleKeyboardEvent(event)) event.preventDefault();
    };
    this.#handleClick = (event): void => {
      const disclosureID = findDelegatedStableID(event.target, this.#root, 'treeGridDisclosureId');
      if (disclosureID !== null) {
        const id = disclosureID as RowID;
        const expanded = this.#controller.getSnapshot().state.expansion.has(id);
        this.handleEvent({ type: 'set-expanded', id, open: !expanded });
        return;
      }
      const id = findDelegatedStableID(event.target, this.#root, 'cellId');
      if (id === null || this.#controller.getSnapshot().state.editMode === 'editing') return;
      const cellID = id as CellID;
      const time = Number.isFinite(event.timeStamp) ? event.timeStamp : Date.now();
      if (
        this.#lastCellClick?.id === cellID
        && time - this.#lastCellClick.time >= 0
        && time - this.#lastCellClick.time <= 500
      ) {
        this.#lastCellClick = null;
        this.handleEvent({ type: 'start-edit', id: cellID });
        return;
      }
      this.#lastCellClick = Object.freeze({ id: cellID, time });
      this.handleEvent({ type: 'select', id: cellID });
    };
    this.#handleDoubleClick = (event): void => {
      const id = findDelegatedStableID(event.target, this.#root, 'cellId');
      const state = this.#controller.getSnapshot().state;
      if (id !== null && !(state.editMode === 'editing' && state.cursor.current === id)) {
        this.handleEvent({ type: 'start-edit', id: id as CellID });
      }
    };
    this.#root.addEventListener('keydown', this.#handleKeydown);
    this.#root.addEventListener('click', this.#handleClick);
    this.#root.addEventListener('dblclick', this.#handleDoubleClick);
  }

  public getSnapshot(): RevisionSnapshot<TreeGridState<RowID, CellID>> {
    return this.#controller.getSnapshot();
  }

  public syncControlledValues(
    values: TreeGridControlledValues<RowID, CellID>,
  ): Result<RevisionSnapshot<TreeGridState<RowID, CellID>>> {
    const result = this.#controller.syncControlledValues(values);
    if (result.ok) {
      this.#onUpdate?.();
      this.focusCurrent();
    }
    return result;
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
    element.dataset['cellId'] = stableIDToken(attributes.id);
    element.tabIndex = current ? 0 : -1;
    element.setAttribute('role', 'gridcell');
    element.setAttribute('aria-colindex', String(attributes.columnIndex));
    element.setAttribute('aria-selected', String(state.selection.has(attributes.id)));
  }

  public setDisclosureAttributes(element: HTMLElement, id: RowID): void {
    element.dataset['treeGridDisclosureId'] = stableIDToken(id);
    element.setAttribute('aria-hidden', 'true');
  }

  public bindEditor(element: HTMLInputElement, options: TreeGridEditorOptions<CellID>): void {
    const previous = this.#editors.get(element);
    if (previous !== undefined) {
      element.removeEventListener('input', previous.input);
      element.removeEventListener('compositionstart', previous.compositionStart);
      element.removeEventListener('compositionend', previous.compositionEnd);
    }
    setInteractionAttributes(element, {
      disabled: this.#disabled,
      readOnly: this.#readOnly,
    }, { readOnly: true, native: true });
    element.value = this.#getCellValue(options.id);
    element.setAttribute('aria-label', options.label ?? `Edit ${String(options.id)}`);
    const input = (): void => {
      this.#setCellValue(options.id, element.value);
    };
    const compositionStart = (): void => {
      this.#composing = true;
      this.#commitAfterComposition = false;
    };
    const compositionEnd = (): void => {
      this.#composing = false;
      if (!this.#commitAfterComposition) return;
      this.#commitAfterComposition = false;
      if (this.#compositionCommitTimer !== null) clearTimeout(this.#compositionCommitTimer);
      this.#compositionCommitTimer = setTimeout((): void => {
        this.#compositionCommitTimer = null;
        if (!this.#active) return;
        if (this.#controller.getSnapshot().state.editMode !== 'editing') return;
        this.#dispatchKeyboardInput({ key: 'Enter' });
      }, 0);
    };
    element.addEventListener('input', input);
    element.addEventListener('compositionstart', compositionStart);
    element.addEventListener('compositionend', compositionEnd);
    this.#editors.set(element, { input, compositionStart, compositionEnd });
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
      if (!this.#active) return;
      const current = this.#controller.getSnapshot().state.cursor.current;
      if (current === null) {
        this.#root.focus();
        return;
      }
      for (const element of this.#root.querySelectorAll<HTMLElement>('[data-cell-id]')) {
        if (element.dataset['cellId'] !== stableIDToken(current)) continue;
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
    this.#active = false;
    if (this.#compositionCommitTimer !== null) clearTimeout(this.#compositionCommitTimer);
    this.#compositionCommitTimer = null;
    this.#root.removeEventListener('keydown', this.#handleKeydown);
    this.#root.removeEventListener('click', this.#handleClick);
    this.#root.removeEventListener('dblclick', this.#handleDoubleClick);
    for (const [element, listeners] of this.#editors) {
      element.removeEventListener('input', listeners.input);
      element.removeEventListener('compositionstart', listeners.compositionStart);
      element.removeEventListener('compositionend', listeners.compositionEnd);
    }
    this.#editors.clear();
  }

  #dispatchKeyboardInput(input: KeyboardInput): boolean {
    const event = toTreeGridEvent<RowID, CellID>(
      input,
      this.#controller.getSnapshot().state.editMode,
    );
    if (event === null) return false;
    return this.handleEvent(event);
  }

  public handleEvent(event: TreeGridEvent<RowID, CellID>): boolean {
    const result = this.#controller.handleEvent(event);
    if (result.ok) this.#applyEffects(result.commands);
    this.#onTransition?.(Object.freeze({ event, result }));
    if (result.ok) {
      this.#onUpdate?.();
      this.focusCurrent();
    }
    return result.ok;
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
  public readonly model: TreeGridModel<RowID, CellID>;
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
  readonly #interaction: InteractionState;
  #snapshot: RevisionSnapshot<TreeGridState<RowID, CellID>>;

  public constructor(
    options: TreeGridControllerOptions<RowID, CellID>,
    snapshot: RevisionSnapshot<TreeGridState<RowID, CellID>>,
    interaction: InteractionState,
  ) {
    this.model = options.model;
    this.#policies = options.policies ?? {};
    this.#valueControlled = options.value !== undefined;
    this.#expandedControlled = options.expandedValue !== undefined;
    this.#highlightControlled = options.highlightedValue !== undefined;
    this.#editModeControlled = options.editMode !== undefined;
    this.#onValueChange = options.onValueChange;
    this.#onExpandedValueChange = options.onExpandedValueChange;
    this.#onHighlightedValueChange = options.onHighlightedValueChange;
    this.#onEditModeChange = options.onEditModeChange;
    this.#interaction = interaction;
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
    const state = tryCreateTreeGridState(this.model, {
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
    const event = toTreeGridEvent<RowID, CellID>(input, this.#snapshot.state.editMode);
    if (event === null) {
      return rejectRevisionInput(this.#snapshot, {
        class: 'transition-rejection',
        code: 'unsupported-dom-key',
        message: 'DOM keyboard input does not map to a tree-grid semantic event.',
        details: { key: input.key },
      });
    }
    return this.handleEvent(event, expectedRevision);
  }

  public handleEvent(
    event: TreeGridEvent<RowID, CellID>,
    expectedRevision = this.#snapshot.revision,
  ): RevisionResult<TreeGridState<RowID, CellID>, TreeGridEffect<CellID>> {
    const permitted = requireInteraction(this.#interaction, treeGridIntent(event));
    if (!permitted.ok) return rejectRevisionInput(this.#snapshot, permitted.error);
    const result = applyControllerEvent(
      this.#snapshot,
      expectedRevision,
      event,
      (state, semanticEvent) => applyTreeGridEvent(
        this.model,
        state,
        semanticEvent,
        this.#policies,
      ),
      (previous, proposed) => controlledState(
        this.model,
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

function treeGridIntent<RowID extends StableID, CellID extends StableID>(
  event: TreeGridEvent<RowID, CellID>,
): 'navigate' | 'mutate' {
  const type = typeof event === 'object' ? event.type : event;
  return type === 'select' || type === 'start-edit' || type === 'commit-edit' || type === 'cancel-edit'
    ? 'mutate'
    : 'navigate';
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
  return tryCreateTreeGridState(model, {
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

function sameIDs<ID extends StableID>(left: readonly ID[], right: readonly ID[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}
