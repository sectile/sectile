import type {
  EditorSelection,
  EditorSession,
  EditorSessionSnapshot,
} from '@sectile/editor';
import {
  createEditorActionRegistry,
  defineEditorAction,
  defineEditorQuery,
} from '@sectile/editor/action';
import {
  compileAuthoringRegistry,
  type ComponentAuthoringDefinition,
} from '@sectile/editor/authoring';
import {
  createCollapsedSelection,
} from '@sectile/editor/selection';
import { createEditorSession } from '@sectile/editor/session';
import {
  baseRef,
  compileContentSchema,
} from '@sectile/content/schema';
import type { PortableContentDocument } from '@sectile/content';

const compiled = compileContentSchema({
  id: 'types/editor',
  version: 1,
  blockContent: {
    kind: 'block',
    allowed: [baseRef('paragraph')],
  },
  inlineContent: {
    kind: 'inline',
    allowed: [baseRef('text')],
  },
} as const);
if (!compiled.ok) throw new Error(compiled.error.message);

const append = defineEditorAction({
  id: 'types/append',
  historyIntent: 'typing',
  run(context, args: { readonly id: string; readonly text: string }) {
    context.apply({
      type: 'replace-inline',
      surface: { type: 'node', id: args.id },
      from: 0,
      to: 0,
      replacement: [{
        type: 'text',
        text: args.text,
        marks: [],
      }],
    });
    return {
      ok: true,
      value: args.text.length,
    } as const;
  },
});

const revision = defineEditorQuery({
  id: 'types/revision',
  read(view, _args: undefined) {
    return {
      ok: true,
      value: view.revision,
    } as const;
  },
});

const registry = createEditorActionRegistry({
  actions: [append],
  queries: [revision],
});
if (!registry.ok) throw new Error(registry.error.message);

declare const document: PortableContentDocument;
const sessionResult = createEditorSession({
  document,
  schema: compiled.value,
  actions: registry.value,
  selection: createCollapsedSelection({
    type: 'structural',
    container: { type: 'root' },
    index: 0,
    affinity: 'after',
  }),
});
if (!sessionResult.ok) throw new Error(sessionResult.error.message);
const session: EditorSession = sessionResult.value;

const result = session.runAction(append, {
  id: 'p1',
  text: 'x',
});
if (!result.ok) throw new Error(result.error.message);
result.value.value satisfies number;
result.value.update.snapshot satisfies EditorSessionSnapshot;

const query = session.runQuery(revision, undefined);
if (!query.ok) throw new Error(query.error.message);
query.value satisfies number;

const selection: EditorSelection | null = session.getSnapshot().selection;
void selection;

const definitions: readonly ComponentAuthoringDefinition[] = [];
const authoring = compileAuthoringRegistry(compiled.value, definitions);
if (!authoring.ok) throw new Error(authoring.error.message);
authoring.value.all();
