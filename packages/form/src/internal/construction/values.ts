import type { FormResult as Result } from '../../error.js';
import { fail, ok, unwrap } from '../result.js';
import { tryCreateFormFieldPath, encodeSegments, type Path, type Segment } from './path.js';
import { normalizeLimits, exceeded, type Limits } from './limits.js';

export interface FormValueEntry<Value = unknown> {
  readonly path: Path;
  readonly value: Value;
}

export type FormValues<Shape extends object = Record<string, unknown>> = Readonly<Shape>;

export function createFormValues<Value = unknown>(
  entries: readonly FormValueEntry<Value>[],
  limits?: Partial<Limits>,
): FormValues {
  return unwrap(tryCreateFormValues(entries, limits));
}

export function tryCreateFormValues<Value = unknown>(
  entries: readonly FormValueEntry<Value>[],
  limitsInput?: Partial<Limits>,
): Result<FormValues> {
  const limits = normalizeLimits(limitsInput);
  if (!limits.ok) return limits;
  if (!Array.isArray(entries)) {
    return fail('construction', 'form-value-entry-invalid', 'Form value entries must be an array.');
  }
  if (entries.length > limits.value.maxEntries) {
    return exceeded('form-entry-ceiling-exceeded', entries.length, limits.value.maxEntries);
  }
  const root: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  const branches = new WeakSet<object>();
  const repeated = new Map<string, unknown[]>();
  branches.add(root);
  let outputNodes = 1;
  let pathCodeUnits = 0;
  const reserveNodes = (count: number): Result<never> | null => {
    if (outputNodes > limits.value.maxOutputNodes - count) {
      return exceeded('form-output-node-ceiling-exceeded', outputNodes + count, limits.value.maxOutputNodes);
    }
    outputNodes += count;
    return null;
  };

  for (const entry of entries) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      return fail('construction', 'form-value-entry-invalid', 'Every Form value entry must be an object.');
    }
    const descriptors = Object.getOwnPropertyDescriptors(entry);
    if (descriptors['path'] === undefined || !('value' in descriptors['path'])
      || descriptors['value'] === undefined || !('value' in descriptors['value'])) {
      return fail('construction', 'form-value-entry-invalid', 'Form value entries require data path and value properties.');
    }
    const path = tryCreateFormFieldPath(descriptors['path'].value as Path, limits.value);
    if (!path.ok) return path;
    const canonical = encodeSegments(path.value);
    pathCodeUnits += canonical.length;
    if (pathCodeUnits > limits.value.maxPathCodeUnits) {
      return exceeded('form-path-code-unit-ceiling-exceeded', pathCodeUnits, limits.value.maxPathCodeUnits);
    }
    const entryValue = descriptors['value'].value as Value;
    let container: Record<string, unknown> | unknown[] = root;

    for (let index = 0; index < path.value.length - 1; index += 1) {
      const segment = path.value[index]!;
      const nextSegment = path.value[index + 1]!;
      const existing = readValue(container, segment);
      const needsArray = typeof nextSegment === 'number';

      if (!hasValue(container, segment)) {
        const reserved = reserveNodes(1);
        if (reserved !== null) return reserved;
        const branch: Record<string, unknown> | unknown[] = needsArray
          ? []
          : Object.create(null) as Record<string, unknown>;
        branches.add(branch);
        writeValue(container, segment, branch);
        container = branch;
        continue;
      }
      if (
        typeof existing !== 'object'
        || existing === null
        || !branches.has(existing)
        || Array.isArray(existing) !== needsArray
      ) {
        return collision(canonical);
      }
      container = existing as Record<string, unknown> | unknown[];
    }

    const leaf = path.value[path.value.length - 1]!;
    const existing = readValue(container, leaf);
    if (!hasValue(container, leaf)) {
      const reserved = reserveNodes(1);
      if (reserved !== null) return reserved;
      writeValue(container, leaf, entryValue);
      continue;
    }
    if (typeof existing === 'object' && existing !== null && branches.has(existing)) {
      return collision(canonical);
    }
    const values = repeated.get(canonical);
    if (values === undefined) {
      const reserved = reserveNodes(2);
      if (reserved !== null) return reserved;
      const next = [existing, entryValue];
      repeated.set(canonical, next);
      writeValue(container, leaf, next);
    } else {
      const reserved = reserveNodes(1);
      if (reserved !== null) return reserved;
      values.push(entryValue);
    }
  }

  // Repeated leaves are owned wrappers, not traversable structural branches.
  for (const values of repeated.values()) Object.freeze(values);
  freezeBranches(root, branches);
  return ok(root);
}

function collision(path: string): Result<FormValues> {
  return fail(
    'construction',
    'form-value-path-collision',
    'A Form value path cannot be both a leaf and a container.',
    { path },
  );
}

function readValue(
  container: Record<string, unknown> | unknown[],
  segment: Segment,
): unknown {
  return Array.isArray(container)
    ? container[segment as number]
    : container[String(segment)];
}

function hasValue(
  container: Record<string, unknown> | unknown[],
  segment: Segment,
): boolean {
  return Object.hasOwn(container, segment);
}

function writeValue(
  container: Record<string, unknown> | unknown[],
  segment: Segment,
  value: unknown,
): void {
  if (Array.isArray(container)) container[segment as number] = value;
  else container[String(segment)] = value;
}

function freezeBranches(value: object, branches: WeakSet<object>): void {
  const pending = [value];
  const visited = new WeakSet<object>();
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const child of Object.values(current)) {
      if (typeof child === 'object' && child !== null && branches.has(child)) {
        pending.push(child);
      }
    }
    Object.freeze(current);
  }
}
