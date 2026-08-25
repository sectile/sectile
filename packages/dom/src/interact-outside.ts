export interface InteractOutsideEvent {
  readonly originalEvent: PointerEvent;
  readonly target: EventTarget | null;
  readonly surface: HTMLElement;
  readonly defaultPrevented: boolean;
  preventDefault(): void;
  isInside(element: Element | null | undefined): boolean;
}

export type InteractOutsideHandler = (event: InteractOutsideEvent) => void;

export function createInteractOutsideEvent(
  originalEvent: PointerEvent,
  surface: HTMLElement,
): InteractOutsideEvent {
  let defaultPrevented = false;
  return Object.freeze({
    originalEvent,
    target: originalEvent.target,
    surface,
    get defaultPrevented(): boolean { return defaultPrevented; },
    preventDefault(): void { defaultPrevented = true; },
    isInside(element: Element | null | undefined): boolean {
      return element !== null && element !== undefined && isEventInside(originalEvent, element);
    },
  });
}

export function isEventInside(event: Event, element: Element): boolean {
  const path = event.composedPath?.();
  if (path?.includes(element) === true) return true;
  const target = event.target;
  if (target === null) return false;
  try {
    return element === target || element.contains(target as Node);
  } catch {
    return false;
  }
}
