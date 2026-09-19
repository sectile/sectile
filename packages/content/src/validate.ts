import { failResult, okResult, type Result } from '@sectile/core/result';
import { isWellFormedPlainText } from '@sectile/core/text';
import type {
  BlockNode,
  ComponentSlot,
  ContentNode,
  InlineNode,
  JSONValue,
  PortableContentDocument,
  TextMark,
  TextNode,
} from './document.js';
import { typeKeyOfNode } from './document.js';
import type { ContentErrorCode } from './error.js';
import {
  contentCeilingExceeded,
  normalizeContentLimits,
  type ContentLimits,
} from './limits.js';
import {
  createDocumentIndex,
  type DocumentIndex,
} from './query.js';
import {
  type CompiledContentRule,
  type CompiledContentSchema,
  type ContentTypeRef,
  type DataSchema,
  typeKey,
} from './schema.js';

export interface ValidateDocumentOptions {
  readonly limits?: Partial<ContentLimits>;
}

interface ValidationContext {
  readonly limits: ContentLimits;
}

export function validateDocument(
  document: PortableContentDocument,
  schema: CompiledContentSchema,
  options: ValidateDocumentOptions = {},
): Result<PortableContentDocument, ContentErrorCode> {
  const normalizedLimits = normalizeContentLimits(options.limits);
  if (!normalizedLimits.ok) return normalizedLimits;
  const context: ValidationContext = {
    limits: normalizedLimits.value,
  };
  if (
    document.formatVersion !== 1
    || document.schema.id !== schema.id
    || document.schema.version !== schema.version
  ) {
    return failResult(
      'construction',
      'content-document-schema-mismatch',
      'Document format/schema does not match the compiled schema.',
    );
  }

  const index = createDocumentIndex(document, {
    limits: context.limits,
  });
  if (!index.ok) return index;

  const resources = preflightDocumentResources(document, context.limits);
  if (!resources.ok) return resources;

  const root = validateBlockSequence(
    document.root.children,
    schema.rootContent,
    schema,
    index.value,
    context,
  );
  return root.ok ? okResult(document) : root;
}

function validateBlockSequence(
  nodes: readonly BlockNode[],
  rule: CompiledContentRule,
  schema: CompiledContentSchema,
  index: DocumentIndex,
  context: ValidationContext,
): Result<true, ContentErrorCode> {
  const cardinality = validateCount(nodes.length, rule);
  if (!cardinality.ok) return cardinality;

  for (const node of nodes) {
    if (!rule.allows(refOf(node))) return invalidChild(node, rule);
    const valid = validateBlockNode(node, schema, index, context);
    if (!valid.ok) return valid;
  }
  return okResult(true);
}

function validateInlineSequence(
  nodes: readonly InlineNode[],
  rule: CompiledContentRule,
  schema: CompiledContentSchema,
  index: DocumentIndex,
  context: ValidationContext,
): Result<true, ContentErrorCode> {
  const cardinality = validateCount(nodes.length, rule);
  if (!cardinality.ok) return cardinality;

  let previousText: TextNode | null = null;
  for (const node of nodes) {
    if (!rule.allows(refOf(node))) return invalidChild(node, rule);
    const valid = validateInlineNode(node, schema, index, context);
    if (!valid.ok) return valid;

    if (node.type === 'text') {
      if (node.text.length === 0) {
        return failResult(
          'construction',
          'content-child-invalid',
          'Canonical inline content does not retain empty text runs.',
        );
      }
      if (
        previousText !== null
        && sameMarks(previousText.marks, node.marks)
      ) {
        return failResult(
          'construction',
          'content-child-invalid',
          'Adjacent text runs with equal marks must be merged.',
        );
      }
      previousText = node;
    } else {
      previousText = null;
    }
  }
  return okResult(true);
}

