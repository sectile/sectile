/** Native gesture admission, shared by surfaces without owning their state. */
export function eventOrigin(event: Event): Element | undefined {
  for (const target of event.composedPath()) {
    if ((target as Node).nodeType === 1) return target as Element;
  }
  return (event.target as Node | null)?.nodeType === 1 ? event.target as Element : undefined;
}

/** Native transform admission shared by coordinate projection and focus visibility. */
export function hasPositiveAxisAlignedTransform(style: CSSStyleDeclaration, view: { readonly DOMMatrixReadOnly?: typeof DOMMatrixReadOnly }): boolean {
  if (style.rotate && style.rotate !== 'none' && style.rotate !== '0deg' || style.perspective && style.perspective !== 'none') return false;
  if (style.scale && style.scale !== 'none' && style.scale.split(/\s+/u).some(value => !(Number.parseFloat(value) > 0))) return false;
  if (style.transform && style.transform !== 'none') {
    if (typeof view.DOMMatrixReadOnly !== 'function') return false;
    const matrix = new view.DOMMatrixReadOnly(style.transform);
    if (!matrix.is2D || matrix.b !== 0 || matrix.c !== 0 || matrix.a <= 0 || matrix.d <= 0) return false;
  }
  return true;
}

export function gestureParent(element: Element): Element | null {
  return element.assignedSlot ?? element.parentElement ?? (element.getRootNode() as ShadowRoot).host ?? null;
}

export function protectsNativeInteraction(origin: Element, root: HTMLElement, ignoreAttribute?: string): boolean {
  for (let element: Element | null = origin; element !== null; element = gestureParent(element)) {
    if (element.matches('input, textarea, select, button, a[href], summary, audio[controls], video[controls], [contenteditable]:not([contenteditable="false"]), [role="button"], [role="slider"], [role="spinbutton"], [role="textbox"], [role="combobox"], [role="checkbox"], [role="radio"], [role="switch"], [role="listbox"], [role="grid"], [role="tree"], [role="treegrid"], [role="menu"], [role="tablist"]')
      || (ignoreAttribute !== undefined && element.hasAttribute(ignoreAttribute))) return true;
    if (element === root) break;
  }
  return false;
}
