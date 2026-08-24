import { fitTerminalText } from './layout.js';

export type TerminalColorLevel = 0 | 1 | 2 | 3;

export interface TerminalCapabilities {
  readonly colorLevel: TerminalColorLevel;
  readonly unicode: boolean;
}

export type TerminalNamedColor =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'bright-black'
  | 'bright-red'
  | 'bright-green'
  | 'bright-yellow'
  | 'bright-blue'
  | 'bright-magenta'
  | 'bright-cyan'
  | 'bright-white';

export interface TerminalIndexedColor {
  readonly index: number;
}

export interface TerminalRGBColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

export type TerminalColor = TerminalNamedColor | TerminalIndexedColor | TerminalRGBColor;

export interface TerminalStyle {
  readonly foreground?: TerminalColor;
  readonly background?: TerminalColor;
  readonly bold?: boolean;
  readonly dim?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
  readonly inverse?: boolean;
  readonly strikethrough?: boolean;
}

export type TerminalThemeRole =
  | 'default'
  | 'accent'
  | 'muted'
  | 'current'
  | 'selected'
  | 'disabled'
  | 'editing'
  | 'success'
  | 'warning'
  | 'danger';

export type TerminalTheme = Readonly<Record<TerminalThemeRole, TerminalStyle>>;
export type TerminalStyleReference = TerminalThemeRole | TerminalStyle;

export interface TerminalCellState {
  readonly current?: boolean;
  readonly selected?: boolean;
  readonly disabled?: boolean;
  readonly editing?: boolean;
}

export interface TerminalAppearanceOptions {
  readonly capabilities?: TerminalCapabilities;
  readonly theme?: Partial<TerminalTheme>;
}

export interface TerminalAppearance {
  readonly capabilities: TerminalCapabilities;
  readonly theme: TerminalTheme;
  readonly reset: string;
  open(style?: TerminalStyleReference): string;
  style(value: string, style?: TerminalStyleReference): string;
  cell(value: string, width: number, state?: TerminalCellState): string;
}

const ANSI_RGB: Readonly<Record<TerminalNamedColor, readonly [number, number, number]>> = Object.freeze({
  black: [0, 0, 0],
  red: [205, 49, 49],
  green: [13, 188, 121],
  yellow: [229, 229, 16],
  blue: [36, 114, 200],
  magenta: [188, 63, 188],
  cyan: [17, 168, 205],
  white: [229, 229, 229],
  'bright-black': [102, 102, 102],
  'bright-red': [241, 76, 76],
  'bright-green': [35, 209, 139],
  'bright-yellow': [245, 245, 67],
  'bright-blue': [59, 142, 234],
  'bright-magenta': [214, 112, 214],
  'bright-cyan': [41, 184, 219],
  'bright-white': [255, 255, 255],
});

const ANSI_NAMES = Object.freeze(Object.keys(ANSI_RGB) as TerminalNamedColor[]);

export const defaultTerminalCapabilities: TerminalCapabilities = Object.freeze({
  colorLevel: 1,
  unicode: true,
});

export const defaultTerminalTheme: TerminalTheme = Object.freeze({
  default: Object.freeze({}),
  accent: Object.freeze({ foreground: 'cyan' }),
  muted: Object.freeze({ dim: true }),
  current: Object.freeze({ foreground: 'black', background: 'cyan' }),
  selected: Object.freeze({ foreground: 'cyan', bold: true }),
  disabled: Object.freeze({ dim: true }),
  editing: Object.freeze({ foreground: 'black', background: 'yellow' }),
  success: Object.freeze({ foreground: 'green' }),
  warning: Object.freeze({ foreground: 'yellow' }),
  danger: Object.freeze({ foreground: 'red' }),
});

export function createTerminalAppearance(
  options: TerminalAppearanceOptions = {},
): TerminalAppearance {
  const capabilities = Object.freeze({
    ...defaultTerminalCapabilities,
    ...options.capabilities,
  });
  const theme = mergeTerminalTheme(options.theme);
  const reset = capabilities.colorLevel === 0 ? '' : '\u001b[0m';

  const open = (reference: TerminalStyleReference = 'default'): string => {
    if (capabilities.colorLevel === 0) return '';
    const style = typeof reference === 'string' ? theme[reference] : reference;
    const codes: string[] = [];
    if (style.bold === true) codes.push('1');
    if (style.dim === true) codes.push('2');
    if (style.italic === true) codes.push('3');
    if (style.underline === true) codes.push('4');
    if (style.inverse === true) codes.push('7');
    if (style.strikethrough === true) codes.push('9');
    if (style.foreground !== undefined) {
      codes.push(...colorCodes(style.foreground, capabilities.colorLevel, false));
    }
    if (style.background !== undefined) {
      codes.push(...colorCodes(style.background, capabilities.colorLevel, true));
    }
    return codes.length === 0 ? '' : `\u001b[${codes.join(';')}m`;
  };

  const style = (value: string, reference: TerminalStyleReference = 'default'): string => {
    const prefix = open(reference);
    return prefix.length === 0 ? value : `${prefix}${value}${reset}`;
  };

  return Object.freeze({
    capabilities,
    theme,
    reset,
    open,
    style,
    cell(value: string, width: number, state: TerminalCellState = {}): string {
      const marker = state.current === true ? '>' : ' ';
      const selection = state.selected === true ? '●' : ' ';
      const content = `${marker}${selection}${fitTerminalText(value, Math.max(0, width - 2))}`;
      const fitted = fitTerminalText(content, width);
      const role = state.disabled === true
        ? 'disabled'
        : state.editing === true
          ? 'editing'
          : state.current === true
            ? 'current'
            : state.selected === true
              ? 'selected'
              : 'default';
      return style(fitted, role);
    },
  });
}

