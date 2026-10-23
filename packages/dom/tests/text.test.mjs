import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { unwrap } from '@sectile/core/result';
import { createTextEditingState } from '@sectile/core/text';
import { DOMTextElementBinding, deriveNativeReplacement } from '../.verification-dist/text/element-binding.js';
import { createText, createTextController, createTextState, toTextEvent, writeClipboardText, observeTextInk } from '../.verification-dist/text.js';

test('text ink measures changed labels, freezes native editing and releases font/blur callbacks', () => {
  const window = new Window(), document = window.document, element = document.createElement('input');
  element.style.font = '14px Arial'; document.body.append(element);
  const fonts = new window.EventTarget(); Object.defineProperty(document, 'fonts', { value: fonts });
  let fontListeners = 0, blurListeners = 0;
  for (const [owner, type, count] of [[fonts, 'loadingdone', delta => { fontListeners += delta; }],
    [element, 'blur', delta => { blurListeners += delta; }]]) {
    for (const [method, delta] of [['addEventListener', 1], ['removeEventListener', -1]]) {
      const original = owner[method].bind(owner);
      owner[method] = (name, listener, options) => { if (name === type) count(delta); return original(name, listener, options); };
    }
  }
  const original = document.createElement.bind(document), samples = [], results = [];
  let canvases = 0, value = 'Ada';
  document.createElement = (...args) => {
    const node = original(...args);
    if (args[0] === 'canvas') { canvases++; node.getContext = () => ({ measureText(text) {
      samples.push(text); return { actualBoundingBoxAscent: 10, actualBoundingBoxDescent: text === 'Ada' ? 0 : 3,
        fontBoundingBoxAscent: 12, fontBoundingBoxDescent: 4 };
    } }); }
    return node;
  };
  const connection = observeTextInk({ element, text: () => value, freezeWhileEditing: true, onChange: metrics => results.push(metrics) });
  assert.deepEqual(results[0], { ascent: 10, descent: 0, fontAscent: 12, fontDescent: 4 });
  connection.refresh(); assert.deepEqual(samples, ['Ada']);
  element.focus(); value = 'body'; connection.refresh();
  element.dispatchEvent(new window.Event('input')); assert.deepEqual(samples, ['Ada']);
  element.blur(); assert.deepEqual(samples, ['Ada', 'body']); assert.equal(results.at(-1).descent, 3);
  value = 'x'.repeat(10000); connection.refresh(); assert.equal(samples.at(-1), 'Hg');
  fonts.dispatchEvent(new window.Event('loadingdone')); assert.equal(samples.length, 4);
  assert.equal(canvases, 1);
  assert.deepEqual([fontListeners, blurListeners], [1, 1]);
  connection.disconnect(); connection.disconnect(); const count = results.length;
  assert.deepEqual([fontListeners, blurListeners], [0, 0]);
  value = 'new'; element.dispatchEvent(new window.Event('blur')); fonts.dispatchEvent(new window.Event('loadingdone')); connection.refresh();
  assert.equal(results.length, count); assert.equal(samples.length, 4);
  window.happyDOM.abort();
});

test('multiline ink uses the first ascent and last descent rather than measuring a flattened paragraph', () => {
  const window = new Window(), document = window.document, element = document.createElement('textarea');
  element.style.font = '14px Arial'; document.body.append(element);
  const original = document.createElement.bind(document), samples = [], results = [];
  document.createElement = (...args) => {
    const node = original(...args);
    if (args[0] === 'canvas') node.getContext = () => ({ measureText(text) {
      samples.push(text); return { actualBoundingBoxAscent: text === 'ABC' ? 12 : 8,
        actualBoundingBoxDescent: text === 'xyz' ? 3 : 0, fontBoundingBoxAscent: 13, fontBoundingBoxDescent: 4 };
    } });
    return node;
  };
  const connection = observeTextInk({ element, multiline: true, text: () => 'ABC\nxyz', onChange: metrics => results.push(metrics) });
  assert.deepEqual(samples, ['ABC', 'xyz']); assert.deepEqual(results[0], { ascent: 12, descent: 3, fontAscent: 13, fontDescent: 4 });
  connection.disconnect(); window.happyDOM.abort();
});

test('text ink propagates a caller failure once and releases initial subscriptions', () => {
  const window = new Window(), document = window.document, element = document.createElement('input');
  element.style.font = '14px Arial'; document.body.append(element);
  let listeners = 0, calls = 0;
  Object.defineProperty(document, 'fonts', { value: {
    addEventListener() { listeners++; }, removeEventListener() { listeners--; },
  } });
  const original = document.createElement.bind(document), failure = new Error('Caller failed');
  document.createElement = (...args) => {
    const node = original(...args);
    if (args[0] === 'canvas') node.getContext = () => ({ measureText() {
      return { actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3, fontBoundingBoxAscent: 12, fontBoundingBoxDescent: 4 };
    } });
    return node;
  };
  assert.throws(() => observeTextInk({ element, text: () => 'Ada', onChange() { calls++; throw failure; } }), error => error === failure);
  assert.equal(calls, 1); assert.equal(listeners, 0);
  window.happyDOM.abort();
});

function clipboardHost(writeText) {
  const document = { nodeType: 9 }, clipboard = { writeText };
  const view = { document, closed: false, isSecureContext: true, navigator: { clipboard } };
  document.defaultView = view;
  return { document, clipboard, view };
}

test('DOM clipboard invokes its own native writer immediately and waits for completion', async () => {
  let finish, called = false, value;
  const host = clipboardHost(function(text) {
    assert.equal(this, host.clipboard); called = true; value = text;
    return new Promise(resolve => { finish = resolve; });
  });
  const pending = writeClipboardText({ document: host.document, text: '배송\nAddress' });
  assert.equal(called, true); assert.equal(value, '배송\nAddress');
  let settled = false; pending.then(() => { settled = true; });
  await Promise.resolve(); assert.equal(settled, false);
  finish(); assert.deepEqual(await pending, { ok: true, value: undefined });
  assert.deepEqual(await writeClipboardText({ document: clipboardHost(text => { assert.equal(text, ''); return Promise.resolve(); }).document, text: '' }), { ok: true, value: undefined });
});

