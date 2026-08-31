import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const docsRoot = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, docsRoot), 'utf8');
const guideNames = [
  'chart.md',
  'chart/model.md',
  'chart/projection.md',
  'chart/interaction.md',
  'chart/dom.md',
  'chart/vue.md',
  'chart/performance.md',
];

test('Chart documentation is task-oriented and visual in both locales', async () => {
  const [english, korean, config] = await Promise.all([
    Promise.all(guideNames.map((name) => read(`packages/${name}`))),
    Promise.all(guideNames.map((name) => read(`ko/packages/${name}`))),
    read('.vitepress/config.ts'),
  ]);

  for (const source of [english[0], korean[0]]) {
    assert.match(source, /<ChartPackageExample \/>/u);
    assert.match(source, /@sectile\/chart/u);
  }
  assert.match(english[0], /needed only when you import the chart entry points/iu);
  assert.match(korean[0], /차트 진입점을 가져올 때만 .*필요/u);
  for (const kind of ['line', 'scatter', 'bar', 'heatmap', 'pie', 'donut']) {
    assert.match(english[0], new RegExp(`\\b${kind}\\b`, 'iu'));
  }
  for (const name of ['선', '산점도', '막대', '히트맵', '파이', '도넛']) {
    assert.match(korean[0], new RegExp(name, 'u'));
  }

  for (const index of [2, 3, 4, 5]) {
    assert.match(english[index], /<ChartPackageExample/u);
    assert.match(korean[index], /<ChartPackageExample/u);
  }

  for (const source of [...english, ...korean]) {
    assert.doesNotMatch(source, /Morton|bounding-volume hierarchy|packed typed arrays?|verification fixture|repository close|source maps?|consumer bundles?/iu);
    assert.doesNotMatch(source, /모턴|경계 볼륨 계층|패킹된 타입 배열|검증 fixture|저장소 close|소스 맵|소비자 번들/iu);
  }

  for (const route of guideNames.map((name) => name.replace(/\.md$/u, ''))) {
    assert.match(config, new RegExp(`/packages/${route}`, 'u'));
    assert.match(config, new RegExp(`/ko/packages/${route}`, 'u'));
  }
});

test('Chart examples use public APIs and cover every built-in profile', async () => {
  const [component, sources, theme, packageJSON, englishVue, koreanVue] = await Promise.all([
    read('.vitepress/theme/components/ChartPackageExample.vue'),
    read('.vitepress/theme/chart-example-code.ts'),
    read('.vitepress/theme/index.ts'),
    read('package.json').then(JSON.parse),
    read('packages/chart/vue.md'),
    read('ko/packages/chart/vue.md'),
  ]);

  assert.match(theme, /ChartPackageExample/u);
  assert.equal(packageJSON.dependencies['@sectile/chart'], 'workspace:*');
  assert.match(component, /@sectile\/vue\/chart/u);
  assert.match(component, /import \{[\s\S]*ChartRadial[\s\S]*\} from '@sectile\/vue\/chart'/u);
  assert.match(sources, /@sectile\/chart\/controller/u);
  assert.match(sources, /@sectile\/dom\/chart/u);
  for (const kind of ['Line', 'Scatter', 'Bar', 'Heatmap', 'Pie', 'Donut']) {
    assert.match(component, new RegExp(`Chart${kind}`, 'u'));
    assert.match(sources, new RegExp(`Chart${kind}|kind === '${kind.toLowerCase()}'`, 'u'));
  }
  for (const source of [component, sources]) {
    assert.doesNotMatch(source, /\/internal\/|\.verification-dist|verification\/chart/u);
  }
  assert.match(component, /getAccessibleDatumLabel/u);
  assert.match(sources, /getAccessibleDatumLabel/u);
  assert.match(sources, /instanceof HTMLElement/u);
  assert.match(sources, /chart\.disconnect\(\)[\s\S]*controller\.dispose\(\)/u);
  assert.doesNotMatch(component, /host:\s*'vue'/u);
  assert.match(englishVue, /host="vue"/u);
  assert.match(koreanVue, /host="vue"/u);
  assert.match(component, /prefers-reduced-motion/u);
  assert.match(sources, /vue: vueSource/u);
  assert.match(sources, /dom: domSource/u);
});
