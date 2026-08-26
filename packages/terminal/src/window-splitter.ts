import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import type { QuantizedRange } from '@sectile/core/range';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { SliderState } from '@sectile/core/slider';
import {
  tryCreateSlider,
  type KeyboardInput,
  type SliderConnection,
  type SliderControlledValues,
  type SliderOptions,
} from './slider.js';

export type WindowSplitterOptions = Omit<SliderOptions, 'readOnly'> & {
  readonly orientation?: 'horizontal' | 'vertical';
};

export interface WindowSplitterConnection {
  readonly range: QuantizedRange;
  getSnapshot(): RevisionSnapshot<SliderState>;
  getValue(): string;
  syncControlledValues(values: SliderControlledValues): Result<RevisionSnapshot<SliderState>>;
  handleKeyboardInput(input: KeyboardInput): boolean;
}

export function createWindowSplitter(
  options: WindowSplitterOptions,
): FacadeConnection<WindowSplitterConnection> {
  return unwrap(tryCreateWindowSplitter(options));
}

export function tryCreateWindowSplitter(
  options: WindowSplitterOptions,
): Result<FacadeConnection<WindowSplitterConnection>> {
  return createFacadeConnection(options, (options) => tryCreateWindowSplitterConnection(options));
}

function tryCreateWindowSplitterConnection(
  options: WindowSplitterOptions,
): Result<WindowSplitterConnection> {
  const { orientation = 'horizontal', ...sliderOptions } = options;
  const slider = tryCreateSlider(sliderOptions);
  if (!slider.ok) return slider;
  return {
    ok: true,
    value: new TerminalWindowSplitterConnection(slider.value, orientation),
  };
}

class TerminalWindowSplitterConnection implements WindowSplitterConnection {
  public readonly range: QuantizedRange;
  readonly #slider: SliderConnection;
  readonly #orientation: 'horizontal' | 'vertical';

  public constructor(
    slider: SliderConnection,
    orientation: 'horizontal' | 'vertical',
  ) {
    this.#slider = slider;
    this.range = slider.range;
    this.#orientation = orientation;
  }

  public getSnapshot(): RevisionSnapshot<SliderState> {
    return this.#slider.getSnapshot();
  }

  public getValue(): string {
    return this.#slider.getValue();
  }

  public syncControlledValues(
    values: SliderControlledValues,
  ): Result<RevisionSnapshot<SliderState>> {
    return this.#slider.syncControlledValues(values);
  }

  public handleKeyboardInput(input: KeyboardInput): boolean {
    if (this.#orientation !== 'vertical') return this.#slider.handleKeyboardInput(input);
    if (input.key === 'up') return this.#slider.handleKeyboardInput({ ...input, key: 'down' });
    if (input.key === 'down') return this.#slider.handleKeyboardInput({ ...input, key: 'up' });
    return this.#slider.handleKeyboardInput(input);
  }
}
