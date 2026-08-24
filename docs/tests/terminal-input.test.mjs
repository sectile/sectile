import assert from 'node:assert/strict';
import test from 'node:test';
import { demos } from '../.vitepress/theme/terminal-demo-sessions.mjs';
import { toKeyboardInputs } from '../.vitepress/theme/terminal-keyboard-input.mjs';

test('modified arrow sequences remain one keyboard input', () => {
  assert.deepEqual(toKeyboardInputs('\u001b[1;2D'), [{ key: 'left', shiftKey: true }]);
  assert.deepEqual(toKeyboardInputs('\u001b[1;6C'), [{ key: 'right', shiftKey: true, ctrlKey: true }]);
  assert.deepEqual(toKeyboardInputs('\u001b[1;3A'), [{ key: 'up', altKey: true }]);
});

test('portable keyboard aliases normalize to semantic navigation keys', () => {
  assert.deepEqual(toKeyboardInputs('\u0001'), [{ key: 'home' }]);
  assert.deepEqual(toKeyboardInputs('\u0005'), [{ key: 'end' }]);
  assert.deepEqual(toKeyboardInputs('\u001b[H'), [{ key: 'home' }]);
  assert.deepEqual(toKeyboardInputs('\u001b[F'), [{ key: 'end' }]);
  assert.deepEqual(toKeyboardInputs('\u001b[5~'), [{ key: 'page-up' }]);
  assert.deepEqual(toKeyboardInputs('\u001b[6~'), [{ key: 'page-down' }]);
  assert.deepEqual(toKeyboardInputs('\u001b[3~'), [{ key: 'delete' }]);
});

test('unknown terminal control sequences never leak printable shortcut bytes', () => {
  assert.deepEqual(toKeyboardInputs('\u001b[99;99~'), []);
});

test('documentation examples keep their assigned scenario', () => {
  const definition = demos.find(({ id }) => id === 'pagination');
  const session = definition.create({
    documentation: true,
    initialCase: 1,
    readOnly: definition.readOnly,
    readOnlyCase: definition.readOnlyCase,
    render() {},
    record() {},
    recordText() {},
  });

  assert.match(session.lines(80).join('\n'), /Long result set/);
  session.handle({ key: ']' });
  assert.match(session.lines(80).join('\n'), /Long result set/);
  session.handle({ key: '[' });
  assert.match(session.lines(80).join('\n'), /Long result set/);
});

test('portable edge aliases drive pagination without dedicated Home and End keys', () => {
  const definition = demos.find(({ id }) => id === 'pagination');
  const session = definition.create({
    documentation: true,
    initialCase: 1,
    readOnly: definition.readOnly,
    readOnlyCase: definition.readOnlyCase,
    render() {},
    record() {},
    recordText() {},
  });

  session.handle(toKeyboardInputs('\u0001')[0]);
  assert.match(session.lines(80).join('\n'), /page=1\/25/);
  session.handle(toKeyboardInputs('\u0005')[0]);
  assert.match(session.lines(80).join('\n'), /page=25\/25/);
});

test('documentation examples do not expose internal snapshot revisions', () => {
  const definition = demos.find(({ id }) => id === 'pagination');
  const session = definition.create({
    documentation: true,
    initialCase: 0,
    readOnly: definition.readOnly,
    readOnlyCase: definition.readOnlyCase,
    render() {},
    record() {},
    recordText() {},
  });

  assert.doesNotMatch(session.lines(80).join('\n'), /(?:^|\s)r\d+(?:\s|$)/m);
});
