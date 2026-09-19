// EDT-05
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  baseRef,
  compileContentSchema,
} from '@sectile/content/schema';
import {
  createEditorActionRegistry,
  defineEditorAction,
  defineEditorQuery,
} from '../.verification-dist/action.js';
import { createEditorSession } from '../.verification-dist/session.js';

function schema() {
  const compiled = compileContentSchema({
    id: 'editor/action',
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
      allowed: [baseRef('text')],
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

function document() {
  return {
    formatVersion: 1,
    schema: { id: 'editor/action', version: 1 },
    root: {
      type: 'document',
      children: [
        { id: 'p1', type: 'paragraph', children: [text('hello')] },
        { id: 'p2', type: 'paragraph', children: [text('world')] },
      ],
    },
  };
}

function paragraphText(editor, id) {
  const node = editor.getSnapshot().index.getNode(id);
  assert.equal(node?.type, 'paragraph');
  return node.children.map((child) =>
    child.type === 'text' ? child.text : ''
  ).join('');
}

function sessionWith(actions, options = {}) {
  const registry = createEditorActionRegistry(actions);
  assert.equal(registry.ok, true);
  const created = createEditorSession({
    document: document(),
    schema: schema(),
    actions: registry.value,
    ...options,
  });
  assert.equal(created.ok, true);
  return created.value;
}

test('one action commits multiple operations as one history unit', () => {
  const appendBoth = defineEditorAction({
    id: 'test/append-both',
    historyIntent: 'command',
    run(context, suffix) {
      context.apply(
        {
          type: 'replace-inline',
          surface: { type: 'node', id: 'p1' },
          from: 5,
          to: 5,
          replacement: [text(suffix)],
        },
        {
          type: 'replace-inline',
          surface: { type: 'node', id: 'p2' },
          from: 5,
          to: 5,
          replacement: [text(suffix)],
        },
      );
      return { ok: true, value: context.view.revision };
    },
  });

  const editor = sessionWith({ actions: [appendBoth] });
  const result = editor.runAction(appendBoth, '!');
  assert.equal(result.ok, true);
  assert.equal(result.value.value, 0);
  assert.equal(paragraphText(editor, 'p1'), 'hello!');
  assert.equal(paragraphText(editor, 'p2'), 'world!');
  assert.equal(result.value.update.snapshot.revision, 1);

  assert.equal(editor.undo().ok, true);
  assert.equal(paragraphText(editor, 'p1'), 'hello');
  assert.equal(paragraphText(editor, 'p2'), 'world');
  assert.equal(editor.getSnapshot().canUndo, false);
});

test('transaction-scoped ID allocation supports structural actions and rejects duplicates', () => {
  const split = defineEditorAction({
    id: 'test/split',
    historyIntent: 'structure',
    run(context, offset) {
      const id = context.allocateNodeID();
      if (!id.ok) return id;
      context.apply({
        type: 'split-paragraph',
        id: 'p1',
        offset,
        newID: id.value,
      });
      return { ok: true, value: id.value };
    },
  });

  const editor = sessionWith(
    { actions: [split] },
    { allocateNodeID: () => 'p-new' },
  );
  const result = editor.runAction(split, 2);
  assert.equal(result.ok, true);
  assert.equal(result.value.value, 'p-new');
  assert.equal(paragraphText(editor, 'p1'), 'he');
  assert.equal(paragraphText(editor, 'p-new'), 'llo');

  const duplicate = sessionWith(
    { actions: [split] },
    { allocateNodeID: () => 'p1' },
  );
  const rejected = duplicate.runAction(split, 2);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'editor-id-duplicate');
  assert.equal(paragraphText(duplicate, 'p1'), 'hello');

  const missing = sessionWith({ actions: [split] });
  const unavailable = missing.runAction(split, 2);
  assert.equal(unavailable.ok, false);
  assert.equal(unavailable.error.code, 'editor-id-allocator-missing');
});

test('unregistered and asynchronous action definitions cannot publish', async () => {
  const registered = defineEditorAction({
    id: 'test/registered',
    run() {
      return { ok: true, value: 'ok' };
    },
  });
  const editor = sessionWith({ actions: [registered] });

  const impostor = defineEditorAction({
    id: 'test/registered',
    run() {
      return { ok: true, value: 'impostor' };
    },
  });
  const unknown = editor.runAction(impostor, undefined);
  assert.equal(unknown.ok, false);
  assert.equal(unknown.error.code, 'editor-action-unknown');

  const asynchronous = {
    id: 'test/async',
    run: async () => ({ ok: true, value: 'later' }),
  };
  const asyncEditor = sessionWith({ actions: [asynchronous] });
  const asyncResult = asyncEditor.runAction(asynchronous, undefined);
  assert.equal(asyncResult.ok, false);
  assert.equal(asyncResult.error.code, 'editor-action-async');
  assert.equal(asyncEditor.getSnapshot().revision, 0);

  await asynchronous.run();
});

test('actions cannot reenter session mutation while their transaction is open', () => {
  let editor;
  let nested;

  const reentrant = defineEditorAction({
    id: 'test/reentrant',
    run() {
      nested = editor.replaceText({
        id: 'p1',
        from: 5,
        to: 5,
        text: '!',
      });
      return { ok: true, value: true };
    },
  });

  editor = sessionWith({ actions: [reentrant] });
  const result = editor.runAction(reentrant, undefined);
  assert.equal(result.ok, true);
  assert.equal(nested.ok, false);
  assert.equal(
    nested.error.code,
    'editor-observer-reentrant-mutation',
  );
  assert.equal(editor.getSnapshot().revision, 0);
  assert.equal(paragraphText(editor, 'p1'), 'hello');
});

test('queries share the registered session view and obey stale expected state', () => {
  const canUndo = defineEditorQuery({
    id: 'test/can-undo',
    read(view) {
      return {
        ok: true,
        value: {
          canUndo: view.canUndo,
          revision: view.revision,
          configEpoch: view.configEpoch,
        },
      };
    },
  });
  const editor = sessionWith({ queries: [canUndo] });

  const before = editor.runQuery(canUndo, undefined);
  assert.deepEqual(before, {
    ok: true,
    value: {
      canUndo: false,
      revision: 0,
      configEpoch: 0,
    },
  });

  assert.equal(editor.replaceText({
    id: 'p1',
    from: 5,
    to: 5,
    text: '!',
  }).ok, true);

  const after = editor.runQuery(canUndo, undefined, {
    expectedRevision: 1,
  });
  assert.equal(after.ok, true);
  assert.equal(after.value.canUndo, true);

  const stale = editor.runQuery(canUndo, undefined, {
    expectedRevision: 0,
  });
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, 'editor-stale-revision');
});

test('duplicate/invalid action and query definitions fail at registry construction', () => {
  const action = defineEditorAction({
    id: 'test/action',
    run() {
      return { ok: true, value: true };
    },
  });
  const query = defineEditorQuery({
    id: 'test/query',
    read() {
      return { ok: true, value: true };
    },
  });

  const duplicateAction = createEditorActionRegistry({
    actions: [action, action],
  });
  assert.equal(duplicateAction.ok, false);
  assert.equal(duplicateAction.error.code, 'editor-action-duplicate');

  const duplicateQuery = createEditorActionRegistry({
    queries: [query, query],
  });
  assert.equal(duplicateQuery.ok, false);
  assert.equal(duplicateQuery.error.code, 'editor-query-duplicate');

  const invalid = createEditorActionRegistry({
    actions: [{
      id: 'Bad Action',
      run() {
        return { ok: true, value: true };
      },
    }],
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.code, 'editor-definition-id-invalid');
});


test('action/query callback faults are isolated and asynchronous queries reject', () => {
  const throwingAction = defineEditorAction({
    id: 'test/throwing-action',
    run() {
      throw new Error('secret action failure');
    },
  });
  const throwingQuery = defineEditorQuery({
    id: 'test/throwing-query',
    read() {
      throw new Error('secret query failure');
    },
  });
  const asyncQuery = {
    id: 'test/async-query',
    read: async () => ({ ok: true, value: 'later' }),
  };

  const editor = sessionWith({
    actions: [throwingAction],
    queries: [throwingQuery, asyncQuery],
  });

  const actionResult = editor.runAction(throwingAction, undefined);
  assert.equal(actionResult.ok, false);
  assert.equal(actionResult.error.code, 'editor-action-fault');
  assert.equal(actionResult.error.message.includes('secret'), false);
  assert.equal(editor.getSnapshot().revision, 0);

  const queryResult = editor.runQuery(throwingQuery, undefined);
  assert.equal(queryResult.ok, false);
  assert.equal(queryResult.error.code, 'editor-query-fault');
  assert.equal(queryResult.error.message.includes('secret'), false);

  const asyncResult = editor.runQuery(asyncQuery, undefined);
  assert.equal(asyncResult.ok, false);
  assert.equal(asyncResult.error.code, 'editor-query-async');
  assert.equal(editor.getSnapshot().revision, 0);
});

test('action context enforces the Content transform operation ceiling before publication', () => {
  const overflow = defineEditorAction({
    id: 'test/overflow',
    run(context) {
      context.apply(
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
      );
      return { ok: true, value: true };
    },
  });

  const editor = sessionWith(
    { actions: [overflow] },
    { contentLimits: { maxOperationsPerTransform: 1 } },
  );
  const result = editor.runAction(overflow, undefined);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'content-operation-ceiling-exceeded');
  assert.equal(editor.getSnapshot().revision, 0);
  assert.equal(paragraphText(editor, 'p1'), 'hello');
  assert.equal(paragraphText(editor, 'p2'), 'world');
  assert.equal(editor.getSnapshot().canUndo, false);
});


test('action/query registry freezes definitions and session views expose Content limits', () => {
  const mutableAction = {
    id: 'test/mutable-action',
    run() {
      return { ok: true, value: true };
    },
  };
  const limitsQuery = {
    id: 'test/content-limits',
    read(view) {
      return {
        ok: true,
        value: view.contentLimits.maxOperationsPerTransform,
      };
    },
  };

  const registry = createEditorActionRegistry({
    actions: [mutableAction],
    queries: [limitsQuery],
  });
  assert.equal(registry.ok, true);
  assert.equal(Object.isFrozen(mutableAction), true);
  assert.equal(Object.isFrozen(limitsQuery), true);

  const editor = createEditorSession({
    document: document(),
    schema: schema(),
    actions: registry.value,
    contentLimits: { maxOperationsPerTransform: 7 },
  });
  assert.equal(editor.ok, true);

  const queried = editor.value.runQuery(limitsQuery, undefined);
  assert.deepEqual(queried, { ok: true, value: 7 });
  assert.equal(editor.value.getSnapshot().contentLimits.maxOperationsPerTransform, 7);
});


test('node ID allocators reject non-string stable IDs before building operations', () => {
  const allocate = defineEditorAction({
    id: 'test/allocate-non-string',
    run(context) {
      return context.allocateNodeID();
    },
  });

  const editor = sessionWith(
    { actions: [allocate] },
    { allocateNodeID: () => 123 },
  );
  const result = editor.runAction(allocate, undefined);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'editor-id-invalid');
  assert.equal(editor.getSnapshot().revision, 0);
});
