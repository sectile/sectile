import { withInteractionCases, type DemoDefinition } from '../playground.js';
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
import { checkboxGroupDemo, paginationDemo, ratingDemo, selectDemo, stepperDemo } from './extended-selection.js';
import { pinInputDemo, tagsInputDemo } from './structured-inputs.js';
import { numberFieldDemo } from './number-field.js';

const rawDemos: readonly DemoDefinition[] = [
  listboxDemo,
  sliderDemo,
  multiThumbSliderDemo,
  windowSplitterDemo,
  spinButtonDemo,
  numberFieldDemo,
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
  checkboxGroupDemo,
  selectDemo,
  paginationDemo,
  stepperDemo,
  ratingDemo,
  pinInputDemo,
  tagsInputDemo,
];

const readOnlyDemos = new Set([
  'listbox', 'slider', 'multi-thumb-slider', 'spin-button', 'number-field', 'text', 'combobox',
  'tree-grid', 'grid', 'radio-group', 'checkbox',
  'checkbox-group', 'select', 'pagination', 'rating', 'pin-input', 'tags-input',
]);

export const demos: readonly DemoDefinition[] = Object.freeze(
  rawDemos.map((demo) => withInteractionCases(demo, {
    readOnly: readOnlyDemos.has(demo.id),
    ...(demo.id === 'grid' ? { readOnlyCaseID: 'editable' } : {}),
  })),
);
