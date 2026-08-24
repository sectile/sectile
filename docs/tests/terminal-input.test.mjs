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

test('terminal stepper renders ordered progress instead of tab-like panels', () => {
  const session = createDocumentationSession('stepper', 0);
  const initial = session.lines(80).join('\n');
  assert.match(initial, /Details.*──.*Verify.*──.*Review/u);
  assert.match(initial, /Current task · Details/u);
  assert.match(initial, /progress=0\/3 completed/u);
  assert.doesNotMatch(initial, /├─+┤/u);

  session.handle({ key: 'right' });
  assert.match(session.lines(80).join('\n'), /current=details\s+focused=verify/u);
  session.handle({ key: 'enter' });
  const advanced = session.lines(80).join('\n');
  assert.match(advanced, /Current task · Verify/u);
  assert.match(advanced, /progress=1\/3 completed/u);
});

test('terminal temporal fields highlight whole segments without a fake text caret', () => {
  for (const id of ['date-field', 'date-time-field', 'time-field']) {
    const session = createDocumentationSession(id, 0);
    const initial = session.lines(100).join('\n');
    assert.doesNotMatch(initial, /caret=|\u001b\[s/u, id);
    assert.match(initial, /segment=(?:day|minute)/u, id);

    session.handle({ key: 'home' });
    assert.match(session.lines(100).join('\n'), /segment=(?:year|hour)/u, id);
    session.handle({ key: 'right' });
    assert.match(session.lines(100).join('\n'), /segment=(?:month|minute)/u, id);
  }
});

test('terminal temporal fields reject invalid drafts and explain recovery', () => {
  const cases = [
    { id: 'date-field', segment: 'month', error: /Month must be 01–12/u },
    { id: 'date-time-field', segment: 'month', error: /Month must be 01–12/u },
    { id: 'time-field', segment: 'hour', error: /Hour must be 00–23/u },
  ];

  for (const { id, segment, error } of cases) {
    const session = createDocumentationSession(id, 0);
    session.handle({ key: 'home' });
    if (segment === 'month') session.handle({ key: 'right' });
    session.handle({ key: '99', text: '99' });

    const invalid = session.lines(120).join('\n');
    assert.match(invalid, /Invalid draft/u, id);
    assert.match(invalid, error, id);
    assert.match(invalid, /Committed value unchanged/u, id);
    assert.equal(session.handle({ key: 'enter' }), false, id);
    assert.match(session.lines(120).join('\n'), /Invalid draft/u, id);

    assert.equal(session.handle({ key: 'escape' }), true, id);
    assert.doesNotMatch(session.lines(120).join('\n'), /Invalid draft/u, id);
  }
});

test('terminal temporal arrows recover invalid segments from the committed value', () => {
  const cases = [
    { id: 'date-field', initialCase: 1, moveToSegment: ['home', 'right'], text: '34', expected: /value=2026-09-22\s+segment=month/u },
    { id: 'date-time-field', initialCase: 0, moveToSegment: ['home', 'right'], text: '34', expected: /value=2026-09-22T16:30\s+segment=month/u },
    { id: 'time-field', initialCase: 0, moveToSegment: ['home'], text: '34', expected: /value=10:30\s+segment=hour/u },
  ];

  for (const { id, initialCase, moveToSegment, text, expected } of cases) {
    const session = createDocumentationSession(id, initialCase);
    for (const key of moveToSegment) session.handle({ key });
    session.handle({ key: text, text });
    assert.match(session.lines(120).join('\n'), /Invalid draft/u, id);
    assert.equal(session.handle({ key: 'up' }), true, id);
    const recovered = session.lines(120).join('\n');
    assert.doesNotMatch(recovered, /Invalid draft/u, id);
    assert.match(recovered, expected, id);
  }
});

test('bounded terminal temporal fields explain rejected boundary steps', () => {
  const session = createDocumentationSession('date-field', 1);
  session.handle({ key: 'home' });
  session.handle({ key: 'right' });
  session.handle({ key: 'up' });
  assert.equal(session.handle({ key: 'up' }), false);
  assert.match(session.lines(120).join('\n'), /Next value exceeds maximum 2026-09-30/u);
});

test('terminal temporal deletion stays inside the active segment', () => {
  const session = createDocumentationSession('date-field', 0);
  session.handle({ key: 'home' });

  for (let index = 0; index < 8; index += 1) session.handle({ key: 'backspace' });

  const clearedYear = session.lines(120).join('\n');
  assert.match(clearedYear, /····.*08.*22/su);
  assert.match(clearedYear, /segment=year/u);
  assert.match(clearedYear, /value=2026-08-22/u);

  for (const input of toKeyboardInputs('2030')) session.handle(input);
  assert.match(session.lines(120).join('\n'), /2030.*08.*22/su);
  assert.equal(session.handle({ key: 'enter' }), true);
  assert.match(session.lines(120).join('\n'), /value=2030-08-22/u);
});

test('terminal temporal range fields use the same segment editing boundaries', () => {
  const cases = [
    {
      id: 'date-range-field',
      cleared: /Start.*····.*08.*22.*End.*2026-08-25/su,
      restored: /Start.*2030.*08.*22.*End.*2026-08-25/su,
      segment: /active=start\s+segment=year/u,
      replacement: '2030',
    },
    {
      id: 'time-range-field',
      cleared: /Start.*··.*30.*End.*17:45/su,
      restored: /Start.*11.*30.*End.*17:45/su,
      segment: /active=start\s+segment=hour/u,
      replacement: '11',
    },
  ];

  for (const { id, cleared, restored, segment, replacement } of cases) {
    const session = createDocumentationSession(id, 0);
    session.handle({ key: 'home' });
    for (let index = 0; index < 8; index += 1) session.handle({ key: 'backspace' });

    const clearedSegment = session.lines(120).join('\n');
    assert.match(clearedSegment, cleared, id);
    assert.match(clearedSegment, segment, id);

    for (const input of toKeyboardInputs(replacement)) session.handle(input);
    assert.match(session.lines(120).join('\n'), restored, id);

    session.handle({ key: 'tab' });
    assert.match(session.lines(120).join('\n'), /active=end/u, id);
  }
});

test('terminal temporal range fields keep identical active and inactive text geometry', () => {
  const stripTerminalStyles = (value) => value.replaceAll(/\u001b\[[0-?]*[ -/]*[@-~]/gu, '');
  const session = createDocumentationSession('date-range-field', 0);

  const startActive = stripTerminalStyles(session.lines(120).join('\n'));
  assert.match(startActive, /Start\s+2026-08-22/u);
  assert.match(startActive, /End\s+2026-08-25/u);
  assert.doesNotMatch(startActive, /2026\s+-\s+08\s+-\s+22/u);

  session.handle({ key: 'tab' });
  const endActive = stripTerminalStyles(session.lines(120).join('\n'));
  assert.match(endActive, /Start\s+2026-08-22/u);
  assert.match(endActive, /End\s+2026-08-25/u);
  assert.doesNotMatch(endActive, /2026\s+-\s+08\s+-\s+25/u);
});

test('terminal temporal range scenarios match the documented examples', () => {
  const stripTerminalStyles = (value) => value.replaceAll(/\u001b\[[0-?]*[ -/]*[@-~]/gu, '');
  const boundedDates = stripTerminalStyles(createDocumentationSession('date-range-field', 1).lines(120).join('\n'));
  assert.match(boundedDates, /Bounded booking dates/u);
  assert.match(boundedDates, /Start\s+2026-09-08/u);
  assert.match(boundedDates, /End\s+2026-09-18/u);
  assert.match(boundedDates, /committed=yes/u);

  const steppedTimes = stripTerminalStyles(createDocumentationSession('time-range-field', 1).lines(120).join('\n'));
  assert.match(steppedTimes, /Quarter-hour schedule/u);
  assert.match(steppedTimes, /Start\s+09:30/u);
  assert.match(steppedTimes, /End\s+17:45/u);
  assert.match(steppedTimes, /committed=yes/u);
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
