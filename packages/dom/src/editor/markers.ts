import type { InlineSurface } from '@sectile/content/position';
import type {
  AuthoringMount,
} from '@sectile/editor/authoring';
import type {
  EditorSessionSnapshot,
} from '@sectile/editor/session';

const surfaceKindAttribute = 'data-sectile-editor-surface-kind';
const surfaceIDAttribute = 'data-sectile-editor-surface-id';
const surfaceSlotAttribute = 'data-sectile-editor-surface-slot';
const inlineAtomAttribute = 'data-sectile-editor-inline-atom';
const hardBreakAttribute = 'data-sectile-editor-hard-break';
const isolatedFrameAttribute = 'data-sectile-editor-isolated-frame';
const mountAttribute = 'data-sectile-editor-mount';

export type EditorDOMAttributes = Readonly<
  Record<string, string | undefined>
>;

export interface EditorRootAttributeOptions {
  readonly spellcheck?: boolean;
}

export function editorRootAttributes(
  snapshot: EditorSessionSnapshot,
  options: EditorRootAttributeOptions = {},
): EditorDOMAttributes {
  const disabled = snapshot.interaction.disabled;
  const readOnly = snapshot.interaction.readOnly;
  return Object.freeze({
    'data-scope': 'editor',
    'data-part': 'root',
    contenteditable: disabled || readOnly ? 'false' : 'true',
    'aria-disabled': disabled ? 'true' : undefined,
    'aria-readonly': readOnly ? 'true' : undefined,
    ...(options.spellcheck === undefined
      ? {}
      : { spellcheck: String(options.spellcheck) }),
  });
}

export function editorInlineSurfaceAttributes(
  surface: InlineSurface,
): EditorDOMAttributes {
  return Object.freeze({
    [surfaceKindAttribute]: surface.type,
    [surfaceIDAttribute]: surface.id,
    [surfaceSlotAttribute]:
      surface.type === 'slot' ? surface.slot : undefined,
  });
}

export function editorInlineAtomAttributes(
  id: string,
): EditorDOMAttributes {
  return Object.freeze({
    [inlineAtomAttribute]: id,
    contenteditable: 'false',
  });
}

export function editorHardBreakAttributes(): EditorDOMAttributes {
  return Object.freeze({
    [hardBreakAttribute]: '',
  });
}

export function editorIsolatedFrameAttributes(
  frame: string,
): EditorDOMAttributes {
  return Object.freeze({
    [isolatedFrameAttribute]: frame,
    contenteditable: 'true',
  });
}

export function editorAuthoringMountAttributes(
  ownerID: string,
  mount: AuthoringMount,
): EditorDOMAttributes {
  const attributes: Record<string, string | undefined> = {
    [mountAttribute]: mount.name,
  };
  if (mount.frame === 'slot') {
    Object.assign(
      attributes,
      editorIsolatedFrameAttributes(`${ownerID}:${mount.name}`),
    );
  }
  if (
    mount.kind === 'inline'
    && mount.target.type === 'node'
    && mount.target.slot !== undefined
  ) {
    Object.assign(
      attributes,
      editorInlineSurfaceAttributes({
        type: 'slot',
        id: mount.target.id,
        slot: mount.target.slot,
      }),
    );
  }
  return Object.freeze(attributes);
}

export function markEditorInlineSurface(
  element: HTMLElement,
  surface: InlineSurface,
): void {
  applyManagedAttributes(
    element,
    editorInlineSurfaceAttributes(surface),
    [
      surfaceKindAttribute,
      surfaceIDAttribute,
      surfaceSlotAttribute,
    ],
  );
}

export function markEditorInlineAtom(
  element: HTMLElement,
  id: string,
): void {
  applyManagedAttributes(
    element,
    editorInlineAtomAttributes(id),
    [inlineAtomAttribute, 'contenteditable'],
  );
}

export function markEditorHardBreak(
  element: HTMLElement,
): void {
  applyManagedAttributes(
    element,
    editorHardBreakAttributes(),
    [hardBreakAttribute],
  );
}

export function markEditorIsolatedFrame(
  element: HTMLElement,
  frame: string,
): void {
  applyManagedAttributes(
    element,
    editorIsolatedFrameAttributes(frame),
    [isolatedFrameAttribute, 'contenteditable'],
  );
}

export function markEditorAuthoringMount(
  element: HTMLElement,
  ownerID: string,
  mount: AuthoringMount,
): void {
  applyManagedAttributes(
    element,
    editorAuthoringMountAttributes(ownerID, mount),
    [
      mountAttribute,
      isolatedFrameAttribute,
      'contenteditable',
      surfaceKindAttribute,
      surfaceIDAttribute,
      surfaceSlotAttribute,
    ],
  );
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

function applyManagedAttributes(
  element: HTMLElement,
  attributes: EditorDOMAttributes,
  managed: readonly string[],
): void {
  for (const name of managed) {
    const value = attributes[name];
    if (value === undefined) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }
}
