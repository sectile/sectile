import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import {
  createTerminalAppearance,
} from '../.verification-dist/appearance.js';
import {
  renderTerminalScreen,
  serializeTerminalFrame,
  terminalBox,
  terminalColumn,
  terminalRow,
  terminalSpacer,
  terminalText,
} from '../.verification-dist/screen.js';
import {
  createTerminalScreenWriter,
  detectTerminalCapabilities,
} from '../.verification-dist/node.js';

test('appearance degrades semantic styles to plain text when color is unavailable', () => {
  const appearance = createTerminalAppearance({
    capabilities: { colorLevel: 0, unicode: false },
  });

  assert.equal(appearance.style('ready', 'success'), 'ready');
  assert.equal(appearance.open('danger'), '');
  assert.equal(appearance.cell('Deploy', 12, { current: true }), '> Deploy    ');
});

test('appearance emits truecolor styles from semantic theme roles', () => {
  const appearance = createTerminalAppearance({
    capabilities: { colorLevel: 3, unicode: true },
    theme: { accent: { foreground: { red: 10, green: 20, blue: 30 }, bold: true } },
  });

  assert.equal(appearance.style('Sectile', 'accent'), '\u001b[1;38;2;10;20;30mSectile\u001b[0m');
});

test('screen rejects malformed dimensions with package-owned errors', () => {
  for (const name of ['columns', 'rows']) {
    for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, undefined, null, '1']) {
      assert.throws(() => renderTerminalScreen(terminalText('x'), {
        columns: 1, rows: 1, [name]: value,
      }), {
        name: 'RangeError',
        message: `Terminal screen ${name} must be a non-negative safe integer.`,
      });
    }
  }
});

test('screen rejects axis and cell ceilings before dense allocation or consumer reads', () => {
  const cases = [];
  for (const name of ['columns', 'rows']) {
    for (const value of [4_097, 2 ** 32, Number.MAX_SAFE_INTEGER]) {
      for (const other of [0, 1]) {
        cases.push({
          dimensions: { columns: other, rows: other, [name]: value },
          message: `Terminal screen ${name} must not exceed 4096.`,
        });
      }
    }
  }
  for (const dimensions of [
    { columns: 4_096, rows: 257 },
    { columns: 257, rows: 4_096 },
    { columns: 1_025, rows: 1_024 },
    { columns: 4_096, rows: 4_096 },
  ]) cases.push({ dimensions, message: 'Terminal screen cell count must not exceed 1048576.' });

  let allocations = 0;
  let consumerReads = 0;
  const sentinel = new Error('frame work must not begin for rejected dimensions');
  const node = { get type() { consumerReads += 1; throw sentinel; } };
  const from = Array.from;
  const outcomes = [];
  try {
    // Intercept the first allocation attempt instead of risking a huge matrix
    // when this regression is run against a renderer without the boundary check.
    Array.from = () => { allocations += 1; throw sentinel; };
    for (const { dimensions, message } of cases) {
      let error;
      try {
        renderTerminalScreen(node, {
          ...dimensions,
          get appearance() { consumerReads += 1; throw sentinel; },
        });
      } catch (caught) { error = caught; }
      outcomes.push({ error, message });
    }
  } finally { Array.from = from; }

  for (const { error, message } of outcomes) {
    assert.ok(error instanceof RangeError);
    assert.equal(error.message, message);
  }
  assert.equal(allocations, 0);
  assert.equal(consumerReads, 0);
});

test('screen accepts inclusive axis limits and preserves empty viewport shapes', () => {
  for (const [columns, rows] of [[0, 0], [4_096, 0], [0, 4_096], [4_096, 1], [1, 4_096]]) {
    const frame = renderTerminalScreen(terminalText('X'), { columns, rows });
    assert.equal(frame.columns, columns);
    assert.equal(frame.rows, rows);
    assert.equal(frame.cells.length, rows);
    assert.ok(frame.cells.every((row) => row.length === columns && Object.isFrozen(row)));
    assert.equal(frame.cursor, null);
    if (columns > 0 && rows > 0) assert.equal(frame.cells[0][0].text, 'X');
    assert.equal(Object.isFrozen(frame), true);
    assert.equal(Object.isFrozen(frame.cells), true);
  }
});

