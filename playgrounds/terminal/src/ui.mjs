import { fitTerminalText } from '@sectile/terminal/layout';

export const ansi = Object.freeze({
  reset: '\u001b[0m',
  bold: '\u001b[1m',
  dim: '\u001b[2m',
  cyan: '\u001b[36m',
  current: '\u001b[30;46m',
  editing: '\u001b[30;43m',
});

export function styled(style, value, width) {
  return `${style}${fitTerminalText(value, width)}${ansi.reset}`;
}

export function plain(value, width) {
  return fitTerminalText(value, Math.max(1, width));
}

export function eventLabel(event) {
  if (typeof event === 'string') return event;
  if (event === null || typeof event !== 'object') return 'unknown';
  if (event.type !== 'text') return String(event.type ?? 'unknown');
  return `text:${String(event.event?.type ?? 'unknown')}`;
}

export function effectLabels(effects) {
  return effects.map((effect) => Object.entries(effect)
    .map(([key, value]) => key === 'type' ? String(value) : `${key}=${String(value)}`)
    .join(' '));
}

export function terminalCell(value, width, { current = false, selected = false, editing = false } = {}) {
  const marker = current ? '>' : ' ';
  const selection = selected ? '●' : ' ';
  const content = `${marker}${selection}${plain(value, Math.max(1, width - 2))}`;
  if (editing) return styled(ansi.editing, content, width);
  if (current) return styled(ansi.current, content, width);
  if (selected) return styled(ansi.cyan, content, width);
  return plain(content, width);
}
