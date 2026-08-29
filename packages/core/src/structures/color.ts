import { unwrap } from '../result.js';
import type { Result } from '../shared.js';
import { fail, ok } from '../internal/kernel/foundation.js';

export interface SrgbColor { readonly red: number; readonly green: number; readonly blue: number; readonly alpha: number; }
export interface LinearSrgbColor extends SrgbColor {}
export interface Rgba8 { readonly red: number; readonly green: number; readonly blue: number; readonly alpha: number; }
export interface HslColor { readonly hue: number; readonly saturation: number; readonly lightness: number; readonly alpha: number; }
export interface HsvColor { readonly hue: number; readonly saturation: number; readonly value: number; readonly alpha: number; }
export interface DeviceCmykColor { readonly cyan: number; readonly magenta: number; readonly yellow: number; readonly black: number; readonly alpha: number; }
export interface OklabColor { readonly lightness: number; readonly a: number; readonly b: number; readonly alpha: number; }
export interface OklchColor { readonly lightness: number; readonly chroma: number; readonly hue: number; readonly alpha: number; }
export type SrgbGamutPolicy = 'reject' | 'clip' | 'reduce-chroma';

export const OKLCH_GAMUT_ITERATIONS = 12;

export function createRgba8(red: number, green: number, blue: number, alpha = 255): Rgba8 {
  return unwrap(tryCreateRgba8(red, green, blue, alpha));
}

export function tryCreateRgba8(red: number, green: number, blue: number, alpha = 255): Result<Rgba8> {
  if (!rgba8Channel(red)) return invalidRgba8Channel('red', red);
  if (!rgba8Channel(green)) return invalidRgba8Channel('green', green);
  if (!rgba8Channel(blue)) return invalidRgba8Channel('blue', blue);
  if (!rgba8Channel(alpha)) return invalidRgba8Channel('alpha', alpha);
  return ok(Object.freeze({ red, green, blue, alpha }));
}

export function createSrgbColor(red: number, green: number, blue: number, alpha = 1): SrgbColor {
  return unwrap(tryCreateSrgbColor(red, green, blue, alpha));
}

export function tryCreateSrgbColor(red: number, green: number, blue: number, alpha = 1): Result<SrgbColor> {
  return unit(red) && unit(green) && unit(blue) && unit(alpha)
    ? ok(Object.freeze({ red, green, blue, alpha }))
    : invalid('Normalized sRGB channels must be finite numbers from 0 through 1.', { red, green, blue, alpha });
}

export function createHslColor(hue: number, saturation: number, lightness: number, alpha = 1): HslColor { return unwrap(tryCreateHslColor(hue, saturation, lightness, alpha)); }
export function tryCreateHslColor(hue: number, saturation: number, lightness: number, alpha = 1): Result<HslColor> { return angle(hue) && unit(saturation) && unit(lightness) && unit(alpha) ? ok(Object.freeze({ hue: normalizeHue(hue), saturation, lightness, alpha })) : invalid('HSL components are invalid.', { hue, saturation, lightness, alpha }); }
export function createHsvColor(hue: number, saturation: number, value: number, alpha = 1): HsvColor { return unwrap(tryCreateHsvColor(hue, saturation, value, alpha)); }
export function tryCreateHsvColor(hue: number, saturation: number, value: number, alpha = 1): Result<HsvColor> { return angle(hue) && unit(saturation) && unit(value) && unit(alpha) ? ok(Object.freeze({ hue: normalizeHue(hue), saturation, value, alpha })) : invalid('HSV components are invalid.', { hue, saturation, value, alpha }); }
export function createDeviceCmykColor(cyan: number, magenta: number, yellow: number, black: number, alpha = 1): DeviceCmykColor { return unwrap(tryCreateDeviceCmykColor(cyan, magenta, yellow, black, alpha)); }
export function tryCreateDeviceCmykColor(cyan: number, magenta: number, yellow: number, black: number, alpha = 1): Result<DeviceCmykColor> { return unit(cyan) && unit(magenta) && unit(yellow) && unit(black) && unit(alpha) ? ok(Object.freeze({ cyan, magenta, yellow, black, alpha })) : invalid('Device CMYK components are invalid.', { cyan, magenta, yellow, black, alpha }); }
export function createOklabColor(lightness: number, a: number, b: number, alpha = 1): OklabColor { return unwrap(tryCreateOklabColor(lightness, a, b, alpha)); }
export function tryCreateOklabColor(lightness: number, a: number, b: number, alpha = 1): Result<OklabColor> { return unit(lightness) && Number.isFinite(a) && Number.isFinite(b) && unit(alpha) ? ok(Object.freeze({ lightness, a, b, alpha })) : invalid('Oklab components are invalid.', { lightness, a, b, alpha }); }
export function createOklchColor(lightness: number, chroma: number, hue: number, alpha = 1): OklchColor { return unwrap(tryCreateOklchColor(lightness, chroma, hue, alpha)); }
export function tryCreateOklchColor(lightness: number, chroma: number, hue: number, alpha = 1): Result<OklchColor> { return unit(lightness) && finiteNonNegative(chroma) && angle(hue) && unit(alpha) ? ok(Object.freeze({ lightness, chroma, hue: normalizeHue(hue), alpha })) : invalid('OKLCH components are invalid.', { lightness, chroma, hue, alpha }); }