test('screen accepts the exact dense cell budget', () => {
  const frame = renderTerminalScreen(terminalText('X'), { columns: 4_096, rows: 256 });
  assert.equal(frame.cells.length, 256);
  assert.ok(frame.cells.every((row) => row.length === 4_096));
  assert.equal(frame.rows * frame.columns, 1_048_576);
  assert.equal(frame.cells[0][0].text, 'X');
  assert.equal(frame.cells[255][4_095].text, ' ');
  assert.equal(Object.isFrozen(frame.cells[255][4_095]), true);
});

test('screen uses one validated dimension snapshot across consumer callbacks', () => {
  const appearance = createTerminalAppearance();
  const reads = { columns: 0, rows: 0 };
  let columns = 4;
  let rows = 1;
  const frame = renderTerminalScreen(terminalText('A한', {
    cursor: { codeUnitOffset: 2 },
  }), {
    get columns() { reads.columns += 1; return columns; },
    get rows() { reads.rows += 1; return rows; },
    get appearance() {
      columns = 2 ** 32;
      rows = 2 ** 32;
      return appearance;
    },
  });
  assert.deepEqual(reads, { columns: 1, rows: 1 });
  assert.equal(frame.columns, 4);
  assert.equal(frame.rows, 1);
  assert.deepEqual(serializeTerminalFrame(frame, appearance), ['A한 ']);
  assert.equal(frame.cells[0][2].continuation, true);
  assert.equal(frame.cursor.column, 3);
  assert.equal(frame.cursor.visible, true);
});

test('screen measures nested auto text once per constraint pair in each render', () => {
  for (const container of [terminalColumn, terminalRow]) {
    for (const wrap of [false, true]) {
      for (const [depth, length] of [[32, 512], [64, 1_024], [128, 2_048], [256, 4_096]]) {
        const value = 'x'.repeat(length);
        let node = terminalText(value, { wrap });
        for (let index = 0; index < depth; index += 1) node = container([node]);
        for (let render = 0; render < 2; render += 1) {
          const { frame, measurements } = countTextMeasurements(value, () =>
            renderTerminalScreen(node, { columns: 80, rows: 1 }));
          assert.equal(measurements, 1, `${container.name}, wrap=${wrap}, depth=${depth}`);
          assert.deepEqual(serializeTerminalFrame(frame), ['x'.repeat(80)]);
        }
      }
    }
  }
});

test('screen reuses measured subtrees rather than walking every ancestor suffix', () => {
  for (const depth of [32, 128, 256]) {
    let reads = 0;
    let node = terminalText('x', { wrap: false });
    for (let index = 0; index < depth; index += 1) {
      const column = terminalColumn([node]);
      node = Object.freeze({
        ...column,
        get children() { reads += 1; return column.children; },
      });
    }
    const frame = renderTerminalScreen(node, { columns: 1, rows: 1 });
    assert.deepEqual(serializeTerminalFrame(frame), ['x']);
    assert.ok(reads <= 6 * depth, `${depth} containers caused ${reads} child-list reads`);
  }
});

