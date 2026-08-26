import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTerminalAppearance,
} from '../dist/appearance.js';
import {
  renderTerminalScreen,
  serializeTerminalFrame,
  terminalBox,
  terminalColumn,
  terminalRow,
  terminalSpacer,
  terminalText,
} from '../dist/screen.js';
import {
  createTerminalScreenWriter,
  detectTerminalCapabilities,
} from '../dist/node.js';

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
