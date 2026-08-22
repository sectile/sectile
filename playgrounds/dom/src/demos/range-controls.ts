import { createSpinButton, type SpinButtonConnection } from '@sectile/dom/spin-button';
import { createWindowSplitter, type WindowSplitterConnection } from '@sectile/dom/window-splitter';
import { unwrap } from '@sectile/core/result';
import { createElement, Minus, Plus } from 'lucide';
import type { DemoContext, DemoDefinition, DemoSession } from '../playground.js';

export const windowSplitterDemo: DemoDefinition = {
  id: 'window-splitter', label: 'Window splitter', title: 'Window splitter',
  description: 'A focusable separator resizes adjacent panes on either axis.',
  shortcuts: [
    { keys: ['←', '→', '↑', '↓'], label: 'resize' },
    { keys: ['Home', 'End'], label: 'minimum / maximum' },
  ],
  cases: [
    { id: 'horizontal', title: 'Editor split', mount: (context) => mountSplitter(context, 'horizontal', 55, false) },
    { id: 'vertical', title: 'Console split', mount: (context) => mountSplitter(context, 'vertical', 62, false) },
    { id: 'controlled', title: 'Controlled sidebar', mount: (context) => mountSplitter(context, 'horizontal', 32, true) },
  ],
};

export const spinButtonDemo: DemoDefinition = {
  id: 'spin-button', label: 'Spin Button', title: 'Spin Button',
  description: 'Quantized numeric input with editable draft, commit, cancel, and controlled ownership.',
  shortcuts: [
    { keys: ['↑', '↓'], label: 'step' },
    { keys: ['PageUp', 'PageDown'], label: 'large step' },
    { keys: ['Enter', 'Esc'], label: 'commit / cancel draft' },
  ],
  cases: [
    { id: 'integer', title: 'Guest count', mount: (context) => mountSpinButton(context, { min: '1', max: '12', step: '1', initial: '1', suffix: ' guests' }) },
    { id: 'invalid-draft', title: 'Draft validation', mount: (context) => mountSpinButton(context, { min: '0', max: '10', step: '1', initial: '4', draft: '4.5', suffix: '' }) },
    { id: 'controlled', title: 'Controlled quantity', mount: (context) => mountSpinButton(context, { min: '0', max: '20', step: '0.25', initial: '6.5', suffix: ' units', controlled: true }) },
  ],
};

function mountSplitter(
  context: DemoContext,
  orientation: 'horizontal' | 'vertical',
  initial: number,
  controlled: boolean,
): DemoSession {
  const frame = document.createElement('div');
  frame.className = `splitter-demo ${orientation}`;
  const first = document.createElement('section');
  const second = document.createElement('section');
  const separator = document.createElement('div');
  separator.className = 'splitter-separator';
  separator.tabIndex = 0;
  first.textContent = orientation === 'horizontal' ? 'Navigator' : 'Editor';
  second.textContent = orientation === 'horizontal' ? 'Editor' : 'Console';
  frame.append(first, separator, second);
  context.surface.append(frame);

  let externalValue = initial;
  let connection!: WindowSplitterConnection;
  connection = unwrap(createWindowSplitter({
    root: separator,
    track: frame,
    ...context.interaction,
    min: '0', max: '100', step: '1',
    orientation,
    label: `${first.textContent} size`,
    ...(controlled ? {
      value: externalValue,
      onValueChange: ({ value }) => {
        externalValue = value;
        queueMicrotask(() => connection.syncControlledValues({ value: externalValue }));
      },
    } : { defaultValue: initial }),
    onUpdate: render,
  }));

  function render(): void {
    const { revision, state } = connection.getSnapshot();
    frame.style.setProperty('--first-pane', `${state.tick}fr`);
    frame.style.setProperty('--second-pane', `${connection.range.count - state.tick}fr`);
    setCollapsed(first, state.tick === 0);
    setCollapsed(second, state.tick === connection.range.count);
    context.showState(revision, { value: connection.getValue(), orientation, ownership: controlled ? 'controlled' : 'uncontrolled' });
  }

  render();
  return { focus: () => separator.focus(), disconnect: () => connection.disconnect() };
}

function setCollapsed(element: HTMLElement, collapsed: boolean): void {
  if (collapsed) element.setAttribute('aria-hidden', 'true');
  else element.removeAttribute('aria-hidden');
}

function mountSpinButton(context: DemoContext, options: {
  readonly min: string;
  readonly max: string;
  readonly step: string;
  readonly initial: string;
  readonly draft?: string;
  readonly suffix: string;
  readonly controlled?: boolean;
}): DemoSession {
  const root = document.createElement('div');
  root.className = 'spin-button-demo';
  const label = document.createElement('label');
  label.textContent = 'Quantity';
  const control = document.createElement('div');
  control.className = 'spin-button-control';
  const decrement = iconButton(Minus, 'Decrease');
  const input = document.createElement('input');
  input.inputMode = 'decimal';
  const increment = iconButton(Plus, 'Increase');
  const mutationLocked = context.interaction.disabled === true || context.interaction.readOnly === true;
  decrement.disabled = mutationLocked;
  increment.disabled = mutationLocked;
  const hint = document.createElement('p');
  hint.className = 'demo-copy';
  hint.textContent = options.draft === undefined
    ? 'Type a lattice value or use the step controls.'
    : 'This draft is off the allowed step. Enter rejects it; Escape restores the committed value.';
  control.append(decrement, input, increment);
  root.append(label, control, hint);
  context.surface.append(root);

  let externalValue = options.initial;
  let externalDraft: string | null = options.draft ?? null;
  let connection!: SpinButtonConnection;
  connection = unwrap(createSpinButton({
    input, min: options.min, max: options.max, step: options.step,
    ...context.interaction,
    label: 'Quantity', policies: { page: 3 },
    ...(options.controlled ? {
      value: externalValue,
      draft: externalDraft,
      onValueChange: (value) => {
        externalValue = value;
        queueMicrotask(sync);
      },
      onDraftChange: (draft) => {
        externalDraft = draft;
        queueMicrotask(sync);
      },
    } : {
      defaultValue: options.initial,
      ...(options.draft === undefined ? {} : { defaultDraft: options.draft }),
    }),
    onUpdate: render,
  }));
  decrement.addEventListener('click', () => connection.handleEvent('decrement'));
  increment.addEventListener('click', () => connection.handleEvent('increment'));

  function sync(): void {
    connection.syncControlledValues({ value: externalValue, draft: externalDraft });
  }

  function render(): void {
    const { revision, state } = connection.getSnapshot();
    label.textContent = `${state.value}${options.suffix}`;
    context.showState(revision, { value: state.value, draft: state.draft, ownership: options.controlled ? 'controlled' : 'uncontrolled' });
  }

  render();
  return { focus: () => input.focus(), disconnect: () => connection.disconnect() };
}

function iconButton(icon: Parameters<typeof createElement>[0], label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-control secondary';
  button.setAttribute('aria-label', label);
  button.append(createElement(icon, { 'aria-hidden': 'true', height: 17, width: 17 }));
  return button;
}
