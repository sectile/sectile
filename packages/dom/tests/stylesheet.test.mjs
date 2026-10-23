import assert from 'node:assert/strict';
import test from 'node:test';
import { connectStylesheet } from '../.verification-dist/stylesheet.js';

function fixture() {
  const document = { nodeType: 9 };
  const head = { children: [], appendChild(node) { this.children.push(node); node.parentNode = this; this.onAppend?.(node); return node; }, removeChild(node) {
    this.children.splice(this.children.indexOf(node), 1); node.parentNode = null; return node;
  } };
  class Style {
    localName = 'style'; ownerDocument = document; parentNode = null; nonce = ''; writes = 0; text = '';
    attributes = new Map();
    get textContent() { const text = this.text; this.onRead?.(); return text; }
    set textContent(value) { this.writes++; this.text = value; this.onWrite?.(value); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    setAttribute(name, value) { this.attributes.set(name, value); }
  }
  document.head = head;
  document.createElement = () => new Style();
  const element = { ownerDocument: document, getRootNode: () => document };
  return { document, head, element, Style };
}
test('stylesheet connection owns one node, suppresses no-op writes and releases repeated churn', () => {
  const { head, element } = fixture();
  for (let index = 0; index < 32; index++) {
    const result = connectStylesheet({ element, scopeId: 'preview', nonce: 'authorized', maxCssCodeUnits: 20 });
    assert.equal(result.ok, true);
    const connection = result.value;
    assert.equal(head.children.length, 0);
    assert.equal(connection.apply('.a{color:red}').ok, true);
    const node = head.children[0];
    assert.equal(node.nonce, 'authorized');
    assert.equal(node.getAttribute('data-sectile-style-scope'), 'preview');
    assert.equal(connection.apply('.a{color:red}').ok, true);
    assert.equal(node.writes, 1);
    assert.equal(connection.apply('.a{color:blue}').ok, true);
    assert.equal(head.children.length, 1);
    assert.equal(connection.apply('x'.repeat(21)).error.code, 'dom.stylesheet-resource-limit');
    assert.equal(node.textContent, '.a{color:blue}');
    connection.disconnect(); connection.disconnect();
    assert.equal(head.children.length, 0);
    assert.equal(connection.apply('').error.code, 'dom.stylesheet-disposed');
  }
});
test('explicit SSR adoption restores original output without creating duplicate nodes', () => {
  const { head, element, Style } = fixture();
  const node = new Style(); node.setAttribute('data-sectile-style-scope', 'preview'); node.nonce = 'request'; node.textContent = '.server{}'; head.appendChild(node);
  const connection = connectStylesheet({ element, scopeId: 'preview', nonce: 'request', style: node }).value;
  assert.equal(connection.apply('.client{}').ok, true);
  assert.equal(head.children.length, 1);
  connection.disconnect(); assert.equal(node.textContent, '.server{}'); assert.equal(head.children.length, 1);
  assert.equal(connectStylesheet({ element, scopeId: 'preview', style: node, maxCssCodeUnits: 1 }).error.code, 'dom.stylesheet-resource-limit');
  for (const options of [{ scopeId: 'other' }, { nonce: 'wrong' }, { element: fixture().element }]) {
    assert.equal(connectStylesheet({ element, scopeId: 'preview', nonce: 'request', style: node, ...options }).ok, false);
    assert.equal(node.textContent, '.server{}');
  }
});
test('external writers retain their output and interrupted application cannot leak a new node', () => {
  const { head, element, Style } = fixture();
  const connection = connectStylesheet({ element, scopeId: 'preview' }).value;
  connection.apply('.owned{}'); const node = head.children[0]; node.textContent = '.external{}';
  assert.equal(connection.apply('.owned{}').error.code, 'dom.stylesheet-unavailable');
  connection.disconnect(); assert.equal(node.textContent, '.external{}'); assert.equal(head.children.length, 1);
  head.removeChild(node);
  const interrupted = connectStylesheet({ element, scopeId: 'preview' }).value;
  head.onAppend = () => interrupted.disconnect();
  assert.equal(interrupted.apply('.next{}').error.code, 'dom.stylesheet-disposed');
  assert.equal(head.children.length, 0); head.onAppend = undefined;
  const borrowed = new Style(); borrowed.setAttribute('data-sectile-style-scope', 'preview'); borrowed.textContent = '.server{}'; head.appendChild(borrowed);
  const lease = connectStylesheet({ element, scopeId: 'preview', style: borrowed }).value;
  let triggered = false;
  borrowed.onWrite = () => { if (!triggered) { triggered = true; lease.disconnect(); } };
  assert.equal(lease.apply('.next{}').error.code, 'dom.stylesheet-disposed');
  assert.equal(borrowed.textContent, '.server{}'); assert.equal(head.children.length, 1);
});
test('stylesheet effects reject reentry and retain prior output on failed writes or insertion', () => {
  const { head, element } = fixture();
  const connection = connectStylesheet({ element, scopeId: 'preview' }).value;
  connection.apply('.before{}'); const node = head.children[0]; let reentry;
  node.onWrite = value => { if (value === '.after{}') { reentry = connection.apply('.nested{}'); throw Error('write'); } };
  assert.equal(connection.apply('.after{}').error.code, 'dom.stylesheet-unavailable');
  assert.equal(reentry.error.code, 'dom.stylesheet-reentrant');
  assert.equal(node.textContent, '.before{}');
  node.onWrite = undefined; connection.disconnect();
  const failed = connectStylesheet({ element, scopeId: 'preview' }).value;
  head.onAppend = () => { throw Error('append'); };
  assert.equal(failed.apply('.next{}').ok, false);
  assert.equal(head.children.length, 0);
  head.onAppend = undefined; assert.equal(failed.apply('.retry{}').ok, true);
  failed.disconnect(); assert.equal(head.children.length, 0);
});
test('disposal during a stylesheet read cannot admit success or overwrite restored SSR output', () => {
  for (const phase of ['ownership', 'rollback']) {
    const { head, element, Style } = fixture();
    const node = new Style(); node.setAttribute('data-sectile-style-scope', 'preview');
    node.textContent = '.server{}'; head.appendChild(node);
    const connection = connectStylesheet({ element, scopeId: 'preview', style: node }).value;
    assert.equal(connection.apply('.before{}').ok, true);
    let reads = 0;
    node.onRead = () => {
      if (++reads !== (phase === 'ownership' ? 1 : 2)) return;
      node.onRead = undefined;
      // The failed setter has restored the accepted value before ownership cleanup.
      if (phase === 'rollback') node.text = '.before{}';
      connection.disconnect();
    };
    node.onWrite = value => { if (value === '.after{}') throw Error('write'); };
    const result = connection.apply(phase === 'ownership' ? '.before{}' : '.after{}');
    assert.equal(result.ok, false, phase);
    assert.equal(result.error.code, 'dom.stylesheet-disposed', phase);
    assert.equal(node.textContent, '.server{}', phase);
    assert.equal(head.children.length, 1);
    const writes = node.writes;
    connection.disconnect();
    assert.equal(connection.apply('.later{}').error.code, 'dom.stylesheet-disposed');
    assert.equal(node.writes, writes);
  }
});
