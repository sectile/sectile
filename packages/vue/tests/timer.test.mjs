import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { TimerActionTrigger, TimerArea, TimerItem, TimerRoot, TimerSeparator } from '../.verification-dist/timer.js';

test('Vue timer exposes persistent semantic time parts and native controls', async () => {
  const app = createSSRApp({ render: () => h(TimerRoot, { countdown: true, startMs: 90_000 }, { default: () => [h(TimerArea, null, { default: () => [h(TimerItem, { type: 'minutes' }), h(TimerSeparator, null, { default: () => ':' }), h(TimerItem, { type: 'seconds' })] }), h(TimerActionTrigger, { action: 'start' }, { default: () => 'Start' })] }) });
  const html = await renderToString(app); assert.match(html, /role="timer"/); assert.match(html, /data-type="minutes"[^>]*>01/); assert.match(html, /data-type="seconds"[^>]*>30/); assert.match(html, /data-action="start"/);
});

test('Vue Timer SSR uses canonical completed state before mount', async t => {
  const warnings = []; t.mock.method(console, 'warn', (...args) => warnings.push(args.join(' ')));
  let initial;
  const html = await renderToString(createSSRApp({ render: () => h(TimerRoot, { startMs: 0, targetMs: 0, autoStart: true }, {
    default: state => { initial = state; return String(state.valueMs); },
  }) }));
  assert.equal(initial.completed, true); assert.equal(initial.running, false); assert.equal(initial.progress, 100);
  assert.match(html, /data-state="complete"/u);
  assert.deepEqual(warnings, []);
});

test('Vue Timer SSR rejects invalid initialization policies through Core', async () => {
  await assert.rejects(renderToString(createSSRApp({ render: () => h(TimerRoot, { startMs: -1 }) })), /finite and non-negative/u);
});

test('Vue Timer SSR uses the same native interval admission as mounting', async () => {
  await assert.rejects(renderToString(createSSRApp({ render: () => h(TimerRoot, { intervalMs: 0 }) })), /Timer interval must be finite/u);
  const html = await renderToString(createSSRApp({ render: () => h(TimerRoot, { label: 'Delivery time', 'aria-describedby': 'help', targetMs: 1000 }, {
    default: () => h(TimerItem, { type: 'seconds' }),
  }) }));
  assert.match(html, /aria-label="Delivery time"/u); assert.match(html, /aria-describedby="help"/u);
  assert.equal(html.includes('aria-valuenow'), false);
});
