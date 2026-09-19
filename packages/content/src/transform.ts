import { failResult, okResult, type Result } from '@sectile/core/result';
import { isTextCodeUnitBoundary } from '@sectile/core/text';
import type {
  BlockNode,
  IDBearingNode,
  InlineNode,
  NodeID,
  ParagraphNode,
  PortableContentDocument,
  TextMark,
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
  InlineSurface,
  LogicalPoint,
  MappedNodeID,
  MappedPoint,
  StructuralPoint,
} from './position.js';
import {
  canMove,
  createDocumentIndex,
  type ContentContainerTarget,
  type ContentNodeLocation,
  type DocumentIndex,
} from './query.js';
import type { CompiledContentSchema } from './schema.js';
import { validateDocument } from './validate.js';

export type ContentOperation =
  | ReplaceInlineOperation
  | SetMarkOperation
  | SplitParagraphOperation
  | JoinParagraphOperation
  | MoveBlockOperation
  | RemoveBlockOperation;

export interface ReplaceInlineOperation {
  readonly type: 'replace-inline';
  readonly surface: InlineSurface;
  readonly from: number;
  readonly to: number;
  readonly replacement: readonly InlineNode[];
}

export interface SetMarkOperation {
  readonly type: 'set-mark';
  readonly surface: InlineSurface;
  readonly from: number;
  readonly to: number;
  readonly mark: TextMark;
  readonly enabled: boolean;
}

export interface SplitParagraphOperation {
  readonly type: 'split-paragraph';
  readonly id: NodeID;
  readonly offset: number;
  readonly newID: NodeID;
}

export interface JoinParagraphOperation {
  readonly type: 'join-paragraph';
  readonly firstID: NodeID;
  readonly secondID: NodeID;
}

export interface MoveBlockOperation {
  readonly type: 'move-block';
  readonly id: NodeID;
  readonly target: ContentContainerTarget;
  /**
   * Destination boundary after removing the source when source and target
   * identify the same container.
   */
  readonly index: number;
}

export interface RemoveBlockOperation {
  readonly type: 'remove-block';
  readonly id: NodeID;
}

export interface ContentTransformResult {
  readonly document: PortableContentDocument;
  readonly change: ContentChangeMap;
}

interface MappingStep {
  mapPoint(point: LogicalPoint): MappedPoint;
  mapNodeID(id: NodeID): MappedNodeID;
}

interface SplitInlineResult {
  readonly left: InlineNode[];
  readonly right: InlineNode[];
}

interface ReplacedInlineResult {
  readonly next: InlineNode[];
  readonly removedIDs: ReadonlySet<NodeID>;
  readonly insertedLength: number;
}

export function transformDocument(
  document: PortableContentDocument,
  options: {
    readonly schema: CompiledContentSchema;
    readonly operations: readonly ContentOperation[];
    readonly limits?: Partial<ContentLimits>;
  },
): Result<ContentTransformResult, ContentErrorCode> {
  const normalizedLimits = normalizeContentLimits(options.limits);
  if (!normalizedLimits.ok) return normalizedLimits;
  const limits = normalizedLimits.value;
  if (options.operations.length > limits.maxOperationsPerTransform) {
    return contentCeilingExceeded(
      'content-operation-ceiling-exceeded',
      options.operations.length,
      limits.maxOperationsPerTransform,
    );
  }
  const validationOptions = { limits };
  const starting = validateDocument(
    document,
    options.schema,
    validationOptions,
  );
  if (!starting.ok) return starting;

  const candidate = materializeDocument(document);
  const steps: MappingStep[] = [];

  for (const operation of options.operations) {
    const applied = applyOperation(
      candidate,
      options.schema,
      operation,
      steps,
    );
    if (!applied.ok) return applied;
  }

  const final = validateDocument(
    candidate,
    options.schema,
    validationOptions,
  );
  if (!final.ok) return final;

  deepFreeze(candidate);
  return okResult(
    Object.freeze({
      document: candidate,
      change: createChangeMap(steps),
    }),
  );
}

