import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import { tryCreateSlider, type SliderConnection, type SliderOptions } from './slider.js';
export type WindowSplitterOptions = Omit<SliderOptions, 'role' | 'readOnly'>;
export type WindowSplitterConnection = SliderConnection;
export function createWindowSplitter(options: WindowSplitterOptions): FacadeConnection<WindowSplitterConnection> {
  return unwrap(tryCreateWindowSplitter(options));
}

export function tryCreateWindowSplitter(options: WindowSplitterOptions): Result<FacadeConnection<WindowSplitterConnection>> {
  return createFacadeConnection(options, (options) => tryCreateWindowSplitterConnection(options));
}

function tryCreateWindowSplitterConnection(options: WindowSplitterOptions): Result<WindowSplitterConnection> {
  return tryCreateSlider({ ...options, role: 'separator' });
}
