import type { Result } from '../shared.js';
import { fail, ok } from '../internal/kernel/foundation.js';
import {
  createRgba8,
  deviceCmykToSrgb,
  hslToSrgb,
  hsvToSrgb,
  normalizeHue,
  oklchToSrgb,
  rgba8ToSrgb,
  srgbToDeviceCmyk,
  srgbToHsl,
  srgbToHsv,
  srgbToOklch,
  srgbToRgba8,
  tryCreateRgba8,
  type Rgba8,
} from '../structures/color.js';

export type ColorTextFormat = 'hex' | 'rgb' | 'hsl' | 'hsv' | 'cmyk' | 'oklch';
export const MAX_COLOR_TEXT_CODE_UNITS = 256;
const NUMBER_SOURCE = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
const SPACE_HSL_PATTERN = new RegExp(`^hsla?\\(\\s*(${NUMBER_SOURCE})(deg|grad|rad|turn)?\\s+(${NUMBER_SOURCE})%\\s+(${NUMBER_SOURCE})%(?:\\s*\\/\\s*(${NUMBER_SOURCE})(%)?)?\\s*\\)$`, 'i');

export function parseColorText(text: string): Result<Rgba8> {
  if (typeof text !== 'string' || text.length > MAX_COLOR_TEXT_CODE_UNITS) return fail('resource-rejection', 'color-text-invalid', 'Color text exceeds the supported code-unit ceiling.', { length: typeof text === 'string' ? text.length : null, maxCodeUnits: MAX_COLOR_TEXT_CODE_UNITS });
  const source = text.trim();
  const hex = /^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.exec(source)?.[1];
  if (hex !== undefined) {
    const expanded = hex.length <= 4 ? [...hex].map((character) => character + character).join('') : hex;
    return tryCreateRgba8(Number.parseInt(expanded.slice(0, 2), 16), Number.parseInt(expanded.slice(2, 4), 16), Number.parseInt(expanded.slice(4, 6), 16), expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) : 255);
  }
  const family = source.slice(0, 12).toLowerCase();
  let parsed: Result<Rgba8> | null = null;
  if (family.startsWith('rgb')) parsed = parseRgb(source);
  else if (family.startsWith('hsl')) parsed = parseSpaceHsl(source) ?? parseHsl(source);
  else if (family.startsWith('hsv')) parsed = parseHsv(source);
  else if (family.startsWith('device-cmyk')) parsed = parseCmyk(source);
  else if (family.startsWith('oklch')) parsed = parseOklch(source);
  return parsed ?? fail('construction', 'color-text-invalid', 'Color text must use hex, rgb(), hsl(), hsv(), device-cmyk(), or oklch().', { text });
}

function parseSpaceHsl(source: string): Result<Rgba8> | null {
  const match = SPACE_HSL_PATTERN.exec(source);
  if (match === null) return null;
  const rawHue = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  const saturation = Number(match[3]);
  const lightness = Number(match[4]);
  const rawAlpha = match[5] === undefined ? 1 : Number(match[5]);
  const alpha = match[6] === '%' ? rawAlpha / 100 : rawAlpha;
  if (!Number.isFinite(rawHue) || !Number.isFinite(saturation) || saturation < 0 || saturation > 100 || !Number.isFinite(lightness) || lightness < 0 || lightness > 100 || !Number.isFinite(alpha) || alpha < 0 || alpha > 1) return invalid(source, 'HSL saturation and lightness must be 0%..100%, with a valid hue and alpha.');
  const hue = normalizeHue(unit === 'turn' ? rawHue * 360 : unit === 'rad' ? rawHue * 180 / Math.PI : unit === 'grad' ? rawHue * 0.9 : rawHue);
  return ok(srgbToRgba8(hslToSrgb({ hue, saturation: saturation / 100, lightness: lightness / 100, alpha })));
}