export function measureInlineContent(
  nodes: readonly InlineNode[],
): number {
  let length = 0;
  for (const node of nodes) {
    length += node.type === 'text' ? node.text.length : 1;
  }
  return length;
}

function applyOperation(
  candidate: PortableContentDocument,
  schema: CompiledContentSchema,
  operation: ContentOperation,
  steps: MappingStep[],
): Result<true, ContentErrorCode> {
  if (operation.type === 'replace-inline') {
    return applyReplaceInline(candidate, operation, steps);
  }
  if (operation.type === 'set-mark') {
    return applySetMark(candidate, operation);
  }
  if (operation.type === 'split-paragraph') {
    return applySplitParagraph(candidate, operation, steps);
  }
  if (operation.type === 'join-paragraph') {
    return applyJoinParagraph(candidate, operation, steps);
  }
  if (operation.type === 'move-block') {
    return applyMoveBlock(candidate, schema, operation, steps);
  }
  return applyRemoveBlock(candidate, operation, steps);
}

function applyReplaceInline(
  candidate: PortableContentDocument,
  operation: ReplaceInlineOperation,
  steps: MappingStep[],
): Result<true, ContentErrorCode> {
  const index = createDocumentIndex(candidate);
  if (!index.ok) return index;

  const sequence = inlineSequence(candidate, operation.surface, index.value);
  if (!sequence.ok) return sequence;

  const replaced = replaceInlineRange(
    sequence.value,
    operation.from,
    operation.to,
    operation.replacement,
  );
  if (!replaced.ok) return replaced;

  sequence.value.splice(
    0,
    sequence.value.length,
    ...replaced.value.next,
  );

  steps.push(
    inlineReplacementStep(
      operation.surface,
      operation.from,
      operation.to,
      replaced.value.insertedLength,
      replaced.value.removedIDs,
    ),
  );
  return okResult(true);
}

function applySetMark(
  candidate: PortableContentDocument,
  operation: SetMarkOperation,
): Result<true, ContentErrorCode> {
  const index = createDocumentIndex(candidate);
  if (!index.ok) return index;
  const sequence = inlineSequence(candidate, operation.surface, index.value);
  if (!sequence.ok) return sequence;

  const first = splitInlineAt(sequence.value, operation.from);
  if (!first.ok) return first;
  const middle = splitInlineAt(
    first.value.right,
    operation.to - operation.from,
  );
  if (!middle.ok) return middle;

  const marked: InlineNode[] = [];
  for (const node of middle.value.left) {
    if (node.type !== 'text') {
      marked.push(node);
      continue;
    }
    marked.push(
      Object.freeze({
        type: 'text',
        text: node.text,
        marks: applyMark(node.marks, operation.mark, operation.enabled),
      }),
    );
  }

  const next = canonicalizeInline([
    ...first.value.left,
    ...marked,
    ...middle.value.right,
  ]);
  sequence.value.splice(0, sequence.value.length, ...next);
  return okResult(true);
}

function applySplitParagraph(
  candidate: PortableContentDocument,
  operation: SplitParagraphOperation,
  steps: MappingStep[],
): Result<true, ContentErrorCode> {
  const index = createDocumentIndex(candidate);
  if (!index.ok) return index;
  if (index.value.getNode(operation.newID) !== null) {
    return operationFailure(
      'Split paragraph newID must not already exist.',
      { id: operation.newID },
    );
  }

  const node = index.value.getNode(operation.id);
  const location = index.value.locationOf(operation.id);
  if (node?.type !== 'paragraph' || location === null) {
    return operationFailure(
      'Split paragraph source must identify a paragraph.',
      { id: operation.id },
    );
  }

  const split = splitInlineAt(node.children, operation.offset);
  if (!split.ok) return split;

  const parentTarget = targetFromLocation(location);
  const parent = blockSequence(candidate, parentTarget, index.value);
  if (!parent.ok) return parent;

  setParagraphChildren(node, canonicalizeInline(split.value.left));
  const nextParagraph: ParagraphNode = {
    id: operation.newID,
    type: 'paragraph',
    children: canonicalizeInline(split.value.right),
  };
  parent.value.splice(location.index + 1, 0, nextParagraph);

  steps.push(
    paragraphSplitStep(
      operation.id,
      operation.newID,
      operation.offset,
    ),
  );
  steps.push(structuralInsertionStep(parentTarget, location.index + 1));
  return okResult(true);
}

