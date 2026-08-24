import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { demos } from '../.vitepress/theme/terminal-demo-sessions.mjs';
import { toKeyboardInputs } from '../.vitepress/theme/terminal-keyboard-input.mjs';

const catalog = JSON.parse(await readFile(new URL('../data/components.json', import.meta.url), 'utf8'));
const terminalExampleSource = await readFile(
  new URL('../.vitepress/theme/components/TerminalComponentExample.vue', import.meta.url),
  'utf8',
);

function createDocumentationSession(id, initialCase = 0) {
  const definition = demos.find((candidate) => candidate.id === id);
  assert.ok(definition, `missing terminal definition for ${id}`);
  return definition.create({
    documentation: true,
    initialCase,
    readOnly: definition.readOnly,
    readOnlyCase: definition.readOnlyCase,
    render() {},
    record() {},
    recordText() {},
  });
}

test('every catalog component has a terminal example definition', () => {
  const catalogIDs = catalog.components.map(({ id }) => id).sort();
  const demoIDs = demos.map(({ id }) => id).sort();
  const defined = new Set(demoIDs);
  assert.equal(defined.size, demos.length, 'terminal demo ids must be unique');
  assert.deepEqual(demoIDs, catalogIDs, 'terminal demos must match the component catalog exactly');
  assert.deepEqual(
    catalogIDs.filter((id) => !defined.has(id)),
    [],
  );
  assert.doesNotMatch(terminalExampleSource, /terminal example is not available|터미널 예시는 아직/u);
  assert.match(terminalExampleSource, /throw new Error\(`Missing terminal example/u);
});

test('every catalog terminal example renders every documented scenario', () => {
  for (const component of catalog.components) {
    const scenarios = component.scenarios.terminal;
    assert.ok(scenarios.length > 0, `${component.id} must document at least one terminal scenario`);
    scenarios.forEach((_, initialCase) => {
      const session = createDocumentationSession(component.id, initialCase);
      const output = session.lines(100).join('\n');
      assert.ok(output.length > 0, `${component.id} scenario ${initialCase} must render content`);
      assert.doesNotMatch(output, /terminal example is not available|터미널 예시는 아직/u);
      session.disconnect?.();
    });
  }
});

test('calendar terminal examples distinguish adjacent and unavailable dates without month prefixes', () => {
  const month = createDocumentationSession('calendar', 0).lines(100).join('\n');
  assert.doesNotMatch(month, /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\d{1,2}\b/u);
  assert.match(month, /\s{2}\u001b\[2m\d{1,2}\u001b\[0m\s+/u);

  const unavailable = createDocumentationSession('calendar', 1).lines(100).join('\n');
  assert.match(unavailable, /\s{2}\u001b\[2;9m\d{1,2}\u001b\[0m\s+/u);
  assert.doesNotMatch(unavailable, /\u001b\[2;9m\d{1,2}\s+\u001b\[0m/u);
});

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

test('terminal tabs render a boxed tab strip with a distinct active panel', () => {
  const session = createDocumentationSession('tabs', 0);
  const initial = session.lines(80).join('\n');
  assert.match(initial, /┌─+\u252c─+\u252c─+┐/u);
  assert.match(initial, /├─+┤\n│.*Overview/u);
  assert.match(initial, /Release status and rollout summary\./u);

  session.handle({ key: 'right' });
  assert.match(session.lines(80).join('\n'), /focused=changes\s+active=overview/u);
  session.handle({ key: 'enter' });
  const changed = session.lines(80).join('\n');
  assert.match(changed, /focused=changes\s+active=changes/u);
  assert.match(changed, /Commits, files, and reviewers in this release\./u);
});

test('tags input embeds the terminal caret at the draft insertion point for IME composition', () => {
  const definition = demos.find(({ id }) => id === 'tags-input');
  const session = definition.create({
    documentation: true,
    initialCase: 0,
    readOnly: definition.readOnly,
    readOnlyCase: definition.readOnlyCase,
    render() {},
    record() {},
    recordText() {},
  });

  for (const input of toKeyboardInputs('한글')) session.handle(input);

  assert.match(session.lines(80)[5], /한글\u001b\[s/u);
});

test('text-accepting terminal examples expose a logical IME cursor', () => {
  const directInputIDs = [
    'text', 'combobox', 'pin-input', 'tags-input', 'color-picker',
    'spin-button', 'number-field', 'quantity-field',
    'date-field', 'date-time-field', 'time-field',
    'date-range-field', 'time-range-field',
  ];
  for (const id of directInputIDs) {
    const session = createDocumentationSession(id);
    assert.match(session.lines(100).join('\n'), /\u001b\[s/u, id);
  }

  const editable = createDocumentationSession('editable');
  editable.handle({ key: 'enter' });
  assert.match(editable.lines(100).join('\n'), /\u001b\[s/u, 'editable');

  const grid = createDocumentationSession('grid', 2);
  grid.handle({ key: 'enter' });
  assert.match(grid.lines(100).join('\n'), /\u001b\[s/u, 'grid');

  const treeGrid = createDocumentationSession('tree-grid');
  treeGrid.handle({ key: 'enter' });
  assert.match(treeGrid.lines(100).join('\n'), /\u001b\[s/u, 'tree-grid');
});

test('range period pickers identify the first endpoint before asking for the second', () => {
  const currentYear = new Date().getFullYear();
  const session = createDocumentationSession('year-range-picker');

  assert.match(session.lines(100).join('\n'), /Enter set start/u);
  session.handle({ key: 'enter' });
  const pending = session.lines(100).join('\n');
  assert.match(pending, new RegExp(`${currentYear} start`, 'u'));
  assert.match(pending, new RegExp(`start=${currentYear}  end=pending`, 'u'));
  assert.match(pending, /move to end · Enter finish range/u);

  session.handle({ key: 'right' });
  session.handle({ key: 'enter' });
  const committed = session.lines(100).join('\n');
  assert.doesNotMatch(committed, /end=pending/u);
  assert.match(committed, new RegExp(`range=${currentYear} → ${currentYear + 1}`, 'u'));
});
