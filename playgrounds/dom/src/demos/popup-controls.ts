import { createAlertDialog, type AlertDialogConnection } from '@sectile/dom/alert-dialog';
import { createDialog, type DialogConnection } from '@sectile/dom/dialog';
import { createTooltip, type TooltipConnection } from '@sectile/dom/tooltip';
import { unwrap } from '@sectile/primitives/result';
import { createElement, HelpCircle, Trash2, X } from 'lucide';
import type { DemoContext, DemoDefinition, DemoSession } from '../playground.js';

export const dialogDemo: DemoDefinition = {
  id: 'dialog', label: 'Dialog', title: 'Dialog',
  description: 'Modal, non-modal, and controlled dialogs with automatic focus entry, trapping, and restoration.',
  shortcuts: [{ keys: ['Tab'], label: 'cycle focus' }, { keys: ['Esc'], label: 'close' }],
  cases: [
    { id: 'modal', title: 'Modal settings', mount: (context) => mountDialog(context, { title: 'Workspace settings', modal: true, controlled: false }) },
    { id: 'non-modal', title: 'Non-modal inspector', mount: (context) => mountDialog(context, { title: 'Keyboard inspector', modal: false, controlled: false }) },
    { id: 'controlled', title: 'Controlled dialog', mount: (context) => mountDialog(context, { title: 'Controlled preview', modal: true, controlled: true }) },
  ],
};

export const alertDialogDemo: DemoDefinition = {
  id: 'alert-dialog', label: 'Alert dialog', title: 'Alert dialog',
  description: 'Interruptive confirmation with announcement, safe initial focus, and controlled ownership.',
  shortcuts: [{ keys: ['Tab'], label: 'cycle actions' }, { keys: ['Esc'], label: 'cancel' }],
  cases: [
    { id: 'destructive', title: 'Delete project', mount: (context) => mountAlertDialog(context, 'Delete project?', false) },
    { id: 'unsaved', title: 'Discard changes', mount: (context) => mountAlertDialog(context, 'Discard unsaved changes?', false) },
    { id: 'controlled', title: 'Controlled confirmation', mount: (context) => mountAlertDialog(context, 'Revoke production key?', true) },
  ],
};

export const tooltipDemo: DemoDefinition = {
  id: 'tooltip', label: 'Tooltip', title: 'Tooltip',
  description: 'Focus and hover disclosure with description linkage, Escape dismissal, and controlled ownership.',
  shortcuts: [{ keys: ['Focus', 'Hover'], label: 'show' }, { keys: ['Esc'], label: 'hide' }],
  cases: [
    { id: 'focus-hover', title: 'Help tooltip', mount: (context) => mountTooltip(context, 'Explains the current setting.', false, false) },
    { id: 'initially-open', title: 'Initially visible', mount: (context) => mountTooltip(context, 'Visible until focus and pointer leave.', true, false) },
    { id: 'controlled', title: 'Controlled tooltip', mount: (context) => mountTooltip(context, 'The application owns visibility.', false, true) },
  ],
};

function mountDialog(context: DemoContext, options: { readonly title: string; readonly modal: boolean; readonly controlled: boolean }): DemoSession {
  const surface = popupSurface(options.title, 'Edit the name and move focus between actions.');
  const input = document.createElement('input'); input.value = 'Sectile workspace';
  const save = document.createElement('button'); save.type = 'button'; save.textContent = 'Save';
  surface.body.append(input); surface.actions.append(surface.close, save);
  context.surface.append(surface.root);
  let external = false; let connection!: DialogConnection;
  connection = unwrap(createDialog({
    root: surface.popup, trigger: surface.trigger, modal: options.modal,
    labelledBy: surface.title.id, describedBy: surface.description.id, initialFocus: input,
    ...(options.controlled ? { open: external, onOpenChange: (open) => { external = open; queueMicrotask(() => connection.syncControlledValue(external)); } } : {}),
    onUpdate: render,
  }));
  surface.close.addEventListener('click', () => connection.handleEvent('close'));
  surface.iconClose.addEventListener('click', () => connection.handleEvent('close'));
  save.addEventListener('click', () => connection.handleEvent('close'));
  function render(): void { const { revision, state } = connection.getSnapshot(); context.showState(revision, { open: state.open, modal: options.modal, ownership: options.controlled ? 'controlled' : 'uncontrolled' }); }
  render();
  return { focus: () => surface.trigger.focus(), disconnect: () => connection.disconnect() };
}

