import type { Result } from '@sectile/core';
import { applyColorPickerEvent, createColorPickerState, formatColorValue, type ColorChannel, type ColorFormat, type ColorPickerCommand, type ColorPickerEvent, type ColorPickerPolicies, type ColorPickerState, type ColorValue } from '@sectile/core/color-picker';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { unwrap } from '@sectile/core/result';
import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';

export interface ColorPickerOptions extends ColorPickerPolicies {
  readonly root: HTMLElement;
  readonly value?: ColorValue | string;
  readonly defaultValue?: ColorValue | string;
  readonly draft?: string | null;
  readonly defaultDraft?: string | null;
  readonly format?: ColorFormat;
  readonly defaultFormat?: ColorFormat;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly label?: string;
  readonly onValueChange?: (value: ColorValue) => void;
  readonly onDraftChange?: (draft: string | null) => void;
  readonly onFormatChange?: (format: ColorFormat) => void;
  readonly onUpdate?: () => void;
}

export interface ColorPickerConnection {
  getSnapshot(): RevisionSnapshot<ColorPickerState>;
  getText(): string;
  getCSSColor(): string;
  syncControlledValues(values: { readonly value?: ColorValue | string; readonly draft?: string | null; readonly format?: ColorFormat }): Result<RevisionSnapshot<ColorPickerState>>;
  handleEvent(event: ColorPickerEvent): boolean;
  setNativeInputAttributes(element: HTMLInputElement): void;
  setTextInputAttributes(element: HTMLInputElement): void;
  setChannelInputAttributes(element: HTMLInputElement, channel: ColorChannel): void;
  setSwatchAttributes(element: HTMLElement): void;
  refresh(): void;
  disconnect(): void;
}

export function createColorPicker(options: ColorPickerOptions): FacadeConnection<ColorPickerConnection> { return unwrap(tryCreateColorPicker(options)); }
export function tryCreateColorPicker(options: ColorPickerOptions): Result<FacadeConnection<ColorPickerConnection>> { return createFacadeConnection(options, (normalized) => tryCreateColorPickerConnection(normalized)); }

function tryCreateColorPickerConnection(options: ColorPickerOptions): Result<ColorPickerConnection> {
  const valueControlled = options.value !== undefined;
  const draftControlled = options.draft !== undefined;
  const formatControlled = options.format !== undefined;
  const policies: ColorPickerPolicies = {
    ...(options.allowAlpha === undefined ? {} : { allowAlpha: options.allowAlpha }),
    ...(options.channelStep === undefined ? {} : { channelStep: options.channelStep }),
    ...(options.alphaStep === undefined ? {} : { alphaStep: options.alphaStep }),
  };
  const runtime = createSemanticController<ColorPickerState, ColorPickerEvent, ColorPickerCommand, ColorPickerCommand>({
    initial: createColorPickerState({ value: options.value ?? options.defaultValue ?? '#000000', draft: options.draft !== undefined ? options.draft : options.defaultDraft ?? null, format: options.format ?? options.defaultFormat ?? 'hex' }, policies),
    reducer: (state, event) => applyColorPickerEvent(state, event, policies),
    reconcile: (previous, proposed) => createColorPickerState({
      value: valueControlled ? previous.value : proposed.value,
      draft: draftControlled ? previous.draft : proposed.draft,
      format: formatControlled ? previous.format : proposed.format,
      channel: proposed.channel,
    }, policies),
    notify: (previous, proposed) => {
      if (!sameColor(previous.value, proposed.value)) options.onValueChange?.(proposed.value);
      if (previous.draft !== proposed.draft) options.onDraftChange?.(proposed.draft);
      if (previous.format !== proposed.format) options.onFormatChange?.(proposed.format);
    },
    toEffect: (command) => command,
    interaction: options,
  });
  return runtime.ok ? { ok: true, value: new DOMColorPicker(options, policies, runtime.value, valueControlled, draftControlled, formatControlled) } : runtime;
}

class DOMColorPicker implements ColorPickerConnection {
  readonly #options: ColorPickerOptions;
  readonly #policies: ColorPickerPolicies;
  readonly #runtime: SemanticController<ColorPickerState, ColorPickerEvent, ColorPickerCommand>;
  readonly #controlled: readonly [boolean, boolean, boolean];
  readonly #native = new Map<HTMLInputElement, readonly [() => void, () => void]>();
  readonly #text = new Map<HTMLInputElement, readonly [() => void, (event: KeyboardEvent) => void, () => void]>();
  readonly #channels = new Map<HTMLInputElement, readonly [ColorChannel, () => void, () => void]>();
  readonly #swatches = new Set<HTMLElement>();

  public constructor(options: ColorPickerOptions, policies: ColorPickerPolicies, runtime: SemanticController<ColorPickerState, ColorPickerEvent, ColorPickerCommand>, valueControlled: boolean, draftControlled: boolean, formatControlled: boolean) {
    this.#options = options; this.#policies = policies; this.#runtime = runtime; this.#controlled = [valueControlled, draftControlled, formatControlled];
    options.root.setAttribute('role', 'group');
    if (options.label !== undefined) options.root.setAttribute('aria-label', options.label);
    this.refresh();
  }