function applyJoinParagraph(
  candidate: PortableContentDocument,
  operation: JoinParagraphOperation,
  steps: MappingStep[],
): Result<true, ContentErrorCode> {
  const index = createDocumentIndex(candidate);
  if (!index.ok) return index;

  const first = index.value.getNode(operation.firstID);
  const second = index.value.getNode(operation.secondID);
  const firstLocation = index.value.locationOf(operation.firstID);
  const secondLocation = index.value.locationOf(operation.secondID);
  if (
    first?.type !== 'paragraph'
    || second?.type !== 'paragraph'
    || firstLocation === null
    || secondLocation === null
    || !sameLocationContainer(firstLocation, secondLocation)
    || secondLocation.index !== firstLocation.index + 1
  ) {
    return operationFailure(
      'Join paragraph requires adjacent paragraph siblings.',
    );
  }

  const firstLength = measureInlineContent(first.children);
  setParagraphChildren(
    first,
    canonicalizeInline([
      ...first.children,
      ...second.children,
    ]),
  );

  const parentTarget = targetFromLocation(secondLocation);
  const parent = blockSequence(candidate, parentTarget, index.value);
  if (!parent.ok) return parent;
  parent.value.splice(secondLocation.index, 1);

  steps.push(
    paragraphJoinStep(
      operation.firstID,
      operation.secondID,
      firstLength,
    ),
  );
  steps.push(
    structuralRemovalStep(parentTarget, secondLocation.index),
  );
  return okResult(true);
}

function applyMoveBlock(
  candidate: PortableContentDocument,
  schema: CompiledContentSchema,
  operation: MoveBlockOperation,
  steps: MappingStep[],
): Result<true, ContentErrorCode> {
  const index = createDocumentIndex(candidate);
  if (!index.ok) return index;

  const node = index.value.getNode(operation.id);
  const sourceLocation = index.value.locationOf(operation.id);
  if (
    node === null
    || sourceLocation === null
    || (node.type === 'component' && node.kind === 'inline')
  ) {
    return operationFailure(
      'Move block source must identify a block node.',
      { id: operation.id },
    );
  }

  const allowed = canMove(candidate, {
    schema,
    nodeID: operation.id,
    target: operation.target,
    index: index.value,
  });
  if (!allowed.ok) return allowed;
  if (!allowed.value) {
    return operationFailure(
      'Move block target is not allowed by the active schema.',
      { id: operation.id },
    );
  }

  const sourceTarget = targetFromLocation(sourceLocation);
  if (
    sameContainerTarget(sourceTarget, operation.target)
    && operation.index === sourceLocation.index
  ) {
    return okResult(true);
  }

  const source = blockSequence(candidate, sourceTarget, index.value);
  if (!source.ok) return source;
  const target = blockSequence(candidate, operation.target, index.value);
  if (!target.ok) return target;

  const removed = source.value[sourceLocation.index];
  if (removed === undefined || removed.id !== operation.id) {
    return operationFailure(
      'Move block source location is stale.',
      { id: operation.id },
    );
  }

  source.value.splice(sourceLocation.index, 1);
  if (
    !Number.isSafeInteger(operation.index)
    || operation.index < 0
    || operation.index > target.value.length
  ) {
    return operationFailure(
      'Move block destination index is invalid.',
      { index: operation.index },
    );
  }
  target.value.splice(operation.index, 0, removed);

  steps.push(
    structuralRemovalStep(sourceTarget, sourceLocation.index),
  );
  steps.push(
    structuralInsertionStep(operation.target, operation.index),
  );
  return okResult(true);
}

