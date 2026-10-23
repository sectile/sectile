import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import type { Result, StableID } from '@sectile/core';
import type { CheckboxValue } from '@sectile/core/checkbox';
import { unwrap } from '@sectile/core/result';
import { rejectRevisionInput } from '@sectile/core/revision';
import { tryCreateTree, type Tree, type TreeNodeInput } from '@sectile/core/tree';
import { applyTreeViewCheckEvent, tryCreateTreeSelection, tryCreateTreeViewCheckState, type TreeSelectionOptions } from '@sectile/core/tree-view';
import { createTreeController } from './composite/tree-controller.js';
import { setDisclosureAccessibility } from './interaction/attributes.js';
import { connectTreeView, type TreeViewController, type TreeViewControllerOptions, type TreeViewConnection, type TreeViewConnectionOptions } from './tree-view.js';

export interface CheckboxTreeControllerOptions<ID extends StableID = StableID>
  extends Omit<TreeViewControllerOptions<ID>, 'selectionMode' | 'policies'> {
  readonly disabledItems?: readonly ID[];
  readonly disabledPropagation?: TreeSelectionOptions<ID>['disabledPropagation'];
}

export interface CheckboxTreeController<ID extends StableID = StableID>
  extends Omit<TreeViewController<ID>, 'setItemDisabled'> {
  getChecked(id: ID): CheckboxValue | null;
  isDisabled(id: ID): boolean | null;
}

export interface CheckboxTreeConnection<ID extends StableID = StableID>
  extends Omit<TreeViewConnection<ID>, 'setItemAttributes'> {
  getChecked(id: ID): CheckboxValue | null;
  isDisabled(id: ID): boolean | null;
  setItemAttributes(element: HTMLElement, attributes: { readonly id: ID }): void;
  releaseItem(element: HTMLElement, id: ID): void;
}

export interface CheckboxTreeConnectionOptions<ID extends StableID = StableID>
  extends Omit<TreeViewConnectionOptions<ID>, 'controller' | 'disabledItems'> {
  readonly controller: CheckboxTreeController<ID>;
}

export type CheckboxTreeOptions<ID extends StableID = StableID> =
  Omit<CheckboxTreeControllerOptions<ID>, 'tree'>
  & Omit<TreeViewConnectionOptions<ID>, 'controller' | 'disabledItems'>
  & { readonly nodes: readonly TreeNodeInput<ID>[] };

export function createCheckboxTreeController<ID extends StableID>(
  options: CheckboxTreeControllerOptions<NoInfer<ID>> & { readonly tree: Tree<ID> },
): Result<CheckboxTreeController<ID>> {
  return createController(options);
}

function createController<ID extends StableID>(
  options: CheckboxTreeControllerOptions<ID>,
): Result<CheckboxTreeController<ID> & TreeViewController<ID>> {
  const { value, defaultValue, ...owner } = options;
  const projection = tryCreateTreeSelection(owner.tree, {
    selected: value ?? defaultValue ?? [],
    ...(owner.disabledItems === undefined ? {} : { disabled: owner.disabledItems }),
    ...(owner.disabledPropagation === undefined ? {} : { disabledPropagation: owner.disabledPropagation }),
  });
  if (!projection.ok) return projection;
  const checking = projection.value;
  const result = createTreeController({
    ...owner, ...(value === undefined ? { defaultValue: checking.selected } : { value: checking.selected }), selectionMode: 'multiple',
    policies: { eligible: (id) => checking.isDisabled(id) === false },
  }, {
    create: (input) => tryCreateTreeViewCheckState(owner.tree, checking, { ...input, anchor: null }),
    apply: (tree, state, event, policies) => applyTreeViewCheckEvent(tree, state, event, checking, policies),
    accept: (state) => {
      const accepted = checking.accept(state.selection);
      return accepted.ok ? { ok: true, value: undefined } : accepted;
    },
  });
  if (!result.ok) return result;
  const controller = result.value;
  let admitting = false;
  const refused = (): Extract<Result<never>, { readonly ok: false }> => ({ ok: false, error: { class: 'transition-rejection', code: 'tree-selection-reentrant', message: 'Checkbox tree is admitting a controlled state.' } });
  return { ok: true, value: {
    tree: controller.tree, selectionMode: 'multiple',
    getSnapshot: () => controller.getSnapshot(),
    syncControlledValues: (values) => {
      if (admitting) return refused();
      admitting = true;
      try {
        const { value, expandedValues, highlightedValue } = values;
        return controller.syncControlledValues({
          ...(value === undefined ? {} : { value }),
          ...(expandedValues === undefined ? {} : { expandedValues }),
          ...(highlightedValue === undefined ? {} : { highlightedValue }),
        });
      }
      finally { admitting = false; }
    },
    handleKeyboardInput: (input, revision) => admitting
      ? rejectRevisionInput(controller.getSnapshot(), refused().error)
      : controller.handleKeyboardInput(input, revision),
    handleEvent: (event, revision) => admitting
      ? rejectRevisionInput(controller.getSnapshot(), refused().error)
      : controller.handleEvent(event, revision),
    setItemDisabled: (id, disabled) => controller.setItemDisabled(id, disabled),
    getChecked: (id) => checking.getChecked(id),
    isDisabled: (id) => checking.isDisabled(id),
  } };
}