  public getSnapshot(): RevisionSnapshot<ColorPickerState> { return this.#runtime.getSnapshot(); }
  public getText(): string { const state = this.getSnapshot().state; return state.draft ?? unwrap(formatColorValue(state.value, state.format)); }
  public getCSSColor(): string { return unwrap(formatColorValue(this.getSnapshot().state.value, 'rgb')); }
  public syncControlledValues(values: { readonly value?: ColorValue | string; readonly draft?: string | null; readonly format?: ColorFormat }): Result<RevisionSnapshot<ColorPickerState>> {
    if (this.#controlled[0] !== (values.value !== undefined) || this.#controlled[1] !== (values.draft !== undefined) || this.#controlled[2] !== (values.format !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled color picker values must preserve their construction-time shape.' } };
    const state = this.getSnapshot().state;
    const result = this.#runtime.replace(createColorPickerState({ value: values.value ?? state.value, draft: values.draft === undefined ? state.draft : values.draft, format: values.format ?? state.format, channel: state.channel }, this.#policies));
    if (result.ok) { this.refresh(); this.#options.onUpdate?.(); }
    return result;
  }
  public handleEvent(event: ColorPickerEvent): boolean { const result = this.#runtime.handle(event); this.refresh(); if (result.ok) this.#options.onUpdate?.(); return result.ok; }
  public setNativeInputAttributes(element: HTMLInputElement): void {
    this.#removeNative(element);
    const input = (): void => { this.handleEvent({ type: 'set-color', value: element.value }); };
    const focus = (): void => { this.handleEvent({ type: 'focus-channel', channel: 'red' }); };
    element.addEventListener('input', input); element.addEventListener('focus', focus); this.#native.set(element, [input, focus]); this.refresh();
  }
  public setTextInputAttributes(element: HTMLInputElement): void {
    this.#removeText(element);
    const input = (): void => { this.handleEvent({ type: 'input', text: element.value }); };
    const key = (event: KeyboardEvent): void => { if (event.key === 'Enter') { event.preventDefault(); this.handleEvent('commit'); } else if (event.key === 'Escape') { event.preventDefault(); this.handleEvent('cancel'); } };
    const blur = (): void => { if (!this.handleEvent('commit')) this.handleEvent('cancel'); };
    element.addEventListener('input', input); element.addEventListener('keydown', key); element.addEventListener('blur', blur); this.#text.set(element, [input, key, blur]); this.refresh();
  }
  public setChannelInputAttributes(element: HTMLInputElement, channel: ColorChannel): void {
    this.#removeChannel(element);
    const input = (): void => { this.handleEvent({ type: 'set-channel', channel, value: Number(element.value) }); };
    const focus = (): void => { this.handleEvent({ type: 'focus-channel', channel }); };
    element.addEventListener('input', input); element.addEventListener('focus', focus); this.#channels.set(element, [channel, input, focus]); this.refresh();
  }
  public setSwatchAttributes(element: HTMLElement): void { this.#swatches.add(element); this.refresh(); }
  public refresh(): void {
    const state = this.getSnapshot().state; const opaqueHex = unwrap(formatColorValue({ ...state.value, alpha: 255 }, 'hex'));
    this.#options.root.dataset['color'] = this.getCSSColor(); this.#options.root.dataset['format'] = state.format; this.#options.root.dataset['channel'] = state.channel;
    this.#options.root.setAttribute('aria-disabled', String(this.#options.disabled ?? false)); this.#options.root.setAttribute('aria-readonly', String(this.#options.readOnly ?? false));
    for (const element of this.#native.keys()) { element.type = 'color'; element.value = opaqueHex; element.disabled = this.#options.disabled ?? false; element.setAttribute('aria-readonly', String(this.#options.readOnly ?? false)); }
    for (const element of this.#text.keys()) { element.type = 'text'; element.inputMode = 'text'; if (element.value !== this.getText()) element.value = this.getText(); element.disabled = this.#options.disabled ?? false; element.readOnly = this.#options.readOnly ?? false; element.setAttribute('aria-invalid', String(state.draft !== null && !isValidDraft(state.draft, this.#policies))); }
    for (const [element, [channel]] of this.#channels) { element.type = 'range'; element.min = '0'; element.max = '255'; element.step = '1'; element.value = String(state.value[channel]); element.disabled = (this.#options.disabled ?? false) || (channel === 'alpha' && this.#policies.allowAlpha === false); element.setAttribute('aria-label', `${channel} channel`); element.setAttribute('aria-valuetext', String(state.value[channel])); }
    for (const element of this.#swatches) { element.dataset['color'] = this.getCSSColor(); element.setAttribute('aria-label', this.getText()); }
  }
  public disconnect(): void { for (const element of [...this.#native.keys()]) this.#removeNative(element); for (const element of [...this.#text.keys()]) this.#removeText(element); for (const element of [...this.#channels.keys()]) this.#removeChannel(element); this.#swatches.clear(); }
  #removeNative(element: HTMLInputElement): void { const current = this.#native.get(element); if (current !== undefined) { element.removeEventListener('input', current[0]); element.removeEventListener('focus', current[1]); this.#native.delete(element); } }
  #removeText(element: HTMLInputElement): void { const current = this.#text.get(element); if (current !== undefined) { element.removeEventListener('input', current[0]); element.removeEventListener('keydown', current[1]); element.removeEventListener('blur', current[2]); this.#text.delete(element); } }
  #removeChannel(element: HTMLInputElement): void { const current = this.#channels.get(element); if (current !== undefined) { element.removeEventListener('input', current[1]); element.removeEventListener('focus', current[2]); this.#channels.delete(element); } }
}

function isValidDraft(text: string, policies: ColorPickerPolicies): boolean {
  const result = createColorPickerState({ value: text }, policies); return result.ok;
}
function sameColor(left: ColorValue, right: ColorValue): boolean { return left.red === right.red && left.green === right.green && left.blue === right.blue && left.alpha === right.alpha; }

export type { ColorChannel, ColorFormat, ColorPickerEvent, ColorPickerPolicies, ColorPickerState, ColorValue } from '@sectile/core/color-picker';
export { formatColorValue, parseColorValue } from '@sectile/core/color-picker';
