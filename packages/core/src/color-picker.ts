import type { Result } from './shared.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';
import { colord, extend, type AnyColor, type Colord, type Plugin } from 'colord';
import cmykPlugin from 'colord/plugins/cmyk';

export type ColorChannel = 'red' | 'green' | 'blue' | 'alpha';
export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'hsv' | 'cmyk' | 'oklch';
export type ColorModel = Exclude<ColorFormat, 'hex'>;
export type ColorCoordinate = ColorChannel | 'hue' | 'saturation' | 'lightness' | 'value' | 'cyan' | 'magenta' | 'yellow' | 'black' | 'chroma';

export interface ColorCoordinateValue {
  readonly coordinate: ColorCoordinate;
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly unit: '' | '%' | '°';
}

export interface ColorAreaValue {
  /** Saturation in the inclusive 0..1 interval. */
  readonly x: number;
  /** Brightness in the inclusive 0..1 interval. */
  readonly y: number;
  readonly hue: number;
  /** Opacity in the inclusive 0..1 interval. */
  readonly alpha: number;
}

export interface ColorValue {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  /** Integer opacity in the inclusive 0..255 interval. */
  readonly alpha: number;
}

export interface ColorPickerState {
  readonly value: ColorValue;
  readonly draft: string | null;
  readonly format: ColorFormat;
  readonly channel: ColorChannel;
}

export interface ColorPickerStateInput {
  readonly value?: ColorValue | string;
  readonly draft?: string | null;
  readonly format?: ColorFormat;
  readonly channel?: ColorChannel;
}

export interface ColorPickerPolicies {
  readonly allowAlpha?: boolean;
  readonly channelStep?: number;
  readonly alphaStep?: number;
}

export type ColorPickerEvent =
  | 'commit' | 'cancel' | 'increment' | 'decrement'
  | { readonly type: 'input'; readonly text: string }
  | { readonly type: 'set-color'; readonly value: ColorValue | string }
  | { readonly type: 'set-channel'; readonly channel: ColorChannel; readonly value: number }
  | { readonly type: 'set-coordinate'; readonly format: ColorModel; readonly coordinate: ColorCoordinate; readonly value: number }
  | { readonly type: 'set-area'; readonly x: number; readonly y: number }
  | { readonly type: 'set-hue'; readonly value: number }
  | { readonly type: 'set-alpha'; readonly value: number }
  | { readonly type: 'focus-channel'; readonly channel: ColorChannel }
  | { readonly type: 'set-format'; readonly format: ColorFormat };

export type ColorPickerCommand =
  | { readonly type: 'color-change'; readonly value: ColorValue }
  | { readonly type: 'announce-color'; readonly text: string };

export interface ColorPickerUpdate {
  readonly state: ColorPickerState;
  readonly commands: readonly ColorPickerCommand[];
}

export function createColorValue(red: number, green: number, blue: number, alpha = 255): Result<ColorValue> {
  const entries = { red, green, blue, alpha } as const;
  for (const [channel, value] of Object.entries(entries)) {
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      return fail('construction', 'color-channel-out-of-range', 'Color channels must be integers from 0 through 255.', { channel, value });
    }
  }
  return ok(Object.freeze({ red, green, blue, alpha }));
}

export function parseColorValue(text: string): Result<ColorValue> {
  const source = text.trim();
  const hex = /^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.exec(source)?.[1];
  if (hex !== undefined) {
    const expanded = hex.length <= 4 ? [...hex].map((character) => character + character).join('') : hex;
    return createColorValue(
      Number.parseInt(expanded.slice(0, 2), 16),
      Number.parseInt(expanded.slice(2, 4), 16),
      Number.parseInt(expanded.slice(4, 6), 16),
      expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) : 255,
    );
  }
  const rgb = parseRgbFunction(source);
  if (rgb !== null) return rgb;
  const hsl = parseHslFunction(source);
  if (hsl !== null) return hsl;
  const hsv = parseHsvFunction(source);
  if (hsv !== null) return hsv;
  const cmyk = parseCmykFunction(source);
  if (cmyk !== null) return cmyk;
  const oklch = parseOklchFunction(source);
  if (oklch !== null) return oklch;
  return fail('construction', 'color-text-invalid', 'Color text must use hex, rgb(), hsl(), hsv(), device-cmyk(), or oklch().', { text });
}

