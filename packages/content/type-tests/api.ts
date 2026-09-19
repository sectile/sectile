import type {
  PortableContentDocument,
  PortableContentFragment,
  TextMark,
} from '@sectile/content';
import {
  baseRef,
  compileContentSchema,
  componentRef,
  type CompiledContentSchema,
} from '@sectile/content/schema';
import {
  allowedChildren,
  createDocumentIndex,
  type DocumentIndex,
} from '@sectile/content/query';
import {
  applyTextMark,
  transformDocument,
  type ContentOperation,
} from '@sectile/content/transform';
import {
  prepareContent,
  type PreparedContentState,
} from '@sectile/content/prepared';
import { validateDocument } from '@sectile/content/validate';

const descriptor = {
  id: 'example/article',
  version: 1,
  blockContent: {
    kind: 'block',
    allowed: [baseRef('paragraph'), componentRef('example/callout')],
  },
  inlineContent: {
    kind: 'inline',
    allowed: [baseRef('text'), baseRef('hard-break')],
  },
  components: [{
    id: 'example/callout',
    kind: 'block',
    componentVersion: 1,
    data: {
      type: 'object',
      properties: {},
    },
    slots: [{
      name: 'body',
      kind: 'block',
      allowed: [baseRef('paragraph')],
    }],
  }],
} as const;

const compiled = compileContentSchema(descriptor);
if (!compiled.ok) throw new Error(compiled.error.message);
compiled.value satisfies CompiledContentSchema;

declare const documentValue: PortableContentDocument;
const validated = validateDocument(documentValue, compiled.value);
if (!validated.ok) throw new Error(validated.error.message);

const index = createDocumentIndex(validated.value);
if (!index.ok) throw new Error(index.error.message);
index.value satisfies DocumentIndex;

allowedChildren(validated.value, {
  schema: compiled.value,
  target: { type: 'root' },
});

const operation: ContentOperation = {
  type: 'remove-block',
  id: 'node-1',
};
transformDocument(validated.value, {
  schema: compiled.value,
  operations: [operation],
});

const prepared = prepareContent(validated.value, compiled.value);
if (!prepared.ok) throw new Error(prepared.error.message);
prepared.value satisfies PreparedContentState;

declare const fragment: PortableContentFragment;
void fragment;
declare const mark: TextMark;
const marked = applyTextMark([], mark, true);
marked satisfies readonly TextMark[];
void mark;