test('DOM clipboard reports native failure without exposing copied text or an original exception', async () => {
  for (const write of [() => Promise.reject(new Error('private clipboard text')), () => { throw new Error('private clipboard text'); }, () => undefined]) {
    const result = await writeClipboardText({ document: clipboardHost(write).document, text: 'private clipboard text' });
    assert.equal(result.ok, false); assert.equal(result.error.code, 'dom.clipboard-write-failed');
    assert.equal(result.error.class, 'resource-rejection'); assert.equal(JSON.stringify(result).includes('private clipboard text'), false);
  }
  const host = clipboardHost(() => Promise.resolve());
  Object.defineProperty(host.view.navigator, 'clipboard', { get() { throw new Error('Native access rejected'); } });
  assert.equal((await writeClipboardText({ document: host.document, text: 'Address' })).error.code, 'dom.clipboard-write-failed');
});

test('DOM clipboard rejects missing or inactive native capability before invoking a writer', async () => {
  let calls = 0; const writer = () => { calls++; return Promise.resolve(); };
  for (const change of [host => { host.document.defaultView = null; }, host => { host.view.closed = true; },
    host => { host.view.document = { nodeType: 9 }; }, host => { host.view.isSecureContext = false; },
    host => { host.view.navigator.clipboard = undefined; }, host => { host.clipboard.writeText = undefined; }]) {
    const host = clipboardHost(writer); change(host);
    const result = await writeClipboardText({ document: host.document, text: 'Address' });
    assert.equal(result.ok, false); assert.equal(result.error.code, 'dom.clipboard-unavailable');
  }
  for (const options of [undefined, null, {}, { document: { nodeType: 1 }, text: 'Address' }, { document: clipboardHost(writer).document, text: 1 }]) {
    assert.equal((await writeClipboardText(options)).error.code, 'dom.clipboard-invalid');
  }
  assert.equal(calls, 0);
});

test('DOM clipboard concurrent requests keep independent native outcomes', async () => {
  const requests = [], host = clipboardHost(text => new Promise((resolve, reject) => requests.push({ text, resolve, reject })));
  const first = writeClipboardText({ document: host.document, text: 'First' });
  const second = writeClipboardText({ document: host.document, text: 'Second' });
  requests[1].resolve(); assert.equal((await second).ok, true);
  requests[0].reject(new Error('Denied')); assert.equal((await first).error.code, 'dom.clipboard-write-failed');
  assert.deepEqual(requests.map(request => request.text), ['First', 'Second']);
});

function pendingClipboardWrite(promise) {
  const host = clipboardHost(() => promise);
  return { document: new WeakRef(host.document), writing: writeClipboardText({ document: host.document, text: 'Address' }) };
}