export function formatColorValue(value: ColorValue, format: ColorFormat = 'hex'): Result<string> {
  const valid = createColorValue(value.red, value.green, value.blue, value.alpha);
  if (!valid.ok) return valid;
  if (format === 'hex') {
    const hex = [value.red, value.green, value.blue, ...(value.alpha === 255 ? [] : [value.alpha])]
      .map((channel) => channel.toString(16).padStart(2, '0')).join('');
    return ok(`#${hex}`);
  }
  if (!isFormat(format)) return fail('construction', 'color-format-invalid', 'Color format is unsupported.');
  const converted = colorEngine({ r: value.red, g: value.green, b: value.blue, a: value.alpha / 255 });
  if (format === 'rgb') return ok(converted.toRgbString());
  if (format === 'hsl') return ok(converted.toHslString());
  if (format === 'hsv') {
    const hsv = converted.toHsv();
    return ok(`hsv(${formatNumber(hsv.h)} ${formatNumber(hsv.s)}% ${formatNumber(hsv.v)}%${formatAlpha(hsv.a)})`);
  }
  if (format === 'cmyk') return ok(converted.toCmykString());
  const oklch = rgbToOklch(value);
  return ok(`oklch(${formatNumber(oklch.lightness * 100, 2)}% ${formatNumber(oklch.chroma, 4)} ${formatNumber(oklch.hue, 2)}${formatAlpha(value.alpha / 255)})`);
}

export function getColorAreaValue(value: ColorValue): Result<ColorAreaValue> {
  const valid = createColorValue(value.red, value.green, value.blue, value.alpha);
  if (!valid.ok) return valid;
  const hsv = colorEngine({ r: value.red, g: value.green, b: value.blue, a: value.alpha / 255 }).toHsv();
  return ok(Object.freeze({ x: hsv.s / 100, y: hsv.v / 100, hue: hsv.h, alpha: value.alpha / 255 }));
}

export function getColorCoordinates(value: ColorValue, format: ColorFormat): Result<readonly ColorCoordinateValue[]> {
  const valid = createColorValue(value.red, value.green, value.blue, value.alpha);
  if (!valid.ok) return valid;
  if (!isFormat(format)) return fail('construction', 'color-format-invalid', 'Color format is unsupported.');
  if (format === 'hex') return ok(Object.freeze([]));
  const converted = colorEngine({ r: value.red, g: value.green, b: value.blue, a: value.alpha / 255 });
  const alpha = coordinate('alpha', 'Alpha', value.alpha / 255 * 100, 0, 100, 1, '%');
  if (format === 'rgb') {
    return ok(Object.freeze([
      coordinate('red', 'Red', value.red, 0, 255, 1),
      coordinate('green', 'Green', value.green, 0, 255, 1),
      coordinate('blue', 'Blue', value.blue, 0, 255, 1),
      alpha,
    ]));
  }
  if (format === 'hsl') {
    const hsl = converted.toHsl();
    return ok(Object.freeze([
      coordinate('hue', 'Hue', hsl.h, 0, 360, 1, '°'),
      coordinate('saturation', 'Saturation', hsl.s, 0, 100, 1, '%'),
      coordinate('lightness', 'Lightness', hsl.l, 0, 100, 1, '%'),
      alpha,
    ]));
  }
  if (format === 'hsv') {
    const hsv = converted.toHsv();
    return ok(Object.freeze([
      coordinate('hue', 'Hue', hsv.h, 0, 360, 1, '°'),
      coordinate('saturation', 'Saturation', hsv.s, 0, 100, 1, '%'),
      coordinate('value', 'Value', hsv.v, 0, 100, 1, '%'),
      alpha,
    ]));
  }
  if (format === 'cmyk') {
    const cmyk = converted.toCmyk();
    return ok(Object.freeze([
      coordinate('cyan', 'Cyan', cmyk.c, 0, 100, 1, '%'),
      coordinate('magenta', 'Magenta', cmyk.m, 0, 100, 1, '%'),
      coordinate('yellow', 'Yellow', cmyk.y, 0, 100, 1, '%'),
      coordinate('black', 'Black', cmyk.k, 0, 100, 1, '%'),
      alpha,
    ]));
  }
  const oklch = rgbToOklch(value);
  return ok(Object.freeze([
    coordinate('lightness', 'Lightness', oklch.lightness * 100, 0, 100, 0.1, '%'),
    coordinate('chroma', 'Chroma', oklch.chroma, 0, 0.4, 0.001),
    coordinate('hue', 'Hue', oklch.hue, 0, 360, 0.1, '°'),
    alpha,
  ]));
}

