// EDT-01 EDT-02 EDT-03 EDT-07 EDT-08 EDT-09
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  baseRef,
  compileContentSchema,
} from '@sectile/content/schema';
import { createEditorSession } from '../.verification-dist/session.js';

function schema(id = 'editor/test') {
  const compiled = compileContentSchema({
    id,
    version: 1,
    blockContent: {
      kind: 'block',
      allowed: [baseRef('paragraph')],
    },
    rootContent: {
      kind: 'block',
      allowed: [baseRef('paragraph')],
    },
    inlineContent: {
      kind: 'inline',
      allowed: [baseRef('text'), baseRef('hard-break')],
    },
  });
  assert.equal(compiled.ok, true);
  return compiled.value;
}

function text(value) {
  return {
    type: 'text',
    text: value,
    marks: [],
  };
}

function paragraph(id, value) {
  return {
    id,
    type: 'paragraph',
    children: value.length === 0 ? [] : [text(value)],
  };
}

function documentFor(schemaID = 'editor/test') {
  return {
    formatVersion: 1,
    schema: {
      id: schemaID,
      version: 1,
    },
    root: {
      type: 'document',
      children: [
        paragraph('p1', 'hello'),
        paragraph('p2', 'world'),
      ],
    },
  };
}

function point(id, offset, affinity = 'after') {
  return {
    type: 'inline',
    surface: { type: 'node', id },
    offset,
    affinity,
  };
}

function collapsed(id, offset, affinity = 'after') {
  const logical = point(id, offset, affinity);
  return {
    anchor: logical,
    focus: logical,
    direction: 'forward',
  };
}

function session(options = {}) {
  const result = createEditorSession({
    document: documentFor(),
    schema: schema(),
    selection: collapsed('p1', 5),
    ...options,
  });
  assert.equal(result.ok, true);
  return result.value;
}

function paragraphText(editor, id) {
  const node = editor.getSnapshot().index.getNode(id);
  assert.equal(node?.type, 'paragraph');
  return node.children.map((child) =>
    child.type === 'text' ? child.text : ''
  ).join('');
}

test('session snapshots input and rejects stale revision/configuration work', () => {
  const source = documentFor();
  const created = createEditorSession({
    document: source,
    schema: schema(),
    selection: collapsed('p1', 5),
  });
  assert.equal(created.ok, true);
  const editor = created.value;

  source.root.children[0].children[0].text = 'mutated outside';
  assert.equal(paragraphText(editor, 'p1'), 'hello');

  const reconfigured = editor.reconfigure({
    interaction: { readOnly: false },
  });
  assert.equal(reconfigured.ok, true);
  assert.equal(reconfigured.value.snapshot.revision, 0);
  assert.equal(reconfigured.value.snapshot.configEpoch, 0);

  const changed = editor.reconfigure({
    profile: {
      id: 'profile/default',
      allows: () => true,
    },
  });
  assert.equal(changed.ok, true);
  assert.equal(changed.value.snapshot.revision, 1);
  assert.equal(changed.value.snapshot.configEpoch, 1);

  const staleRevision = editor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: '!',
    expectedRevision: 0,
  });
  assert.equal(staleRevision.ok, false);
  assert.equal(staleRevision.error.code, 'editor-stale-revision');

  const staleConfig = editor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: '!',
    expectedRevision: 1,
    expectedConfigEpoch: 0,
  });
  assert.equal(staleConfig.ok, false);
  assert.equal(staleConfig.error.code, 'editor-stale-config');
});