test('screen shared nodes preserve layout under distinct width and height constraints', () => {
  for (const wrap of [false, true]) {
    for (const dimension of ['auto', 'fill']) {
      for (const align of ['start', 'center', 'end', 'stretch']) {
        for (const justify of ['start', 'center', 'end', 'space-between']) {
          const leaf = terminalText('A한😀e\u0301\nBC', {
            wrap, width: dimension, height: dimension,
            cursor: { codeUnitOffset: 4, blink: false }, style: 'accent',
          });
          const shared = terminalColumn([leaf, terminalText('!')], { gap: 1, align, justify });
          const node = terminalColumn([
            terminalRow([
              terminalBox(shared, { border: 'none', width: 5, height: 2 }),
              terminalBox(shared, { border: 'rounded', width: 9, height: 5, padding: { left: 1 } }),
            ], { height: 5, gap: 1, align, justify }),
            terminalRow([
              terminalBox(shared, { border: 'none', width: 9, height: 3 }),
              terminalBox(shared, { border: 'none', width: 5, height: 2 }),
            ], { height: 3, align, justify }),
          ]);
          // JSON duplicates every occurrence; both inputs use the production renderer.
          const independent = JSON.parse(JSON.stringify(node));
          const options = { columns: 18, rows: 9 };
          assert.deepEqual(renderTerminalScreen(node, options), renderTerminalScreen(independent, options));
        }
      }
    }
  }
});

test('screen measurements are isolated across changed, failed and reentrant renders', () => {
  const mutable = { type: 'text', value: 'A', wrap: true };
  const node = terminalColumn([mutable, terminalText('!')]);
  const options = { columns: 4, rows: 4 };
  const first = renderTerminalScreen(node, options);
  mutable.value = 'ABCD\nE';
  assert.deepEqual(renderTerminalScreen(node, options), renderTerminalScreen(structuredClone(node), options));
  assert.deepEqual(serializeTerminalFrame(first), ['A   ', '!   ', '    ', '    ']);
  const failure = new Error('measurement failed');
  const broken = { type: 'text', get value() { throw failure; } };
  assert.throws(() => renderTerminalScreen(terminalColumn([mutable, broken]), options), (error) => error === failure);
  mutable.value = 'Z';
  assert.deepEqual(serializeTerminalFrame(renderTerminalScreen(node, options)), ['Z   ', '!   ', '    ', '    ']);

  const shared = terminalText('ABCDE', { wrap: false });
  let nested;
  const trigger = {
    type: 'text', wrap: false,
    get value() {
      nested ??= renderTerminalScreen(terminalColumn([shared]), { columns: 6, rows: 4 });
      return '-';
    },
  };
  const { frame, measurements } = countTextMeasurements(shared.value, () =>
    renderTerminalScreen(terminalColumn([shared, trigger, shared]), { columns: 6, rows: 4 }));
  assert.equal(measurements, 2, 'outer and nested calls each own one measurement of the shared text');
  assert.deepEqual(serializeTerminalFrame(frame), ['ABCDE ', '-     ', 'ABCDE ', '      ']);
  assert.deepEqual(serializeTerminalFrame(nested), ['ABCDE ', '      ', '      ', '      ']);
});