export function setColorCoordinate(value: ColorValue, format: ColorModel, name: ColorCoordinate, next: number): Result<ColorValue> {
  if (!Number.isFinite(next)) return fail('construction', 'color-coordinate-invalid', 'Color coordinates must be finite numbers.', { format, coordinate: name, value: next });
  const coordinates = getColorCoordinates(value, format);
  if (!coordinates.ok) return coordinates;
  const selected = coordinates.value.find((entry) => entry.coordinate === name);
  if (selected === undefined || next < selected.min || next > selected.max) return fail('construction', 'color-coordinate-out-of-range', 'Color coordinate is unavailable or outside its supported range.', { format, coordinate: name, value: next });
  if (name === 'alpha') return createColorValue(value.red, value.green, value.blue, Math.round(next / 100 * 255));
  if (format === 'rgb') return createColorValue(name === 'red' ? Math.round(next) : value.red, name === 'green' ? Math.round(next) : value.green, name === 'blue' ? Math.round(next) : value.blue, value.alpha);
  const engine = colorEngine({ r: value.red, g: value.green, b: value.blue, a: value.alpha / 255 });
  if (format === 'hsl') {
    const current = engine.toHsl();
    return fromEngineColor({ h: name === 'hue' ? next : current.h, s: name === 'saturation' ? next : current.s, l: name === 'lightness' ? next : current.l, a: current.a }, format);
  }
  if (format === 'hsv') {
    const current = engine.toHsv();
    return fromEngineColor({ h: name === 'hue' ? next : current.h, s: name === 'saturation' ? next : current.s, v: name === 'value' ? next : current.v, a: current.a }, format);
  }
  if (format === 'cmyk') {
    const current = engine.toCmyk();
    return fromEngineColor({ c: name === 'cyan' ? next : current.c, m: name === 'magenta' ? next : current.m, y: name === 'yellow' ? next : current.y, k: name === 'black' ? next : current.k, a: current.a }, format);
  }
  const current = rgbToOklch(value);
  const rgb = oklchToRgb(name === 'lightness' ? next / 100 : current.lightness, name === 'chroma' ? next : current.chroma, name === 'hue' ? next : current.hue);
  return rgb === null
    ? fail('construction', 'color-out-of-gamut', 'OKLCH color is outside the sRGB gamut stored by ColorValue.', { coordinate: name, value: next })
    : createColorValue(rgb.red, rgb.green, rgb.blue, value.alpha);
}

export function createColorPickerState(input: ColorPickerStateInput = {}, policies: ColorPickerPolicies = {}): Result<ColorPickerState> {
  const validPolicies = validatePolicies(policies);
  if (!validPolicies.ok) return validPolicies;
  const value = typeof input.value === 'string'
    ? parseColorValue(input.value)
    : input.value === undefined ? createColorValue(0, 0, 0) : createColorValue(input.value.red, input.value.green, input.value.blue, input.value.alpha);
  if (!value.ok) return value;
  if (policies.allowAlpha === false && value.value.alpha !== 255) return fail('construction', 'color-alpha-disabled', 'Alpha must be opaque when alpha editing is disabled.');
  const format = input.format ?? 'hex';
  if (!isFormat(format)) return fail('construction', 'color-format-invalid', 'Color format is unsupported.');
  const channel = input.channel ?? 'red';
  if (!isChannel(channel)) return fail('construction', 'color-channel-invalid', 'Color channel is unsupported.');
  if (channel === 'alpha' && policies.allowAlpha === false) return fail('construction', 'color-alpha-disabled', 'Alpha cannot be active when alpha editing is disabled.');
  if (input.draft !== undefined && input.draft !== null && typeof input.draft !== 'string') return fail('construction', 'color-draft-invalid', 'Color draft must be text or null.');
  return ok(Object.freeze({ value: value.value, draft: input.draft ?? null, format, channel }));
}

