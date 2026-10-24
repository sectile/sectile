import type { Result, StableID } from '@sectile/core';
import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { tryCreateTree, type Tree, type TreeNodeInput } from '@sectile/core/tree';
import type { TreeSelectEvent, TreeSelectSearchRequest, TreeSelectState } from '@sectile/core/tree-select';
import { createTreeSelectController, toTreeSelectEvent, type TreeSelectController, type TreeSelectControllerOptions, type TreeSelectControlledValues } from './controller.js';
import { stableIDElementToken, stableIDToken } from '../identity.js';
import { findDelegatedStableID } from '../identity/delegated-event.js';
import { setDisclosureAccessibility, setInteractionAttributes } from '../interaction/attributes.js';
import { createHiddenBinding, type HiddenBinding } from '../interaction/visibility.js';
import { createDOMLayerBinding, type DOMLayerBinding, type DOMLayerPresentationListener, type DOMLayerPresentationSubscription, type DOMLayerReparentErrorCode } from '../overlay/layer/binding.js';
import { createPosition, manualPositionConnection, type PositionConnection } from '../overlay/position/connection.js';
import type { LayerHostConnection } from '../layer-host.js';
import type { PositionOptions } from '../position.js';

export interface TreeSelectConnectionOptions<ID extends StableID = StableID> extends PositionOptions {
  readonly controller: TreeSelectController<ID>;
  readonly input: HTMLInputElement;
  readonly popup: HTMLElement;
  readonly layerHost?: LayerHostConnection | null;
  readonly position?: boolean;
  readonly manageVisibility?: boolean;
  readonly getItemElementID?: (id: NoInfer<ID>) => string;
  readonly onUpdate?: () => void;
}
export type TreeSelectOptions<ID extends StableID = StableID> = Omit<TreeSelectControllerOptions<ID>, 'tree'>
  & Omit<TreeSelectConnectionOptions<ID>, 'controller'> & { readonly nodes: readonly TreeNodeInput<ID>[] };