function applyRemoveBlock(
  candidate: PortableContentDocument,
  operation: RemoveBlockOperation,
  steps: MappingStep[],
): Result<true, ContentErrorCode> {
  const index = createDocumentIndex(candidate);
  if (!index.ok) return index;

  const node = index.value.getNode(operation.id);
  const location = index.value.locationOf(operation.id);
  if (
    node === null
    || location === null
    || (node.type === 'component' && node.kind === 'inline')
  ) {
    return operationFailure(
      'Remove block source must identify a block node.',
      { id: operation.id },
    );
  }

  const sourceTarget = targetFromLocation(location);
  const source = blockSequence(candidate, sourceTarget, index.value);
  if (!source.ok) return source;

  const removed = source.value[location.index];
  if (removed === undefined || removed.id !== operation.id) {
    return operationFailure(
      'Remove block source location is stale.',
      { id: operation.id },
    );
  }

  const removedIDs = subtreeIDs(index.value, operation.id);
  source.value.splice(location.index, 1);

  steps.push(removedSubtreeStep(removedIDs));
  steps.push(structuralRemovalStep(sourceTarget, location.index));
  return okResult(true);
}

function inlineSequence(
  document: PortableContentDocument,
  surface: InlineSurface,
  index: DocumentIndex,
): Result<InlineNode[], ContentErrorCode> {
  const node = index.getNode(surface.id);
  if (node === null) {
    return positionFailure('Inline surface does not exist.');
  }

  if (surface.type === 'node') {
    if (node.type !== 'paragraph' && node.type !== 'heading') {
      return positionFailure('Inline node surface must be a paragraph or heading.');
    }
    return okResult(node.children as InlineNode[]);
  }

  if (node.type !== 'component' || node.kind !== 'block') {
    return positionFailure('Inline slot surface must identify a block component.');
  }
  const slot = node.slots.find(
    (candidate) => candidate.name === surface.slot,
  );
  if (slot === undefined || slot.kind !== 'inline') {
    return positionFailure('Inline slot surface does not exist.');
  }
  return okResult(slot.content as InlineNode[]);
}

function blockSequence(
  document: PortableContentDocument,
  target: ContentContainerTarget,
  index: DocumentIndex,
): Result<BlockNode[], ContentErrorCode> {
  if (target.type === 'root') {
    return okResult(document.root.children as BlockNode[]);
  }

  const node = index.getNode(target.id);
  if (node === null) {
    return operationFailure(
      'Block container does not exist.',
      { id: target.id },
    );
  }

  if (node.type === 'blockquote' || node.type === 'list-item') {
    if (target.slot !== undefined) {
      return operationFailure('Base block container does not own named slots.');
    }
    return okResult(node.children as BlockNode[]);
  }

  if (node.type === 'list') {
    if (target.slot !== undefined) {
      return operationFailure('List does not own named slots.');
    }
    return okResult(node.children as BlockNode[]);
  }

  if (node.type === 'component' && node.kind === 'block') {
    if (target.slot === undefined) {
      return operationFailure(
        'Component block container requires a slot target.',
      );
    }
    const slot = node.slots.find(
      (candidate) => candidate.name === target.slot,
    );
    if (slot === undefined || slot.kind !== 'block') {
      return operationFailure(
        'Component block slot does not exist.',
        { id: node.id, slot: target.slot },
      );
    }
    return okResult(slot.content as BlockNode[]);
  }

  return operationFailure('Target cannot contain block children.');
}

