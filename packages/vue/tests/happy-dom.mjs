import { after } from 'node:test';
import { Window } from 'happy-dom';

export function createTestWindow(options) {
  globalThis.__VUE_DEVTOOLS_GLOBAL_HOOK__ ??= { emit() {} };
  const window = new Window(options);
  after(async () => {
    await window.happyDOM.abort();
    await window.happyDOM.close();
  });
  return window;
}
