import { acquireIsolation, type IsolationLease } from './isolation.js';

export interface ModalEffects {
  update(additionalBranches: readonly HTMLElement[]): void;
  release(beforeIsolation?: () => void): void;
}

interface ScrollSnapshot {
  readonly overflow: string;
  readonly paddingRight: string;
}

interface ModalEntry {
  readonly id: symbol;
  branches: readonly HTMLElement[];
  readonly getOrder: () => number | null;
}

interface ModalState {
  readonly document: Document;
  readonly entries: ModalEntry[];
  readonly hidden: Map<HTMLElement, IsolationLease>;
  readonly scroll: ScrollSnapshot;
  readonly observer: MutationObserver | undefined;
  revision: number;
}

const states = new WeakMap<Document, ModalState>();

export function acquireModalEffects(surface: HTMLElement, additionalBranches: readonly HTMLElement[], getOrder: () => number | null): ModalEffects {
  const document = surface.ownerDocument;
  if (document?.body === undefined || document.body === null) return Object.freeze({ update(): void {}, release(beforeIsolation?: () => void): void { beforeIsolation?.(); } });
  const state = states.get(document) ?? createState(document);
  const entry: ModalEntry = { id: Symbol('sectile-modal'), branches: [surface, ...additionalBranches], getOrder };
  state.entries.push(entry);
  let released = false;
  const release = (beforeIsolation?: () => void): void => {
    if (released) return;
    released = true;
    state.revision++;
    const index = state.entries.findIndex((candidate) => candidate.id === entry.id);
    if (index >= 0) state.entries.splice(index, 1);
    if (state.entries.length > 0) {
      applyTopModal(state, beforeIsolation);
      return;
    }
    try {
      for (const lease of state.hidden.values()) lease.release();
    }
    finally {
      state.hidden.clear();
      try {
        if (document.body !== null) {
          try { document.body.style.overflow = state.scroll.overflow; }
          finally { document.body.style.paddingRight = state.scroll.paddingRight; }
        }
      } finally {
        try { state.observer?.disconnect(); }
        finally { states.delete(document); }
      }
    }
    beforeIsolation?.();
  };
  try { applyTopModal(state); }
  catch (error) {
    try { release(); } catch { /* Preserve the original installation failure. */ }
    throw error;
  }
  return Object.freeze({
    update(branches: readonly HTMLElement[]): void {
      if (released) return;
      entry.branches = [surface, ...branches];
      applyTopModal(state);
    },
    release,
  });
}

function createState(document: Document): ModalState {
  const Observer = document.defaultView?.MutationObserver;
  let state: ModalState;
  const observer = Observer === undefined ? undefined : new Observer(() => { if (state.entries.length > 0) applyTopModal(state); });
  state = { document, entries: [], hidden: new Map(), scroll: lockScroll(document), observer, revision: 0 };
  states.set(document, state);
  observer?.observe(document.body, { childList: true, subtree: true });
  return state;
}

function applyTopModal(state: ModalState, beforeIsolation?: () => void): void {
  const revision = ++state.revision;
  let top: ModalEntry | undefined;
  let topOrder = -1;
  for (const entry of state.entries) {
    const order = entry.getOrder();
    if (order !== null && order > topOrder) { top = entry; topOrder = order; }
  }
  const branches = top?.branches.filter((branch) => branch.isConnected) ?? [];
  const allowedChildren = new Map<HTMLElement, Set<HTMLElement>>();
  for (const surface of branches) {
    let branch: HTMLElement | null = surface;
    while (branch !== null && branch !== state.document.body) {
      const parent = branch.parentElement as HTMLElement | null;
      if (parent === null) break;
      const allowed = allowedChildren.get(parent) ?? new Set<HTMLElement>();
      allowed.add(branch);
      allowedChildren.set(parent, allowed);
      branch = parent;
    }
  }
  const hidden = new Set<HTMLElement>();
  for (const [parent, allowed] of allowedChildren) {
    for (const child of parent.children) {
      const element = child as HTMLElement;
      if (!allowed.has(element)) hidden.add(element);
    }
  }
  for (const [element, lease] of state.hidden) {
    if (hidden.has(element)) continue;
    state.hidden.delete(element);
    lease.release();
  }
  // Focus return can now reach the parent; retire its focused child afterward.
  try { beforeIsolation?.(); }
  finally {
    for (const element of hidden) {
      if (state.revision !== revision) break;
      if (state.hidden.has(element)) continue;
      const lease = acquireIsolation(element);
      state.hidden.set(element, lease);
      lease.set(true);
    }
  }
}

function lockScroll(document: Document): ScrollSnapshot {
  const body = document.body;
  const view = document.defaultView;
  const snapshot = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
  const viewportWidth = view?.innerWidth ?? 0;
  const documentWidth = document.documentElement?.clientWidth ?? viewportWidth;
  const scrollbarWidth = documentWidth > 0 ? Math.max(0, viewportWidth - documentWidth) : 0;
  const computedPadding = view?.getComputedStyle?.(body).paddingRight;
  const padding = Number.parseFloat(computedPadding ?? body.style.paddingRight) || 0;
  body.style.overflow = 'hidden';
  if (scrollbarWidth > 0) body.style.paddingRight = `${padding + scrollbarWidth}px`;
  return snapshot;
}
