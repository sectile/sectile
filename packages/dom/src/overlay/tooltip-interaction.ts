import { boundRects, isFiniteRect, rectContainsPoint, type Rect } from '@sectile/core/geometry';
import { isEventInside } from '../interact-outside.js';
import type { PopupFocusHoverBinding, PopupFocusHoverHooks } from './popup/connection.js';

declare const tooltipGroupBrand: unique symbol;
export interface TooltipGroup { readonly [tooltipGroupBrand]: true }
export interface TooltipTimingOptions { readonly openDelay?: number | undefined; readonly closeDelay?: number | undefined; readonly group?: TooltipGroup | undefined }
interface GroupState { readonly skipDelay: number; open: number; until: number }
const groups = new WeakMap<TooltipGroup, GroupState>();
function delayValue(value: number | undefined, fallback: number): number {
  const delay = value ?? fallback;
  if (!Number.isFinite(delay) || delay < 0 || delay > 2_147_483_647) throw new RangeError('Tooltip delay must be finite milliseconds within the native timer range.');
  return delay;
}
/** Caller-owned timing scope; it retains no element, callback or timer. */
export function createTooltipGroup(options: { readonly skipDelay?: number } = {}): TooltipGroup {
  const group = Object.freeze({}) as TooltipGroup;
  groups.set(group, { skipDelay: delayValue(options.skipDelay, 300), open: 0, until: 0 }); return group;
}

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
export function connectTooltipInteraction(options: TooltipTimingOptions & { readonly root: HTMLElement; readonly trigger?: HTMLElement | undefined; readonly id?: string | undefined },
  hooks: PopupFocusHoverHooks): PopupFocusHoverBinding {
  const { root, trigger, id } = options;
  let active = true, hovered = false, transfer: Rect | undefined;
  const cursor = { x: 0, y: 0 };
  let focused = false;
  const openDelay = delayValue(options.openDelay, 0), closeDelay = delayValue(options.closeDelay, 0);
  const group = options.group === undefined ? undefined : groups.get(options.group);
  if (options.group !== undefined && !group) throw new TypeError('Tooltip group must be created by createTooltipGroup.');
  let joined = false, timer: ReturnType<typeof setTimeout> | undefined;
  const syncOpen = (open: boolean): void => {
    if (!group || joined === open) return;
    joined = open; group.open += open ? 1 : -1;
    if (!open) group.until = Date.now() + group.skipDelay;
  };
  const cancelPending = (): void => { if (timer !== undefined) clearTimeout(timer); timer = undefined; transfer = undefined; root.ownerDocument?.removeEventListener?.('mousemove', move); };
  const request = (open: boolean, method: 'pointer' | 'keyboard'): void => {
    if (timer !== undefined) clearTimeout(timer); timer = undefined;
    const delay = method === 'keyboard' ? 0 : open ? group && (group.open > 0 || Date.now() < group.until) ? 0 : openDelay : closeDelay;
    const apply = (): void => { timer = undefined; if (!active) return; hooks.request(open, method); if (active) syncOpen(hooks.readOpen()); };
    if (delay === 0) apply(); else timer = setTimeout(apply, delay);
  };
  const inside = (event: Event): boolean => isEventInside(event, root) || (trigger !== undefined && isEventInside(event, trigger));
  const focus = (): void => { if (!active) return; focused = true; cancelPending(); request(true, 'keyboard'); };
  const blur = (): void => { if (!active) return; focused = false; if (!hovered && transfer === undefined) request(false, 'keyboard'); };
  const enter = (event: MouseEvent): void => {
    if (!active || (event.currentTarget === root && !hooks.readOpen())) return;
    hovered = true; cancelPending(); if (!hooks.readOpen()) request(true, 'pointer');
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
    request(false, 'pointer');
  };
  const move = (event: MouseEvent): void => {
    const corridor = transfer; if (!active || corridor === undefined) return;
    if (!hooks.readOpen()) { cancelPending(); return; }
    // Surface entry retires transfer. Moves use only cached geometry, not DOM ancestry/layout.
    cursor.x = event.clientX; cursor.y = event.clientY;
    if (Number.isFinite(cursor.x) && Number.isFinite(cursor.y) && rectContainsPoint(corridor, cursor)) return;
    cancelPending(); if (!focused) request(false, 'pointer');
  };
  let releaseDescription: (() => void) | undefined;
  const disconnect = (): void => {
    if (!active) return; active = false; cancelPending(); syncOpen(false);
    trigger?.removeEventListener('focus', focus); trigger?.removeEventListener('blur', blur);
    trigger?.removeEventListener('mouseenter', enter); trigger?.removeEventListener('mouseleave', leave);
    root.removeEventListener('mouseenter', enter); root.removeEventListener('mouseleave', leave); releaseDescription?.();
  };
  try {
    if (id !== undefined) root.id = id;
    releaseDescription = trigger !== undefined && id !== undefined ? connectTooltipDescription(trigger, id) : undefined;
    trigger?.addEventListener('focus', focus); trigger?.addEventListener('blur', blur);
    trigger?.addEventListener('mouseenter', enter); trigger?.addEventListener('mouseleave', leave);
    root.addEventListener('mouseenter', enter); root.addEventListener('mouseleave', leave);
    const focusedElement = trigger?.ownerDocument?.activeElement;
    focused = !!focusedElement && (trigger === focusedElement || trigger?.contains(focusedElement) === true);
    syncOpen(hooks.readOpen());
  } catch (error) { try { disconnect(); } catch { /* Preserve admission failure. */ } throw error; }
  return { cancelPending, syncOpen, disconnect };
}
