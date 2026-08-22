import { createRadioGroup, type RadioGroupConnection } from '@sectile/dom/radio-group';
import { createTabs } from '@sectile/dom/tabs';
import { createToolbar, type ToolbarConnection } from '@sectile/dom/toolbar';
import { unwrap } from '@sectile/primitives/result';
import { Bold, Code2, Italic, List, createElement } from 'lucide';
import type { DemoContext, DemoDefinition, DemoSession } from '../playground.js';

const tabItems = [
  { id: 'overview', label: 'Overview', heading: 'Release health', status: 'Ready to ship', panel: 'The current rollout is healthy across primitives, DOM, and terminal packages.' },
  { id: 'changes', label: 'Changes', heading: 'Migration summary', status: '3 packages updated', panel: 'Review public entry-point changes and the migration notes for this release.' },
  { id: 'checks', label: 'Checks', heading: 'Verification status', status: '18 checks passed', panel: 'Automated package, cross-host, and public-signature checks completed successfully.' },
] as const;
type TabID = typeof tabItems[number]['id'];

export const tabsDemo: DemoDefinition = {
  id: 'tabs', label: 'Tabs', title: 'Tabs',
  description: 'Manual or automatic activation, orientation, disabled tabs, and focus/selection separation.',
  shortcuts: [{ keys: ['Arrows'], label: 'move' }, { keys: ['Home', 'End'], label: 'edges' }, { keys: ['Enter'], label: 'activate' }],
  cases: [
    { id: 'manual', title: 'Manual activation', mount: (context) => mountTabs(context, 'manual', 'horizontal', []) },
    { id: 'automatic', title: 'Automatic activation', mount: (context) => mountTabs(context, 'automatic', 'horizontal', []) },
    { id: 'vertical-disabled', title: 'Vertical with unavailable tab', mount: (context) => mountTabs(context, 'manual', 'vertical', ['changes']) },
  ],
};

const radioItems = [
  { id: 'compact', label: 'Compact', detail: 'Dense rows and controls' },
  { id: 'comfortable', label: 'Comfortable', detail: 'Balanced spacing' },
  { id: 'spacious', label: 'Spacious', detail: 'More breathing room' },
] as const;
type RadioID = typeof radioItems[number]['id'];

export const radioGroupDemo: DemoDefinition = {
  id: 'radio-group', label: 'Radio group', title: 'Radio group',
  description: 'A single checked value with orientation, disabled choices, and controlled ownership.',
  shortcuts: [{ keys: ['Arrows'], label: 'move and check' }, { keys: ['Home', 'End'], label: 'edges' }],
  cases: [
    { id: 'vertical', title: 'Vertical density', mount: (context) => mountRadio(context, 'vertical', [], false) },
    { id: 'horizontal-disabled', title: 'Horizontal with unavailable choice', mount: (context) => mountRadio(context, 'horizontal', ['spacious'], false) },
    { id: 'controlled', title: 'Controlled density', mount: (context) => mountRadio(context, 'vertical', [], true) },
  ],
};

const toolbarItems = ['bold', 'italic', 'code', 'list'] as const;
type ToolbarID = typeof toolbarItems[number];

export const toolbarDemo: DemoDefinition = {
  id: 'toolbar', label: 'Toolbar', title: 'Toolbar',
  description: 'Roving focus and invocation without introducing selection state.',
  shortcuts: [{ keys: ['Arrows'], label: 'move' }, { keys: ['Enter', 'Space'], label: 'invoke' }],
  cases: [
    { id: 'horizontal', title: 'Formatting toolbar', mount: (context) => mountToolbar(context, 'horizontal', [], false) },
    { id: 'vertical-disabled', title: 'Vertical tools', mount: (context) => mountToolbar(context, 'vertical', ['code'], false) },
    { id: 'controlled-focus', title: 'Controlled focus', mount: (context) => mountToolbar(context, 'horizontal', [], true) },
  ],
};