export function applyColorPickerEvent(state: ColorPickerState, event: ColorPickerEvent, policies: ColorPickerPolicies = {}): Result<ColorPickerUpdate> {
  const valid = createColorPickerState(state, policies);
  if (!valid.ok) return fail('transition-rejection', valid.error.code, valid.error.message, valid.error.details);
  if (event === 'cancel') return createMachineUpdate(colorState(state, { draft: null }));
  if (event === 'commit') {
    if (state.draft === null) return createMachineUpdate(state);
    const parsed = parseColorValue(state.draft);
    if (!parsed.ok) return fail('transition-rejection', parsed.error.code, parsed.error.message, parsed.error.details);
    return commit(state, parsed.value, policies);
  }
  if (event === 'increment' || event === 'decrement') {
    const step = state.channel === 'alpha' ? policies.alphaStep ?? 17 : policies.channelStep ?? 1;
    const value = Math.min(255, Math.max(0, state.value[state.channel] + (event === 'increment' ? step : -step)));
    return commit(state, withChannel(state.value, state.channel, value), policies);
  }
  if (event.type === 'input') return createMachineUpdate(colorState(state, { draft: event.text }));
  if (event.type === 'set-format') {
    if (!isFormat(event.format)) return fail('transition-rejection', 'color-format-invalid', 'Color format is unsupported.');
    return createMachineUpdate(colorState(state, { format: event.format, draft: null }));
  }
  if (event.type === 'focus-channel') {
    if (!isChannel(event.channel)) return fail('transition-rejection', 'color-channel-invalid', 'Color channel is unsupported.');
    if (event.channel === 'alpha' && policies.allowAlpha === false) return fail('transition-rejection', 'color-alpha-disabled', 'Alpha editing is disabled.');
    return createMachineUpdate(colorState(state, { channel: event.channel }));
  }
  if (event.type === 'set-channel') {
    const channel = event.channel;
    if (!isChannel(channel) || !Number.isInteger(event.value) || event.value < 0 || event.value > 255) return fail('transition-rejection', 'color-channel-out-of-range', 'Color channels must be integers from 0 through 255.');
    return commit(colorState(state, { channel }), withChannel(state.value, channel, event.value), policies);
  }
  if (event.type === 'set-coordinate') {
    const value = setColorCoordinate(state.value, event.format, event.coordinate, event.value);
    return value.ok ? commit(state, value.value, policies) : fail('transition-rejection', value.error.code, value.error.message, value.error.details);
  }
  if (event.type === 'set-area') {
    if (!unitInterval(event.x) || !unitInterval(event.y)) return fail('transition-rejection', 'color-area-out-of-range', 'Color area coordinates must be from 0 through 1.');
    const current = colorEngine({ r: state.value.red, g: state.value.green, b: state.value.blue, a: state.value.alpha / 255 }).toHsv();
    const value = fromEngineColor({ h: current.h, s: event.x * 100, v: event.y * 100, a: current.a }, 'hsv');
    return value.ok ? commit(state, value.value, policies) : fail('transition-rejection', value.error.code, value.error.message, value.error.details);
  }
  if (event.type === 'set-hue') {
    if (!Number.isFinite(event.value) || event.value < 0 || event.value > 360) return fail('transition-rejection', 'color-hue-out-of-range', 'Hue must be from 0 through 360.');
    const current = colorEngine({ r: state.value.red, g: state.value.green, b: state.value.blue, a: state.value.alpha / 255 }).toHsv();
    const value = fromEngineColor({ h: event.value, s: current.s, v: current.v, a: current.a }, 'hsv');
    return value.ok ? commit(state, value.value, policies) : fail('transition-rejection', value.error.code, value.error.message, value.error.details);
  }
  if (event.type === 'set-alpha') {
    if (!unitInterval(event.value)) return fail('transition-rejection', 'color-alpha-out-of-range', 'Alpha must be from 0 through 1.');
    return commit(state, Object.freeze({ ...state.value, alpha: Math.round(event.value * 255) }), policies);
  }
  const value = typeof event.value === 'string'
    ? parseColorValue(event.value)
    : createColorValue(event.value.red, event.value.green, event.value.blue, event.value.alpha);
  if (!value.ok) return fail('transition-rejection', value.error.code, value.error.message, value.error.details);
  return commit(state, value.value, policies);
}

