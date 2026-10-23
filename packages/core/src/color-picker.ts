import { unwrap } from './result.js';
import type { Result } from './shared.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';
import {
  deviceCmykToSrgb,
  hslToSrgb,
  hsvToSrgb,
  oklchToSrgb,
  rgba8ToSrgb,
  srgbToDeviceCmyk,
  srgbToHsl,
  srgbToHsv,
  srgbToOklch,
  srgbToRgba8,
  tryCreateRgba8,
  type Rgba8,
} from './structures/color.js';
import { formatColorText, parseColorText } from './editing/color-text.js';

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

/** Integer RGBA channels in the inclusive 0..255 interval. */
export type ColorValue = Rgba8;
/** Exact editing coordinates; RGB8 remains the accepted color value. */
export type ColorAreaSelection = Omit<ColorAreaValue, 'alpha'>;

export interface ColorPickerState {
  readonly value: ColorValue;
  readonly area?: ColorAreaSelection;
  readonly draft: string | null;
  readonly format: ColorFormat;
  readonly channel: ColorChannel;
}

export interface ColorPickerStateInput {
  readonly value?: ColorValue | string;
  readonly area?: ColorAreaSelection;
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

export function createColorValue(red: number, green: number, blue: number, alpha = 255): ColorValue {
  return unwrap(tryCreateColorValue(red, green, blue, alpha));
}

export function tryCreateColorValue(red: number, green: number, blue: number, alpha = 255): Result<ColorValue> {
  return tryCreateRgba8(red, green, blue, alpha);
}

export function parseColorValue(text: string): Result<ColorValue> { return parseColorText(text); }

export function formatColorValue(value: ColorValue, format: ColorFormat = 'hex'): Result<string> {
  return isFormat(format) ? formatColorText(value, format) : fail('construction', 'color-format-invalid', 'Color format is unsupported.');
}

export function getColorAreaValue(value: ColorValue, selection?: ColorAreaSelection): Result<ColorAreaValue> {
  if (!validColorValue(value)) {
    const invalid = tryCreateColorValue(value.red, value.green, value.blue, value.alpha);
    if (!invalid.ok) return invalid;
  }
  if (selection !== undefined) {
    if (!unitInterval(selection.x) || !unitInterval(selection.y) || !Number.isFinite(selection.hue) || selection.hue < 0 || selection.hue > 360)
      return fail('construction', 'color-area-out-of-range', 'Color area selection must have bounded finite coordinates.');
    const projected = colorFromArea(selection, value.alpha / 255);
    if (!sameRGB(value, projected)) return fail('construction', 'color-coordinate-invalid', 'Color area selection must represent the accepted RGB value.');
    return ok(Object.freeze({ x: selection.x, y: selection.y, hue: selection.hue, alpha: value.alpha / 255 }));
  }
  const hsv = srgbToHsv(rgba8ToSrgb(value));
  return ok(Object.freeze({ x: hsv.saturation, y: hsv.value, hue: hsv.hue, alpha: value.alpha / 255 }));
}

export function getColorCoordinates(value: ColorValue, format: ColorFormat, selection?: ColorAreaSelection): Result<readonly ColorCoordinateValue[]> {
  if (!validColorValue(value)) {
    const invalid = tryCreateColorValue(value.red, value.green, value.blue, value.alpha);
    if (!invalid.ok) return invalid;
  }
  if (!isFormat(format)) return fail('construction', 'color-format-invalid', 'Color format is unsupported.');
  if (format === 'hex') return ok(Object.freeze([]));
  const alpha = coordinate('alpha', 'Alpha', value.alpha / 255 * 100, 0, 100, 1, '%');
  if (format === 'rgb') {
    return ok(Object.freeze([
      coordinate('red', 'Red', value.red, 0, 255, 1),
      coordinate('green', 'Green', value.green, 0, 255, 1),
      coordinate('blue', 'Blue', value.blue, 0, 255, 1),
      alpha,
    ]));
  }
  if (format === 'hsv') {
    const area = getColorAreaValue(value, selection);
    if (!area.ok) return area;
    return ok(Object.freeze([
      coordinate('hue', 'Hue', area.value.hue, 0, 360, 1, '°'),
      coordinate('saturation', 'Saturation', area.value.x * 100, 0, 100, 1, '%'),
      coordinate('value', 'Value', area.value.y * 100, 0, 100, 1, '%'),
      alpha,
    ]));
  }
  const converted = rgba8ToSrgb(value);
  if (format === 'hsl') {
    const hsl = srgbToHsl(converted);
    return ok(Object.freeze([
      coordinate('hue', 'Hue', hsl.hue, 0, 360, 1, '°'),
      coordinate('saturation', 'Saturation', hsl.saturation * 100, 0, 100, 1, '%'),
      coordinate('lightness', 'Lightness', hsl.lightness * 100, 0, 100, 1, '%'),
      alpha,
    ]));
  }
  if (format === 'cmyk') {
    const cmyk = srgbToDeviceCmyk(converted);
    return ok(Object.freeze([
      coordinate('cyan', 'Cyan', cmyk.cyan * 100, 0, 100, 1, '%'),
      coordinate('magenta', 'Magenta', cmyk.magenta * 100, 0, 100, 1, '%'),
      coordinate('yellow', 'Yellow', cmyk.yellow * 100, 0, 100, 1, '%'),
      coordinate('black', 'Black', cmyk.black * 100, 0, 100, 1, '%'),
      alpha,
    ]));
  }
  const oklch = srgbToOklch(converted);
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
  if (name === 'alpha') return tryCreateColorValue(value.red, value.green, value.blue, Math.round(next / 100 * 255));
  if (format === 'rgb') return tryCreateColorValue(name === 'red' ? Math.round(next) : value.red, name === 'green' ? Math.round(next) : value.green, name === 'blue' ? Math.round(next) : value.blue, value.alpha);
  const currentSrgb = rgba8ToSrgb(value);
  if (format === 'hsl') {
    const current = srgbToHsl(currentSrgb);
    return ok(srgbToRgba8(hslToSrgb({ hue: name === 'hue' ? next : current.hue, saturation: name === 'saturation' ? next / 100 : current.saturation, lightness: name === 'lightness' ? next / 100 : current.lightness, alpha: current.alpha })));
  }
  if (format === 'hsv') {
    const current = srgbToHsv(currentSrgb);
    return ok(srgbToRgba8(hsvToSrgb({ hue: name === 'hue' ? next : current.hue, saturation: name === 'saturation' ? next / 100 : current.saturation, value: name === 'value' ? next / 100 : current.value, alpha: current.alpha })));
  }
  if (format === 'cmyk') {
    const current = srgbToDeviceCmyk(currentSrgb);
    return ok(srgbToRgba8(deviceCmykToSrgb({ cyan: name === 'cyan' ? next / 100 : current.cyan, magenta: name === 'magenta' ? next / 100 : current.magenta, yellow: name === 'yellow' ? next / 100 : current.yellow, black: name === 'black' ? next / 100 : current.black, alpha: current.alpha })));
  }
  const current = srgbToOklch(currentSrgb);
  const rgb = oklchToSrgb({ lightness: name === 'lightness' ? next / 100 : current.lightness, chroma: name === 'chroma' ? next : current.chroma, hue: name === 'hue' ? next : current.hue, alpha: current.alpha });
  return rgb.ok ? ok(srgbToRgba8(rgb.value)) : fail('construction', rgb.error.code, rgb.error.message, { coordinate: name, value: next });
}

export function createColorPickerState(input: ColorPickerStateInput = {}, policies: ColorPickerPolicies = {}): ColorPickerState {
  return unwrap(tryCreateColorPickerState(input, policies));
}

export function tryCreateColorPickerState(input: ColorPickerStateInput = {}, policies: ColorPickerPolicies = {}): Result<ColorPickerState> {
  const validPolicies = validatePolicies(policies);
  if (!validPolicies.ok) return validPolicies;
  const value = typeof input.value === 'string'
    ? parseColorValue(input.value)
    : input.value === undefined ? tryCreateColorValue(0, 0, 0) : tryCreateColorValue(input.value.red, input.value.green, input.value.blue, input.value.alpha);
  if (!value.ok) return value;
  if (policies.allowAlpha === false && value.value.alpha !== 255) return fail('construction', 'color-alpha-disabled', 'Alpha must be opaque when alpha editing is disabled.');
  const format = input.format ?? 'hex';
  if (!isFormat(format)) return fail('construction', 'color-format-invalid', 'Color format is unsupported.');
  const channel = input.channel ?? 'red';
  if (!isChannel(channel)) return fail('construction', 'color-channel-invalid', 'Color channel is unsupported.');
  if (channel === 'alpha' && policies.allowAlpha === false) return fail('construction', 'color-alpha-disabled', 'Alpha cannot be active when alpha editing is disabled.');
  if (input.draft !== undefined && input.draft !== null && typeof input.draft !== 'string') return fail('construction', 'color-draft-invalid', 'Color draft must be text or null.');
  const area = getColorAreaValue(value.value, input.area);
  if (!area.ok) return area;
  return ok(Object.freeze({ value: value.value, area: areaSelection(area.value), draft: input.draft ?? null, format, channel }));
}

/** Reconcile owner values without discarding a matching current or proposed area selection. */
export function reconcileColorPickerState(previous: ColorPickerState, input: ColorPickerStateInput,
  policies: ColorPickerPolicies = {}, proposal?: ColorPickerState): Result<ColorPickerState> {
  const { area: _area, ...base } = previous;
  const next = tryCreateColorPickerState({ ...base, ...input }, policies);
  if (!next.ok || input.area !== undefined) return next;
  const retained = proposal !== undefined && sameRGB(proposal.value, next.value.value) ? proposal : previous;
  if (!sameRGB(retained.value, next.value.value) || retained.area === undefined) return next;
  return tryCreateColorPickerState({ ...next.value, area: retained.area }, policies);
}

export function applyColorPickerEvent(state: ColorPickerState, event: ColorPickerEvent, policies: ColorPickerPolicies = {}): Result<ColorPickerUpdate> {
  const valid = tryCreateColorPickerState(state, policies);
  if (!valid.ok) return fail('transition-rejection', valid.error.code, valid.error.message, valid.error.details);
  // Admission always materializes area, including structural states without it.
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
    if (event.format === 'hsv' && (event.coordinate === 'hue' || event.coordinate === 'saturation' || event.coordinate === 'value')) {
      const limit = event.coordinate === 'hue' ? 360 : 100;
      if (!Number.isFinite(event.value) || event.value < 0 || event.value > limit)
        return fail('transition-rejection', 'color-coordinate-out-of-range', 'Color coordinate is outside its supported range.');
      const current = valid.value.area!;
      const area = { x: event.coordinate === 'saturation' ? event.value / 100 : current.x,
        y: event.coordinate === 'value' ? event.value / 100 : current.y, hue: event.coordinate === 'hue' ? event.value : current.hue };
      return commit(state, colorFromArea(area, state.value.alpha / 255), policies, area);
    }
    const value = setColorCoordinate(state.value, event.format, event.coordinate, event.value);
    return value.ok ? commit(state, value.value, policies) : fail('transition-rejection', value.error.code, value.error.message, value.error.details);
  }
  if (event.type === 'set-area') {
    if (!unitInterval(event.x) || !unitInterval(event.y)) return fail('transition-rejection', 'color-area-out-of-range', 'Color area coordinates must be from 0 through 1.');
    const current = valid.value.area!;
    const area = { x: event.x, y: event.y, hue: current.hue };
    return commit(state, colorFromArea(area, state.value.alpha / 255), policies, area);
  }
  if (event.type === 'set-hue') {
    if (!Number.isFinite(event.value) || event.value < 0 || event.value > 360) return fail('transition-rejection', 'color-hue-out-of-range', 'Hue must be from 0 through 360.');
    const current = valid.value.area!;
    const area = { x: current.x, y: current.y, hue: event.value };
    return commit(state, colorFromArea(area, state.value.alpha / 255), policies, area);
  }
  if (event.type === 'set-alpha') {
    if (!unitInterval(event.value)) return fail('transition-rejection', 'color-alpha-out-of-range', 'Alpha must be from 0 through 1.');
    return commit(state, Object.freeze({ ...state.value, alpha: Math.round(event.value * 255) }), policies);
  }
  const value = typeof event.value === 'string'
    ? parseColorValue(event.value)
    : tryCreateColorValue(event.value.red, event.value.green, event.value.blue, event.value.alpha);
  if (!value.ok) return fail('transition-rejection', value.error.code, value.error.message, value.error.details);
  return commit(state, value.value, policies);
}