function mergeTerminalTheme(theme: Partial<TerminalTheme> | undefined): TerminalTheme {
  if (theme === undefined) return defaultTerminalTheme;
  return Object.freeze({
    default: Object.freeze({ ...defaultTerminalTheme.default, ...theme.default }),
    accent: Object.freeze({ ...defaultTerminalTheme.accent, ...theme.accent }),
    muted: Object.freeze({ ...defaultTerminalTheme.muted, ...theme.muted }),
    current: Object.freeze({ ...defaultTerminalTheme.current, ...theme.current }),
    selected: Object.freeze({ ...defaultTerminalTheme.selected, ...theme.selected }),
    disabled: Object.freeze({ ...defaultTerminalTheme.disabled, ...theme.disabled }),
    editing: Object.freeze({ ...defaultTerminalTheme.editing, ...theme.editing }),
    success: Object.freeze({ ...defaultTerminalTheme.success, ...theme.success }),
    warning: Object.freeze({ ...defaultTerminalTheme.warning, ...theme.warning }),
    danger: Object.freeze({ ...defaultTerminalTheme.danger, ...theme.danger }),
  });
}

function colorCodes(
  color: TerminalColor,
  level: Exclude<TerminalColorLevel, 0>,
  background: boolean,
): readonly string[] {
  const rgb = toRGB(color);
  if (level === 3) {
    return [background ? '48' : '38', '2', String(rgb[0]), String(rgb[1]), String(rgb[2])];
  }
  if (level === 2) {
    const index = typeof color === 'object' && 'index' in color
      ? clampInteger(color.index, 0, 255)
      : rgbToANSI256(rgb);
    return [background ? '48' : '38', '5', String(index)];
  }
  const index = typeof color === 'string'
    ? ANSI_NAMES.indexOf(color)
    : nearestANSIIndex(rgb);
  const base = index < 8
    ? (background ? 40 : 30) + index
    : (background ? 100 : 90) + index - 8;
  return [String(base)];
}

function toRGB(color: TerminalColor): readonly [number, number, number] {
  if (typeof color === 'string') return ANSI_RGB[color];
  if ('index' in color) return ansi256ToRGB(clampInteger(color.index, 0, 255));
  return [
    clampInteger(color.red, 0, 255),
    clampInteger(color.green, 0, 255),
    clampInteger(color.blue, 0, 255),
  ];
}

function nearestANSIIndex(rgb: readonly [number, number, number]): number {
  let nearest = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < ANSI_NAMES.length; index += 1) {
    const name = ANSI_NAMES[index];
    if (name === undefined) continue;
    const candidate = ANSI_RGB[name];
    const distance = squaredDistance(rgb, candidate);
    if (distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function rgbToANSI256(rgb: readonly [number, number, number]): number {
  const maximum = Math.max(rgb[0], rgb[1], rgb[2]);
  const minimum = Math.min(rgb[0], rgb[1], rgb[2]);
  if (maximum - minimum < 10) {
    if (maximum < 8) return 16;
    if (maximum > 248) return 231;
    return Math.round((maximum - 8) / 247 * 24) + 232;
  }
  const red = Math.round(rgb[0] / 255 * 5);
  const green = Math.round(rgb[1] / 255 * 5);
  const blue = Math.round(rgb[2] / 255 * 5);
  return 16 + 36 * red + 6 * green + blue;
}

function ansi256ToRGB(index: number): readonly [number, number, number] {
  if (index < 16) {
    const name = ANSI_NAMES[index];
    return name === undefined ? [0, 0, 0] : ANSI_RGB[name];
  }
  if (index >= 232) {
    const value = 8 + (index - 232) * 10;
    return [value, value, value];
  }
  const cube = index - 16;
  const red = Math.floor(cube / 36);
  const green = Math.floor(cube % 36 / 6);
  const blue = cube % 6;
  const channel = (value: number): number => value === 0 ? 0 : 55 + value * 40;
  return [channel(red), channel(green), channel(blue)];
}

function squaredDistance(
  left: readonly [number, number, number],
  right: readonly [number, number, number],
): number {
  return (left[0] - right[0]) ** 2
    + (left[1] - right[1]) ** 2
    + (left[2] - right[2]) ** 2;
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}
