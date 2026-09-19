import { failResult, okResult, type Result } from '@sectile/core/result';
import {
  isTextCodeUnitBoundary,
  isWellFormedPlainText,
} from '@sectile/core/text';
import type {
  BlockNode,
  ContentNode,
  IDBearingNode,
  JSONValue,
  NodeID,
  PortableContentDocument,
  TextNode,
} from './document.js';
import type { ContentErrorCode } from './error.js';
import {
  contentCeilingExceeded,
  normalizeContentLimits,
  type ContentLimits,
} from './limits.js';
import type {
  ContentChangeMap,
  InlinePoint,
  LogicalPoint,
  MappedNodeID,
  MappedPoint,
} from './position.js';
import {
  createDocumentIndex,
  type DocumentIndex,
} from './query.js';
import {
  baseRef,
  type CompiledContentSchema,
} from './schema.js';
import { validateDocument } from './validate.js';

export interface PreparedContentState {
  readonly document: PortableContentDocument;
  readonly schema: CompiledContentSchema;
  readonly index: DocumentIndex;
}

export interface PreparedContentResult {
  readonly state: PreparedContentState;
  readonly change: ContentChangeMap;
}

export interface PrepareContentOptions {
  readonly limits?: Partial<ContentLimits>;
}

interface PreparedOwner {
  readonly base: DocumentIndex;
  readonly overrides: ReadonlyMap<NodeID, IDBearingNode>;
  readonly limits: ContentLimits;
  readonly totalStringCodeUnits: number;
}

const owners = new WeakMap<PreparedContentState, PreparedOwner>();

export function prepareContent(
  document: PortableContentDocument,
  schema: CompiledContentSchema,
  options: PrepareContentOptions = {},
): Result<PreparedContentState, ContentErrorCode> {
  const normalized = normalizeContentLimits(options.limits);
  if (!normalized.ok) return normalized;
  const limits = normalized.value;

  const valid = validateDocument(document, schema, { limits });
  if (!valid.ok) return valid;

  const base = createDocumentIndex(document, { limits });
  if (!base.ok) return base;

  return okResult(createPreparedState(
    document,
    schema,
    base.value,
    new Map(),
    limits,
    measureAuthoredStringCodeUnits(document),
  ));
}

/**
 * Performance proof for the common local text-input path.
 * It intentionally supports one canonical text run (or an empty paragraph)
 * and leaves general rich inline replacement to the semantic transform proof.
 */
export function replacePreparedText(
  state: PreparedContentState,
  options: {
    readonly id: NodeID;
    readonly from: number;
    readonly to: number;
    readonly text: string;
  },
): Result<PreparedContentResult, ContentErrorCode> {
  if (!isWellFormedPlainText(options.text)) {
    return operationFailure('Replacement text must be well-formed plain text.');
  }
  if (!state.schema.inlineContent.allows(baseRef('text'))) {
    return operationFailure('Active schema does not allow text in inline content.');
  }

  const node = state.index.getNode(options.id);
  if (node?.type !== 'paragraph' && node?.type !== 'heading') {
    return operationFailure('Prepared text target must be a paragraph or heading.');
  }

  if (node.children.length > 1) {
    return operationFailure(
      'Prepared text proof supports only an empty surface or one canonical text run.',
    );
  }

  const only = node.children[0];
  if (only !== undefined && only.type !== 'text') {
    return operationFailure(
      'Prepared text proof does not mutate surfaces containing inline atoms or hard breaks.',
    );
  }

  const source = only?.text ?? '';
  if (
    !Number.isSafeInteger(options.from)
    || !Number.isSafeInteger(options.to)
    || options.from < 0
    || options.to < options.from
    || options.to > source.length
    || !isTextCodeUnitBoundary(source, options.from)
    || !isTextCodeUnitBoundary(source, options.to)
  ) {
    return positionFailure('Prepared text range is invalid.');
  }

  const nextText =
    source.slice(0, options.from)
    + options.text
    + source.slice(options.to);

  const owner = owners.get(state);
  if (owner === undefined) {
    return operationFailure('Prepared state owner is unavailable.');
  }
  if (nextText.length > owner.limits.maxStringCodeUnits) {
    return contentCeilingExceeded(
      'content-string-code-unit-ceiling-exceeded',
      nextText.length,
      owner.limits.maxStringCodeUnits,
    );
  }
  const nextTotalStringCodeUnits =
    owner.totalStringCodeUnits - source.length + nextText.length;
  if (
    nextTotalStringCodeUnits
    > owner.limits.maxTotalStringCodeUnits
  ) {
    return contentCeilingExceeded(
      'content-total-string-code-unit-ceiling-exceeded',
      nextTotalStringCodeUnits,
      owner.limits.maxTotalStringCodeUnits,
    );
  }

  const marks = only?.marks ?? Object.freeze([]);
  const nextChildren: readonly TextNode[] = nextText.length === 0
    ? Object.freeze([])
    : Object.freeze([
        Object.freeze({
          type: 'text' as const,
          text: nextText,
          marks,
        }),
      ]);

  if (
    nextChildren.length < state.schema.inlineContent.min
    || (
      state.schema.inlineContent.max !== null
      && nextChildren.length > state.schema.inlineContent.max
    )
  ) {
    return operationFailure(
      'Prepared text edit violates inline cardinality.',
    );
  }

  const nextNode = Object.freeze({
    ...node,
    children: nextChildren,
  });

  const replaced = replaceNodeAndAncestors(
    state.document,
    state.index,
    options.id,
    nextNode,
  );
  if (!replaced.ok) return replaced;

  const overrides = new Map(owner.overrides);
  for (const changed of replaced.value.changed) {
    overrides.set(changed.id, changed);
  }

  const nextState = createPreparedState(
    replaced.value.document,
    state.schema,
    owner.base,
    overrides,
    owner.limits,
    nextTotalStringCodeUnits,
  );

  return okResult(
    Object.freeze({
      state: nextState,
      change: inlineTextChange(
        options.id,
        options.from,
        options.to,
        options.text.length,
      ),
    }),
  );
}

