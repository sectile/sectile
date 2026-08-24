import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const example = await readFile(
  new URL('../.vitepress/theme/components/CheckedControlCase.vue', import.meta.url),
  'utf8',
);
const exampleStyles = await readFile(
  new URL('../.vitepress/theme/component-examples.css', import.meta.url),
  'utf8',
);

test('switch communicates state through the control instead of redundant status text', () => {
  assert.doesNotMatch(example, /class="switch-value"/u);
  assert.doesNotMatch(example, /value \? 'On' : 'Off'/u);
  assert.match(exampleStyles, /\.switch-control\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto;/su);
  assert.doesNotMatch(exampleStyles, /\.switch-value/u);
});

test('generated switch pages use task labels instead of state labels', async () => {
  const english = await readFile(new URL('../components/switch.md', import.meta.url), 'utf8');
  const korean = await readFile(new URL('../ko/components/switch.md', import.meta.url), 'utf8');

  assert.match(english, /### Notifications/u);
  assert.doesNotMatch(english, /### Off|title="Off"|\bon or off\b/u);
  assert.match(korean, /### 알림/u);
  assert.doesNotMatch(korean, /### 꺼짐|title="꺼짐"|켜거나 끕/u);
});