test('prepared text edits create bounded undo/redo history and restore selection', () => {
  const editor = session();

  const edited = editor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: '!',
    selection: collapsed('p1', 6),
  });
  assert.equal(edited.ok, true);
  assert.equal(paragraphText(editor, 'p1'), 'hello!');
  assert.equal(edited.value.snapshot.canUndo, true);

  const undone = editor.undo();
  assert.equal(undone.ok, true);
  assert.equal(paragraphText(editor, 'p1'), 'hello');
  assert.deepEqual(undone.value.snapshot.selection, collapsed('p1', 5));
  assert.equal(undone.value.snapshot.canRedo, true);

  const redone = editor.redo();
  assert.equal(redone.ok, true);
  assert.equal(paragraphText(editor, 'p1'), 'hello!');
  assert.deepEqual(redone.value.snapshot.selection, collapsed('p1', 6));
});

test('typing coalesces until an explicit selection change breaks the group', () => {
  const editor = session();

  assert.equal(editor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: 'a',
  }).ok, true);
  assert.equal(editor.replaceText({
    id: 'p1',
    from: 6,
    to: 6,
    text: 'b',
  }).ok, true);
  assert.equal(paragraphText(editor, 'p1'), 'helloab');

  const undoBoth = editor.undo();
  assert.equal(undoBoth.ok, true);
  assert.equal(paragraphText(editor, 'p1'), 'hello');

  assert.equal(editor.redo().ok, true);
  assert.equal(paragraphText(editor, 'p1'), 'helloab');

  assert.equal(editor.setSelection(collapsed('p1', 5)).ok, true);
  assert.equal(editor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: 'X',
  }).ok, true);
  assert.equal(paragraphText(editor, 'p1'), 'helloXab');

  const undoOne = editor.undo();
  assert.equal(undoOne.ok, true);
  assert.equal(paragraphText(editor, 'p1'), 'helloab');
});

test('compound semantic transactions are one history unit and no-op/session changes are not', () => {
  const editor = session();

  const noOp = editor.transact({
    operations: [],
  });
  assert.equal(noOp.ok, true);
  assert.equal(noOp.value.snapshot.canUndo, false);

  const selectionOnly = editor.setSelection(collapsed('p2', 5));
  assert.equal(selectionOnly.ok, true);
  assert.equal(selectionOnly.value.snapshot.canUndo, false);

  const compound = editor.transact({
    operations: [
      {
        type: 'replace-inline',
        surface: { type: 'node', id: 'p1' },
        from: 5,
        to: 5,
        replacement: [text('!')],
      },
      {
        type: 'replace-inline',
        surface: { type: 'node', id: 'p2' },
        from: 5,
        to: 5,
        replacement: [text('?')],
      },
    ],
    historyIntent: 'command',
  });
  assert.equal(compound.ok, true);
  assert.equal(paragraphText(editor, 'p1'), 'hello!');
  assert.equal(paragraphText(editor, 'p2'), 'world?');

  assert.equal(editor.undo().ok, true);
  assert.equal(paragraphText(editor, 'p1'), 'hello');
  assert.equal(paragraphText(editor, 'p2'), 'world');
  assert.equal(editor.getSnapshot().canUndo, false);
});

test('undo branches invalidate redo and agent transactions use the same history', () => {
  const editor = session();

  assert.equal(editor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: '!',
    origin: 'agent',
  }).ok, true);
  assert.equal(editor.undo({ origin: 'agent' }).ok, true);
  assert.equal(editor.getSnapshot().canRedo, true);

  assert.equal(editor.replaceText({
    id: 'p2',
    from: 5,
    to: 5,
    text: '?',
    origin: 'agent',
  }).ok, true);
  assert.equal(editor.getSnapshot().canRedo, false);
});

test('read-only/disabled state blocks authoring but external document replacement remains application authority', () => {
  const editor = session({
    interaction: { readOnly: true },
  });

  const blocked = editor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: '!',
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error.code, 'interaction-read-only');

  const replacement = documentFor();
  replacement.root.children[0].children[0].text = 'external';
  const replaced = editor.replaceDocument(replacement);
  assert.equal(replaced.ok, true);
  assert.equal(paragraphText(editor, 'p1'), 'external');

  const disabled = editor.reconfigure({
    interaction: { disabled: true },
  });
  assert.equal(disabled.ok, true);
  const selection = editor.setSelection(collapsed('p1', 1));
  assert.equal(selection.ok, false);
  assert.equal(selection.error.code, 'interaction-disabled');
});

