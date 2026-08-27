import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { tryCreateMeterState } from '@sectile/core/meter';
import { tryCreateMeterGroupState } from '@sectile/core/meter-group';
import { tryCreateProgressState } from '@sectile/core/progress';
import { createMeter as createDOMMeter, tryCreateMeter as tryCreateDOMMeter } from '@sectile/dom/meter';
import {
  createMeterGroup as createDOMMeterGroup,
  tryCreateMeterGroup as tryCreateDOMMeterGroup,
} from '@sectile/dom/meter-group';
import {
  createProgress as createDOMProgress,
  tryCreateProgress as tryCreateDOMProgress,
} from '@sectile/dom/progress';
import { createMeter as createTerminalMeter, tryCreateMeter as tryCreateTerminalMeter } from '@sectile/terminal/meter';
import {
  createMeterGroup as createTerminalMeterGroup,
  tryCreateMeterGroup as tryCreateTerminalMeterGroup,
} from '@sectile/terminal/meter-group';
import {
  createProgress as createTerminalProgress,
  tryCreateProgress as tryCreateTerminalProgress,
} from '@sectile/terminal/progress';
import { MeterRoot } from '@sectile/vue/meter';
import {
  MeterGroupIndicator,
  MeterGroupList,
  MeterGroupRoot,
  MeterGroupSegment,
  MeterGroupTrack,
} from '@sectile/vue/meter-group';
import { ProgressRoot } from '@sectile/vue/progress';

const requireVue = createRequire(new URL('../../packages/vue/package.json', import.meta.url));
const { createSSRApp, h } = requireVue('vue');
const { renderToString } = requireVue('@vue/server-renderer');

test('Meter preserves exact state, projection, failure, and revision across hosts', async () => {
  const input = { value: '0.1', min: '0', max: '0.3', low: '0.1', high: '0.2', optimum: '0.15' };
  const core = expectValue(tryCreateMeterState(input));
  const root = new FakeElement();
  const DOM = createDOMMeter({ ...input, root, label: 'Signal quality' });
  const terminal = createTerminalMeter(input);
  assert.deepEqual(DOM.getSnapshot().state, core);
  assert.deepEqual(terminal.getSnapshot().state, core);
  assert.equal(root.getAttribute('role'), 'meter');
  assert.equal(root.getAttribute('aria-valuenow'), core.value);
  assert.equal(root.getAttribute('data-percentage'), '33.333333333333');

  let slot;
  const html = await renderToString(createSSRApp({
    render: () => h(MeterRoot, { ...input, label: 'Signal quality' }, {
      default: (value) => { slot = value; },
    }),
  }));
  assert.match(html, /role="meter"/u);
  assert.match(html, /aria-label="Signal quality"/u);
  assert.equal(slot.value, core.value);
  assert.equal(slot.zone, core.zone);
  assert.equal(slot.percentage, 33.333333333333);

  const next = { ...input, value: '0.2' };
  assert.deepEqual(expectValue(DOM.syncControlledValues(next)).state, expectValue(tryCreateMeterState(next)));
  assert.deepEqual(expectValue(terminal.syncControlledValues(next)), DOM.getSnapshot());
  assert.equal(DOM.getSnapshot().revision, 1);

  await assertSameFailure(
    tryCreateMeterState({ ...input, value: '0.4' }),
    tryCreateDOMMeter({ ...input, value: '0.4', root: new FakeElement() }),
    tryCreateTerminalMeter({ ...input, value: '0.4' }),
    () => renderToString(createSilentSSRApp({ render: () => h(MeterRoot, { ...input, value: '0.4' }) })),
  );
});

test('Progress preserves indeterminate omission and controlled state across hosts', async () => {
  const input = { max: '0.3', value: null };
  const core = expectValue(tryCreateProgressState(input));
  const root = new FakeElement();
  const DOM = createDOMProgress({ ...input, root, label: 'Upload progress' });
  const terminal = createTerminalProgress(input);
  assert.deepEqual(DOM.getSnapshot().state, core);
  assert.deepEqual(terminal.getSnapshot().state, core);
  assert.equal(root.getAttribute('role'), 'progressbar');
  assert.equal(root.getAttribute('aria-valuenow'), null);
  assert.equal(root.getAttribute('aria-valuetext'), null);

  let slot;
  const html = await renderToString(createSSRApp({
    render: () => h(ProgressRoot, { ...input, label: 'Upload progress' }, {
      default: (value) => { slot = value; },
    }),
  }));
  assert.match(html, /role="progressbar"/u);
  assert.doesNotMatch(html, /aria-valuenow/u);
  assert.equal(slot.status, core.status);
  assert.equal(slot.percentage, null);

  const next = { max: '0.3', value: '0.1' };
  const expected = expectValue(tryCreateProgressState(next));
  assert.deepEqual(expectValue(DOM.syncControlledValues(next)).state, expected);
  assert.deepEqual(expectValue(terminal.syncControlledValues(next)), DOM.getSnapshot());
  assert.equal(root.getAttribute('aria-valuenow'), '0.1');
  assert.equal(root.getAttribute('data-percentage'), '33.333333333333');

  await assertSameFailure(
    tryCreateProgressState({ max: '0', value: null }),
    tryCreateDOMProgress({ max: '0', value: null, root: new FakeElement() }),
    tryCreateTerminalProgress({ max: '0', value: null }),
    () => renderToString(createSilentSSRApp({ render: () => h(ProgressRoot, { max: '0' }) })),
  );
});

