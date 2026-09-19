import { validateStableID } from '@sectile/core/identity';
import { failResult, okResult, type Result } from '@sectile/core/result';
import {
  isTextCodeUnitBoundary,
  isWellFormedPlainText,
} from '@sectile/core/text';
import type {
  InlineContentFragment,
  InlineNode,
  JSONValue,
  NodeID,
  PortableContentDocument,
  TextMark,
} from './document.js';
import type { ContentErrorCode } from './error.js';
import {
  contentCeilingExceeded,
  normalizeContentLimits,
  type ContentLimits,
} from './limits.js';
import type { InlineSurface } from './position.js';
import { createDocumentIndex } from './query.js';
import type {
  CompiledContentSchema,
  DataSchema,
} from './schema.js';

export function createInlineFragment(
  document: PortableContentDocument,
  options: {
    readonly surface: InlineSurface;
    readonly from: number;
    readonly to: number;
  },
): Result<InlineContentFragment, ContentErrorCode> {
  const sequence = inlineSequence(document, options.surface);
  if (!sequence.ok) return sequence;

  const sliced = sliceInline(
    sequence.value,
    options.from,
    options.to,
  );
  if (!sliced.ok) return sliced;

  return okResult(
    Object.freeze({
      formatVersion: 1,
      schema: document.schema,
      kind: 'inline',
      content: Object.freeze(sliced.value),
    }),
  );
}

export function inlineSurfaceLength(
  document: PortableContentDocument,
  surface: InlineSurface,
): Result<number, ContentErrorCode> {
  const sequence = inlineSequence(document, surface);
  return sequence.ok
    ? okResult(measureInline(sequence.value))
    : sequence;
}

export interface PrepareInlineFragmentOptions {
  readonly schema: CompiledContentSchema;
  readonly idMap: ReadonlyMap<NodeID, NodeID>;
  readonly limits?: Partial<ContentLimits>;
}

export function inlineFragmentNodeIDs(
  fragment: InlineContentFragment,
  options: {
    readonly limits?: Partial<ContentLimits>;
  } = {},
): Result<readonly NodeID[], ContentErrorCode> {
  const normalized = normalizeContentLimits(options.limits);
  if (!normalized.ok) return normalized;
  const limits = normalized.value;

  if (fragment.formatVersion !== 1 || fragment.kind !== 'inline') {
    return fragmentFailure('Inline fragment envelope is invalid.');
  }
  if (fragment.content.length > limits.maxNodes) {
    return contentCeilingExceeded(
      'content-node-ceiling-exceeded',
      fragment.content.length,
      limits.maxNodes,
    );
  }

  const ids: NodeID[] = [];
  const seen = new Set<NodeID>();
  for (const node of fragment.content) {
    if (node.type !== 'component') continue;
    if (seen.has(node.id)) {
      return fragmentFailure('Inline fragment node IDs must be unique.');
    }
    const invalid = validateStableID(node.id, limits.maxIDCodeUnits);
    if (invalid !== null) {
      return invalid.class === 'resource-rejection'
        ? contentCeilingExceeded(
            'content-id-code-unit-ceiling-exceeded',
            node.id.length,
            limits.maxIDCodeUnits,
          )
        : fragmentFailure(invalid.message);
    }
    seen.add(node.id);
    ids.push(node.id);
  }
  return okResult(Object.freeze(ids));
}

