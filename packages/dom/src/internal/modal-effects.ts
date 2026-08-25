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
  readonly surface: HTMLElement;
}

interface ModalState {
  readonly document: Document;
  readonly entries: ModalEntry[];
  readonly hidden: Map<HTMLElement, HiddenSnapshot>;
  readonly scroll: ScrollSnapshot;
  readonly observer: MutationObserver | undefined;
}

const states = new WeakMap<Document, ModalState>();

export function acquireModalEffects(surface: HTMLElement): ModalEffects {
  const document = surface.ownerDocument;
  if (document?.body === undefined || document.body === null) return Object.freeze({ release(): void {} });
  const state = states.get(document) ?? createState(document);
  const entry = { id: Symbol('sectile-modal'), surface };
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
  const surface = state.entries.at(-1)?.surface;
  if (surface === undefined || !surface.isConnected) return;
  let branch: Element | null = surface;
  while (branch !== null && branch !== state.document.body) {
    const branchElement = branch as HTMLElement;
    capture(state, branchElement);
    branchElement.inert = false;
    branchElement.removeAttribute('aria-hidden');
    const parent = branch.parentElement as HTMLElement | null;
    if (parent === null) break;
    for (const sibling of parent.children) {
      if (sibling === branch) continue;
      const siblingElement = sibling as HTMLElement;
      capture(state, siblingElement);
      siblingElement.inert = true;
      siblingElement.setAttribute('aria-hidden', 'true');
    }
    branch = parent;
  }
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
