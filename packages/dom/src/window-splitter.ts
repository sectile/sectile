import type { Result } from '@sectile/primitives';
import { createSlider, type SliderConnection, type SliderOptions } from './slider.js';
export type WindowSplitterOptions = Omit<SliderOptions, 'role' | 'readOnly'>;
export type WindowSplitterConnection = SliderConnection;
export function createWindowSplitter(options: WindowSplitterOptions): Result<WindowSplitterConnection> {
  return createSlider({ ...options, role: 'separator' });
}