export function prepareInlineFragment(
  fragment: InlineContentFragment,
  options: PrepareInlineFragmentOptions,
): Result<InlineContentFragment, ContentErrorCode> {
  const normalized = normalizeContentLimits(options.limits);
  if (!normalized.ok) return normalized;
  const limits = normalized.value;

  if (
    fragment.formatVersion !== 1
    || fragment.kind !== 'inline'
    || fragment.schema.id !== options.schema.id
    || fragment.schema.version !== options.schema.version
  ) {
    return fragmentFailure(
      'Inline fragment schema must match the active compiled schema.',
    );
  }

  const ids = inlineFragmentNodeIDs(fragment, { limits });
  if (!ids.ok) return ids;

  const mappedIDs = new Set<NodeID>();
  for (const sourceID of ids.value) {
    const mapped = options.idMap.get(sourceID);
    if (mapped === undefined) {
      return fragmentFailure(
        'Inline fragment ID map is missing a copied node ID.',
      );
    }
    const invalid = validateStableID(mapped, limits.maxIDCodeUnits);
    if (invalid !== null) {
      return invalid.class === 'resource-rejection'
        ? contentCeilingExceeded(
            'content-id-code-unit-ceiling-exceeded',
            mapped.length,
            limits.maxIDCodeUnits,
          )
        : fragmentFailure(invalid.message);
    }
    if (mappedIDs.has(mapped)) {
      return fragmentFailure(
        'Inline fragment ID map must allocate unique destination IDs.',
      );
    }
    mappedIDs.add(mapped);
  }

  const budget: FragmentDataBudget = {
    values: 0,
    totalStringCodeUnits: 0,
  };
  const content: InlineNode[] = [];
  for (const node of fragment.content) {
    if (node.type === 'text') {
      const text = cloneFragmentText(node.text, limits, budget);
      if (!text.ok) return text;
      const marks = cloneFragmentMarks(node.marks, limits, budget);
      if (!marks.ok) return marks;
      content.push(Object.freeze({
        type: 'text',
        text: text.value,
        marks: marks.value,
      }));
      continue;
    }

    if (node.type === 'hard-break') {
      content.push(Object.freeze({ type: 'hard-break' }));
      continue;
    }

    const descriptor = options.schema.component(node.component);
    if (
      descriptor === null
      || descriptor.descriptor.kind !== 'inline'
      || descriptor.descriptor.componentVersion !== node.componentVersion
      || descriptor.descriptor.slots.length !== 0
      || node.kind !== 'inline'
      || node.slots.length !== 0
    ) {
      return fragmentFailure(
        'Inline fragment component does not match the active component contract.',
      );
    }

    const mappedID = options.idMap.get(node.id);
    if (mappedID === undefined) {
      return fragmentFailure(
        'Inline fragment ID map is missing a copied component ID.',
      );
    }

    const data = remapFragmentData(
      node.data,
      descriptor.descriptor.data,
      options.idMap,
      limits,
      budget,
      1,
    );
    if (!data.ok) return data;

    content.push(Object.freeze({
      id: mappedID,
      type: 'component',
      kind: 'inline',
      component: node.component,
      componentVersion: node.componentVersion,
      data: data.value,
      slots: Object.freeze([]) as readonly [],
    }));
  }

  return okResult(Object.freeze({
    formatVersion: 1,
    schema: fragment.schema,
    kind: 'inline',
    content: Object.freeze(content),
  }));
}

export function inlineFragmentText(
  fragment: InlineContentFragment,
): string {
  let output = '';
  for (const node of fragment.content) {
    if (node.type === 'text') output += node.text;
    else if (node.type === 'hard-break') output += '\n';
  }
  return output;
}

interface FragmentDataBudget {
  values: number;
  totalStringCodeUnits: number;
}

function cloneFragmentText(
  value: string,
  limits: ContentLimits,
  budget: FragmentDataBudget,
): Result<string, ContentErrorCode> {
  if (!isWellFormedPlainText(value)) {
    return fragmentFailure('Inline fragment strings must be well-formed UTF-16.');
  }
  if (value.length > limits.maxStringCodeUnits) {
    return contentCeilingExceeded(
      'content-string-code-unit-ceiling-exceeded',
      value.length,
      limits.maxStringCodeUnits,
    );
  }
  budget.totalStringCodeUnits += value.length;
  if (budget.totalStringCodeUnits > limits.maxTotalStringCodeUnits) {
    return contentCeilingExceeded(
      'content-total-string-code-unit-ceiling-exceeded',
      budget.totalStringCodeUnits,
      limits.maxTotalStringCodeUnits,
    );
  }
  return okResult(value);
}

function cloneFragmentMarks(
  marks: readonly TextMark[],
  limits: ContentLimits,
  budget: FragmentDataBudget,
): Result<readonly TextMark[], ContentErrorCode> {
  if (marks.length > limits.maxMarksPerText) {
    return contentCeilingExceeded(
      'content-mark-ceiling-exceeded',
      marks.length,
      limits.maxMarksPerText,
    );
  }

  const output: TextMark[] = [];
  let previousOrder = -1;
  for (const mark of marks) {
    const order = fragmentMarkOrder(mark);
    if (order <= previousOrder) {
      return fragmentFailure(
        'Inline fragment marks must use canonical unique mark ordering.',
      );
    }
    previousOrder = order;

    if (mark.type !== 'link') {
      output.push(Object.freeze({ type: mark.type }));
      continue;
    }

    const href = cloneFragmentText(mark.href, limits, budget);
    if (!href.ok) return href;
    let title: string | undefined;
    if (mark.title !== undefined) {
      const cloned = cloneFragmentText(mark.title, limits, budget);
      if (!cloned.ok) return cloned;
      title = cloned.value;
    }
    output.push(Object.freeze({
      type: 'link',
      href: href.value,
      ...(title === undefined ? {} : { title }),
    }));
  }
  return okResult(Object.freeze(output));
}