function createPreparedState(
  document: PortableContentDocument,
  schema: CompiledContentSchema,
  base: DocumentIndex,
  overrides: ReadonlyMap<NodeID, IDBearingNode>,
  limits: ContentLimits,
  totalStringCodeUnits: number,
): PreparedContentState {
  const index: DocumentIndex = Object.freeze({
    size: base.size,
    visitedNodes: base.visitedNodes,
    getNode: (id: NodeID): IDBearingNode | null =>
      overrides.get(id) ?? base.getNode(id),
    locationOf: (id: NodeID) => base.locationOf(id),
    tree: () => base.tree(),
  });

  const state: PreparedContentState = Object.freeze({
    document,
    schema,
    index,
  });
  owners.set(state, Object.freeze({
    base,
    overrides,
    limits,
    totalStringCodeUnits,
  }));
  return state;
}

function measureAuthoredStringCodeUnits(
  document: PortableContentDocument,
): number {
  let total = 0;
  const stack: StringMetricFrame[] = document.root.children
    .map((node) => ({ kind: 'node' as const, value: node }))
    .reverse();

  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame === undefined) break;

    if (frame.kind === 'data') {
      const value = frame.value;
      if (typeof value === 'string') {
        total += value.length;
        continue;
      }
      if (value === null || typeof value !== 'object') continue;

      if (Array.isArray(value)) {
        for (let index = value.length - 1; index >= 0; index -= 1) {
          const item = value[index];
          if (item !== undefined) {
            stack.push({ kind: 'data', value: item });
          }
        }
        continue;
      }

      for (const [key, nested] of Object.entries(value)) {
        total += key.length;
        stack.push({ kind: 'data', value: nested });
      }
      continue;
    }

    const node = frame.value;
    if (node.type === 'text') {
      total += node.text.length;
      for (const mark of node.marks) {
        if (mark.type !== 'link') continue;
        total += mark.href.length;
        if (mark.title !== undefined) total += mark.title.length;
      }
      continue;
    }

    if (node.type === 'hard-break') continue;

    if (node.type === 'code-block') {
      total += node.text.length;
      continue;
    }

    if (node.type === 'component') {
      stack.push({ kind: 'data', value: node.data });
      for (let slotIndex = node.slots.length - 1; slotIndex >= 0; slotIndex -= 1) {
        const slot = node.slots[slotIndex];
        if (slot === undefined) continue;
        for (let childIndex = slot.content.length - 1; childIndex >= 0; childIndex -= 1) {
          const child = slot.content[childIndex];
          if (child !== undefined) {
            stack.push({ kind: 'node', value: child });
          }
        }
      }
      continue;
    }

    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      const child = node.children[index];
      if (child !== undefined) {
        stack.push({ kind: 'node', value: child });
      }
    }
  }

  return total;
}

type StringMetricFrame =
  | {
      readonly kind: 'node';
      readonly value: ContentNode;
    }
  | {
      readonly kind: 'data';
      readonly value: JSONValue;
    };

function replaceNodeAndAncestors(
  document: PortableContentDocument,
  index: DocumentIndex,
  id: NodeID,
  next: IDBearingNode,
): Result<
  {
    readonly document: PortableContentDocument;
    readonly changed: readonly IDBearingNode[];
  },
  ContentErrorCode
