import { createMenu, type MenuConnection } from '@sectile/dom/menu';
import { createMenuButton } from '@sectile/dom/menu-button';
import { createMenubar } from '@sectile/dom/menubar';
import type { StableID } from '@sectile/core';
import { ChevronDown, ChevronRight, createElement } from 'lucide';
import type { DemoContext, DemoDefinition, DemoSession } from '../playground.js';

const basicItems = [
  { id: 'new', parentID: null, label: 'New file' },
  { id: 'open', parentID: null, label: 'Open…' },
  { id: 'save', parentID: null, label: 'Save' },
] as const;
const nestedItems = [
  { id: 'file', parentID: null, label: 'File' },
  { id: 'new', parentID: 'file', label: 'New file' },
  { id: 'open', parentID: 'file', label: 'Open…' },
  { id: 'edit', parentID: null, label: 'Edit' },
  { id: 'copy', parentID: 'edit', label: 'Copy' },
  { id: 'paste', parentID: 'edit', label: 'Paste' },
  { id: 'help', parentID: null, label: 'Help' },
] as const;

export const menuDemo: DemoDefinition = definition('menu', 'Menu', [
  { id: 'commands', title: 'Command menu', items: basicItems, disabled: [] },
  { id: 'disabled', title: 'Disabled command', items: basicItems, disabled: ['save'] },
  { id: 'nested', title: 'Nested commands', items: nestedItems, disabled: [] },
]);

export const menubarDemo: DemoDefinition = definition('menubar', 'Menubar', [
  { id: 'application', title: 'Application menu', items: nestedItems, disabled: [] },
  { id: 'disabled-root', title: 'Unavailable menu', items: nestedItems, disabled: ['edit'] },
  { id: 'typeahead', title: 'Typeahead menubar', items: nestedItems, disabled: [] },
]);

export const menuButtonDemo: DemoDefinition = definition('menu-button', 'Menu button', [
  { id: 'actions', title: 'Quick actions', items: basicItems, disabled: [] },
  { id: 'nested', title: 'Nested actions', items: nestedItems, disabled: ['paste'] },
  { id: 'controlled', title: 'Controlled menu', items: basicItems, disabled: [], controlled: true },
]);

function definition(id: 'menu' | 'menubar' | 'menu-button', label: string, cases: readonly MenuCase[]): DemoDefinition {
  return {
    id, label, title: label,
    description: 'Edge movement, disabled commands, nested paths, typeahead, invocation, and controlled open state.',
    shortcuts: [
      { keys: ['Arrows'], label: 'navigate / open submenu' },
      { keys: ['Home', 'End'], label: 'first / last' },
      { keys: ['Type'], label: 'typeahead' },
      { keys: ['Enter', 'Esc'], label: 'invoke / close' },
    ],
    cases: cases.map((scenario) => ({ id: scenario.id, title: scenario.title, mount: (context) => mountMenu(context, id, scenario) })),
  };
}

interface MenuItem<ID extends StableID = string> { readonly id: ID; readonly parentID: ID | null; readonly label: string }
interface MenuCase { readonly id: string; readonly title: string; readonly items: readonly MenuItem[]; readonly disabled: readonly string[]; readonly controlled?: boolean }

function mountMenu(context: DemoContext, kind: 'menu' | 'menubar' | 'menu-button', scenario: MenuCase): DemoSession {
  const wrapper = document.createElement('div'); wrapper.className = `menu-demo ${kind}`;
  const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'secondary menu-trigger';
  trigger.append('Actions', createElement(ChevronDown, { 'aria-hidden': 'true', height: 15, width: 15 }));
  const root = document.createElement('div'); root.className = 'menu-surface';
  if (kind === 'menu-button') wrapper.append(trigger);
  wrapper.append(root); context.surface.append(wrapper);
  const elements = new Map<string, HTMLButtonElement>();
  const submenuSurfaces = new Map<string, HTMLDivElement>();
  for (const item of scenario.items) {
    if (!scenario.items.some((candidate) => candidate.parentID === item.id)) continue;
    const submenu = document.createElement('div'); submenu.className = 'menu-surface submenu-surface';
    submenuSurfaces.set(item.id, submenu); root.append(submenu);
  }
  for (const item of scenario.items) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'menu-item';
    button.append(document.createTextNode(item.label));
    if (scenario.items.some((candidate) => candidate.parentID === item.id)) {
      const icon = kind === 'menubar' && item.parentID === null ? ChevronDown : ChevronRight;
      button.append(createElement(icon, { 'aria-hidden': 'true', height: 15, width: 15 }));
    }
    const surface = item.parentID === null ? root : submenuSurfaces.get(item.parentID);
    surface?.append(button); elements.set(item.id, button);
  }
  let invoked: string | null = null; let externalOpen = false; let connection!: MenuConnection<string>;
  const common = {
    root, items: scenario.items.map(({ id, parentID }) => ({ id, parentID })),
    ...context.interaction,
    disabledItems: scenario.disabled, defaultHighlightedValue: scenario.items[0]?.id ?? null,
    typeahead: { textValue: (id: string) => scenario.items.find((item) => item.id === id)?.label ?? id },
    label: scenario.title, onInvoke: (id: string) => { invoked = id; }, onUpdate: render,
  };
  connection = kind === 'menu'
    ? createMenu(common)
    : kind === 'menubar'
      ? createMenubar(common)
      : createMenuButton({
        ...common, trigger,
        ...(scenario.controlled ? { open: externalOpen, onOpenChange: (open) => { externalOpen = open; queueMicrotask(() => connection.syncControlledValue(externalOpen)); } } : {}),
      });
  for (const [id, element] of elements) connection.setItemAttributes(element, id);
  for (const [parentID, submenu] of submenuSurfaces) connection.setSubmenuAttributes(submenu, parentID);

  function render(): void {
    const { revision, state } = connection.getSnapshot();
    for (const item of scenario.items) {
      const element = elements.get(item.id); if (element === undefined) continue;
      element.classList.toggle('current', state.cursor.current === item.id);
    }
    context.showState(revision, { open: state.open, current: state.cursor.current, openPath: state.openPath, invoked, disabled: scenario.disabled, ownership: scenario.controlled ? 'controlled' : 'uncontrolled' });
  }
  render();
  return { focus: () => (kind === 'menu-button' ? trigger : root).focus(), disconnect: () => connection.disconnect() };
}
