import { validateStableID } from '@sectile/core/identity';
import { failResult, okResult, type Result } from '@sectile/core/result';
import { tryCreateTree, type Tree } from '@sectile/core/tree';
import type {
  BlockNode,
  ComponentID,
  ContentNode,
  IDBearingNode,
  InlineNode,
  NodeID,
  PortableContentDocument,
  SlotName,
} from './document.js';
import { isIDBearingNode } from './document.js';
import type { ContentErrorCode } from './error.js';
import {
  contentCeilingExceeded,
  normalizeContentLimits,
  type ContentLimits,
} from './limits.js';
import {
  baseRef,
  type CompiledContentRule,
  type CompiledContentSchema,
  type ConcreteContentTypeRef,
  typeKey,
} from './schema.js';

export type ContentContainerTarget =
  | { readonly type: 'root' }
  | { readonly type: 'node'; readonly id: NodeID; readonly slot?: SlotName };

export interface ContentNodeLocation {
  readonly parentID: NodeID | null;
  readonly slot: SlotName | null;
  readonly index: number;
}

export interface DocumentIndex {
  readonly size: number;
  readonly visitedNodes: number;
  getNode(id: NodeID): IDBearingNode | null;
  locationOf(id: NodeID): ContentNodeLocation | null;
  tree(): Tree<NodeID>;
}

export interface CreateDocumentIndexOptions {
  readonly limits?: Partial<ContentLimits>;
}

export interface ContentChildConstraint {
  readonly kind: 'block' | 'inline';
  readonly min: number;
  readonly max: number | null;
  readonly count: number;
  readonly allowed: readonly ConcreteContentTypeRef[];
  allows(ref: ConcreteContentTypeRef): boolean;
  canAdd(ref: ConcreteContentTypeRef): boolean;
}

interface MutableIndex {
  readonly nodes: Map<NodeID, IDBearingNode>;
  readonly locations: Map<NodeID, ContentNodeLocation>;
  readonly treeInputs: { readonly id: NodeID; readonly parentID: NodeID | null }[];
}

export function createDocumentIndex(
  document: PortableContentDocument,
  options: CreateDocumentIndexOptions = {},
): Result<DocumentIndex, ContentErrorCode> {
  const normalized = normalizeContentLimits(options.limits);
  if (!normalized.ok) return normalized;
  const limits = normalized.value;

  const mutable: MutableIndex = {
    nodes: new Map(),
    locations: new Map(),
    treeInputs: [],
  };
  const stack: PendingNode[] = [];
  const budget: TraversalBudget = { visitedNodes: 0 };

  const roots = enqueueChildren(
    document.root.children,
    null,
    null,
    1,
    stack,
    budget,
    limits,
  );
  if (!roots.ok) return roots;

  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame === undefined) break;

    const indexed = indexNode(frame, mutable, limits);
    if (!indexed.ok) return indexed;

    const children = enqueueNodeChildren(
      frame.node,
      frame.depth + 1,
      stack,
      budget,
      limits,
    );
    if (!children.ok) return children;
  }

  const tree = tryCreateTree(mutable.treeInputs);
  if (!tree.ok) {
    return failResult(
      'construction',
      'content-node-duplicate',
      tree.error.message,
      tree.error.details,
    );
  }

  const result: DocumentIndex = Object.freeze({
    size: mutable.nodes.size,
    visitedNodes: budget.visitedNodes,
    getNode: (id: NodeID): IDBearingNode | null =>
      mutable.nodes.get(id) ?? null,
    locationOf: (id: NodeID): ContentNodeLocation | null =>
      mutable.locations.get(id) ?? null,
    tree: (): Tree<NodeID> => tree.value,
  });
  return okResult(result);
}

export function allowedChildren(
  document: PortableContentDocument,
  options: {
    readonly schema: CompiledContentSchema;
    readonly target: ContentContainerTarget;
    readonly index?: DocumentIndex;
  },
): Result<ContentChildConstraint, ContentErrorCode> {
  const resolved = resolveContainer(document, options);
  if (!resolved.ok) return resolved;
  return okResult(constraintOf(resolved.value.rule, resolved.value.count));
}

export function canInsert(
  document: PortableContentDocument,
  options: {
    readonly schema: CompiledContentSchema;
    readonly target: ContentContainerTarget;
    readonly candidate: ConcreteContentTypeRef;
    readonly index?: DocumentIndex;
  },
): Result<boolean, ContentErrorCode> {
  const constraint = allowedChildren(document, options);
  return constraint.ok
    ? okResult(constraint.value.canAdd(options.candidate))
    : constraint;
}

