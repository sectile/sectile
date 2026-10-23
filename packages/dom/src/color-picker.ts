import type { Result } from '@sectile/core';
import { applyColorPickerEvent, tryCreateColorPickerState, reconcileColorPickerState, formatColorValue, getColorAreaValue, getColorCoordinates, type ColorAreaSelection, type ColorAreaValue, type ColorChannel, type ColorCoordinate, type ColorCoordinateValue, type ColorFormat, type ColorModel, type ColorPickerCommand, type ColorPickerEvent, type ColorPickerPolicies, type ColorPickerState, type ColorValue } from '@sectile/core/color-picker';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { unwrap } from '@sectile/core/result';
import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { createSemanticController, type SemanticController } from '@sectile/core/adapter-runtime';

export interface ColorPickerOptions extends ColorPickerPolicies {
  readonly root: HTMLElement;
  readonly value?: ColorValue | string;
  readonly defaultValue?: ColorValue | string;
  /** Restore a canonical editing selection without changing controlled value ownership. */
  readonly area?: ColorAreaSelection;
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

export type ColorPickerInputPart = 'native-input' | 'text-input' | 'hue-slider' | 'alpha-slider';
export interface ColorPickerInputOptions extends ColorPickerPolicies {
  readonly part: ColorPickerInputPart;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
}
export interface ColorPickerInputAttributes {
  readonly type: 'color' | 'text' | 'range';
  readonly value: string;
  readonly disabled: boolean;
  readonly readonly: boolean;
  readonly inputmode?: 'text';
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly 'aria-readonly': 'true' | 'false';
  readonly 'aria-invalid'?: 'true' | 'false';
}

export function getColorPickerInputAttributes(state: ColorPickerState, options: ColorPickerInputOptions): ColorPickerInputAttributes {
  const base = { disabled: options.disabled ?? false, readonly: false, 'aria-readonly': options.readOnly ? 'true' as const : 'false' as const };
  switch (options.part) {
    case 'native-input': return Object.freeze({ ...base, type: 'color', value: unwrap(formatColorValue({ ...state.value, alpha: 255 }, 'hex')) });
    case 'text-input': return Object.freeze({ ...base, type: 'text', inputmode: 'text', readonly: options.readOnly ?? false,
      value: state.draft ?? unwrap(formatColorValue(state.value, state.format)), 'aria-invalid': state.draft !== null && !isValidDraft(state.draft, options) ? 'true' : 'false' });
    case 'hue-slider': return Object.freeze({ ...base, type: 'range', min: 0, max: 360, step: 1, value: String(unwrap(getColorAreaValue(state.value, state.area)).hue) });
    case 'alpha-slider': return Object.freeze({ ...base, type: 'range', min: 0, max: 100, step: 1,
      disabled: base.disabled || options.allowAlpha === false, value: String(Math.round(unwrap(getColorAreaValue(state.value)).alpha * 100)) });
    default: throw new TypeError('Unsupported ColorPicker input part.');
  }
}

export type ColorPickerValueChangeHandler = NonNullable<ColorPickerOptions['onValueChange']>;
export type ColorPickerDraftChangeHandler = NonNullable<ColorPickerOptions['onDraftChange']>;
export type ColorPickerFormatChangeHandler = NonNullable<ColorPickerOptions['onFormatChange']>;
export type ColorPickerUpdateHandler = NonNullable<ColorPickerOptions['onUpdate']>;

/** Borrowed native inputs for the two dimensions of a color area. */
export interface ColorPickerAreaAxes {
  readonly saturation: HTMLInputElement;
  readonly brightness: HTMLInputElement;
}

export interface ColorPickerConnection {
  getSnapshot(): RevisionSnapshot<ColorPickerState>;
  getText(): string;
  getCSSColor(): string;
  getAreaValue(): ColorAreaValue;
  getCoordinates(format?: ColorFormat): readonly ColorCoordinateValue[];
  syncControlledValues(values: { readonly value?: ColorValue | string; readonly draft?: string | null; readonly format?: ColorFormat }): Result<RevisionSnapshot<ColorPickerState>>;
  handleEvent(event: ColorPickerEvent): boolean;
  setNativeInputAttributes(element: HTMLInputElement): void;
  setTextInputAttributes(element: HTMLInputElement): void;
  setChannelInputAttributes(element: HTMLInputElement, channel: ColorChannel): void;
  setCoordinateInputAttributes(element: HTMLInputElement, format: ColorModel, coordinate: ColorCoordinate): void;
  setCoordinateSliderAttributes(element: HTMLInputElement, format: ColorModel, coordinate: ColorCoordinate): void;
  setAreaAttributes(element: HTMLElement, surface?: HTMLElement, axes?: ColorPickerAreaAxes): void;
  setAreaThumbAttributes(element: HTMLElement): void;
  setHueInputAttributes(element: HTMLInputElement): void;
  setAlphaInputAttributes(element: HTMLInputElement): void;
  setSwatchAttributes(element: HTMLElement): void;
  refresh(): void;
  disconnect(): void;
}

export function createColorPicker(options: ColorPickerOptions): FacadeConnection<ColorPickerConnection> { return unwrap(tryCreateColorPicker(options)); }
export function tryCreateColorPicker(options: ColorPickerOptions): Result<FacadeConnection<ColorPickerConnection>> { return createFacadeConnection(options, tryCreateColorPickerConnection); }

function tryCreateColorPickerConnection(options: ColorPickerOptions): Result<ColorPickerConnection> {
  const valueControlled = options.value !== undefined;
  const draftControlled = options.draft !== undefined;
  const formatControlled = options.format !== undefined;
  const proposal: { value: ColorPickerState | undefined } = { value: undefined };
  const policies: ColorPickerPolicies = {
    ...(options.allowAlpha === undefined ? {} : { allowAlpha: options.allowAlpha }),
    ...(options.channelStep === undefined ? {} : { channelStep: options.channelStep }),
    ...(options.alphaStep === undefined ? {} : { alphaStep: options.alphaStep }),
  };
  const runtime = createSemanticController<ColorPickerState, ColorPickerEvent, ColorPickerCommand, ColorPickerCommand>({
    initial: tryCreateColorPickerState({ value: options.value ?? options.defaultValue ?? '#000000', ...(options.area === undefined ? {} : { area: options.area }), draft: options.draft !== undefined ? options.draft : options.defaultDraft ?? null, format: options.format ?? options.defaultFormat ?? 'hex' }, policies),
    reducer: (state, event) => { const result = applyColorPickerEvent(state, event, policies); if (result.ok) proposal.value = result.value.state; return result; },
    reconcile: (previous, proposed) => reconcileColorPickerState(previous, {
      value: valueControlled ? previous.value : proposed.value,
      draft: draftControlled ? previous.draft : proposed.draft,
      format: formatControlled ? previous.format : proposed.format,
      channel: proposed.channel,
    }, policies, proposed),
    notify: [
      (previous, proposed) => {
        if (!sameColor(previous.value, proposed.value)) options.onValueChange?.(proposed.value);
      },
      (previous, proposed) => {
        if (previous.draft !== proposed.draft) options.onDraftChange?.(proposed.draft);
      },
      (previous, proposed) => {
        if (previous.format !== proposed.format) options.onFormatChange?.(proposed.format);
      },
    ],
    toEffect: (command) => command,
    interaction: options,
  });
  return runtime.ok ? { ok: true, value: new DOMColorPicker(options, policies, runtime.value, valueControlled, draftControlled, formatControlled, proposal) } : runtime;
}

class DOMColorPicker implements ColorPickerConnection {
  readonly #options: ColorPickerOptions;
  readonly #policies: ColorPickerPolicies;
  readonly #runtime: SemanticController<ColorPickerState, ColorPickerEvent, ColorPickerCommand>;
  readonly #controlled: readonly [boolean, boolean, boolean];
  readonly #proposal: { value: ColorPickerState | undefined };
  readonly #native = new Map<HTMLInputElement, readonly [() => void, () => void]>();
  readonly #text = new Map<HTMLInputElement, readonly [() => void, (event: KeyboardEvent) => void, () => void, () => void, () => void]>();
  readonly #composingText = new Set<HTMLInputElement>();
  readonly #channels = new Map<HTMLInputElement, readonly [ColorChannel, () => void, () => void]>();
  readonly #coordinates = new Map<HTMLInputElement, readonly [ColorModel, ColorCoordinate, 'number' | 'range', () => void]>();
  readonly #areas = new Map<HTMLElement, readonly [(event: PointerEvent) => void, (event: PointerEvent) => void, () => void, () => void, (event: KeyboardEvent) => void,
    ColorPickerAreaAxes | undefined, (() => void) | undefined, (() => void) | undefined]>();
  readonly #areaThumbs = new Set<HTMLElement>();
  readonly #hues = new Map<HTMLInputElement, () => void>();
  readonly #alphas = new Map<HTMLInputElement, () => void>();
  readonly #swatches = new Set<HTMLElement>();
  readonly #fallbackAttributes = new Map<HTMLElement, Partial<Record<'aria-label' | 'aria-valuetext' | 'aria-description', string>>>();

