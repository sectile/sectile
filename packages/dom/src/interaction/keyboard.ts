export type ReadingDirection = 'ltr' | 'rtl';

export interface KeyboardInput {
  readonly key: string;
  readonly altKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
}

export function printableKey(input: KeyboardInput): string | null {
  if (input.altKey === true || input.ctrlKey === true || input.metaKey === true) return null;
  const key = input.key;
  return key.length === 1 || (key.length === 2 && key.codePointAt(0)! > 0xffff) ? key : null;
}

export function repeatedTypeahead(buffer: string, next: string): string {
  if (buffer.length === 0) return next;
  for (const character of buffer) if (character !== next) return `${buffer}${next}`;
  return next;
}

export function horizontalArrow(
  key: string,
  direction: ReadingDirection = 'ltr',
): 'next' | 'previous' | null {
  if (key === 'ArrowRight') return direction === 'rtl' ? 'previous' : 'next';
  if (key === 'ArrowLeft') return direction === 'rtl' ? 'next' : 'previous';
  return null;
}
