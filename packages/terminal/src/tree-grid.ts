import type { Result, SectileError, StableID } from '@sectile/core';
import {
  createInteractionState,
  requireInteraction,
  type InteractionState,
} from '@sectile/core/interaction';
import {
  createRevisionSnapshot,
  rejectRevisionInput,
  type RevisionResult,
  type RevisionSnapshot,
} from '@sectile/core/revision';
import {
  applyTreeGridEvent,
  createTreeGridModelFromRows,
  createTreeGridState,
  type TreeGridCommand,
  type TreeGridEditMode,
  type TreeGridEvent,
  type TreeGridModel,
  type TreeGridPolicies,
  type TreeGridRowInput,
  type TreeGridState,
} from '@sectile/core/tree-grid';
import { applyControllerEvent, synchronizeControllerState } from './internal/controller.js';
import {
  applyTerminalTextInput,
  type TerminalKeyboardInput,
} from './keyboard.js';

export type KeyboardInput = TerminalKeyboardInput;

export type TreeGridEffect<CellID extends StableID = StableID> =
  | { readonly type: 'move-highlight'; readonly id: CellID }
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
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly getCellValue: (id: CellID) => string;
  readonly setCellValue: (id: CellID, value: string) => void;
  readonly onTransition?: (details: TreeGridTransitionDetails<RowID, CellID>) => void;
  readonly onUpdate?: () => void;
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
  handleKeyboardInput(input: KeyboardInput): boolean;
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
  const interaction = createInteractionState(options);
  if (!interaction.ok) return interaction;
  return { ok: true, value: new TerminalTreeGridController(options, snapshot.value, interaction.value) };
}

export function createTreeGrid<RowID extends StableID, CellID extends StableID>(
  options: TreeGridOptions<RowID, CellID>,
): Result<TreeGridConnection<RowID, CellID>> {
  const model = createTreeGridModelFromRows(options.rows);
  if (!model.ok) return model;
  const controller = createTreeGridController({ ...options, model: model.value });
  if (!controller.ok) return controller;
  return { ok: true, value: connectTreeGrid({ ...options, controller: controller.value }) };
}

export function connectTreeGrid<RowID extends StableID, CellID extends StableID>(
  options: TreeGridConnectionOptions<RowID, CellID>,
): TreeGridConnection<RowID, CellID> {
  return new TerminalTreeGridConnection(options);
}

export function toTreeGridEvent<
  RowID extends StableID = StableID,
  CellID extends StableID = StableID,
>(
  input: KeyboardInput,
  editMode: TreeGridEditMode = 'navigation',
): TreeGridEvent<RowID, CellID> | null {
  if (input.ctrlKey === true) return null;
  if (editMode === 'editing') {
    if (input.key === 'enter') return 'commit-edit';
    if (input.key === 'escape') return 'cancel-edit';
    if (input.key === 'edit') return 'start-edit';
    return null;
  }
  if (input.altKey === true && input.key === 'right') return 'expand';
  if (input.altKey === true && input.key === 'left') return 'collapse';
  if (input.key === 'left') return 'left';
  if (input.key === 'right') return 'right';
  if (input.key === 'up') return 'up';
  if (input.key === 'down') return 'down';
  if (input.key === 'expand') return 'expand';
  if (input.key === 'collapse') return 'collapse';
  if (input.key === 'o') return 'expand';
  if (input.key === 'c') return 'collapse';
  if (input.key === 'space') return 'select';
  if (input.key === 'enter' || input.key === 'edit') return 'start-edit';
  return null;
}

class TerminalTreeGridConnection<RowID extends StableID, CellID extends StableID>
  implements TreeGridConnection<RowID, CellID> {
  public readonly model: TreeGridModel<RowID, CellID>;
  readonly #controller: TreeGridController<RowID, CellID>;
  readonly #getCellValue: (id: CellID) => string;
  readonly #setCellValue: (id: CellID, value: string) => void;
  readonly #onTransition:
    | ((details: TreeGridTransitionDetails<RowID, CellID>) => void)
    | undefined;
  readonly #onUpdate: (() => void) | undefined;
  readonly #disabled: boolean;
  readonly #readOnly: boolean;
  #editBaseline: { readonly id: CellID; readonly value: string } | null = null;

  public constructor(options: TreeGridConnectionOptions<RowID, CellID>) {
    this.#controller = options.controller;
    this.model = options.controller.model;
    this.#getCellValue = options.getCellValue;
    this.#setCellValue = options.setCellValue;
    this.#onTransition = options.onTransition;
    this.#onUpdate = options.onUpdate;
    this.#disabled = options.disabled === true;
    this.#readOnly = options.readOnly === true;
  }

  public getSnapshot(): RevisionSnapshot<TreeGridState<RowID, CellID>> {
    return this.#controller.getSnapshot();
  }

  public syncControlledValues(
    values: TreeGridControlledValues<RowID, CellID>,
  ): Result<RevisionSnapshot<TreeGridState<RowID, CellID>>> {
    const result = this.#controller.syncControlledValues(values);
    if (result.ok) this.#onUpdate?.();
    return result;
  }

  public handleKeyboardInput(input: KeyboardInput): boolean {
    const snapshot = this.#controller.getSnapshot();
    if (snapshot.state.editMode === 'editing' && snapshot.state.cursor.current !== null) {
      if (this.#disabled || this.#readOnly) return false;
      const id = snapshot.state.cursor.current;
      const nextValue = applyTerminalTextInput(this.#getCellValue(id), input);
      if (nextValue !== null) {
        this.#setCellValue(id, nextValue);
        this.#onUpdate?.();
        return true;
      }
    }

    const event = toTreeGridEvent<RowID, CellID>(input, snapshot.state.editMode);
    if (event === null) return false;
    const result = this.#controller.handleKeyboardInput(input);
    if (result.ok) this.#applyEffects(result.commands);
    this.#onTransition?.(Object.freeze({ event, result }));
    if (result.ok) this.#onUpdate?.();
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

export function toTreeGridEffect<CellID extends StableID>(
  command: TreeGridCommand<CellID>,
): TreeGridEffect<CellID> {
  if (command.type === 'focus') {
    return Object.freeze({ type: 'move-highlight', id: command.id });
  }
  if (command.type === 'begin-edit') {
    return Object.freeze({ type: 'begin-cell-edit', id: command.id });
  }
  if (command.type === 'commit-edit') {
    return Object.freeze({ type: 'commit-cell-edit', id: command.id });
  }
  return Object.freeze({ type: 'cancel-cell-edit', id: command.id });
}

class TerminalTreeGridController<RowID extends StableID, CellID extends StableID>
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
    const state = createTreeGridState(this.model, {
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
        code: 'unsupported-terminal-key',
        message: 'Terminal keyboard input does not map to a tree-grid semantic event.',
        details: { key: input.key },
      });
    }
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
  return type === 'start-edit' || type === 'commit-edit' || type === 'cancel-edit'
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
