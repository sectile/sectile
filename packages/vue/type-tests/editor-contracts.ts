import { h } from 'vue';
import type { InlineSurface } from '@sectile/content/position';
import type {
  AuthoringMount,
  CompiledAuthoringRegistry,
} from '@sectile/editor/authoring';
import type { EditorSession } from '@sectile/editor/session';
import {
  EditorAuthoringMount,
  EditorHardBreak,
  EditorInlineAtom,
  EditorInlineSurface,
  EditorIsolatedFrame,
  EditorRoot,
  type EditorAuthoringMountProps,
  type EditorInlineAtomProps,
  type EditorInlineSurfaceProps,
  type EditorIsolatedFrameProps,
  type EditorRootErrorHandler,
  type EditorRootExpose,
  type EditorRootProps,
  type EditorRootSlotProps,
} from '@sectile/vue/editor';

declare const editor: EditorSession;
declare const authoring: CompiledAuthoringRegistry;
declare const surface: InlineSurface;
declare const mount: AuthoringMount;
declare const exposed: EditorRootExpose;
declare const onError: EditorRootErrorHandler;
declare const slot: EditorRootSlotProps;

const root: EditorRootProps = {
  editor,
  authoring,
  spellcheck: false,
  as: 'section',
};
const inlineSurface: EditorInlineSurfaceProps = {
  surface,
  as: 'p',
};
const inlineAtom: EditorInlineAtomProps = {
  id: 'badge-1',
  as: 'span',
};
const isolatedFrame: EditorIsolatedFrameProps = {
  frame: 'card-1:title',
};
const authoringMount: EditorAuthoringMountProps = {
  ownerID: 'card-1',
  mount,
};

void h(EditorRoot, { ...root, onError });
void h(EditorInlineSurface, inlineSurface);
void h(EditorInlineAtom, inlineAtom);
void h(EditorHardBreak);
void h(EditorIsolatedFrame, isolatedFrame);
void h(EditorAuthoringMount, authoringMount);
slot.snapshot.revision satisfies number;
slot.authoringSurfaces satisfies readonly unknown[];
exposed.element satisfies HTMLElement | null;
exposed.getConnection();
exposed.refresh();
