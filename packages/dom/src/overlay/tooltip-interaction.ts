import { boundRects, isFiniteRect, rectContainsPoint, type Rect } from '@sectile/core/geometry';
import { isEventInside } from '../interact-outside.js';
import type { PopupFocusHoverBinding, PopupFocusHoverHooks } from './popup/connection.js';

export interface TooltipTriggerAttributesOptions { readonly id: string; readonly describedBy?: string | null | undefined; readonly active?: boolean }
export interface TooltipTriggerAttributes { readonly 'aria-describedby': string | undefined }
function descriptionTokens(value: string | null | undefined): string[] { return (value ?? '').split(/[\t\n\f\r ]+/u).filter(Boolean); }
/** Compose an author-owned description with one Tooltip association. */
export function getTooltipTriggerAttributes(options: TooltipTriggerAttributesOptions): TooltipTriggerAttributes {
  let tokens = descriptionTokens(options.describedBy);
  if (options.active === false) tokens = tokens.filter(token => token !== options.id);
  else if (options.id && !tokens.includes(options.id)) tokens.push(options.id);
  return Object.freeze({ 'aria-describedby': tokens.join(' ') || undefined });
}
/** Disconnect removes only an association added here, retaining subsequent caller edits. */
export function connectTooltipDescription(element: HTMLElement, id: string): () => void {
  let trigger: HTMLElement | undefined = element;
  const before = element.getAttribute('aria-describedby'), added = !descriptionTokens(before).includes(id);
  const projected = getTooltipTriggerAttributes({ id, describedBy: before })['aria-describedby'];
  if (projected === undefined) element.removeAttribute('aria-describedby'); else element.setAttribute('aria-describedby', projected);
  return (): void => {
    const owned = trigger; trigger = undefined; if (!owned || !added) return;
    const value = getTooltipTriggerAttributes({ id, describedBy: owned.getAttribute('aria-describedby'), active: false })['aria-describedby'];
    if (value === undefined) owned.removeAttribute('aria-describedby'); else owned.setAttribute('aria-describedby', value);
  };
}

/** Native input/resource projection only; accepted open state remains with the popup controller. */
export function connectTooltipInteraction(options: { readonly root: HTMLElement; readonly trigger?: HTMLElement | undefined; readonly id?: string | undefined },
  hooks: PopupFocusHoverHooks): PopupFocusHoverBinding {
  const { root, trigger, id } = options;
  let active = true, hovered = false, transfer: Rect | undefined;
  const cursor = { x: 0, y: 0 };
  let focused = false;
  const cancelPending = (): void => { transfer = undefined; root.ownerDocument?.removeEventListener?.('mousemove', move); };
  const inside = (event: Event): boolean => isEventInside(event, root) || (trigger !== undefined && isEventInside(event, trigger));
  const focus = (): void => { if (!active) return; focused = true; cancelPending(); hooks.request(true, 'keyboard'); };
  const blur = (): void => { if (!active) return; focused = false; if (!hovered && transfer === undefined) hooks.request(false, 'keyboard'); };
  const enter = (event: MouseEvent): void => {
    if (!active || (event.currentTarget === root && !hooks.readOpen())) return;
    hovered = true; cancelPending(); if (!hooks.readOpen()) hooks.request(true, 'pointer');
  };
  const leave = (event: MouseEvent): void => {
    if (!active) return;
    if (event.relatedTarget !== null && inside({ target: event.relatedTarget } as Event)) return;
    hovered = false; cancelPending(); if (focused || !hooks.readOpen()) return;
    const destination = event.currentTarget === root ? trigger : root;
    if (destination && root.ownerDocument?.addEventListener && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
      const box = destination.getBoundingClientRect?.();
      if (isFiniteRect(box) && box.width > 0 && box.height > 0) {
        transfer = boundRects({ x: event.clientX, y: event.clientY, width: 0, height: 0 }, box);
        root.ownerDocument.addEventListener('mousemove', move); return;
      }
    }
    hooks.request(false, 'pointer');
  };
  const move = (event: MouseEvent): void => {
    const corridor = transfer; if (!active || corridor === undefined) return;
    if (!hooks.readOpen()) { cancelPending(); return; }
    // Surface entry retires transfer. Moves use only cached geometry, not DOM ancestry/layout.
    cursor.x = event.clientX; cursor.y = event.clientY;
    if (Number.isFinite(cursor.x) && Number.isFinite(cursor.y) && rectContainsPoint(corridor, cursor)) return;
    cancelPending(); if (!focused) hooks.request(false, 'pointer');
  };
  if (id !== undefined) root.id = id;
  const releaseDescription = trigger !== undefined && id !== undefined ? connectTooltipDescription(trigger, id) : undefined;
  trigger?.addEventListener('focus', focus); trigger?.addEventListener('blur', blur);
  trigger?.addEventListener('mouseenter', enter); trigger?.addEventListener('mouseleave', leave);
  root.addEventListener('mouseenter', enter); root.addEventListener('mouseleave', leave);
  const focusedElement = trigger?.ownerDocument?.activeElement;
  focused = !!focusedElement && (trigger === focusedElement || trigger?.contains(focusedElement) === true);
  return { cancelPending, disconnect(): void {
    if (!active) return; active = false; cancelPending();
    trigger?.removeEventListener('focus', focus); trigger?.removeEventListener('blur', blur);
    trigger?.removeEventListener('mouseenter', enter); trigger?.removeEventListener('mouseleave', leave);
    root.removeEventListener('mouseenter', enter); root.removeEventListener('mouseleave', leave); releaseDescription?.();
  } };
}
