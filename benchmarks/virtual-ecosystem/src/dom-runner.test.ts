import assert from 'node:assert/strict';
import test from 'node:test';
import { waitForElement, waitForPresentationBoundary } from './dom-observation.ts';

test('element readiness resolves from mutation delivery without frame polling', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'MutationObserver');
  let notify: MutationCallback | undefined;
  let disconnected = false;
  class TestMutationObserver {
    constructor(callback: MutationCallback) { notify = callback; }
    observe(): void {}
    disconnect(): void { disconnected = true; }
    takeRecords(): MutationRecord[] { return []; }
  }
  Object.defineProperty(globalThis, 'MutationObserver', {
    configurable: true,
    value: TestMutationObserver,
  });
  try {
    let ready = false;
    const pending = waitForElement({} as Node, () => ready, 'fixture', 100);
    ready = true;
    notify?.([], {} as MutationObserver);
    await pending;
    assert.equal(disconnected, true);
  } finally {
    if (original === undefined) delete (globalThis as { MutationObserver?: unknown }).MutationObserver;
    else Object.defineProperty(globalThis, 'MutationObserver', original);
  }
});

test('presentation readiness records the next frame separately from DOM readiness', async () => {
  const callbacks: FrameRequestCallback[] = [];
  const pending = waitForPresentationBoundary((callback) => {
    callbacks.push(callback);
    return callbacks.length;
  });

  assert.equal(callbacks.length, 1);
  callbacks.shift()?.(16);
  await pending;
  assert.equal(callbacks.length, 0);
});
