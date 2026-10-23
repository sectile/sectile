import assert from 'node:assert/strict';
import test from 'node:test';
import { connectDataAttributes, getAnchorAttributes, guardAnchorActivation } from '../.verification-dist/attributes.js';

test('native anchors retain destination data while disabled projection revokes navigation and tab order', () => {
  const input = { href: '/docs', tabIndex: 2, current: 'page', target: '_blank', rel: 'external', download: false };
  const disabled = getAnchorAttributes({ ...input, disabled: true });
  assert.equal(disabled.href, undefined); assert.equal(disabled.role, 'link'); assert.equal(disabled['aria-disabled'], 'true');
  assert.equal(disabled.tabindex, -1); assert.equal(disabled['aria-current'], 'page');
  assert.equal(disabled.rel, 'external noopener'); assert.equal(disabled.download, undefined);
  const enabled = getAnchorAttributes(input); assert.equal(enabled.href, '/docs'); assert.equal(enabled.tabindex, 2);
  assert.equal(enabled['aria-disabled'], undefined); assert.equal(input.rel, 'external');
  assert.equal(getAnchorAttributes({ href: '/file', download: true }).download, '');
  assert.equal(getAnchorAttributes({ href: '/file', download: 'report.txt' }).download, 'report.txt');
  assert.equal(getAnchorAttributes({ href: '/docs', target: '_BLANK', rel: 'external NoOpener' }).rel, 'external NoOpener');
  assert.equal(getAnchorAttributes({ href: '/docs', target: 'preview', rel: 'external' }).rel, 'external');
  for (const href of [undefined, '', ' \t\n']) assert.throws(() => getAnchorAttributes({ href }), /nonempty href/);
  assert.equal(getAnchorAttributes({ disabled: true }).href, undefined);
});
test('anchor admission preserves the original event and does not navigate or cancel enabled native activation', () => {
  const enabled = new Event('click', { cancelable: true });
  assert.equal(guardAnchorActivation(enabled), true); assert.equal(enabled.defaultPrevented, false);
  enabled.preventDefault(); assert.equal(guardAnchorActivation(enabled), false);
  const disabled = new Event('auxclick', { cancelable: true });
  assert.equal(guardAnchorActivation(disabled, true), false); assert.equal(disabled.defaultPrevented, true);
});