export function canMove(
  document: PortableContentDocument,
  options: {
    readonly schema: CompiledContentSchema;
    readonly nodeID: NodeID;
    readonly target: ContentContainerTarget;
    readonly index: DocumentIndex;
  },
): Result<boolean, ContentErrorCode> {
  const node = options.index.getNode(options.nodeID);
  const location = options.index.locationOf(options.nodeID);
  if (node === null || location === null) {
    return failResult(
      'transition-rejection',
      'content-target-missing',
      'Move source does not exist.',
      { id: options.nodeID },
    );
  }

  if (options.target.type === 'node') {
    if (options.target.id === options.nodeID) return okResult(false);
    const ancestors = options.index.tree().ancestorsOf(options.target.id);
    if (ancestors !== null && ancestors.includes(options.nodeID)) {
      return okResult(false);
    }
  }

  const destination = resolveContainer(document, {
    schema: options.schema,
    target: options.target,
    index: options.index,
  });
  if (!destination.ok) return destination;

  const ref = refOf(node);
  if (!destination.value.rule.allows(ref)) return okResult(false);
  if (sameContainer(location, options.target)) return okResult(true);

  const sourceTarget = targetFromLocation(location);
  const source = resolveContainer(document, {
    schema: options.schema,
    target: sourceTarget,
    index: options.index,
  });
  if (!source.ok) return source;
  if (source.value.count <= source.value.rule.min) return okResult(false);

  return okResult(
    destination.value.rule.max === null
    || destination.value.count < destination.value.rule.max,
  );
}

function resolveContainer(
  document: PortableContentDocument,
  options: {
    readonly schema: CompiledContentSchema;
    readonly target: ContentContainerTarget;
    readonly index?: DocumentIndex;
  },
): Result<
  { readonly rule: CompiledContentRule; readonly count: number },
  ContentErrorCode
> {
  if (options.target.type === 'root') {
    return okResult({
      rule: options.schema.rootContent,
      count: document.root.children.length,
    });
  }

  const index = options.index;
  if (index === undefined) {
    return failResult(
      'construction',
      'content-target-missing',
      'Node targets require an explicit DocumentIndex.',
    );
  }

  const node = index.getNode(options.target.id);
  if (node === null) {
    return failResult(
      'transition-rejection',
      'content-target-missing',
      'Content target does not exist.',
      { id: options.target.id },
    );
  }

  if (node.type === 'paragraph' || node.type === 'heading') {
    if (options.target.slot !== undefined) return notContainer(node.id);
    return okResult({
      rule: options.schema.inlineContent,
      count: node.children.length,
    });
  }

  if (node.type === 'blockquote' || node.type === 'list-item') {
    if (options.target.slot !== undefined) return notContainer(node.id);
    return okResult({
      rule: requireAtLeastOne(options.schema.blockContent),
      count: node.children.length,
    });
  }

  if (node.type === 'list') {
    if (options.target.slot !== undefined) return notContainer(node.id);
    return okResult({
      rule: fixedListItemRule,
      count: node.children.length,
    });
  }

  if (node.type === 'component' && node.kind === 'block') {
    if (options.target.slot === undefined) {
      return failResult(
        'transition-rejection',
        'content-target-not-container',
        'Component child targets must identify a declared slot.',
        { id: node.id },
      );
    }
    const slot = options.target.slot;
    const component = options.schema.component(node.component);
    const compiledSlot = component?.slot(slot);
    const persistedSlot = node.slots.find(
      (candidate) => candidate.name === slot,
    );
    if (
      compiledSlot === null
      || compiledSlot === undefined
      || persistedSlot === undefined
    ) {
      return failResult(
        'transition-rejection',
        'content-target-not-container',
        'Component slot does not exist in the active schema/document.',
        { id: node.id, slot },
      );
    }
    return okResult({
      rule: compiledSlot.rule,
      count: persistedSlot.content.length,
    });
  }

  return notContainer(node.id);
}

function constraintOf(
  rule: CompiledContentRule,
  count: number,
): ContentChildConstraint {
  return Object.freeze({
    kind: rule.kind,
    min: rule.min,
    max: rule.max,
    count,
    allowed: rule.allowed,
    allows: (ref: ConcreteContentTypeRef): boolean => rule.allows(ref),
    canAdd: (ref: ConcreteContentTypeRef): boolean =>
      rule.allows(ref) && (rule.max === null || count < rule.max),
  });
}

interface PendingNode {
  readonly node: IDBearingNode;
  readonly parentID: NodeID | null;
  readonly slot: SlotName | null;
  readonly index: number;
  readonly depth: number;
}

interface TraversalBudget {
  visitedNodes: number;
}

