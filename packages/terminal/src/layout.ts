import stringWidth from 'string-width';
import { graphemeSegments } from './internal/grapheme.js';

export function fitTerminalText(value: string, width: number): string {
  if (!Number.isSafeInteger(width) || width < 0) {
    throw new RangeError('Terminal text width must be a non-negative safe integer.');
  }
  if (width === 0) return '';
  const valueWidth = stringWidth(value);
  if (valueWidth <= width) return `${value}${' '.repeat(width - valueWidth)}`;

  const ellipsis = '…';
  const contentWidth = width - stringWidth(ellipsis);
  let rendered = '';
  let renderedWidth = 0;
  for (const segment of graphemeSegments(value)) {
    const segmentWidth = stringWidth(segment.segment);
    if (renderedWidth + segmentWidth > contentWidth) break;
    rendered += segment.segment;
    renderedWidth += segmentWidth;
  }
  return `${rendered}${' '.repeat(contentWidth - renderedWidth)}${ellipsis}`;
}