function commit(state: ColorPickerState, value: ColorValue, policies: ColorPickerPolicies): Result<ColorPickerUpdate> {
  if (policies.allowAlpha === false && value.alpha !== 255) return fail('transition-rejection', 'color-alpha-disabled', 'Alpha editing is disabled.');
  const next = colorState(state, { value, draft: null });
  if (sameColor(state.value, value) && state.draft === null) return createMachineUpdate(next);
  const text = formatColorValue(value, state.format);
  if (!text.ok) return fail('transition-rejection', text.error.code, text.error.message, text.error.details);
  return createMachineUpdate(next, [{ type: 'color-change', value }, { type: 'announce-color', text: text.value }]);
}

function withChannel(value: ColorValue, channel: ColorChannel, next: number): ColorValue {
  return Object.freeze({ ...value, [channel]: next });
}

function colorState(state: ColorPickerState, patch: Partial<ColorPickerState>): ColorPickerState {
  return Object.freeze({
    value: patch.value ?? state.value,
    draft: patch.draft === undefined ? state.draft : patch.draft,
    format: patch.format ?? state.format,
    channel: patch.channel ?? state.channel,
  });
}

function validatePolicies(policies: ColorPickerPolicies): Result<true> {
  for (const [name, value] of [['channelStep', policies.channelStep], ['alphaStep', policies.alphaStep]] as const) {
    if (value !== undefined && (!Number.isInteger(value) || value <= 0 || value > 255)) return fail('construction', 'color-step-invalid', 'Color channel steps must be positive integers no greater than 255.', { name, value });
  }
  return ok(true);
}

function sameColor(left: ColorValue, right: ColorValue): boolean {
  return left.red === right.red && left.green === right.green && left.blue === right.blue && left.alpha === right.alpha;
}

function isChannel(value: string): value is ColorChannel {
  return value === 'red' || value === 'green' || value === 'blue' || value === 'alpha';
}

function isFormat(value: string): value is ColorFormat {
  return value === 'hex' || value === 'rgb' || value === 'hsl' || value === 'hsv' || value === 'cmyk' || value === 'oklch';
}

function coordinate(name: ColorCoordinate, label: string, value: number, min: number, max: number, step: number, unit: ColorCoordinateValue['unit'] = ''): ColorCoordinateValue {
  return Object.freeze({ coordinate: name, label, value: Number(value.toFixed(step < 0.01 ? 4 : step < 1 ? 2 : 0)), min, max, step, unit });
}

function unitInterval(value: number): boolean { return Number.isFinite(value) && value >= 0 && value <= 1; }

let colorEngineReady = false;

function colorEngine(value: AnyColor): Colord {
  if (!colorEngineReady) {
    extend([cmykPlugin as unknown as Plugin]);
    colorEngineReady = true;
  }
  return colord(value);
}

function parseRgbFunction(source: string): Result<ColorValue> | null {
  const call = /^(rgba?)\((.*)\)$/i.exec(source);
  if (call === null) return null;
  const components = splitFunctionalComponents(call[2] ?? '');
  if (components === null || components.values.length !== 3) return invalidColor(source, 'RGB requires three channels and an optional alpha channel.');
  const channels = components.values.map(parseRgbChannel);
  const alpha = parseAlpha(components.alpha);
  if (channels.some((value) => value === null) || alpha === null) return invalidColor(source, 'RGB channels must be 0..255 or 0%..100%, and alpha must be 0..1 or 0%..100%.');
  return createColorValue(channels[0] as number, channels[1] as number, channels[2] as number, alpha);
}