test('DOM clipboard pending settlement does not retain the borrowed caller document graph', { skip: typeof global.gc !== 'function' }, async () => {
  const native = Promise.withResolvers(), held = pendingClipboardWrite(native.promise);
  for (let i = 0; i < 20; i++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
  assert.equal(held.document.deref(), undefined);
  native.resolve(); assert.equal((await held.writing).ok, true);
});

test('DOM text creates a caret-preserving state from a plain string', () => {
  const state = createTextState('한글');
  assert.equal(state.snapshot.text, '한글');
  assert.equal(state.snapshot.selection.anchorCodeUnitOffset, 2);
  assert.equal(state.snapshot.selection.focusCodeUnitOffset, 2);
});

test('explicit DOM replacements reject native normalization before mutation or proposal and preserve multiline LF', () => {
  const window = new Window();
  try {
    for (const kind of ['text', 'search', 'tel', 'url', 'password', 'textarea']) {
      const element = window.document.createElement(kind === 'textarea' ? 'textarea' : 'input');
      if (kind !== 'textarea') element.type = kind;
      const proposals = [], connection = createText({ element, defaultValue: createTextState('@Ad'), onValueChange: value => proposals.push(value.value.snapshot.text) });
      try {
        const before = connection.getSnapshot();
        for (const text of kind === 'textarea' ? ['@Ada\r', '@Ada\r\n'] : ['@Ada\n', '@Ada\r', '@Ada\r\n']) {
          assert.equal(connection.handleEvent({ type: 'input', inputType: 'insertReplacementText', text,
            startCodeUnitOffset: 0, endCodeUnitOffset: 3, selection: selection(text.length) }), false);
          assert.equal(connection.getSnapshot(), before); assert.equal(element.value, '@Ad'); assert.deepEqual(proposals, []);
        }
        const text = kind === 'textarea' ? '@Ada\n' : '@Ada';
        assert.equal(connection.handleEvent({ type: 'input', inputType: 'insertReplacementText', text,
          startCodeUnitOffset: 0, endCodeUnitOffset: 3, selection: selection(text.length) }), true);
        assert.equal(connection.getValue(), text); assert.equal(element.value, text); assert.deepEqual(proposals, [text]);
      } finally { connection.disconnect(); }
    }
  } finally { window.close(); }
});

test('explicit URL replacements admit exact interior spaces but reject resulting edge whitespace without constructing another value', () => {
  const window = new Window(), element = window.document.createElement('input'); element.type = 'url';
  const proposals = [], connection = createText({ element, defaultValue: createTextState('a b'), onValueChange: value => proposals.push(value.value.snapshot.text) });
  try {
    const before = connection.getSnapshot();
    for (const [start, end, text] of [[0, 0, ' '], [3, 3, '\t'], [3, 3, '\f'], [0, 1, ''], [2, 3, '']]) {
      assert.equal(connection.handleEvent({ type: 'input', inputType: 'insertReplacementText', text,
        startCodeUnitOffset: start, endCodeUnitOffset: end, selection: selection(start + text.length) }), false);
      assert.equal(connection.getSnapshot(), before); assert.equal(element.value, 'a b'); assert.deepEqual(proposals, []);
    }
    assert.equal(connection.handleEvent({ type: 'input', inputType: 'insertReplacementText', text: ' c ',
      startCodeUnitOffset: 1, endCodeUnitOffset: 2, selection: selection(4) }), true);
    assert.equal(element.value, 'a c b'); assert.deepEqual(proposals, ['a c b']);
    assert.equal(connection.handleEvent({ type: 'input', inputType: 'insertReplacementText', text: '',
      startCodeUnitOffset: 0, endCodeUnitOffset: 5, selection: selection(0) }), true);
    assert.equal(element.value, '');
  } finally { connection.disconnect(); window.close(); }
});

test('DOM text facade separates semantic edits from native IME ownership', async () => {
  const element = new FakeTextElement();
  const transitions = [];
  const connection = createText({
    element,
    defaultValue: createTextEditingState('a', selection(1)),
    onTransition: ({ input }) => transitions.push(input.type),
  });
  assert.equal(element.value, 'a');
  assert.equal(connection.handleEvent({
    type: 'beforeinput',
    inputType: 'insertText',
    data: '한',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 1,
    selection: selection(2),
  }), true);
  assert.equal(connection.getValue(), 'a한');
  assert.equal(element.value, 'a한');
  assert.deepEqual(element.selection, [2, 2]);
  const selectionWritesBeforeComposition = element.selectionWrites;

  element.emit('compositionstart', { data: '' });
  element.value = 'a한ㄱ';
  element.selectionStart = 3;
  element.selectionEnd = 3;
  element.emit('input', { inputType: 'insertCompositionText' });
  element.value = 'a한글';
  element.selectionStart = 3;
  element.selectionEnd = 3;
  element.emit('input', { inputType: 'insertCompositionText' });
  element.emit('compositionend', { data: '글' });
  element.emit('input', { inputType: 'insertCompositionText' });
  await Promise.resolve();
  assert.equal(connection.getValue(), 'a한글');
  assert.equal(connection.getSnapshot().state.composition, null);
  assert.equal(element.selectionWrites, selectionWritesBeforeComposition);
  assert.deepEqual(transitions, [
    'beforeinput',
    'composition-start',
    'composition-update',
    'composition-update',
    'composition-commit',
  ]);
  connection.disconnect();
  assert.equal(element.listeners.get('input')?.size ?? 0, 0);
});

test('DOM text flushes a committed Hangul syllable before a same-task next composition', async () => {
  const element = new FakeTextElement();
  const transitions = [];
  const connection = createText({
    element,
    onTransition: ({ input }) => transitions.push(input.type),
  });

  element.emit('compositionstart', { data: '' });
  element.value = '한';
  element.selectionStart = 1;
  element.selectionEnd = 1;
  element.emit('input', { inputType: 'insertCompositionText' });
  element.emit('compositionend', { data: '한' });

  element.emit('compositionstart', { data: '' });

  assert.deepEqual(transitions, [
    'composition-start',
    'composition-update',
    'composition-commit',
    'composition-start',
  ]);
  assert.equal(connection.getValue(), '한');
  assert.notEqual(connection.getSnapshot().state.composition, null);

  await Promise.resolve();

  element.value = '한글';
  element.selectionStart = 2;
  element.selectionEnd = 2;
  element.emit('input', { inputType: 'insertCompositionText' });
  element.emit('compositionend', { data: '글' });
  await Promise.resolve();

  assert.equal(connection.getValue(), '한글');
  assert.equal(connection.getSnapshot().state.composition, null);
  connection.disconnect();
});

test('controlled DOM text uses live committed browser text as the next composition baseline', async () => {
  const element = new FakeTextElement();
  const changes = [];
  const connection = createText({
    element,
    value: createTextEditingState('', selection(0)),
    onValueChange: ({ value }) => changes.push(value),
  });

  element.emit('compositionstart', { data: '' });
  element.value = '한';
  element.selectionStart = 1;
  element.selectionEnd = 1;
  element.emit('input', { inputType: 'insertCompositionText' });
  element.emit('compositionend', { data: '한' });
  element.emit('compositionstart', { data: '' });

  assert.equal(changes.at(-1).snapshot.text, '한');
  assert.notEqual(changes.at(-1).composition, null);
  assert.equal(element.value, '한');

  element.value = '한글';
  element.selectionStart = 2;
  element.selectionEnd = 2;
  element.emit('input', { inputType: 'insertCompositionText' });
  element.emit('compositionend', { data: '글' });
  await Promise.resolve();

  assert.equal(changes.at(-1).snapshot.text, '한글');
  assert.equal(changes.at(-1).composition, null);
  assert.equal(element.value, '한글');
  assert.equal(connection.getValue(), '');
  connection.disconnect();
});

test('selectionless email input adopts autocomplete and native deletion results', () => {
  const initial = 'saved@example.com';
  const element = new FakeSelectionlessTextElement();
  const connection = createText({
    element,
    defaultValue: createTextEditingState(initial, selection(initial.length)),
  });

  element.value = 'other@example.com';
  element.emit('input', { inputType: 'insertReplacementText' });
  assert.equal(connection.getValue(), 'other@example.com');
  assert.equal(connection.getSnapshot().state.snapshot.selection.focusCodeUnitOffset, 17);

  element.value = 'other@example.co';
  element.emit('input', { inputType: 'deleteContentBackward' });
  assert.equal(connection.getValue(), 'other@example.co');
  assert.equal(connection.getSnapshot().state.snapshot.selection.focusCodeUnitOffset, 16);
  assert.equal(element.listeners.get('beforeinput')?.size ?? 0, 0);
});

test('DOM text adopts native word and line deletion results', () => {
  const initialText = 'one two\nthree four';
  const element = new FakeTextElement();
  const transitions = [];
  const connection = createText({
    element,
    defaultValue: createTextEditingState(initialText, selection(initialText.length)),
    onTransition: ({ input }) => transitions.push(input),
  });
  let prevented = false;
  element.emit('beforeinput', {
    inputType: 'deleteWordBackward',
    data: null,
    isComposing: false,
    cancelable: true,
    preventDefault() { prevented = true; },
  });
  assert.equal(prevented, false);

  element.value = 'one two\nthree ';
  element.selectionStart = 14;
  element.selectionEnd = 14;
  element.emit('input', { inputType: 'deleteWordBackward' });
  assert.equal(connection.getValue(), 'one two\nthree ');
  assert.deepEqual(connection.getSnapshot().state.snapshot.selection, {
    anchorCodeUnitOffset: 14,
    focusCodeUnitOffset: 14,
    startCodeUnitOffset: 14,
    endCodeUnitOffset: 14,
    direction: 'none',
  });

  element.value = 'one two\n';
  element.selectionStart = 8;
  element.selectionEnd = 8;
  element.emit('input', { inputType: 'deleteSoftLineBackward' });
  assert.equal(connection.getValue(), 'one two\n');
  assert.deepEqual(transitions.map((input) => [input.type, input.inputType]), [
    ['input', 'deleteWordBackward'],
    ['input', 'deleteSoftLineBackward'],
  ]);
});

test('DOM text adopts non-cancelable and Unicode-safe native replacements', () => {
  const element = new FakeTextElement();
  const connection = createText({
    element,
    defaultValue: createTextEditingState('A😀B', selection(3)),
  });
  let prevented = false;
  element.emit('beforeinput', {
    inputType: 'insertReplacementText',
    data: '😁',
    isComposing: false,
    cancelable: false,
    preventDefault() { prevented = true; },
  });
  assert.equal(prevented, false);

  element.value = 'A😁B';
  element.selectionStart = 3;
  element.selectionEnd = 3;
  element.emit('input', { inputType: 'insertReplacementText' });
  assert.equal(connection.getValue(), 'A😁B');
  assert.deepEqual(element.selection, [3, 3]);
});

test('ISSUE-142: malformed native UTF-16 terminates and restores canonical text', () => {
  const initial = 'safe';
  const malformedValues = [
    '\ud800',
    '\udc00',
    '\ud800x',
    'x\udc00',
    'a\ud800b',
    'a\udc00b',
  ];
  const element = new FakeTextElement();
  const connection = createText({
    element,
    defaultValue: createTextEditingState(initial, selection(initial.length)),
  });

  for (const malformed of malformedValues) {
    const replacement = deriveNativeReplacement(initial, malformed);
    assert.ok(replacement.inspectedCodeUnits <= initial.length + malformed.length + 2);
    assert.equal(
      initial.slice(0, replacement.startCodeUnitOffset)
        + replacement.text
        + initial.slice(replacement.endCodeUnitOffset),
      malformed,
    );

    element.value = malformed;
    element.selectionStart = malformed.length;
    element.selectionEnd = malformed.length;
    element.emit('input', { inputType: 'insertReplacementText' });
    assert.equal(connection.getValue(), initial);
    assert.equal(element.value, initial);
    assert.deepEqual(element.selection, [initial.length, initial.length]);
  }

  connection.disconnect();
});

test('ISSUE-141: DOM text renders directional selections without collapse', () => {
  for (const [name, anchor, focus, start, end, direction] of [
    ['forward', 1, 3, 1, 3, 'forward'],
    ['backward', 3, 1, 1, 3, 'backward'],
    ['collapsed', 2, 2, 2, 2, 'none'],
  ]) {
    const element = new FakeTextElement();
    const connection = createText({
      element,
      defaultValue: createTextEditingState('abcd', {
        anchorCodeUnitOffset: anchor,
        focusCodeUnitOffset: focus,
      }),
    });
    assert.deepEqual(
      [element.selectionStart, element.selectionEnd, element.selectionDirection],
      [start, end, direction],
      name,
    );
    connection.render();
    assert.deepEqual(
      [element.selectionStart, element.selectionEnd, element.selectionDirection],
      [start, end, direction],
      `${name} repeated render`,
    );
    connection.disconnect();
  }
});

test('ISSUE-141: native edit after backward render replaces the selected range', () => {
  const element = new FakeTextElement();
  const connection = createText({
    element,
    defaultValue: createTextEditingState('abcd', {
      anchorCodeUnitOffset: 3,
      focusCodeUnitOffset: 1,
    }),
  });
  assert.deepEqual([element.selectionStart, element.selectionEnd, element.selectionDirection], [1, 3, 'backward']);

  element.value = 'aXd';
  element.selectionStart = 2;
  element.selectionEnd = 2;
  element.selectionDirection = 'none';
  element.emit('input', { inputType: 'insertText' });
  assert.equal(connection.getValue(), 'aXd');
  assert.deepEqual([element.selectionStart, element.selectionEnd, element.selectionDirection], [2, 2, 'none']);
  connection.disconnect();
});

test('DOM text adopts the native search clear action and removes its listener', () => {
  const element = new FakeTextElement();
  const connection = createText({ element, defaultValue: createTextState('select') });

  element.value = '';
  element.selectionStart = 0;
  element.selectionEnd = 0;
  element.emit('search', {});

  assert.equal(connection.getValue(), '');
  assert.equal(element.value, '');
  connection.disconnect();
  assert.equal(element.listeners.get('search')?.size ?? 0, 0);
});

test('controlled DOM text leaves accepted native edits under browser ownership until synchronized', () => {
  const initial = createTextEditingState('alpha beta', selection(10));
  const element = new FakeTextElement();
  let proposed = null;
  const connection = createText({
    element,
    value: initial,
    onValueChange: ({ value }) => { proposed = value; },
  });
  const initialSelectionWrites = element.selectionWrites;

  element.value = 'alpha ';
  element.selectionStart = 6;
  element.selectionEnd = 6;
  element.emit('input', { inputType: 'deleteWordBackward' });
  assert.equal(proposed.snapshot.text, 'alpha ');
  assert.equal(connection.getValue(), 'alpha beta');
  assert.equal(element.value, 'alpha ');
  assert.equal(element.selectionWrites, initialSelectionWrites);

  connection.syncControlledValues({ value: proposed });
  assert.equal(connection.getValue(), 'alpha ');
  assert.equal(element.value, 'alpha ');
  assert.equal(element.selectionWrites, initialSelectionWrites);
});

test('controlled DOM text chains native insertions before owner synchronization', () => {
  const element = new FakeTextElement();
  const proposals = [];
  const connection = createText({
    element,
    value: createTextEditingState('', selection(0)),
    onValueChange: ({ value }) => { proposals.push(value); },
  });

  for (const [value, offset] of [['a', 1], ['ab', 2], ['abc', 3]]) {
    element.value = value;
    element.selectionStart = offset;
    element.selectionEnd = offset;
    element.emit('input', { inputType: 'insertText' });
    assert.equal(element.value, value);
    assert.equal(proposals.at(-1).snapshot.text, value);
  }

  assert.equal(connection.getValue(), '');
  const synchronized = connection.syncControlledValues({ value: proposals.at(-1) });
  assert.equal(synchronized.ok, true);
  assert.equal(connection.getValue(), 'abc');
  assert.equal(element.value, 'abc');
});

test('controlled DOM text publishes a native edit that returns to the accepted owner value', () => {
  const element = new FakeTextElement();
  const proposals = [];
  createText({
    element,
    value: createTextEditingState('', selection(0)),
    onValueChange: ({ value }) => { proposals.push(value.snapshot.text); },
  });

  for (const [value, inputType] of [
    ['a', 'insertText'],
    ['ab', 'insertText'],
    ['abc', 'insertText'],
    ['ab', 'deleteContentBackward'],
    ['a', 'deleteContentBackward'],
    ['', 'deleteContentBackward'],
  ]) {
    element.value = value;
    element.selectionStart = value.length;
    element.selectionEnd = value.length;
    element.emit('input', { inputType });
  }

  assert.deepEqual(proposals, ['a', 'ab', 'abc', 'ab', 'a', '']);
});

test('controlled DOM text chains native deletions before owner synchronization', () => {
  const element = new FakeTextElement();
  const proposals = [];
  const connection = createText({
    element,
    value: createTextEditingState('abc', selection(3)),
    onValueChange: ({ value }) => { proposals.push(value); },
  });

  for (const [value, offset] of [['ab', 2], ['a', 1], ['', 0]]) {
    element.value = value;
    element.selectionStart = offset;
    element.selectionEnd = offset;
    element.emit('input', { inputType: 'deleteContentBackward' });
    assert.equal(element.value, value);
    assert.equal(proposals.at(-1).snapshot.text, value);
  }

  assert.equal(connection.getValue(), 'abc');
  const synchronized = connection.syncControlledValues({ value: proposals.at(-1) });
  assert.equal(synchronized.ok, true);
  assert.equal(connection.getValue(), '');
  assert.equal(element.value, '');
});

test('same-task composition handoff stops if commit synchronously disconnects the binding', () => {
  const element = new FakeTextElement();
  const transitions = [];
  let connection;
  connection = createText({
    element,
    onTransition: ({ input }) => {
      transitions.push(input.type);
      if (input.type === 'composition-commit') connection.disconnect();
    },
  });

  element.emit('compositionstart', { data: '' });
  element.value = '한';
  element.selectionStart = 1;
  element.selectionEnd = 1;
  element.emit('input', { inputType: 'insertCompositionText' });
  element.emit('compositionend', { data: '한' });
  element.emit('compositionstart', { data: '' });

  assert.deepEqual(transitions, [
    'composition-start',
    'composition-update',
    'composition-commit',
  ]);
  assert.equal(element.listeners.get('compositionstart')?.size ?? 0, 0);
});

test('disconnect invalidates a pending IME commit and releases native listeners', async () => {
  const element = new FakeTextElement();
  const transitions = [];
  const connection = createText({
    element,
    onTransition: ({ input }) => transitions.push(input.type),
  });

  element.emit('compositionstart', { data: '' });
  element.value = '한';
  element.selectionStart = 1;
  element.selectionEnd = 1;
  element.emit('input', { inputType: 'insertCompositionText' });
  element.emit('compositionend', { data: '한' });
  connection.disconnect();
  await Promise.resolve();

  assert.deepEqual(transitions, ['composition-start', 'composition-update']);
  assert.equal(element.listeners.get('input')?.size ?? 0, 0);
  assert.equal(element.listeners.get('search')?.size ?? 0, 0);
  assert.equal(element.listeners.get('compositionstart')?.size ?? 0, 0);
  assert.equal(element.listeners.get('compositionend')?.size ?? 0, 0);
});

test('paused native text releases observation and resumes the last observed IME proposal through its controller', async () => {
  for (const controlled of [false, true]) for (const ended of [false, true]) {
    const element = new FakeTextElement();
    const transitions = [], proposals = [];
    const initial = createTextEditingState('', selection(0));
    const controller = unwrap(createTextController({
      ...(controlled ? { value: initial } : { defaultValue: initial }),
      onValueChange: ({ value }) => proposals.push(value),
    }));
    const binding = new DOMTextElementBinding({ element,
      getState: () => controller.getSnapshot().state,
      dispatch: input => { transitions.push(input.type); return controller.handleTextInput(input).ok; },
    });
    element.emit('compositionstart', {});
    element.value = '한'; element.selectionStart = 1; element.selectionEnd = 1;
    element.emit('input', { inputType: 'insertCompositionText' });
    if (ended) element.emit('compositionend', {});
    const beforePause = controller.getSnapshot();
    binding.suspend(); binding.suspend();
    for (const listeners of element.listeners.values()) assert.equal(listeners.size, 0);
    element.value = 'unobserved'; element.emit('input', { inputType: 'insertText' });
    binding.handleEvent({ type: 'compositionend' });
    await Promise.resolve();
    assert.equal(controller.getSnapshot(), beforePause);
    assert.deepEqual(transitions, ['composition-start', 'composition-update']);
    binding.resume(); binding.resume();
    assert.deepEqual(transitions, ['composition-start', 'composition-update', 'composition-commit']);
    assert.equal(proposals.at(-1).snapshot.text, '한');
    assert.equal(proposals.at(-1).composition, null);
    assert.equal(element.value, controlled ? '' : '한');
    assert.equal(binding.isComposing, false);
    for (let cycle = 0; cycle < 3; cycle++) { binding.suspend(); binding.resume(); }
    for (const listeners of element.listeners.values()) assert.equal(listeners.size, 1);
    binding.disconnect(); binding.resume();
    for (const listeners of element.listeners.values()) assert.equal(listeners.size, 0);
  }
});

test('failed interrupted composition resumption releases observation and can retry', () => {
  const element = new FakeTextElement();
  const controller = unwrap(createTextController());
  const failure = new Error('composition owner failed');
  let fail = true;
  const binding = new DOMTextElementBinding({ element,
    getState: () => controller.getSnapshot().state,
    dispatch: input => {
      if (input.type === 'composition-commit' && fail) throw failure;
      return controller.handleTextInput(input).ok;
    },
  });
  element.emit('compositionstart', {});
  element.value = '한'; element.selectionStart = 1; element.selectionEnd = 1;
  element.emit('input', { inputType: 'insertCompositionText' });
  binding.suspend();
  assert.throws(() => binding.resume(), error => error === failure);
  for (const listeners of element.listeners.values()) assert.equal(listeners.size, 0);
  fail = false;
  binding.resume();
  assert.equal(controller.getSnapshot().state.snapshot.text, '한');
  assert.equal(controller.getSnapshot().state.composition, null);
  binding.disconnect();
  for (const listeners of element.listeners.values()) assert.equal(listeners.size, 0);
});

test('native replacement reconciliation has linear bounded work and exact output', () => {
  const size = 100_000;
  const previous = `${'a'.repeat(size - 2)}😀`;
  const next = `${'a'.repeat(size - 2)}😁`;
  const replacement = deriveNativeReplacement(previous, next);
  const actual = previous.slice(0, replacement.startCodeUnitOffset)
    + replacement.text
    + previous.slice(replacement.endCodeUnitOffset);

  assert.equal(actual, next);
  assert.ok(replacement.inspectedCodeUnits <= previous.length + next.length + 2);
});

test('native text selection observes its own control and focused document without duplicate proposals', () => {
  const element = new FakeTextElement(), document = new FakeTextElement(), transitions = [];
  element.ownerDocument = document;
  const connection = createText({ element, defaultValue: createTextState('abcd'), readOnly: true,
    onTransition: ({ input }) => transitions.push(input.type) });
  assert.equal(document.listeners.get('selectionchange')?.size ?? 0, 0);
  document.activeElement = element; element.emit('focus');
  assert.equal(document.listeners.get('selectionchange').size, 1);
  element.setSelectionRange(1, 3, 'backward'); element.emit('select');
  assert.equal(connection.getSnapshot().state.snapshot.selection.direction, 'backward');
  const revision = connection.getSnapshot().revision;
  element.emit('selectionchange'); document.emit('selectionchange');
  assert.equal(connection.getSnapshot().revision, revision);
  element.setSelectionRange(2, 2); document.emit('selectionchange');
  assert.equal(connection.getSnapshot().state.snapshot.selection.focusCodeUnitOffset, 2);
  element.setSelectionRange(0, 0); document.emit('selectionchange', { target: new FakeTextElement() });
  assert.equal(connection.getSnapshot().state.snapshot.selection.focusCodeUnitOffset, 2);
  document.activeElement = null; document.emit('selectionchange');
  assert.equal(connection.getSnapshot().state.snapshot.selection.focusCodeUnitOffset, 2);
  element.emit('blur'); assert.equal(document.listeners.get('selectionchange').size, 0);
  assert.deepEqual(transitions, ['select', 'select']); connection.disconnect();
  assert.equal([...element.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0), 0);
});

test('native selection refuses unobserved text, invalid boundaries and disabled interaction', async () => {
  const element = new FakeTextElement(), connection = createText({ element, defaultValue: createTextState('a😀b') });
  element.value = 'unobserved'; element.setSelectionRange(1, 1); element.emit('select');
  assert.equal(connection.getSnapshot().state.snapshot.text, 'a😀b');
  assert.equal(connection.getSnapshot().state.snapshot.selection.focusCodeUnitOffset, 4);
  element.value = 'a😀b'; element.setSelectionRange(2, 2); element.emit('selectionchange');
  assert.deepEqual(element.selection, [4, 4]);
  element.emit('compositionstart'); element.value = 'a😀b한'; element.setSelectionRange(5, 5); element.emit('input');
  const active = connection.getSnapshot(); element.setSelectionRange(0, 0); element.emit('select');
  assert.equal(connection.getSnapshot(), active);
  element.setSelectionRange(5, 5); element.emit('compositionend'); await Promise.resolve();
  const committed = connection.getSnapshot(); element.emit('selectionchange');
  assert.equal(connection.getSnapshot(), committed); connection.disconnect();
  for (const options of [{ disabled: true }, {}]) {
    const input = options.disabled ? new FakeTextElement() : new FakeSelectionlessTextElement();
    const binding = createText({ element: input, defaultValue: createTextState('abc'), ...options });
    input.selectionStart = options.disabled ? 1 : null; input.selectionEnd = input.selectionStart; input.emit('select');
    assert.equal(binding.getSnapshot().state.snapshot.selection.focusCodeUnitOffset, 3); binding.disconnect();
  }
});

test('native selection owns one focus fallback and releases it across suspend and disconnect', () => {
  const element = new FakeTextElement(), document = new FakeTextElement(); element.ownerDocument = document;
  document.activeElement = element;
  const controller = unwrap(createTextController({ defaultValue: createTextState('abc') }));
  const binding = new DOMTextElementBinding({ element, observeSelection: true, getState: () => controller.getSnapshot().state,
    dispatch: input => controller.handleTextInput(input).ok });
  assert.equal(document.listeners.get('selectionchange').size, 1);
  const held = [...document.listeners.get('selectionchange')][0];
  binding.suspend(); assert.equal(document.listeners.get('selectionchange').size, 0);
  element.setSelectionRange(0, 0); held.handleEvent({ type: 'selectionchange', target: document });
  assert.equal(controller.getSnapshot().state.snapshot.selection.focusCodeUnitOffset, 3);
  binding.resume(); assert.equal(document.listeners.get('selectionchange').size, 1);
  assert.equal(element.selectionStart, 3);
  binding.disconnect(); binding.disconnect(); binding.resume();
  assert.equal(document.listeners.get('selectionchange').size, 0);
  assert.equal([...element.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0), 0);
});

test('native selection reads native text once only for a changed offset pair', () => {
  const element = new FakeTextElement(), text = 'a'.repeat(100_000);
  const connection = createText({ element, defaultValue: createTextState(text) });
  let reads = 0;
  Object.defineProperty(element, 'value', { configurable: true, get() { reads++; return text; } });
  element.setSelectionRange(99_999, 99_999); element.emit('selectionchange');
  assert.equal(reads, 1); assert.equal(connection.getSnapshot().state.snapshot.selection.focusCodeUnitOffset, 99_999);
  element.emit('select'); element.emit('selectionchange'); assert.equal(reads, 1); connection.disconnect();
});

function retiredSelectionBinding() {
  const element = new FakeTextElement(), document = new FakeTextElement(); element.ownerDocument = document; document.activeElement = element;
  const connection = createText({ element, defaultValue: createTextState('abc') }), root = new WeakRef(element);
  connection.disconnect(); document.activeElement = null;
  return { document, root };
}
test('focused selection fallback releases a disconnected control while its document stays held', { skip: typeof global.gc !== 'function' }, async () => {
  const held = retiredSelectionBinding();
  for (let turn = 0; turn < 20; turn++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
  assert.equal(held.root.deref(), undefined); assert.equal(held.document.listeners.get('selectionchange').size, 0);
});

test('DOM selection inputs preserve navigation and revision authority', () => {
  const initial = createTextEditingState('a😀b', selection(4));
  const input = { type: 'select', selection: { anchorCodeUnitOffset: 3, focusCodeUnitOffset: 1 } };
  assert.deepEqual(toTextEvent(input), input);
  const controller = unwrap(createTextController({ defaultValue: initial, readOnly: true }));
  const before = controller.getSnapshot(), selected = controller.handleTextInput(input, before.revision);
  assert.equal(selected.ok, true);
  assert.equal(selected.snapshot.state.snapshot.text, initial.snapshot.text);
  assert.equal(selected.snapshot.state.snapshot.selection.direction, 'backward');
  const stale = controller.handleTextInput({ type: 'select', selection: selection(0) }, before.revision);
  assert.equal(stale.ok, false); assert.equal(controller.getSnapshot(), selected.snapshot);
  const mutation = controller.handleTextInput({ type: 'input', inputType: 'insertText', text: 'x', startCodeUnitOffset: 1, endCodeUnitOffset: 3, selection: selection(2) });
  assert.equal(mutation.ok, false); assert.equal(mutation.error.code, 'interaction-read-only');
  const disabled = unwrap(createTextController({ defaultValue: initial, disabled: true }));
  const denied = disabled.handleTextInput(input);
  assert.equal(denied.ok, false); assert.equal(denied.error.code, 'interaction-disabled');
  assert.equal(disabled.getSnapshot().state, initial);
});

test('controlled DOM selection dispatch is a proposal until the owner accepts or refuses it', () => {
  const changes = [], initial = createTextEditingState('abc', selection(3));
  const controller = unwrap(createTextController({ value: initial, onValueChange: change => changes.push(change) }));
  const requested = { type: 'select', selection: { anchorCodeUnitOffset: 2, focusCodeUnitOffset: 1 } };
  assert.equal(controller.handleTextInput(requested).ok, true);
  assert.equal(controller.getSnapshot().state, initial);
  assert.equal(changes.length, 1); assert.equal(changes[0].value.snapshot.selection.direction, 'backward');
  unwrap(controller.syncControlledValues({ value: initial }));
  assert.equal(controller.getSnapshot().state, initial);
  assert.equal(controller.handleTextInput(requested).ok, true);
  assert.equal(changes.length, 2); assert.equal(changes[1].previousValue, initial);
  const accepted = unwrap(controller.syncControlledValues({ value: changes[1].value }));
  assert.equal(accepted.state, changes[1].value);
});

test('DOM selection proposals retain the pending IME session until explicit commit', () => {
  const changes = [], initial = createTextEditingState('ab', selection(2));
  const controller = unwrap(createTextController({ value: initial, onValueChange: change => changes.push(change) }));
  assert.equal(controller.handleTextInput({ type: 'composition-start', text: '한', startCodeUnitOffset: 1, endCodeUnitOffset: 2, selection: selection(2) }).ok, true);
  const active = changes.at(-1).value;
  assert.equal(controller.handleTextInput({ type: 'select', selection: { anchorCodeUnitOffset: 2, focusCodeUnitOffset: 1 } }).ok, true);
  const selected = changes.at(-1).value;
  assert.equal(selected.composition, active.composition); assert.equal(selected.snapshot.text, 'a한');
  assert.equal(selected.snapshot.selection.direction, 'backward'); assert.equal(controller.getSnapshot().state, initial);
  assert.equal(controller.handleTextInput({ type: 'composition-commit' }).ok, true);
  assert.equal(changes.at(-1).value.composition, null);
  assert.equal(changes.at(-1).value.snapshot, selected.snapshot);
});

test('DOM beforeinput and composition inputs map to semantic text events', () => {
  assert.deepEqual(toTextEvent({
    type: 'beforeinput',
    inputType: 'insertText',
    data: '😀',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 1,
    selection: selection(3),
  }), {
    type: 'replace',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 1,
    text: '😀',
    selection: selection(3),
  });
  assert.deepEqual(toTextEvent({
    type: 'beforeinput',
    inputType: 'deleteContentBackward',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 3,
    selection: selection(1),
  }), {
    type: 'replace',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 3,
    text: '',
    selection: selection(1),
  });
  assert.deepEqual(toTextEvent({
    type: 'input',
    inputType: 'deleteWordBackward',
    text: '',
    startCodeUnitOffset: 4,
    endCodeUnitOffset: 8,
    selection: selection(4),
  }), {
    type: 'replace',
    startCodeUnitOffset: 4,
    endCodeUnitOffset: 8,
    text: '',
    selection: selection(4),
  });
  assert.equal(toTextEvent({ type: 'beforeinput', inputType: 'historyUndo' }), null);
});

test('uncontrolled DOM text owns replacement and IME composition state', () => {
  const controller = unwrap(createTextController({
    defaultValue: createTextEditingState('ab', selection(2)),
  }));
  assert.equal(controller.handleTextInput({
    type: 'composition-start',
    text: 'ㅎ',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 2,
    selection: selection(2),
  }).ok, true);
  assert.equal(controller.getSnapshot().state.snapshot.text, 'aㅎ');
  assert.equal(controller.handleTextInput({
    type: 'composition-update',
    text: '한',
    selection: selection(2),
  }).ok, true);
  assert.equal(controller.getSnapshot().state.snapshot.text, 'a한');
  assert.equal(controller.handleTextInput({ type: 'composition-commit' }).ok, true);
  assert.equal(controller.getSnapshot().state.composition, null);
});

test('controlled DOM text emits a full-state proposal until synchronized', () => {
  const changes = [];
  const initial = createTextEditingState('a', selection(1));
  const controller = unwrap(createTextController({
    value: initial,
    onValueChange(change) {
      changes.push(change);
    },
  }));
  const result = controller.handleTextInput({
    type: 'beforeinput',
    inputType: 'insertText',
    data: '😀',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 1,
    selection: selection(3),
  });
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.state.snapshot.text, 'a');
  assert.equal(changes.length, 1);
  assert.equal(changes[0].value.snapshot.text, 'a😀');
  const synchronized = unwrap(controller.syncControlledValues({ value: changes[0].value }));
  assert.equal(synchronized.state.snapshot.text, 'a😀');
});

test('controlled DOM text carries one IME proposal across synchronous composition events', () => {
  const changes = [];
  const controller = unwrap(createTextController({
    value: createTextEditingState('', selection(0)),
    onValueChange: ({ value }) => changes.push(value),
  }));

  assert.equal(controller.handleTextInput({
    type: 'composition-start',
    text: '',
    startCodeUnitOffset: 0,
    endCodeUnitOffset: 0,
    selection: selection(0),
  }).ok, true);
  assert.equal(controller.handleTextInput({
    type: 'composition-update',
    text: '한',
    selection: selection(1),
  }).ok, true);
  assert.equal(controller.handleTextInput({ type: 'composition-commit' }).ok, true);

  assert.equal(changes.at(-1).snapshot.text, '한');
  assert.equal(changes.at(-1).composition, null);
  assert.equal(controller.getSnapshot().state.snapshot.text, '');
  assert.equal(unwrap(controller.syncControlledValues({ value: changes.at(-1) })).state.snapshot.text, '한');
});

test('controlled DOM text chains a committed Hangul proposal into the next composition before owner sync', () => {
  const changes = [];
  const controller = unwrap(createTextController({
    value: createTextEditingState('', selection(0)),
    onValueChange: ({ value }) => changes.push(value),
  }));

  assert.equal(controller.handleTextInput({
    type: 'composition-start',
    text: '',
    startCodeUnitOffset: 0,
    endCodeUnitOffset: 0,
    selection: selection(0),
  }).ok, true);
  assert.equal(controller.handleTextInput({
    type: 'composition-update',
    text: '한',
    selection: selection(1),
  }).ok, true);
  assert.equal(controller.handleTextInput({ type: 'composition-commit' }).ok, true);
  assert.equal(changes.at(-1).snapshot.text, '한');
  assert.equal(changes.at(-1).composition, null);

  assert.equal(controller.handleTextInput({
    type: 'composition-start',
    text: '',
    startCodeUnitOffset: 1,
    endCodeUnitOffset: 1,
    selection: selection(1),
  }).ok, true);
  assert.equal(controller.handleTextInput({
    type: 'composition-update',
    text: '글',
    selection: selection(2),
  }).ok, true);
  assert.equal(controller.handleTextInput({ type: 'composition-commit' }).ok, true);
  assert.equal(changes.at(-1).snapshot.text, '한글');
  assert.equal(changes.at(-1).composition, null);
});

test('DOM text rejects unsupported input and malformed external state atomically', () => {
  const malformed = createTextController({ value: { snapshot: null, composition: null } });
  assert.equal(malformed.ok, false);
  const controller = unwrap(createTextController());
  const initial = controller.getSnapshot();
  const result = controller.handleTextInput({ type: 'beforeinput', inputType: 'historyUndo' });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'unsupported-dom-text-input');
  assert.equal(result.snapshot, initial);
});