test('MeterGroup preserves exact partitions, order, semantics, and revisions across hosts', async () => {
  const input = {
    max: '0.6',
    items: [{ id: 'documents', value: '0.1' }, { id: 'media', value: '0.2' }],
  };
  const entries = input.items.map((item) => ({ ...item, label: item.id }));
  const core = expectValue(tryCreateMeterGroupState(input));
  const root = new FakeElement();
  const track = new FakeElement();
  const DOM = createDOMMeterGroup({ ...input, root, track, label: 'Storage capacity' });
  const terminal = createTerminalMeterGroup(input);
  assert.deepEqual(DOM.getSnapshot().state, core);
  assert.deepEqual(terminal.getSnapshot().state, core);

  const elements = input.items.map(() => new FakeElement());
  for (const [index, item] of input.items.entries()) {
    expectValue(DOM.registerSegment(item.id, elements[index], { label: item.id }));
  }
  assert.equal(root.getAttribute('role'), 'group');
  assert.equal(root.getAttribute('aria-label'), 'Storage capacity');
  assert.equal(track.getAttribute('role'), 'presentation');
  assert.deepEqual(elements.map((element) => element.getAttribute('data-id')), ['documents', 'media']);
  assert.deepEqual(elements.map((element) => element.getAttribute('aria-valuenow')), ['0.1', '0.2']);
  assert.equal(elements[1].getAttribute('data-start-percentage'), '16.666666666667');

  let slot;
  const html = await renderToString(createSSRApp({
    render: () => h(MeterGroupRoot, { items: entries, max: input.max, label: 'Storage capacity' }, {
      default: (value) => {
        slot = value;
        return [
          h(MeterGroupTrack, null, {
            default: () => value.segments.map((segment) => h(MeterGroupSegment, {
              id: segment.id,
              key: segment.id,
            }, { default: () => h(MeterGroupIndicator) })),
          }),
          h(MeterGroupList),
        ];
      },
    }),
  }));
  assert.match(html, /role="group"/u);
  assert.equal((html.match(/role="meter"/gu) ?? []).length, 2);
  assert.doesNotMatch(html, /aria-live/u);
  assert.equal(slot.total, core.total);
  assert.equal(slot.remaining, core.remaining);
  assert.deepEqual(slot.segments.map(({ id, start, end }) => ({ id, start, end })), [
    { id: 'documents', start: '0', end: '0.1' },
    { id: 'media', start: '0.1', end: '0.3' },
  ]);
  const plan = expectValue(terminal.getRenderPlan(7));
  assert.equal(plan.segments.reduce((sum, segment) => sum + segment.cellCount, plan.remainingCells), 7);

  const next = {
    max: '0.6',
    items: [{ id: 'media', value: '0.3' }, { id: 'documents', value: '0.1' }],
  };
  const expected = expectValue(tryCreateMeterGroupState(next));
  assert.deepEqual(expectValue(DOM.syncControlledValues(next)).state, expected);
  assert.deepEqual(expectValue(terminal.syncControlledValues(next)), DOM.getSnapshot());
  assert.equal(DOM.getSnapshot().revision, 1);
  assert.deepEqual(DOM.getSnapshot().state.segments.map(({ id }) => id), ['media', 'documents']);

  const invalid = { max: '100', items: [{ id: 'a', value: '70' }, { id: 'b', value: '40' }] };
  await assertSameFailure(
    tryCreateMeterGroupState(invalid),
    tryCreateDOMMeterGroup({ ...invalid, root: new FakeElement() }),
    tryCreateTerminalMeterGroup(invalid),
    () => renderToString(createSilentSSRApp({
      render: () => h(MeterGroupRoot, {
        max: invalid.max,
        items: invalid.items.map((item) => ({ ...item, label: item.id })),
      }),
    })),
  );
});

async function assertSameFailure(core, DOM, terminal, renderVue) {
  assert.equal(core.ok, false);
  assert.equal(DOM.ok, false);
  assert.equal(terminal.ok, false);
  assert.equal(DOM.error.code, core.error.code);
  assert.equal(terminal.error.code, core.error.code);
  await assert.rejects(renderVue, (error) => error?.code === core.error.code);
}

function createSilentSSRApp(component) {
  const app = createSSRApp(component);
  app.config.warnHandler = () => {};
  return app;
}

function expectValue(result) {
  assert.equal(result.ok, true);
  return result.value;
}

class FakeStyle {
  #values = new Map();
  setProperty(name, value) { this.#values.set(name, String(value)); }
  removeProperty(name) { this.#values.delete(name); }
  getPropertyValue(name) { return this.#values.get(name) ?? ''; }
}

class FakeElement {
  #attributes = new Map();
  style = new FakeStyle();
  setAttribute(name, value) { this.#attributes.set(name, String(value)); }
  removeAttribute(name) { this.#attributes.delete(name); }
  getAttribute(name) { return this.#attributes.get(name) ?? null; }
}