function enqueueNodeChildren(
  node: IDBearingNode,
  depth: number,
  stack: PendingNode[],
  budget: TraversalBudget,
  limits: ContentLimits,
): Result<true, ContentErrorCode> {
  if (node.type === 'paragraph' || node.type === 'heading') {
    return enqueueChildren(
      node.children,
      node.id,
      null,
      depth,
      stack,
      budget,
      limits,
    );
  }
  if (node.type === 'blockquote' || node.type === 'list-item') {
    return enqueueChildren(
      node.children,
      node.id,
      null,
      depth,
      stack,
      budget,
      limits,
    );
  }
  if (node.type === 'list') {
    return enqueueChildren(
      node.children,
      node.id,
      null,
      depth,
      stack,
      budget,
      limits,
    );
  }
  if (node.type !== 'component') return okResult(true);

  if (node.slots.length > limits.maxSlotsPerComponent) {
    return contentCeilingExceeded(
      'content-slot-ceiling-exceeded',
      node.slots.length,
      limits.maxSlotsPerComponent,
      { id: node.id },
    );
  }

  for (let slotIndex = node.slots.length - 1; slotIndex >= 0; slotIndex -= 1) {
    const componentSlot = node.slots[slotIndex];
    if (componentSlot === undefined) continue;
    const queued = enqueueChildren(
      componentSlot.content,
      node.id,
      componentSlot.name,
      depth,
      stack,
      budget,
      limits,
    );
    if (!queued.ok) return queued;
  }
  return okResult(true);
}

function enqueueChildren(
  nodes: readonly ContentNode[],
  parentID: NodeID | null,
  slot: SlotName | null,
  depth: number,
  stack: PendingNode[],
  budget: TraversalBudget,
  limits: ContentLimits,
): Result<true, ContentErrorCode> {
  if (depth > limits.maxDepth && nodes.length > 0) {
    return contentCeilingExceeded(
      'content-depth-ceiling-exceeded',
      depth,
      limits.maxDepth,
    );
  }

  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index];
    if (node === undefined) {
      return failResult(
        'construction',
        'content-child-invalid',
        'Content arrays must be dense.',
        { index },
      );
    }

    budget.visitedNodes += 1;
    if (budget.visitedNodes > limits.maxNodes) {
      return contentCeilingExceeded(
        'content-node-ceiling-exceeded',
        budget.visitedNodes,
        limits.maxNodes,
      );
    }

    if (!isIDBearingNode(node)) continue;
    stack.push(Object.freeze({
      node,
      parentID,
      slot,
      index,
      depth,
    }));
  }
  return okResult(true);
}

function indexNode(
  frame: PendingNode,
  output: MutableIndex,
  limits: ContentLimits,
): Result<true, ContentErrorCode> {
  const { node } = frame;
  if (typeof node.id !== 'string') {
    return failResult(
      'construction',
      'content-node-id-invalid',
      'ID-bearing content nodes require a string id.',
    );
  }

  const idError = validateStableID(node.id, limits.maxIDCodeUnits);
  if (idError !== null) {
    if (idError.class === 'resource-rejection') {
      return contentCeilingExceeded(
        'content-id-code-unit-ceiling-exceeded',
        node.id.length,
        limits.maxIDCodeUnits,
      );
    }
    return failResult(
      'construction',
      'content-node-id-invalid',
      idError.message,
      idError.details,
    );
  }

  if (output.nodes.has(node.id)) {
    return failResult(
      'construction',
      'content-node-duplicate',
      'Content node ids must be unique.',
      { id: node.id },
    );
  }

  output.nodes.set(node.id, node);
  output.locations.set(
    node.id,
    Object.freeze({
      parentID: frame.parentID,
      slot: frame.slot,
      index: frame.index,
    }),
  );
  output.treeInputs.push(Object.freeze({
    id: node.id,
    parentID: frame.parentID,
  }));
  return okResult(true);
}

function refOf(node: IDBearingNode): ConcreteContentTypeRef {
  return node.type === 'component'
    ? Object.freeze({ type: 'component', id: node.component as ComponentID })
    : baseRef(node.type);
}

function requireAtLeastOne(
  rule: CompiledContentRule,
): CompiledContentRule {
  if (rule.min >= 1) return rule;
  return Object.freeze({
    ...rule,
    min: 1,
  });
}

function targetFromLocation(
  location: ContentNodeLocation,
): ContentContainerTarget {
  if (location.parentID === null) {
    return Object.freeze({ type: 'root' });
  }
  return location.slot === null
    ? Object.freeze({
        type: 'node',
        id: location.parentID,
      })
    : Object.freeze({
        type: 'node',
        id: location.parentID,
        slot: location.slot,
      });
}

function sameContainer(
  location: ContentNodeLocation,
  target: ContentContainerTarget,
): boolean {
  if (target.type === 'root') return location.parentID === null;
  return (
    location.parentID === target.id
    && location.slot === (target.slot ?? null)
  );
}

function notContainer<T>(
  id: NodeID,
): Result<T, ContentErrorCode> {
  return failResult(
    'transition-rejection',
    'content-target-not-container',
    'Content target cannot contain children.',
    { id },
  );
}

const fixedListItemRule: CompiledContentRule = Object.freeze({
  kind: 'block',
  min: 1,
  max: null,
  allowed: Object.freeze([baseRef('list-item')]),
  allows: (ref: ConcreteContentTypeRef): boolean =>
    typeKey(ref) === 'base:list-item',
});