test('profile and policy reject authoring mutations before publication', () => {
  const profileEditor = session({
    profile: {
      id: 'profile/no-mutate',
      allows: ({ intent }) => intent === 'undo',
    },
  });
  const profileRejected = profileEditor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: '!',
  });
  assert.equal(profileRejected.ok, false);
  assert.equal(profileRejected.error.code, 'editor-profile-rejected');
  assert.equal(paragraphText(profileEditor, 'p1'), 'hello');

  const policyEditor = session({
    policy: {
      id: 'policy/no-agent',
      allows: ({ origin }) => origin !== 'agent',
    },
  });
  const policyRejected = policyEditor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: '!',
    origin: 'agent',
  });
  assert.equal(policyRejected.ok, false);
  assert.equal(policyRejected.error.code, 'editor-policy-rejected');
});

test('observer failures do not roll back commits and reentrant observer mutation is rejected', () => {
  const editor = session();
  let reentrant;
  editor.subscribe(() => {
    reentrant = editor.replaceText({
      id: 'p2',
      from: 5,
      to: 5,
      text: '?',
    });
    throw new Error('observer failed');
  });

  const edited = editor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: '!',
  });
  assert.equal(edited.ok, true);
  assert.equal(paragraphText(editor, 'p1'), 'hello!');
  assert.equal(paragraphText(editor, 'p2'), 'world');
  assert.equal(edited.value.observerErrors.length, 1);
  assert.equal(reentrant.ok, false);
  assert.equal(
    reentrant.error.code,
    'editor-observer-reentrant-mutation',
  );
});

test('external replacement is a hard history/config boundary even for equal content', () => {
  const editor = session();
  assert.equal(editor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: '!',
  }).ok, true);
  assert.equal(editor.getSnapshot().canUndo, true);

  const before = editor.getSnapshot();
  const equalReplacement = structuredClone(before.document);
  const replaced = editor.replaceDocument(equalReplacement, {
    expectedRevision: before.revision,
    expectedConfigEpoch: before.configEpoch,
  });
  assert.equal(replaced.ok, true);
  assert.equal(replaced.value.documentChanged, false);
  assert.equal(replaced.value.snapshot.canUndo, false);
  assert.equal(
    replaced.value.snapshot.revision,
    before.revision + 1,
  );
  assert.equal(
    replaced.value.snapshot.configEpoch,
    before.configEpoch + 1,
  );

  const stale = editor.setSelection(null, {
    expectedRevision: before.revision,
  });
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, 'editor-stale-revision');
});

test('schema replacement clears history and advances the configuration epoch', () => {
  const editor = session();
  assert.equal(editor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: '!',
  }).ok, true);

  const nextSchema = schema('editor/next');
  const nextDocument = documentFor('editor/next');
  const before = editor.getSnapshot();
  const replaced = editor.replaceSchema(nextSchema, nextDocument);
  assert.equal(replaced.ok, true);
  assert.equal(replaced.value.snapshot.schema.id, 'editor/next');
  assert.equal(replaced.value.snapshot.canUndo, false);
  assert.equal(
    replaced.value.snapshot.configEpoch,
    before.configEpoch + 1,
  );
});

test('Editor fast path preserves configured Content resource ceilings', () => {
  const editor = session({
    contentLimits: {
      maxStringCodeUnits: 5,
    },
  });

  const result = editor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: '!',
  });
  assert.equal(result.ok, false);
  assert.equal(
    result.error.code,
    'content-string-code-unit-ceiling-exceeded',
  );
});

test('destroyed sessions reject mutation', () => {
  const editor = session();
  editor.destroy();

  const result = editor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: '!',
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'editor-destroyed');
});


