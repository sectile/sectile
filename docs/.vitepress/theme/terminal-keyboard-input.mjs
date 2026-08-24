const exactSequences = new Map([
  ['\u001b[A', { key: 'up' }],
  ['\u001b[B', { key: 'down' }],
  ['\u001b[C', { key: 'right' }],
  ['\u001b[D', { key: 'left' }],
  ['\u001b[H', { key: 'home' }],
  ['\u001b[F', { key: 'end' }],
  ['\u001b[5~', { key: 'page-up' }],
  ['\u001b[6~', { key: 'page-down' }],
  ['\u001b[3~', { key: 'delete' }],
  ['\u001b', { key: 'escape' }],
  ['\r', { key: 'enter' }],
  ['\n', { key: 'enter' }],
  ['\t', { key: 'tab' }],
  // Conventional terminal navigation aliases for keyboards without dedicated
  // Home and End keys. macOS Fn+Arrow is already emitted as the CSI sequences
  // above, while Ctrl+A/Ctrl+E arrive as control characters.
  ['\u0001', { key: 'home' }],
  ['\u0005', { key: 'end' }],
  ['\u007f', { key: 'backspace' }],
  [' ', { key: 'space', text: ' ' }],
]);

const csiKeys = {
  A: 'up',
  B: 'down',
  C: 'right',
  D: 'left',
  H: 'home',
  F: 'end',
};

function modifierFlags(value) {
  const bits = Number(value) - 1;
  return {
    ...(bits & 1 ? { shiftKey: true } : {}),
    ...(bits & 2 ? { altKey: true } : {}),
    ...(bits & 4 ? { ctrlKey: true } : {}),
  };
}

export function toKeyboardInputs(data) {
  const direct = exactSequences.get(data);
  if (direct) return [direct];

  const modifiedCSI = /^\u001b\[1;([2-8])([A-DFH])$/.exec(data);
  if (modifiedCSI) {
    return [{ key: csiKeys[modifiedCSI[2]], ...modifierFlags(modifiedCSI[1]) }];
  }

  if (data.length === 1 && data.charCodeAt(0) > 0 && data.charCodeAt(0) < 27) {
    return [{ key: String.fromCharCode(data.charCodeAt(0) + 96), ctrlKey: true }];
  }

  // Never expose an unknown terminal control sequence as printable input. Doing so
  // would leak its `[` or `]` bytes into component shortcuts and text fields.
  if (data.startsWith('\u001b')) return [];

  return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(data), ({ segment }) => ({
    key: segment,
    text: segment,
  }));
}
