import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'https://sectile.dev/' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  SVGElement: browserWindow.SVGElement,
});

const { createApp, defineComponent, h, nextTick, onMounted } = await import('vue');
const { useNextTickTask } = await import('../.verification-dist/internal/scheduled-task.js');

test('Vue scheduled tasks do not run after their owner unmounts', async () => {
  const calls = [];
  const Probe = defineComponent({
    setup() {
      const task = useNextTickTask(() => calls.push('ran'));
      onMounted(task.schedule);
      return () => h('div');
    },
  });
  const host = document.createElement('div');
  const app = createApp(Probe);
  app.mount(host);
  app.unmount();
  await nextTick();
  assert.deepEqual(calls, []);
});

test('Vue scheduled tasks coalesce and a canceled generation can be rescheduled', async () => {
  let task;
  const calls = [];
  const Probe = defineComponent({
    setup() {
      task = useNextTickTask(() => calls.push('ran'));
      return () => h('div');
    },
  });
  const host = document.createElement('div');
  const app = createApp(Probe);
  try {
    app.mount(host);
    task.schedule();
    task.schedule();
    task.cancel();
    task.schedule();
    await nextTick();
    assert.deepEqual(calls, ['ran']);
  } finally {
    app.unmount();
  }
});
test('held retired scheduled task handles release their application callback', { skip: typeof global.gc !== 'function' }, async () => {
  const retained = retiredTask();
  for (let turn = 0; turn < 24; turn++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
  assert.equal(retained.payload.deref(), undefined); retained.task.schedule(); await nextTick();
});
function retiredTask() {
  let task;
  const payload = { calls: 0 }, Probe = defineComponent({ setup() { task = useNextTickTask(() => { payload.calls++; }); return () => h('div'); } });
  const app = createApp(Probe); app.mount(document.createElement('div')); app.unmount();
  return { task, payload: new WeakRef(payload) };
}
