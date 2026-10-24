import type { Result, StableID } from '@sectile/core';
import {
  applySequenceReorderEvent,
  applyTreeReorderEvent,
  canMoveTreeReorderNode,
  getSequenceReorderOrder,
  getTreeReorderHierarchy,
  tryCreateSequenceReorderState,
  tryCreateTreeReorderState,
  type SequenceReorderCommand,
  type SequenceReorderEvent,
  type SequenceReorderState,
  type TreeReorderEvent,
  type TreeReorderState,
  type TreeReorderPolicies,
} from '@sectile/core/reorder';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { TreeNodeInput } from '@sectile/core/tree';
import { unwrap, failResult } from '@sectile/core/result';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';
import { setInteractionAttributes, createDOMAttributeBinding, type DOMAttributeBinding } from './interaction/attributes.js';
import type { ReadingDirection } from './interaction/keyboard.js';
import { stableIDToken } from './identity.js';
import {findDelegatedIdentity,isNativeInteractionTarget} from './identity/delegated-event.js';

export type ReorderOrientation = 'horizontal' | 'vertical';

export interface ReorderInteractionSnapshot<ID extends StableID = StableID> {
  readonly sourceID: ID | null;
  readonly input: 'pointer' | 'keyboard' | null;
  readonly target: TreeReorderDropTarget<ID> | null;
  readonly allowed: boolean;
  readonly clientPoint: { readonly x: number; readonly y: number } | null;
}
export interface ReorderInteractionChange<ID extends StableID = StableID> {
  readonly type: 'start' | 'preview' | 'commit' | 'cancel' | 'end';
  readonly interaction: ReorderInteractionSnapshot<ID>;
  /** Present on commit; controlled owners may accept the proposal later. */
  readonly accepted?: boolean;
}
interface ReorderInteractionConnection<ID extends StableID, State> {
  getInteractionSnapshot(): ReorderInteractionSnapshot<ID>;
  getPreviewState(): Result<State>;
  cancelInteraction(): void;
  refreshDropTarget(): void;
}

interface ReorderHostOptions<ID extends StableID> {
  readonly root: HTMLElement;
  readonly orientation?: ReorderOrientation;
  readonly disabled?: boolean;
  readonly controlled?: boolean;
  readonly handleOnly?: boolean;
  readonly label?: string;
  readonly roleDescription?: string;
  readonly onUpdate?: () => void;
  readonly keyboardMode?: 'immediate' | 'preview';
  readonly onInteractionChange?: (change: ReorderInteractionChange<ID>) => void;
}

export interface SequenceReorderOptions<ID extends StableID = StableID>
  extends ReorderHostOptions<ID> {
  readonly ids: readonly ID[];
  readonly onOrderChange?: (ids: readonly ID[]) => void;
}

export interface SequenceReorderConnection<ID extends StableID = StableID> extends ReorderInteractionConnection<ID, SequenceReorderState<ID>> {
  getSnapshot(): RevisionSnapshot<SequenceReorderState<ID>>;
  syncOrder(ids: readonly ID[]): Result<RevisionSnapshot<SequenceReorderState<ID>>>;
  setItemAttributes(element: HTMLElement, id: ID): void;
  removeItem(element: HTMLElement): void;
  handleEvent(event: SequenceReorderEvent<ID>): boolean;
  disconnect(): void;
}

export interface TreeReorderOptions<ID extends StableID = StableID>
  extends ReorderHostOptions<ID> {
  readonly nodes: readonly TreeNodeInput<ID>[];
  readonly layout?: 'tree' | 'columns';
  readonly direction?: ReadingDirection;
  readonly readOnly?: boolean;
  readonly policies?: Pick<TreeReorderPolicies<NoInfer<ID>>, 'canMove' | 'capacity'>;
  readonly onOrderChange?: (nodes: readonly TreeNodeInput<ID>[]) => void;
}

export interface TreeReorderDropTarget<ID extends StableID = StableID> {
  readonly parentID: ID | null; readonly beforeID?: ID | null;
}
type ItemTarget<ID extends StableID> = { readonly kind: 'item'; readonly id: ID; readonly before: boolean };
type PositionTarget<ID extends StableID> = { readonly kind: 'position'; readonly element: HTMLElement; readonly parentID: ID | null; readonly beforeID: ID | null };
type DropTarget<ID extends StableID> = ItemTarget<ID> | PositionTarget<ID>;
type PointerLocation = Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY' | 'target'>;
interface DropFeedback {
  readonly element: HTMLElement; readonly position: 'before' | 'after' | 'inside';
  readonly axis: ReorderOrientation; readonly allowed: boolean;
}
function sameDropTarget<ID extends StableID>(left: DropTarget<ID> | null, right: DropTarget<ID> | null): boolean {
  if (left === right) return true;
  return left?.kind === 'item' && right?.kind === 'item' && left.id === right.id && left.before === right.before;
}
interface TreeRuntimeScope<ID extends StableID> {
  active: boolean; reducing: boolean; readonly columns: boolean; readonly direction: ReadingDirection;
  policies: TreeReorderPolicies<ID> | undefined;
  permission: TreeReorderPolicies<ID>['canMove']; capacity: TreeReorderPolicies<ID>['capacity'];
  onOrderChange: TreeReorderOptions<ID>['onOrderChange'];
}

export interface TreeReorderConnection<ID extends StableID = StableID> extends ReorderInteractionConnection<ID, TreeReorderState<ID>> {
  getSnapshot(): RevisionSnapshot<TreeReorderState<ID>>;
  syncOrder(nodes: readonly TreeNodeInput<ID>[]): Result<RevisionSnapshot<TreeReorderState<ID>>>;
  setItemAttributes(element: HTMLElement, id: ID): void;
  removeItem(element: HTMLElement): void;
  setDropTarget(element: HTMLElement, target: TreeReorderDropTarget<NoInfer<ID>>): void;
  removeDropTarget(element: HTMLElement): void;
  canMove(id: NoInfer<ID>, target: TreeReorderDropTarget<NoInfer<ID>>): boolean;
  handleEvent(event: TreeReorderEvent<ID>): boolean;
  disconnect(): void;
}

export function createReorder<ID extends StableID>(
  options: SequenceReorderOptions<ID>,
): SequenceReorderConnection<ID>;
export function createReorder<ID extends StableID>(
  options: TreeReorderOptions<ID>,
): TreeReorderConnection<ID>;
export function createReorder<ID extends StableID>(
  options: SequenceReorderOptions<ID> | TreeReorderOptions<ID>,
): SequenceReorderConnection<ID> | TreeReorderConnection<ID> {
  return 'nodes' in options ? createTreeReorder(options) : createSequenceReorder(options);
}

