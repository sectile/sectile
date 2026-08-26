const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function graphemeSegments(value: string): Intl.Segments {
  return graphemeSegmenter.segment(value);
}

export function previousGraphemeOffset(text: string, offset: number): number {
  let previous = 0;
  for (const segment of graphemeSegments(text)) {
    if (segment.index >= offset) break;
    previous = segment.index;
  }
  return previous;
}

export function nextGraphemeOffset(text: string, offset: number): number {
  for (const segment of graphemeSegments(text)) {
    if (segment.index > offset) return segment.index;
  }
  return text.length;
}
