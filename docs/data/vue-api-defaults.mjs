const pickerComponents = new Set([
  'date-picker',
  'date-range-picker',
  'date-time-picker',
  'date-time-range-picker',
  'month-picker',
  'month-range-picker',
  'range-calendar',
  'year-picker',
  'year-range-picker',
]);

const popupComponents = new Set(['alert-dialog', 'dialog', 'popover', 'tooltip']);

const pickerRootDefaults = Object.freeze({
  modelValue: 'undefined',
  defaultValue: 'null',
  highlightedValue: 'undefined',
  defaultHighlightedValue: 'undefined',
  open: 'undefined',
  defaultOpen: 'false',
  disabled: 'false',
  readonly: 'false',
  required: 'false',
  label: 'undefined',
  policies: 'undefined',
});

const popupRootDefaults = Object.freeze({
  open: 'undefined',
  defaultOpen: 'false',
  disabled: 'false',
  label: 'undefined',
  autoFocus: 'true',
  restoreFocus: 'true',
  side: "'bottom'",
  align: "'center'",
  sideOffset: '8',
  collisionPadding: '8',
  collisionBoundary: 'undefined',
  avoidCollisions: 'true',
  arrowPadding: '8',
  hideWhenDetached: 'true',
  strategy: "'fixed'",
  middleware: 'undefined',
  autoUpdate: 'undefined',
});

export function vueApiDefault(locale, component, typeName, property, extracted) {
  if (component === 'stepper' && typeName === 'StepperActionProps') {
    if (property === 'disabled' || property === 'asChild') return { code: 'false' };
    if (property === 'as') return { code: "'button'" };
  }

  if (component === 'tree-view' && typeName === 'TreeViewGroupProps') {
    if (property === 'as') return { code: "'div'" };
    if (property === 'asChild') return { code: 'false' };
  }

  if (typeName.endsWith('PartProps') && property === 'as') {
    return locale === 'ko' ? { text: '파트별로 다름' } : { text: 'Varies by part' };
  }
  if (typeName.endsWith('PartProps') && property === 'asChild') return { code: 'false' };

  if (pickerComponents.has(component) && typeName.endsWith('RootProps')) {
    if (property === 'defaultView') {
      const view = /^(?:month|year)-/u.test(component) ? 'year' : 'month';
      return { code: `'${view}'` };
    }
    const value = pickerRootDefaults[property];
    if (value !== undefined) return { code: value };
  }

  if (popupComponents.has(component) && typeName.endsWith('RootProps')) {
    if (property === 'modal') return { code: component === 'dialog' ? 'true' : 'false' };
    if (property === 'trapFocus') return { code: ['alert-dialog', 'dialog'].includes(component) ? 'true' : 'false' };
    if (property === 'closeOnInteractOutside') return { code: component === 'popover' ? 'true' : 'false' };
    const value = popupRootDefaults[property];
    if (value !== undefined) return { code: value };
  }

  if (popupComponents.has(component) && typeName.endsWith('PortalProps')) {
    if (property === 'to') return { code: "'body'" };
    if (property === 'disabled') return { code: 'false' };
  }

  if (extracted !== undefined) return { code: extracted };
  return { code: 'undefined' };
}