export function tryCreateReorder<ID extends StableID>(
  options: SequenceReorderOptions<ID>,
): Result<SequenceReorderConnection<ID>>;
export function tryCreateReorder<ID extends StableID>(
  options: TreeReorderOptions<ID>,
): Result<TreeReorderConnection<ID>>;
export function tryCreateReorder<ID extends StableID>(
  options: SequenceReorderOptions<ID> | TreeReorderOptions<ID>,
): Result<SequenceReorderConnection<ID> | TreeReorderConnection<ID>> {
  return 'nodes' in options ? tryCreateTreeReorder(options) : tryCreateSequenceReorder(options);
}

function createSequenceReorder<ID extends StableID>(
  options: SequenceReorderOptions<ID>,
): SequenceReorderConnection<ID> {
  return unwrap(tryCreateSequenceReorder(options));
}

function tryCreateSequenceReorder<ID extends StableID>(
  options: SequenceReorderOptions<ID>,
): Result<SequenceReorderConnection<ID>> {
  const controlled = options.controlled === true;
  const scope = { onOrderChange: options.onOrderChange };
  const runtime = createSemanticController<
    SequenceReorderState<ID>,
    SequenceReorderEvent<ID>,
    SequenceReorderCommand<ID>,
    SequenceReorderCommand<ID>
  >({
    initial: tryCreateSequenceReorderState(options.ids),
    reducer: applySequenceReorderEvent,
    reconcile: (previous, proposed) => ({ ok: true, value: controlled ? previous : proposed }),
    notify: (previous, proposed) => {
      if (!sameIDs(previous.ids, proposed.ids)) scope.onOrderChange?.(proposed.ids);
    },
    toEffect: (command) => command,
    interaction: options.disabled === undefined ? {} : { disabled: options.disabled },
  });
  return runtime.ok
    ? { ok: true, value: new DOMSequenceReorder(options, runtime.value, scope) }
    : runtime;
}

function createTreeReorder<ID extends StableID>(
  options: TreeReorderOptions<ID>,
): TreeReorderConnection<ID> {
  return unwrap(tryCreateTreeReorder(options));
}

function tryCreateTreeReorder<ID extends StableID>(
  options: TreeReorderOptions<ID>,
): Result<TreeReorderConnection<ID>> {
  const controlled = options.controlled === true;
  const layout = options.layout ?? 'tree', direction = options.direction ?? 'ltr';
  if (!['tree', 'columns'].includes(layout) || !['ltr', 'rtl'].includes(direction)) return failResult('construction', 'invalid-boundary', 'Unknown Reorder layout or reading direction.');
  const supplied = options.policies;
  if (supplied !== undefined && (supplied === null || typeof supplied !== 'object' || Array.isArray(supplied))) return failResult('construction', 'invalid-boundary', 'Reorder policies require a record.');
  const columns = layout === 'columns', permission = supplied?.canMove, capacity = supplied?.capacity;
  const initial = tryCreateTreeReorderState(options.nodes, columns ? { maxDepth: 1 } : undefined); if (!initial.ok) return initial;
  const policies = { ...(columns ? { maxDepth: 1, preserveRoots: true } : {}), ...(permission === undefined ? {} : { canMove: permission }), ...(capacity === undefined ? {} : { capacity }) };
  const admission = applyTreeReorderEvent(initial.value, { type: 'move-nodes', ids: [], parentID: null }, policies); if (!admission.ok) return admission;
  const scope: TreeRuntimeScope<ID> = { active: true, reducing: false, columns, direction, permission, capacity, onOrderChange: options.onOrderChange, policies: undefined };
  scope.policies = columns || permission !== undefined || capacity !== undefined ? liveTreePolicies(scope) : undefined;
  const runtime = createSemanticController<
    TreeReorderState<ID>,
    TreeReorderEvent<ID>,
    { readonly type: 'tree-order-changed'; readonly nodes: readonly TreeNodeInput<ID>[] },
    { readonly type: 'tree-order-changed'; readonly nodes: readonly TreeNodeInput<ID>[] }
  >({
    initial,
    reducer: (state, event) => {
      scope.reducing = true;
      try {
        const result = applyTreeReorderEvent(state, event, scope.policies);
        return scope.active ? result : failResult('transition-rejection', 'invalid-boundary', 'Reorder connection is disconnected.');
      } finally { scope.reducing = false; }
    },
    reconcile: (previous, proposed) => ({ ok: true, value: controlled ? previous : proposed }),
    notify: (previous, proposed) => {
      if (scope.active && !sameNodes(previous.nodes, proposed.nodes)) scope.onOrderChange?.(proposed.nodes);
    },
    toEffect: (command) => command,
    interaction: { ...(options.disabled === undefined ? {} : { disabled: options.disabled }), ...(options.readOnly === undefined ? {} : { readOnly: options.readOnly }) },
  });
  if (!runtime.ok) return runtime;
  try { return { ok: true, value: new DOMTreeReorder(options, runtime.value, scope) }; }
  catch (error) { retireTreeScope(scope); throw error; }
}

function retireTreeScope<ID extends StableID>(scope: TreeRuntimeScope<ID>): void {
  scope.active = false; scope.policies = undefined; scope.permission = undefined; scope.capacity = undefined; scope.onOrderChange = undefined;
}

/** Wrappers borrow only a retireable scope, not caller hooks or construction options. */
function liveTreePolicies<ID extends StableID>(scope: TreeRuntimeScope<ID>): TreeReorderPolicies<ID> {
  return { ...(scope.columns ? { maxDepth: 1, preserveRoots: true } : {}),
    ...(scope.permission === undefined ? {} : { canMove: move => {
      if (!scope.active) return false;
      const allowed = scope.permission?.(move); return scope.active && allowed === true;
    } }),
    ...(scope.capacity === undefined ? {} : { capacity: parent => {
      if (!scope.active) return 0;
      const capacity = scope.capacity?.(parent); return scope.active ? capacity : 0;
    } }),
  };
}

