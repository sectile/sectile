import type { AnatomyIconName, AnatomyPreviewNode } from './component-anatomy.js';

export type AnatomyPreviewValues = Record<string, string>;
export type AnatomyPreviewState = Record<string, string>;

export interface AnatomyActivation {
  readonly part?: string | undefined;
  readonly kind: string;
  readonly text?: string | undefined;
  readonly value?: string | undefined;
}

const popupComponents = new Set([
  'dialog', 'alert-dialog', 'popover', 'tooltip', 'menu-button',
  'navigation-menu', 'select', 'cascade-select',
]);
const selectionComponents = new Set([
  'listbox', 'select', 'cascade-select', 'combobox', 'radio-group',
  'toggle-group', 'rating', 'tabs', 'stepper', 'toolbar',
]);
const activationParts = new Set([
  'root', 'trigger', 'close', 'item', 'item-indicator', 'step', 'cell', 'row',
  'disclosure', 'clear', 'item-delete', 'increment', 'decrement', 'first',
  'previous', 'next', 'last', 'pause', 'indicator', 'load-earlier',
  'load-newer', 'action-trigger', 'edit-trigger', 'submit-trigger',
  'cancel-trigger', 'handle', 'slide',
]);

function toggle(state: AnatomyPreviewState, key: string): void {
  state[key] = state[key] === 'true' ? 'false' : 'true';
}

function identity(node: AnatomyActivation): string {
  return node.value ?? node.text ?? node.part ?? node.kind;
}

export function initializeAnatomyInteraction(
  component: string,
  values: AnatomyPreviewValues,
  state: AnatomyPreviewState,
): void {
  Object.keys(values).forEach((key) => delete values[key]);
  Object.keys(state).forEach((key) => delete state[key]);

  Object.assign(state, {
    open: 'true',
    checked: 'false',
    paused: 'false',
    selected: defaultSelection(component),
    page: '2',
    slide: '0',
    subOpen: 'false',
    expanded: 'true',
    editing: 'false',
    toastVisible: 'true',
    feedOffset: '0',
    'checked:stable': 'true',
    'checked:preview': 'false',
    'open:general': 'false',
    'open:deployments': 'true',
    'open:danger': 'false',
  });
  values['split'] = '35';
  if (component === 'quantity-field') {
    values['input'] = '12.5';
    values['unit-select'] = 'km';
  }
  if (component === 'spin-button') values['input'] = '3';
}

export function defaultSelection(component: string): string {
  const defaults: Record<string, string> = {
    'radio-group': 'email',
    listbox: 'alpha',
    select: 'alpha',
    'cascade-select': 'alpha',
    tabs: 'overview',
    stepper: 'account',
    'toggle-group': 'B',
    rating: '4',
    toolbar: 'Bold',
    calendar: '22',
    grid: 'Alpha',
    'tree-grid': 'Projects',
  };
  return defaults[component] ?? '';
}

export function isAnatomyNodeKeyboardInteractive(
  component: string,
  node: AnatomyActivation,
): boolean {
  const part = node.part ?? '';
  if (!activationParts.has(part)) return false;
  if (part === 'root') return ['checkbox', 'switch', 'toggle-button'].includes(component);
  if (part === 'handle') return component === 'window-splitter';
  if (part === 'row') return ['grid', 'tree-grid'].includes(component);
  if (part === 'slide') return component === 'carousel';
  if (part === 'indicator' && node.value === undefined
    && !['checkbox', 'checkbox-group', 'carousel'].includes(component)) return false;
  return true;
}