export function formatColorText(value: Rgba8, format: ColorTextFormat = 'hex'): Result<string> {
  if (!validRgba8(value)) {
    const invalid = tryCreateRgba8(value.red, value.green, value.blue, value.alpha);
    if (!invalid.ok) return invalid;
  }
  const alpha = value.alpha / 255;
  if (format === 'hex') {
    const hex = [value.red, value.green, value.blue, ...(value.alpha === 255 ? [] : [value.alpha])].map((channel) => channel.toString(16).padStart(2, '0')).join('');
    return ok(`#${hex}`);
  }
  if (format === 'rgb') return ok(alpha === 1 ? `rgb(${value.red}, ${value.green}, ${value.blue})` : `rgba(${value.red}, ${value.green}, ${value.blue}, ${round(alpha, 3)})`);
  if (format === 'cmyk') {
    const red = value.red / 255;
    const green = value.green / 255;
    const blue = value.blue / 255;
    const black = 1 - Math.max(red, green, blue);
    const denominator = 1 - black;
    const cyan = denominator === 0 ? 0 : (1 - red - black) / denominator;
    const magenta = denominator === 0 ? 0 : (1 - green - black) / denominator;
    const yellow = denominator === 0 ? 0 : (1 - blue - black) / denominator;
    return ok(`device-cmyk(${round(cyan * 100)}% ${round(magenta * 100)}% ${round(yellow * 100)}% ${round(black * 100)}%${formatAlpha(alpha)})`);
  }
  const srgb = rgba8ToSrgb(value);
  if (format === 'hsl') {
    const hsl = srgbToHsl(srgb);
    const body = `${round(hsl.hue)}, ${round(hsl.saturation * 100)}%, ${round(hsl.lightness * 100)}%`;
    return ok(alpha === 1 ? `hsl(${body})` : `hsla(${body}, ${round(alpha, 3)})`);
  }
  if (format === 'hsv') {
    const hsv = srgbToHsv(srgb);
    return ok(`hsv(${round(hsv.hue)} ${round(hsv.saturation * 100)}% ${round(hsv.value * 100)}%${formatAlpha(alpha)})`);
  }
  if (format === 'oklch') {
    const oklch = srgbToOklch(srgb);
    return ok(`oklch(${round(oklch.lightness * 100, 2)}% ${round(oklch.chroma, 4)} ${round(oklch.hue, 2)}${formatAlpha(alpha)})`);
  }
  return fail('construction', 'color-format-invalid', 'Color format is unsupported.');
}

function parseRgb(source: string): Result<Rgba8> | null {
  const call = /^(rgba?)\((.*)\)$/i.exec(source);
  if (call === null) return null;
  const components = split(call[2] ?? '');
  if (components === null || components.values.length !== 3) return invalid(source, 'RGB requires three channels and an optional alpha channel.');
  const channels = components.values.map(parseRgbChannel);
  const alpha = parseAlpha(components.alpha);
  if (channels.some((value) => value === null) || alpha === null) return invalid(source, 'RGB channels must be 0..255 or 0%..100%, and alpha must be 0..1 or 0%..100%.');
  return tryCreateRgba8(channels[0] as number, channels[1] as number, channels[2] as number, alpha);
}

function parseHsl(source: string): Result<Rgba8> | null {
  const call = /^(hsla?)\((.*)\)$/i.exec(source);
  if (call === null) return null;
  const components = split(call[2] ?? '');
  if (components === null || components.values.length !== 3) return invalid(source, 'HSL requires hue, saturation, lightness, and an optional alpha channel.');
  const hue = parseHue(components.values[0] ?? '');
  const saturation = parsePercentage(components.values[1] ?? '');
  const lightness = parsePercentage(components.values[2] ?? '');
  const alpha = parseAlpha(components.alpha);
  if (hue === null || saturation === null || lightness === null || alpha === null) return invalid(source, 'HSL saturation and lightness must be 0%..100%, with a valid hue and alpha.');
  return ok(srgbToRgba8(hslToSrgb({ hue, saturation: saturation / 100, lightness: lightness / 100, alpha: alpha / 255 })));
}

function parseHsv(source: string): Result<Rgba8> | null {
  const call = /^hsva?\((.*)\)$/i.exec(source);
  if (call === null) return null;
  const components = split(call[1] ?? '');
  if (components === null || components.values.length !== 3) return invalid(source, 'HSV requires hue, saturation, value, and an optional alpha channel.');
  const hue = parseHue(components.values[0] ?? '');
  const saturation = parsePercentage(components.values[1] ?? '');
  const value = parsePercentage(components.values[2] ?? '');
  const alpha = parseAlpha(components.alpha);
  if (hue === null || saturation === null || value === null || alpha === null) return invalid(source, 'HSV saturation and value must be 0%..100%, with a valid hue and alpha.');
  return ok(srgbToRgba8(hsvToSrgb({ hue, saturation: saturation / 100, value: value / 100, alpha: alpha / 255 })));
}

