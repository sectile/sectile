import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';

const docsRoot = resolve(import.meta.dirname, '..');

const packageGuides = [
  {
    path: 'packages/dom.md',
    headings: [
      'Connect an existing element',
      'Connection contract',
      'State ownership',
      'Controllers and attribute projection',
      'Native browser behavior',
      'Floating surfaces',
      'Styling hooks',
      'Factory failures',
    ],
  },
  {
    path: 'packages/vue.md',
    headings: [
      'Basic usage',
      'Controlled and uncontrolled state',
      'Render ownership',
      'Slot state',
      'Forms and native fields',
      'Styling boundaries',
      'DOM semantics and lifecycle',
      'Explore components',
    ],
  },
  {
    path: 'ko/packages/dom.md',
    headings: [
      '기존 요소에 연결하기',
      '연결 객체 규약',
      '상태 소유권',
      '컨트롤러와 속성 반영',
      '브라우저 기본 동작',
      '떠 있는 화면',
      '스타일 선택자',
      '생성 실패 처리',
    ],
  },
  {
    path: 'ko/packages/vue.md',
    headings: [
      '기본 사용법',
      '제어 상태와 비제어 상태',
      '렌더링 소유권',
      '슬롯 상태',
      '폼과 기본 입력 요소',
      '스타일 경계',
      'DOM 의미 체계와 수명 주기',
      '컴포넌트 살펴보기',
    ],
  },
];

for (const guide of packageGuides) {
  test(`${guide.path} documents the complete public package workflow`, async () => {
    const source = await readFile(resolve(docsRoot, guide.path), 'utf8');

    assert.match(source, /pnpm add @sectile\/(?:dom|vue)/u);
    for (const heading of guide.headings) {
      assert.match(source, new RegExp(`^## ${escapeRegExp(heading)}$`, 'mu'));
    }
  });
}

test('Vue package docs do not expose temporary publication status', async () => {
  const paths = [
    'packages/index.md',
    'packages/vue.md',
    'ko/packages/index.md',
    'ko/packages/vue.md',
  ];
  const source = (await Promise.all(
    paths.map((path) => readFile(resolve(docsRoot, path), 'utf8')),
  )).join('\n');

  assert.doesNotMatch(source, /not published|workspace preview|published yet|미출시|아직 공개|개발 중|작업 공간 사용법/iu);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