> {
  const changed: IDBearingNode[] = [next];
  let currentID = id;
  let current: IDBearingNode = next;

  while (true) {
    const location = index.locationOf(currentID);
    if (location === null) {
      return operationFailure('Prepared index location is missing.', {
        id: currentID,
      });
    }

    if (location.parentID === null) {
      const children = [...document.root.children];
      const currentBlock = asBlock(current);
      if (!currentBlock.ok) return currentBlock;
      children[location.index] = currentBlock.value;

      return okResult({
        document: Object.freeze({
          ...document,
          root: Object.freeze({
            ...document.root,
            children: Object.freeze(children),
          }),
        }),
        changed: Object.freeze(changed),
      });
    }

    const parent = index.getNode(location.parentID);
    if (parent === null) {
      return operationFailure('Prepared parent node is missing.', {
        id: location.parentID,
      });
    }

    const nextParent = replaceBlockChild(
      parent,
      location.slot,
      location.index,
      current,
    );
    if (!nextParent.ok) return nextParent;

    changed.push(nextParent.value);
    currentID = parent.id;
    current = nextParent.value;
  }
}

function replaceBlockChild(
  parent: IDBearingNode,
  slot: string | null,
  index: number,
  child: IDBearingNode,
): Result<IDBearingNode, ContentErrorCode> {
  const block = asBlock(child);
  if (!block.ok) return block;

  if (
    parent.type === 'blockquote'
    || parent.type === 'list-item'
  ) {
    if (slot !== null) {
      return operationFailure('Base block parent cannot own a named slot.');
    }
    const children = [...parent.children];
    children[index] = block.value;
    return okResult(Object.freeze({
      ...parent,
      children: Object.freeze(children),
    }));
  }

  if (parent.type === 'list') {
    if (slot !== null || block.value.type !== 'list-item') {
      return operationFailure('List ancestors can contain only list-item children.');
    }
    const children = [...parent.children];
    children[index] = block.value;
    return okResult(Object.freeze({
      ...parent,
      children: Object.freeze(children),
    }));
  }

  if (parent.type === 'component' && parent.kind === 'block') {
    if (slot === null) {
      return operationFailure('Component parent requires a named block slot.');
    }

    const slotIndex = parent.slots.findIndex(
      (candidate) => candidate.name === slot,
    );
    const currentSlot = parent.slots[slotIndex];
    if (
      slotIndex < 0
      || currentSlot === undefined
      || currentSlot.kind !== 'block'
    ) {
      return operationFailure('Prepared component block slot is unavailable.');
    }

    const content = [...currentSlot.content];
    content[index] = block.value;
    const slots = [...parent.slots];
    slots[slotIndex] = Object.freeze({
      ...currentSlot,
      content: Object.freeze(content),
    });

    return okResult(Object.freeze({
      ...parent,
      slots: Object.freeze(slots),
    }));
  }

  return operationFailure('Prepared ancestor cannot contain block children.');
}

function asBlock(
  node: IDBearingNode,
): Result<BlockNode, ContentErrorCode> {
  if (node.type === 'component' && node.kind === 'inline') {
    return operationFailure('Inline component cannot replace a block child.');
  }
  return okResult(node as BlockNode);
}

function inlineTextChange(
  id: NodeID,
  from: number,
  to: number,
  insertedLength: number,
): ContentChangeMap {
  return Object.freeze({
    mapPoint: (point: LogicalPoint): MappedPoint => {
      if (
        point.type !== 'inline'
        || point.surface.type !== 'node'
        || point.surface.id !== id
      ) {
        return mappedPoint(point);
      }

      const replacementEnd = from + insertedLength;
      if (from === to) {
        if (point.offset < from) return mappedPoint(point);
        if (point.offset > from) {
          return mappedPoint({
            ...point,
            offset: point.offset + insertedLength,
          });
        }
        return mappedPoint({
          ...point,
          offset: point.affinity === 'after' ? replacementEnd : from,
        });
      }

      if (point.offset < from) return mappedPoint(point);
      if (point.offset > to) {
        return mappedPoint({
          ...point,
          offset: point.offset + insertedLength - (to - from),
        });
      }
      if (point.offset === to) {
        return mappedPoint({
          ...point,
          offset: replacementEnd,
        });
      }
      return mappedPoint({
        ...point,
        offset: point.affinity === 'after' ? replacementEnd : from,
      });
    },
    mapNodeID: (nodeID: NodeID): MappedNodeID =>
      Object.freeze({
        status: 'mapped',
        id: nodeID,
      }),
  });
}

function mappedPoint(point: LogicalPoint): MappedPoint {
  return Object.freeze({
    status: 'mapped',
    point,
  });
}

function positionFailure<T>(
  message: string,
): Result<T, ContentErrorCode> {
  return failResult(
    'transition-rejection',
    'content-position-invalid',
    message,
  );
}

function operationFailure<T>(
  message: string,
  details?: Readonly<Record<string, unknown>>,
): Result<T, ContentErrorCode> {
  return failResult(
    'transition-rejection',
    'content-operation-invalid',
    message,
    details,
  );
}
