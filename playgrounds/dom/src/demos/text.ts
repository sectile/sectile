import { createText, type TextConnection } from '@sectile/dom/text';
import { createTextEditingState, type TextEditingState } from '@sectile/core/text';
import { unwrap } from '@sectile/core/result';
import { effectLabels, type DemoContext, type DemoDefinition, type DemoSession } from '../playground.js';

export const textDemo: DemoDefinition = {
  id: 'text', label: 'Text', title: 'IME-aware text editing',
  description: 'Plain replacement, grapheme-safe Unicode boundaries, IME composition, multiline text, and controlled ownership.',
  shortcuts: [
    { keys: ['Type'], label: 'replace selection' },
    { keys: ['Backspace', 'Delete'], label: 'delete safely' },
    { keys: ['IME'], label: 'compose atomically' },
  ],
  cases: [
    { id: 'ime-mixed', title: 'Korean and English', mount: (context) => mountText(context, { initial: '한글 and text', label: 'Message' }) },
    { id: 'unicode-selection', title: 'Unicode selection', mount: (context) => mountText(context, { initial: 'Emoji 👨‍👩‍👧‍👦 · café · 한글', label: 'Unicode text', selectionStart: 6, selectionEnd: 17 }) },
    { id: 'multiline', title: 'Multiline draft', mount: (context) => mountText(context, { initial: 'First line\n둘째 줄', label: 'Notes', multiline: true }) },
    { id: 'controlled', title: 'Controlled editor', mount: (context) => mountText(context, { initial: 'Application-owned value', label: 'Controlled message', controlled: true }) },
  ],
};

function mountText(context: DemoContext, options: {
  readonly initial: string;
  readonly label: string;
  readonly selectionStart?: number;
  readonly selectionEnd?: number;
  readonly multiline?: boolean;
  readonly controlled?: boolean;
}): DemoSession {
  const wrap = document.createElement('div'); wrap.className = 'text-demo';
  const label = document.createElement('label');
  const element = options.multiline ? document.createElement('textarea') : document.createElement('input');
  element.id = `text-demo-${context.instanceID}-${options.label.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  element.className = 'text-input'; element.autocomplete = 'off'; label.htmlFor = element.id; label.textContent = options.label;
  const mirror = document.createElement('p'); mirror.className = 'text-mirror';
  wrap.append(label, element, mirror); context.surface.append(wrap);
  const initial = unwrap(createTextEditingState(options.initial, {
    anchorCodeUnitOffset: options.selectionStart ?? options.initial.length,
    focusCodeUnitOffset: options.selectionEnd ?? options.selectionStart ?? options.initial.length,
  }));
  let external: TextEditingState = initial;
  let connection!: TextConnection;
  connection = unwrap(createText({
    element,
    ...context.interaction,
    ...(options.controlled ? {
      value: external,
      onValueChange: ({ value }) => {
        external = value;
        queueMicrotask(() => connection.syncControlledValues({ value: external }));
      },
    } : { defaultValue: initial }),
    onTransition: ({ input, result }) => context.record({ revision: result.snapshot.revision, event: input.type, accepted: result.ok, effects: effectLabels(result.commands) }),
    onUpdate: render,
  }));
  function render(): void {
    const { revision, state } = connection.getSnapshot();
    mirror.textContent = connection.getValue() || 'The rendered value will appear here.';
    context.showState(revision, { text: state.snapshot.text, selection: state.snapshot.selection, composition: state.composition, ownership: options.controlled ? 'controlled' : 'uncontrolled' });
  }
  render();
  return { focus: () => element.focus(), disconnect: () => connection.disconnect() };
}
