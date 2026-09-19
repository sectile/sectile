import type {
  ContentNode,
  PortableContentDocument,
  PortableContentFragment,
} from './document.js';

export type ContentHelperSubject =
  | PortableContentDocument
  | PortableContentFragment
  | ContentNode;

/**
 * Exact Portable Content equality.
 *
 * IDs, versions, array order, slot order, marks and component data participate.
 * JSON object property insertion order does not.
 */
export function isEqual(
  left: PortableContentDocument,
  right: PortableContentDocument,
): boolean {
  if (left === right) return true;

  const stack: readonly [unknown, unknown][] = [[left, right]];
  const mutable = [...stack];

  while (mutable.length > 0) {
    const pair = mutable.pop();
    if (pair === undefined) break;
    const [a, b] = pair;

    if (Object.is(a, b)) continue;
    if (
      a === null
      || b === null
      || typeof a !== 'object'
      || typeof b !== 'object'
    ) {
      return false;
    }

    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
        return false;
      }
      for (let index = a.length - 1; index >= 0; index -= 1) {
        mutable.push([a[index], b[index]]);
      }
      continue;
    }

    const leftRecord = a as Readonly<Record<string, unknown>>;
    const rightRecord = b as Readonly<Record<string, unknown>>;
    const leftKeys = Object.keys(leftRecord);
    const rightKeys = Object.keys(rightRecord);
    if (leftKeys.length !== rightKeys.length) return false;

    for (const key of leftKeys) {
      if (!Object.hasOwn(rightRecord, key)) return false;
      mutable.push([leftRecord[key], rightRecord[key]]);
    }
  }

  return true;
}

/**
 * Strict authored-content emptiness.
 *
 * Whitespace text is content. Hard breaks and registered components count as
 * authored content even when their data/slots are otherwise empty.
 */
export function isEmpty(subject: ContentHelperSubject): boolean {
  const stack: unknown[] = [];

  if (isDocument(subject)) {
    pushReverse(stack, subject.root.children);
  } else if (isFragment(subject)) {
    pushReverse(stack, subject.content);
  } else {
    stack.push(subject);
  }

  while (stack.length > 0) {
    const current = stack.pop();
    if (!isContentNode(current)) continue;

    if (current.type === 'text') {
      if (current.text.length > 0) return false;
      continue;
    }

    if (current.type === 'hard-break' || current.type === 'component') {
      return false;
    }

    if (current.type === 'code-block') {
      if (current.text.length > 0) return false;
      continue;
    }

    if (
      current.type === 'paragraph'
      || current.type === 'heading'
      || current.type === 'blockquote'
      || current.type === 'list'
      || current.type === 'list-item'
    ) {
      pushReverse(stack, current.children);
    }
  }

  return true;
}

function isDocument(value: ContentHelperSubject): value is PortableContentDocument {
  return (
    'formatVersion' in value
    && 'root' in value
    && value.root.type === 'document'
  );
}

function isFragment(value: ContentHelperSubject): value is PortableContentFragment {
  return 'formatVersion' in value && 'kind' in value && 'content' in value;
}

function isContentNode(value: unknown): value is ContentNode {
  return (
    typeof value === 'object'
    && value !== null
    && 'type' in value
    && typeof (value as { readonly type?: unknown }).type === 'string'
  );
}

function pushReverse(
  stack: unknown[],
  values: readonly unknown[],
): void {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    stack.push(values[index]);
  }
}
