import type { FormResult as Result } from '../../error.js';
import { fail, ok, unwrap } from '../result.js';
import { normalizeLimits, exceeded, type Limits } from './limits.js';

export type Segment = string | number;

export type Path = string | readonly Segment[];

export type RelativePath = Segment | readonly Segment[];

export function createFormFieldPath(
  path: Path,
  limits?: Partial<Limits>,
): readonly Segment[] {
  return unwrap(tryCreateFormFieldPath(path, limits));
}

export function tryCreateFormFieldPath(
  path: Path,
  limitsInput?: Partial<Limits>,
): Result<readonly Segment[]> {
  return normalizePath(path, true, limitsInput);
}

export function createFormRelativePath(
  path: RelativePath,
  limits?: Partial<Limits>,
): readonly Segment[] {
  return unwrap(tryCreateFormRelativePath(path, limits));
}

export function tryCreateFormRelativePath(
  path: RelativePath,
  limitsInput?: Partial<Limits>,
): Result<readonly Segment[]> {
  return normalizePath(path, false, limitsInput);
}

export function appendFormFieldPath(
  base: Path,
  relative: RelativePath,
): readonly Segment[] {
  return Object.freeze([
    ...createFormFieldPath(base),
    ...createFormRelativePath(relative),
  ]);
}

function validateSegments(
  segments: readonly Segment[],
  stringRoot: boolean,
  limits: Limits,
): Result<readonly Segment[]> {
  if (segments.length > limits.maxPathSegments) {
    return exceeded('form-path-segment-ceiling-exceeded', segments.length, limits.maxPathSegments);
  }
  if (segments.length === 0 || (stringRoot && typeof segments[0] !== 'string')) {
    return fail(
      'construction',
      stringRoot ? 'form-field-path-root-invalid' : 'form-relative-path-empty',
      stringRoot
        ? 'A Form field path must start with a string segment.'
        : 'A relative Form field path must not be empty.',
    );
  }
  for (const segment of segments) {
    if (typeof segment === 'number') {
      if (!Number.isSafeInteger(segment) || segment < 0) {
        return fail(
          'construction',
          'form-field-path-index-invalid',
          'Form field path indices must be non-negative safe integers.',
        );
      }
      if (segment > limits.maxArrayIndex) {
        return exceeded('form-array-index-ceiling-exceeded', segment, limits.maxArrayIndex);
      }
      continue;
    }
    if (typeof segment !== 'string') {
      return fail('construction', 'form-field-path-segment-invalid', 'Form field path segments must be strings or numbers.');
    }
    if (segment.length === 0 || /[.\[\]]/u.test(segment)) {
      return fail(
        'construction',
        'form-field-path-segment-invalid',
        'Form field path string segments must be non-empty and must not contain dots or brackets.',
      );
    }
  }
  const codeUnits = encodeSegments(segments).length;
  if (codeUnits > limits.maxPathCodeUnits) {
    return exceeded('form-path-code-unit-ceiling-exceeded', codeUnits, limits.maxPathCodeUnits);
  }
  return ok(Object.freeze([...segments]));
}

function preflight(
  path: Path | RelativePath,
  limits: Limits,
): Result<never> | null {
  if (typeof path === 'string' && path.length > limits.maxPathCodeUnits) {
    return exceeded('form-path-code-unit-ceiling-exceeded', path.length, limits.maxPathCodeUnits);
  }
  if (Array.isArray(path) && path.length > limits.maxPathSegments) {
    return exceeded('form-path-segment-ceiling-exceeded', path.length, limits.maxPathSegments);
  }
  if (typeof path === 'number' && Number.isSafeInteger(path) && path > limits.maxArrayIndex) {
    return exceeded('form-array-index-ceiling-exceeded', path, limits.maxArrayIndex);
  }
  return null;
}

export function encodeFormFieldPath(path: Path): string {
  return encodeSegments(createFormFieldPath(path));
}

function parsePath(
  path: string,
  limits: Limits,
): Result<readonly Segment[]> {
  if (path.length === 0) {
    return fail(
      'construction',
      'form-field-path-empty',
      'A Form field path must not be empty.',
    );
  }
  const segments: Segment[] = [];
  let index = 0;
  let expectSegment = true;

  while (index < path.length) {
    if (path[index] === '.') {
      if (expectSegment) return syntaxError(path, index);
      expectSegment = true;
      index += 1;
      continue;
    }
    if (path[index] === '[') {
      if (expectSegment && segments.length > 0) return syntaxError(path, index);
      const close = path.indexOf(']', index + 1);
      if (close < 0) return syntaxError(path, index);
      const value = path.slice(index + 1, close);
      if (value.length === 0 || value.includes('[')) return syntaxError(path, index);
      const segment = /^\d+$/u.test(value) ? Number(value) : value;
      if (typeof segment === 'number' && Number.isSafeInteger(segment) && segment > limits.maxArrayIndex) {
        return exceeded('form-array-index-ceiling-exceeded', segment, limits.maxArrayIndex);
      }
      segments.push(segment);
      if (segments.length > limits.maxPathSegments) {
        return exceeded('form-path-segment-ceiling-exceeded', segments.length, limits.maxPathSegments);
      }
      index = close + 1;
      expectSegment = false;
      if (index < path.length && path[index] !== '.' && path[index] !== '[') {
        return syntaxError(path, index);
      }
      continue;
    }

    const start = index;
    while (index < path.length && path[index] !== '.' && path[index] !== '[') {
      if (path[index] === ']') return syntaxError(path, index);
      index += 1;
    }
    if (!expectSegment || start === index) return syntaxError(path, start);
    segments.push(path.slice(start, index));
    if (segments.length > limits.maxPathSegments) {
      return exceeded('form-path-segment-ceiling-exceeded', segments.length, limits.maxPathSegments);
    }
    expectSegment = false;
  }

  return expectSegment ? syntaxError(path, path.length) : ok(segments);
}

function syntaxError(
  path: string,
  index: number,
): Result<readonly Segment[]> {
  return fail(
    'construction',
    'form-field-path-syntax-invalid',
    'Form field paths must use dot properties and bracket indices without empty segments.',
    { path, index },
  );
}

export function encodeSegments(segments: readonly Segment[]): string {
  return segments.map((segment, index) => (
    typeof segment === 'number'
      ? `[${segment}]`
      : index === 0 ? segment : `.${segment}`
  )).join('');
}

function normalizePath(
  path: Path | RelativePath,
  stringRoot: boolean,
  limitsInput: Partial<Limits> | undefined,
): Result<readonly Segment[]> {
  const limits = normalizeLimits(limitsInput);
  if (!limits.ok) return limits;
  if (stringRoot
    ? typeof path !== 'string' && !Array.isArray(path)
    : typeof path !== 'string' && typeof path !== 'number' && !Array.isArray(path)) return fail(
    'construction',
    stringRoot ? 'form-field-path-root-invalid' : 'form-relative-path-invalid',
    stringRoot
      ? 'A Form field path must be a string or segment array.'
      : 'A relative Form path must be a segment or segment array.',
  );
  const ceiling = preflight(path, limits.value);
  if (ceiling !== null) return ceiling;
  const segments = typeof path === 'string'
    ? parsePath(path, limits.value)
    : ok(typeof path === 'number' ? [path] : [...path]);
  if (!segments.ok) return segments;
  return validateSegments(segments.value, stringRoot, limits.value);
}
