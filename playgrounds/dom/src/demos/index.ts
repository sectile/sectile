import type { DemoDefinition } from '../playground.js';
import { calendarDemo } from './calendar.js';
import { comboboxDemo } from './combobox.js';
import { listboxDemo } from './listbox.js';
import { multiThumbSliderDemo, sliderDemo } from './slider.js';
import { textDemo } from './text.js';
import { treeGridDemo } from './tree-grid.js';
import { treeViewDemo } from './tree-view.js';
import { carouselDemo, feedDemo, gridDemo } from './collection-controls.js';
import { checkboxDemo, switchDemo, toggleButtonDemo } from './checked-controls.js';
import { radioGroupDemo, tabsDemo, toolbarDemo } from './linear-controls.js';
import { accordionDemo, disclosureDemo } from './expansion-controls.js';
import { spinButtonDemo, windowSplitterDemo } from './range-controls.js';
import { alertDialogDemo, dialogDemo, tooltipDemo } from './popup-controls.js';
import { menuButtonDemo, menuDemo, menubarDemo } from './menu-controls.js';

export const demos: readonly DemoDefinition[] = Object.freeze([
  listboxDemo,
  sliderDemo,
  multiThumbSliderDemo,
  windowSplitterDemo,
  spinButtonDemo,
  dialogDemo,
  alertDialogDemo,
  tooltipDemo,
  menuDemo,
  menubarDemo,
  menuButtonDemo,
  calendarDemo,
  treeViewDemo,
  textDemo,
  comboboxDemo,
  treeGridDemo,
  gridDemo,
  carouselDemo,
  feedDemo,
  tabsDemo,
  radioGroupDemo,
  toolbarDemo,
  accordionDemo,
  disclosureDemo,
  checkboxDemo,
  switchDemo,
  toggleButtonDemo,
]);
