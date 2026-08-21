import { createCheckbox, type CheckboxConnection } from '@sectile/dom/checkbox';
import { createSwitch, type SwitchConnection } from '@sectile/dom/switch';
import { createToggleButton, type ToggleButtonConnection } from '@sectile/dom/toggle-button';
import { unwrap } from '@sectile/primitives/result';
import { Bell, Bold, Check, createElement } from 'lucide';
import type { DemoContext, DemoDefinition, DemoSession } from '../playground.js';

export const checkboxDemo: DemoDefinition = {
  id: 'checkbox', label: 'Checkbox', title: 'Checkbox',
  description: 'Binary, indeterminate, and controlled checked state.',
  shortcuts: [{ keys: ['Click'], label: 'toggle' }],
  cases: [
    { id: 'binary', title: 'Optional feature', mount: (context) => mountCheckbox(context, false, false) },
    { id: 'mixed', title: 'Partial group selection', mount: (context) => mountCheckbox(context, 'mixed', false) },
    { id: 'controlled', title: 'Controlled agreement', mount: (context) => mountCheckbox(context, true, true) },
  ],
};

export const switchDemo: DemoDefinition = {
  id: 'switch', label: 'Switch', title: 'Switch',
  description: 'Persistent on/off settings with uncontrolled and controlled ownership.',
  shortcuts: [{ keys: ['Click'], label: 'toggle' }],
  cases: [
    { id: 'off', title: 'Notifications off', mount: (context) => mountSwitch(context, false, false) },
    { id: 'on', title: 'Notifications on', mount: (context) => mountSwitch(context, true, false) },
    { id: 'controlled', title: 'Controlled notifications', mount: (context) => mountSwitch(context, true, true) },
  ],
};

export const toggleButtonDemo: DemoDefinition = {
  id: 'toggle-button', label: 'Toggle button', title: 'Toggle button',
  description: 'An action that stays pressed until activated again.',
  shortcuts: [{ keys: ['Click'], label: 'toggle pressed state' }],
  cases: [
    { id: 'formatting', title: 'Bold formatting', mount: (context) => mountToggle(context, 'bold', false, false) },
    { id: 'alert', title: 'Alert subscription', mount: (context) => mountToggle(context, 'alert', true, false) },
    { id: 'controlled', title: 'Controlled formatting', mount: (context) => mountToggle(context, 'bold', false, true) },
  ],
};

function surface(context: DemoContext, copy: string): {
  readonly root: HTMLElement;
  readonly control: HTMLButtonElement;
  readonly status: HTMLParagraphElement;
  readonly preview: HTMLParagraphElement;
} {
  const root = document.createElement('div');
  root.className = 'toggle-button-demo';
  const copyElement = document.createElement('p');
  copyElement.className = 'demo-copy';
  copyElement.textContent = copy;
  const toolbar = document.createElement('div');
  toolbar.className = 'toggle-button-toolbar';
  const control = document.createElement('button');
  control.type = 'button';
  control.className = 'toggle-button-control secondary';
  const status = document.createElement('p');
  status.className = 'toggle-button-status';
  status.setAttribute('aria-live', 'polite');
  toolbar.append(control, status);
  const preview = document.createElement('p');
  preview.className = 'toggle-button-preview';
  root.append(copyElement, toolbar, preview);
  context.surface.append(root);
  return { root, control, status, preview };
}

function mountCheckbox(
  context: DemoContext,
  initial: boolean | 'mixed',
  controlled: boolean,
): DemoSession {
  const elements = surface(context, 'Checkboxes represent inclusion in a set. Mixed means a child group is only partly selected.');
  elements.control.append(createElement(Check, { 'aria-hidden': 'true', height: 17, width: 17 }), 'Include analytics');
  elements.preview.textContent = 'Analytics reports are available to this workspace.';
  let external = initial;
  let connection!: CheckboxConnection;
  connection = unwrap(createCheckbox({
    element: elements.control,
    policies: { allowMixed: true },
    ...(controlled ? {
      value: external,
      onValueChange: (value) => {
        external = value;
        queueMicrotask(() => connection.syncControlledValue(external));
      },
    } : { defaultValue: initial }),
    onUpdate: render,
  }));
  function render(): void {
    const { revision, state } = connection.getSnapshot();
    elements.root.dataset['pressed'] = String(state.checked === true);
    elements.status.textContent = `${controlled ? 'Controlled' : 'Uncontrolled'} · ${String(state.checked)}`;
    context.showState(revision, { checked: state.checked, ownership: controlled ? 'controlled' : 'uncontrolled' });
  }
  render();
  return { focus: () => elements.control.focus(), disconnect: () => connection.disconnect() };
}

function mountSwitch(context: DemoContext, initial: boolean, controlled: boolean): DemoSession {
  const elements = surface(context, 'Switches change a setting immediately; their label stays the same in both states.');
  elements.control.append(createElement(Bell, { 'aria-hidden': 'true', height: 17, width: 17 }), 'Notifications');
  elements.preview.textContent = 'Deployment notifications';
  let external = initial;
  let connection!: SwitchConnection;
  connection = unwrap(createSwitch({
    element: elements.control,
    ...(controlled ? {
      checked: external,
      onCheckedChange: (value) => {
        external = value;
        queueMicrotask(() => connection.syncControlledValue(external));
      },
    } : { defaultChecked: initial }),
    onUpdate: render,
  }));
  function render(): void {
    const { revision, state } = connection.getSnapshot();
    elements.root.dataset['pressed'] = String(state.checked);
    elements.status.textContent = `${controlled ? 'Controlled' : 'Uncontrolled'} · ${state.checked ? 'On' : 'Off'}`;
    context.showState(revision, { checked: state.checked, ownership: controlled ? 'controlled' : 'uncontrolled' });
  }
  render();
  return { focus: () => elements.control.focus(), disconnect: () => connection.disconnect() };
}

function mountToggle(
  context: DemoContext,
  kind: 'bold' | 'alert',
  initial: boolean,
  controlled: boolean,
): DemoSession {
  const elements = surface(context, 'Toggle buttons keep an action active. Pressed is state, not a changing button label.');
  elements.control.append(
    createElement(kind === 'bold' ? Bold : Bell, { 'aria-hidden': 'true', height: 17, width: 17 }),
    kind === 'bold' ? 'Bold' : 'Watch',
  );
  elements.preview.textContent = kind === 'bold'
    ? 'Visible state makes an interface easier to trust.'
    : 'Watch deployment status changes.';
  let external = initial;
  let connection!: ToggleButtonConnection;
  connection = unwrap(createToggleButton({
    element: elements.control,
    ...(controlled ? {
      pressed: external,
      onPressedChange: (value) => {
        external = value;
        queueMicrotask(() => connection.syncControlledValue(external));
      },
    } : { defaultPressed: initial }),
    onUpdate: render,
  }));
  function render(): void {
    const { revision, state } = connection.getSnapshot();
    elements.root.dataset['pressed'] = String(state.pressed);
    elements.status.textContent = `${controlled ? 'Controlled' : 'Uncontrolled'} · ${state.pressed ? 'On' : 'Off'}`;
    context.showState(revision, { pressed: state.pressed, ownership: controlled ? 'controlled' : 'uncontrolled' });
  }
  render();
  return { focus: () => elements.control.focus(), disconnect: () => connection.disconnect() };
}