function remapFragmentData(
  value: JSONValue,
  schema: DataSchema,
  idMap: ReadonlyMap<NodeID, NodeID>,
  limits: ContentLimits,
  budget: FragmentDataBudget,
  depth: number,
): Result<JSONValue, ContentErrorCode> {
  budget.values += 1;
  if (budget.values > limits.maxValues) {
    return contentCeilingExceeded(
      'content-value-ceiling-exceeded',
      budget.values,
      limits.maxValues,
      { owner: 'inline-fragment-data' },
    );
  }
  if (depth > limits.maxDepth) {
    return contentCeilingExceeded(
      'content-depth-ceiling-exceeded',
      depth,
      limits.maxDepth,
      { owner: 'inline-fragment-data' },
    );
  }

  if (schema.type === 'string') {
    if (typeof value !== 'string') return fragmentDataFailure();
    const cloned = cloneFragmentText(value, limits, budget);
    return cloned.ok ? okResult(cloned.value) : cloned;
  }

  if (schema.type === 'boolean') {
    return typeof value === 'boolean'
      ? okResult(value)
      : fragmentDataFailure();
  }

  if (schema.type === 'number') {
    return (
      typeof value === 'number'
      && Number.isFinite(value)
      && !Object.is(value, -0)
    )
      ? okResult(value)
      : fragmentDataFailure();
  }

  if (schema.type === 'enum') {
    if (!schema.values.some((candidate) => Object.is(candidate, value))) {
      return fragmentDataFailure();
    }
    if (typeof value !== 'string') return okResult(value);
    const cloned = cloneFragmentText(value, limits, budget);
    return cloned.ok ? okResult(cloned.value) : cloned;
  }

  if (schema.type === 'nodeRef') {
    if (typeof value !== 'string') return fragmentDataFailure();
    const cloned = cloneFragmentText(value, limits, budget);
    if (!cloned.ok) return cloned;
    return okResult(idMap.get(value) ?? value);
  }

  if (schema.type === 'array') {
    if (
      !Array.isArray(value)
      || (
        schema.maxItems !== undefined
        && value.length > schema.maxItems
      )
    ) {
      return fragmentDataFailure();
    }
    const output: JSONValue[] = [];
    for (const item of value) {
      const cloned = remapFragmentData(
        item,
        schema.items,
        idMap,
        limits,
        budget,
        depth + 1,
      );
      if (!cloned.ok) return cloned;
      output.push(cloned.value);
    }
    return okResult(Object.freeze(output));
  }

  if (schema.type === 'object') {
    if (!isPlainFragmentRecord(value)) return fragmentDataFailure();
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Object.keys(descriptors);
    for (const key of keys) {
      if (!(key in schema.properties)) return fragmentDataFailure();
      const descriptor = descriptors[key];
      if (
        descriptor === undefined
        || descriptor.get !== undefined
        || descriptor.set !== undefined
        || descriptor.enumerable !== true
      ) {
        return fragmentDataFailure();
      }
    }

    const output: Record<string, JSONValue> = {};
    for (const [key, property] of Object.entries(schema.properties)) {
      const descriptor = descriptors[key];
      if (descriptor === undefined) {
        if (property.optional === true) continue;
        return fragmentDataFailure();
      }
      const keyResult = cloneFragmentText(key, limits, budget);
      if (!keyResult.ok) return keyResult;
      const cloned = remapFragmentData(
        descriptor.value as JSONValue,
        property.schema,
        idMap,
        limits,
        budget,
        depth + 1,
      );
      if (!cloned.ok) return cloned;
      output[key] = cloned.value;
    }
    return okResult(Object.freeze(output));
  }

  let match: JSONValue | undefined;
  let matched = 0;
  let matchedBudget: FragmentDataBudget | undefined;
  for (const variant of schema.variants) {
    const candidateBudget: FragmentDataBudget = {
      values: budget.values,
      totalStringCodeUnits: budget.totalStringCodeUnits,
    };
    const candidate = remapFragmentData(
      value,
      variant,
      idMap,
      limits,
      candidateBudget,
      depth + 1,
    );
    if (!candidate.ok) {
      if (candidate.error.class === 'resource-rejection') return candidate;
      continue;
    }
    matched += 1;
    match = candidate.value;
    matchedBudget = candidateBudget;
    if (matched > 1) return fragmentDataFailure();
  }

  if (matched !== 1 || match === undefined || matchedBudget === undefined) {
    return fragmentDataFailure();
  }
  budget.values = matchedBudget.values;
  budget.totalStringCodeUnits = matchedBudget.totalStringCodeUnits;
  return okResult(match);
}

