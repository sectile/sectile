import { DOMTextElementBinding, type DOMTextElementBindingOptions } from '../../text/element-binding.js';
type TextInput = Parameters<DOMTextElementBindingOptions['dispatch']>[0];

interface Options extends DOMTextElementBindingOptions {
  readonly segments?: {
    maximum(): number;
    at(text: string, offset: number, key?: string): readonly [number, number] | null;
  };
}
interface Selection {
  readonly start: number;
  readonly end: number;
  readonly direction: 'forward' | 'backward' | 'none';
}
interface PendingEdit {
  readonly text: string;
  readonly selection: Selection;
  readonly prepared?: true;
}

/** Adds local segment preparation and rollback to the shared browser text owner. */
export class TemporalFieldBinding {
  readonly #options: Options;
  readonly #binding: DOMTextElementBinding;
  #pending: PendingEdit | null = null;
  #composition: PendingEdit | null = null;

  constructor(options: Options) {
    this.#options = options;
    this.#binding = new DOMTextElementBinding(options.segments === undefined ? options : {
      ...options, dispatch: input => this.#dispatch(input),
      keydown: event => { this.#prepareKey(event); options.keydown?.(event); },
      blur: event => { this.#pending = null; options.blur?.(event); },
    });
    try { this.#bind(); } catch (error) { this.disconnect(); throw error; }
  }

  get isActive(): boolean { return this.#binding.isActive; }
  get isComposing(): boolean { return this.#binding.isComposing; }
  render(): void {
    if (this.#pending !== null && this.#options.element.value !== this.#options.getState().snapshot.text) this.#pending = null;
    this.#binding.render();
  }
  suspend(): void {
    this.#pending = this.#composition = null;
    this.#unbind();
    this.#binding.suspend();
  }
  resume(): void {
    if (this.isActive) return;
    try { this.#binding.resume(); if (this.isActive) this.#bind(); }
    catch (error) { this.suspend(); throw error; }
  }
  disconnect(): void { this.suspend(); this.#binding.disconnect(); }

  #bind(): void {
    if (this.#options.segments === undefined) return;
    this.#options.element.addEventListener('beforeinput', this.#beforeInput);
    this.#options.element.addEventListener('click', this.#click);
  }
  #unbind(): void {
    if (this.#options.segments === undefined) return;
    this.#options.element.removeEventListener('beforeinput', this.#beforeInput);
    this.#options.element.removeEventListener('click', this.#click);
  }
  #selection(): Selection | null {
    const { selectionStart: start, selectionEnd: end, selectionDirection } = this.#options.element;
    return start == null || end == null ? null : { start, end, direction: selectionDirection ?? 'none' };
  }
  #restore(edit: PendingEdit): void {
    if (!this.isActive || this.#options.element.value !== edit.text) return;
    const { start, end, direction } = edit.selection;
    const current = this.#selection();
    if (current !== null && (current.start !== start || current.end !== end || current.direction !== direction)) {
      this.#options.element.setSelectionRange(start, end, direction);
    }
  }
  #prepareSegment(key?: string): void {
    const text = this.#options.element.value, selection = this.#selection();
    if (selection === null || selection.start !== selection.end) return;
    const range = this.#options.segments?.at(text, selection.start, key);
    if (range == null) return;
    if (key !== undefined) this.#pending = { text, selection, prepared: true };
    this.#options.element.setSelectionRange(range[0], range[1]);
  }
  #prepareKey(event: KeyboardEvent): void {
    this.#pending = null;
    if (this.isComposing || event.isComposing || event.defaultPrevented || event.metaKey
      || (event.ctrlKey || event.altKey) && event.getModifierState?.('AltGraph') !== true
      || typeof event.key !== 'string' || event.key.length > 2) return;
    this.#prepareSegment(event.key);
  }
  readonly #click = (incoming: Event): void => {
    const event = incoming as MouseEvent;
    this.#pending = null;
    if (this.isComposing || event.defaultPrevented || event.detail !== 1 || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    this.#prepareSegment();
  };
  readonly #beforeInput = (incoming: Event): void => {
    const event = incoming as InputEvent;
    if (this.isComposing || event.isComposing || event.defaultPrevented) return;
    const text = this.#options.element.value, selection = this.#selection();
    if (selection === null) return;
    const original = event.inputType === 'insertText' && this.#pending?.prepared && this.#pending.text === text
      ? this.#pending.selection : selection;
    this.#pending = { text, selection: original };
    if (!event.cancelable || typeof event.data !== 'string'
      || (event.inputType !== 'insertText' && event.inputType !== 'insertFromPaste')
      || /[\r\n]/u.test(event.data)
      || text.length - (selection.end - selection.start) + event.data.length <= this.#options.segments!.maximum()) return;
    event.preventDefault();
    this.#restore(this.#pending);
    this.#pending = null;
  };
  #dispatch(input: TextInput): boolean {
    if (input.type === 'composition-start' && this.#composition === null) {
      const selection = this.#selection();
      if (selection !== null) this.#composition = { text: this.#options.getState().snapshot.text, selection };
      this.#pending = null;
    }
    if (input.type === 'composition-commit') {
      const original = this.#composition;
      this.#composition = null;
      const accepted = this.#options.dispatch(input);
      if (!accepted && original !== null) queueMicrotask(() => this.#restore(original));
      return accepted;
    }
    if (input.type !== 'input') return this.#options.dispatch(input);
    const text = this.#options.getState().snapshot.text;
    const pending = this.#pending;
    this.#pending = null;
    if (this.#options.dispatch(input)) return true;
    this.#binding.render();
    const offset = input.startCodeUnitOffset;
    this.#restore(pending?.text === text ? pending : { text, selection: { start: offset, end: offset, direction: 'none' } });
    // The failed draft is already rolled back. Let the shared binding observe that native result.
    return true;
  }
}
