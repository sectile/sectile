import { createCheckbox, type CheckboxConnection } from '@sectile/dom/checkbox';
import { createSwitch, type SwitchConnection } from '@sectile/dom/switch';
import { createToggleButton, type ToggleButtonConnection } from '@sectile/dom/toggle-button';
import { unwrap } from '@sectile/primitives/result';
import { Bell, Bold, Check, createElement, Minus } from 'lucide';
import type { DemoContext, DemoDefinition, DemoSession } from '../playground.js';

export const checkboxDemo: DemoDefinition = {
  id: 'checkbox', label: 'Checkbox', title: 'Checkbox',
  description: 'Set membership with unchecked, checked, and indeterminate group state.',
  shortcuts: [{ keys: ['Click'], label: 'toggle' }],
  cases: [
    { id: 'mixed', title: 'Partial group selection', mount: (context) => mountCheckbox(context, 'mixed', false) },
    { id: 'binary', title: 'Optional feature', mount: (context) => mountCheckbox(context, false, false) },
    { id: 'controlled', title: 'Controlled agreement', mount: (context) => mountCheckbox(context, true, true) },
  ],
};

export const switchDemo: DemoDefinition = {
  id: 'switch', label: 'Switch', title: 'Switch',
  description: 'Immediate binary settings with a stable label and explicit off/on state.',
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

type CheckedControlKind = 'checkbox' | 'switch' | 'toggle';

function surface(context: DemoContext, copy: string, kind: CheckedControlKind): {
  readonly root: HTMLElement;
  readonly control: HTMLButtonElement;
  readonly status: HTMLParagraphElement;
  readonly preview: HTMLParagraphElement;
} {
  const root = document.createElement('div');
  root.className = `toggle-button-demo ${kind}-demo`;
  const copyElement = document.createElement('p');
  copyElement.className = 'demo-copy';
  copyElement.textContent = copy;
  const toolbar = document.createElement('div');
  toolbar.className = 'toggle-button-toolbar';
  const control = document.createElement('button');
  control.type = 'button';
  control.className = `toggle-button-control secondary ${kind}-control`;
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
  const elements = surface(
    context,
    'Checkboxes include items in a set. Indeterminate means only part of a child group is selected.',
    'checkbox',
  );
  const marker = document.createElement('span');
  marker.className = 'checkbox-marker';
  marker.setAttribute('aria-hidden', 'true');
  const checkIcon = createElement(Check, { height: 15, width: 15 });
  checkIcon.classList.add('checkbox-check');
  const mixedIcon = createElement(Minus, { height: 15, width: 15 });
  mixedIcon.classList.add('checkbox-mixed');
  marker.append(checkIcon, mixedIcon);
  const label = document.createElement('span');
  label.className = 'checked-control-label';
  const labelTitle = document.createElement('strong');
  const labelDescription = document.createElement('small');
  if (initial === 'mixed') {
    labelTitle.textContent = 'Select deployment channels';
    labelDescription.textContent = '2 of 3 channels selected';
    elements.preview.textContent = 'Stable and preview channels are included; nightly is excluded.';
  } else if (controlled) {
    labelTitle.textContent = 'Accept analytics terms';
    labelDescription.textContent = 'State is owned by the host application';
    elements.preview.textContent = 'Analytics processing terms have been accepted.';
  } else {
    labelTitle.textContent = 'Include analytics';
    labelDescription.textContent = 'Add workspace usage reports';
    elements.preview.textContent = 'Analytics reports are optional for this workspace.';
  }
  label.append(labelTitle, labelDescription);
  elements.control.append(marker, label);
  let external = initial;
  let connection!: CheckboxConnection;
  connection = unwrap(createCheckbox({
    element: elements.control,
    ...context.interaction,
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
    const visualState = state.checked === 'mixed' ? 'mixed' : state.checked ? 'checked' : 'unchecked';
    elements.root.dataset['state'] = visualState;
    elements.status.textContent = state.checked === 'mixed'
      ? 'Partially selected'
      : state.checked ? 'Checked' : 'Unchecked';
    if (initial === 'mixed') {
      labelDescription.textContent = state.checked === 'mixed'
        ? '2 of 3 channels selected'
        : state.checked ? '3 of 3 channels selected' : 'No channels selected';
      elements.preview.textContent = state.checked === 'mixed'
        ? 'Stable and preview channels are included; nightly is excluded.'
        : state.checked ? 'All deployment channels are included.' : 'No deployment channels are included.';
    } else if (controlled) {
      elements.preview.textContent = state.checked
        ? 'Analytics processing terms have been accepted.'
        : 'Analytics processing terms have not been accepted.';
    } else {
      elements.preview.textContent = state.checked
        ? 'Analytics reports are included for this workspace.'
        : 'Analytics reports are optional for this workspace.';
    }
    context.showState(revision, { checked: state.checked, ownership: controlled ? 'controlled' : 'uncontrolled' });
  }
  render();
  return { focus: () => elements.control.focus(), disconnect: () => connection.disconnect() };
}

function mountSwitch(context: DemoContext, initial: boolean, controlled: boolean): DemoSession {
  const elements = surface(
    context,
    'Switches apply a binary setting immediately. Unlike a checkbox, they never have an indeterminate state.',
    'switch',
  );
  const label = document.createElement('span');
  label.className = 'checked-control-label';
  const labelTitle = document.createElement('strong');
  labelTitle.textContent = 'Deployment notifications';
  const labelDescription = document.createElement('small');
  labelDescription.textContent = controlled ? 'State is owned by the host application' : 'Alert me when a release changes status';
  label.append(labelTitle, labelDescription);
  const switchMeta = document.createElement('span');
  switchMeta.className = 'switch-meta';
  const switchValue = document.createElement('span');
  switchValue.className = 'switch-value';
  const track = document.createElement('span');
  track.className = 'switch-track';
  track.setAttribute('aria-hidden', 'true');
  const thumb = document.createElement('span');
  thumb.className = 'switch-thumb';
  track.append(thumb);
  switchMeta.append(switchValue, track);
  elements.control.append(label, switchMeta);
  elements.status.classList.add('sr-only');
  elements.preview.textContent = 'Changes take effect as soon as the switch is toggled.';
  let external = initial;
  let connection!: SwitchConnection;
  connection = unwrap(createSwitch({
    element: elements.control,
    ...context.interaction,
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
    elements.root.dataset['state'] = state.checked ? 'on' : 'off';
    switchValue.textContent = state.checked ? 'On' : 'Off';
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
  const elements = surface(
    context,
    'Toggle buttons keep an action active until pressed again. Their label names the action and never changes.',
    'toggle',
  );
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
    ...context.interaction,
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
    elements.status.textContent = state.pressed ? 'Pressed' : 'Not pressed';
    context.showState(revision, { pressed: state.pressed, ownership: controlled ? 'controlled' : 'uncontrolled' });
  }
  render();
  return { focus: () => elements.control.focus(), disconnect: () => connection.disconnect() };
}