export function rgba8ToSrgb(value: Rgba8): SrgbColor {
  return Object.freeze({ red: value.red / 255, green: value.green / 255, blue: value.blue / 255, alpha: value.alpha / 255 });
}

export function srgbToRgba8(value: SrgbColor): Rgba8 {
  return createRgba8(Math.round(value.red * 255), Math.round(value.green * 255), Math.round(value.blue * 255), Math.round(value.alpha * 255));
}

export function srgbToLinearSrgb(value: SrgbColor): LinearSrgbColor {
  return Object.freeze({ red: decode(value.red), green: decode(value.green), blue: decode(value.blue), alpha: value.alpha });
}

export function linearSrgbToSrgb(value: LinearSrgbColor, policy: SrgbGamutPolicy = 'reject'): Result<SrgbColor> {
  const channels = resolveLinearGamut(value, policy);
  if (channels === null) return outOfGamut(value);
  return ok(Object.freeze({ red: encode(channels.red), green: encode(channels.green), blue: encode(channels.blue), alpha: clamp01(value.alpha) }));
}

export function srgbToHsv(value: SrgbColor): HsvColor {
  const maximum = Math.max(value.red, value.green, value.blue);
  const delta = maximum - Math.min(value.red, value.green, value.blue);
  const sector = delta === 0 ? 0 : maximum === value.red ? (value.green - value.blue) / delta : maximum === value.green ? 2 + (value.blue - value.red) / delta : 4 + (value.red - value.green) / delta;
  return Object.freeze({ hue: normalizeHue(60 * (sector < 0 ? sector + 6 : sector)), saturation: maximum === 0 ? 0 : delta / maximum, value: maximum, alpha: value.alpha });
}

export function hsvToSrgb(value: HsvColor): SrgbColor {
  const hue = normalizeHue(value.hue) / 60;
  const saturation = clamp01(value.saturation);
  const brightness = clamp01(value.value);
  const sector = Math.floor(hue) % 6;
  const low = brightness * (1 - saturation);
  const down = brightness * (1 - (hue - Math.floor(hue)) * saturation);
  const up = brightness * (1 - (1 - hue + Math.floor(hue)) * saturation);
  let red: number;
  let green: number;
  let blue: number;
  if (sector === 0) { red = brightness; green = up; blue = low; }
  else if (sector === 1) { red = down; green = brightness; blue = low; }
  else if (sector === 2) { red = low; green = brightness; blue = up; }
  else if (sector === 3) { red = low; green = down; blue = brightness; }
  else if (sector === 4) { red = up; green = low; blue = brightness; }
  else { red = brightness; green = low; blue = down; }
  return Object.freeze({ red, green, blue, alpha: clamp01(value.alpha) });
}

export function srgbToHsl(value: SrgbColor): HslColor {
  const hsv = srgbToHsv(value);
  const lightness2 = (2 - hsv.saturation) * hsv.value;
  const saturation = lightness2 > 0 && lightness2 < 2 ? hsv.saturation * hsv.value / (lightness2 <= 1 ? lightness2 : 2 - lightness2) : 0;
  return Object.freeze({ hue: hsv.hue, saturation, lightness: lightness2 / 2, alpha: value.alpha });
}

export function hslToSrgb(value: HslColor): SrgbColor {
  const saturation = clamp01(value.saturation);
  const lightness = clamp01(value.lightness);
  const scaled = saturation * (lightness < 0.5 ? lightness : 1 - lightness);
  return hsvToSrgb({ hue: value.hue, saturation: scaled > 0 ? 2 * scaled / (lightness + scaled) : 0, value: lightness + scaled, alpha: value.alpha });
}

export function srgbToDeviceCmyk(value: SrgbColor): DeviceCmykColor {
  const black = 1 - Math.max(value.red, value.green, value.blue);
  const denominator = 1 - black;
  return Object.freeze({
    cyan: denominator === 0 ? 0 : (1 - value.red - black) / denominator,
    magenta: denominator === 0 ? 0 : (1 - value.green - black) / denominator,
    yellow: denominator === 0 ? 0 : (1 - value.blue - black) / denominator,
    black,
    alpha: value.alpha,
  });
}

export function deviceCmykToSrgb(value: DeviceCmykColor): SrgbColor {
  const black = clamp01(value.black);
  return Object.freeze({
    red: (1 - clamp01(value.cyan)) * (1 - black),
    green: (1 - clamp01(value.magenta)) * (1 - black),
    blue: (1 - clamp01(value.yellow)) * (1 - black),
    alpha: clamp01(value.alpha),
  });
}

