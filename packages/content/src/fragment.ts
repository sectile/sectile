import { failResult, okResult, type Result } from '@sectile/core/result';
import { isTextCodeUnitBoundary } from '@sectile/core/text';
import type {
  InlineContentFragment,
  InlineNode,
  PortableContentDocument,
} from './document.js';
import type { ContentErrorCode } from './error.js';
import type { InlineSurface } from './position.js';
import { createDocumentIndex } from './query.js';

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