function mountAlertDialog(context: DemoContext, title: string, controlled: boolean): DemoSession {
  const surface = popupSurface(title, 'This action cannot be undone. The safe action receives initial focus.');
  surface.trigger.replaceChildren(createElement(Trash2, { 'aria-hidden': 'true', height: 17, width: 17 }), 'Open confirmation');
  const confirm = document.createElement('button'); confirm.type = 'button'; confirm.textContent = 'Delete';
  surface.actions.append(surface.close, confirm);
  context.surface.append(surface.root);
  let external = false; let announcements = 0; let connection!: AlertDialogConnection;
  connection = unwrap(createAlertDialog({
    root: surface.popup, trigger: surface.trigger, labelledBy: surface.title.id,
    describedBy: surface.description.id, initialFocus: surface.close,
    ...(controlled ? { open: external, onOpenChange: (open) => { external = open; queueMicrotask(() => connection.syncControlledValue(external)); } } : {}),
    onAnnounce: () => { announcements += 1; }, onUpdate: render,
  }));
  surface.close.addEventListener('click', () => connection.handleEvent('close'));
  surface.iconClose.addEventListener('click', () => connection.handleEvent('close'));
  confirm.addEventListener('click', () => connection.handleEvent('close'));
  function render(): void { const { revision, state } = connection.getSnapshot(); context.showState(revision, { open: state.open, announcements, ownership: controlled ? 'controlled' : 'uncontrolled' }); }
  render();
  return { focus: () => surface.trigger.focus(), disconnect: () => connection.disconnect() };
}

function mountTooltip(context: DemoContext, copy: string, initial: boolean, controlled: boolean): DemoSession {
  const root = document.createElement('div'); root.className = 'tooltip-demo';
  const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'icon-control secondary'; trigger.setAttribute('aria-label', 'Help'); trigger.append(createElement(HelpCircle, { 'aria-hidden': 'true', height: 18, width: 18 }));
  const tooltip = document.createElement('span'); tooltip.className = 'tooltip-popup'; tooltip.textContent = copy;
  root.append(trigger, tooltip); context.surface.append(root);
  let external = initial; let connection!: TooltipConnection;
  connection = unwrap(createTooltip({
    root: tooltip, trigger, id: `tooltip-${controlled ? 'controlled' : initial ? 'open' : 'help'}`,
    ...(controlled ? { open: external, onOpenChange: (open) => { external = open; queueMicrotask(() => connection.syncControlledValue(external)); } } : { defaultOpen: initial }),
    onUpdate: render,
  }));
  function render(): void { const { revision, state } = connection.getSnapshot(); context.showState(revision, { open: state.open, describedBy: trigger.getAttribute('aria-describedby'), ownership: controlled ? 'controlled' : 'uncontrolled' }); }
  render();
  return { focus: () => trigger.focus(), disconnect: () => connection.disconnect() };
}

function popupSurface(titleText: string, descriptionText: string) {
  const root = document.createElement('div'); root.className = 'popup-demo';
  const trigger = document.createElement('button'); trigger.type = 'button'; trigger.textContent = 'Open dialog';
  const popup = document.createElement('div'); popup.className = 'dialog-popup'; popup.tabIndex = -1;
  const header = document.createElement('header');
  const title = document.createElement('h3'); title.id = `popup-title-${slug(titleText)}`; title.textContent = titleText;
  const iconClose = document.createElement('button'); iconClose.type = 'button'; iconClose.className = 'icon-control secondary'; iconClose.setAttribute('aria-label', 'Close'); iconClose.append(createElement(X, { 'aria-hidden': 'true', height: 17, width: 17 }));
  const description = document.createElement('p'); description.id = `popup-description-${slug(titleText)}`; description.className = 'demo-copy'; description.textContent = descriptionText;
  const body = document.createElement('div'); body.className = 'dialog-body';
  const actions = document.createElement('footer'); actions.className = 'dialog-actions';
  const close = document.createElement('button'); close.type = 'button'; close.className = 'secondary'; close.textContent = 'Cancel';
  header.append(title, iconClose); popup.append(header, description, body, actions); root.append(trigger, popup);
  return { root, trigger, popup, title, description, body, actions, close, iconClose };
}

function slug(value: string): string { return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-'); }