function parseCmyk(source: string): Result<Rgba8> | null {
  const call = /^device-cmyk\((.*)\)$/i.exec(source);
  if (call === null) return null;
  const components = split(call[1] ?? '');
  if (components === null || components.values.length !== 4) return invalid(source, 'CMYK requires cyan, magenta, yellow, black, and an optional alpha channel.');
  const channels = components.values.map(parsePercentage);
  const alpha = parseAlpha(components.alpha);
  if (channels.some((value) => value === null) || alpha === null) return invalid(source, 'CMYK channels must be percentages from 0% through 100%.');
  return ok(srgbToRgba8(deviceCmykToSrgb({ cyan: (channels[0] as number) / 100, magenta: (channels[1] as number) / 100, yellow: (channels[2] as number) / 100, black: (channels[3] as number) / 100, alpha: alpha / 255 })));
}

function parseOklch(source: string): Result<Rgba8> | null {
  const call = /^oklch\((.*)\)$/i.exec(source);
  if (call === null) return null;
  const components = split(call[1] ?? '');
  if (components === null || components.values.length !== 3) return invalid(source, 'OKLCH requires lightness, chroma, hue, and an optional alpha channel.');
  const lightness = parseLightness(components.values[0] ?? '');
  const chroma = parseFinite(components.values[1] ?? '');
  const hue = parseHue(components.values[2] ?? '');
  const alpha = parseAlpha(components.alpha);
  if (lightness === null || chroma === null || chroma < 0 || hue === null || alpha === null) return invalid(source, 'OKLCH requires lightness 0..1 or 0%..100%, non-negative chroma, a valid hue, and alpha.');
  const converted = oklchToSrgb({ lightness, chroma, hue, alpha: alpha / 255 });
  return converted.ok ? ok(srgbToRgba8(converted.value)) : converted;
}

function split(body: string): { readonly values: readonly string[]; readonly alpha?: string } | null {
  const slash = body.split('/');
  if (slash.length > 2) return null;
  const beforeAlpha = slash[0]?.trim() ?? '';
  let values: string[];
  let alpha = slash[1]?.trim();
  if (beforeAlpha.includes(',')) { values = beforeAlpha.split(',').map((value) => value.trim()); if (alpha === undefined && values.length > 3) alpha = values.pop(); }
  else values = beforeAlpha.split(/\s+/).filter(Boolean);
  if (values.some((value) => value.length === 0) || alpha === '') return null;
  return alpha === undefined ? { values } : { values, alpha };
}

function parseRgbChannel(token: string): number | null { if (token.endsWith('%')) { const value = parsePercentage(token); return value === null ? null : Math.round(value / 100 * 255); } const value = parseFinite(token); return value !== null && Number.isInteger(value) && value >= 0 && value <= 255 ? value : null; }
function parseAlpha(token: string | undefined): number | null { if (token === undefined) return 255; if (token.endsWith('%')) { const value = parsePercentage(token); return value === null ? null : Math.round(value / 100 * 255); } const value = parseFinite(token); return value !== null && value >= 0 && value <= 1 ? Math.round(value * 255) : null; }
function parsePercentage(token: string): number | null { if (!token.endsWith('%')) return null; const value = parseFinite(token.slice(0, -1)); return value !== null && value >= 0 && value <= 100 ? value : null; }
function parseLightness(token: string): number | null { if (token.endsWith('%')) { const value = parsePercentage(token); return value === null ? null : value / 100; } const value = parseFinite(token); return value !== null && value >= 0 && value <= 1 ? value : null; }
function parseHue(token: string): number | null { const match = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(deg|grad|rad|turn)?$/i.exec(token); if (match === null) return null; const value = Number(match[1]); const unit = match[2]?.toLowerCase(); return normalizeHue(unit === 'turn' ? value * 360 : unit === 'rad' ? value * 180 / Math.PI : unit === 'grad' ? value * 0.9 : value); }
function parseFinite(token: string): number | null { if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) return null; const value = Number(token); return Number.isFinite(value) ? value : null; }
function validRgba8(value: Rgba8): boolean { return validChannel(value.red) && validChannel(value.green) && validChannel(value.blue) && validChannel(value.alpha); }
function validChannel(value: number): boolean { return Number.isInteger(value) && value >= 0 && value <= 255; }
function invalid(text: string, message: string): Result<Rgba8> { return fail('construction', 'color-text-invalid', message, { text }); }
function round(value: number, precision = 0): number { return Number(value.toFixed(precision)); }
function formatAlpha(alpha: number): string { return alpha === 1 ? '' : ` / ${round(alpha, 3)}`; }

export { createRgba8 as createColorTextValue };
