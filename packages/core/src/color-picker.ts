import type { Result } from './shared.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';

export type ColorChannel = 'red' | 'green' | 'blue' | 'alpha';
export type ColorFormat = 'hex' | 'rgb';

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
  const functional = /^rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)(?:\s*[,/]\s*(\d*\.?\d+)%?)?\s*\)$/i.exec(source);
  if (functional !== null) {
    const alphaSource = functional[4];
    const alpha = alphaSource === undefined ? 255 : alphaSource.includes('.') || Number(alphaSource) <= 1
      ? Math.round(Number(alphaSource) * 255)
      : Math.round(Number(alphaSource) / 100 * 255);
    return createColorValue(Number(functional[1]), Number(functional[2]), Number(functional[3]), alpha);
  }
  return fail('construction', 'color-text-invalid', 'Color text must be hexadecimal, rgb(), or rgba().', { text });
}

export function formatColorValue(value: ColorValue, format: ColorFormat = 'hex'): Result<string> {
  const valid = createColorValue(value.red, value.green, value.blue, value.alpha);
  if (!valid.ok) return valid;
  if (format === 'hex') {
    const hex = [value.red, value.green, value.blue, ...(value.alpha === 255 ? [] : [value.alpha])]
      .map((channel) => channel.toString(16).padStart(2, '0')).join('');
    return ok(`#${hex}`);
  }
  if (format !== 'rgb') return fail('construction', 'color-format-invalid', 'Color format must be hex or rgb.');
  if (value.alpha === 255) return ok(`rgb(${value.red}, ${value.green}, ${value.blue})`);
  const alpha = Number((value.alpha / 255).toFixed(3));
  return ok(`rgba(${value.red}, ${value.green}, ${value.blue}, ${alpha})`);
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
  if (format !== 'hex' && format !== 'rgb') return fail('construction', 'color-format-invalid', 'Color format must be hex or rgb.');
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
    if (event.format !== 'hex' && event.format !== 'rgb') return fail('transition-rejection', 'color-format-invalid', 'Color format must be hex or rgb.');
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
