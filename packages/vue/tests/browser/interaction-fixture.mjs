// Browser-driven keyboard/IME witnesses. The runner supplies native input.
import { createApp, h, nextTick, ref } from 'vue';
import { DialogRoot, DialogTrigger, DialogContent, DialogClose, DialogPortal } from '../../.verification-dist/overlay/dialog.js';
import { TextField } from '../../.verification-dist/text.js';
import { ComboboxRoot, ComboboxInput } from '../../.verification-dist/combobox.js';
import { NumberField } from '../../.verification-dist/number-field.js';
import { SpinButtonRoot, SpinButtonInput } from '../../.verification-dist/spin-button.js';
import { createPopover } from '@sectile/dom/popover';
import { createCarousel } from '@sectile/dom/carousel';

const host = document.querySelector('#probe');
const style = document.createElement('style');
style.textContent = '[data-probe-panel]{opacity:1;transition:opacity 600ms linear}[data-probe-panel][data-state=closed]{opacity:0}';
document.head.append(style);
let app;
const settle = async () => { await nextTick(); await nextTick(); };
const reset = () => { app?.unmount(); app = undefined; host.replaceChildren(); };
const events = [], writes = [];
const composing = new Set();
for (const type of ['compositionstart', 'compositionupdate', 'compositionend', 'input']) document.addEventListener(type, event => {
  if (type === 'compositionstart') composing.add(event.target);
  if (type === 'compositionend') composing.delete(event.target);
  if (events.length < 1000) events.push({ id: event.target.id, type, data: event.data, value: event.target.value });
}, true);
const value = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
Object.defineProperty(HTMLInputElement.prototype, 'value', { ...value, set(next) {
  if (composing.has(this)) writes.push({ id: this.id, value: next });
  value.set.call(this, next);
} });

window.sectileProbe = {
  events, writes,
  async native() {
    reset(); events.length = 0; writes.length = 0;
    const text = ref(''), combo = ref(''), items = ref([{ id: 'a', label: '한글' }]);
    app = createApp({ render: () => h('div', [
      h('input', { id: 'native' }),
      h(TextField, { id: 'text', modelValue: text.value, 'onUpdate:modelValue': next => { text.value = next; } }),
      h(ComboboxRoot, { items: items.value, inputValue: combo.value, 'onUpdate:inputValue': next => { combo.value = next; } }, { default: () => h(ComboboxInput, { id: 'combo' }) }),
    ]) });
    app.mount(host); await settle();
    this.models = () => ({ text: text.value, combo: combo.value });
    this.changeItems = () => { items.value = [...items.value, { id: 'b', label: '새 항목' }]; };
  },
  async popups(portal, controlled) {
    reset();
    const parent = ref(false), child = ref(false);
    const props = (open, label) => ({ label, ...(controlled ? { open: open.value, 'onUpdate:open': next => { open.value = next; } } : {}) });
    const panel = (name, children) => {
      const content = () => h(DialogContent, { 'data-probe-panel': name }, { default: children });
      return portal ? h(DialogPortal, {}, { default: content }) : content();
    };
    app = createApp({ render: () => h(DialogRoot, props(parent, 'Parent'), { default: () => [
      h(DialogTrigger, { id: 'parent-trigger' }, { default: () => 'Parent' }),
      panel('parent', () => [h(DialogClose, { id: 'parent-close' }, { default: () => 'Close parent' }),
        h(DialogRoot, props(child, 'Child'), { default: () => [
          h(DialogTrigger, { id: 'child-trigger' }, { default: () => 'Child' }),
          panel('child', () => h(DialogClose, { id: 'child-close' }, { default: () => 'Close child' })),
        ] }),
      ]),
    ] }) });
    app.mount(host); await settle();
  },
  async defects() {
    reset();
    const opener = document.createElement('button'), root = document.createElement('div');
    opener.id = 'opener'; host.append(opener, root); opener.focus();
    root.innerHTML = '<button disabled>Disabled</button><div hidden><button>Hidden</button></div><button id="visible">Visible</button>';
    const popup = createPopover({ root, defaultOpen: true, autoFocus: true, position: false });
    const initialFocus = document.activeElement.id;
    popup.destroy(); host.replaceChildren();
    app = createApp({ render: () => h(NumberField, { modelValue: null, placeholder: 'Enter a number' }) });
    app.mount(host); await settle();
    const placeholder = host.querySelector('input').getAttribute('placeholder'); reset();
    const min = ref('0.5'), model = ref('4'), errors = [];
    app = createApp({ render: () => h(SpinButtonRoot, { min: min.value, max: '1000', step: '0.01', modelValue: model.value }, { default: () => h(SpinButtonInput) }) });
    app.config.errorHandler = error => errors.push(error.message);
    app.mount(host); await settle();
    const input = host.querySelector('input'); input.focus(); input.setSelectionRange(1, 1);
    min.value = '0.16'; model.value = '0.16'; await settle();
    const spin = { errors: errors.slice(), text: input.value, focused: document.activeElement === input };
    // An invalid replacement keeps the prior connection usable.
    min.value = '2'; model.value = '0'; await settle();
    const rejected = { errors: errors.slice(), text: input.value }; reset();
    const keys = [];
    for (const scenario of ['input', 'range', 'alt', 'prevented', 'root']) {
      const root = document.createElement('div'), input = document.createElement('input');
      if (scenario === 'range') input.type = 'range'; root.append(input); host.append(root);
      const carousel = createCarousel({ root, slides: ['a', 'b', 'c'], defaultValue: 'a' });
      const event = new KeyboardEvent('keydown', { key: scenario === 'range' ? 'End' : 'ArrowRight', altKey: scenario === 'alt', bubbles: true, cancelable: true });
      if (scenario === 'prevented') event.preventDefault();
      (scenario === 'root' ? root : input).dispatchEvent(event);
      keys.push({ scenario, value: carousel.getSnapshot().state.cursor.current });
      carousel.destroy(); root.remove();
    }
    return { initialFocus, placeholder, spin, rejected, keys };
  },
};
