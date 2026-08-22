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
import { quantityFieldDemo } from './quantity-field.js';
import { dateFieldDemo, datePickerDemo, dateRangePickerDemo, timeFieldDemo } from './date-time.js';

const rawDemos: readonly DemoDefinition[] = [
  listboxDemo,
  sliderDemo,
  multiThumbSliderDemo,
  windowSplitterDemo,
  spinButtonDemo,
  numberFieldDemo,
  quantityFieldDemo,
  dateFieldDemo,
  timeFieldDemo,
  datePickerDemo,
  dateRangePickerDemo,
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

interface DemoGroupDefinition {
  readonly id: string;
  readonly label: string;
  readonly demoIDs: readonly string[];
}

export interface DemoGroup {
  readonly id: string;
  readonly label: string;
  readonly demos: readonly DemoDefinition[];
}

const groupDefinitions: readonly DemoGroupDefinition[] = [
  {
    id: 'input',
    label: 'Input',
    demoIDs: [
      'combobox', 'date-field', 'number-field', 'pin-input', 'quantity-field',
      'spin-button', 'tags-input', 'text', 'time-field',
    ],
  },
  {
    id: 'selection',
    label: 'Selection',
    demoIDs: [
      'checkbox', 'checkbox-group', 'date-picker', 'date-range-picker', 'listbox',
      'radio-group', 'rating', 'select', 'switch', 'toggle-button',
    ],
  },
  {
    id: 'navigation',
    label: 'Navigation',
    demoIDs: ['carousel', 'menu', 'menu-button', 'menubar', 'pagination', 'tabs', 'toolbar'],
  },
  {
    id: 'collection',
    label: 'Collections',
    demoIDs: ['calendar', 'feed', 'grid', 'tree-grid', 'tree-view'],
  },
  {
    id: 'value-layout',
    label: 'Value & layout',
    demoIDs: ['multi-thumb-slider', 'slider', 'stepper', 'window-splitter'],
  },
  {
    id: 'disclosure-overlay',
    label: 'Disclosure & overlays',
    demoIDs: ['accordion', 'alert-dialog', 'dialog', 'disclosure', 'tooltip'],
  },
];

const readOnlyDemos = new Set([
  'listbox', 'slider', 'multi-thumb-slider', 'spin-button', 'number-field', 'quantity-field', 'date-field', 'time-field', 'text', 'combobox',
  'tree-grid', 'grid', 'radio-group', 'checkbox',
  'checkbox-group', 'select', 'pagination', 'rating', 'pin-input', 'tags-input',
]);

const demosByID = new Map(rawDemos.map((demo) => [demo.id, demo]));
const groupedIDs = groupDefinitions.flatMap((group) => group.demoIDs);
if (new Set(groupedIDs).size !== rawDemos.length || groupedIDs.length !== rawDemos.length) {
  throw new Error('Every DOM playground demo must belong to exactly one navigation group.');
}

export const demoGroups: readonly DemoGroup[] = Object.freeze(groupDefinitions.map((group) => Object.freeze({
  id: group.id,
  label: group.label,
  demos: Object.freeze(group.demoIDs.map((id) => {
    const demo = demosByID.get(id);
    if (demo === undefined) throw new Error(`Unknown DOM playground demo in navigation group: ${id}`);
    return withInteractionCases(demo, {
      readOnly: readOnlyDemos.has(demo.id),
      ...(demo.id === 'grid' ? { readOnlyCaseID: 'editable' } : {}),
    });
  }).sort((left, right) => left.label.localeCompare(right.label, 'en'))),
})));

export const demos: readonly DemoDefinition[] = Object.freeze(
  demoGroups.flatMap((group) => group.demos),
);