function parseHslFunction(source: string): Result<ColorValue> | null {
  const call = /^(hsla?)\((.*)\)$/i.exec(source);
  if (call === null) return null;
  const components = splitFunctionalComponents(call[2] ?? '');
  if (components === null || components.values.length !== 3) return invalidColor(source, 'HSL requires hue, saturation, lightness, and an optional alpha channel.');
  const hue = parseHue(components.values[0] ?? '');
  const saturation = parsePercentage(components.values[1] ?? '');
  const lightness = parsePercentage(components.values[2] ?? '');
  const alpha = parseAlpha(components.alpha);
  if (hue === null || saturation === null || lightness === null || alpha === null) return invalidColor(source, 'HSL saturation and lightness must be 0%..100%, with a valid hue and alpha.');
  return fromEngineColor({ h: hue, s: saturation, l: lightness, a: alpha / 255 }, source);
}

function parseHsvFunction(source: string): Result<ColorValue> | null {
  const call = /^hsva?\((.*)\)$/i.exec(source);
  if (call === null) return null;
  const components = splitFunctionalComponents(call[1] ?? '');
  if (components === null || components.values.length !== 3) return invalidColor(source, 'HSV requires hue, saturation, value, and an optional alpha channel.');
  const hue = parseHue(components.values[0] ?? '');
  const saturation = parsePercentage(components.values[1] ?? '');
  const value = parsePercentage(components.values[2] ?? '');
  const alpha = parseAlpha(components.alpha);
  if (hue === null || saturation === null || value === null || alpha === null) return invalidColor(source, 'HSV saturation and value must be 0%..100%, with a valid hue and alpha.');
  return fromEngineColor({ h: hue, s: saturation, v: value, a: alpha / 255 }, source);
}

function parseCmykFunction(source: string): Result<ColorValue> | null {
  const call = /^device-cmyk\((.*)\)$/i.exec(source);
  if (call === null) return null;
  const components = splitFunctionalComponents(call[1] ?? '');
  if (components === null || components.values.length !== 4) return invalidColor(source, 'CMYK requires cyan, magenta, yellow, black, and an optional alpha channel.');
  const channels = components.values.map(parsePercentage);
  const alpha = parseAlpha(components.alpha);
  if (channels.some((value) => value === null) || alpha === null) return invalidColor(source, 'CMYK channels must be percentages from 0% through 100%.');
  return fromEngineColor({ c: channels[0] as number, m: channels[1] as number, y: channels[2] as number, k: channels[3] as number, a: alpha / 255 }, source);
}

function parseOklchFunction(source: string): Result<ColorValue> | null {
  const call = /^oklch\((.*)\)$/i.exec(source);
  if (call === null) return null;
  const components = splitFunctionalComponents(call[1] ?? '');
  if (components === null || components.values.length !== 3) return invalidColor(source, 'OKLCH requires lightness, chroma, hue, and an optional alpha channel.');
  const lightness = parseLightness(components.values[0] ?? '');
  const chroma = parseFinite(components.values[1] ?? '');
  const hue = parseHue(components.values[2] ?? '');
  const alpha = parseAlpha(components.alpha);
  if (lightness === null || chroma === null || chroma < 0 || hue === null || alpha === null) return invalidColor(source, 'OKLCH requires lightness 0..1 or 0%..100%, non-negative chroma, a valid hue, and alpha.');
  const rgb = oklchToRgb(lightness, chroma, hue);
  if (rgb === null) return fail('construction', 'color-out-of-gamut', 'OKLCH color is outside the sRGB gamut stored by ColorValue.', { text: source });
  return createColorValue(rgb.red, rgb.green, rgb.blue, alpha);
}

function fromEngineColor(value: AnyColor, source: string): Result<ColorValue> {
  const parsed = colorEngine(value);
  if (!parsed.isValid()) return invalidColor(source, 'Color conversion failed.');
  const rgb = parsed.toRgb();
  return createColorValue(rgb.r, rgb.g, rgb.b, Math.round(rgb.a * 255));
}

