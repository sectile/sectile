/** DOM-only composition of modal masks and a popup's inactive lifetime. */
export interface IsolationLease {
  set(active: boolean): void;
  release(): void;
}

interface IsolationState {
  readonly inert: boolean;
  readonly ariaHidden: string | null;
  owners: number;
  active: number;
}

const states = new WeakMap<HTMLElement, IsolationState>();

export function acquireIsolation(element: HTMLElement): IsolationLease {
  let target: HTMLElement | undefined = element;
  const state = states.get(element) ?? {
    inert: element.inert === true, ariaHidden: element.getAttribute('aria-hidden'), owners: 0, active: 0,
  };
  states.set(element, state);
  state.owners++;
  let active = false;
  const project = (node: HTMLElement): void => {
    const inert = state.inert || state.active > 0;
    const aria = state.active > 0 ? 'true' : state.ariaHidden;
    if (node.inert !== inert) node.inert = inert;
    if (node.getAttribute('aria-hidden') !== aria) {
      if (aria === null) node.removeAttribute('aria-hidden');
      else node.setAttribute('aria-hidden', aria);
    }
  };
  return {
    set(next) {
      if (target === undefined || active === next) return;
      active = next;
      state.active += next ? 1 : -1;
      project(target);
    },
    release() {
      const node = target;
      if (node === undefined) return;
      target = undefined;
      if (active) state.active--;
      state.owners--;
      if (state.owners === 0) states.delete(node);
      project(node);
    },
  };
}