export function activateAnatomyInteraction(
  component: string,
  node: AnatomyActivation,
  values: AnatomyPreviewValues,
  state: AnatomyPreviewState,
): void {
  const part = node.part ?? '';
  const nodeIdentity = identity(node);

  if (component === 'checkbox-group' && (part === 'item' || part === 'indicator')) {
    toggle(state, `checked:${nodeIdentity}`);
    return;
  }
  if (['checkbox', 'switch', 'toggle-button'].includes(component)
    && (part === 'root' || part === 'thumb' || part === 'indicator')) {
    toggle(state, 'checked');
    return;
  }

  if (popupComponents.has(component)) {
    if (part === 'trigger') toggle(state, 'open');
    if (part === 'close' || part === 'item') state['open'] = 'false';
  }

  if (['menu', 'menu-button', 'menubar', 'navigation-menu'].includes(component) && part === 'item') {
    if (nodeIdentity === 'export' || (component === 'navigation-menu' && nodeIdentity === 'products')) toggle(state, 'subOpen');
    else state['selected'] = nodeIdentity;
  }

  if (component === 'accordion' && part === 'trigger') {
    toggle(state, `open:${nodeIdentity}`);
    return;
  }
  if (component === 'disclosure' && part === 'trigger') toggle(state, 'open');

  const selectionParts = component === 'tabs'
    ? ['trigger', 'indicator']
    : component === 'stepper'
      ? ['step', 'indicator']
      : ['item', 'item-indicator', 'indicator'];
  if (selectionComponents.has(component)
    && selectionParts.includes(part)
    && (node.text !== undefined || node.value !== undefined)) {
    state['selected'] = nodeIdentity;
  }
  if (component === 'rating' && part === 'clear') state['selected'] = '0';

  if (component === 'calendar' && part === 'cell' && node.text !== undefined) state['selected'] = node.text;
  if (['grid', 'tree-grid'].includes(component)
    && ['row', 'cell'].includes(part) && node.text !== undefined) state['selected'] = nodeIdentity;
  if (['tree-view', 'tree-grid'].includes(component) && part === 'disclosure') toggle(state, 'expanded');

  if (component === 'feed' && (part === 'load-earlier' || part === 'load-newer')) {
    const offset = Number(state['feedOffset'] ?? '0');
    state['feedOffset'] = String(offset + (part === 'load-newer' ? 1 : -1));
  }

  if (component === 'tags-input') {
    if (part === 'item-delete' && node.value !== undefined) state[`tag:${node.value}`] = 'hidden';
    if (part === 'clear') {
      state['tag:TypeScript'] = 'hidden';
      state['tag:Accessibility'] = 'hidden';
    }
  }

  if (component === 'spin-button' && (part === 'increment' || part === 'decrement')) {
    const current = Number(values['input'] ?? '3');
    values['input'] = String(current + (part === 'increment' ? 1 : -1));
  }

  if (component === 'pagination') {
    const page = Number(state['page'] ?? '2');
    if (part === 'first') state['page'] = '1';
    else if (part === 'last') state['page'] = '12';
    else if (part === 'previous') state['page'] = String(Math.max(1, page - 1));
    else if (part === 'next') state['page'] = String(Math.min(12, page + 1));
    else if (part === 'item' && /^\d+$/.test(nodeIdentity)) state['page'] = nodeIdentity;
  }

  if (component === 'carousel') {
    const slide = Number(state['slide'] ?? '0');
    if (part === 'previous') state['slide'] = String((slide + 2) % 3);
    if (part === 'next') state['slide'] = String((slide + 1) % 3);
    if (part === 'pause') toggle(state, 'paused');
    if (part === 'indicator') state['slide'] = nodeIdentity;
    if (part === 'slide') state['slide'] = nodeIdentity;
  }

  if (component === 'timer' && part === 'action-trigger') {
    if (nodeIdentity === 'pause') toggle(state, 'paused');
    if (nodeIdentity === 'reset') state['timerReset'] = String(Number(state['timerReset'] ?? '0') + 1);
  }

  if (component === 'toast' && part === 'close') state['toastVisible'] = 'false';
  if (component === 'editable') {
    if (part === 'edit-trigger') state['editing'] = 'true';
    if (part === 'submit-trigger' || part === 'cancel-trigger') state['editing'] = 'false';
  }
}