function splitFunctionalComponents(body: string): { readonly values: readonly string[]; readonly alpha?: string } | null {
  const slash = body.split('/');
  if (slash.length > 2) return null;
  const beforeAlpha = slash[0]?.trim() ?? '';
  let values: string[];
  let alpha = slash[1]?.trim();
  if (beforeAlpha.includes(',')) {
    values = beforeAlpha.split(',').map((value) => value.trim());
    if (alpha === undefined && values.length > 3) alpha = values.pop();
  } else {
    values = beforeAlpha.split(/\s+/).filter(Boolean);
  }
  if (values.some((value) => value.length === 0) || alpha === '') return null;
  return alpha === undefined ? { values } : { values, alpha };
}

function parseRgbChannel(token: string): number | null {
  if (token.endsWith('%')) {
    const percentage = parsePercentage(token);
    return percentage === null ? null : Math.round(percentage / 100 * 255);
  }
  const value = parseFinite(token);
  return value !== null && Number.isInteger(value) && value >= 0 && value <= 255 ? value : null;
}

function parseAlpha(token: string | undefined): number | null {
  if (token === undefined) return 255;
  if (token.endsWith('%')) {
    const percentage = parsePercentage(token);
    return percentage === null ? null : Math.round(percentage / 100 * 255);
  }
  const value = parseFinite(token);
  return value !== null && value >= 0 && value <= 1 ? Math.round(value * 255) : null;
}

function parsePercentage(token: string): number | null {
  if (!token.endsWith('%')) return null;
  const value = parseFinite(token.slice(0, -1));
  return value !== null && value >= 0 && value <= 100 ? value : null;
}

function parseLightness(token: string): number | null {
  if (token.endsWith('%')) {
    const percentage = parsePercentage(token);
    return percentage === null ? null : percentage / 100;
  }
  const value = parseFinite(token);
  return value !== null && value >= 0 && value <= 1 ? value : null;
}

function parseHue(token: string): number | null {
  const match = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(deg|grad|rad|turn)?$/i.exec(token);
  if (match === null) return null;
  const value = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  const degrees = unit === 'turn' ? value * 360 : unit === 'rad' ? value * 180 / Math.PI : unit === 'grad' ? value * 0.9 : value;
  return normalizeHue(degrees);
}

function parseFinite(token: string): number | null {
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) return null;
  const value = Number(token);
  return Number.isFinite(value) ? value : null;
}

function invalidColor(text: string, message: string): Result<ColorValue> {
  return fail('construction', 'color-text-invalid', message, { text });
}

function formatNumber(value: number, precision = 3): string {
  return String(Number(value.toFixed(precision)));
}

function formatAlpha(alpha: number): string {
  return alpha === 1 ? '' : ` / ${formatNumber(alpha)}`;
}

function normalizeHue(value: number): number {
  return (value % 360 + 360) % 360;
}

interface OklchColor {
  readonly lightness: number;
  readonly chroma: number;
  readonly hue: number;
}

function rgbToOklch(value: ColorValue): OklchColor {
  const red = srgbToLinear(value.red / 255);
  const green = srgbToLinear(value.green / 255);
  const blue = srgbToLinear(value.blue / 255);
  const lRoot = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const mRoot = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const sRoot = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
  const lightness = 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot;
  const a = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot;
  const b = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot;
  const chroma = Math.hypot(a, b);
  return { lightness, chroma, hue: chroma < 1e-7 ? 0 : normalizeHue(Math.atan2(b, a) * 180 / Math.PI) };
}

function oklchToRgb(lightness: number, chroma: number, hue: number): { readonly red: number; readonly green: number; readonly blue: number } | null {
  const radians = hue * Math.PI / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  if (linear.some((channel) => channel < -1e-5 || channel > 1.00001)) return null;
  const channels = linear.map((channel) => Math.round(linearToSrgb(Math.min(1, Math.max(0, channel))) * 255));
  return { red: channels[0] as number, green: channels[1] as number, blue: channels[2] as number };
}

function srgbToLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value: number): number {
  return value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
}
