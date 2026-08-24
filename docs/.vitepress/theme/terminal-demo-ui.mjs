import { fitTerminalText } from '@sectile/terminal/layout';
import { createTerminalAppearance } from '@sectile/terminal/appearance';

export const appearance = createTerminalAppearance({
  capabilities: { colorLevel: 1, unicode: true },
});

export const ansi = Object.freeze({
  reset: appearance.reset,
  bold: appearance.open({ bold: true }),
  dim: appearance.open('muted'),
  cyan: appearance.open('accent'),
  yellow: appearance.open('warning'),
  inverse: appearance.open({ inverse: true }),
  current: appearance.open('current'),
  editing: appearance.open('editing'),
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
  return appearance.cell(value, width, { current, selected, editing });
}
