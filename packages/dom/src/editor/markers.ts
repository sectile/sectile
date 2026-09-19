import type { InlineSurface } from '@sectile/content/position';
import type { AuthoringMount } from '@sectile/editor/authoring';

const surfaceKindAttribute = 'data-sectile-editor-surface-kind';
const surfaceIDAttribute = 'data-sectile-editor-surface-id';
const surfaceSlotAttribute = 'data-sectile-editor-surface-slot';
const inlineAtomAttribute = 'data-sectile-editor-inline-atom';
const hardBreakAttribute = 'data-sectile-editor-hard-break';
const isolatedFrameAttribute = 'data-sectile-editor-isolated-frame';
const mountAttribute = 'data-sectile-editor-mount';

export function markEditorInlineSurface(
  element: HTMLElement,
  surface: InlineSurface,
): void {
  element.setAttribute(surfaceKindAttribute, surface.type);
  element.setAttribute(surfaceIDAttribute, surface.id);
  if (surface.type === 'slot') {
    element.setAttribute(surfaceSlotAttribute, surface.slot);
  } else {
    element.removeAttribute(surfaceSlotAttribute);
  }
}

export function markEditorInlineAtom(
  element: HTMLElement,
  id: string,
): void {
  element.setAttribute(inlineAtomAttribute, id);
  element.setAttribute('contenteditable', 'false');
}

export function markEditorHardBreak(
  element: HTMLElement,
): void {
  element.setAttribute(hardBreakAttribute, '');
}

export function markEditorIsolatedFrame(
  element: HTMLElement,
  frame: string,
): void {
  element.setAttribute(isolatedFrameAttribute, frame);
  element.setAttribute('contenteditable', 'true');
}

export function markEditorAuthoringMount(
  element: HTMLElement,
  ownerID: string,
  mount: AuthoringMount,
): void {
  element.setAttribute(mountAttribute, mount.name);
  if (mount.frame === 'slot') {
    markEditorIsolatedFrame(
      element,
      `${ownerID}:${mount.name}`,
    );
  }
  if (
    mount.kind === 'inline'
    && mount.target.type === 'node'
    && mount.target.slot !== undefined
  ) {
    markEditorInlineSurface(element, {
      type: 'slot',
      id: mount.target.id,
      slot: mount.target.slot,
    });
  }
}

export function readEditorInlineSurface(
  element: Element,
): InlineSurface | null {
  const kind = element.getAttribute(surfaceKindAttribute);
  const id = element.getAttribute(surfaceIDAttribute);
  if (id === null) return null;
  if (kind === 'node') {
    return Object.freeze({
      type: 'node',
      id,
    });
  }
  if (kind === 'slot') {
    const slot = element.getAttribute(surfaceSlotAttribute);
    return slot === null
      ? null
      : Object.freeze({
          type: 'slot',
          id,
          slot,
        });
  }
  return null;
}

export function editorInlineSurfaceSelector(): string {
  return `[${surfaceIDAttribute}]`;
}

export function editorInlineAtomSelector(): string {
  return `[${inlineAtomAttribute}]`;
}

export function editorHardBreakSelector(): string {
  return `[${hardBreakAttribute}]`;
}

export function editorIsolatedFrameSelector(): string {
  return `[${isolatedFrameAttribute}]`;
}

export function editorIsolatedFrameID(
  element: Element,
): string | null {
  return element.getAttribute(isolatedFrameAttribute);
}
