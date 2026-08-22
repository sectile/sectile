import { createPinInput, type PinInputConnection } from '@sectile/dom/pin-input';
import { createTagsInput, type TagsInputConnection } from '@sectile/dom/tags-input';
import { unwrap } from '@sectile/primitives/result';
import { createElement, X } from 'lucide';
import type { DemoContext, DemoDefinition, DemoSession } from '../playground.js';

export const pinInputDemo: DemoDefinition = {
  id: 'pin-input', label: 'Pin input', title: 'Pin input',
  description: 'One-time codes split into focus-managed cells with validation and completion.',
  shortcuts: [{ keys: ['←', '→'], label: 'move cell' }, { keys: ['Backspace', 'Delete'], label: 'clear cell' }],
  cases: [
    { id: 'verification-code', title: 'Verification code', mount: (context) => mountPinInput(context, 6, '', false, 'numeric') },
    { id: 'prefilled', title: 'Prefilled access code', mount: (context) => mountPinInput(context, 4, '24', false, 'numeric') },
    { id: 'controlled', title: 'Controlled security key', mount: (context) => mountPinInput(context, 5, 'A7', true, 'alphanumeric') },
  ],
};

export const tagsInputDemo: DemoDefinition = {
  id: 'tags-input', label: 'Tags input', title: 'Tags input',
  description: 'Tokenized text entry with limits, normalization, focus, and removal.',
  shortcuts: [{ keys: ['Enter', ','], label: 'add tag' }, { keys: ['←', '→'], label: 'move' }, { keys: ['Backspace', 'Delete'], label: 'remove focused tag' }],
  cases: [
    { id: 'skills', title: 'Project skills', mount: (context) => mountTagsInput(context, ['TypeScript', 'Accessibility'], 8, false) },
    { id: 'limited', title: 'Limited labels', mount: (context) => mountTagsInput(context, ['Bug', 'Urgent'], 3, false) },
    { id: 'controlled', title: 'Controlled recipients', mount: (context) => mountTagsInput(context, ['Design', 'Platform'], 6, true) },
  ],
};

function mountPinInput(context: DemoContext, length: number, initial: string, controlled: boolean, mode: 'numeric' | 'alphanumeric'): DemoSession {
  const wrapper = document.createElement('div'); wrapper.className = 'pin-input-demo';
  const label = document.createElement('label'); label.textContent = mode === 'numeric' ? 'Enter verification code' : 'Enter security key';
  const root = document.createElement('div'); root.className = 'pin-cells';
  const inputs = Array.from({ length }, (_, index) => { const input = document.createElement('input'); input.className = 'pin-cell'; input.autocomplete = index === 0 ? 'one-time-code' : 'off'; input.inputMode = mode === 'numeric' ? 'numeric' : 'text'; root.append(input); return input; });
  const status = document.createElement('p'); status.className = 'input-status'; status.setAttribute('aria-live', 'polite');
  wrapper.append(label, root, status); context.surface.append(wrapper);
  let value = initial; let completed: string | null = null; let connection!: PinInputConnection;
  connection = unwrap(createPinInput({ root, inputs, ...context.interaction, label: label.textContent, policies: { accept: (part) => mode === 'numeric' ? /^\d$/.test(part) : /^[a-z0-9]$/i.test(part) }, ...(controlled ? { value, onValueChange: (next) => { value = next; queueMicrotask(() => connection.syncControlledValue(value)); } } : { defaultValue: initial }), onComplete: (next) => { completed = next; render(); }, onUpdate: render }));
  function render(): void { const { revision, state } = connection.getSnapshot(); status.textContent = completed === null ? `${state.values.filter(Boolean).length} of ${length} characters entered` : `Code ${completed} is complete`; context.showState(revision, { value: state.values.join(''), cells: state.values, current: state.current, complete: completed !== null, ownership: controlled ? 'controlled' : 'uncontrolled' }); }
  render(); return { focus: () => inputs[connection.getSnapshot().state.current]?.focus(), disconnect: () => connection.disconnect() };
}

function mountTagsInput(context: DemoContext, initial: readonly string[], maxTags: number, controlled: boolean): DemoSession {
  const wrapper = document.createElement('div'); wrapper.className = 'tags-input-demo';
  const label = document.createElement('label'); label.textContent = 'Tags';
  const root = document.createElement('div'); root.className = 'tags-field';
  const input = document.createElement('input'); input.className = 'tags-draft'; input.placeholder = 'Add a tag…';
  const hint = document.createElement('p'); hint.className = 'input-status';
  wrapper.append(label, root, hint); context.surface.append(wrapper);
  let value = [...initial]; let inputValue = ''; let connection!: TagsInputConnection;
  connection = unwrap(createTagsInput({ root, input, ...context.interaction, label: 'Project tags', policies: { maxTags, normalize: (tag) => tag.trim().replace(/\s+/g, ' ') }, ...(controlled ? { value, inputValue, onValueChange: (next) => { value = [...next]; queueMicrotask(sync); }, onInputValueChange: (next) => { inputValue = next; queueMicrotask(sync); } } : { defaultValue: initial }), onUpdate: render }));
  function sync(): void { connection.syncControlledValues({ value, inputValue }); }
  function render(): void { const { revision, state } = connection.getSnapshot(); const tags = state.tags.map((tag, index) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'tag-token'; button.disabled = context.interaction.disabled === true; button.append(document.createTextNode(tag), createElement(X, { 'aria-hidden': 'true', height: 13, width: 13 })); connection.setTagAttributes(button, index); button.classList.toggle('current', state.current === index); return button; }); root.replaceChildren(...tags, input); hint.textContent = `${state.tags.length} of ${maxTags} tags · Enter or comma adds the draft`; context.showState(revision, { tags: state.tags, draft: state.draft, current: state.current, maxTags, ownership: controlled ? 'controlled' : 'uncontrolled' }); }
  render(); return { focus: () => input.focus(), disconnect: () => connection.disconnect() };
}
