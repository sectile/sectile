import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import catalog from '../data/components.json' with { type: 'json' };
import { coreExampleCodeFor } from '../.vitepress/theme/core-example-code.ts';

const docsDirectory = fileURLToPath(new URL('..', import.meta.url));

function scenariosFor(component) {
  return [...new Set(Object.values(component.scenarios ?? {}).flat())];
}

function directCreationResultAccess(source) {
  const pattern = /\bcreate[A-Z][A-Za-z0-9_]*\(/gu;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    let cursor = match.index + match[0].length;
    let depth = 1;
    let quote = null;
    let escaped = false;

    while (cursor < source.length && depth > 0) {
      const character = source[cursor];
      cursor += 1;

      if (quote !== null) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === quote) quote = null;
      } else if (character === "'" || character === '"' || character === '`') {
        quote = character;
      } else if (character === '(') {
        depth += 1;
      } else if (character === ')') {
        depth -= 1;
      }
    }

    if (source.startsWith('.value', cursor)) {
      return source.slice(match.index, cursor + '.value'.length);
    }
  }

  return null;
}

test('every catalog scenario has a direct, component-specific Core example', () => {
  for (const component of catalog.components) {
    for (const scenario of scenariosFor(component)) {
      const source = coreExampleCodeFor(component.id, scenario);
      assert.match(source, new RegExp(`@sectile/core/${component.id}`), `${component.id}/${scenario}`);
      assert.equal(directCreationResultAccess(source), null, `${component.id}/${scenario}`);
      assert.doesNotMatch(source, /\bunwrap\b/u, `${component.id}/${scenario}`);
      assert.doesNotMatch(source, /import \* as/u, `${component.id}/${scenario}`);
      assert.doesNotMatch(source, /const operations\b/u, `${component.id}/${scenario}`);
      assert.doesNotMatch(source, /Core exposes immutable state constructors/u, `${component.id}/${scenario}`);
      for (const [index, line] of source.split('\n').entries()) {
        assert.ok(
          line.length <= 88,
          `${component.id}/${scenario}:${index + 1} is ${line.length} characters\n${line}`,
        );
      }
    }
  }
});

test('every generated Core example executes against the public package', { timeout: 30_000 }, () => {
  for (const component of catalog.components) {
    for (const scenario of scenariosFor(component)) {
      const source = coreExampleCodeFor(component.id, scenario);
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
        cwd: docsDirectory,
        encoding: 'utf8',
        timeout: 5_000,
      });
      assert.equal(
        result.status,
        0,
        `${component.id}/${scenario}\n${result.stderr || result.stdout}`,
      );
    }
  }
});

test('policy and interaction examples expose the behavior named by their scenario', () => {
  assert.match(coreExampleCodeFor('accordion', 'multiple'), /expansion: 'multiple'/u);
  assert.match(coreExampleCodeFor('accordion', 'required'), /collapsible: false/u);
  assert.match(coreExampleCodeFor('calendar', 'disabled-weekends'), /eligible:/u);
  assert.match(coreExampleCodeFor('combobox', 'contains'), /\.includes\(/u);
  assert.match(coreExampleCodeFor('date-field', 'bounded'), /min: date\(/u);
  assert.match(coreExampleCodeFor('feed', 'load-after'), /request-after/u);
  assert.match(coreExampleCodeFor('grid', 'editable'), /start-edit/u);
  assert.match(coreExampleCodeFor('quantity-field', 'temperature'), /kelvin/u);
  assert.match(coreExampleCodeFor('quantity-field', 'temperature'), /celsius/u);
  assert.match(coreExampleCodeFor('time-field', 'stepped'), /minute: 15/u);
  assert.match(coreExampleCodeFor('tree-view', 'multiple'), /toggle-select/u);
});