test('screen traverses 20000-deep layouts with a reduced JavaScript stack', () => {
  const moduleURL = new URL('../.verification-dist/screen.js', import.meta.url).href;
  const result = spawnSync(process.execPath, ['--stack-size=256', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { renderTerminalScreen, terminalText, terminalRow, terminalColumn, terminalBox, terminalSpacer }
      from ${JSON.stringify(moduleURL)};
    const depth = 20000;
    const options = { columns: 8, rows: 2 };
    const leaf = terminalColumn([
      terminalText('A한😀', { wrap: false, cursor: { codeUnitOffset: 2 } }),
      terminalText('B', { cursor: { codeUnitOffset: 0 } }),
    ]);
    const expected = renderTerminalScreen(leaf, options);
    assert.equal(expected.cursor.row, 0);
    assert.equal(expected.cursor.column, 3);
    const empty = terminalSpacer({ width: 0, height: 0 });
    let cases = 0;
    for (const kind of ['row', 'column', 'box', 'mixed', 'branching']) {
      let node = leaf;
      for (let index = 0; index < depth; index += 1) {
        if (kind === 'box' || (kind === 'mixed' && index % 3 === 0)) {
          node = terminalBox(node, { border: 'none' });
        } else {
          const container = kind === 'row' || ((kind === 'mixed' || kind === 'branching') && index % 2 === 0)
            ? terminalRow : terminalColumn;
          node = container(kind === 'branching' ? [node, empty] : [node]);
        }
      }
      // A root box chain exercises rendering; nesting it in a column also
      // exercises intrinsic measurement of every box under the small stack.
      for (const root of [node, terminalColumn([node])]) {
        assert.deepEqual(renderTerminalScreen(root, options), expected, kind);
        cases += 1;
      }
    }
    console.log(JSON.stringify({ depth, cases }));
  `], { encoding: 'utf8', timeout: 15_000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { depth: 20_000, cases: 10 });
});

test('screen measures wide child and line collections without argument-list stack growth', () => {
  const size = 131_072;
  const children = new Array(size).fill(terminalSpacer({ width: 0, height: 0 }));
  children[size - 1] = terminalText('X', { wrap: false });
  for (const container of [terminalRow, terminalColumn]) {
    const frame = renderTerminalScreen(terminalColumn([container(children)]), { columns: 2, rows: 1 });
    assert.deepEqual(serializeTerminalFrame(frame), ['X ']);
  }
  const frame = renderTerminalScreen(terminalColumn([
    terminalText('\n'.repeat(size) + 'X', { wrap: false }),
  ]), { columns: 2, rows: 1 });
  assert.deepEqual(serializeTerminalFrame(frame), ['  ']);
});

function countTextMeasurements(value, render) {
  const split = String.prototype.split;
  let measurements = 0;
  try {
    String.prototype.split = function (separator, ...arguments_) {
      if (this === value && separator === '\n') measurements += 1;
      return split.call(this, separator, ...arguments_);
    };
    const frame = render();
    return { frame, measurements };
  } finally { String.prototype.split = split; }
}

test('screen cross-measures fill children under their assigned main-axis size', () => {
  const render = (value, width, align) => serializeTerminalFrame(renderTerminalScreen(
    terminalRow([
      terminalText(value, { width }),
      terminalSpacer({ width }),
    ], { width: 6, height: 3, align }),
    { columns: 6, rows: 3 },
  ));
  const expected = {
    start: ['abc   ', 'def   ', '      '],
    center: ['abc   ', 'def   ', '      '],
    end: ['      ', 'abc   ', 'def   '],
    stretch: ['abc   ', 'def   ', '      '],
  };

  for (const align of ['start', 'center', 'end', 'stretch']) {
    const fill = render('abcdef', 'fill', align);
    assert.deepEqual(fill, render('abcdef', 3, align), align);
    assert.deepEqual(fill, expected[align], align);
  }

  const fillWide = render('漢字語', 'fill', 'start');
  assert.deepEqual(fillWide, render('漢字語', 3, 'start'));
  assert.match(fillWide[0], /^漢/);
  assert.match(fillWide[1], /^字/);
  assert.match(fillWide[2], /^語/);

  const { frame, measurements } = countTextMeasurements('abcdef', () => renderTerminalScreen(
    terminalRow([
      terminalText('abcdef', { width: 'fill' }),
      terminalSpacer({ width: 'fill' }),
    ], { width: 6, height: 3, align: 'start' }),
    { columns: 6, rows: 3 },
  ));
  assert.equal(measurements, 1);
  assert.deepEqual(serializeTerminalFrame(frame), expected.start);
});

test('screen composes boxes, rows, fill regions, and clipping into a fixed viewport', () => {
  const appearance = createTerminalAppearance({
    capabilities: { colorLevel: 0, unicode: true },
  });
  const screen = terminalBox(terminalColumn([
    terminalText('Workspace', { height: 1 }),
    terminalRow([
      terminalText('Navigation', { width: 10 }),
      terminalText('Main content', { width: 'fill' }),
      terminalSpacer({ width: 1 }),
    ], { height: 'fill', gap: 1 }),
  ], { width: 'fill', height: 'fill', gap: 1 }), {
    title: 'App',
    width: 'fill',
    height: 'fill',
    padding: 1,
  });

  const frame = renderTerminalScreen(screen, { columns: 32, rows: 8, appearance });
  const lines = serializeTerminalFrame(frame, appearance);

  assert.equal(lines.length, 8);
  assert.match(lines[0], /^┌─ App ─/);
  assert.match(lines[2], /Workspace/);
  assert.match(lines[4], /Navigation Main content/);
  assert.match(lines[7], /^└─/);
});

test('screen projects a UTF-16 caret through wide graphemes into terminal cell coordinates', () => {
  const frame = renderTerminalScreen(
    terminalText('A😀한글', {
      cursor: { codeUnitOffset: 3, shape: 'bar', blink: false },
    }),
    { columns: 12, rows: 2 },
  );

  assert.deepEqual(frame.cursor, {
    row: 0,
    column: 3,
    visible: true,
    shape: 'bar',
    blink: false,
  });
  assert.equal(frame.cells[0][2].continuation, true);
});

test('screen wraps a caret at the viewport edge and hides it when clipping removes its row', () => {
  const visible = renderTerminalScreen(
    terminalText('abcd', { cursor: { codeUnitOffset: 4 } }),
    { columns: 4, rows: 2 },
  );
  const clipped = renderTerminalScreen(
    terminalText('abcd', { cursor: { codeUnitOffset: 4 } }),
    { columns: 4, rows: 1 },
  );

  assert.deepEqual(visible.cursor, {
    row: 1,
    column: 0,
    visible: true,
    shape: 'bar',
    blink: true,
  });
  assert.equal(clipped.cursor.visible, false);
});

test('screen measures wrapped wide graphemes with the same packing used to render them', () => {
  const frame = renderTerminalScreen(
    terminalColumn([
      terminalText('漢字語', { width: 3 }),
      terminalText('X'),
    ], { width: 3 }),
    { columns: 3, rows: 4 },
  );

  assert.deepEqual(serializeTerminalFrame(frame), [
    '漢 ',
    '字 ',
    '語 ',
    'X  ',
  ]);
});

test('screen clips oversized descendants to every ancestor rectangle', () => {
  const frame = renderTerminalScreen(
    terminalRow([
      terminalRow([
        terminalText('ABCDEFGHIJ', { width: 10 }),
      ], { width: 5 }),
      terminalText('R', { width: 5 }),
    ]),
    { columns: 10, rows: 1 },
  );

  assert.deepEqual(serializeTerminalFrame(frame), ['ABCDER    ']);
});

test('node capability detection respects NO_COLOR and explicit FORCE_COLOR', () => {
  const output = { isTTY: true, write() {}, getColorDepth: () => 24 };
  assert.equal(detectTerminalCapabilities(output, { NO_COLOR: '1' }).colorLevel, 0);
  assert.equal(detectTerminalCapabilities(output, { NO_COLOR: '1', FORCE_COLOR: '2' }).colorLevel, 2);
  assert.equal(detectTerminalCapabilities({ isTTY: false, write() {} }, {}).colorLevel, 0);
});

test('screen writer updates changed rows without clearing the entire screen again', () => {
  const chunks = [];
  const output = {
    isTTY: true,
    write(chunk) { chunks.push(chunk); },
    getColorDepth: () => 4,
  };
  const writer = createTerminalScreenWriter(output, { alternateScreen: true });
  const first = renderTerminalScreen(terminalText('first'), { columns: 8, rows: 2 });
  const second = renderTerminalScreen(terminalText('next', {
    cursor: { codeUnitOffset: 4, shape: 'underline', blink: false },
  }), { columns: 8, rows: 2 });

  writer.render(first);
  const firstWriteCount = chunks.length;
  writer.render(second);
  writer.close();

  const initial = chunks.slice(0, firstWriteCount).join('');
  const update = chunks[firstWriteCount];
  assert.match(initial, /\u001b\[2J/);
  assert.doesNotMatch(update, /\u001b\[2J/);
  assert.match(update, /next/);
  assert.match(update, /\u001b\[4 q/);
  assert.match(chunks.at(-1), /\u001b\[\?1049l/);
});

for (const reuse of [false, true]) {
  test(`screen writer owns raw row history when the next array is ${reuse ? 'reused' : 'fresh'}`, () => {
    const chunks = [];
    const writer = createTerminalScreenWriter({
      write(chunk) { chunks.push(chunk); },
    }, { clearOnStart: false });
    const rows = ['old', 'keep', 'stale'];

    writer.render(rows);
    assert.match(chunks.join(''), /\u001b\[1;1Hold\u001b\[K/);
    assert.equal(Object.isFrozen(rows), false);
    const boundary = chunks.length;
    rows[0] = 'new';
    rows.length = 2;
    writer.render(reuse ? rows : [...rows]);

    assert.equal(chunks.slice(boundary).join(''),
      '\u001b[?25l\u001b[1;1Hnew\u001b[K\u001b[3;1H\u001b[K\u001b[?25l');
    assert.deepEqual(rows, ['new', 'keep']);
    writer.close();
  });
}

test('screen writer snapshots raw rows before calling output', () => {
  const chunks = [];
  const rows = ['first'];
  const writer = createTerminalScreenWriter({
    write(chunk) {
      chunks.push(chunk);
      rows[0] = 'next';
    },
  }, { clearOnStart: false });

  writer.render(rows);
  assert.match(chunks.join(''), /\u001b\[1;1Hfirst\u001b\[K/);
  const boundary = chunks.length;
  writer.render(rows);
  assert.equal(chunks.slice(boundary).join(''),
    '\u001b[?25l\u001b[1;1Hnext\u001b[K\u001b[?25l');
  writer.close();
});

test('screen writer snapshots each raw row once per render', () => {
  for (const size of [1_000, 10_000, 100_000]) {
    let reads = 0;
    let writes = 0;
    const rows = new Array(size);
    for (let row = 0; row < size; row += 1) {
      Object.defineProperty(rows, row, {
        get() { reads += 1; return 'same'; },
      });
    }
    const writer = createTerminalScreenWriter({ write() { writes += 1; } });

    writer.render(rows);
    assert.equal(reads, size);
    reads = 0;
    writer.render(rows);
    assert.equal(reads, size, 'diff history is writer-owned rather than reread from the caller');
    writer.close();
    const closedWrites = writes;
    reads = 0;
    writer.close();
    writer.render(rows);
    assert.equal(reads, 0);
    assert.equal(writes, closedWrites);
  }
});

test('screen writer clears stale rows after resize and restores the terminal once', () => {
  const chunks = [];
  const output = {
    isTTY: true,
    write(chunk) { chunks.push(chunk); },
    getColorDepth: () => 4,
  };
  const writer = createTerminalScreenWriter(output, { alternateScreen: true });
  writer.render(renderTerminalScreen(terminalText('한글\n👨‍👩‍👧‍👦'), { columns: 8, rows: 2 }));
  writer.render(renderTerminalScreen(terminalText('A'), { columns: 4, rows: 1 }));
  writer.close();
  writer.close();

  const outputText = chunks.join('');
  assert.match(outputText, /\u001b\[2;1H\u001b\[K/);
  assert.equal(outputText.match(/\u001b\[\?1049h/g)?.length, 1);
  assert.equal(outputText.match(/\u001b\[\?1049l/g)?.length, 1);
  assert.match(chunks.at(-1), /\u001b\[\?25h\u001b\[\?1049l/);
});