abstract class DOMReorderHost<ID extends StableID, State, Event> {
  #root: HTMLElement | undefined;
  protected get root(): HTMLElement { return this.#root!; }
  #active = true;
  protected get active(): boolean { return this.#active; }
  readonly #bindings: Map<HTMLElement, DOMAttributeBinding> | undefined;
  #focusRecipient: { readonly id: ID; readonly element: HTMLElement } | undefined;
  #focusQueued = false;
  readonly #flushFocus = (): void => {
    this.#focusQueued = false; const recipient = this.#focusRecipient; this.#focusRecipient = undefined;
    if (this.#active && recipient && this.elements.get(recipient.id) === recipient.element && this.root.contains(recipient.element)) recipient.element.focus();
  };
  protected readonly orientation: ReorderOrientation;
  protected readonly elements = new Map<ID, HTMLElement>();
  #elementOwners = new WeakMap<HTMLElement, ID>();
  protected readonly runtime: SemanticController<State, Event, unknown>;
  #onUpdate: (() => void) | undefined;
  readonly #keydown: (event: KeyboardEvent) => void;
  readonly #pointerdown: (event: PointerEvent) => void;
  readonly #pointermove: (event: PointerLocation) => void;
  readonly #pointerup: (event: PointerEvent) => void;
  readonly #pointercancel: (event: PointerEvent) => void;
  readonly #disabled: boolean;
  readonly #handleOnly: boolean;
  #drag: { readonly id: ID; readonly pointerID: number; readonly revision: number } | null = null;
  #target: DropTarget<ID> | null = null;
  readonly #keyboardMode: 'immediate' | 'preview';
  #onInteractionChange: ReorderHostOptions<ID>['onInteractionChange'];
  #interaction: ReorderInteractionSnapshot<ID> = Object.freeze({ sourceID: null, input: null, target: null, allowed: false, clientPoint: null });
  #proposal: Event | null = null;
  #preview: Result<State> | undefined;
  #keyboard: { readonly id: ID; state: State } | undefined;
  readonly #blur = (): void => { this.cancelInteraction(); };
  readonly #visibility = (): void => { if (this.#root?.ownerDocument?.hidden) this.cancelInteraction(); };
  readonly #focusout = (event: FocusEvent): void => {
    const item = this.#keyboard && this.elements.get(this.#keyboard.id);
    if (item && (!event.relatedTarget || !item.contains(event.relatedTarget as Node))) this.cancelInteraction();
  };
  #sourceFeedback: DOMAttributeBinding | undefined;
  #dropFeedback: DOMAttributeBinding | undefined;
  #clearingDrag = false;
  protected get draggedID(): ID | null { return this.#drag?.id ?? null; }
  protected get interactionDisabled(): boolean { return this.#disabled; }

  protected constructor(
    options: ReorderHostOptions<ID>,
    runtime: SemanticController<State, Event, unknown>,
    managed = false,
    readOnly?: boolean,
  ) {
    this.#root = options.root;
    this.#bindings = managed ? new Map() : undefined;
    this.orientation = options.orientation ?? 'vertical';
    this.runtime = runtime;
    this.#onUpdate = options.onUpdate;
    if (options.keyboardMode !== undefined && options.keyboardMode !== 'immediate' && options.keyboardMode !== 'preview') throw new TypeError('Unknown Reorder keyboard mode.');
    this.#keyboardMode = options.keyboardMode ?? 'immediate';
    this.#onInteractionChange = options.onInteractionChange;
    this.#disabled = options.disabled === true || readOnly === true;
    this.#handleOnly = options.handleOnly === true;
    this.#keydown = (event) => {
      if (!this.#active || event.defaultPrevented || this.#disabled || event.isComposing) return;
      if (event.key === 'Escape' && this.#interaction.sourceID !== null) { this.cancelInteraction(); event.preventDefault(); return; }
      const id = this.resolveTarget(event.target);
      if (id !== null && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && this.#keyboardMode === 'preview'
        && this.allowedOrigin(event.target, this.elements.get(id)!, false)) {
        if (event.key === ' ' || (event.key === 'Enter' && this.#keyboard?.id === id)) {
          event.preventDefault();
          if (this.#keyboard?.id === id) this.commitInteraction();
          else if (event.key === ' ') {
            this.cancelInteraction();
            if (!this.#active) return;
            this.#keyboard = { id, state: this.runtime.getSnapshot().state };
            try { this.publish('start', id, 'keyboard', null, null); }
            catch (error) { try { this.clearDrag(); } catch { /* Preserve callback failure. */ } throw error; }
          }
          return;
        }
        if (this.#keyboard?.id === id && (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End')) {
          try { this.handleKeyboard(id, event); }
          catch (error) { try { this.clearDrag(); } catch { /* Preserve policy or callback failure. */ } throw error; }
          event.preventDefault(); return;
        }
      }
      if (event.altKey && this.#keyboard) this.cancelInteraction();
      if (this.#active && id !== null && this.allowedOrigin(event.target, this.elements.get(id)!, false)
        && this.handleKeyboard(id, event)) event.preventDefault();
    };
    this.#pointerdown = (event) => {
      if (!this.#active || event.defaultPrevented || event.button !== 0 || this.#disabled || this.#drag !== null || this.#clearingDrag) return;
      const id = this.resolveTarget(event.target);
      const item = id === null ? undefined : this.elements.get(id);
      const origin = item === undefined ? null : this.allowedOrigin(event.target, item, this.#handleOnly);
      if (id === null || !item || !origin || !this.#active) return;
      this.cancelInteraction(); if (!this.#active) return;
      event.preventDefault();
      origin.focus({ preventScroll: true });
      if (!this.#active || this.elements.get(id) !== item || (origin !== item && !item.contains(origin)) || this.#drag !== null || this.#clearingDrag) return;
      const drag = this.#drag = { id, pointerID: event.pointerId, revision: this.runtime.getSnapshot().revision };
      this.#target = { kind: 'item', id, before: true };
      try {
        this.root.setPointerCapture?.(event.pointerId);
        if (this.#bindings && this.#active && this.#drag === drag) {
          if (this.runtime.getSnapshot().revision !== drag.revision) { this.clearDrag(); return; }
          const binding = this.#sourceFeedback = createDOMAttributeBinding(this.elements.get(id)!);
          binding.apply({ 'data-sectile-reorder-dragging': '' });
        }
        if (this.#active && this.#drag === drag) this.publish('start', id, 'pointer', null, { x: event.clientX, y: event.clientY });
      }
      catch (error) { try { this.clearDrag(); } catch { /* Preserve capture acquisition failure. */ } throw error; }
    };
    this.#pointermove = (event) => {
      const drag = this.#drag;
      if (!this.#active || drag?.pointerID !== event.pointerId) return;
      try {
        if (this.runtime.getSnapshot().revision !== drag.revision) { this.clearDrag(); return; }
        const target = this.resolveDrop(event);
        if (!this.#active || this.#drag !== drag) return;
        if (this.#bindings && this.runtime.getSnapshot().revision !== drag.revision) { this.clearDrag(); return; }
        if (sameDropTarget(this.#target, target)) {
          this.publish('preview', drag.id, 'pointer', this.#interaction.target, { x: event.clientX, y: event.clientY }, this.#interaction.allowed);
          return;
        }
        this.#target = target;
        const proposal = target === null || (target.kind === 'item' && target.id === drag.id) ? null : this.dropEvent(drag.id, target);
        this.#proposal = proposal; this.#preview = undefined;
        const allowed = proposal !== null && this.admitProposal(proposal);
        if (!this.#active || this.#drag !== drag) return;
        this.publish('preview', drag.id, 'pointer', proposal === null ? null : this.destination(proposal), { x: event.clientX, y: event.clientY }, allowed);
        if (this.#bindings) {
          const previous = this.#dropFeedback; this.#dropFeedback = undefined; previous?.disconnect();
          if (!this.#active || this.#drag !== drag || this.#target !== target) return;
          const feedback = target === null ? null : this.feedback(drag.id, target, allowed);
          if (!feedback || !this.#active || this.#drag !== drag || this.#target !== target) return;
          const binding = this.#dropFeedback = createDOMAttributeBinding(feedback.element);
          binding.apply({ 'data-sectile-reorder-drop': feedback.position,
            'data-sectile-reorder-drop-axis': feedback.axis, 'data-sectile-reorder-drop-allowed': String(feedback.allowed) });
        }
      } catch (error) { try { this.clearDrag(); } catch { /* Preserve hit-test or feedback failure. */ } throw error; }
    };
    this.#pointerup = (event) => {
      if (!this.#active || this.#drag?.pointerID !== event.pointerId) return;
      this.commitInteraction();
    };
    this.#pointercancel = (event) => {
      if (this.#active && this.#drag?.pointerID === event.pointerId) this.clearDrag();
    };
    try {
      if (managed) this.writeAttributes(this.root, { 'aria-disabled': options.disabled ? 'true' : undefined, 'data-readonly': readOnly ? 'true' : undefined,
        ...(options.label === undefined ? {} : { 'aria-label': options.label }), 'aria-roledescription': options.roleDescription ?? 'sortable' });
      else {
        setInteractionAttributes(this.root, options);
        if (readOnly !== undefined) this.writeAttributes(this.root, { 'data-readonly': readOnly ? 'true' : undefined });
        if (options.label !== undefined) this.root.setAttribute('aria-label', options.label);
        this.root.setAttribute('aria-roledescription', options.roleDescription ?? 'sortable');
      }
      this.root.addEventListener('keydown', this.#keydown);
      this.root.addEventListener('pointerdown', this.#pointerdown);
      this.root.addEventListener('pointermove', this.#pointermove);
      this.root.addEventListener('pointerup', this.#pointerup);
      this.root.addEventListener('pointercancel', this.#pointercancel);
      this.root.addEventListener('lostpointercapture', this.#pointercancel);
      this.root.addEventListener('focusout', this.#focusout);
      this.root.ownerDocument?.addEventListener?.('visibilitychange', this.#visibility);
      this.root.ownerDocument?.defaultView?.addEventListener?.('blur', this.#blur);
    } catch (error) { try { DOMReorderHost.prototype.disconnect.call(this); } catch { /* Preserve acquisition failure. */ } throw error; }
  }

  protected abstract handleKeyboard(id: ID, event: KeyboardEvent): boolean;
  protected abstract dropEvent(id: ID, target: DropTarget<ID>): Event | null;
  protected abstract reducePreview(state: State, event: Event): Result<State>;
  protected abstract admitProposal(event: Event): boolean;
  protected abstract destination(event: Event): TreeReorderDropTarget<ID>;
  public abstract handleEvent(event: Event): boolean;
  protected abstract projectItem(element: HTMLElement, id: ID): void;
  protected feedback(_id: ID, _target: DropTarget<ID>, _allowed: boolean): DropFeedback | null { return null; }

  protected keyboardState(): State { return this.#keyboard?.state ?? this.runtime.getSnapshot().state; }
  protected keyboardStep(event: Event): boolean {
    const session = this.#keyboard;
    if (!session) return this.handleEvent(event);
    const result = this.reducePreview(session.state, event);
    if (!this.#active || this.#keyboard !== session) return false;
    if (!result.ok) {
      this.#proposal = event; this.#preview = result;
      this.publish('preview', session.id, 'keyboard', this.destination(event), null, false);
      return false;
    }
    session.state = result.value; this.#proposal = event; this.#preview = result;
    this.publish('preview', session.id, 'keyboard', this.destination(event), null, true);
    return true;
  }
  public getInteractionSnapshot(): ReorderInteractionSnapshot<ID> { return this.#interaction; }
  public getPreviewState(): Result<State> {
    if (!this.#active) return failResult('transition-rejection', 'invalid-boundary', 'Reorder connection is disconnected.');
    if (this.#proposal === null || !this.#interaction.allowed) return { ok: true, value: this.runtime.getSnapshot().state };
    if (this.#preview !== undefined) return this.#preview;
    const interaction = this.#interaction, proposal = this.#proposal;
    const result = this.reducePreview(this.runtime.getSnapshot().state, proposal);
    if (!this.#active || this.#interaction !== interaction || this.#proposal !== proposal) return failResult('transition-rejection', 'invalid-boundary', 'Reorder preview was retired during policy evaluation.');
    return this.#preview = result;
  }
  public cancelInteraction(): void { this.clearDrag(); }
  public refreshDropTarget(): void {
    const drag = this.#drag, point = this.#interaction.clientPoint, root = this.#root;
    if (!this.#active || !drag || !point || !root) return;
    this.#target = null;
    this.#pointermove({ pointerId: drag.pointerID, clientX: point.x, clientY: point.y,
      target: root.ownerDocument?.elementFromPoint?.(point.x, point.y) ?? root });
  }
  private publish(type: ReorderInteractionChange<ID>['type'], sourceID: ID, input: 'pointer' | 'keyboard',
    target: TreeReorderDropTarget<ID> | null, clientPoint: ReorderInteractionSnapshot<ID>['clientPoint'], allowed = false): void {
    const interaction = this.#interaction = Object.freeze({ sourceID, input, target: target === null ? null : Object.freeze(target), allowed,
      clientPoint: clientPoint === null ? null : Object.freeze(clientPoint) });
    this.#onInteractionChange?.({ type, interaction });
    if (this.#active && this.#interaction === interaction) this.#onUpdate?.();
  }
  private finish(type: 'commit' | 'cancel', interaction: ReorderInteractionSnapshot<ID>, accepted?: boolean): void {
    let failed = false, first: unknown;
    const drain = (operation: () => void): void => { try { operation(); } catch (error) { if (!failed) { failed = true; first = error; } } };
    drain(() => this.#onInteractionChange?.({ type, interaction, ...(accepted === undefined ? {} : { accepted }) }));
    drain(() => this.#onInteractionChange?.({ type: 'end', interaction }));
    if (this.#active) drain(() => this.#onUpdate?.());
    if (failed) throw first;
  }
  private commitInteraction(): void {
    const interaction = this.#interaction, event = this.#proposal;
    const revision = this.runtime.getSnapshot().revision;
    const source = interaction.sourceID === null ? undefined : this.elements.get(interaction.sourceID);
    const target = this.#target;
    const valid = this.#keyboard !== undefined || (this.#drag !== null && this.#drag.revision === this.runtime.getSnapshot().revision);
    this.clearDrag(false);
    if (!this.#active || interaction.sourceID === null) return;
    if (!valid || this.runtime.getSnapshot().revision !== revision || this.elements.get(interaction.sourceID) !== source
      || !interaction.allowed || event === null || (target !== null && this.dropEvent(interaction.sourceID, target) === null)) {
      this.finish('cancel', interaction); return;
    }
    const previous = this.runtime.getSnapshot().state;
    let ok: boolean;
    try { ok = this.handleEvent(event); }
    catch (error) { try { this.finish('cancel', interaction); } catch { /* Preserve order callback failure. */ } throw error; }
    if (!this.#active) return;
    this.finish(ok ? 'commit' : 'cancel', interaction, ok ? this.runtime.getSnapshot().state !== previous : undefined);
    if (ok && this.#interaction.sourceID === null) this.focus(interaction.sourceID);
  }

  protected refresh(): void {
    if (!this.#active) return;
    for (const [id, element] of this.elements) this.projectItem(element, id);
  }

  protected updated(ok: boolean, previous: State): boolean {
    if (!this.#active) return false;
    if (ok) {
      if (this.runtime.getSnapshot().state !== previous) { this.cancelInteraction(); this.refresh(); }
      if (!this.#active) return false;
      this.#onUpdate?.();
    }
    return ok;
  }

  protected focus(id: ID): void {
    const element = this.elements.get(id);
    if (this.#bindings) {
      if (!this.#active || !element) return;
      this.#focusRecipient = { id, element }; if (this.#focusQueued) return; this.#focusQueued = true;
      queueMicrotask(this.#flushFocus);
      return;
    }
    queueMicrotask(() => {
      if (this.#active && element !== undefined && this.elements.get(id) === element) element.focus();
    });
  }

  public setItemAttributes(element: HTMLElement, id: ID): void {
    if (!this.#active || !this.acceptsItem(id)) return;
    if (this.#bindings && element === this.root) throw new TypeError('A Reorder root cannot register as its own item.');
    const ownedID = this.#elementOwners.get(element);
    if (ownedID !== undefined && ownedID !== id) this.removeItem(element);
    const previous = this.elements.get(id);
    if (previous !== undefined && previous !== element) this.removeItem(previous);
    if (!this.#active) return;
    this.elements.set(id, element);
    this.#elementOwners.set(element, id);
    try {
      if (this.#bindings) this.writeAttributes(element, { tabindex: element.tabIndex < 0 ? 0 : element.tabIndex, 'aria-keyshortcuts': 'Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Alt+Home Alt+End' });
      else { element.tabIndex = element.tabIndex < 0 ? 0 : element.tabIndex; element.setAttribute('aria-keyshortcuts', 'Alt+ArrowUp Alt+ArrowDown Alt+Home Alt+End'); }
      this.projectItem(element, id);
    } catch (error) { try { this.removeItem(element); } catch { /* Preserve projection acquisition failure. */ } throw error; }
  }

  public removeItem(element: HTMLElement): void {
    const id = this.#elementOwners.get(element);
    if (id === undefined) return;
    let failed = false, first: unknown;
    try { if (this.#keyboard?.id === id || this.#drag?.id === id || (this.#target?.kind === 'item' && this.#target.id === id)) this.clearDrag(); }
    catch (error) { failed = true; first = error; }
    this.elements.delete(id);
    this.#elementOwners.delete(element);
    if (this.#focusRecipient?.element === element) this.#focusRecipient = undefined;
    const binding = this.#bindings?.get(element); this.#bindings?.delete(element);
    try { binding?.disconnect(); } catch (error) { if (!failed) { failed = true; first = error; } }
    if (failed) throw first;
  }

  public disconnect(): void {
    if (!this.#active) return; this.#active = false;
    const root = this.root; let failed = false, first: unknown;
    const drain = (operation: () => void): void => { try { operation(); } catch (error) { if (!failed) { failed = true; first = error; } } };
    drain(() => this.clearDrag());
    for (const [name, listener] of [['keydown', this.#keydown], ['pointerdown', this.#pointerdown], ['pointermove', this.#pointermove],
      ['pointerup', this.#pointerup], ['pointercancel', this.#pointercancel], ['lostpointercapture', this.#pointercancel]] as const) drain(() => root.removeEventListener(name, listener as EventListener));
    drain(() => root.removeEventListener('focusout', this.#focusout));
    drain(() => root.ownerDocument?.removeEventListener?.('visibilitychange', this.#visibility));
    drain(() => root.ownerDocument?.defaultView?.removeEventListener?.('blur', this.#blur));
    this.elements.clear(); this.#elementOwners = new WeakMap(); this.#focusRecipient = undefined; this.#onUpdate = undefined;
    this.#onInteractionChange = undefined;
    if (this.#bindings) { for (const binding of this.#bindings.values()) drain(() => binding.disconnect()); this.#bindings.clear(); }
    this.#root = undefined;
    if (failed) throw first;
  }

  protected resolveTarget(target: EventTarget | null): ID | null {
    return findDelegatedIdentity(target, this.root, this.#elementOwners);
  }

  protected acceptsItem(_id: ID): boolean { return true; }
  protected resolveDrop(event: PointerLocation): DropTarget<ID> | null {
    const id = this.resolveTarget(event.target) ?? this.nearest(event);
    return id === null ? null : this.itemTarget(id, event);
  }
  protected itemTarget(id: ID, event: PointerLocation, axis = this.orientation, element = this.elements.get(id)): ItemTarget<ID> | null {
    if (!element) return null; const rect = element.getBoundingClientRect();
    return { kind: 'item', id, before: axis === 'horizontal' ? event.clientX < rect.left + rect.width / 2 : event.clientY < rect.top + rect.height / 2 };
  }
  protected invalidateTarget(target: DropTarget<ID>): void { if (this.#target === target) this.clearDrag(); }
  protected writeAttributes(element: HTMLElement, values: Readonly<Record<string, string | number | undefined>>): void {
    if (!this.#active) return;
    if (this.#bindings) { let binding = this.#bindings.get(element); if (!binding) this.#bindings.set(element, binding = createDOMAttributeBinding(element)); binding.apply(values); }
    else for (const [name, value] of Object.entries(values)) {
      if (name === 'data-reorder-id') element.dataset['reorderId'] = String(value);
      else if (value === undefined) element.removeAttribute(name); else element.setAttribute(name, String(value));
    }
  }

  private allowedOrigin(target: EventTarget | null, item: HTMLElement, handleOnly: boolean): HTMLElement | null {
    if (item.hasAttribute?.('disabled')) return null;
    let element = target as HTMLElement | null;
    while (element && element !== item) {
      if (element.hasAttribute?.('disabled')) return null;
      if (element.hasAttribute?.('data-sectile-reorder-handle')) return element;
      if (isNativeInteractionTarget(element)) return null;
      element = element.parentElement;
    }
    return !handleOnly || item.hasAttribute?.('data-sectile-reorder-handle') === true ? item : null;
  }

  private nearest(event: PointerLocation): ID | null {
    const coordinate = this.orientation === 'horizontal' ? event.clientX : event.clientY;
    let nearest: { readonly id: ID; readonly distance: number } | null = null;
    for (const [id, element] of this.elements) {
      const rect = element.getBoundingClientRect();
      const midpoint = this.orientation === 'horizontal'
        ? rect.left + rect.width / 2
        : rect.top + rect.height / 2;
      const distance = Math.abs(coordinate - midpoint);
      if (nearest === null || distance < nearest.distance) nearest = { id, distance };
    }
    return nearest?.id ?? null;
  }

  protected clearDrag(notify = true): void {
    if (this.#clearingDrag) return;
    if (this.#drag === null && this.#keyboard === undefined && this.#interaction.sourceID === null) return;
    this.#clearingDrag = true;
    const pointerID = this.#drag?.pointerID;
    const interaction = this.#interaction;
    this.#drag = null;
    this.#target = null;
    this.#keyboard = undefined; this.#proposal = null; this.#preview = undefined;
    this.#interaction = Object.freeze({ sourceID: null, input: null, target: null, allowed: false, clientPoint: null });
    const root = this.#root, source = this.#sourceFeedback, target = this.#dropFeedback;
    this.#sourceFeedback = undefined; this.#dropFeedback = undefined;
    let failed = false, first: unknown;
    const drain = (operation: () => void): void => { try { operation(); } catch (error) { if (!failed) { failed = true; first = error; } } };
    try {
      drain(() => source?.disconnect()); drain(() => target?.disconnect());
      drain(() => { if (root && pointerID !== undefined && (root.hasPointerCapture?.(pointerID) ?? true)) root.releasePointerCapture?.(pointerID); });
    } finally { this.#clearingDrag = false; }
    if (notify && interaction.sourceID !== null) {
      drain(() => this.finish('cancel', interaction));
    }
    if (failed) throw first;
  }
}

class DOMSequenceReorder<ID extends StableID>
  extends DOMReorderHost<ID, SequenceReorderState<ID>, SequenceReorderEvent<ID>>
  implements SequenceReorderConnection<ID> {
  readonly #scope: { onOrderChange: SequenceReorderOptions<ID>['onOrderChange'] };
  public constructor(
    options: SequenceReorderOptions<ID>,
    runtime: SemanticController<SequenceReorderState<ID>, SequenceReorderEvent<ID>, unknown>,
    scope: { onOrderChange: SequenceReorderOptions<ID>['onOrderChange'] },
  ) { super(options, runtime); this.#scope = scope; }
  public override disconnect(): void { this.#scope.onOrderChange = undefined; super.disconnect(); }
  public getSnapshot(): RevisionSnapshot<SequenceReorderState<ID>> { return this.runtime.getSnapshot(); }
  public syncOrder(ids: readonly ID[]): Result<RevisionSnapshot<SequenceReorderState<ID>>> {
    if (!this.active) return failResult('construction', 'invalid-boundary', 'Reorder connection is disconnected.');
    const result = this.runtime.replace(tryCreateSequenceReorderState(ids));
    if (result.ok) { this.cancelInteraction(); this.refresh(); }
    return result;
  }
  public handleEvent(event: SequenceReorderEvent<ID>): boolean {
    if (!this.active) return false;
    const previous = this.getSnapshot().state;
    return this.updated(this.runtime.handle(event).ok, previous);
  }
  protected handleKeyboard(id: ID, event: KeyboardEvent): boolean {
    if ((!event.altKey && this.getInteractionSnapshot().input !== 'keyboard') || event.ctrlKey || event.metaKey) return false;
    const order = getSequenceReorderOrder(this.keyboardState());
    const index = order.indexOf(id);
    if (index === null) return false;
    let semantic: SequenceReorderEvent<ID> | null = null;
    if (event.key === 'Home') semantic = { type: 'move-to-start', id };
    else if (event.key === 'End') semantic = { type: 'move-to-end', id };
    else if ((event.key === 'ArrowUp' || event.key === 'ArrowLeft') && index > 0) semantic = { type: 'move-before', id, targetID: order.at(index - 1)! };
    else if ((event.key === 'ArrowDown' || event.key === 'ArrowRight') && index < order.size - 1) semantic = { type: 'move-after', id, targetID: order.at(index + 1)! };
    if (semantic === null) return false;
    const ok = this.keyboardStep(semantic);
    if (ok) this.focus(id);
    return ok;
  }
  protected dropEvent(id: ID, target: DropTarget<ID>): SequenceReorderEvent<ID> | null {
    return target.kind !== 'item' || target.id === id ? null : { type: target.before ? 'move-before' : 'move-after', id, targetID: target.id };
  }
  protected reducePreview(state: SequenceReorderState<ID>, event: SequenceReorderEvent<ID>): Result<SequenceReorderState<ID>> {
    const result = applySequenceReorderEvent(state, event);
    return result.ok ? { ok: true, value: result.value.state } : result;
  }
  protected admitProposal(event: SequenceReorderEvent<ID>): boolean {
    const order = getSequenceReorderOrder(this.getSnapshot().state);
    return order.indexOf(event.id) !== null && (!('targetID' in event) || order.indexOf(event.targetID) !== null);
  }
  protected destination(event: SequenceReorderEvent<ID>): TreeReorderDropTarget<ID> {
    const order = getSequenceReorderOrder(this.keyboardState());
    let beforeID = event.type === 'move-to-end' ? null : event.type === 'move-to-start' ? order.at(0)
      : event.type === 'move-before' ? event.targetID : order.at(order.indexOf(event.targetID)! + 1);
    if (beforeID === event.id) beforeID = order.at(order.indexOf(event.id)! + 1);
    return { parentID: null, beforeID };
  }
  protected projectItem(element: HTMLElement, id: ID): void {
    const order = getSequenceReorderOrder(this.getSnapshot().state);
    const index = order.indexOf(id);
    if (index === null) return;
    element.dataset['reorderId'] = stableIDToken(id);
    element.setAttribute('aria-posinset', String(index + 1));
    element.setAttribute('aria-setsize', String(order.size));
  }
}

class DOMTreeReorder<ID extends StableID>
  extends DOMReorderHost<ID, TreeReorderState<ID>, TreeReorderEvent<ID>>
  implements TreeReorderConnection<ID> {
  readonly #targets = new Map<HTMLElement, PositionTarget<ID>>();
  #targetOwners = new WeakMap<HTMLElement, PositionTarget<ID>>();
  readonly #scope: TreeRuntimeScope<ID>;
  public constructor(
    options: TreeReorderOptions<ID>,
    runtime: SemanticController<TreeReorderState<ID>, TreeReorderEvent<ID>, unknown>,
    scope: TreeRuntimeScope<ID>,
  ) { super(options, runtime, scope.columns, options.readOnly); this.#scope = scope; }
  public getSnapshot(): RevisionSnapshot<TreeReorderState<ID>> { return this.runtime.getSnapshot(); }
  public canMove(id: NoInfer<ID>, target: TreeReorderDropTarget<NoInfer<ID>>): boolean {
    if (!this.active || this.interactionDisabled || this.#scope.reducing) return false;
    this.#scope.reducing = true;
    try {
      const parentID = target.parentID;
      if (!this.active) return false;
      const beforeID = target.beforeID ?? null;
      if (!this.active) return false;
      const allowed = canMoveTreeReorderNode(this.getSnapshot().state, { type: 'move-node', id, parentID, beforeID }, this.#scope.policies);
      return this.active && allowed;
    } finally { this.#scope.reducing = false; }
  }
  public syncOrder(nodes: readonly TreeNodeInput<ID>[]): Result<RevisionSnapshot<TreeReorderState<ID>>> {
    if (!this.active || this.#scope.reducing) return failResult('construction', 'invalid-boundary', 'Reorder connection is unavailable during disposal or policy evaluation.');
    const result = this.runtime.replace(tryCreateTreeReorderState(nodes, this.#scope.columns ? { maxDepth: 1 } : undefined));
    if (result.ok) {
      this.cancelInteraction();
      if (this.#scope.columns) {
        this.clearDrag(); const tree = getTreeReorderHierarchy(result.value.state);
        for (const [id, element] of this.elements) if (!tree.has(id)) this.removeItem(element);
      }
      for (const [element, target] of this.#targets) if (!this.validTarget(target)) this.removeDropTarget(element);
      this.refresh();
    }
    return result;
  }
  public handleEvent(event: TreeReorderEvent<ID>): boolean {
    if (!this.active || this.#scope.reducing) return false;
    const previous = this.getSnapshot().state;
    const accepted = this.runtime.handle(event).ok;
    if (this.active && this.#scope.columns && this.getSnapshot().state !== previous) this.clearDrag();
    return this.updated(accepted, previous);
  }
  protected handleKeyboard(id: ID, event: KeyboardEvent): boolean {
    if ((!event.altKey && this.getInteractionSnapshot().input !== 'keyboard') || event.ctrlKey || event.metaKey) return false;
    const tree = getTreeReorderHierarchy(this.keyboardState());
    if (!tree.has(id)) return false;
    const parentID = tree.parentOf(id);
    const siblings = parentID === null ? tree.roots : tree.childrenOf(parentID)!;
    const index = siblings.indexOf(id)!;
    let semantic: TreeReorderEvent<ID> | null = null;
    if (this.#scope.columns) {
      if (event.isComposing || event.shiftKey) return false;
      if (event.key === 'Home') semantic = { type: 'move-node', id, parentID, beforeID: siblings.at(0) };
      else if (event.key === 'End') semantic = { type: 'move-node', id, parentID, beforeID: null };
      else if (parentID !== null && event.key === 'ArrowUp' && index > 0) semantic = { type: 'move-node', id, parentID, beforeID: siblings.at(index - 1) };
      else if (parentID !== null && event.key === 'ArrowDown' && index < siblings.size - 1) semantic = { type: 'move-node', id, parentID, beforeID: siblings.at(index + 2) };
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const forward = (event.key === 'ArrowRight') !== (this.#scope.direction === 'rtl');
        const column = parentID ?? id, columnIndex = tree.roots.indexOf(column)!;
        const destination = tree.roots.at(columnIndex + (forward ? 1 : -1));
        if (destination !== null) semantic = parentID === null
          ? { type: 'move-node', id, parentID: null, beforeID: forward ? tree.roots.at(columnIndex + 2) : destination }
          : { type: 'move-node', id, parentID: destination, beforeID: null };
      }
      if (semantic === null) return false;
      const accepted = this.keyboardStep(semantic); if (accepted) this.focus(id); return accepted;
    }
    if (event.key === 'Home') semantic = { type: 'move-node', id, parentID, beforeID: siblings.at(0) };
    else if (event.key === 'End') semantic = { type: 'move-node', id, parentID, beforeID: null };
    else if (event.key === 'ArrowUp' && index > 0) semantic = { type: 'move-node', id, parentID, beforeID: siblings.at(index - 1) };
    else if (event.key === 'ArrowDown' && index < siblings.size - 1) semantic = { type: 'move-node', id, parentID, beforeID: siblings.at(index + 2) };
    else if (event.key === 'ArrowRight' && index > 0) semantic = { type: 'move-node', id, parentID: siblings.at(index - 1), beforeID: null };
    else if (event.key === 'ArrowLeft' && parentID !== null) {
      const grandparentID = tree.parentOf(parentID);
      const parentSiblings = grandparentID === null ? tree.roots : tree.childrenOf(grandparentID)!;
      semantic = { type: 'move-node', id, parentID: grandparentID, beforeID: parentSiblings.at(parentSiblings.indexOf(parentID)! + 1) };
    }
    if (semantic === null) return false;
    const ok = this.keyboardStep(semantic);
    if (ok) this.focus(id);
    return ok;
  }
  protected reducePreview(state: TreeReorderState<ID>, event: TreeReorderEvent<ID>): Result<TreeReorderState<ID>> {
    if (!this.active || this.#scope.reducing) return failResult('transition-rejection', 'invalid-boundary', 'Reorder connection is unavailable.');
    this.#scope.reducing = true;
    try {
      const result = applyTreeReorderEvent(state, event, this.#scope.policies);
      return !this.active ? failResult('transition-rejection', 'invalid-boundary', 'Reorder connection is disconnected.')
        : result.ok ? { ok: true, value: result.value.state } : result;
    } finally { this.#scope.reducing = false; }
  }
  protected admitProposal(event: TreeReorderEvent<ID>): boolean { return event.type === 'move-node' && this.canMove(event.id, event); }
  protected destination(event: TreeReorderEvent<ID>): TreeReorderDropTarget<ID> { return { parentID: event.parentID, beforeID: event.beforeID ?? null }; }
  protected dropEvent(id: ID, target: DropTarget<ID>): Extract<TreeReorderEvent<ID>, { type: 'move-node' }> | null {
    if (target.kind === 'position') {
      if (this.#targets.get(target.element) !== target) return null;
      return { type: 'move-node', id, parentID: target.parentID, beforeID: target.beforeID };
    }
    const targetID = target.id, before = target.before;
    const tree = getTreeReorderHierarchy(this.getSnapshot().state);
    if (!tree.has(targetID)) return null;
    if (this.#scope.columns && tree.parentOf(id) !== null && tree.parentOf(targetID) === null) {
      return { type: 'move-node', id, parentID: targetID, beforeID: null };
    }
    const parentID = tree.parentOf(targetID);
    const siblings = parentID === null ? tree.roots : tree.childrenOf(parentID)!;
    const index = siblings.indexOf(targetID)!;
    const next = siblings.at(index + 1);
    return {
      type: 'move-node',
      id,
      parentID,
      beforeID: before ? targetID : next === id ? siblings.at(index + 2) : next,
    };
  }
  protected override feedback(id: ID, target: DropTarget<ID>, allowed: boolean): DropFeedback | null {
    if (target.kind === 'item' && target.id === id) return null;
    const event = this.dropEvent(id, target), element = target.kind === 'position' ? target.element : this.elements.get(target.id);
    if (!event || !element) return null;
    const tree = getTreeReorderHierarchy(this.getSnapshot().state);
    const position = target.kind === 'position' ? target.beforeID === null ? 'inside' : 'before'
      : event.parentID === target.id ? 'inside' : target.before ? 'before' : 'after';
    return { element, position, axis: tree.parentOf(id) === null ? 'horizontal' : this.orientation, allowed };
  }
  protected projectItem(element: HTMLElement, id: ID): void {
    const tree = getTreeReorderHierarchy(this.getSnapshot().state);
    if (!tree.has(id)) return;
    const parentID = tree.parentOf(id);
    const siblings = parentID === null ? tree.roots : tree.childrenOf(parentID)!;
    if (this.#scope.columns) this.writeAttributes(element, { 'data-reorder-id': stableIDToken(id), 'aria-level': tree.depthOf(id)! + 1,
      'aria-posinset': siblings.indexOf(id)! + 1, 'aria-setsize': siblings.size,
      'aria-keyshortcuts': parentID === null ? 'Alt+ArrowLeft Alt+ArrowRight Alt+Home Alt+End' : 'Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Alt+Home Alt+End' });
    else {
      element.dataset['reorderId'] = stableIDToken(id);
      element.setAttribute('aria-level', String(tree.depthOf(id)! + 1));
      element.setAttribute('aria-posinset', String(siblings.indexOf(id)! + 1));
      element.setAttribute('aria-setsize', String(siblings.size));
    }
  }

  protected override acceptsItem(id: ID): boolean { return !this.#scope.columns || getTreeReorderHierarchy(this.getSnapshot().state).has(id); }
  public setDropTarget(element: HTMLElement, target: TreeReorderDropTarget<ID>): void {
    if (!this.active) return;
    const position: PositionTarget<ID> = { kind: 'position', element, parentID: target.parentID, beforeID: target.beforeID ?? null };
    if (!this.active) return;
    const previous = this.#targets.get(element);
    if (previous?.parentID === position.parentID && previous.beforeID === position.beforeID) return;
    unwrap(applyTreeReorderEvent(this.getSnapshot().state, { type: 'move-nodes', ids: [], parentID: position.parentID, beforeID: position.beforeID }));
    this.removeDropTarget(element); if (!this.active) return;
    this.#targets.set(element, position); this.#targetOwners.set(element, position);
  }
  public removeDropTarget(element: HTMLElement): void {
    const target = this.#targets.get(element); if (!target) return;
    this.#targets.delete(element); this.#targetOwners.delete(element); this.invalidateTarget(target);
  }
  private validTarget(target: PositionTarget<ID>): boolean {
    return applyTreeReorderEvent(this.getSnapshot().state, { type: 'move-nodes', ids: [], parentID: target.parentID, beforeID: target.beforeID }).ok;
  }
  protected override resolveDrop(event: PointerLocation): DropTarget<ID> | null {
    if (!this.#scope.columns && this.#targets.size === 0) return super.resolveDrop(event);
    const root = this.root;
    const hit = this.#scope.columns && root.ownerDocument.elementFromPoint ? root.ownerDocument.elementFromPoint(event.clientX, event.clientY) : event.target;
    if (!this.active || !hit || (this.#scope.columns && !root.contains(hit as Node)) || !this.active) return null;
    let id = this.resolveTarget(hit);
    const zone = findDelegatedIdentity(hit, this.root, this.#targetOwners) ?? this.#targets.get(this.root);
    const tree = getTreeReorderHierarchy(this.getSnapshot().state), moving = this.draggedID;
    if (this.#scope.columns && moving !== null && tree.parentOf(moving) === null) {
      const column = id === null ? zone?.parentID ?? null : tree.parentOf(id) ?? id;
      if (column === null) return zone ?? null;
      const target = this.itemTarget(column, event, 'horizontal', this.elements.get(column) ?? zone?.element);
      return target && this.#scope.direction === 'rtl' ? { ...target, before: !target.before } : target;
    }
    if (zone && (id === null || !zone.element.contains(this.elements.get(id) ?? null))) return zone;
    return id === null ? zone ?? null : this.itemTarget(id, event);
  }
  public override disconnect(): void {
    retireTreeScope(this.#scope); this.#targets.clear(); this.#targetOwners = new WeakMap(); super.disconnect();
  }
}

function sameIDs<ID extends StableID>(left: readonly ID[], right: readonly ID[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function sameNodes<ID extends StableID>(left: readonly TreeNodeInput<ID>[], right: readonly TreeNodeInput<ID>[]): boolean {
  return left.length === right.length && left.every((node, index) => node.id === right[index]?.id && node.parentID === right[index]?.parentID);
}