function selection(offset) {
  return { anchorCodeUnitOffset: offset, focusCodeUnitOffset: offset };
}

test('native text binding rolls back observation when its initial snapshot cannot be rendered', () => {
  const element = new FakeTextElement();
  assert.throws(() => new DOMTextElementBinding({
    element, getState() { throw new Error('snapshot rejected'); }, dispatch() { assert.fail('failed binding dispatched'); },
  }), /snapshot rejected/u);
  assert.equal([...element.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0), 0);
  element.emit('input'); element.emit('compositionstart');
});

class FakeTextElement {
  tagName = 'INPUT';
  type = 'text';
  value = '';
  selectionStart = 0;
  selectionEnd = 0;
  selectionDirection = 'none';
  selection = [0, 0];
  selectionWrites = 0;
  listeners = new Map();
  attributes = new Map();

  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type, event = {}) {
    const dispatched = { target: this, ...event, type };
    for (const listener of this.listeners.get(type) ?? []) {
      if (typeof listener === 'function') listener.call(this, dispatched);
      else listener.handleEvent(dispatched);
    }
  }

  setSelectionRange(start, end, direction = 'none') {
    this.selectionWrites += 1;
    this.selectionStart = start > end ? end : start;
    this.selectionEnd = end;
    this.selectionDirection = direction;
    this.selection = [this.selectionStart, this.selectionEnd];
  }

  matches(selector) { return selector === ':focus' && this.ownerDocument?.activeElement === this; }
}

class FakeSelectionlessTextElement extends FakeTextElement {
  type = 'email';
  selectionStart = null;
  selectionEnd = null;
  selectionDirection = null;

  setSelectionRange() {
    throw new Error('selection APIs are unavailable for email inputs');
  }
}