  public constructor(options: ColorPickerOptions, policies: ColorPickerPolicies, runtime: SemanticController<ColorPickerState, ColorPickerEvent, ColorPickerCommand>, valueControlled: boolean, draftControlled: boolean, formatControlled: boolean, proposal: { value: ColorPickerState | undefined }) {
    this.#options = options; this.#policies = policies; this.#runtime = runtime; this.#controlled = [valueControlled, draftControlled, formatControlled];
    this.#proposal = proposal;
    options.root.setAttribute('role', 'group');
    if (options.label !== undefined) options.root.setAttribute('aria-label', options.label);
    this.refresh();
  }

  public getSnapshot(): RevisionSnapshot<ColorPickerState> { return this.#runtime.getSnapshot(); }
  public getText(): string { const state = this.getSnapshot().state; return state.draft ?? unwrap(formatColorValue(state.value, state.format)); }
  public getCSSColor(): string { return unwrap(formatColorValue(this.getSnapshot().state.value, 'rgb')); }
  public getAreaValue(): ColorAreaValue { const state = this.getSnapshot().state; return unwrap(getColorAreaValue(state.value, state.area)); }
  public getCoordinates(format = this.getSnapshot().state.format): readonly ColorCoordinateValue[] { return unwrap(getColorCoordinates(this.getSnapshot().state.value, format, this.getSnapshot().state.area)); }
  public syncControlledValues(values: { readonly value?: ColorValue | string; readonly draft?: string | null; readonly format?: ColorFormat }): Result<RevisionSnapshot<ColorPickerState>> {
    if (this.#controlled[0] !== (values.value !== undefined) || this.#controlled[1] !== (values.draft !== undefined) || this.#controlled[2] !== (values.format !== undefined)) return { ok: false, error: { class: 'construction', code: 'controlled-shape-mismatch', message: 'Controlled color picker values must preserve their construction-time shape.' } };
    const state = this.getSnapshot().state;
    const result = this.#runtime.replace(reconcileColorPickerState(state, values, this.#policies, this.#proposal.value));
    if (result.ok) { this.#proposal.value = undefined; this.refresh(); this.#options.onUpdate?.(); }
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
    if (this.#text.has(element)) {
      this.refresh();
      return;
    }
    this.#removeText(element);
    const input = (): void => { this.#handleNativeTextInput(element); };
    const key = (event: KeyboardEvent): void => {
      if (this.#composingText.has(element) || event.isComposing) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        this.handleEvent('commit');
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.handleEvent('cancel');
      }
    };
    const blur = (): void => {
      if (this.#composingText.has(element)) return;
      if (!this.handleEvent('commit')) this.handleEvent('cancel');
    };
    const compositionStart = (): void => { this.#composingText.add(element); };
    const compositionEnd = (): void => {
      if (!this.#composingText.delete(element)) return;
      this.#handleNativeTextInput(element);
    };
    element.addEventListener('input', input);
    element.addEventListener('keydown', key);
    element.addEventListener('blur', blur);
    element.addEventListener('compositionstart', compositionStart);
    element.addEventListener('compositionend', compositionEnd);
    this.#text.set(element, [input, key, blur, compositionStart, compositionEnd]);
    this.refresh();
  }
  public setChannelInputAttributes(element: HTMLInputElement, channel: ColorChannel): void {
    this.#removeChannel(element);
    const input = (): void => { this.handleEvent({ type: 'set-channel', channel, value: Number(element.value) }); };
    const focus = (): void => { this.handleEvent({ type: 'focus-channel', channel }); };
    element.addEventListener('input', input); element.addEventListener('focus', focus); this.#channels.set(element, [channel, input, focus]); this.refresh();
  }
  public setCoordinateInputAttributes(element: HTMLInputElement, format: ColorModel, coordinate: ColorCoordinate): void {
    this.#setCoordinateAttributes(element, format, coordinate, 'number');
  }
  public setCoordinateSliderAttributes(element: HTMLInputElement, format: ColorModel, coordinate: ColorCoordinate): void {
    this.#setCoordinateAttributes(element, format, coordinate, 'range');
  }
  #setCoordinateAttributes(element: HTMLInputElement, format: ColorModel, coordinate: ColorCoordinate, kind: 'number' | 'range'): void {
    this.#removeCoordinate(element);
    const input = (): void => { this.handleEvent({ type: 'set-coordinate', format, coordinate, value: Number(element.value) }); };
    element.addEventListener('input', input); this.#coordinates.set(element, [format, coordinate, kind, input]); this.refresh();
  }
  public setAreaAttributes(element: HTMLElement, surface?: HTMLElement, axes?: ColorPickerAreaAxes): void {
    if (axes && (axes.saturation === axes.brightness || axes.saturation === element || axes.brightness === element)) throw new TypeError('Color area axes require two distinct native inputs');
    this.#removeArea(element);
    const previousValueText = element.getAttribute('aria-valuetext');
    if (previousValueText !== null && element.getAttribute('aria-description') === null) element.setAttribute('aria-description', previousValueText);
    element.removeAttribute('aria-valuetext');
    const focusAxis = (axis: 'saturation' | 'brightness'): void => {
      if (!axes || this.#options.disabled) return;
      axes.saturation.tabIndex = axis === 'saturation' ? 0 : -1;
      axes.brightness.tabIndex = axis === 'brightness' ? 0 : -1;
      axes[axis].focus({ preventScroll: true });
    };
    let saturationInput: (() => void) | undefined, brightnessInput: (() => void) | undefined;
    if (axes) {
      const brightnessFocused = axes.brightness.ownerDocument?.activeElement === axes.brightness;
      axes.saturation.tabIndex = brightnessFocused ? -1 : 0; axes.brightness.tabIndex = brightnessFocused ? 0 : -1;
      for (const axis of ['saturation', 'brightness'] as const) {
        const input = axes[axis]; input.type = 'range'; input.min = '0'; input.max = '100'; input.step = '1';
        input.setAttribute('aria-orientation', axis === 'saturation' ? 'horizontal' : 'vertical');
      }
      saturationInput = (): void => { this.handleEvent({ type: 'set-area', x: Number(axes.saturation.value) / 100, y: this.getAreaValue().y }); };
      brightnessInput = (): void => { this.handleEvent({ type: 'set-area', x: this.getAreaValue().x, y: Number(axes.brightness.value) / 100 }); };
      axes.saturation.addEventListener('input', saturationInput); axes.brightness.addEventListener('input', brightnessInput);
    }
    let dragging = false;
    const update = (event: PointerEvent): void => {
      const bounds = (surface ?? element).getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
      const y = 1 - Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
      this.handleEvent({ type: 'set-area', x, y });
    };
    const down = (event: PointerEvent): void => { if (event.button !== 0) return; event.preventDefault(); dragging = true; element.setPointerCapture?.(event.pointerId); update(event); focusAxis('saturation'); };
    const move = (event: PointerEvent): void => { if (dragging) update(event); };
    const end = (): void => { dragging = false; };
    const key = (event: KeyboardEvent): void => {
      const current = this.getAreaValue(); let x = current.x; let y = current.y;
      if (event.key === 'ArrowLeft') x -= 0.01; else if (event.key === 'ArrowRight') x += 0.01; else if (event.key === 'ArrowDown') y -= 0.01; else if (event.key === 'ArrowUp') y += 0.01; else return;
      event.preventDefault(); this.handleEvent({ type: 'set-area', x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) });
      focusAxis(event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? 'saturation' : 'brightness');
    };
    element.addEventListener('pointerdown', down); element.addEventListener('pointermove', move); element.addEventListener('pointerup', end); element.addEventListener('pointercancel', end); element.addEventListener('keydown', key);
    this.#areas.set(element, [down, move, end, end, key, axes, saturationInput, brightnessInput]); this.refresh();
  }
  public setAreaThumbAttributes(element: HTMLElement): void { this.#areaThumbs.add(element); this.refresh(); }
  public setHueInputAttributes(element: HTMLInputElement): void { this.#removeHue(element); const input = (): void => { this.handleEvent({ type: 'set-hue', value: Number(element.value) }); }; element.addEventListener('input', input); this.#hues.set(element, input); this.refresh(); }
  public setAlphaInputAttributes(element: HTMLInputElement): void { this.#removeAlpha(element); const input = (): void => { this.handleEvent({ type: 'set-alpha', value: Number(element.value) / 100 }); }; element.addEventListener('input', input); this.#alphas.set(element, input); this.refresh(); }
  public setSwatchAttributes(element: HTMLElement): void { this.#swatches.add(element); this.refresh(); }
  public refresh(): void {
    this.#refresh();
  }
  #handleNativeTextInput(element: HTMLInputElement): boolean {
    const result = this.#runtime.handle({ type: 'input', text: element.value });
    if (!result.ok) {
      this.#refresh();
      return false;
    }
    this.#refresh(element);
    this.#options.onUpdate?.();
    return true;
  }
  #refresh(preserveText?: HTMLInputElement): void {
    const state = this.getSnapshot().state;
    const inputOptions = { ...this.#policies, disabled: this.#options.disabled ?? false, readOnly: this.#options.readOnly ?? false };
    this.#options.root.dataset['color'] = this.getCSSColor(); this.#options.root.dataset['format'] = state.format; this.#options.root.dataset['channel'] = state.channel;
    this.#options.root.setAttribute('aria-disabled', String(this.#options.disabled ?? false)); this.#options.root.removeAttribute('aria-readonly');
    if (this.#options.readOnly) this.#options.root.dataset['readonly'] = ''; else delete this.#options.root.dataset['readonly'];
    if (this.#native.size !== 0) { const attributes = getColorPickerInputAttributes(state, { ...inputOptions, part: 'native-input' }); for (const element of this.#native.keys()) applyInputAttributes(element, attributes); }
    if (this.#text.size !== 0) { const attributes = getColorPickerInputAttributes(state, { ...inputOptions, part: 'text-input' }); for (const element of this.#text.keys()) applyInputAttributes(element, attributes, element !== preserveText && !this.#composingText.has(element)); }
    for (const [element, [channel]] of this.#channels) { element.type = 'range'; element.min = '0'; element.max = '255'; element.step = '1'; element.value = String(state.value[channel]); element.disabled = (this.#options.disabled ?? false) || (channel === 'alpha' && this.#policies.allowAlpha === false); this.#projectFallback(element, 'aria-label', `${channel} channel`); this.#projectFallback(element, 'aria-valuetext', String(state.value[channel])); }
    for (const [element, [format, coordinate, kind]] of this.#coordinates) { const entry = unwrap(getColorCoordinates(state.value, format, state.area)).find((item) => item.coordinate === coordinate); if (entry === undefined) continue; element.type = kind; element.min = String(entry.min); element.max = String(entry.max); element.step = String(entry.step); if (kind === 'range' || typeof document === 'undefined' || document.activeElement !== element) element.value = String(entry.value); element.disabled = (this.#options.disabled ?? false) || (coordinate === 'alpha' && this.#policies.allowAlpha === false); element.readOnly = kind === 'number' && (this.#options.readOnly ?? false); element.setAttribute('aria-readonly', String(this.#options.readOnly ?? false)); this.#projectFallback(element, 'aria-label', entry.label); this.#projectFallback(element, 'aria-valuetext', `${entry.value}${entry.unit}`); element.dataset['coordinate'] = coordinate; element.dataset['format'] = format; element.style.setProperty('--sectile-color-coordinate-color', this.getCSSColor()); }
    const area = this.getAreaValue();
    for (const [element, binding] of this.#areas) {
      const axes = binding[5];
      element.setAttribute('role', 'group'); element.tabIndex = axes || this.#options.disabled ? -1 : 0;
      this.#projectFallback(element, 'aria-label', 'Color saturation and brightness');
      this.#projectFallback(element, 'aria-description', `${Math.round(area.x * 100)}% saturation, ${Math.round(area.y * 100)}% brightness`);
      element.removeAttribute('aria-valuetext'); element.removeAttribute('aria-readonly');
      element.setAttribute('aria-disabled', String(this.#options.disabled ?? false));
      if (this.#options.readOnly) element.dataset['readonly'] = ''; else delete element.dataset['readonly'];
      element.style.setProperty('--sectile-color-area-hue', `hsl(${area.hue} 100% 50%)`);
      if (axes) {
        const valueText = element.getAttribute('aria-description')!;
        this.#projectAreaAxis(axes.saturation, area.x, 'Saturation', valueText);
        this.#projectAreaAxis(axes.brightness, area.y, 'Brightness', valueText);
        if (this.#options.disabled) { axes.saturation.tabIndex = -1; axes.brightness.tabIndex = -1; }
        else if (axes.saturation.tabIndex < 0 && axes.brightness.tabIndex < 0) axes.saturation.tabIndex = 0;
      }
    }
    for (const element of this.#areaThumbs) { element.style.setProperty('--sectile-color-area-x', `${area.x * 100}%`); element.style.setProperty('--sectile-color-area-y', `${(1 - area.y) * 100}%`); element.dataset['color'] = this.getCSSColor(); }
    if (this.#hues.size !== 0) { const attributes = getColorPickerInputAttributes(state, { ...inputOptions, part: 'hue-slider' }); for (const element of this.#hues.keys()) { applyInputAttributes(element, attributes); this.#projectFallback(element, 'aria-label', 'Hue'); } }
    if (this.#alphas.size !== 0) { const attributes = getColorPickerInputAttributes(state, { ...inputOptions, part: 'alpha-slider' }); for (const element of this.#alphas.keys()) { applyInputAttributes(element, attributes); this.#projectFallback(element, 'aria-label', 'Alpha'); element.style.setProperty('--sectile-color-alpha', this.getCSSColor()); } }
    for (const element of this.#swatches) { element.dataset['color'] = this.getCSSColor(); this.#projectFallback(element, 'aria-label', this.getText()); }
  }
  #projectAreaAxis(element: HTMLInputElement, value: number, label: string, text: string): void {
    const projected = String(Math.round(value * 100)); if (element.value !== projected) element.value = projected;
    element.disabled = this.#options.disabled ?? false;
    element.setAttribute('aria-readonly', String(this.#options.readOnly ?? false));
    this.#projectFallback(element, 'aria-label', label); this.#projectFallback(element, 'aria-valuetext', text);
  }
  public disconnect(): void { this.#proposal.value = undefined; for (const element of [...this.#native.keys()]) this.#removeNative(element); for (const element of [...this.#text.keys()]) this.#removeText(element); for (const element of [...this.#channels.keys()]) this.#removeChannel(element); for (const element of [...this.#coordinates.keys()]) this.#removeCoordinate(element); for (const element of [...this.#areas.keys()]) this.#removeArea(element); for (const element of [...this.#hues.keys()]) this.#removeHue(element); for (const element of [...this.#alphas.keys()]) this.#removeAlpha(element); this.#areaThumbs.clear(); this.#swatches.clear(); for (const element of this.#fallbackAttributes.keys()) this.#releaseFallback(element); }
  #releaseFallback(element: HTMLElement): void {
    const attributes = this.#fallbackAttributes.get(element);
    if (!attributes) return;
    for (const attribute of ['aria-label', 'aria-valuetext', 'aria-description'] as const) {
      const value = attributes[attribute]; if (value !== undefined && element.getAttribute(attribute) === value) element.removeAttribute(attribute);
    }
    this.#fallbackAttributes.delete(element);
  }
  #projectFallback(element: HTMLElement, attribute: 'aria-label' | 'aria-valuetext' | 'aria-description', value: string): void {
    const owned = this.#fallbackAttributes.get(element);
    const previous = owned?.[attribute], current = element.getAttribute(attribute);
    if (attribute === 'aria-label' && element.getAttribute('aria-labelledby') !== null) {
      if (previous !== undefined && current === previous) element.removeAttribute(attribute);
      if (owned !== undefined) delete owned[attribute];
      return;
    }
    if (current !== null && current !== previous) {
      if (owned !== undefined) delete owned[attribute];
      return;
    }
    if (current !== value) element.setAttribute(attribute, value);
    const next = owned ?? {};
    next[attribute] = value;
    if (owned === undefined) this.#fallbackAttributes.set(element, next);
  }
  #removeNative(element: HTMLInputElement): void { const current = this.#native.get(element); if (current !== undefined) { element.removeEventListener('input', current[0]); element.removeEventListener('focus', current[1]); this.#native.delete(element); } }
  #removeText(element: HTMLInputElement): void { const current = this.#text.get(element); if (current !== undefined) { element.removeEventListener('input', current[0]); element.removeEventListener('keydown', current[1]); element.removeEventListener('blur', current[2]); element.removeEventListener('compositionstart', current[3]); element.removeEventListener('compositionend', current[4]); this.#composingText.delete(element); this.#text.delete(element); } }
  #removeChannel(element: HTMLInputElement): void { const current = this.#channels.get(element); if (current !== undefined) { element.removeEventListener('input', current[1]); element.removeEventListener('focus', current[2]); this.#channels.delete(element); } }
  #removeCoordinate(element: HTMLInputElement): void { const current = this.#coordinates.get(element); if (current !== undefined) { element.removeEventListener('input', current[3]); this.#coordinates.delete(element); } }
  #removeArea(element: HTMLElement): void {
    const current = this.#areas.get(element);
    if (!current) return;
    element.removeEventListener('pointerdown', current[0]); element.removeEventListener('pointermove', current[1]);
    element.removeEventListener('pointerup', current[2]); element.removeEventListener('pointercancel', current[3]); element.removeEventListener('keydown', current[4]);
    const axes = current[5];
    if (axes) {
      if (current[6]) axes.saturation.removeEventListener('input', current[6]);
      if (current[7]) axes.brightness.removeEventListener('input', current[7]);
      this.#releaseFallback(axes.saturation); this.#releaseFallback(axes.brightness);
    }
    this.#releaseFallback(element); this.#areas.delete(element);
  }
  #removeHue(element: HTMLInputElement): void { const current = this.#hues.get(element); if (current !== undefined) { element.removeEventListener('input', current); this.#hues.delete(element); } }
  #removeAlpha(element: HTMLInputElement): void { const current = this.#alphas.get(element); if (current !== undefined) { element.removeEventListener('input', current); this.#alphas.delete(element); } }
}

function applyInputAttributes(element: HTMLInputElement, attributes: ColorPickerInputAttributes, publishValue = true): void {
  element.type = attributes.type; element.disabled = attributes.disabled; element.readOnly = attributes.readonly;
  if (publishValue && element.value !== attributes.value) element.value = attributes.value;
  if (attributes.inputmode !== undefined) element.inputMode = attributes.inputmode;
  if (attributes.min !== undefined) element.min = String(attributes.min);
  if (attributes.max !== undefined) element.max = String(attributes.max);
  if (attributes.step !== undefined) element.step = String(attributes.step);
  element.setAttribute('aria-readonly', attributes['aria-readonly']);
  if (attributes['aria-invalid'] !== undefined) element.setAttribute('aria-invalid', attributes['aria-invalid']);
}
function isValidDraft(text: string, policies: ColorPickerPolicies): boolean {
  const result = tryCreateColorPickerState({ value: text }, policies); return result.ok;
}
function sameColor(left: ColorValue, right: ColorValue): boolean { return left.red === right.red && left.green === right.green && left.blue === right.blue && left.alpha === right.alpha; }

export type { ColorAreaValue, ColorChannel, ColorCoordinate, ColorCoordinateValue, ColorFormat, ColorModel, ColorPickerEvent, ColorPickerPolicies, ColorPickerState, ColorValue } from '@sectile/core/color-picker';
export { formatColorValue, getColorAreaValue, getColorCoordinates, parseColorValue, setColorCoordinate } from '@sectile/core/color-picker';