export function isAnatomyNodeActive(
  component: string,
  node: AnatomyPreviewNode,
  state: Readonly<AnatomyPreviewState>,
): boolean {
  const part = node.part ?? '';
  const nodeIdentity = identity(node);
  if (component === 'checkbox-group' && (part === 'item' || part === 'indicator')) return state[`checked:${nodeIdentity}`] === 'true';
  if (['checkbox', 'switch', 'toggle-button'].includes(component)
    && ['root', 'thumb', 'indicator'].includes(part)) return state['checked'] === 'true';
  if (component === 'accordion' && part === 'trigger') return state[`open:${nodeIdentity}`] === 'true';
  if (component === 'disclosure' && part === 'trigger') return state['open'] === 'true';
  if (component === 'pagination' && part === 'item') return nodeIdentity === state['page'];
  if (component === 'carousel' && part === 'indicator') return nodeIdentity === state['slide'];
  if (component === 'rating' && part === 'item') return Number(nodeIdentity) <= Number(state['selected']);
  if (['calendar', 'grid', 'tree-grid'].includes(component) && ['cell', 'row'].includes(part)) return nodeIdentity === state['selected'];
  if (selectionComponents.has(component)) return ['item', 'item-indicator', 'indicator', 'trigger', 'step'].includes(part)
    && nodeIdentity === state['selected'];
  return false;
}

export function isAnatomyNodeHidden(
  component: string,
  node: AnatomyPreviewNode,
  state: Readonly<AnatomyPreviewState>,
): boolean {
  const part = node.part ?? '';
  if (component === 'accordion' && part === 'content') return state[`open:${identity(node)}`] !== 'true';
  if (component === 'disclosure' && part === 'content') return state['open'] === 'false';
  if (popupComponents.has(component) && ['content', 'overlay'].includes(part)) return state['open'] === 'false';
  if (part === 'sub-content') return state['subOpen'] !== 'true';
  if (['tree-view', 'tree-grid'].includes(component) && node.className?.includes('tree-child') === true) return state['expanded'] === 'false';
  if (component === 'tags-input' && node.value !== undefined) return state[`tag:${node.value}`] === 'hidden';
  if (component === 'toast' && part === 'root') return state['toastVisible'] === 'false';
  if (component === 'carousel' && part === 'slide') return node.value !== state['slide'];
  if (component === 'editable' && part === 'preview') return state['editing'] === 'true';
  if (component === 'editable' && ['input', 'submit-trigger', 'cancel-trigger'].includes(part)) return state['editing'] !== 'true';
  return false;
}

export function anatomyDisplayIcon(
  component: string,
  node: AnatomyPreviewNode,
  state: Readonly<AnatomyPreviewState>,
): AnatomyIconName | undefined {
  if (component === 'checkbox' && node.part === 'indicator') return state['checked'] === 'true' ? 'check' : undefined;
  if (component === 'checkbox-group' && node.part === 'indicator') return state[`checked:${identity(node)}`] === 'true' ? 'check' : undefined;
  if (component === 'switch' && node.part === 'thumb') return undefined;
  if (component === 'accordion' && node.part === 'trigger') return state[`open:${identity(node)}`] === 'true' ? 'chevron-down' : 'chevron-right';
  if (component === 'disclosure' && node.part === 'trigger') return state['open'] === 'true' ? 'chevron-down' : 'chevron-right';
  if (['tree-view', 'tree-grid'].includes(component) && node.part === 'disclosure') return state['expanded'] === 'true' ? 'chevron-down' : 'chevron-right';
  if (['carousel', 'timer'].includes(component) && node.part === 'pause') return state['paused'] === 'true' ? 'play' : 'pause';
  if (component === 'timer' && node.part === 'action-trigger' && node.value === 'pause') return state['paused'] === 'true' ? 'play' : 'pause';
  return node.icon;
}
