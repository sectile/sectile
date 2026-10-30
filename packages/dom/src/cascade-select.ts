import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result, StableID } from '@sectile/core';
import { tryCreateTree, type Tree, type TreeNodeInput } from '@sectile/core/tree';
import type { RevisionSnapshot } from '@sectile/core/revision';
import {
  applyCascadeSelectEvent, tryCreateCascadeSelectState, getCascadeSelectColumns,
  getCascadeSelectValuePath, type CascadeSelectCommand, type CascadeSelectEvent,
  type CascadeSelectPolicies, type CascadeSelectState,
} from '@sectile/core/cascade-select';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';
import { createDOMLayerBinding, type DOMLayerBinding, type DOMLayerReparentErrorCode, type DOMLayerPresentationListener, type DOMLayerPresentationSubscription } from './overlay/layer/binding.js';
import {
  createDOMCascadeChoiceBinding,
  type DOMCascadeChoiceBinding,
} from './choice/cascade-binding.js';
import {
  createPosition,
  manualPositionConnection,
  type PositionConnection,
} from './overlay/position/connection.js';
import type { PositionOptions } from './position.js';
import { createHiddenBinding, type HiddenBinding } from './interaction/visibility.js';
import { horizontalArrow, type ReadingDirection } from './interaction/keyboard.js';

export type { TreeNodeInput as CascadeSelectItemDefinition } from '@sectile/core/tree';
export type { CascadeSelectPolicies } from '@sectile/core/cascade-select';

export interface CascadeSelectOptions<ID extends StableID = StableID> extends PositionOptions {
  readonly layerHost?: import('./layer-host.js').LayerHostConnection | null;
  readonly root: HTMLElement;
  readonly direction?: ReadingDirection;
  readonly trigger: HTMLButtonElement;
  readonly popup: HTMLElement;
  readonly nodes: readonly TreeNodeInput<ID>[];
  readonly disabledItems?: readonly ID[];
  readonly policies?: CascadeSelectPolicies<ID>;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly value?: ID | null;
  readonly defaultValue?: ID | null;
  readonly highlightedValue?: ID | null;
  readonly defaultHighlightedValue?: ID | null;
  /** Initial expanded branch path, validated by the canonical tree state owner. */
  readonly defaultPath?: readonly ID[];
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly label?: string;
  readonly position?: boolean;
  readonly manageVisibility?: boolean;
  readonly onValueChange?: (value: ID | null) => void;
  readonly onHighlightedValueChange?: (value: ID | null) => void;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onUpdate?: () => void;
}

export type CascadeSelectValueChangeHandler<ID extends StableID = StableID> = NonNullable<CascadeSelectOptions<ID>['onValueChange']>;
export type CascadeSelectHighlightedValueChangeHandler<ID extends StableID = StableID> = NonNullable<CascadeSelectOptions<ID>['onHighlightedValueChange']>;
export type CascadeSelectOpenChangeHandler<ID extends StableID = StableID> = NonNullable<CascadeSelectOptions<ID>['onOpenChange']>;
export type CascadeSelectUpdateHandler<ID extends StableID = StableID> = NonNullable<CascadeSelectOptions<ID>['onUpdate']>;

export type CascadeSelectEffect<ID extends StableID = StableID> =
  | { readonly type: 'focus-option'; readonly id: ID }
  | { readonly type: 'select-value'; readonly id: ID }
  | { readonly type: 'close-popup' };

export interface CascadeSelectControlledValues<ID extends StableID = StableID> {
  readonly value?: ID | null;
  readonly highlightedValue?: ID | null;
  readonly open?: boolean;
}

