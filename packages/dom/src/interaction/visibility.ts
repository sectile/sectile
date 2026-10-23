export interface HiddenBinding {
  setHidden(hidden: boolean, isCurrent?: () => boolean): void;
  disconnect(): void;
}

export function createHiddenBinding(element: HTMLElement): HiddenBinding {
  const previous = hiddenAttribute(element);
  let applied: string | null | undefined;
  let active = true;
  return Object.freeze({
    setHidden(hidden: boolean, isCurrent?: () => boolean): void {
      if (!active || isCurrent?.() === false) return;
      element.hidden = hidden;
      if (!active || isCurrent?.() === false) return;
      if (hidden) element.setAttribute('hidden', '');
      else element.removeAttribute('hidden');
      if (!active || isCurrent?.() === false) return;
      applied = hiddenAttribute(element);
    },
    disconnect(): void {
      if (!active) return;
      active = false;
      if (applied !== undefined && hiddenAttribute(element) === applied) {
        element.hidden = previous !== null;
        if (previous === null) element.removeAttribute('hidden');
        else element.setAttribute('hidden', previous);
      }
      applied = undefined;
    },
  });
}

function hiddenAttribute(element: HTMLElement): string | null {
  const getAttribute = element.getAttribute;
  return typeof getAttribute === 'function'
    ? getAttribute.call(element, 'hidden')
    : element.hidden ? '' : null;
}