export interface TreeSelectConnection<ID extends StableID = StableID> {
  readonly tree: Tree<ID>;
  getSnapshot(): RevisionSnapshot<TreeSelectState<ID>>;
  getActive(): boolean;
  getLayerOrder(): number | null;
  subscribeLayerPresentation(listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription;
  syncLayerParent(parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode>;
  syncControlledValues(values: TreeSelectControlledValues<NoInfer<ID>>): Result<RevisionSnapshot<TreeSelectState<ID>>>;
  resolveSearch(request: TreeSelectSearchRequest, matches: readonly NoInfer<ID>[]): boolean;
  setInputAttributes(label?: string): void;
  setPopupAttributes(label?: string): void;
  setItemAttributes(element: HTMLElement, attributes: { readonly id: NoInfer<ID> }): void;
  releaseItem(element: HTMLElement, id: NoInfer<ID>): void;
  setDisclosureAttributes(element: HTMLElement, id: NoInfer<ID>): void;
  handleEvent(event: TreeSelectEvent<NoInfer<ID>>): boolean;
  handleKeyboardEvent(event: KeyboardEvent): boolean;
  render(): void;
  suspend(): void;
  resume(): void;
  disconnect(): void;
}
export function createTreeSelect<ID extends StableID>(options: Omit<TreeSelectOptions<NoInfer<ID>>, 'nodes'> & { readonly nodes: readonly TreeNodeInput<ID>[] }): FacadeConnection<TreeSelectConnection<ID>> {
  return unwrap(tryCreateTreeSelect(options));
}
export function tryCreateTreeSelect<ID extends StableID>(options: Omit<TreeSelectOptions<NoInfer<ID>>, 'nodes'> & { readonly nodes: readonly TreeNodeInput<ID>[] }): Result<FacadeConnection<TreeSelectConnection<ID>>> {
  return createFacadeConnection(options, createOwnedConnection);
}
function createOwnedConnection<ID extends StableID>(options: TreeSelectOptions<ID>): Result<TreeSelectConnection<ID>> {
  const tree = tryCreateTree(options.nodes); if (!tree.ok) return tree;
  // The relay captures only its retireable slot and hook, never the options/DOM.
  const relay = updateRelay(options.onUpdate);
  const controller = createTreeSelectController({ ...options, tree: tree.value, onUpdate: relay.update });
  if (!controller.ok) return controller;
  let connection: DOMTreeSelectConnection<ID> | undefined;
  try {
    const { onUpdate: _onUpdate, ...presentation } = options;
    connection = new DOMTreeSelectConnection({ ...presentation, controller: controller.value }, controller.value);
    relay.attach(connection);
    controller.value.activateSearch();
    connection.render();
  } catch (error) {
    relay.clear();
    try { if (connection) connection.disconnect(); else controller.value.dispose(); } catch { /* Preserve construction/activation failure. */ }
    throw error;
  }
  return { ok: true, value: connection };
}
function updateRelay(onUpdate: (() => void) | undefined): {
  update(): void; attach(connection: { render(): void }): void; clear(): void;
} {
  let target: { render(): void } | undefined;
  return { update: () => { completeAll([() => target?.render(), () => onUpdate?.()]); }, attach: connection => { target = connection; }, clear: () => { target = undefined; onUpdate = undefined; } };
}
/** Cleanup/publication phases drain even when an earlier application hook fails. */
function completeAll(operations: readonly (() => void)[]): void {
  let failed = false, first: unknown;
  for (const operation of operations) { try { operation(); } catch (error) { if (!failed) { failed = true; first = error; } } }
  if (failed) throw first;
}
/** Borrow an SSR-created controller; detach never retires the portable owner. */
export function connectTreeSelect<ID extends StableID>(options: TreeSelectConnectionOptions<ID>): TreeSelectConnection<ID> {
  const connection = new DOMTreeSelectConnection(options);
  try { options.controller.activateSearch(); connection.render(); return connection; }
  catch (error) { try { connection.disconnect(); } catch { /* Preserve activation error. */ } throw error; }
}
interface Presentation<ID extends StableID> {
  readonly controller: TreeSelectController<ID>; readonly owned: TreeSelectController<ID> | undefined;
  readonly input: HTMLInputElement; readonly popup: HTMLElement;
  readonly rows: Map<ID, HTMLElement>; readonly owners: WeakMap<HTMLElement, ID>;
  readonly elementID: (id: ID) => string; readonly visibility: HiddenBinding | undefined;
  readonly position: PositionConnection; readonly layer: DOMLayerBinding;
  readonly onUpdate: (() => void) | undefined;
  readonly generatedPopupID: string | undefined;
  active: boolean; composing: boolean; nativeQuery: string | undefined;
}
let nextPopupID = 0;
class DOMTreeSelectConnection<ID extends StableID> implements TreeSelectConnection<ID> {
  public readonly tree: Tree<ID>;
  #scope: Presentation<ID> | undefined;
  #snapshot: RevisionSnapshot<TreeSelectState<ID>>;
  #nativeGeneration = 0;
  readonly #keydown = (event: Event): void => { if (this.handleKeyboardEvent(event as KeyboardEvent)) event.preventDefault(); };
  readonly #input = (): void => {
    const scope = this.#scope; if (!scope || !this.getActive() || scope.composing) return;
    const query = scope.input.value;
    if (scope.nativeQuery === query) return;
    const pending = scope.nativeQuery !== undefined; scope.nativeQuery = query;
    try { this.handleEvent({ type: 'query', query }); }
    finally {
      if (!pending && this.#scope === scope && scope.nativeQuery !== undefined) {
        const generation = ++this.#nativeGeneration;
        queueMicrotask(() => {
          if (generation !== this.#nativeGeneration || !this.#scope) return;
          const current = this.#scope; current.nativeQuery = undefined;
          this.#projectQuery(current, current.controller.getSnapshot().state.request.query);
        });
      }
    }
  };
  readonly #compositionStart = (): void => { if (this.#scope) this.#scope.composing = true; };
  readonly #compositionEnd = (): void => { if (this.#scope) this.#scope.composing = false; this.#input(); };
  readonly #click = (event: Event): void => {
    const scope = this.#scope; if (!scope || !this.getActive() || event.defaultPrevented) return;
    const disclosure = findDelegatedStableID(event.target, scope.popup, 'treeSelectDisclosureId') as ID | null;
    if (disclosure !== null) this.handleEvent({ type: 'set-expanded', id: disclosure, open: !scope.controller.getSnapshot().state.view.expansion.has(disclosure) });
    else { const id = findDelegatedStableID(event.target, scope.popup, 'treeSelectId') as ID | null; if (id !== null) this.handleEvent({ type: 'select', id }); }
  };
  readonly #pointerdown = (event: Event): void => {
    const scope = this.#scope;
    if (scope && this.getActive() && findDelegatedStableID(event.target, scope.popup, 'treeSelectId') !== null) event.preventDefault();
  };
  public constructor(options: TreeSelectConnectionOptions<ID>, owned?: TreeSelectController<ID>) {
    this.tree = options.controller.tree; this.#snapshot = options.controller.getSnapshot();
    const visibility = options.manageVisibility === false ? undefined : createHiddenBinding(options.popup);
    const generatedPopupID = options.popup.id ? undefined : `sectile-tree-select-${++nextPopupID}`;
    if (generatedPopupID !== undefined) options.popup.id = generatedPopupID;
    let layer: DOMLayerBinding | undefined, position: PositionConnection = manualPositionConnection;
    try {
      layer = createDOMLayerBinding({ surface: options.popup, owner: options.input,
        ...(options.layerHost === undefined ? {} : { layerHost: options.layerHost }), dismissOnInteractOutside: true,
        readOpen: () => this.#scope?.controller.getSnapshot().state.open ?? false, close: () => { this.handleEvent('close'); },
        presentation: { suspend: () => this.#suspend(), resume: () => this.#resume() } });
      position = options.position === false ? manualPositionConnection : createPosition({ root: options.popup, reference: options.input,
        side: options.side, align: options.align, sideOffset: options.sideOffset, collisionPadding: options.collisionPadding,
        collisionBoundary: options.collisionBoundary, avoidCollisions: options.avoidCollisions, arrowPadding: options.arrowPadding,
        hideWhenDetached: options.hideWhenDetached, strategy: options.strategy, tracking: options.tracking });
      const prefix = options.popup.id;
      this.#scope = { controller: options.controller, owned, input: options.input, popup: options.popup, rows: new Map(), owners: new WeakMap(),
        elementID: options.getItemElementID ?? (id => `${prefix}-${stableIDElementToken(id)}`),
        visibility, position, layer, onUpdate: options.onUpdate, generatedPopupID, active: true, composing: false, nativeQuery: undefined };
      this.#bind(); this.render();
    } catch (error) {
      if (this.#scope) { try { this.disconnect(); } catch { /* Preserve construction error. */ } }
      else {
        try { completeAll([() => layer?.disconnect(), () => position.disconnect(), () => visibility?.disconnect(),
          () => { if (generatedPopupID !== undefined && options.popup.id === generatedPopupID) options.popup.id = ''; }]); } catch { /* Preserve acquisition error. */ }
      }
      throw error;
    }
  }
  public getSnapshot(): RevisionSnapshot<TreeSelectState<ID>> { return this.#scope?.controller.getSnapshot() ?? this.#snapshot; }
  public getActive(): boolean { const scope = this.#scope; return !!scope && scope.active && scope.controller.getActive() && scope.layer.getActive(); }
  public getLayerOrder(): number | null { return this.#scope?.layer.getLayerOrder() ?? null; }
  public subscribeLayerPresentation(listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription {
    return this.#scope?.layer.subscribeLayerPresentation(listener) ?? { ok: false, error: { class: 'resource-rejection', code: 'dom.layer-inactive', message: 'TreeSelect is disconnected.' } };
  }
  public syncLayerParent(parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode> {
    return this.#scope?.layer.syncLayerParent(parent) ?? { ok: false, error: { class: 'resource-rejection', code: 'dom.layer-parent-inactive', message: 'TreeSelect is disconnected.' } };
  }
  public syncControlledValues(values: TreeSelectControlledValues<ID>): Result<RevisionSnapshot<TreeSelectState<ID>>> {
    const scope = this.#scope; if (!scope) return { ok: false, error: { class: 'resource-rejection', code: 'connection-destroyed', message: 'TreeSelect is disconnected.' } };
    return this.#publish(scope, () => scope.controller.syncControlledValues(values));
  }
  public resolveSearch(request: TreeSelectSearchRequest, matches: readonly ID[]): boolean { return this.handleEvent({ type: 'results', request, results: matches }); }
  public handleEvent(event: TreeSelectEvent<ID>): boolean {
    const scope = this.#scope; if (!scope || !this.getActive()) return false;
    return this.#publish(scope, () => scope.controller.handleEvent(event).ok);
  }
  #publish<T>(scope: Presentation<ID>, action: () => T): T {
    let result!: T;
    completeAll([() => { result = action(); }, () => { if (this.#scope === scope) this.render(); }, () => { if (this.#scope === scope) scope.onUpdate?.(); }]);
    return result;
  }
  public handleKeyboardEvent(event: KeyboardEvent): boolean {
    const scope = this.#scope; if (!scope || !this.getActive() || event.defaultPrevented || scope.composing) return false;
    const state = scope.controller.getSnapshot().state;
    // Native caret movement and form submission stay native in an editable input.
    if (event.target === scope.input && [' ', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return false;
    if ((event.key === 'Escape' && !state.open) || (event.key === 'Enter' && (!state.open || state.pending || state.view.cursor.current === null))) return false;
    const semantic = toTreeSelectEvent<ID>(event); return semantic === null ? false : this.handleEvent(semantic);
  }
  public setInputAttributes(label?: string): void {
    const scope = this.#scope; if (!scope) return;
    const state = scope.controller.getSnapshot().state;
    setInteractionAttributes(scope.input, scope.controller.getInteraction(), true, true);
    scope.input.setAttribute('role', 'combobox'); scope.input.setAttribute('aria-haspopup', 'tree'); scope.input.setAttribute('aria-autocomplete', 'list');
    scope.input.setAttribute('aria-expanded', String(this.getActive() && state.open));
    if (scope.popup.id) scope.input.setAttribute('aria-controls', scope.popup.id); else scope.input.removeAttribute('aria-controls');
    const current = state.view.cursor.current;
    if (this.getActive() && state.open && !state.pending && current !== null && scope.rows.has(current)) scope.input.setAttribute('aria-activedescendant', scope.elementID(current));
    else scope.input.removeAttribute('aria-activedescendant');
    if (label !== undefined) scope.input.setAttribute('aria-label', label);
  }
  public setPopupAttributes(label?: string): void {
    const scope = this.#scope; if (!scope) return;
    const state = scope.controller.getSnapshot().state;
    scope.popup.setAttribute('role', 'tree'); scope.popup.tabIndex = -1;
    scope.popup.setAttribute('aria-busy', String(state.pending));
    if (state.selectionMode === 'multiple') scope.popup.setAttribute('aria-multiselectable', 'true'); else scope.popup.removeAttribute('aria-multiselectable');
    if (label !== undefined) scope.popup.setAttribute('aria-label', label);
    scope.visibility?.setHidden(!this.getActive() || !state.open);
  }
  public setItemAttributes(element: HTMLElement, { id }: { readonly id: ID }): void {
    const scope = this.#scope; if (!scope || !this.tree.has(id)) return;
    const previous = scope.owners.get(element); if (previous !== undefined && previous !== id) scope.rows.delete(previous);
    const displaced = scope.rows.get(id); if (displaced && displaced !== element) scope.owners.delete(displaced);
    scope.rows.set(id, element); scope.owners.set(element, id); this.#projectRow(scope, element, id); this.setInputAttributes();
  }
  public releaseItem(element: HTMLElement, id: ID): void {
    const scope = this.#scope; if (!scope || scope.rows.get(id) !== element) return;
    scope.rows.delete(id); scope.owners.delete(element); this.setInputAttributes();
  }
  public setDisclosureAttributes(element: HTMLElement, id: ID): void {
    const scope = this.#scope; if (!scope || !this.tree.has(id)) return;
    element.dataset['treeSelectDisclosureId'] = stableIDToken(id);
    setDisclosureAccessibility(element, scope.controller.getSnapshot().state.view.expansion.has(id), scope.controller.isDisabled(id) !== false);
  }
  #projectRow(scope: Presentation<ID>, element: HTMLElement, id: ID): void {
    const state = scope.controller.getSnapshot().state;
    element.id = scope.elementID(id); element.dataset['treeSelectId'] = stableIDToken(id); element.tabIndex = -1;
    element.setAttribute('role', 'treeitem'); element.setAttribute('aria-level', String((this.tree.depthOf(id) ?? 0) + 1));
    element.setAttribute('aria-selected', String(state.selection.has(id)));
    if (this.tree.isLeaf(id) === false) element.setAttribute('aria-expanded', String(state.view.expansion.has(id))); else element.removeAttribute('aria-expanded');
    setInteractionAttributes(element, { disabled: scope.controller.isDisabled(id) !== false || state.pending });
  }
  #projectQuery(scope: Presentation<ID>, query: string): void {
    if (!scope.composing && scope.nativeQuery === undefined && scope.input.value !== query) scope.input.value = query;
  }
  public render(): void {
    const scope = this.#scope; if (!scope) return;
    const state = scope.controller.getSnapshot().state;
    this.#projectQuery(scope, state.request.query);
    this.setInputAttributes(); this.setPopupAttributes();
    for (const [id, element] of scope.rows) { if (this.#scope !== scope) return; this.#projectRow(scope, element, id); }
    if (this.#scope !== scope) return;
    scope.layer.sync(); if (this.#scope !== scope) return;
    if (this.getActive() && state.open) scope.position.update(); else scope.position.disconnect();
  }
  public suspend(): void { this.#scope?.layer.suspend(); }
  public resume(): void { this.#scope?.layer.resume(); }
  #bind(): void {
    const scope = this.#scope; if (!scope) return;
    scope.input.addEventListener('keydown', this.#keydown); scope.input.addEventListener('input', this.#input);
    scope.input.addEventListener('compositionstart', this.#compositionStart); scope.input.addEventListener('compositionend', this.#compositionEnd);
    scope.popup.addEventListener('keydown', this.#keydown); scope.popup.addEventListener('click', this.#click); scope.popup.addEventListener('pointerdown', this.#pointerdown);
  }
  #suspend(): void {
    const scope = this.#scope; if (!scope) return;
    scope.active = false;
    completeAll([() => this.#unbind(scope), () => scope.position.disconnect(), () => scope.visibility?.setHidden(true),
      () => { scope.input.removeAttribute('aria-activedescendant'); scope.input.setAttribute('aria-expanded', 'false'); }]);
  }
  #resume(): void { const scope = this.#scope; if (!scope) return; scope.active = true; this.#bind(); this.render(); scope.controller.activateSearch(); }
  #unbind(scope: Presentation<ID>): void {
    this.#nativeGeneration++; scope.nativeQuery = undefined;
    scope.input.removeEventListener('keydown', this.#keydown); scope.input.removeEventListener('input', this.#input);
    scope.input.removeEventListener('compositionstart', this.#compositionStart); scope.input.removeEventListener('compositionend', this.#compositionEnd);
    scope.popup.removeEventListener('keydown', this.#keydown); scope.popup.removeEventListener('click', this.#click); scope.popup.removeEventListener('pointerdown', this.#pointerdown);
  }
  public disconnect(): void {
    const scope = this.#scope; if (!scope) return;
    this.#snapshot = scope.controller.getSnapshot(); this.#scope = undefined;
    completeAll([() => this.#unbind(scope), () => scope.layer.disconnect(), () => scope.position.disconnect(), () => scope.visibility?.disconnect(),
      () => { if (scope.generatedPopupID !== undefined && scope.popup.id === scope.generatedPopupID) scope.popup.id = ''; },
      () => { scope.input.removeAttribute('aria-activedescendant'); scope.input.setAttribute('aria-expanded', 'false'); }, () => { scope.rows.clear(); scope.owned?.dispose(); }]);
  }
}