function validateBlockNode(
  node: BlockNode,
  schema: CompiledContentSchema,
  index: DocumentIndex,
  context: ValidationContext,
): Result<true, ContentErrorCode> {
  if (node.type === 'paragraph') {
    return validateInlineSequence(
      node.children,
      schema.inlineContent,
      schema,
      index,
      context,
    );
  }

  if (node.type === 'heading') {
    if (!schema.headingLevels.includes(node.level)) {
      return failResult(
        'construction',
        'content-heading-level-invalid',
        'Heading level is not permitted by the active schema.',
        { id: node.id, level: node.level },
      );
    }
    return validateInlineSequence(
      node.children,
      schema.inlineContent,
      schema,
      index,
      context,
    );
  }

  if (node.type === 'blockquote') {
    if (node.children.length === 0) return invalidCardinality('blockquote');
    return validateBlockSequence(
      node.children,
      schema.blockContent,
      schema,
      index,
      context,
    );
  }

  if (node.type === 'list-item') {
    if (node.children.length === 0) return invalidCardinality('list-item');
    return validateBlockSequence(
      node.children,
      schema.blockContent,
      schema,
      index,
      context,
    );
  }

  if (node.type === 'list') {
    if (node.children.length === 0) return invalidCardinality('list');
    for (const child of node.children) {
      const valid = validateBlockNode(child, schema, index, context);
      if (!valid.ok) return valid;
    }
    return okResult(true);
  }

  if (node.type === 'code-block') {
    if (typeof node.text !== 'string') {
      return failResult(
        'construction',
        'content-child-invalid',
        'Code block text must be a string.',
        { id: node.id },
      );
    }
    return validateContentString(node.text, context);
  }

  return validateComponent(node, schema, index, context);
}

function validateInlineNode(
  node: InlineNode,
  schema: CompiledContentSchema,
  index: DocumentIndex,
  context: ValidationContext,
): Result<true, ContentErrorCode> {
  if (node.type === 'text') {
    if (typeof node.text !== 'string') {
      return failResult(
        'construction',
        'content-child-invalid',
        'Text content must be a string.',
      );
    }
    const text = validateContentString(node.text, context);
    if (!text.ok) return text;
    return validateMarks(node.marks, context);
  }

  if (node.type === 'hard-break') return okResult(true);
  return validateComponent(node, schema, index, context);
}

function validateComponent(
  node: Extract<ContentNode, { readonly type: 'component' }>,
  schema: CompiledContentSchema,
  index: DocumentIndex,
  context: ValidationContext,
): Result<true, ContentErrorCode> {
  const compiled = schema.component(node.component);
  if (compiled === null) {
    return failResult(
      'construction',
      'content-component-unknown',
      'Component is not registered in the active schema.',
      { component: node.component },
    );
  }

  if (compiled.descriptor.kind !== node.kind) {
    return failResult(
      'construction',
      'content-component-kind-invalid',
      'Persisted component kind does not match its descriptor.',
      { id: node.id },
    );
  }

  if (compiled.descriptor.componentVersion !== node.componentVersion) {
    return failResult(
      'construction',
      'content-component-version-mismatch',
      'Persisted component version does not match its descriptor.',
      {
        id: node.id,
        expected: compiled.descriptor.componentVersion,
        actual: node.componentVersion,
      },
    );
  }

  if (node.slots.length !== compiled.slots.length) {
    return failResult(
      'construction',
      'content-slot-order-invalid',
      'Persisted component slots must match the descriptor slot sequence.',
      { id: node.id },
    );
  }

  for (let offset = 0; offset < node.slots.length; offset += 1) {
    const slot = node.slots[offset];
    const expected = compiled.slots[offset];
    if (
      slot === undefined
      || expected === undefined
      || slot.name !== expected.descriptor.name
    ) {
      return failResult(
        'construction',
        'content-slot-order-invalid',
        'Persisted component slots must match descriptor order.',
        { id: node.id, offset },
      );
    }
    if (slot.kind !== expected.descriptor.kind) {
      return failResult(
        'construction',
        'content-slot-kind-invalid',
        'Persisted component slot kind must match descriptor kind.',
        { id: node.id, slot: slot.name },
      );
    }

    const valid = validateComponentSlot(
      slot,
      expected.rule,
      schema,
      index,
      context,
    );
    if (!valid.ok) return valid;
  }

  return validateData(
    node.data,
    compiled.descriptor.data,
    index,
    schema,
    context,
  );
}

