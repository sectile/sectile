import type { DemoDefinition } from '../playground.js';
import { calendarDemo } from './calendar.js';
import { comboboxDemo } from './combobox.js';
import { listboxDemo } from './listbox.js';
import { sliderDemo } from './slider.js';
import { textDemo } from './text.js';
import { treeGridDemo } from './tree-grid.js';
import { treeViewDemo } from './tree-view.js';
import { extraDemos } from './extras.js';

export const demos: readonly DemoDefinition[] = Object.freeze([
  listboxDemo,
  sliderDemo,
  calendarDemo,
  treeViewDemo,
  textDemo,
  comboboxDemo,
  treeGridDemo,
  ...extraDemos,
]);