export function linearSrgbToOklab(value: LinearSrgbColor): OklabColor {
  const l = Math.cbrt(0.4122214708 * value.red + 0.5363325363 * value.green + 0.0514459929 * value.blue);
  const m = Math.cbrt(0.2119034982 * value.red + 0.6806995451 * value.green + 0.1073969566 * value.blue);
  const s = Math.cbrt(0.0883024619 * value.red + 0.2817188376 * value.green + 0.6299787005 * value.blue);
  return Object.freeze({ lightness: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s, alpha: value.alpha });
}

export function oklabToLinearSrgb(value: OklabColor): LinearSrgbColor {
  const lRoot = value.lightness + 0.3963377774 * value.a + 0.2158037573 * value.b;
  const mRoot = value.lightness - 0.1055613458 * value.a - 0.0638541728 * value.b;
  const sRoot = value.lightness - 0.0894841775 * value.a - 1.291485548 * value.b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;
  return Object.freeze({ red: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, green: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, blue: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s, alpha: value.alpha });
}

export function oklabToOklch(value: OklabColor): OklchColor {
  const chroma = Math.hypot(value.a, value.b);
  return Object.freeze({ lightness: value.lightness, chroma, hue: chroma < 1e-7 ? 0 : normalizeHue(Math.atan2(value.b, value.a) * 180 / Math.PI), alpha: value.alpha });
}

export function oklchToOklab(value: OklchColor): OklabColor {
  const radians = normalizeHue(value.hue) * Math.PI / 180;
  return Object.freeze({ lightness: value.lightness, a: value.chroma * Math.cos(radians), b: value.chroma * Math.sin(radians), alpha: value.alpha });
}

export function srgbToOklch(value: SrgbColor): OklchColor { return oklabToOklch(linearSrgbToOklab(srgbToLinearSrgb(value))); }

export function oklchToSrgb(value: OklchColor, policy: SrgbGamutPolicy = 'reject'): Result<SrgbColor> {
  if (!unit(value.lightness) || !finiteNonNegative(value.chroma) || !Number.isFinite(value.hue) || !unit(value.alpha)) return invalid('OKLCH components are invalid.', value);
  const direct = oklabToLinearSrgb(oklchToOklab(value));
  if (inLinearGamut(direct)) return linearSrgbToSrgb(direct);
  if (policy === 'reject') return outOfGamut(value);
  if (policy === 'clip') return linearSrgbToSrgb(direct, 'clip');
  if (policy !== 'reduce-chroma') return invalid('Unknown sRGB gamut policy.', policy);
  let low = 0;
  let high = value.chroma;
  let best = oklabToLinearSrgb(oklchToOklab({ ...value, chroma: 0 }));
  for (let iteration = 0; iteration < OKLCH_GAMUT_ITERATIONS; iteration += 1) {
    const chroma = (low + high) / 2;
    const candidate = oklabToLinearSrgb(oklchToOklab({ ...value, chroma }));
    if (inLinearGamut(candidate)) { low = chroma; best = candidate; } else high = chroma;
  }
  return linearSrgbToSrgb(best, 'clip');
}

export function normalizeHue(value: number): number { return (value % 360 + 360) % 360; }
export function isSrgbInGamut(value: SrgbColor): boolean { return unit(value.red) && unit(value.green) && unit(value.blue) && unit(value.alpha); }

function resolveLinearGamut(value: LinearSrgbColor, policy: SrgbGamutPolicy): LinearSrgbColor | null {
  if (!Number.isFinite(value.red) || !Number.isFinite(value.green) || !Number.isFinite(value.blue) || !Number.isFinite(value.alpha)) return null;
  if (inLinearGamut(value)) return value;
  if (policy !== 'clip') return null;
  return { red: clamp01(value.red), green: clamp01(value.green), blue: clamp01(value.blue), alpha: clamp01(value.alpha) };
}

function inLinearGamut(value: LinearSrgbColor): boolean { return nearUnit(value.red) && nearUnit(value.green) && nearUnit(value.blue) && unit(value.alpha); }
function nearUnit(value: number): boolean { return Number.isFinite(value) && value >= -1e-5 && value <= 1.00001; }
function decode(value: number): number { return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; }
function encode(value: number): number { const bounded = clamp01(value); return bounded <= 0.0031308 ? 12.92 * bounded : 1.055 * bounded ** (1 / 2.4) - 0.055; }
function clamp01(value: number): number { return Math.min(1, Math.max(0, value)); }
function unit(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1; }
function finiteNonNegative(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= 0; }
function angle(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function rgba8Channel(value: unknown): value is number { return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 255; }
function invalidRgba8Channel(channel: keyof Rgba8, value: unknown): Result<Rgba8> { return fail('construction', 'color-channel-out-of-range', 'Color channels must be integers from 0 through 255.', { channel, value }); }
function invalid<T>(message: string, value: unknown): Result<T> { return fail('construction', 'invalid-boundary', message, { value }); }
function outOfGamut<T>(value: unknown): Result<T> { return fail('construction', 'color-out-of-gamut', 'Color is outside the sRGB gamut.', { value }); }