function validateComponentSlot(
  slot: ComponentSlot,
  rule: CompiledContentRule,
  schema: CompiledContentSchema,
  index: DocumentIndex,
  context: ValidationContext,
): Result<true, ContentErrorCode> {
  return slot.kind === 'block'
    ? validateBlockSequence(slot.content, rule, schema, index, context)
    : validateInlineSequence(slot.content, rule, schema, index, context);
}

function validateData(
  value: JSONValue,
  schema: DataSchema,
  index: DocumentIndex,
  contentSchema: CompiledContentSchema,
  context: ValidationContext,
  depth: number = 1,
): Result<true, ContentErrorCode> {
  if (schema.type === 'string') {
    return typeof value === 'string'
      ? validateContentString(value, context)
      : invalidData();
  }

  if (schema.type === 'boolean') {
    return typeof value === 'boolean' ? okResult(true) : invalidData();
  }

  if (schema.type === 'number') {
    return (
      typeof value === 'number'
      && Number.isFinite(value)
      && !Object.is(value, -0)
    )
      ? okResult(true)
      : invalidData();
  }

  if (schema.type === 'enum') {
    if (!schema.values.some((candidate) => Object.is(candidate, value))) {
      return invalidData();
    }
    return typeof value === 'string'
      ? validateContentString(value, context)
      : okResult(true);
  }

  if (schema.type === 'array') {
    if (
      !Array.isArray(value)
      || (
        schema.maxItems !== undefined
        && value.length > schema.maxItems
      )
    ) {
      return invalidData();
    }
    for (const item of value) {
      const valid = validateData(
        item,
        schema.items,
        index,
        contentSchema,
        context,
        depth + 1,
      );
      if (!valid.ok) return valid;
    }
    return okResult(true);
  }

  if (schema.type === 'object') {
    if (!isPlainRecord(value)) return invalidData();

    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const descriptor of Object.values(descriptors)) {
      if (descriptor.get !== undefined || descriptor.set !== undefined) {
        return invalidData();
      }
    }

    for (const key of Object.keys(value)) {
      if (!(key in schema.properties)) return invalidData();
    }

    for (const [key, property] of Object.entries(schema.properties)) {
      if (!(key in value)) {
        if (property.optional === true) continue;
        return invalidData();
      }
      const candidate = value[key];
      if (candidate === undefined) return invalidData();
      const valid = validateData(
        candidate,
        property.schema,
        index,
        contentSchema,
        context,
        depth + 1,
      );
      if (!valid.ok) return valid;
    }
    return okResult(true);
  }

  if (schema.type === 'nodeRef') {
    if (typeof value !== 'string') return invalidData();
    const referenceText = validateContentString(value, context);
    if (!referenceText.ok) return referenceText;
    const node = index.getNode(value);
    if (node === null) return invalidData();
    if (schema.allowed === undefined) return okResult(true);

    const key = typeKeyOfNode(node);
    for (const ref of schema.allowed) {
      if (ref.type === 'group') {
        if (
          contentSchema.group(ref.id)?.some(
            (member) => typeKey(member) === key,
          ) === true
        ) {
          return okResult(true);
        }
      } else if (typeKey(ref) === key) {
        return okResult(true);
      }
    }
    return invalidData();
  }

  let matches = 0;
  for (const variant of schema.variants) {
    if (validateData(
      value,
      variant,
      index,
      contentSchema,
      context,
      depth + 1,
    ).ok) {
      matches += 1;
      if (matches > 1) return invalidData();
    }
  }
  return matches === 1 ? okResult(true) : invalidData();
}

function validateMarks(
  marks: readonly TextMark[],
  context: ValidationContext,
): Result<true, ContentErrorCode> {
  if (marks.length > context.limits.maxMarksPerText) {
    return contentCeilingExceeded(
      'content-mark-ceiling-exceeded',
      marks.length,
      context.limits.maxMarksPerText,
    );
  }
  let previousOrder = -1;
  let links = 0;

  for (const mark of marks) {
    const order = markOrder(mark);
    if (order <= previousOrder) return invalidData();
    previousOrder = order;

    if (mark.type === 'link') {
      links += 1;
      if (links > 1 || typeof mark.href !== 'string') {
        return invalidData();
      }
      const href = validateContentString(mark.href, context);
      if (!href.ok) return href;
      if (mark.title !== undefined) {
        const title = validateContentString(mark.title, context);
        if (!title.ok) return title;
      }
    }
  }
  return okResult(true);
}

