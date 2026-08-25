export type ReadingDirection = 'ltr' | 'rtl';

export function horizontalArrow(
  key: string,
  direction: ReadingDirection = 'ltr',
): 'next' | 'previous' | null {
  if (key === 'ArrowRight') return direction === 'rtl' ? 'previous' : 'next';
  if (key === 'ArrowLeft') return direction === 'rtl' ? 'next' : 'previous';
  return null;
}
