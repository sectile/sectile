import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { TimerActionTrigger, TimerArea, TimerItem, TimerRoot, TimerSeparator } from '../dist/timer.js';

test('Vue timer exposes persistent semantic time parts and native controls', async () => {
  const app = createSSRApp({ render: () => h(TimerRoot, { countdown: true, startMs: 90_000 }, { default: () => [h(TimerArea, null, { default: () => [h(TimerItem, { type: 'minutes' }), h(TimerSeparator, null, { default: () => ':' }), h(TimerItem, { type: 'seconds' })] }), h(TimerActionTrigger, { action: 'start' }, { default: () => 'Start' })] }) });
  const html = await renderToString(app); assert.match(html, /role="timer"/); assert.match(html, /data-type="minutes"[^>]*>01/); assert.match(html, /data-type="seconds"[^>]*>30/); assert.match(html, /data-action="start"/);
});
