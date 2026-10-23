/** One owner-local capture; callers retire it on completion and presentation teardown. */
export interface SurfaceMoveFocus {
  readonly target: HTMLElement;
  readonly scope: Document | ShadowRoot;
  readonly revision: number;
}

export function captureSurfaceMoveFocus(root: HTMLElement, revision: number): SurfaceMoveFocus | undefined {
  const scope = root.getRootNode() as Document | ShadowRoot, target = scope.activeElement as HTMLElement | null;
  return target?.isConnected && typeof target.focus === 'function' && root.contains(target)
    ? { target, scope, revision } : undefined;
}

/** A move is not a new focus request and must not overwrite a newer native owner. */
export function restoreSurfaceMoveFocus(root: HTMLElement, held: SurfaceMoveFocus | undefined, revision: number): void {
  if (!held || held.scope !== root.getRootNode() || held.revision !== revision) return;
  const target = held.target, document = root.ownerDocument, focused = held.scope.activeElement;
  if (target.ownerDocument === document && target.isConnected && root.contains(target)
    && (focused == null || focused === document.body || focused === document.documentElement)
    && !target.closest('[inert],[hidden],[aria-hidden="true"],:disabled')) target.focus({ preventScroll: true });
}
