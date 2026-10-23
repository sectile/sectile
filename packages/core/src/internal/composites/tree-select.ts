import type { Result, StableID } from '../../shared.js';
import { unwrap } from '../../result.js';
import { tryCreateTree, type Tree, type TreeNodeInput } from '../../structures/tree.js';
import { fail, ok } from '../kernel/foundation.js';
import { createMachineUpdate } from '../kernel/machine.js';
import { isWellFormedPlainText } from '../editing/text.js';
import { clearSelection, createSelectionState, selectOne, toggleMultipleSelection, type SelectionState } from '../state/selection.js';
import { createExpansionState, setExpansionOpen, type ExpansionState } from '../state/expansion.js';
import { applyTreeViewEvent, reconcileTreeViewState, tryCreateTreeViewState, type TreeViewState, type TreeViewEvent, type TreeViewCommand } from './tree-view.js';

/** Search navigation only. Value membership and leaf eligibility use the source Tree. */
export interface TreeSelectResults<ID extends StableID = StableID> {
  readonly tree: Tree<ID>;
  /** Application matches, without context-only ancestors, in source preorder. */
  readonly matches: readonly ID[];
  isMatch(id: ID): boolean;
}
const ownerProof: unique symbol = /* @__PURE__ */ Symbol('sectile.tree-select.issuer');