function replaceInlineRange(
  nodes: readonly InlineNode[],
  from: number,
  to: number,
  replacement: readonly InlineNode[],
): Result<ReplacedInlineResult, ContentErrorCode> {
  if (
    !Number.isSafeInteger(from)
    || !Number.isSafeInteger(to)
    || from < 0
    || to < from
  ) {
    return positionFailure('Inline replacement range is invalid.');
  }

  const first = splitInlineAt(nodes, from);
  if (!first.ok) return first;
  const second = splitInlineAt(first.value.right, to - from);
  if (!second.ok) return second;

  const canonicalReplacement = canonicalizeInline(replacement);
  const removedIDs = new Set<NodeID>();
  for (const node of second.value.left) {
    if (node.type === 'component') removedIDs.add(node.id);
  }
  const replacementIDs = new Set<NodeID>();
  for (const node of canonicalReplacement) {
    if (node.type === 'component') replacementIDs.add(node.id);
  }
  for (const id of replacementIDs) removedIDs.delete(id);

  return okResult({
    next: canonicalizeInline([
      ...first.value.left,
      ...canonicalReplacement,
      ...second.value.right,
    ]),
    removedIDs,
    insertedLength: measureInlineContent(canonicalReplacement),
  });
}

function splitInlineAt(
  nodes: readonly InlineNode[],
  offset: number,
): Result<SplitInlineResult, ContentErrorCode> {
  if (!Number.isSafeInteger(offset) || offset < 0) {
    return positionFailure('Inline offset must be a non-negative safe integer.');
  }

  const total = measureInlineContent(nodes);
  if (offset > total) {
    return positionFailure('Inline offset exceeds the surface length.');
  }

  const left: InlineNode[] = [];
  let cursor = 0;

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node === undefined) {
      return positionFailure('Inline content must be dense.');
    }

    if (offset === cursor) {
      return okResult({
        left,
        right: [...nodes.slice(index)],
      });
    }

    const length = node.type === 'text' ? node.text.length : 1;
    const next = cursor + length;

    if (offset < next) {
      if (node.type !== 'text') {
        return positionFailure('Inline atomic nodes cannot be split.');
      }

      const relative = offset - cursor;
      if (!isTextCodeUnitBoundary(node.text, relative)) {
        return positionFailure('Inline text offset splits a surrogate pair.');
      }

      if (relative > 0) {
        left.push(
          Object.freeze({
            type: 'text',
            text: node.text.slice(0, relative),
            marks: node.marks,
          }),
        );
      }

      const right: InlineNode[] = [];
      if (relative < node.text.length) {
        right.push(
          Object.freeze({
            type: 'text',
            text: node.text.slice(relative),
            marks: node.marks,
          }),
        );
      }
      right.push(...nodes.slice(index + 1));
      return okResult({ left, right });
    }

    left.push(node);
    cursor = next;
  }

  return okResult({ left, right: [] });
}

function canonicalizeInline(
  nodes: readonly InlineNode[],
): InlineNode[] {
  const output: InlineNode[] = [];

  for (const node of nodes) {
    if (node.type !== 'text') {
      output.push(node);
      continue;
    }
    if (node.text.length === 0) continue;

    const previous = output[output.length - 1];
    if (
      previous?.type === 'text'
      && sameMarks(previous.marks, node.marks)
    ) {
      output[output.length - 1] = Object.freeze({
        type: 'text',
        text: previous.text + node.text,
        marks: previous.marks,
      });
    } else {
      output.push(node);
    }
  }

  return output;
}

function applyMark(
  marks: readonly TextMark[],
  mark: TextMark,
  enabled: boolean,
): readonly TextMark[] {
  const next = marks.filter((candidate) => candidate.type !== mark.type);
  if (enabled) next.push(mark);
  next.sort((left, right) => markOrder(left) - markOrder(right));
  return Object.freeze(next);
}

function markOrder(mark: TextMark): number {
  if (mark.type === 'strong') return 0;
  if (mark.type === 'emphasis') return 1;
  if (mark.type === 'code') return 2;
  return 3;
}