function isPlainFragmentRecord(
  value: JSONValue,
): value is { readonly [key: string]: JSONValue } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function fragmentDataFailure<T>(): Result<T, ContentErrorCode> {
  return fragmentFailure(
    'Inline fragment component data does not match its portable descriptor.',
  );
}

function fragmentMarkOrder(mark: TextMark): number {
  if (mark.type === 'strong') return 0;
  if (mark.type === 'emphasis') return 1;
  if (mark.type === 'code') return 2;
  return 3;
}

function inlineSequence(
  document: PortableContentDocument,
  surface: InlineSurface,
): Result<readonly InlineNode[], ContentErrorCode> {
  const index = createDocumentIndex(document);
  if (!index.ok) return index;

  const node = index.value.getNode(surface.id);
  if (node === null) {
    return fragmentFailure('Inline fragment surface does not exist.');
  }

  if (surface.type === 'node') {
    return node.type === 'paragraph' || node.type === 'heading'
      ? okResult(node.children)
      : fragmentFailure(
          'Inline node fragment surface must identify a paragraph or heading.',
        );
  }

  if (node.type !== 'component' || node.kind !== 'block') {
    return fragmentFailure(
      'Inline slot fragment surface must identify a block component.',
    );
  }

  const slot = node.slots.find(
    (candidate) => candidate.name === surface.slot,
  );
  return slot?.kind === 'inline'
    ? okResult(slot.content)
    : fragmentFailure('Inline slot fragment surface does not exist.');
}

function sliceInline(
  nodes: readonly InlineNode[],
  from: number,
  to: number,
): Result<InlineNode[], ContentErrorCode> {
  if (
    !Number.isSafeInteger(from)
    || !Number.isSafeInteger(to)
    || from < 0
    || to < from
  ) {
    return fragmentFailure('Inline fragment range is invalid.');
  }

  const output: InlineNode[] = [];
  let cursor = 0;

  for (const node of nodes) {
    const length = node.type === 'text' ? node.text.length : 1;
    const end = cursor + length;

    if (end <= from) {
      cursor = end;
      continue;
    }
    if (cursor >= to) break;

    if (node.type === 'text') {
      const startOffset = Math.max(0, from - cursor);
      const endOffset = Math.min(node.text.length, to - cursor);
      if (
        !isTextCodeUnitBoundary(node.text, startOffset)
        || !isTextCodeUnitBoundary(node.text, endOffset)
      ) {
        return fragmentFailure(
          'Inline fragment range splits a surrogate pair.',
        );
      }
      if (startOffset < endOffset) {
        output.push(
          Object.freeze({
            type: 'text',
            text: node.text.slice(startOffset, endOffset),
            marks: node.marks,
          }),
        );
      }
    } else if (from <= cursor && end <= to) {
      output.push(node);
    } else {
      return fragmentFailure(
        'Inline fragment range splits an atomic inline node.',
      );
    }

    cursor = end;
  }

  if (to > measureInline(nodes)) {
    return fragmentFailure('Inline fragment range exceeds surface length.');
  }
  return okResult(output);
}

function measureInline(
  nodes: readonly InlineNode[],
): number {
  let total = 0;
  for (const node of nodes) {
    total += node.type === 'text' ? node.text.length : 1;
  }
  return total;
}

function fragmentFailure<T>(
  message: string,
): Result<T, ContentErrorCode> {
  return failResult(
    'transition-rejection',
    'content-fragment-invalid',
    message,
  );
}