class SearchProjection<ID extends StableID> implements TreeSelectResults<ID> {
  readonly #owner: Tree<ID>;
  readonly #matches: ReadonlySet<ID>;
  public readonly tree: Tree<ID>;
  public readonly matches: readonly ID[];
  public constructor(proof: typeof ownerProof, owner: Tree<ID>, tree: Tree<ID>, matches: ID[], membership: Set<ID>) {
    if (proof !== ownerProof) throw new TypeError('TreeSelect projections must be issued by their owner.');
    this.#owner = owner; this.tree = tree; this.matches = Object.freeze(matches); this.#matches = membership;
    Object.freeze(this);
  }
  public static owns(tree: object, value: unknown): boolean {
    return typeof value === 'object' && value !== null && #owner in value && value.#owner === tree;
  }
  public isMatch(id: ID): boolean { return this.#matches.has(id); }
}

/** Private provenance check for the combined search/selection protocol. */
export function ownsTreeSelectResults<ID extends StableID>(tree: Tree<ID>, results: TreeSelectResults<ID>): boolean {
  return SearchProjection.owns(tree, results);
}

export function createTreeSelectResults<ID extends StableID>(tree: Tree<ID>, matches: readonly NoInfer<ID>[]): TreeSelectResults<ID> {
  return unwrap(tryCreateTreeSelectResults(tree, matches));
}

/** One explicit search-result boundary; never run this per rendered item. */
export function tryCreateTreeSelectResults<ID extends StableID>(tree: Tree<ID>, matches: readonly NoInfer<ID>[]): Result<TreeSelectResults<ID>> {
  if (!Array.isArray(matches)) return fail('construction', 'invalid-boundary', 'TreeSelect matches require an array of distinct tree identities.');
  const order = tree.preorder(), count = matches.length;
  if (!Number.isSafeInteger(count) || count < 0) return fail('construction', 'invalid-boundary', 'TreeSelect matches require a safe array length.');
  if (count > order.size) return fail('resource-rejection', 'item-ceiling-exceeded', 'TreeSelect matches exceed the source tree size.', { count, maxItems: order.size });
  const membership = new Set<ID>();
  for (let index = 0; index < count; index++) {
    const id = matches[index]!;
    if (!order.contains(id)) return fail('construction', 'tree-select-match-outside-tree', 'Search matches must belong to the source tree.', { id });
    if (membership.has(id)) return fail('construction', 'tree-select-duplicate-match', 'Search matches must have distinct stable identities.', { id });
    membership.add(id);
  }
  const included = new Set<ID>();
  for (const match of membership) {
    let id: ID | null = match;
    while (id !== null && !included.has(id)) {
      if (!order.contains(id)) return fail('construction', 'invalid-boundary', 'TreeSelect requires coherent source parents.');
      included.add(id); id = tree.parentOf(id);
    }
  }
  const nodes: TreeNodeInput<ID>[] = [], canonical: ID[] = [];
  for (let index = 0; index < order.size; index++) {
    const id = order.at(index);
    if (id === null) return fail('construction', 'invalid-boundary', 'TreeSelect requires a coherent source preorder.');
    if (included.has(id)) nodes.push({ id, parentID: tree.parentOf(id) });
    if (membership.has(id)) canonical.push(id);
  }
  if (nodes.length !== included.size || canonical.length !== membership.size) {
    return fail('construction', 'invalid-boundary', 'TreeSelect source preorder must contain its distinct matches and ancestors.');
  }
  const projected = membership.size === order.size ? ok(tree) : tryCreateTree(nodes, {
    maxItems: order.maxItems, maxIDCodeUnits: order.maxIDCodeUnits, maxDepth: Math.max(1, nodes.length),
  });
  return projected.ok ? ok(new SearchProjection(ownerProof, tree, projected.value, canonical, membership)) : projected;
}

declare const searchRequest: unique symbol;
export interface TreeSelectSearchRequest { readonly query: string; readonly [searchRequest]: true }
export interface TreeSelectState<ID extends StableID = StableID> {
  readonly open: boolean;
  readonly selectionMode: 'single' | 'multiple';
  readonly selection: SelectionState<ID>;
  /** Persistent user expansion on the full source tree. */
  readonly expansion: ExpansionState<ID>;
  /** Navigation only; result context may be temporarily expanded during search. */
  readonly view: Pick<TreeViewState<ID>, 'cursor' | 'expansion'>;
  readonly request: TreeSelectSearchRequest;
  readonly pending: boolean;
  /** Last accepted projection; pending results are not interactive. Null means the full source tree. */
  readonly results: TreeSelectResults<ID> | null;
}
export interface TreeSelectStateInput<ID extends StableID = StableID> {
  readonly open?: boolean; readonly selectionMode?: 'single' | 'multiple'; readonly selected?: readonly ID[];
  readonly expanded?: readonly ID[]; readonly current?: ID | null; readonly query?: string;
  readonly results?: TreeSelectResults<ID>;
}
type NavigationEvent<ID extends StableID> = Exclude<TreeViewEvent<ID>, 'toggle-select' | { readonly type: 'toggle-select'; readonly id: ID }>;
export type TreeSelectEvent<ID extends StableID = StableID> = NavigationEvent<ID> | 'open' | 'close' | 'toggle' | 'select' | 'clear'
  | { readonly type: 'select'; readonly id: ID }
  | { readonly type: 'query'; readonly query: string }
  | { readonly type: 'results'; readonly request: TreeSelectSearchRequest; readonly results: TreeSelectResults<ID> | readonly ID[] };
export interface TreeSelectPolicies<ID extends StableID = StableID> {
  readonly eligible?: (id: ID) => boolean;
  /** Defaults to source leaves; independent from focus/expansion eligibility. */
  readonly selectable?: (id: ID, leaf: boolean) => boolean;
  /** Defaults to true for single selection, false for multiple. */
  readonly closeOnSelect?: boolean;
}
export type TreeSelectCommand<ID extends StableID = StableID> = TreeViewCommand<ID>
  | { readonly type: 'close-popup' } | { readonly type: 'search'; readonly request: TreeSelectSearchRequest };
export interface TreeSelectUpdate<ID extends StableID = StableID> { readonly state: TreeSelectState<ID>; readonly commands: readonly TreeSelectCommand<ID>[] }
export interface TreeSelectControlledParts {
  readonly selection?: boolean; readonly open?: boolean; readonly query?: boolean; readonly expansion?: boolean; readonly cursor?: boolean;
}
export interface TreeSelectSyncInput<ID extends StableID = StableID> {
  readonly selected?: readonly ID[]; readonly expanded?: readonly ID[]; readonly current?: ID | null;
  /** Repair only an omitted, now-hidden cursor; explicit cursors remain strict. */
  readonly cursorFallback?: 'preserve' | 'first';
  readonly open?: boolean; readonly query?: string;
  readonly results?: { readonly request: TreeSelectSearchRequest; readonly results: TreeSelectResults<ID> | readonly ID[] };
}
type StateData<ID extends StableID> = Omit<TreeSelectState<ID>, 'view'> & { readonly view: TreeViewState<ID> };
class SelectSnapshot<ID extends StableID> implements TreeSelectState<ID> {
  readonly #owner: Tree<ID>;
  public readonly open: boolean; public readonly selectionMode: 'single' | 'multiple'; public readonly selection: SelectionState<ID>;
  public readonly expansion: ExpansionState<ID>; public readonly view: TreeViewState<ID>;
  public readonly request: TreeSelectSearchRequest; public readonly pending: boolean; public readonly results: TreeSelectResults<ID> | null;
  public constructor(proof: typeof ownerProof, owner: Tree<ID>, data: StateData<ID>) {
    if (proof !== ownerProof) throw new TypeError('TreeSelect states must be issued by their owner.');
    this.#owner = owner; this.open = data.open; this.selectionMode = data.selectionMode; this.selection = data.selection;
    this.expansion = data.expansion; this.view = data.view; this.request = data.request; this.pending = data.pending; this.results = data.results;
    Object.freeze(this);
  }
  public static owns(owner: object, value: unknown): boolean {
    return typeof value === 'object' && value !== null && #owner in value && value.#owner === owner;
  }
}
function issueRequest(query: string): TreeSelectSearchRequest { return Object.freeze({ query }) as TreeSelectSearchRequest; }
const noIDs: readonly never[] = /* @__PURE__ */ Object.freeze([]);
function captureIDs<ID extends StableID>(values: readonly ID[], maximum: number): Result<readonly ID[]> {
  if (!Array.isArray(values)) return fail('construction', 'invalid-boundary', 'TreeSelect requires indexed identity arrays.');
  const size = values.length;
  if (!Number.isSafeInteger(size) || size < 0) return fail('construction', 'invalid-boundary', 'TreeSelect requires a safe array length.');
  if (size > maximum) return fail('resource-rejection', 'item-ceiling-exceeded', 'TreeSelect input exceeds the source tree ceiling.');
  const output: ID[] = [];
  for (let index = 0; index < size; index++) output.push(values[index]!);
  return ok(output);
}
function createView<ID extends StableID>(tree: Tree<ID>, expansion: ExpansionState<ID>, results: TreeSelectResults<ID> | null,
  current: ID | null = null): Result<TreeViewState<ID>> {
  const domain = results?.tree ?? tree;
  return tryCreateTreeViewState(domain, { expanded: results ? domain.preorder().ids : expansion.ids, current }, 'single');
}
export function createTreeSelectState<ID extends StableID>(tree: Tree<ID>, input: TreeSelectStateInput<NoInfer<ID>> = {}): TreeSelectState<ID> {
  return unwrap(tryCreateTreeSelectState(tree, input));
}
export function tryCreateTreeSelectState<ID extends StableID>(tree: Tree<ID>, input: TreeSelectStateInput<NoInfer<ID>> = {}): Result<TreeSelectState<ID>> {
  const results = input.results ?? null;
  if (results !== null && !ownsTreeSelectResults(tree, results)) return fail('construction', 'tree-select-results-owner-mismatch', 'TreeSelect results require their exact source tree.');
  const { open = false, selectionMode = 'single', query = '', selected = noIDs, expanded = noIDs, current = null } = input;
  if (typeof open !== 'boolean' || selectionMode !== 'single' && selectionMode !== 'multiple') return fail('construction', 'invalid-boundary', 'TreeSelect requires boolean open and a single/multiple selection mode.');
  if (!isWellFormedPlainText(query)) return fail('construction', 'invalid-tree-select-query', 'TreeSelect query must be well-formed plain text.');
  const maximum = tree.preorder().maxItems, selectedInput = captureIDs(selected, maximum);
  if (!selectedInput.ok) return selectedInput;
  const expansionInput = captureIDs(expanded, maximum);
  if (!expansionInput.ok) return expansionInput;
  const source = tryCreateTreeViewState(tree, { selected: selectedInput.value, expanded: expansionInput.value }, selectionMode);
  if (!source.ok) return source;
  const view = createView(tree, source.value.expansion, results, current);
  return view.ok ? ok(new SelectSnapshot(ownerProof, tree, { open, selectionMode, selection: source.value.selection,
    expansion: source.value.expansion, view: view.value, request: issueRequest(query), pending: query !== '' && results === null, results })) : view;
}
function updateState<ID extends StableID>(tree: Tree<ID>, state: SelectSnapshot<ID>, patch: Partial<StateData<ID>>): SelectSnapshot<ID> {
  const { open = state.open, selectionMode = state.selectionMode, selection = state.selection, expansion = state.expansion,
    view = state.view, request = state.request, pending = state.pending, results = state.results } = patch;
  return open === state.open && selection === state.selection && expansion === state.expansion && view === state.view
    && request === state.request && pending === state.pending && results === state.results ? state
    : new SelectSnapshot(ownerProof, tree, { open, selectionMode, selection, expansion, view, request, pending, results });
}
function focusView<ID extends StableID>(domain: Tree<ID>, view: TreeViewState<ID>, current: ID | null, policies: TreeSelectPolicies<ID>) {
  const navigation = policies.eligible === undefined ? {} : { eligible: policies.eligible };
  if (current !== null) {
    const focused = applyTreeViewEvent(domain, view, { type: 'focus', id: current }, navigation);
    if (focused.ok) return focused;
  }
  return applyTreeViewEvent(domain, view, 'first', navigation);
}
export function applyTreeSelectEvent<ID extends StableID>(tree: Tree<ID>, accepted: TreeSelectState<NoInfer<ID>>,
  event: TreeSelectEvent<NoInfer<ID>>, policies: TreeSelectPolicies<NoInfer<ID>> = {}): Result<TreeSelectUpdate<ID>> {
  if (!SelectSnapshot.owns(tree, accepted)) return fail('transition-rejection', 'tree-select-state-owner-mismatch', 'TreeSelect state requires its exact source tree.');
  const state = accepted as SelectSnapshot<ID>;
  if (policies.eligible !== undefined && typeof policies.eligible !== 'function' || policies.selectable !== undefined && typeof policies.selectable !== 'function'
    || policies.closeOnSelect !== undefined && typeof policies.closeOnSelect !== 'boolean') return fail('transition-rejection', 'invalid-boundary', 'TreeSelect policies require predicates and boolean closeOnSelect.');
  if (typeof event === 'object' && event !== null && event.type === 'query') {
    const query = event.query;
    if (!isWellFormedPlainText(query)) return fail('transition-rejection', 'invalid-tree-select-query', 'TreeSelect query must be well-formed plain text.');
    if (query === state.request.query) return createMachineUpdate(state);
    const request = issueRequest(query);
    if (query !== '') return createMachineUpdate(updateState(tree, state, { request, pending: true }), [{ type: 'search', request }]);
    const view = createView(tree, state.expansion, null);
    if (!view.ok) return view;
    const focused = focusView(tree, view.value, state.view.cursor.current, policies);
    return focused.ok ? createMachineUpdate(updateState(tree, state, { request, results: null, pending: false, view: focused.value.state }), state.open ? focused.value.commands : []) : focused;
  }
  if (typeof event === 'object' && event !== null && event.type === 'results') {
    if (event.request !== state.request) return fail('transition-rejection', 'tree-select-stale-results', 'Search results belong to an older request.');
    const supplied = event.results;
    const admitted = Array.isArray(supplied) ? tryCreateTreeSelectResults(tree, supplied as readonly ID[]) : ok(supplied as TreeSelectResults<ID>);
    if (!admitted.ok) return admitted;
    const results = admitted.value;
    if (!ownsTreeSelectResults(tree, results)) return fail('transition-rejection', 'tree-select-results-owner-mismatch', 'Search results require the same full source tree.');
    const view = createView(tree, state.expansion, results);
    if (!view.ok) return view;
    const focused = focusView(results.tree, view.value, state.view.cursor.current, policies);
    return focused.ok ? createMachineUpdate(updateState(tree, state, { results, pending: false, view: focused.value.state }), state.open ? focused.value.commands : []) : focused;
  }
  if (event === 'clear') return createMachineUpdate(updateState(tree, state, { selection: clearSelection(state.selection) }));
  if (event === 'close' || event === 'toggle' && state.open) return createMachineUpdate(updateState(tree, state, { open: false }), state.open ? [{ type: 'close-popup' }] : []);
  const domain = state.results?.tree ?? tree;
  if (event === 'open' || event === 'toggle') {
    if (state.open || state.pending) return createMachineUpdate(updateState(tree, state, { open: true }));
    const focused = focusView(domain, state.view, state.view.cursor.current ?? state.selection.selected[0] ?? null, policies);
    return focused.ok ? createMachineUpdate(updateState(tree, state, { open: true, view: focused.value.state }), focused.value.commands) : focused;
  }
  if (state.pending) return fail('transition-rejection', 'tree-select-search-pending', 'Pending search rows cannot receive navigation or selection.');
  if (event === 'select' || typeof event === 'object' && event !== null && event.type === 'select') {
    if (!state.open) return fail('transition-rejection', 'tree-select-popup-closed', 'TreeSelect selection requires an open popup.');
    const id = event === 'select' ? state.view.cursor.current : event.id;
    if (id === null) return fail('transition-rejection', 'no-cursor', 'TreeSelect selection requires a current row.');
    const focused = applyTreeViewEvent(domain, state.view, { type: 'focus', id }, policies.eligible === undefined ? {} : { eligible: policies.eligible });
    if (!focused.ok) return focused;
    const leaf = tree.isLeaf(id);
    if (leaf === null || !(policies.selectable ? policies.selectable(id, leaf) : leaf)) return fail('transition-rejection', 'tree-select-target-unselectable', 'TreeSelect target is not selectable.');
    const selection = (state.selectionMode === 'single' ? selectOne : toggleMultipleSelection)(state.selection, id, tree.preorder());
    const close = policies.closeOnSelect ?? state.selectionMode === 'single';
    return createMachineUpdate<TreeSelectState<ID>, TreeSelectCommand<ID>>(updateState(tree, state, { selection, view: focused.value.state, open: !close }), close ? [{ type: 'close-popup' }] : focused.value.commands);
  }
  if (typeof event === 'string' ? !['next', 'previous', 'first', 'last', 'right', 'left'].includes(event)
    : event === null || typeof event !== 'object' || event.type !== 'focus' && event.type !== 'set-expanded') {
    return fail('transition-rejection', 'invalid-tree-select-event', 'TreeSelect event is outside its accepted vocabulary.');
  }
  const navigated = applyTreeViewEvent(domain, state.view, event as NavigationEvent<ID>, policies.eligible === undefined ? {} : { eligible: policies.eligible });
  if (!navigated.ok) return navigated;
  let expansion = state.expansion;
  if (navigated.value.state.expansion !== state.view.expansion) {
    const id = typeof event === 'object' && event !== null && event.type === 'set-expanded' ? event.id : state.view.cursor.current;
    if (id !== null) expansion = setExpansionOpen(expansion, id, navigated.value.state.expansion.has(id), tree);
  }
  return createMachineUpdate(updateState(tree, state, { view: navigated.value.state, expansion, open: true }), navigated.value.commands);
}

/** Reconcile accepted parts before a host publishes revisions or executes effects. */
export function reconcileTreeSelectState<ID extends StableID>(tree: Tree<ID>, previous: TreeSelectState<NoInfer<ID>>,
  proposed: TreeSelectState<NoInfer<ID>>, controlled: TreeSelectControlledParts = {}): Result<TreeSelectState<ID>> {
  if (!SelectSnapshot.owns(tree, previous) || !SelectSnapshot.owns(tree, proposed)) return fail('construction', 'tree-select-state-owner-mismatch', 'TreeSelect reconciliation requires issued states of the same source tree.');
  const { selection: keepSelection = false, open: keepOpen = false, query: keepQuery = false, expansion: keepExpansion = false, cursor: keepCursor = false } = controlled;
  if (typeof keepSelection !== 'boolean' || typeof keepOpen !== 'boolean' || typeof keepQuery !== 'boolean'
    || typeof keepExpansion !== 'boolean' || typeof keepCursor !== 'boolean' || previous.selectionMode !== proposed.selectionMode) {
    return fail('construction', 'invalid-boundary', 'TreeSelect requires boolean controlled parts and an unchanged selection mode.');
  }
  const before = previous as SelectSnapshot<ID>, next = proposed as SelectSnapshot<ID>;
  const refusedQuery = keepQuery && before.request !== next.request, search = refusedQuery ? before : next;
  const selection = keepSelection ? before.selection : next.selection, open = keepOpen ? before.open : next.open;
  const expanded = keepExpansion ? before : next, expansion = expanded.expansion;
  const cursor = refusedQuery ? before : keepCursor ? before : next, domain = search.results?.tree ?? tree;
  let expansionView = search.view;
  if (expanded.request === search.request && (expanded.results?.tree ?? tree) === domain) expansionView = expanded.view;
  else if (search.results === null && expansion !== search.expansion) {
    const rebuilt = createView(tree, expansion, null); if (!rebuilt.ok) return rebuilt; expansionView = rebuilt.value;
  }
  const view = reconcileTreeViewState(domain, expansionView, cursor.view, { selection: true, expansion: true }, 'single');
  if (!view.ok) return view;
  const data = { selection, open, expansion, view: view.value, request: search.request, pending: search.pending, results: search.results };
  if (selection === next.selection && open === next.open && expansion === next.expansion && view.value === next.view && search === next) return ok(next);
  return ok(updateState(tree, before, data));
}
function sameIDs<ID extends StableID>(left: readonly ID[], right: readonly ID[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}
/** Admit one complete external update without invalidating unchanged search requests. */
export function synchronizeTreeSelectState<ID extends StableID>(tree: Tree<ID>, accepted: TreeSelectState<NoInfer<ID>>,
  input: TreeSelectSyncInput<NoInfer<ID>>, policies: TreeSelectPolicies<NoInfer<ID>> = {}): Result<TreeSelectUpdate<ID>> {
  if (!SelectSnapshot.owns(tree, accepted)) return fail('construction', 'tree-select-state-owner-mismatch', 'TreeSelect synchronization requires an issued source state.');
  const { selected, expanded, current, open, query, results, cursorFallback = 'preserve' } = input;
  if (cursorFallback !== 'preserve' && cursorFallback !== 'first') return fail('construction', 'invalid-boundary', 'TreeSelect cursor fallback requires preserve or first.');
  if (open !== undefined && typeof open !== 'boolean') return fail('construction', 'invalid-boundary', 'TreeSelect open state must be boolean.');
  const before = accepted as SelectSnapshot<ID>; let state = before, commands: readonly TreeSelectCommand<ID>[] = [];
  if (query !== undefined && query !== state.request.query) {
    const changed = applyTreeSelectEvent(tree, state, { type: 'query', query }, policies);
    if (!changed.ok) return changed; state = changed.value.state as SelectSnapshot<ID>; commands = changed.value.commands;
  }
  if (results !== undefined) {
    const changed = applyTreeSelectEvent(tree, state, { type: 'results', request: results.request, get results() { return results.results; } }, policies);
    if (!changed.ok) return changed; state = changed.value.state as SelectSnapshot<ID>; commands = [...commands, ...changed.value.commands];
  }
  let selection = state.selection, expansion = state.expansion, view = state.view;
  const maximum = tree.preorder().maxItems;
  if (selected !== undefined && selected !== selection.selected) {
    const captured = captureIDs(selected, maximum); if (!captured.ok) return captured;
    const normalized = createSelectionState(tree.preorder(), state.selectionMode, { selected: captured.value });
    if (!normalized.ok) return normalized;
    if (!sameIDs(normalized.value.selected, selection.selected)) selection = normalized.value;
  }
  if (expanded !== undefined && expanded !== expansion.ids) {
    const captured = captureIDs(expanded, maximum); if (!captured.ok) return captured;
    const normalized = createExpansionState(tree, captured.value);
    if (!sameIDs(normalized.ids, expansion.ids)) expansion = normalized;
  }
  const target = current === undefined ? view.cursor.current : current;
  if (expansion !== state.expansion || target !== view.cursor.current) {
    const changed = tryCreateTreeViewState(state.results?.tree ?? tree, {
      expanded: expansion !== state.expansion ? expansion.ids : view.expansion.ids, current: target,
    }, 'single');
    if (!changed.ok) {
      if (current !== undefined || cursorFallback !== 'first' || changed.error.code !== 'tree-view-cursor-hidden') return changed;
      const domain = state.results?.tree ?? tree;
      const unfocused = tryCreateTreeViewState(domain, { expanded: expansion !== state.expansion ? expansion.ids : view.expansion.ids }, 'single');
      if (!unfocused.ok) return unfocused;
      const repaired = focusView(domain, unfocused.value, target, policies);
      if (!repaired.ok) return repaired;
      view = repaired.value.state;
    } else view = changed.value;
  }
  const opened = open ?? state.open;
  if (opened && !state.open && !state.pending) {
    const focused = focusView(state.results?.tree ?? tree, view, target ?? selection.selected[0] ?? null, policies);
    if (!focused.ok) return focused; view = focused.value.state;
  }
  const updated = updateState(tree, state, { selection, expansion, view, open: opened });
  const effects: TreeSelectCommand<ID>[] = commands.filter(command => command.type === 'search');
  if (!updated.open && before.open) effects.push({ type: 'close-popup' });
  else if (updated.open && !updated.pending && updated.view.cursor.current !== null
    && (!before.open || updated.view.cursor.current !== before.view.cursor.current || commands.some(command => command.type === 'focus'))) {
    effects.push({ type: 'focus', id: updated.view.cursor.current });
  }
  return createMachineUpdate(updated, effects);
}