function mountTabs(
  context: DemoContext,
  activation: 'manual' | 'automatic',
  orientation: 'horizontal' | 'vertical',
  disabledItems: readonly TabID[],
): DemoSession {
  const frame = document.createElement('div');
  frame.className = `linear-demo tabs-demo ${orientation}`;
  const root = document.createElement('div');
  root.className = 'tab-list';
  const panel = document.createElement('div');
  panel.className = 'tab-panel';
  frame.append(root, panel);
  context.surface.append(frame);
  const connection = unwrap(createTabs({
    root,
    ...context.interaction,
    items: tabItems.map((item) => item.id),
    defaultValue: 'overview',
    defaultHighlightedValue: 'overview',
    orientation,
    disabledItems,
    policies: { activation },
    label: `${activation} release tabs`,
    onUpdate: render,
  }));
  function render(): void {
    const { revision, state } = connection.getSnapshot();
    root.replaceChildren();
    panel.replaceChildren();
    for (const item of tabItems) {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.textContent = item.label;
      tab.id = `tab-${context.instanceID}-${activation}-${orientation}-${item.id}`;
      connection.setItemAttributes(tab, {
        id: item.id,
        panelID: `panel-${context.instanceID}-${activation}-${orientation}-${item.id}`,
      });
      root.append(tab);
      const content = document.createElement('section');
      content.id = `panel-${context.instanceID}-${activation}-${orientation}-${item.id}`;
      const contentHeader = document.createElement('header');
      contentHeader.className = 'tab-panel-header';
      const heading = document.createElement('h3');
      heading.textContent = item.heading;
      const status = document.createElement('span');
      status.className = 'tab-panel-status';
      status.textContent = item.status;
      const description = document.createElement('p');
      description.textContent = item.panel;
      contentHeader.append(heading, status);
      content.append(contentHeader, description);
      connection.setPanelAttributes(content, item.id, tab.id);
      panel.append(content);
    }
    context.showState(revision, {
      activation,
      orientation,
      current: state.cursor.current,
      selected: state.selection.selected[0] ?? null,
      disabled: disabledItems,
    });
  }
  render();
  return { focus: () => root.querySelector<HTMLElement>('[tabindex="0"]')?.focus(), disconnect: () => connection.disconnect() };
}

function mountRadio(
  context: DemoContext,
  orientation: 'horizontal' | 'vertical',
  disabledItems: readonly RadioID[],
  controlled: boolean,
): DemoSession {
  const root = document.createElement('div');
  root.className = `linear-demo radio-demo ${orientation}`;
  context.surface.append(root);
  let external: RadioID | null = 'comfortable';
  let connection!: RadioGroupConnection<RadioID>;
  connection = unwrap(createRadioGroup({
    root,
    ...context.interaction,
    items: radioItems.map((item) => item.id),
    orientation,
    disabledItems,
    label: 'Interface density',
    ...(controlled ? {
      value: external,
      onValueChange: (value) => {
        external = value;
        queueMicrotask(() => connection.syncControlledValues({ value: external }));
      },
    } : { defaultValue: external }),
    defaultHighlightedValue: external,
    onUpdate: render,
  }));
  function render(): void {
    const { revision, state } = connection.getSnapshot();
    root.replaceChildren();
    for (const item of radioItems) {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'radio-option';
      const label = document.createElement('strong');
      label.textContent = item.label;
      const detail = document.createElement('small');
      detail.textContent = item.detail;
      option.append(label, detail);
      connection.setItemAttributes(option, item.id);
      root.append(option);
    }
    context.showState(revision, {
      orientation,
      ownership: controlled ? 'controlled' : 'uncontrolled',
      current: state.cursor.current,
      value: state.selection.selected[0] ?? null,
      disabled: disabledItems,
    });
  }
  render();
  return { focus: () => root.querySelector<HTMLElement>('[tabindex="0"]')?.focus(), disconnect: () => connection.disconnect() };
}

function mountToolbar(
  context: DemoContext,
  orientation: 'horizontal' | 'vertical',
  disabledItems: readonly ToolbarID[],
  controlled: boolean,
): DemoSession {
  const frame = document.createElement('div');
  frame.className = 'linear-demo toolbar-demo';
  const root = document.createElement('div');
  root.className = `toolbar-controls ${orientation}`;
  const status = document.createElement('p');
  status.className = 'demo-copy';
  frame.append(root, status);
  context.surface.append(frame);
  let invoked: ToolbarID | null = null;
  let external: ToolbarID | null = 'bold';
  let connection!: ToolbarConnection<ToolbarID>;
  connection = unwrap(createToolbar({
    root,
    ...context.interaction,
    items: toolbarItems,
    orientation,
    disabledItems,
    label: 'Text formatting',
    ...(controlled ? {
      highlightedValue: external,
      onHighlightedValueChange: (value) => {
        external = value;
        queueMicrotask(() => connection.syncControlledValue(external));
      },
    } : { defaultHighlightedValue: external }),
    onInvoke: (id) => { invoked = id; status.textContent = `Invoked ${id}`; },
    onUpdate: render,
  }));
  const icons = { bold: Bold, italic: Italic, code: Code2, list: List } as const;
  function render(): void {
    const { revision, state } = connection.getSnapshot();
    root.replaceChildren();
    for (const id of toolbarItems) {
      const control = document.createElement('button');
      control.type = 'button';
      control.className = 'secondary icon-control';
      control.setAttribute('aria-label', id);
      control.append(createElement(icons[id], { 'aria-hidden': 'true', height: 18, width: 18 }));
      connection.setItemAttributes(control, id);
      root.append(control);
    }
    if (invoked === null) status.textContent = 'Invoke a tool; focus remains independent of action state.';
    context.showState(revision, {
      orientation,
      ownership: controlled ? 'controlled' : 'uncontrolled',
      current: state.cursor.current,
      invoked,
      disabled: disabledItems,
    });
  }
  render();
  return { focus: () => root.querySelector<HTMLElement>('[tabindex="0"]')?.focus(), disconnect: () => connection.disconnect() };
}