export function createCheckboxTree<ID extends StableID>(
  options: Omit<CheckboxTreeOptions<NoInfer<ID>>, 'nodes'> & { readonly nodes: readonly TreeNodeInput<ID>[] },
): FacadeConnection<CheckboxTreeConnection<ID>> {
  return unwrap(tryCreateCheckboxTree(options));
}

export function tryCreateCheckboxTree<ID extends StableID>(
  options: Omit<CheckboxTreeOptions<NoInfer<ID>>, 'nodes'> & { readonly nodes: readonly TreeNodeInput<ID>[] },
): Result<FacadeConnection<CheckboxTreeConnection<ID>>> {
  return createFacadeConnection(options, createConnection);
}

function createConnection<ID extends StableID>(options: CheckboxTreeOptions<ID>): Result<CheckboxTreeConnection<ID>> {
  const tree = tryCreateTree(options.nodes);
  if (!tree.ok) return tree;
  const result = createController({ ...options, tree: tree.value });
  if (!result.ok) return result;
  return { ok: true, value: connectCheckboxTree({ ...options, controller: result.value }) };
}

/** Attach presentation without recreating the accepted checked-tree owner. */
export function connectCheckboxTree<ID extends StableID>(
  options: CheckboxTreeConnectionOptions<ID>,
): CheckboxTreeConnection<ID> {
  let controller: CheckboxTreeController<ID> | undefined = options.controller;
  const interactionDisabled = options.disabled === true;
  const tree = controller.tree;
  const connection = connectTreeView({ ...options, controller: controllerPort(controller) });
  return {
    tree,
    getChecked: (id) => controller?.getChecked(id) ?? null,
    isDisabled: (id) => controller?.isDisabled(id) ?? null,
    getSnapshot: () => connection.getSnapshot(),
    syncControlledValues: (values) => connection.syncControlledValues(values),
    setTreeAttributes: (label) => connection.setTreeAttributes(label),
    setItemAttributes: (element, { id }) => {
      if (!controller) return;
      connection.setItemAttributes(element, { id, disabled: controller.isDisabled(id) !== false });
      element.removeAttribute('aria-selected');
      const checked = controller.getChecked(id);
      if (checked === null) element.removeAttribute('aria-checked');
      else element.setAttribute('aria-checked', String(checked));
    },
    releaseItem: (element, id) => connection.releaseItem?.(element, id),
    setDisclosureAttributes: (element, id) => {
      if (!controller) return;
      connection.setDisclosureAttributes(element, id);
      setDisclosureAccessibility(element, controller.getSnapshot().state.expansion.has(id), interactionDisabled || controller.isDisabled(id) !== false);
    },
    handleEvent: (event) => connection.handleEvent(event),
    handleKeyboardEvent: (event) => connection.handleKeyboardEvent(event),
    focusCurrent: () => connection.focusCurrent(),
    disconnect: () => { connection.disconnect(); controller = undefined; },
  };
}

function controllerPort<ID extends StableID>(controller: CheckboxTreeController<ID>): TreeViewController<ID> {
  return {
    tree: controller.tree, selectionMode: controller.selectionMode,
    getSnapshot: () => controller.getSnapshot(),
    syncControlledValues: (values) => controller.syncControlledValues(values),
    handleKeyboardInput: (input, revision) => controller.handleKeyboardInput(input, revision),
    handleEvent: (event, revision) => controller.handleEvent(event, revision),
    // Aggregate eligibility belongs to the controller, never mounted row metadata.
    setItemDisabled: () => {},
  };
}
