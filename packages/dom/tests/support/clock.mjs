/** Per-test native time boundary; Node restores the injected globals after the test. */
export function scheduler(t) {
  let now = 0;
  const intervals = new Map();
  t.mock.method(globalThis, 'setInterval', (callback, delay) => { const handle = {}; intervals.set(handle, { callback, delay }); return handle; });
  t.mock.method(globalThis, 'clearInterval', handle => intervals.delete(handle));
  t.mock.method(Date, 'now', () => now);
  return { intervals, advance(value) { now += value; }, callback() { return [...intervals.values()][0]?.callback; } };
}