function sameMarks(
  left: readonly TextMark[],
  right: readonly TextMark[],
): boolean {
  if (left === right) return true;
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (a === undefined || b === undefined || a.type !== b.type) {
      return false;
    }
    if (
      a.type === 'link'
      && b.type === 'link'
      && (a.href !== b.href || a.title !== b.title)
    ) {
      return false;
    }
  }
  return true;
}

function setParagraphChildren(
  paragraph: ParagraphNode,
  children: readonly InlineNode[],
): void {
  (
    paragraph as unknown as { children: InlineNode[] }
  ).children = [...children];
}

function targetFromLocation(
  location: ContentNodeLocation,
): ContentContainerTarget {
  if (location.parentID === null) return Object.freeze({ type: 'root' });
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

function subtreeIDs(
  index: DocumentIndex,
  id: NodeID,
): ReadonlySet<NodeID> {
  const interval = index.tree().subtreeIntervalOf(id);
  if (interval === null) return new Set([id]);
  const ids = index.tree().preorder().ids.slice(
    interval.start,
    interval.endExclusive,
  );
  return new Set(ids);
}

function createChangeMap(
  steps: readonly MappingStep[],
): ContentChangeMap {
  const frozen = Object.freeze([...steps]);
  return Object.freeze({
    mapPoint: (point: LogicalPoint): MappedPoint => {
      let current: MappedPoint = mappedPoint(point);
      for (const step of frozen) {
        if (current.status === 'lost') return current;
        current = step.mapPoint(current.point);
      }
      return current;
    },
    mapNodeID: (id: NodeID): MappedNodeID => {
      let current: MappedNodeID = mappedNode(id);
      for (const step of frozen) {
        if (current.status === 'lost') return current;
        current = step.mapNodeID(current.id);
      }
      return current;
    },
  });
}

function inlineReplacementStep(
  surface: InlineSurface,
  from: number,
  to: number,
  insertedLength: number,
  removedIDs: ReadonlySet<NodeID>,
): MappingStep {
  const removed = new Set(removedIDs);
  return Object.freeze({
    mapPoint: (point: LogicalPoint): MappedPoint => {
      if (
        point.type !== 'inline'
        || !sameSurface(point.surface, surface)
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
          offset: point.affinity === 'after'
            ? replacementEnd
            : from,
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
        offset: point.affinity === 'after'
          ? replacementEnd
          : from,
      });
    },
    mapNodeID: (id: NodeID): MappedNodeID =>
      removed.has(id)
        ? lostNode('inline-node-removed')
        : mappedNode(id),
  });
}

function paragraphSplitStep(
  originalID: NodeID,
  nextID: NodeID,
  splitOffset: number,
): MappingStep {
  return Object.freeze({
    mapPoint: (point: LogicalPoint): MappedPoint => {
      if (
        point.type !== 'inline'
        || point.surface.type !== 'node'
        || point.surface.id !== originalID
      ) {
        return mappedPoint(point);
      }

      if (point.offset < splitOffset) return mappedPoint(point);
      if (point.offset > splitOffset) {
        return mappedPoint({
          ...point,
          surface: Object.freeze({ type: 'node', id: nextID }),
          offset: point.offset - splitOffset,
        });
      }
      return point.affinity === 'before'
        ? mappedPoint(point)
        : mappedPoint({
            ...point,
            surface: Object.freeze({ type: 'node', id: nextID }),
            offset: 0,
          });
    },
    mapNodeID: (id: NodeID): MappedNodeID => mappedNode(id),
  });
}

