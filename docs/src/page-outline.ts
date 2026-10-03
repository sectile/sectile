export interface OutlineEntry { id: string; label: string; depth: 0 | 1 }

// Documentation presentation only: one snapshot per mounted page. Scroll
// queries use cached document positions; layout changes refresh the snapshot.
export function collectOutline(root: HTMLElement): { entries: OutlineEntry[]; headings: HTMLElement[] } {
  const headings = Array.from(root.querySelectorAll<HTMLElement>('h2, h3')).filter(heading =>
    !heading.closest('[data-docs-toc-exclude], [hidden], [inert], [aria-hidden="true"]') && heading.textContent?.trim());
  let parent = false;
  const suffixes = new Map<string, number>();
  const entries = headings.map(heading => {
    const label = heading.textContent!.trim();
    if (!heading.id) {
      const stem = `section-${label.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/gu, '') || 'heading'}`;
      let suffix = suffixes.get(stem) ?? 1;
      let id: string;
      do { id = suffix === 1 ? stem : `${stem}-${suffix}`; suffix++; } while (root.ownerDocument.getElementById(id));
      suffixes.set(stem, suffix);
      heading.id = id;
    }
    const depth: OutlineEntry['depth'] = heading.tagName === 'H3' && parent ? 1 : 0;
    if (heading.tagName === 'H2') parent = true;
    return { id: heading.id, label, depth };
  });
  return { entries, headings };
}

export function outlineIndex(positions: readonly number[], offset: number): number {
  let low = 0;
  let high = positions.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (positions[middle]! <= offset) low = middle + 1;
    else high = middle;
  }
  return low - 1;
}

export function connectOutline(root: HTMLElement, publish: (entries: OutlineEntry[]) => void, activate: (id: string) => void): () => void {
  const view = root.ownerDocument.defaultView;
  if (!view) return () => {};
  const { entries, headings } = collectOutline(root);
  publish(entries);
  try {
    const fragment = decodeURIComponent(view.location?.hash.slice(1) ?? '');
    headings.find(heading => heading.id === fragment)?.scrollIntoView();
  } catch { /* Malformed fragments retain the browser's normal location. */ }
  let positions: number[] = [];
  let offset = 0;
  let frame: number | undefined;
  let measure = true;
  let disposed = false;
  let current = '';
  const update = () => {
    frame = undefined;
    if (disposed) return;
    if (measure) {
      measure = false;
      const headerHeight = Number.parseFloat(view.getComputedStyle(root).getPropertyValue('--docs-header-height')) || 0;
      offset = headerHeight + 24;
      positions = headings.map(heading => heading.getBoundingClientRect().top + view.scrollY);
    }
    const index = outlineIndex(positions, view.scrollY + offset);
    const id = entries[Math.max(0, index)]?.id ?? '';
    if (id !== current) { current = id; activate(id); }
  };
  const schedule = () => { if (!disposed && frame === undefined) frame = view.requestAnimationFrame(update); };
  const resize = () => { measure = true; schedule(); };
  view.addEventListener('scroll', schedule, { passive: true });
  view.addEventListener('resize', resize, { passive: true });
  const observer = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(resize) : undefined;
  observer?.observe(root);
  if (root.parentElement) observer?.observe(root.parentElement);
  update();
  return () => {
    if (disposed) return;
    disposed = true;
    view.removeEventListener('scroll', schedule);
    view.removeEventListener('resize', resize);
    observer?.disconnect();
    if (frame !== undefined) view.cancelAnimationFrame(frame);
    positions = [];
  };
}
