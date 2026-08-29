import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OKLCH_GAMUT_ITERATIONS,
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
} from '../../.verification-dist/structures/color.js';
import { MAX_COLOR_TEXT_CODE_UNITS, formatColorText, parseColorText } from '../../.verification-dist/editing/color-text.js';

test('normalized color models preserve RGBA8 across bounded deterministic samples', () => {
  let seed = 0x9e3779b9;
  for (let index = 0; index < 2_048; index += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = { red: seed & 255, green: seed >>> 8 & 255, blue: seed >>> 16 & 255, alpha: seed >>> 24 & 255 };
    const srgb = rgba8ToSrgb(value);
    assert.deepEqual(srgbToRgba8(srgb), value);
    assertChannelsNear(srgbToRgba8(hsvToSrgb(srgbToHsv(srgb))), value, 1);
    assertChannelsNear(srgbToRgba8(hslToSrgb(srgbToHsl(srgb))), value, 1);
    assertChannelsNear(srgbToRgba8(deviceCmykToSrgb(srgbToDeviceCmyk(srgb))), value, 1);
    const oklch = oklchToSrgb(srgbToOklch(srgb));
    assert.equal(oklch.ok, true);
    assertChannelsNear(srgbToRgba8(oklch.value), value, 1);
  }
});

test('OKLCH gamut policy is explicit and reduction work is fixed', () => {
  const outside = { lightness: 0.8, chroma: 0.5, hue: 120, alpha: 1 };
  assert.equal(oklchToSrgb(outside).error.code, 'color-out-of-gamut');
  assert.equal(oklchToSrgb(outside, 'clip').ok, true);
  assert.equal(oklchToSrgb(outside, 'reduce-chroma').ok, true);
  assert.equal(OKLCH_GAMUT_ITERATIONS, 12);
});

test('narrow color text grammar round-trips every documented format', () => {
  const value = { red: 51, green: 102, blue: 153, alpha: 128 };
  for (const format of ['hex', 'rgb', 'hsl', 'hsv', 'cmyk', 'oklch']) {
    const text = formatColorText(value, format);
    assert.equal(text.ok, true);
    const parsed = parseColorText(text.value);
    assert.equal(parsed.ok, true);
    assertChannelsNear(parsed.value, value, format === 'oklch' ? 1 : 2);
  }
  assert.equal(parseColorText('red').error.code, 'color-text-invalid');
  assert.equal(parseColorText('color(display-p3 1 0 0)').error.code, 'color-text-invalid');
  assert.equal(parseColorText('x'.repeat(MAX_COLOR_TEXT_CODE_UNITS + 1)).error.code, 'color-text-invalid');
});

test('RGBA8 rejects fractional and out-of-range channels', () => {
  assert.equal(tryCreateRgba8(0.5, 0, 0).error.code, 'color-channel-out-of-range');
  assert.equal(tryCreateRgba8(0, 0, 256).error.code, 'color-channel-out-of-range');
});

function assertChannelsNear(actual, expected, tolerance) {
  for (const channel of ['red', 'green', 'blue', 'alpha']) assert.ok(Math.abs(actual[channel] - expected[channel]) <= tolerance, `${channel}: ${actual[channel]} vs ${expected[channel]}`);
}