function colorFromArea(area: ColorAreaSelection, alpha: number): ColorValue {
  return srgbToRgba8(hsvToSrgb({ hue: area.hue, saturation: area.x, value: area.y, alpha }));
}

function commit(state: ColorPickerState, value: ColorValue, policies: ColorPickerPolicies, selection?: ColorAreaSelection): Result<ColorPickerUpdate> {
  if (policies.allowAlpha === false && value.alpha !== 255) return fail('transition-rejection', 'color-alpha-disabled', 'Alpha editing is disabled.');
  const area = getColorAreaValue(value, selection ?? (sameRGB(state.value, value) ? state.area : undefined));
  if (!area.ok) return area;
  const next = colorState(state, { value, area: areaSelection(area.value), draft: null });
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
    ...(patch.area === undefined && state.area === undefined ? {} : { area: patch.area ?? state.area }),
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

function sameRGB(left: ColorValue, right: ColorValue): boolean { return left.red === right.red && left.green === right.green && left.blue === right.blue; }
function areaSelection(value: ColorAreaValue): ColorAreaSelection { return Object.freeze({ x: value.x, y: value.y, hue: value.hue }); }

function isChannel(value: string): value is ColorChannel {
  return value === 'red' || value === 'green' || value === 'blue' || value === 'alpha';
}

function isFormat(value: string): value is ColorFormat {
  return value === 'hex' || value === 'rgb' || value === 'hsl' || value === 'hsv' || value === 'cmyk' || value === 'oklch';
}

function validColorValue(value: ColorValue): boolean {
  return validChannelValue(value.red) && validChannelValue(value.green) && validChannelValue(value.blue) && validChannelValue(value.alpha);
}

function validChannelValue(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 255;
}

function coordinate(name: ColorCoordinate, label: string, value: number, min: number, max: number, step: number, unit: ColorCoordinateValue['unit'] = ''): ColorCoordinateValue {
  return Object.freeze({ coordinate: name, label, value: Number(value.toFixed(step < 0.01 ? 4 : step < 1 ? 2 : 0)), min, max, step, unit });
}

function unitInterval(value: number): boolean { return Number.isFinite(value) && value >= 0 && value <= 1; }
