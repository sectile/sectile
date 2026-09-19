// CNT-01 CNT-07
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const schema = JSON.parse(
  readFileSync(
    new URL('./fixtures/portable-schema.json', import.meta.url),
    'utf8',
  ),
);
const documentValue = JSON.parse(
  readFileSync(
    new URL('./fixtures/portable-document.json', import.meta.url),
    'utf8',
  ),
);

test('standalone consumer reads Portable Content without Sectile runtime imports', () => {
  assert.equal(documentValue.formatVersion, 1);
  assert.deepEqual(documentValue.schema, {
    id: 'demo/portable',
    version: 1,
  });

  const components = new Map(
    schema.components.map((component) => [
      component.id,
      component,
    ]),
  );
  validatePortableTree(documentValue.root.children, components);

  const html = renderBlocks(documentValue.root.children, components);
  assert.match(html, /<h1>Portable <a href="\/content">Content<\/a><\/h1>/u);
  assert.match(
    html,
    /data-component="demo\/card"[\s\S]*data-slot="title"[\s\S]*Card title[\s\S]*data-slot="body"[\s\S]*Card body/u,
  );
  assert.equal(
    html.indexOf('data-slot="title"') < html.indexOf('data-slot="body"'),
    true,
  );

  const text = projectText(documentValue.root.children);
  assert.equal(
    text,
    [
      'Portable Content',
      'Renderer independent.',
      'Card title',
      'Card body',
    ].join('\n'),
  );
});

test('portable document round-trips as ordinary JSON data', () => {
  const encoded = JSON.stringify(documentValue);
  const decoded = JSON.parse(encoded);
  assert.deepEqual(decoded, documentValue);
  assert.equal(hasForbiddenRuntimeKey(decoded), false);
});

function validatePortableTree(nodes, components) {
  for (const node of nodes) {
    if (node.type === 'component') {
      const descriptor = components.get(node.component);
      assert.notEqual(
        descriptor,
        undefined,
        `missing descriptor for ${node.component}`,
      );
      assert.equal(node.kind, descriptor.kind);
      assert.equal(
        node.componentVersion,
        descriptor.componentVersion,
      );
      assert.equal(node.slots.length, descriptor.slots.length);

      for (let index = 0; index < node.slots.length; index += 1) {
        const slot = node.slots[index];
        const expected = descriptor.slots[index];
        assert.equal(slot.name, expected.name);
        assert.equal(slot.kind, expected.kind);
        validatePortableTree(slot.content, components);
      }
      continue;
    }

    if (node.children !== undefined) {
      validatePortableTree(node.children, components);
    }
  }
}

function renderBlocks(nodes, components) {
  return nodes.map((node) => {
    if (node.type === 'paragraph') {
      return `<p>${renderInline(node.children, components)}</p>`;
    }
    if (node.type === 'heading') {
      return `<h${node.level}>${renderInline(node.children, components)}</h${node.level}>`;
    }
    if (node.type === 'blockquote') {
      return `<blockquote>${renderBlocks(node.children, components)}</blockquote>`;
    }
    if (node.type === 'list') {
      const tag = node.ordered ? 'ol' : 'ul';
      return `<${tag}>${renderBlocks(node.children, components)}</${tag}>`;
    }
    if (node.type === 'list-item') {
      return `<li>${renderBlocks(node.children, components)}</li>`;
    }
    if (node.type === 'code-block') {
      return `<pre><code>${escapeHTML(node.text)}</code></pre>`;
    }
    if (node.type === 'component') {
      const descriptor = components.get(node.component);
      assert.notEqual(descriptor, undefined);
      return `<section data-component="${escapeHTML(node.component)}">${node.slots.map(
        (slot) => `<div data-slot="${escapeHTML(slot.name)}">${slot.kind === 'block'
          ? renderBlocks(slot.content, components)
          : renderInline(slot.content, components)}</div>`,
      ).join('')}</section>`;
    }
    throw new TypeError(`Unsupported block node: ${node.type}`);
  }).join('');
}

function renderInline(nodes, components) {
  return nodes.map((node) => {
    if (node.type === 'text') {
      let value = escapeHTML(node.text);
      for (const mark of node.marks) {
        if (mark.type === 'strong') value = `<strong>${value}</strong>`;
        else if (mark.type === 'emphasis') value = `<em>${value}</em>`;
        else if (mark.type === 'code') value = `<code>${value}</code>`;
        else if (mark.type === 'link') {
          value = `<a href="${escapeHTML(mark.href)}">${value}</a>`;
        }
      }
      return value;
    }
    if (node.type === 'hard-break') return '<br>';
    if (node.type === 'component') {
      const descriptor = components.get(node.component);
      assert.notEqual(descriptor, undefined);
      return `<span data-component="${escapeHTML(node.component)}"></span>`;
    }
    throw new TypeError(`Unsupported inline node: ${node.type}`);
  }).join('');
}

function projectText(nodes) {
  return projectBlocks(nodes).replace(/\n+/gu, '\n');
}

function projectBlocks(nodes) {
  const parts = [];
  for (const node of nodes) {
    if (node.type === 'paragraph' || node.type === 'heading') {
      parts.push(projectInline(node.children));
      continue;
    }
    if (node.type === 'code-block') {
      parts.push(node.text);
      continue;
    }
    if (node.type === 'blockquote' || node.type === 'list-item') {
      parts.push(projectBlocks(node.children));
      continue;
    }
    if (node.type === 'list') {
      parts.push(projectBlocks(node.children));
      continue;
    }
    if (node.type === 'component') {
      const slotParts = [];
      for (const slot of node.slots) {
        const projected = slot.kind === 'block'
          ? projectBlocks(slot.content)
          : projectInline(slot.content);
        if (projected.length > 0) slotParts.push(projected);
      }
      parts.push(slotParts.join('\n'));
      continue;
    }
    throw new TypeError(`Unsupported block node: ${node.type}`);
  }
  return parts.filter((part) => part.length > 0).join('\n');
}

function projectInline(nodes) {
  let output = '';
  for (const node of nodes) {
    if (node.type === 'text') output += node.text;
    else if (node.type === 'hard-break') output += '\n';
    else if (node.type === 'component') {
      // Inline atoms are opaque unless an application-specific projection exists.
    } else {
      throw new TypeError(`Unsupported inline node: ${node.type}`);
    }
  }
  return output;
}

function hasForbiddenRuntimeKey(value) {
  if (Array.isArray(value)) {
    return value.some(hasForbiddenRuntimeKey);
  }
  if (typeof value !== 'object' || value === null) return false;

  for (const [key, child] of Object.entries(value)) {
    if (
      key === 'style'
      || key === 'className'
      || key === 'events'
      || key === 'actions'
      || key === 'bindings'
      || key === 'callback'
    ) {
      return true;
    }
    if (hasForbiddenRuntimeKey(child)) return true;
  }
  return false;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