test('noncontiguous typing edits do not coalesce without matching logical selection', () => {
  const editor = session();

  assert.equal(editor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: 'a',
  }).ok, true);
  assert.equal(editor.replaceText({
    id: 'p1',
    from: 0,
    to: 0,
    text: 'X',
  }).ok, true);
  assert.equal(paragraphText(editor, 'p1'), 'Xhelloa');

  const undoSecond = editor.undo();
  assert.equal(undoSecond.ok, true);
  assert.equal(paragraphText(editor, 'p1'), 'helloa');
  assert.equal(editor.getSnapshot().canUndo, true);

  const undoFirst = editor.undo();
  assert.equal(undoFirst.ok, true);
  assert.equal(paragraphText(editor, 'p1'), 'hello');
});

test('profile and policy callback faults reject without publishing raw exceptions', () => {
  const profileEditor = session({
    profile: {
      id: 'profile/fault',
      allows() {
        throw new Error('profile secret');
      },
    },
  });
  const profileFault = profileEditor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: '!',
  });
  assert.equal(profileFault.ok, false);
  assert.equal(profileFault.error.code, 'editor-profile-fault');
  assert.equal(profileFault.error.message.includes('secret'), false);
  assert.equal(profileEditor.getSnapshot().revision, 0);
  assert.equal(paragraphText(profileEditor, 'p1'), 'hello');

  const policyEditor = session({
    policy: {
      id: 'policy/fault',
      allows() {
        throw new Error('policy secret');
      },
    },
  });
  const policyFault = policyEditor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: '!',
  });
  assert.equal(policyFault.ok, false);
  assert.equal(policyFault.error.code, 'editor-policy-fault');
  assert.equal(policyFault.error.message.includes('secret'), false);
  assert.equal(policyEditor.getSnapshot().revision, 0);
  assert.equal(paragraphText(policyEditor, 'p1'), 'hello');
});


test('prepared text edits expose their equivalent Content operation to policy', () => {
  let observed = null;
  const editor = session({
    policy: {
      id: 'policy/observe-operation',
      allows(request) {
        observed = request;
        return true;
      },
    },
  });

  const result = editor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: '!',
  });
  assert.equal(result.ok, true);
  assert.notEqual(observed, null);
  assert.equal(observed.operations.length, 1);
  assert.deepEqual(observed.operations[0], {
    type: 'replace-inline',
    surface: { type: 'node', id: 'p1' },
    from: 5,
    to: 5,
    replacement: [{
      type: 'text',
      text: '!',
      marks: [],
    }],
  });
});


test('asynchronous profile and policy guards reject synchronous Editor transactions', () => {
  const profileEditor = session({
    profile: {
      id: 'profile/async',
      allows: async () => true,
    },
  });
  const profileResult = profileEditor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: '!',
  });
  assert.equal(profileResult.ok, false);
  assert.equal(profileResult.error.code, 'editor-profile-async');
  assert.equal(profileEditor.getSnapshot().revision, 0);

  const policyEditor = session({
    policy: {
      id: 'policy/async',
      allows: async () => true,
    },
  });
  const policyResult = policyEditor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: '!',
  });
  assert.equal(policyResult.ok, false);
  assert.equal(policyResult.error.code, 'editor-policy-async');
  assert.equal(policyEditor.getSnapshot().revision, 0);
});


test('prepared text no-op preserves revision history and document identity', () => {
  const editor = session();
  const before = editor.getSnapshot();

  const result = editor.replaceText({
    id: 'p1',
    from: 1,
    to: 4,
    text: 'ell',
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.documentChanged, false);
  assert.equal(result.value.selectionChanged, false);

  const after = editor.getSnapshot();
  assert.equal(after.revision, before.revision);
  assert.equal(after.document, before.document);
  assert.equal(after.canUndo, false);
  assert.equal(after.canRedo, false);
});