export interface CascadeSelectConnection<ID extends StableID = StableID> {
  readonly tree: Tree<ID>;
  getActive(): boolean;
  getLayerOrder(): number | null;
  subscribeLayerPresentation(listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription;
  syncLayerParent(parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode>;
  suspend(): void;
  resume(): void;
  getSnapshot(): RevisionSnapshot<CascadeSelectState<ID>>;
  getColumns(): readonly (readonly ID[])[];
  getValuePath(): readonly ID[];
  syncControlledValues(values: CascadeSelectControlledValues<ID>): Result<RevisionSnapshot<CascadeSelectState<ID>>>;
  setColumnAttributes(element: HTMLElement, parentID?: ID | null, label?: string): void;
  setItemAttributes(element: HTMLElement, id: ID, disabled?: boolean): void;
  handleEvent(event: CascadeSelectEvent<ID>): boolean;
  refresh(): void;
  disconnect(): void;
}

export function createCascadeSelect<ID extends StableID>(options: CascadeSelectOptions<ID>): FacadeConnection<CascadeSelectConnection<ID>> {
  return unwrap(tryCreateCascadeSelect(options));
}

export function tryCreateCascadeSelect<ID extends StableID>(options: CascadeSelectOptions<ID>): Result<FacadeConnection<CascadeSelectConnection<ID>>> {
  return createFacadeConnection(options, tryCreateCascadeSelectConnection);
}

function tryCreateCascadeSelectConnection<ID extends StableID>(options: CascadeSelectOptions<ID>): Result<CascadeSelectConnection<ID>> {
  const tree = tryCreateTree(options.nodes); if (!tree.ok) return tree;
  const disabled = new Set(options.disabledItems ?? []);
  for (const id of disabled) if (!tree.value.has(id)) return { ok: false, error: { class: 'construction', code: 'disabled-item-outside-domain', message: 'Every disabled cascade select item must exist in the tree.', details: { id } } };
  const suppliedEligibility = options.policies?.eligible;
  const policies: CascadeSelectPolicies<ID> = { ...options.policies, eligible: (id) => !disabled.has(id) && (suppliedEligibility?.(id) ?? true) };
  const controlled = { value: options.value !== undefined, highlighted: options.highlightedValue !== undefined, open: options.open !== undefined };
  const runtime = createSemanticController<CascadeSelectState<ID>, CascadeSelectEvent<ID>, CascadeSelectCommand<ID>, CascadeSelectEffect<ID>>({
    interaction: options,
    interactionIntent: (event) => event === 'select'
      || (typeof event === 'object' && event.type === 'select' && tree.value.isLeaf(event.id) === true)
      ? 'mutate'
      : 'navigate',
    initial: tryCreateCascadeSelectState(tree.value, {
      value: options.value === undefined ? options.defaultValue ?? null : options.value,
      ...(options.highlightedValue !== undefined ? { highlighted: options.highlightedValue }
        : options.defaultHighlightedValue !== undefined ? { highlighted: options.defaultHighlightedValue } : {}),
      open: options.open ?? options.defaultOpen ?? false,
      ...(options.defaultPath === undefined ? {} : { path: options.defaultPath }),
    }),
    reducer: (state, event) => applyCascadeSelectEvent(tree.value, state, event, policies),
    reconcile: (previous, proposed) => tryCreateCascadeSelectState(tree.value, {
      value: controlled.value ? previous.value : proposed.value,
      highlighted: controlled.highlighted ? previous.highlighted : proposed.highlighted,
      open: controlled.open ? previous.open : proposed.open,
      path: proposed.path,
    }),
    notify: [
      (previous, proposed) => {
        if (previous.value !== proposed.value) options.onValueChange?.(proposed.value);
      },
      (previous, proposed) => {
        if (previous.highlighted !== proposed.highlighted) options.onHighlightedValueChange?.(proposed.highlighted);
      },
      (previous, proposed) => {
        if (previous.open !== proposed.open) options.onOpenChange?.(proposed.open);
      },
    ],
    toEffect: (command) => command.type === 'focus'
      ? { type: 'focus-option', id: command.id }
      : command,
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new DOMCascadeSelectConnection(options, tree.value, runtime.value, disabled, controlled) };
}

class DOMCascadeSelectConnection<ID extends StableID> implements CascadeSelectConnection<ID> {
  readonly tree: Tree<ID>;
  readonly #options: CascadeSelectOptions<ID>;
  readonly #runtime: SemanticController<CascadeSelectState<ID>, CascadeSelectEvent<ID>, CascadeSelectEffect<ID>>;
  readonly #controlled: { value: boolean; highlighted: boolean; open: boolean };
  readonly #triggerClick: () => void;
  readonly #layer: DOMLayerBinding;
  readonly #choice: DOMCascadeChoiceBinding<ID>;
  readonly #position: PositionConnection;
  readonly #visibility: HiddenBinding | undefined;
  #disconnected = false;

  public constructor(options: CascadeSelectOptions<ID>, tree: Tree<ID>, runtime: SemanticController<CascadeSelectState<ID>, CascadeSelectEvent<ID>, CascadeSelectEffect<ID>>, disabled: ReadonlySet<ID>, controlled: { value: boolean; highlighted: boolean; open: boolean }) {
    const manageVisibility = options.manageVisibility;
    this.#options = options; this.tree = tree; this.#runtime = runtime; this.#controlled = controlled; this.#visibility = manageVisibility === false ? undefined : createHiddenBinding(options.popup);
    this.#layer = createDOMLayerBinding({ surface: options.popup, owner: options.trigger, dismissOnInteractOutside: true,
      ...(options.layerHost === undefined ? {} : { layerHost: options.layerHost }),
      readOpen: () => this.getSnapshot().state.open, close: () => { this.handleEvent('close'); },
      presentation: { suspend: () => { this.#suspendResources(); }, resume: () => {
        this.#choice.resume(); options.trigger.addEventListener('click', this.#triggerClick); this.#render();
      } },
    });
    this.#position = options.position === false
      ? manualPositionConnection
      : createPosition({
          root: options.popup,
          reference: options.trigger,
          side: options.side,
          align: options.align,
          sideOffset: options.sideOffset,
          collisionPadding: options.collisionPadding,
          collisionBoundary: options.collisionBoundary,
          avoidCollisions: options.avoidCollisions,
          flip: options.flip,
          shift: options.shift,
          arrowPadding: options.arrowPadding,
          hideWhenDetached: options.hideWhenDetached,
          strategy: options.strategy,
          tracking: options.tracking,
        });
    this.#choice = createDOMCascadeChoiceBinding<ID, CascadeSelectEvent<ID>>({
      root: options.root,
      surface: options.popup,
      tree,
      disabledItems: disabled,
      disabled: options.disabled,
      readOnly: options.readOnly,
      label: options.label,
      scope: 'cascade-select',
      readState: () => this.getSnapshot().state,
      handleEvent: (event) => this.handleEvent(event),
      toEvent: (event) => {
        const target = event.target;
        if (target != null && target !== options.root && target !== options.trigger && !options.popup.contains(target as Node)) return null;
        // Closed native triggers activate through their click, not item selection.
        if (target === options.trigger && !this.getSnapshot().state.open && (event.key === 'Enter' || event.key === ' ')) return null;
        return toCascadeSelectEvent(event, options.direction);
      },
    });
    options.trigger.disabled = options.disabled === true;
    options.trigger.setAttribute('aria-haspopup', 'listbox');
    if (options.label !== undefined) options.trigger.setAttribute('aria-label', options.label);
    this.#triggerClick = () => { this.handleEvent('toggle'); };
    options.trigger.addEventListener('click', this.#triggerClick); this.#render();
  }
  public getSnapshot(): RevisionSnapshot<CascadeSelectState<ID>> { return this.#runtime.getSnapshot(); }
  public getActive(): boolean { return !this.#disconnected && this.#layer.getActive(); }
  public getLayerOrder(): number | null { return this.#layer.getLayerOrder(); }
  public subscribeLayerPresentation(listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription { return this.#layer.subscribeLayerPresentation(listener); }
  public syncLayerParent(parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode> { return this.#layer.syncLayerParent(parent); }
  public suspend(): void { this.#layer.suspend(); }
  public resume(): void { this.#layer.resume(); }
  public getColumns(): readonly (readonly ID[])[] { return getCascadeSelectColumns(this.tree, this.getSnapshot().state); }
  public getValuePath(): readonly ID[] { return getCascadeSelectValuePath(this.tree, this.getSnapshot().state.value); }
  public syncControlledValues(values: CascadeSelectControlledValues<ID>): Result<RevisionSnapshot<CascadeSelectState<ID>>> {
    if (this.#controlled.value !== (values.value !== undefined) || this.#controlled.highlighted !== (values.highlightedValue !== undefined) || this.#controlled.open !== (values.open !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled cascade select values must preserve their construction-time shape.' } };
    const state = this.getSnapshot().state;
    const result = this.#runtime.replace(tryCreateCascadeSelectState(this.tree, { value: this.#controlled.value ? values.value ?? null : state.value, highlighted: this.#controlled.highlighted ? values.highlightedValue ?? null : state.highlighted, open: this.#controlled.open ? values.open ?? false : state.open }));
    if (result.ok) { this.#render(); this.#options.onUpdate?.(); } return result;
  }
  public setColumnAttributes(element: HTMLElement, parentID: ID | null = null, label?: string): void { this.#choice.setColumnAttributes(element, parentID, label); }
  public setItemAttributes(element: HTMLElement, id: ID, disabled = false): void { this.#choice.setItemAttributes(element, id, disabled); }
  public handleEvent(event: CascadeSelectEvent<ID>): boolean {
    const result = this.#runtime.handle(event); if (!result.ok) return false; this.#render();
    for (const effect of result.commands) {
      if (!this.getActive()) continue;
      if (effect.type === 'focus-option') this.#choice.focusItem(effect.id);
      else if (effect.type === 'close-popup' && !this.getSnapshot().state.open) this.#options.trigger.focus();
    }
    this.#options.onUpdate?.(); return true;
  }
  public refresh(): void { this.#render(); }
  public disconnect(): void {
    if (this.#disconnected) return;
    this.#disconnected = true;
    let failed = false, failure: unknown;
    try { this.#layer.disconnect(); } catch (error) { failed = true; failure = error; }
    try { this.#choice.disconnect(); } catch (error) { if (!failed) { failed = true; failure = error; } }
    try { this.#visibility?.disconnect(); } catch (error) { if (!failed) { failed = true; failure = error; } }
    if (failed) throw failure;
  }
  #suspendResources(): void {
    let failed = false, failure: unknown;
    try { this.#choice.suspend(); } catch (error) { failed = true; failure = error; }
    this.#options.trigger.removeEventListener('click', this.#triggerClick);
    try { this.#position.disconnect(); } catch (error) { if (!failed) { failed = true; failure = error; } }
    try { if (!this.#disconnected) this.#visibility?.setHidden(true); } catch (error) { if (!failed) { failed = true; failure = error; } }
    try { this.#options.onUpdate?.(); } catch (error) { if (!failed) { failed = true; failure = error; } }
    if (failed) throw failure;
  }
  #render(): void {
    if (this.#disconnected) return;
    const state = this.getSnapshot().state; this.#options.trigger.setAttribute('aria-expanded', String(state.open));
    this.#visibility?.setHidden(!this.getActive() || !state.open); this.#layer.sync();
    if (this.getActive()) this.#position.update();
  }
}

export function toCascadeSelectEvent<ID extends StableID>(input: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey'>, direction: ReadingDirection = 'ltr'): CascadeSelectEvent<ID> | null {
  if (input.altKey || input.ctrlKey || input.metaKey) return null;
  if (input.key === 'ArrowDown') return 'next'; if (input.key === 'ArrowUp') return 'previous';
  const horizontal = horizontalArrow(input.key, direction);
  if (horizontal !== null) return horizontal === 'next' ? 'right' : 'left';
  if (input.key === 'Home') return 'first'; if (input.key === 'End') return 'last';
  if (input.key === 'Enter' || input.key === ' ') return 'select'; if (input.key === 'Escape') return 'close';
  return null;
}