function preflightDocumentResources(
  document: PortableContentDocument,
  limits: ContentLimits,
): Result<true, ContentErrorCode> {
  let totalStringCodeUnits = 0;
  let values = 0;
  const nodeStack: ContentNode[] = [...document.root.children].reverse();
  const dataStack: DataFrame[] = [];

  const consumeString = (
    value: string,
  ): Result<true, ContentErrorCode> => {
    if (!isWellFormedPlainText(value)) {
      return failResult(
        'construction',
        'content-component-data-invalid',
        'Portable Content strings must be well-formed UTF-16.',
      );
    }
    if (value.length > limits.maxStringCodeUnits) {
      return contentCeilingExceeded(
        'content-string-code-unit-ceiling-exceeded',
        value.length,
        limits.maxStringCodeUnits,
      );
    }
    totalStringCodeUnits += value.length;
    if (totalStringCodeUnits > limits.maxTotalStringCodeUnits) {
      return contentCeilingExceeded(
        'content-total-string-code-unit-ceiling-exceeded',
        totalStringCodeUnits,
        limits.maxTotalStringCodeUnits,
      );
    }
    return okResult(true);
  };

  while (nodeStack.length > 0) {
    const node = nodeStack.pop();
    if (node === undefined) break;

    if (node.type === 'text') {
      const text = consumeString(node.text);
      if (!text.ok) return text;
      if (node.marks.length > limits.maxMarksPerText) {
        return contentCeilingExceeded(
          'content-mark-ceiling-exceeded',
          node.marks.length,
          limits.maxMarksPerText,
        );
      }
      for (const mark of node.marks) {
        if (mark.type !== 'link') continue;
        const href = consumeString(mark.href);
        if (!href.ok) return href;
        if (mark.title !== undefined) {
          const title = consumeString(mark.title);
          if (!title.ok) return title;
        }
      }
      continue;
    }

    if (node.type === 'hard-break') continue;

    if (node.type === 'paragraph' || node.type === 'heading') {
      for (let index = node.children.length - 1; index >= 0; index -= 1) {
        const child = node.children[index];
        if (child !== undefined) nodeStack.push(child);
      }
      continue;
    }

    if (
      node.type === 'blockquote'
      || node.type === 'list-item'
      || node.type === 'list'
    ) {
      for (let index = node.children.length - 1; index >= 0; index -= 1) {
        const child = node.children[index];
        if (child !== undefined) nodeStack.push(child);
      }
      continue;
    }

    if (node.type === 'code-block') {
      const text = consumeString(node.text);
      if (!text.ok) return text;
      continue;
    }

    dataStack.push({
      kind: 'enter',
      value: node.data,
      depth: 1,
    });
    for (let slotIndex = node.slots.length - 1; slotIndex >= 0; slotIndex -= 1) {
      const slot = node.slots[slotIndex];
      if (slot === undefined) continue;
      for (let childIndex = slot.content.length - 1; childIndex >= 0; childIndex -= 1) {
        const child = slot.content[childIndex];
        if (child !== undefined) nodeStack.push(child);
      }
    }
  }

  const active = new WeakSet<object>();
  while (dataStack.length > 0) {
    const frame = dataStack.pop();
    if (frame === undefined) break;

    if (frame.kind === 'leave') {
      active.delete(frame.value);
      continue;
    }

    values += 1;
    if (values > limits.maxValues) {
      return contentCeilingExceeded(
        'content-value-ceiling-exceeded',
        values,
        limits.maxValues,
        { owner: 'component-data' },
      );
    }
    if (frame.depth > limits.maxDepth) {
      return contentCeilingExceeded(
        'content-depth-ceiling-exceeded',
        frame.depth,
        limits.maxDepth,
        { owner: 'component-data' },
      );
    }

    const value = frame.value;
    if (value === null || typeof value === 'boolean') continue;
    if (typeof value === 'string') {
      const stringResult = consumeString(value);
      if (!stringResult.ok) return stringResult;
      continue;
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || Object.is(value, -0)) {
        return invalidData();
      }
      continue;
    }
    if (typeof value !== 'object') return invalidData();

    if (active.has(value)) return invalidData();
    active.add(value);
    dataStack.push({
      kind: 'leave',
      value,
      depth: frame.depth,
    });

    if (Array.isArray(value)) {
      const keys = Object.keys(value);
      if (
        keys.length !== value.length
        || keys.some((key, index) => key !== String(index))
      ) {
        return invalidData();
      }
      for (let index = value.length - 1; index >= 0; index -= 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (
          descriptor === undefined
          || descriptor.get !== undefined
          || descriptor.set !== undefined
        ) {
          return invalidData();
        }
        dataStack.push({
          kind: 'enter',
          value: descriptor.value as JSONValue,
          depth: frame.depth + 1,
        });
      }
      continue;
    }

    if (!isPlainRecord(value as JSONValue)) return invalidData();
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Object.keys(descriptors);
    for (let index = keys.length - 1; index >= 0; index -= 1) {
      const key = keys[index];
      if (key === undefined) continue;
      const keyResult = consumeString(key);
      if (!keyResult.ok) return keyResult;
      const descriptor = descriptors[key];
      if (
        descriptor === undefined
        || descriptor.get !== undefined
        || descriptor.set !== undefined
        || descriptor.enumerable !== true
      ) {
        return invalidData();
      }
      dataStack.push({
        kind: 'enter',
        value: descriptor.value as JSONValue,
        depth: frame.depth + 1,
      });
    }
  }

  return okResult(true);
}