function paragraphJoinStep(
  firstID: NodeID,
  secondID: NodeID,
  firstLength: number,
): MappingStep {
  return Object.freeze({
    mapPoint: (point: LogicalPoint): MappedPoint => {
      if (
        point.type === 'inline'
        && point.surface.type === 'node'
        && point.surface.id === secondID
      ) {
        return mappedPoint({
          ...point,
          surface: Object.freeze({ type: 'node', id: firstID }),
          offset: firstLength + point.offset,
        });
      }
      return mappedPoint(point);
    },
    mapNodeID: (id: NodeID): MappedNodeID =>
      id === secondID
        ? mappedNode(firstID)
        : mappedNode(id),
  });
}

function removedSubtreeStep(
  ids: ReadonlySet<NodeID>,
): MappingStep {
  const removed = new Set(ids);
  return Object.freeze({
    mapPoint: (point: LogicalPoint): MappedPoint => {
      if (point.type === 'inline' && removed.has(point.surface.id)) {
        return lostPoint('inline-surface-removed');
      }
      if (
        point.type === 'structural'
        && point.container.type === 'node'
        && removed.has(point.container.id)
      ) {
        return lostPoint('structural-container-removed');
      }
      return mappedPoint(point);
    },
    mapNodeID: (id: NodeID): MappedNodeID =>
      removed.has(id)
        ? lostNode('node-removed')
        : mappedNode(id),
  });
}

function structuralRemovalStep(
  container: ContentContainerTarget,
  index: number,
): MappingStep {
  return Object.freeze({
    mapPoint: (point: LogicalPoint): MappedPoint => {
      if (
        point.type !== 'structural'
        || !sameContainerTarget(point.container, container)
        || point.index <= index
      ) {
        return mappedPoint(point);
      }
      return mappedPoint({
        ...point,
        index: point.index - 1,
      });
    },
    mapNodeID: (id: NodeID): MappedNodeID => mappedNode(id),
  });
}

function structuralInsertionStep(
  container: ContentContainerTarget,
  index: number,
): MappingStep {
  return Object.freeze({
    mapPoint: (point: LogicalPoint): MappedPoint => {
      if (
        point.type !== 'structural'
        || !sameContainerTarget(point.container, container)
      ) {
        return mappedPoint(point);
      }
      if (point.index < index) return mappedPoint(point);
      if (point.index > index) {
        return mappedPoint({
          ...point,
          index: point.index + 1,
        });
      }
      return mappedPoint({
        ...point,
        index: point.affinity === 'after'
          ? point.index + 1
          : point.index,
      });
    },
    mapNodeID: (id: NodeID): MappedNodeID => mappedNode(id),
  });
}

function sameSurface(
  left: InlineSurface,
  right: InlineSurface,
): boolean {
  return (
    left.type === right.type
    && left.id === right.id
    && (
      left.type === 'node'
      || (
        right.type === 'slot'
        && left.slot === right.slot
      )
    )
  );
}

function sameContainerTarget(
  left: ContentContainerTarget,
  right: ContentContainerTarget,
): boolean {
  if (left.type !== right.type) return false;
  if (left.type === 'root') return true;
  if (right.type === 'root') return false;
  return (
    left.id === right.id
    && (left.slot ?? null) === (right.slot ?? null)
  );
}

function sameLocationContainer(
  left: ContentNodeLocation,
  right: ContentNodeLocation,
): boolean {
  return (
    left.parentID === right.parentID
    && left.slot === right.slot
  );
}

function mappedPoint(point: LogicalPoint): MappedPoint {
  return Object.freeze({ status: 'mapped', point });
}

function lostPoint(reason: string): MappedPoint {
  return Object.freeze({ status: 'lost', reason });
}

function mappedNode(id: NodeID): MappedNodeID {
  return Object.freeze({ status: 'mapped', id });
}

function lostNode(reason: string): MappedNodeID {
  return Object.freeze({ status: 'lost', reason });
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

function materializeDocument(
  document: PortableContentDocument,
): PortableContentDocument {
  return JSON.parse(JSON.stringify(document)) as PortableContentDocument;
}

function deepFreeze(value: unknown): void {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  Object.freeze(value);
}
