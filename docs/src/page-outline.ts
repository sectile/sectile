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

export interface OutlineWindow { start: number; end: number; first: number; last: number }

// Each heading owns the interval through the next heading; the final interval
// ends with the article. Viewport edges map continuously into outline rows.
export function outlineWindow(positions: readonly number[], articleEnd: number, top: number, bottom: number): OutlineWindow {
  const count = positions.length;
  const project = (edge: number) => {
    if (!count || edge < positions[0]!) return 0;
    if (edge >= articleEnd) return count;
    const index = Math.max(0, outlineIndex(positions, edge));
    const end = positions[index + 1] ?? articleEnd;
    return index + Math.max(0, Math.min(1, (edge - positions[index]!) / Math.max(1, end - positions[index]!)));
  };
  const start = project(top);
  const end = Math.max(start, project(bottom));
  return { start, end, first: end > start ? Math.floor(start) : -1, last: end > start ? Math.ceil(end) - 1 : -1 };
}

export function outlineRailOffset(boundaries: readonly number[], position: number): number {
  if (boundaries.length < 2) return 0;
  const index = Math.min(boundaries.length - 2, Math.max(0, Math.floor(position)));
  const fraction = Math.max(0, Math.min(1, position - index));
  return boundaries[index]! + fraction * (boundaries[index + 1]! - boundaries[index]!);
}

export function outlineRailPath(entries: readonly OutlineEntry[], boundaries: readonly number[], indent: number): string {
  if (!entries.length || boundaries.length !== entries.length + 1) return '';
  let x = 1 + entries[0]!.depth * indent;
  let path = `M ${x} ${boundaries[0]}`;
  for (let index = 1; index < entries.length; index++) {
    const nextX = 1 + entries[index]!.depth * indent;
    if (nextX !== x) {
      const boundary = boundaries[index]!;
      const bend = Math.min(indent / 2, (boundary - boundaries[index - 1]!) / 2, (boundaries[index + 1]! - boundary) / 2);
      path += ` L ${x} ${boundary - bend} L ${nextX} ${boundary + bend}`;
      x = nextX;
    }
  }
  return `${path} L ${x} ${boundaries[entries.length]}`;
}

export function connectOutline(root: HTMLElement, publish: (entries: OutlineEntry[]) => void, activate: (window: OutlineWindow) => void): () => void {
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
  let articleEnd = 0;
  let frame: number | undefined;
  let measure = true;
  let disposed = false;
  const update = () => {
    frame = undefined;
    if (disposed) return;
    if (measure) {
      measure = false;
      const headerHeight = Number.parseFloat(view.getComputedStyle(root).getPropertyValue('--docs-header-height')) || 0;
      offset = headerHeight + 24;
      positions = headings.map(heading => heading.getBoundingClientRect().top + view.scrollY);
      articleEnd = Math.max(positions.at(-1) ?? 0, root.getBoundingClientRect().bottom + view.scrollY);
    }
    activate(outlineWindow(positions, articleEnd, view.scrollY + offset, view.scrollY + view.innerHeight));
  };
  const schedule = () => { if (!disposed && frame === undefined) frame = view.requestAnimationFrame(update); };
  const resize = () => { measure = true; schedule(); };
  view.addEventListener('scroll', schedule, { passive: true });
  view.addEventListener('resize', resize, { passive: true });
  const observer = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(resize) : undefined;
  observer?.observe(root);
  if (root.parentElement) observer?.observe(root.parentElement);
  // Observe the flow boxes that can move headings even if total article height
  // stays unchanged. Class/style/margin and content changes invalidate too.
  const boxes = new Set<HTMLElement>();
  for (const heading of headings) {
    let box: HTMLElement | null = heading;
    while (box && box !== root && !boxes.has(box)) { boxes.add(box); observer?.observe(box); box = box.parentElement; }
  }
  const mutations = typeof view.MutationObserver === 'function' ? new view.MutationObserver(resize) : undefined;
  mutations?.observe(root, { subtree: true, childList: true, characterData: true, attributes: true });
  update();
  return () => {
    if (disposed) return;
    disposed = true;
    view.removeEventListener('scroll', schedule);
    view.removeEventListener('resize', resize);
    observer?.disconnect();
    mutations?.disconnect();
    boxes.clear();
    if (frame !== undefined) view.cancelAnimationFrame(frame);
    positions = [];
  };
}