type DataFrame =
  | {
      readonly kind: 'enter';
      readonly value: JSONValue;
      readonly depth: number;
    }
  | {
      readonly kind: 'leave';
      readonly value: object;
      readonly depth: number;
    };

function validateContentString(
  value: string,
  _context: ValidationContext,
): Result<true, ContentErrorCode> {
  return isWellFormedPlainText(value)
    ? okResult(true)
    : failResult(
        'construction',
        'content-component-data-invalid',
        'Portable Content strings must be well-formed UTF-16.',
      );
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

function validateCount(
  count: number,
  rule: CompiledContentRule,
): Result<true, ContentErrorCode> {
  if (
    count < rule.min
    || (rule.max !== null && count > rule.max)
  ) {
    return failResult(
      'construction',
      'content-cardinality-invalid',
      'Content child count violates the active grammar.',
      {
        count,
        min: rule.min,
        ...(rule.max === null ? {} : { max: rule.max }),
      },
    );
  }
  return okResult(true);
}

function invalidChild(
  node: ContentNode,
  rule: CompiledContentRule,
): Result<never, ContentErrorCode> {
  return failResult(
    'construction',
    'content-child-invalid',
    'Content child is not allowed by the active grammar.',
    {
      child: typeKeyOfNode(node),
      role: rule.kind,
    },
  );
}

function invalidData(): Result<never, ContentErrorCode> {
  return failResult(
    'construction',
    'content-component-data-invalid',
    'Component data or inline mark data is invalid.',
  );
}

function invalidCardinality(
  type: string,
): Result<never, ContentErrorCode> {
  return failResult(
    'construction',
    'content-cardinality-invalid',
    'Container requires at least one child.',
    { type },
  );
}

function isPlainRecord(
  value: JSONValue,
): value is { readonly [key: string]: JSONValue } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function refOf(
  node: ContentNode,
): { readonly type: 'base'; readonly kind: Exclude<ContentNode['type'], 'component'> }
  | { readonly type: 'component'; readonly id: string } {
  return node.type === 'component'
    ? Object.freeze({ type: 'component' as const, id: node.component })
    : Object.freeze({ type: 'base' as const, kind: node.type });
}
