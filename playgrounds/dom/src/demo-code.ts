function example(moduleName: string, imports: string, body: string): string {
  const specifier = '@sectile/dom/' + moduleName;
  return `import { ${imports} } from '${specifier}'

const required = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector)
  if (element === null) throw new Error(\`Missing element: \${selector}\`)
  return element
}

${body.trim()}`;
}

const collectionItems = `const items = ['alpha', 'beta', 'stable'] as const
const root = required<HTMLElement>('[data-demo-root]')`;

export const domDemoCode: Readonly<Record<string, string>> = Object.freeze({
  checkbox: example('checkbox', 'createCheckbox', `const control = required<HTMLButtonElement>('[data-checkbox]')
const checkbox = createCheckbox({
  element: control,
  defaultValue: 'mixed',
  policies: { allowMixed: true },
  onValueChange: (value) => console.log('checked', value),
})

window.addEventListener('pagehide', () => checkbox.disconnect(), { once: true })`),

  switch: example('switch', 'createSwitch', `const control = required<HTMLButtonElement>('[data-switch]')
const switchControl = createSwitch({
  element: control,
  defaultChecked: false,
  onCheckedChange: (checked) => console.log('checked', checked),
})

window.addEventListener('pagehide', () => switchControl.disconnect(), { once: true })`),

  'toggle-button': example('toggle-button', 'createToggleButton', `const button = required<HTMLButtonElement>('[data-toggle]')
const toggle = createToggleButton({
  element: button,
  defaultPressed: false,
  onPressedChange: (pressed) => console.log('pressed', pressed),
})

window.addEventListener('pagehide', () => toggle.disconnect(), { once: true })`),

  'toggle-group': example('toggle-group', 'createToggleGroup', `${collectionItems}
const toggleGroup = createToggleGroup({
  root,
  items,
  multiple: true,
  defaultValue: ['alpha'],
  onValueChange: ({ value }) => console.log('pressed', value),
})

for (const item of root.querySelectorAll<HTMLElement>('[data-value]')) {
  toggleGroup.setItemAttributes(item, { id: item.dataset.value as typeof items[number] })
}
window.addEventListener('pagehide', () => toggleGroup.disconnect(), { once: true })`),

  popover: example('popover', 'createPopover', `const trigger = required<HTMLButtonElement>('[data-popover-trigger]')
const content = required<HTMLElement>('[data-popover-content]')
const popover = createPopover({
  root: content,
  trigger,
  side: 'bottom',
  align: 'center',
  closeOnInteractOutside: true,
})

window.addEventListener('pagehide', () => popover.disconnect(), { once: true })`),

  toast: example('toast', 'createToast', `const viewport = required<HTMLElement>('[data-toast-viewport]')
const toast = createToast({
  root: viewport,
  defaultDurationMs: 5000,
  maxVisible: 3,
  onItemsChange: (items) => console.log('visible toasts', items),
})

toast.push({ id: 'saved', title: 'Release saved', kind: 'success' })
window.addEventListener('pagehide', () => toast.disconnect(), { once: true })`),
  timer: example('timer', 'createTimer', `const root = required<HTMLElement>('[data-timer]')
const timer = createTimer({
  root,
  countdown: true,
  startMs: 60_000,
  autoStart: true,
  onComplete: () => console.log('complete'),
})
timer.setItemAttributes(required('[data-minutes]'), 'minutes')
timer.setItemAttributes(required('[data-seconds]'), 'seconds')
timer.setActionAttributes(required('[data-pause]'), 'pause')
timer.setActionAttributes(required('[data-restart]'), 'restart')
window.addEventListener('pagehide', () => timer.disconnect(), { once: true })`),

  'cascade-select': example('cascade-select', 'createCascadeSelect', `const root = required<HTMLElement>('[data-cascade-select]')
const trigger = required<HTMLButtonElement>('[data-trigger]')
const popup = required<HTMLElement>('[data-content]')
const cascade = createCascadeSelect({
  root,
  trigger,
  popup,
  nodes: [
    { id: 'asia', parentID: null },
    { id: 'kr', parentID: 'asia' },
    { id: 'seoul', parentID: 'kr' },
  ],
  defaultValue: 'seoul',
  onValueChange: (value) => console.log('destination', value),
})

window.addEventListener('pagehide', () => cascade.disconnect(), { once: true })`),

  'color-picker': example('color-picker', 'createColorPicker', `const root = required<HTMLElement>('[data-color-picker]')
const picker = createColorPicker({ root, defaultValue: '#5b6df680', allowAlpha: true })
picker.setNativeInputAttributes(required<HTMLInputElement>('[data-native-color]'))
picker.setTextInputAttributes(required<HTMLInputElement>('[data-color-text]'))
picker.setChannelInputAttributes(required<HTMLInputElement>('[data-alpha]'), 'alpha')
picker.setSwatchAttributes(required<HTMLElement>('[data-swatch]'))

window.addEventListener('pagehide', () => picker.disconnect(), { once: true })`),

  listbox: example('listbox', 'createListbox', `${collectionItems}
const listbox = createListbox({
  root,
  items,
  selectionMode: 'single',
  defaultValue: ['beta'],
  defaultHighlightedValue: 'beta',
  onValueChange: ({ value }) => console.log('selected', value),
})

for (const option of root.querySelectorAll<HTMLElement>('[data-value]')) {
  listbox.setItemAttributes(option, { id: option.dataset.value as typeof items[number] })
}
window.addEventListener('pagehide', () => listbox.disconnect(), { once: true })`),

  'radio-group': example('radio-group', 'createRadioGroup', `${collectionItems}
const radioGroup = createRadioGroup({
  root,
  items,
  defaultValue: 'beta',
  orientation: 'vertical',
  label: 'Release channel',
  onValueChange: (value) => console.log('selected', value),
})

for (const option of root.querySelectorAll<HTMLElement>('[data-value]')) {
  radioGroup.setItemAttributes(option, option.dataset.value as typeof items[number])
}
window.addEventListener('pagehide', () => radioGroup.disconnect(), { once: true })`),

  rating: example('rating', 'createRating', `const values = ['1', '2', '3', '4', '5'] as const
const root = required<HTMLElement>('[data-rating]')
const rating = createRating({
  root,
  items: values,
  defaultValue: '4',
  clearable: true,
  label: 'Release quality',
})

for (const item of root.querySelectorAll<HTMLElement>('[data-value]')) {
  rating.setItemAttributes(item, item.dataset.value as typeof values[number])
}
window.addEventListener('pagehide', () => rating.disconnect(), { once: true })`),

  'checkbox-group': example('checkbox-group', 'createCheckboxGroup', `${collectionItems}
const group = createCheckboxGroup({
  root,
  items,
  defaultValue: ['alpha', 'stable'],
  defaultHighlightedValue: 'alpha',
  onValueChange: ({ value }) => console.log('selected', value),
})

for (const option of root.querySelectorAll<HTMLElement>('[data-value]')) {
  group.setItemAttributes(option, { id: option.dataset.value as typeof items[number] })
}
window.addEventListener('pagehide', () => group.disconnect(), { once: true })`),

  select: example('select', 'createSelect', `${collectionItems}
const trigger = required<HTMLButtonElement>('[data-select-trigger]')
const popup = required<HTMLElement>('[data-select-popup]')
const select = createSelect({
  root,
  trigger,
  popup,
  items,
  defaultValue: 'stable',
  label: 'Release channel',
  onValueChange: (value) => console.log('selected', value),
})

for (const option of popup.querySelectorAll<HTMLElement>('[data-value]')) {
  select.setItemAttributes(option, option.dataset.value as typeof items[number])
}
window.addEventListener('pagehide', () => select.disconnect(), { once: true })`),

  combobox: example('combobox', 'createCombobox', `const input = required<HTMLInputElement>('[data-combobox-input]')
const popup = required<HTMLElement>('[data-combobox-popup]')
const items = [
  { id: 'alpha', label: 'Alpha' },
  { id: 'beta', label: 'Beta' },
  { id: 'hangul', label: '한글' },
] as const
const combobox = createCombobox({
  items,
  input,
  popup,
  policies: { matches: (label, query) => label.toLowerCase().startsWith(query.toLowerCase()) },
  onAccept: (id) => console.log('accepted', id),
})

combobox.setInputAttributes('Command search')
combobox.setPopupAttributes('Matching commands')
for (const option of popup.querySelectorAll<HTMLElement>('[data-value]')) {
  combobox.setItemAttributes(option, { id: option.dataset.value as typeof items[number]['id'] })
}
window.addEventListener('pagehide', () => combobox.disconnect(), { once: true })`),

  tabs: example('tabs', 'createTabs', `${collectionItems}
const tabs = createTabs({
  root,
  items,
  defaultValue: 'alpha',
  defaultHighlightedValue: 'alpha',
  policies: { activation: 'manual' },
  label: 'Release details',
})

for (const trigger of root.querySelectorAll<HTMLElement>('[data-tab]')) {
  const id = trigger.dataset.tab as typeof items[number]
  tabs.setTriggerAttributes(trigger, id)
  tabs.setPanelAttributes(required<HTMLElement>(\`[data-panel="\${id}"]\`), id)
}
window.addEventListener('pagehide', () => tabs.disconnect(), { once: true })`),

  stepper: example('stepper', 'createStepper', `${collectionItems}
const stepper = createStepper({
  root,
  items,
  defaultValue: 'alpha',
  defaultHighlightedValue: 'alpha',
  label: 'Release setup',
})

for (const trigger of root.querySelectorAll<HTMLElement>('[data-step]')) {
  const id = trigger.dataset.step as typeof items[number]
  stepper.setTriggerAttributes(trigger, id)
  stepper.setPanelAttributes(required<HTMLElement>(\`[data-panel="\${id}"]\`), id)
}
window.addEventListener('pagehide', () => stepper.disconnect(), { once: true })`),

  pagination: example('pagination', 'createPagination', `const root = required<HTMLElement>('[data-pagination]')
const pagination = createPagination({
  root,
  total: 240,
  defaultPage: 4,
  defaultItemsPerPage: 20,
  siblingCount: 1,
  onPageChange: (page) => console.log('page', page),
})

const render = () => {
  root.replaceChildren(...pagination.getItems().map((item) => {
    const button = document.createElement('button')
    button.textContent = item.type === 'page' ? String(item.page) : item.type === 'ellipsis' ? '…' : item.control
    pagination.setItemAttributes(button, item)
    return button
  }))
}
render()
window.addEventListener('pagehide', () => pagination.disconnect(), { once: true })`),

  toolbar: example('toolbar', 'createToolbar', `${collectionItems}
const toolbar = createToolbar({
  root,
  items,
  orientation: 'horizontal',
  label: 'Formatting',
  onInvoke: (id) => console.log('invoked', id),
})

for (const button of root.querySelectorAll<HTMLElement>('[data-value]')) {
  toolbar.setItemAttributes(button, button.dataset.value as typeof items[number])
}
window.addEventListener('pagehide', () => toolbar.disconnect(), { once: true })`),

  menu: example('menu', 'createMenu', `const items = [
  { id: 'file', parentID: null },
  { id: 'new', parentID: 'file' },
  { id: 'open', parentID: 'file' },
] as const
const root = required<HTMLElement>('[data-menu]')
const menu = createMenu({ root, items, defaultOpen: true, label: 'Commands' })

for (const item of root.querySelectorAll<HTMLElement>('[data-value]')) {
  menu.setItemAttributes(item, item.dataset.value as typeof items[number]['id'])
}
window.addEventListener('pagehide', () => menu.disconnect(), { once: true })`),

  menubar: example('menubar', 'createMenubar', `const items = [
  { id: 'file', parentID: null },
  { id: 'new', parentID: 'file' },
  { id: 'edit', parentID: null },
] as const
const root = required<HTMLElement>('[data-menubar]')
const menubar = createMenubar({ root, items, label: 'Application menu' })

for (const item of root.querySelectorAll<HTMLElement>('[data-value]')) {
  menubar.setItemAttributes(item, item.dataset.value as typeof items[number]['id'])
}
window.addEventListener('pagehide', () => menubar.disconnect(), { once: true })`),

  'navigation-menu': example('navigation-menu', 'createNavigationMenu', `const items = [
  { id: 'products', parentID: null },
  { id: 'overview', parentID: 'products' },
  { id: 'components', parentID: 'products' },
  { id: 'docs', parentID: null },
] as const
const root = required<HTMLElement>('[data-navigation-menu]')
const navigation = createNavigationMenu({ root, items, label: 'Primary' })

for (const item of root.querySelectorAll<HTMLElement>('[data-value]')) {
  navigation.setItemAttributes(item, item.dataset.value as typeof items[number]['id'])
}
for (const panel of root.querySelectorAll<HTMLElement>('[data-panel-for]')) {
  navigation.setSubmenuAttributes(panel, panel.dataset.panelFor as typeof items[number]['id'])
}
window.addEventListener('pagehide', () => navigation.disconnect(), { once: true })`),

  'menu-button': example('menu-button', 'createMenuButton', `const items = [
  { id: 'edit', parentID: null },
  { id: 'duplicate', parentID: null },
] as const
const root = required<HTMLElement>('[data-menu-popup]')
const trigger = required<HTMLButtonElement>('[data-menu-trigger]')
const menu = createMenuButton({ root, trigger, items, label: 'Actions' })

for (const item of root.querySelectorAll<HTMLElement>('[data-value]')) {
  menu.setItemAttributes(item, item.dataset.value as typeof items[number]['id'])
}
window.addEventListener('pagehide', () => menu.disconnect(), { once: true })`),

  disclosure: example('disclosure', 'createDisclosure', `const trigger = required<HTMLButtonElement>('[data-disclosure-trigger]')
const panel = required<HTMLElement>('[data-disclosure-panel]')
const disclosure = createDisclosure({
  trigger,
  panel,
  defaultOpen: false,
  panelID: 'deployment-options',
  onOpenChange: (open) => console.log('open', open),
})

window.addEventListener('pagehide', () => disclosure.disconnect(), { once: true })`),

  accordion: example('accordion', 'createAccordion', `const items = ['general', 'deployments', 'danger'] as const
const root = required<HTMLElement>('[data-accordion]')
const accordion = createAccordion({
  root,
  items,
  expansion: 'single',
  collapsible: true,
  defaultValue: ['general'],
  label: 'Project settings',
})

for (const trigger of root.querySelectorAll<HTMLElement>('[data-value]')) {
  const id = trigger.dataset.value as typeof items[number]
  accordion.setItemAttributes(trigger, id)
  accordion.setPanelAttributes(required<HTMLElement>(\`[data-panel="\${id}"]\`), id)
}
window.addEventListener('pagehide', () => accordion.disconnect(), { once: true })`),

  dialog: example('dialog', 'createDialog', `const root = required<HTMLElement>('[data-dialog]')
const trigger = required<HTMLButtonElement>('[data-dialog-trigger]')
const close = required<HTMLButtonElement>('[data-dialog-close]')
const dialog = createDialog({
  root,
  trigger,
  modal: true,
  labelledBy: 'dialog-title',
  describedBy: 'dialog-description',
})

close.addEventListener('click', () => dialog.handleEvent('close'))
window.addEventListener('pagehide', () => dialog.disconnect(), { once: true })`),

  'alert-dialog': example('alert-dialog', 'createAlertDialog', `const root = required<HTMLElement>('[data-alert-dialog]')
const trigger = required<HTMLButtonElement>('[data-alert-dialog-trigger]')
const cancel = required<HTMLButtonElement>('[data-alert-dialog-cancel]')
const dialog = createAlertDialog({
  root,
  trigger,
  labelledBy: 'alert-title',
  describedBy: 'alert-description',
  initialFocus: cancel,
})

cancel.addEventListener('click', () => dialog.handleEvent('close'))
window.addEventListener('pagehide', () => dialog.disconnect(), { once: true })`),

  tooltip: example('tooltip', 'createTooltip', `const trigger = required<HTMLButtonElement>('[data-tooltip-trigger]')
const tooltipElement = required<HTMLElement>('[data-tooltip]')
const tooltip = createTooltip({
  root: tooltipElement,
  trigger,
  id: 'keyboard-help',
})

window.addEventListener('pagehide', () => tooltip.disconnect(), { once: true })`),

  carousel: example('carousel', 'createCarousel', `const slides = ['foundation', 'adapters', 'frameworks'] as const
const root = required<HTMLElement>('[data-carousel]')
const carousel = createCarousel({
  root,
  slides,
  previousButton: required('[data-carousel-previous]'),
  nextButton: required('[data-carousel-next]'),
  indicatorGroup: required('[data-carousel-indicators]'),
  defaultValue: 'foundation',
  policies: { wrap: true },
  autoplay: { delayMs: 4000, stopOnInteraction: false },
})

for (const slide of root.querySelectorAll<HTMLElement>('[data-value]')) {
  carousel.setSlideAttributes(slide, slide.dataset.value as typeof slides[number])
}
window.addEventListener('pagehide', () => carousel.disconnect(), { once: true })`),

  feed: example('feed', 'createFeed', `const items = ['r1', 'r2', 'r3'] as const
const root = required<HTMLElement>('[data-feed]')
const feed = createFeed({
  root,
  items,
  revision: 1,
  label: 'Release activity',
  setSize: 3,
  getPosition: (id) => items.indexOf(id) + 1,
  onRequestWindow: (direction, anchor) => console.log('load', direction, anchor),
})

for (const item of root.querySelectorAll<HTMLElement>('[data-value]')) {
  feed.setItemAttributes(item, item.dataset.value as typeof items[number])
}
window.addEventListener('pagehide', () => feed.disconnect(), { once: true })`),

  calendar: example('calendar', 'createCalendar', `const rows = [[
  '2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20',
  '2026-08-21', '2026-08-22', '2026-08-23',
]] as const
const root = required<HTMLElement>('[data-calendar]')
const calendar = createCalendar({
  root,
  rows,
  defaultValue: '2026-08-22',
  defaultHighlightedValue: '2026-08-22',
  onValueChange: ({ value }) => console.log('selected', value),
})

for (const cell of root.querySelectorAll<HTMLElement>('[data-value]')) {
  calendar.setCellAttributes(cell, cell.dataset.value as typeof rows[number][number])
}
window.addEventListener('pagehide', () => calendar.disconnect(), { once: true })`),

  grid: example('grid', 'createGrid', `const rows = [['name', 'status'], ['package', 'ready']] as const
const root = required<HTMLElement>('[data-grid]')
const grid = createGrid({
  root,
  rows,
  defaultValue: 'package',
  defaultHighlightedValue: 'package',
  label: 'Package status',
})

for (const cell of root.querySelectorAll<HTMLElement>('[data-value]')) {
  grid.setCellAttributes(cell, cell.dataset.value as 'name' | 'status' | 'package' | 'ready')
}
window.addEventListener('pagehide', () => grid.disconnect(), { once: true })`),

  'tree-view': example('tree-view', 'createTreeView', `const nodes = [
  { id: 'workspace', parentID: null },
  { id: 'src', parentID: 'workspace' },
  { id: 'tests', parentID: 'workspace' },
] as const
const root = required<HTMLElement>('[data-tree]')
const tree = createTreeView({
  root,
  nodes,
  defaultExpandedValue: ['workspace'],
  defaultValue: ['src'],
  label: 'Workspace files',
})

for (const item of root.querySelectorAll<HTMLElement>('[data-value]')) {
  tree.setItemAttributes(item, { id: item.dataset.value as typeof nodes[number]['id'] })
}
window.addEventListener('pagehide', () => tree.disconnect(), { once: true })`),

  'tree-grid': example('tree-grid', 'createTreeGrid', `const rows = [
  { id: 'workspace', parentID: null, cells: ['workspace-name', 'workspace-status'] },
  { id: 'src', parentID: 'workspace', cells: ['src-name', 'src-status'] },
] as const
const root = required<HTMLElement>('[data-tree-grid]')
const treeGrid = createTreeGrid({
  root,
  rows,
  defaultExpandedValue: ['workspace'],
  defaultValue: 'workspace-name',
  label: 'Workspace status',
})

for (const cell of root.querySelectorAll<HTMLElement>('[data-value]')) {
  treeGrid.setCellAttributes(cell, cell.dataset.value as typeof rows[number]['cells'][number])
}
window.addEventListener('pagehide', () => treeGrid.disconnect(), { once: true })`),

  slider: example('slider', 'createSlider', `const thumb = required<HTMLElement>('[data-slider-thumb]')
const track = required<HTMLElement>('[data-slider-track]')
const slider = createSlider({
  root: thumb,
  track,
  min: '0',
  max: '100',
  step: '5',
  defaultValue: '40',
  label: 'Deployment traffic',
})

window.addEventListener('pagehide', () => slider.disconnect(), { once: true })`),

  'multi-thumb-slider': example('multi-thumb-slider', 'createMultiThumbSlider', `const root = required<HTMLElement>('[data-range-slider]')
const track = required<HTMLElement>('[data-range-track]')
const thumbs = ['minimum', 'maximum'] as const
const slider = createMultiThumbSlider({
  root,
  track,
  thumbs,
  min: '0',
  max: '100',
  step: '1',
  defaultValues: [25, 75],
  policies: { minGap: 10 },
})

for (const thumb of root.querySelectorAll<HTMLElement>('[data-value]')) {
  slider.setThumbAttributes(thumb, thumb.dataset.value as typeof thumbs[number])
}
window.addEventListener('pagehide', () => slider.disconnect(), { once: true })`),

  'window-splitter': example('window-splitter', 'createWindowSplitter', `const handle = required<HTMLElement>('[data-splitter-handle]')
const container = required<HTMLElement>('[data-splitter]')
const splitter = createWindowSplitter({
  root: handle,
  track: container,
  min: '20',
  max: '80',
  step: '1',
  defaultValue: '42',
  label: 'Resize navigator',
})

window.addEventListener('pagehide', () => splitter.disconnect(), { once: true })`),

  'spin-button': example('spin-button', 'createSpinButton', `const input = required<HTMLInputElement>('[data-spin-button]')
const spinButton = createSpinButton({
  input,
  min: '1',
  max: '12',
  step: '1',
  defaultValue: '2',
  label: 'Guest count',
})

required('[data-decrement]').addEventListener('click', () => spinButton.handleEvent('decrement'))
required('[data-increment]').addEventListener('click', () => spinButton.handleEvent('increment'))
window.addEventListener('pagehide', () => spinButton.disconnect(), { once: true })`),

  'number-field': example('number-field', 'createNumberField', `const input = required<HTMLInputElement>('[data-number-field]')
const numberField = createNumberField({
  input,
  defaultValue: '40.25',
  policies: { min: '0', max: '100' },
  label: 'Deployment percentage',
  onValueChange: ({ value }) => console.log('value', value),
})

window.addEventListener('pagehide', () => numberField.disconnect(), { once: true })`),

  'quantity-field': example('quantity-field', 'createQuantityField, createStandardQuantityPolicies', `const input = required<HTMLInputElement>('[data-quantity-field]')
const unitSelect = required<HTMLSelectElement>('[data-unit-select]')
const quantityField = createQuantityField({
  input,
  unitSelect,
  policies: createStandardQuantityPolicies('metre', 'metric'),
  defaultQuantity: { value: '1.25', unit: 'metre' },
  defaultDisplayUnit: 'centimetre',
  label: 'Length',
})

window.addEventListener('pagehide', () => quantityField.disconnect(), { once: true })`),

  text: example('text', 'createText, createTextState', `const input = required<HTMLInputElement>('[data-text-field]')
const text = createText({
  element: input,
  defaultValue: createTextState('한글 and text'),
  onValueChange: ({ value }) => console.log('text', value.text),
})

window.addEventListener('pagehide', () => text.disconnect(), { once: true })`),

  editable: example('editable', 'createEditable', `const root = required<HTMLElement>('[data-editable]')
const preview = required<HTMLElement>('[data-editable-preview]')
const input = required<HTMLInputElement>('[data-editable-input]')
const editable = createEditable({
  root,
  preview,
  input,
  editTrigger: required<HTMLButtonElement>('[data-editable-edit]'),
  submitTrigger: required<HTMLButtonElement>('[data-editable-submit]'),
  cancelTrigger: required<HTMLButtonElement>('[data-editable-cancel]'),
  defaultValue: 'Sectile 0.1',
  onValueChange: (value) => { preview.textContent = value },
})

window.addEventListener('pagehide', () => editable.disconnect(), { once: true })`),

  'pin-input': example('pin-input', 'createPinInput', `const root = required<HTMLElement>('[data-pin-input]')
const inputs = [...root.querySelectorAll<HTMLInputElement>('input')]
const pinInput = createPinInput({
  root,
  inputs,
  defaultValue: '24',
  label: 'Verification code',
  onComplete: (value) => console.log('complete', value),
})

window.addEventListener('pagehide', () => pinInput.disconnect(), { once: true })`),

  'tags-input': example('tags-input', 'createTagsInput', `const root = required<HTMLElement>('[data-tags-input]')
const input = required<HTMLInputElement>('[data-tags-input-field]')
const tagsInput = createTagsInput({
  root,
  input,
  defaultValue: ['TypeScript', 'Accessibility'],
  policies: { maxTags: 8 },
  label: 'Project skills',
  onValueChange: (value) => console.log('tags', value),
})

window.addEventListener('pagehide', () => tagsInput.disconnect(), { once: true })`),

  'date-field': example('date-field', 'createDateField', `const input = required<HTMLInputElement>('[data-date-field]')
const dateField = createDateField({
  input,
  defaultValue: { year: 2026, month: 8, day: 22 },
  label: 'Release date',
  onValueChange: (value) => console.log('date', value),
})

window.addEventListener('pagehide', () => dateField.disconnect(), { once: true })`),

  'date-range-field': example('date-range-field', 'createDateRangeField', `const dateRangeField = createDateRangeField({
  startInput: required<HTMLInputElement>('[data-range-start]'),
  endInput: required<HTMLInputElement>('[data-range-end]'),
  defaultValue: {
    start: { year: 2026, month: 8, day: 22 },
    end: { year: 2026, month: 8, day: 28 },
  },
  onValueChange: (value) => console.log('range', value),
})

window.addEventListener('pagehide', () => dateRangeField.disconnect(), { once: true })`),

  'time-field': example('time-field', 'createTimeField', `const input = required<HTMLInputElement>('[data-time-field]')
const timeField = createTimeField({
  input,
  defaultValue: { hour: 9, minute: 30, second: 0, millisecond: 0 },
  label: 'Start time',
  onValueChange: (value) => console.log('time', value),
})

window.addEventListener('pagehide', () => timeField.disconnect(), { once: true })`),

  'time-range-field': example('time-range-field', 'createTimeRangeField', `const timeRangeField = createTimeRangeField({
  startInput: required<HTMLInputElement>('[data-time-start]'),
  endInput: required<HTMLInputElement>('[data-time-end]'),
  defaultValue: {
    start: { hour: 9, minute: 30, second: 0, millisecond: 0 },
    end: { hour: 17, minute: 45, second: 0, millisecond: 0 },
  },
})

window.addEventListener('pagehide', () => timeRangeField.disconnect(), { once: true })`),

  'date-time-field': example('date-time-field', 'createDateTimeField', `const input = required<HTMLInputElement>('[data-date-time-field]')
const dateTimeField = createDateTimeField({
  input,
  defaultValue: {
    date: { year: 2026, month: 8, day: 22 },
    time: { hour: 9, minute: 30, second: 0, millisecond: 0 },
  },
  label: 'Deployment time',
})

window.addEventListener('pagehide', () => dateTimeField.disconnect(), { once: true })`),

  'date-picker': example('date-picker', 'createDatePicker', `const root = required<HTMLElement>('[data-date-picker]')
const grid = required<HTMLElement>('[data-date-grid]')
const picker = createDatePicker({
  root,
  grid,
  trigger: required('[data-date-trigger]'),
  input: required<HTMLInputElement>('[data-date-input]'),
  defaultValue: { year: 2026, month: 8, day: 22 },
  defaultOpen: true,
})

for (const week of picker.getMonth()) for (const value of week) {
  const cell = document.createElement('button')
  cell.textContent = String(value.day)
  picker.setCellAttributes(cell, value)
  grid.append(cell)
}
window.addEventListener('pagehide', () => picker.disconnect(), { once: true })`),

  'date-range-picker': example('date-range-picker', 'createDateRangePicker', `const root = required<HTMLElement>('[data-date-range-picker]')
const grid = required<HTMLElement>('[data-date-grid]')
const picker = createDateRangePicker({
  root,
  grid,
  trigger: required('[data-date-trigger]'),
  startInput: required<HTMLInputElement>('[data-start-input]'),
  endInput: required<HTMLInputElement>('[data-end-input]'),
  defaultValue: {
    start: { year: 2026, month: 8, day: 22 },
    end: { year: 2026, month: 8, day: 25 },
  },
})

for (const week of picker.getMonth()) for (const value of week) {
  const cell = document.createElement('button')
  cell.textContent = String(value.day)
  picker.setCellAttributes(cell, value)
  grid.append(cell)
}
window.addEventListener('pagehide', () => picker.disconnect(), { once: true })`),

  'date-time-picker': example('date-time-picker', 'createDateTimePicker', `const root = required<HTMLElement>('[data-date-time-picker]')
const grid = required<HTMLElement>('[data-date-grid]')
const picker = createDateTimePicker({
  root,
  grid,
  trigger: required('[data-date-trigger]'),
  input: required<HTMLInputElement>('[data-date-input]'),
  timeInput: required<HTMLInputElement>('[data-time-input]'),
  defaultValue: {
    date: { year: 2026, month: 8, day: 22 },
    time: { hour: 9, minute: 30, second: 0, millisecond: 0 },
  },
})

window.addEventListener('pagehide', () => picker.disconnect(), { once: true })`),

  'date-time-range-picker': example('date-time-range-picker', 'createDateTimeRangePicker', `const root = required<HTMLElement>('[data-date-time-range-picker]')
const picker = createDateTimeRangePicker({
  root,
  grid: required('[data-date-grid]'),
  trigger: required('[data-date-trigger]'),
  startInput: required<HTMLInputElement>('[data-start-date]'),
  startTimeInput: required<HTMLInputElement>('[data-start-time]'),
  endInput: required<HTMLInputElement>('[data-end-date]'),
  endTimeInput: required<HTMLInputElement>('[data-end-time]'),
  defaultValue: {
    start: {
      date: { year: 2026, month: 8, day: 22 },
      time: { hour: 9, minute: 30, second: 0, millisecond: 0 },
    },
    end: {
      date: { year: 2026, month: 8, day: 25 },
      time: { hour: 17, minute: 30, second: 0, millisecond: 0 },
    },
  },
})

window.addEventListener('pagehide', () => picker.disconnect(), { once: true })`),
});
