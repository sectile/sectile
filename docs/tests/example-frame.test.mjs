import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../.vitepress/theme/components/ExampleFrame.vue', import.meta.url), 'utf8');

test('View and Code use the public Sectile Vue Tabs composition', () => {
  assert.doesNotMatch(source, /v-show=/);
  assert.match(source, /from '@sectile\/vue\/tabs'/u);
  assert.match(source, /<TabsRoot v-model="mode" :items="modes"/u);
  assert.match(source, /<TabsList class="sectile-example__tabs"/u);
  assert.match(source, /<TabsTrigger[\s\S]*?value="view"/u);
  assert.match(source, /<TabsTrigger[\s\S]*?value="code"/u);
  assert.match(source, /<TabsContent[\s\S]*?value="view"/u);
  assert.match(source, /<TabsContent[\s\S]*?value="code"/u);
});

test('example display delegates tab semantics and keyboard movement to Sectile', () => {
  assert.doesNotMatch(source, /role="tab"|role="tablist"|role="tabpanel"/u);
  assert.doesNotMatch(source, /handleTabKeydown|activateMode|tabID|panelID/u);
});

test('missing example source is a development error, never user-facing placeholder content', () => {
  assert.doesNotMatch(source, /No example is available for this environment yet\./);
  assert.doesNotMatch(source, /이 환경에서 사용할 수 있는 예시가 아직 없습니다\./);
  assert.match(source, /throw new Error\(`Missing \$\{host\.value\} example source`\)/);
});

test('code tabs delegate formatting and syntax highlighting to one shared renderer', () => {
  assert.match(source, /HighlightedCode/);
  assert.doesNotMatch(source, /codeToHtml|let request = 0/u);
});
