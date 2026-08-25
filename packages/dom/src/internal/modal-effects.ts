export interface ModalEffects {
  release(): void;
}

interface HiddenSnapshot {
  readonly element: HTMLElement;
  readonly inert: boolean;
  readonly ariaHidden: string | null;
}

interface ScrollSnapshot {
  readonly overflow: string;
  readonly paddingRight: string;
}

interface ModalEntry {
  readonly id: symbol;
  readonly branches: readonly HTMLElement[];
}

interface ModalState {
  readonly document: Document;
  readonly entries: ModalEntry[];
  readonly hidden: Map<HTMLElement, HiddenSnapshot>;
  readonly scroll: ScrollSnapshot;
  readonly observer: MutationObserver | undefined;
}

const states = new WeakMap<Document, ModalState>();

export function acquireModalEffects(surface: HTMLElement, additionalBranches: readonly HTMLElement[] = []): ModalEffects {
  const document = surface.ownerDocument;
  if (document?.body === undefined || document.body === null) return Object.freeze({ release(): void {} });
  const state = states.get(document) ?? createState(document);
  const entry = { id: Symbol('sectile-modal'), branches: [surface, ...additionalBranches] };
  state.entries.push(entry);
  applyTopModal(state);
  let released = false;

  return Object.freeze({
    release(): void {
      if (released) return;
      released = true;
      const index = state.entries.findIndex((candidate) => candidate.id === entry.id);
      if (index >= 0) state.entries.splice(index, 1);
      if (state.entries.length > 0) {
        applyTopModal(state);
        return;
      }
      restoreIsolation(state);
      if (document.body !== null) {
        document.body.style.overflow = state.scroll.overflow;
        document.body.style.paddingRight = state.scroll.paddingRight;
      }
      state.observer?.disconnect();
      states.delete(document);
    },
  });
}

function createState(document: Document): ModalState {
  const Observer = document.defaultView?.MutationObserver;
  let state: ModalState;
  const observer = Observer === undefined ? undefined : new Observer(() => { if (state.entries.length > 0) applyTopModal(state); });
  state = { document, entries: [], hidden: new Map(), scroll: lockScroll(document), observer };
  states.set(document, state);
  observer?.observe(document.body, { childList: true, subtree: true });
  return state;
}

function applyTopModal(state: ModalState): void {
  restoreIsolation(state);
  const branches = state.entries.at(-1)?.branches.filter((branch) => branch.isConnected) ?? [];
  if (branches.length === 0) return;
  const preserveAriaHidden = new Set(branches.slice(1));
  const allowedChildren = new Map<HTMLElement, Set<HTMLElement>>();
  for (const surface of branches) {
    let branch: HTMLElement | null = surface;
    while (branch !== null && branch !== state.document.body) {
      capture(state, branch);
      branch.inert = false;
      if (preserveAriaHidden.has(branch)) restoreAriaHidden(state, branch);
      else branch.removeAttribute('aria-hidden');
      const parent = branch.parentElement as HTMLElement | null;
      if (parent === null) break;
      const allowed = allowedChildren.get(parent) ?? new Set<HTMLElement>();
      allowed.add(branch);
      allowedChildren.set(parent, allowed);
      branch = parent;
    }
  }
  for (const [parent, allowed] of allowedChildren) {
    for (const child of parent.children) {
      const element = child as HTMLElement;
      capture(state, element);
      if (allowed.has(element)) {
        element.inert = false;
        if (preserveAriaHidden.has(element)) restoreAriaHidden(state, element);
        else element.removeAttribute('aria-hidden');
      } else {
        element.inert = true;
        element.setAttribute('aria-hidden', 'true');
      }
    }
  }
}

function restoreAriaHidden(state: ModalState, element: HTMLElement): void {
  const value = state.hidden.get(element)?.ariaHidden;
  if (value === null || value === undefined) element.removeAttribute('aria-hidden');
  else element.setAttribute('aria-hidden', value);
}

function capture(state: ModalState, element: HTMLElement): void {
  if (state.hidden.has(element)) return;
  state.hidden.set(element, {
    element,
    inert: element.inert,
    ariaHidden: element.getAttribute('aria-hidden'),
  });
}

function restoreIsolation(state: ModalState): void {
  for (const snapshot of [...state.hidden.values()].reverse()) {
    snapshot.element.inert = snapshot.inert;
    if (snapshot.ariaHidden === null) snapshot.element.removeAttribute('aria-hidden');
    else snapshot.element.setAttribute('aria-hidden', snapshot.ariaHidden);
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
