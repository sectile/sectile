import { createApp, h, nextTick, ref } from 'vue';
import { CarouselRoot, CarouselSlide } from '../../.verification-dist/carousel.js';
import { ComboboxEmpty, ComboboxInput, ComboboxRoot } from '../../.verification-dist/combobox.js';
import { DisclosureContent, DisclosureRoot } from '../../.verification-dist/disclosure.js';
import { ListboxItem, ListboxItemIndicator, ListboxRoot } from '../../.verification-dist/listbox.js';

const transition = Object.freeze({ transitionProperty: 'opacity', transitionDuration: '20ms' });

export async function runConditionalPresenceScenarios() {
  return Object.freeze({
    'conditional-presence-disclosure-exit': await disclosureExitScenario(),
    'conditional-presence-carousel-crossfade': await carouselCrossfadeScenario(),
    'conditional-presence-combobox-empty-live-region': await comboboxEmptyLiveRegionScenario(),
    'conditional-presence-listbox-indicator-exit': await listboxIndicatorExitScenario(),
  });
}

async function listboxIndicatorExitScenario() {
  const host = document.createElement('div');
  document.body.append(host);
  const value = ref('a');
  const items = ['a', 'b'];
  const app = createApp({
    render: () => h(ListboxRoot, {
      items,
      modelValue: value.value,
      'onUpdate:modelValue': (next) => { value.value = next; },
    }, {
      default: () => items.map((item) => h(ListboxItem, { value: item, key: item }, {
        default: ({ selected }) => h(ListboxItemIndicator, {
          style: { ...transition, opacity: selected ? '1' : '0' },
        }, { default: () => 'Selected' }),
      })),
    }),
  });
  app.mount(host);
  try {
    await nextTick();
    await frame();
    const indicators = [...host.querySelectorAll('[data-scope="listbox"][data-part="item-indicator"]')];
    const first = indicators[0];
    const second = indicators[1];
    if (!(first instanceof HTMLElement) || !(second instanceof HTMLElement)) {
      return Object.freeze({ ok: false, reason: 'missing listbox indicators' });
    }
    value.value = 'b';
    await nextTick();
    const retained = first.dataset.state === 'unchecked'
      && first.hidden === false
      && first.getAnimations().length > 0
      && second.dataset.state === 'checked'
      && second.hidden === false;
    await wait(100);
    await nextTick();
    const exited = first.hidden === true && second.hidden === false;
    return Object.freeze({ ok: retained && exited, retained, exited });
  } finally {
    app.unmount();
    host.remove();
  }
}

async function comboboxEmptyLiveRegionScenario() {
  const host = document.createElement('div');
  document.body.append(host);
  const inputValue = ref('zzz');
  const app = createApp({
    render: () => h(ComboboxRoot, {
      items: [{ id: 'alpha', label: 'Alpha' }],
      inputValue: inputValue.value,
      policies: { matches: (label, query) => label.toLowerCase().includes(query.toLowerCase()) },
      'onUpdate:inputValue': (value) => { inputValue.value = value; },
    }, {
      default: () => [
        h(ComboboxInput),
        h(ComboboxEmpty, {
          style: { ...transition, opacity: inputValue.value === 'zzz' ? '1' : '0' },
        }, { default: () => 'No results' }),
      ],
    }),
  });
  app.mount(host);
  try {
    await nextTick();
    await frame();
    const empty = host.querySelector('[data-scope="combobox"][data-part="empty"]');
    if (!(empty instanceof HTMLElement)) return Object.freeze({ ok: false, reason: 'missing empty status' });
    const initiallyLive = empty.hidden === false
      && empty.getAttribute('role') === 'status'
      && empty.getAttribute('aria-live') === null;
    inputValue.value = '';
    await nextTick();
    const suppressed = empty.hidden === false
      && empty.inert === true
      && empty.getAttribute('role') === null
      && empty.getAttribute('aria-live') === 'off'
      && empty.getAttribute('aria-hidden') === 'true';
    await wait(100);
    await nextTick();
    const exited = empty.hidden === true
      && empty.inert === false
      && empty.getAttribute('role') === null
      && empty.getAttribute('aria-hidden') === null;
    return Object.freeze({ ok: initiallyLive && suppressed && exited, initiallyLive, suppressed, exited });
  } finally {
    app.unmount();
    host.remove();
  }
}

async function disclosureExitScenario() {
  const host = document.createElement('div');
  document.body.append(host);
  const open = ref(true);
  const app = createApp({
    render: () => h(DisclosureRoot, {
      modelValue: open.value,
      'onUpdate:modelValue': (value) => { open.value = value; },
    }, {
      default: () => h(DisclosureContent, {
        style: { ...transition, opacity: open.value ? '1' : '0' },
      }, { default: () => h('button', null, 'Disclosure action') }),
    }),
  });
  app.mount(host);
  try {
    await nextTick();
    await frame();
    const content = host.querySelector('[data-scope="disclosure"][data-part="content"]');
    if (!(content instanceof HTMLElement)) return Object.freeze({ ok: false, reason: 'missing content' });
    open.value = false;
    await nextTick();
    const retained = content.dataset.state === 'closed'
      && content.hidden === false
      && content.inert === true
      && content.getAttribute('aria-hidden') === 'true'
      && getComputedStyle(content).opacity === '1';
    await wait(100);
    await nextTick();
    const exited = content.hidden === true
      && content.inert === false
      && content.getAttribute('aria-hidden') === null;
    return Object.freeze({ ok: retained && exited, retained, exited });
  } finally {
    app.unmount();
    host.remove();
  }
}

async function carouselCrossfadeScenario() {
  const host = document.createElement('div');
  document.body.append(host);
  const value = ref('a');
  const app = createApp({
    render: () => h(CarouselRoot, {
      slides: ['a', 'b'],
      modelValue: value.value,
      'onUpdate:modelValue': (next) => { value.value = next; },
    }, {
      default: () => [
        h(CarouselSlide, {
          value: 'a',
          style: { ...transition, opacity: value.value === 'a' ? '1' : '0' },
        }, { default: () => h('button', null, 'Slide A') }),
        h(CarouselSlide, {
          value: 'b',
          style: { ...transition, opacity: value.value === 'b' ? '1' : '0' },
        }, { default: () => h('button', null, 'Slide B') }),
      ],
    }),
  });
  app.mount(host);
  try {
    await nextTick();
    await frame();
    const slides = [...host.querySelectorAll('[data-scope="carousel"][data-part="slide"]')];
    const first = slides[0];
    const second = slides[1];
    if (!(first instanceof HTMLElement) || !(second instanceof HTMLElement)) {
      return Object.freeze({ ok: false, reason: 'missing slides' });
    }
    value.value = 'b';
    await nextTick();
    const crossfade = first.dataset.state === 'inactive'
      && first.hidden === false
      && first.inert === true
      && first.getAttribute('aria-hidden') === 'true'
      && second.dataset.state === 'active'
      && second.hidden === false
      && second.inert === false
      && second.getAttribute('aria-hidden') === null;
    await wait(100);
    await nextTick();
    const exited = first.hidden === true
      && first.inert === false
      && first.getAttribute('aria-hidden') === null
      && second.hidden === false;
    return Object.freeze({ ok: crossfade && exited, crossfade, exited });
  } finally {
    app.unmount();
    host.remove();
  }
}

function frame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