function fixture(initial = {}) {
  const attributes = new Map(Object.entries(initial));
  const element = {
    writes: 0,
    getAttribute(name) { const value = attributes.get(name) ?? null; this.onRead?.(name); return value; },
    setAttribute(name, value) { this.writes++; attributes.set(name, value); this.onWrite?.(name, value); },
    removeAttribute(name) { this.writes++; attributes.delete(name); this.onWrite?.(name, null); },
  };
  return { element, attributes };
}
const names = ['data-mode', 'data-density'];
test('data attribute replacement suppresses no-op writes and restores owned SSR metadata through churn', () => {
  const { element, attributes } = fixture({ 'data-mode': 'server', 'data-unrelated': 'retained' });
  for (let index = 0; index < 32; index++) {
    const inputNames = [...names], connection = connectDataAttributes({ element, names: inputNames }).value;
    inputNames[0] = 'data-external';
    const values = { 'data-mode': 'dark', 'data-density': 'compact' };
    assert.equal(connection.apply(values).ok, true);
    values['data-mode'] = 'changed';
    assert.equal(attributes.get('data-mode'), 'dark');
    const writes = element.writes;
    assert.equal(connection.apply({ 'data-mode': 'dark', 'data-density': 'compact' }).ok, true);
    assert.equal(element.writes, writes);
    assert.equal(connection.apply({ 'data-mode': 'light' }).ok, true);
    assert.equal(attributes.has('data-density'), false);
    connection.disconnect(); connection.disconnect();
    assert.deepEqual(Object.fromEntries(attributes), { 'data-mode': 'server', 'data-unrelated': 'retained' });
    assert.equal(connection.apply({}).error.code, 'dom.attributes-disposed');
  }
  const unclaimed = connectDataAttributes({ element, names }).value;
  unclaimed.disconnect(); assert.equal(attributes.get('data-mode'), 'server');
});
test('data metadata rejects undeclared, unsafe, accessor and oversized input before mutation', () => {
  const { element, attributes } = fixture({ 'data-mode': '1234' });
  let reads = 0;
  for (const invalidNames of [[], ['style'], ['onclick'], ['data-Mode'], ['data-a', 'data-a'], ['data-'], ['data-' + 'a'.repeat(124)],
    Object.defineProperty(['data-a'], '0', { get() { reads++; throw Error('getter'); } })]) {
    assert.equal(connectDataAttributes({ element, names: invalidNames }).ok, false);
  }
  assert.equal(connectDataAttributes({ element, names: Array.from({ length: 65 }, (_, index) => 'data-' + index) }).error.code, 'dom.attributes-resource-limit');
  for (const maximum of [0, -1, Infinity, NaN, 1.5]) assert.equal(connectDataAttributes({ element, names, maxValueCodeUnits: maximum }).ok, false);
  assert.equal(connectDataAttributes({ element, names, maxValueCodeUnits: 3 }).error.code, 'dom.attributes-resource-limit');
  const connection = connectDataAttributes({ element, names, maxValueCodeUnits: 4 }).value;
  for (const value of [null, [], { 'data-mode': undefined }, { 'data-mode': 1 }, { 'data-other': 'x' }, { [Symbol()]: 'x' },
    Object.defineProperty({}, 'data-mode', { enumerable: true, get() { reads++; throw Error('getter'); } })]) assert.equal(connection.apply(value).ok, false);
  assert.equal(connection.apply({ 'data-mode': '12345' }).error.code, 'dom.attributes-resource-limit');
  assert.equal(element.writes, 0); assert.equal(reads, 0);
  assert.equal(connection.apply({ 'data-mode': 'abcd' }).ok, true);
  connection.disconnect(); assert.equal(attributes.get('data-mode'), '1234');
  const fullNames = Array.from({ length: 64 }, (_, index) => 'data-' + index);
  const full = connectDataAttributes({ element, names: fullNames }).value;
  const replacement = Object.fromEntries(fullNames.map(name => [name, 'x'])), writes = element.writes;
  assert.equal(full.apply(replacement).ok, true); assert.equal(element.writes - writes, 64);
  assert.equal(full.apply(replacement).ok, true); assert.equal(element.writes - writes, 64);
  full.disconnect(); assert.deepEqual(Object.fromEntries(attributes), { 'data-mode': '1234' });
});
test('foreign attribute writers retain their changes before application, between revisions and during cleanup', () => {
  const { element, attributes } = fixture({ 'data-mode': 'original' });
  const before = connectDataAttributes({ element, names }).value;
  attributes.set('data-mode', 'external-before');
  assert.equal(before.apply({ 'data-mode': 'owned' }).error.code, 'dom.attributes-unavailable');
  before.disconnect(); assert.equal(attributes.get('data-mode'), 'external-before');
  const after = connectDataAttributes({ element, names }).value;
  after.apply({ 'data-mode': 'owned', 'data-density': 'compact' });
  attributes.set('data-mode', 'external-after');
  assert.equal(after.apply({}).error.code, 'dom.attributes-unavailable');
  after.disconnect();
  assert.equal(attributes.get('data-mode'), 'external-after'); assert.equal(attributes.has('data-density'), false);
  const interleaved = connectDataAttributes({ element, names }).value;
  element.onWrite = name => { if (name === 'data-density') attributes.set('data-mode', 'external-interleaved'); };
  assert.equal(interleaved.apply({ 'data-mode': 'owned', 'data-density': 'compact' }).error.code, 'dom.attributes-unavailable');
  element.onWrite = undefined;
  assert.equal(attributes.get('data-mode'), 'external-interleaved');
  assert.equal(attributes.has('data-density'), false);
  interleaved.disconnect(); assert.equal(attributes.get('data-mode'), 'external-interleaved');
});
test('partial attribute failures roll back, reject reentry and permit retry without changing accepted metadata', () => {
  const { element, attributes } = fixture({ 'data-mode': 'server' });
  const connection = connectDataAttributes({ element, names }).value;
  connection.apply({ 'data-mode': 'before', 'data-density': 'comfortable' });
  let reentry;
  element.onWrite = (name, value) => {
    if (name === 'data-density' && value === 'compact') { reentry = connection.apply({}); throw Error('write'); }
  };
  assert.equal(connection.apply({ 'data-mode': 'after', 'data-density': 'compact' }).error.code, 'dom.attributes-unavailable');
  assert.equal(reentry.error.code, 'dom.attributes-reentrant');
  assert.deepEqual(Object.fromEntries(attributes), { 'data-mode': 'before', 'data-density': 'comfortable' });
  element.onWrite = undefined;
  assert.equal(connection.apply({ 'data-mode': 'after', 'data-density': 'compact' }).ok, true);
  connection.disconnect(); assert.deepEqual(Object.fromEntries(attributes), { 'data-mode': 'server' });
  const failedRollback = connectDataAttributes({ element, names }).value;
  failedRollback.apply({ 'data-mode': 'before', 'data-density': 'comfortable' });
  element.onWrite = (name, value) => { if (name === 'data-density' && value !== null) throw Error('write and rollback'); };
  assert.equal(failedRollback.apply({ 'data-mode': 'after', 'data-density': 'compact' }).error.code, 'dom.attributes-disposed');
  element.onWrite = undefined;
  assert.deepEqual(Object.fromEntries(attributes), { 'data-mode': 'server' });
  failedRollback.disconnect(); assert.equal(failedRollback.apply({}).error.code, 'dom.attributes-disposed');
  const interruptedRollback = connectDataAttributes({ element, names }).value;
  interruptedRollback.apply({ 'data-mode': 'before', 'data-density': 'comfortable' });
  element.onWrite = (name, value) => {
    if (name === 'data-density' && value === 'compact') {
      element.onRead = () => { element.onRead = undefined; interruptedRollback.disconnect(); };
      throw Error('interrupt rollback');
    }
  };
  assert.equal(interruptedRollback.apply({ 'data-mode': 'after', 'data-density': 'compact' }).error.code, 'dom.attributes-disposed');
  element.onWrite = undefined;
  assert.deepEqual(Object.fromEntries(attributes), { 'data-mode': 'server' }, 'Rollback cannot write after disconnect has restored original metadata');
});
test('interrupted metadata application releases its target and cleanup attempts every owned name', () => {
  for (const phase of ['admission', 'read', 'write']) {
    const { element, attributes } = fixture({ 'data-mode': 'server' });
    const connection = connectDataAttributes({ element, names }).value;
    if (phase === 'read') element.onRead = () => { element.onRead = undefined; connection.disconnect(); };
    if (phase === 'write') element.onWrite = () => { element.onWrite = undefined; connection.disconnect(); };
    const values = phase === 'admission' ? new Proxy({}, { ownKeys() { connection.disconnect(); return []; } })
      : { 'data-mode': 'next', 'data-density': 'compact' };
    assert.equal(connection.apply(values).error.code, 'dom.attributes-disposed');
    assert.deepEqual(Object.fromEntries(attributes), { 'data-mode': 'server' });
    const writes = element.writes;
    connection.disconnect(); assert.equal(connection.apply({}).ok, false); assert.equal(element.writes, writes);
  }
  const { element, attributes } = fixture();
  const connection = connectDataAttributes({ element, names }).value;
  connection.apply({ 'data-mode': 'next', 'data-density': 'compact' });
  element.onWrite = name => { if (name === 'data-mode') throw undefined; };
  let failed = false;
  try { connection.disconnect(); } catch { failed = true; }
  assert.equal(failed, true); assert.equal(attributes.size, 0, 'Other attributes still receive cleanup');
  connection.disconnect(); assert.equal(connection.apply({}).error.code, 'dom.attributes-disposed');
});
