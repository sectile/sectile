import type { Result } from '@sectile/core';
import { applyColorPickerEvent, tryCreateColorPickerState, formatColorValue, type ColorChannel, type ColorFormat, type ColorPickerCommand, type ColorPickerEvent, type ColorPickerPolicies, type ColorPickerState, type ColorValue } from '@sectile/core/color-picker';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { unwrap } from '@sectile/core/result';
import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';
import type { TerminalKeyboardInput } from './keyboard.js';

export interface ColorPickerOptions extends ColorPickerPolicies {
  readonly value?: ColorValue | string;
  readonly defaultValue?: ColorValue | string;
  readonly draft?: string | null;
  readonly defaultDraft?: string | null;
  readonly format?: ColorFormat;
  readonly defaultFormat?: ColorFormat;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly onValueChange?: (value: ColorValue) => void;
  readonly onDraftChange?: (draft: string | null) => void;
  readonly onFormatChange?: (format: ColorFormat) => void;
  readonly onUpdate?: () => void;
}

export type ColorPickerValueChangeHandler = NonNullable<ColorPickerOptions['onValueChange']>;
export type ColorPickerDraftChangeHandler = NonNullable<ColorPickerOptions['onDraftChange']>;
export type ColorPickerFormatChangeHandler = NonNullable<ColorPickerOptions['onFormatChange']>;
export type ColorPickerUpdateHandler = NonNullable<ColorPickerOptions['onUpdate']>;
export interface ColorPickerConnection {
  getSnapshot(): RevisionSnapshot<ColorPickerState>;
  getText(): string;
  getCSSColor(): string;
  syncControlledValues(values: { readonly value?: ColorValue | string; readonly draft?: string | null; readonly format?: ColorFormat }): Result<RevisionSnapshot<ColorPickerState>>;
  handleEvent(event: ColorPickerEvent): boolean;
  handleKeyboardInput(input: TerminalKeyboardInput): boolean;
  handleTextInput(text: string): boolean;
}
export function createColorPicker(options: ColorPickerOptions = {}): FacadeConnection<ColorPickerConnection> { return unwrap(tryCreateColorPicker(options)); }
export function tryCreateColorPicker(options: ColorPickerOptions = {}): Result<FacadeConnection<ColorPickerConnection>> { return createFacadeConnection(options, (normalized) => tryCreateConnection(normalized)); }
function tryCreateConnection(options: ColorPickerOptions): Result<ColorPickerConnection> {
  const controlled = [options.value !== undefined, options.draft !== undefined, options.format !== undefined] as const;
  const policies: ColorPickerPolicies = { ...(options.allowAlpha === undefined ? {} : { allowAlpha: options.allowAlpha }), ...(options.channelStep === undefined ? {} : { channelStep: options.channelStep }), ...(options.alphaStep === undefined ? {} : { alphaStep: options.alphaStep }) };
  const runtime = createSemanticController<ColorPickerState, ColorPickerEvent, ColorPickerCommand, ColorPickerCommand>({
    initial: tryCreateColorPickerState({ value: options.value ?? options.defaultValue ?? '#000000', draft: options.draft !== undefined ? options.draft : options.defaultDraft ?? null, format: options.format ?? options.defaultFormat ?? 'hex' }, policies),
    reducer: (state, event) => applyColorPickerEvent(state, event, policies),
    reconcile: (previous, proposed) => tryCreateColorPickerState({ value: controlled[0] ? previous.value : proposed.value, draft: controlled[1] ? previous.draft : proposed.draft, format: controlled[2] ? previous.format : proposed.format, channel: proposed.channel }, policies),
    notify: (previous, proposed) => { if (!sameColor(previous.value, proposed.value)) options.onValueChange?.(proposed.value); if (previous.draft !== proposed.draft) options.onDraftChange?.(proposed.draft); if (previous.format !== proposed.format) options.onFormatChange?.(proposed.format); },
    toEffect: (command) => command, interaction: options,
  });
  return runtime.ok ? { ok: true, value: new TerminalColorPicker(options, policies, runtime.value, controlled) } : runtime;
}
class TerminalColorPicker implements ColorPickerConnection {
  readonly #options: ColorPickerOptions; readonly #policies: ColorPickerPolicies; readonly #runtime: SemanticController<ColorPickerState, ColorPickerEvent, ColorPickerCommand>; readonly #controlled: readonly [boolean, boolean, boolean];
  public constructor(options: ColorPickerOptions, policies: ColorPickerPolicies, runtime: SemanticController<ColorPickerState, ColorPickerEvent, ColorPickerCommand>, controlled: readonly [boolean, boolean, boolean]) { this.#options = options; this.#policies = policies; this.#runtime = runtime; this.#controlled = controlled; }
  public getSnapshot(): RevisionSnapshot<ColorPickerState> { return this.#runtime.getSnapshot(); }
  public getText(): string { const state = this.getSnapshot().state; return state.draft ?? unwrap(formatColorValue(state.value, state.format)); }
  public getCSSColor(): string { return unwrap(formatColorValue(this.getSnapshot().state.value, 'rgb')); }
  public syncControlledValues(values: { readonly value?: ColorValue | string; readonly draft?: string | null; readonly format?: ColorFormat }): Result<RevisionSnapshot<ColorPickerState>> {
    if (this.#controlled[0] !== (values.value !== undefined) || this.#controlled[1] !== (values.draft !== undefined) || this.#controlled[2] !== (values.format !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled color picker values must preserve their construction-time shape.' } };
    const state = this.getSnapshot().state; const result = this.#runtime.replace(tryCreateColorPickerState({ value: values.value ?? state.value, draft: values.draft === undefined ? state.draft : values.draft, format: values.format ?? state.format, channel: state.channel }, this.#policies)); if (result.ok) this.#options.onUpdate?.(); return result;
  }
  public handleEvent(event: ColorPickerEvent): boolean { const result = this.#runtime.handle(event); if (result.ok) this.#options.onUpdate?.(); return result.ok; }
  public handleKeyboardInput(input: TerminalKeyboardInput): boolean {
    if (input.key === 'up') return this.handleEvent('increment'); if (input.key === 'down') return this.handleEvent('decrement');
    if (input.key === 'left' || input.key === 'right') { const channels: readonly ColorChannel[] = this.#policies.allowAlpha === false ? ['red', 'green', 'blue'] : ['red', 'green', 'blue', 'alpha']; const current = channels.indexOf(this.getSnapshot().state.channel); const next = (current + (input.key === 'right' ? 1 : channels.length - 1)) % channels.length; return this.handleEvent({ type: 'focus-channel', channel: channels[next] as ColorChannel }); }
    if (input.key === 'enter') return this.handleEvent('commit'); if (input.key === 'escape') return this.handleEvent('cancel'); return false;
  }
  public handleTextInput(text: string): boolean { return this.handleEvent({ type: 'input', text }); }
}
function sameColor(left: ColorValue, right: ColorValue): boolean { return left.red === right.red && left.green === right.green && left.blue === right.blue && left.alpha === right.alpha; }
