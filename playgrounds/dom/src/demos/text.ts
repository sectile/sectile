import { createText } from '@sectile/dom/text';
import { createTextEditingState } from '@sectile/primitives/text';
import { unwrap } from '@sectile/primitives/result';
import { effectLabels, type DemoDefinition } from '../playground.js';

export const textDemo: DemoDefinition = {
  id: 'text',
  label: 'Text',
  title: 'IME-aware text editing',
  description: 'Type English, Korean, emoji, or composed text and inspect its normalized selection.',
  shortcuts: [
    { keys: ['Type'], label: 'replace selection' },
    { keys: ['Backspace'], label: 'delete' },
    { keys: ['IME'], label: 'compose safely' },
  ],
  mount(context) {
    const wrap = document.createElement('div');
    wrap.className = 'text-demo';
    const label = document.createElement('label');
    label.htmlFor = 'text-demo-input';
    label.textContent = 'Message';
    const input = document.createElement('input');
    input.id = 'text-demo-input';
    input.className = 'text-input';
    input.autocomplete = 'off';
    const mirror = document.createElement('p');
    mirror.className = 'text-mirror';
    wrap.append(label, input, mirror);
    context.surface.append(wrap);
    const initialText = '한글 and text';
    const connection = unwrap(createText({
      element: input,
      defaultValue: unwrap(createTextEditingState(initialText, {
        anchorCodeUnitOffset: initialText.length,
        focusCodeUnitOffset: initialText.length,
      })),
      onTransition: ({ input: event, result }) => context.record({
        revision: result.snapshot.revision,
        event: event.type,
        accepted: result.ok,
        effects: effectLabels(result.commands),
      }),
      onUpdate: render,
    }));

    function render(): void {
      const { revision, state } = connection.getSnapshot();
      mirror.textContent = connection.getValue() || 'The rendered value will appear here.';
      context.showState(revision, {
        text: state.snapshot.text,
        selection: state.snapshot.selection,
        composition: state.composition,
      });
    }

    render();
    return { focus: () => input.focus(), disconnect: () => connection.disconnect() };
  },
};
