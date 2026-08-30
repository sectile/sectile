import { defineConfig, type DefaultTheme } from 'vitepress';
import catalog from '../data/components.json' with { type: 'json' };
import { componentSections } from '../data/component-sections.js';
import { vueTemplateFencePlugin } from './markdown/vue-template-fences.mjs';
import { virtualBenchmarkRunner } from './virtual-benchmark-runner.js';

const base = '/sectile/';
const markdownHighlightCache = new Map<string, string>();

const title = (value: string): string => value
  .split('-')
  .map((part) => part.length === 0 ? part : `${part[0]?.toUpperCase()}${part.slice(1)}`)
  .join(' ');

const sidebarComponentIds = componentSections.flatMap((section) => section.componentIds);
const catalogComponentIds = catalog.components.map((component) => component.id);
const sidebarComponentIdSet = new Set<string>(sidebarComponentIds);
const catalogComponentIdSet = new Set(catalogComponentIds);
const duplicateSidebarIds = sidebarComponentIds.filter((id, index) => sidebarComponentIds.indexOf(id) !== index);
const missingSidebarIds = catalogComponentIds.filter((id) => !sidebarComponentIdSet.has(id));
const unknownSidebarIds = sidebarComponentIds.filter((id) => !catalogComponentIdSet.has(id));

if (duplicateSidebarIds.length > 0 || missingSidebarIds.length > 0 || unknownSidebarIds.length > 0) {
  throw new Error(`Invalid component sidebar: duplicates=${duplicateSidebarIds.join(',')} missing=${missingSidebarIds.join(',')} unknown=${unknownSidebarIds.join(',')}`);
}

const buildComponentSidebar = (locale: 'en' | 'ko'): DefaultTheme.SidebarItem[] => {
  const linkPrefix = locale === 'ko' ? '/ko/components' : '/components';

  return componentSections.map((section) => ({
    text: locale === 'ko' ? section.koText : section.text,
    items: section.componentIds.map((id) => ({
      text: title(id),
      link: `${linkPrefix}/${id}`,
    })),
  }));
};

const componentSidebar = buildComponentSidebar('en');
const koComponentSidebar = buildComponentSidebar('ko');

const packageIds = ['core', 'form', 'temporal', 'virtual', 'tabular', 'chart', 'dom', 'terminal', 'vue'] as const;

const buildPackageNav = (locale: 'en' | 'ko'): DefaultTheme.NavItem => {
  const linkPrefix = locale === 'ko' ? '/ko/packages' : '/packages';

  return {
    text: locale === 'ko' ? '패키지' : 'Packages',
    activeMatch: `^${linkPrefix}/`,
    items: [
      { text: locale === 'ko' ? '패키지 지도' : 'Package map', link: `${linkPrefix}/` },
      ...packageIds.map((id) => ({
        text: `@sectile/${id}`,
        link: `${linkPrefix}/${id}`,
      })),
    ],
  };
};

const packageNav = buildPackageNav('en');
const koPackageNav = buildPackageNav('ko');

const formVueSidebar: DefaultTheme.SidebarItem[] = [
  { text: 'Form overview', link: '/packages/form' },
  {
    text: '@sectile/form · Vue',
    collapsed: false,
    items: [
      { text: 'Vue forms', link: '/packages/form/vue/' },
      { text: 'Vue API reference', link: '/packages/form/vue/api' },
      { text: 'Fields and controls', link: '/packages/form/vue/fields' },
      { text: 'Validation and errors', link: '/packages/form/vue/validation' },
      { text: 'Submission and reinitialization', link: '/packages/form/vue/submission' },
      { text: 'Custom controls', link: '/packages/form/vue/custom-controls' },
      { text: 'SSR and hydration', link: '/packages/form/vue/ssr' },
    ],
  },
];

const formDOMSidebar: DefaultTheme.SidebarItem[] = [
  { text: 'Form overview', link: '/packages/form' },
  {
    text: '@sectile/form · DOM',
    collapsed: false,
    items: [
      { text: 'DOM forms', link: '/packages/form/dom/' },
      { text: 'DOM API reference', link: '/packages/form/dom/api' },
    ],
  },
];

const koFormVueSidebar: DefaultTheme.SidebarItem[] = [
  { text: 'Form 개요', link: '/ko/packages/form' },
  {
    text: '@sectile/form · Vue',
    collapsed: false,
    items: [
      { text: 'Vue 폼', link: '/ko/packages/form/vue/' },
      { text: 'Vue API 레퍼런스', link: '/ko/packages/form/vue/api' },
      { text: '필드와 컨트롤', link: '/ko/packages/form/vue/fields' },
      { text: '검증과 오류', link: '/ko/packages/form/vue/validation' },
      { text: '제출과 값 기준 관리', link: '/ko/packages/form/vue/submission' },
      { text: '사용자 정의 컨트롤', link: '/ko/packages/form/vue/custom-controls' },
      { text: 'SSR과 hydration', link: '/ko/packages/form/vue/ssr' },
    ],
  },
];

const koFormDOMSidebar: DefaultTheme.SidebarItem[] = [
  { text: 'Form 개요', link: '/ko/packages/form' },
  {
    text: '@sectile/form · DOM',
    collapsed: false,
    items: [
      { text: 'DOM 폼', link: '/ko/packages/form/dom/' },
      { text: 'DOM API 레퍼런스', link: '/ko/packages/form/dom/api' },
    ],
  },
];

const theorySidebar: DefaultTheme.SidebarItem[] = [
  { text: 'Core theory', link: '/theory/' },
  { text: 'Canonical structures', link: '/theory/structures' },
  { text: 'State and text', link: '/theory/state-and-text' },
  { text: 'Transitions', link: '/theory/transitions' },
  { text: 'Composition', link: '/theory/composition' },
  { text: 'Scope and guarantees', link: '/theory/scope' },
  { text: 'Virtual manual', link: '/packages/virtual' },
];

const koTheorySidebar: DefaultTheme.SidebarItem[] = [
  { text: '코어 이론', link: '/ko/theory/' },
  { text: '기본 구조', link: '/ko/theory/structures' },
  { text: '상태와 텍스트', link: '/ko/theory/state-and-text' },
  { text: '상태 전이', link: '/ko/theory/transitions' },
  { text: '조합 원리', link: '/ko/theory/composition' },
  { text: '보장 범위', link: '/ko/theory/scope' },
  { text: '가상화 사용 안내', link: '/ko/packages/virtual' },
];

const packageSidebar: DefaultTheme.SidebarItem[] = [
  { text: 'Package map', link: '/packages/' },
  {
    text: '@sectile/core',
    collapsed: false,
    items: [
      { text: 'Overview', link: '/packages/core' },
      { text: 'Foundations', link: '/packages/core/foundations' },
      { text: 'Structures and state', link: '/packages/core/structures' },
      { text: 'Transitions and composition', link: '/packages/core/transitions' },
    ],
  },
  {
    text: '@sectile/form',
    collapsed: false,
    items: [
      { text: 'Overview', link: '/packages/form' },
      { text: 'Vue forms', link: '/packages/form/vue/' },
      { text: 'DOM forms', link: '/packages/form/dom/' },
      { text: 'Choose an API reference', link: '/packages/form/api' },
    ],
  },
  {
    text: '@sectile/temporal',
    collapsed: false,
    items: [
      { text: 'Overview', link: '/packages/temporal' },
      { text: 'Values and fields', link: '/packages/temporal/values' },
      { text: 'Calendars and pickers', link: '/packages/temporal/calendars' },
      { text: 'Deterministic rendering', link: '/packages/temporal/determinism' },
    ],
  },
  {
    text: '@sectile/virtual',
    collapsed: false,
    items: [
      { text: 'Overview', link: '/packages/virtual' },
      { text: 'Core concepts', link: '/packages/virtual/concepts' },
      { text: 'Linear lists', link: '/packages/virtual/linear' },
      { text: 'Grid, masonry, spatial', link: '/packages/virtual/layouts' },
      { text: 'Measurement and anchoring', link: '/packages/virtual/measurement' },
      { text: 'DOM connection', link: '/packages/virtual/dom' },
      { text: 'Vue connection', link: '/packages/virtual/vue' },
      { text: 'Benchmark', link: '/packages/virtual/benchmark' },
      { text: 'Benchmark lab', link: '/benchmarks/virtual' },
    ],
  },
  {
    text: '@sectile/tabular',
    collapsed: false,
    items: [
      { text: 'Overview and profiles', link: '/packages/tabular' },
      { text: 'Shared contracts', link: '/packages/tabular/contracts' },
      { text: 'Async data sources', link: '/packages/tabular/data-source' },
      { text: 'DataTable', link: '/packages/tabular/data-table' },
      { text: 'DataGrid', link: '/packages/tabular/data-grid' },
      { text: 'DataTreeGrid', link: '/packages/tabular/data-tree-grid' },
      { text: 'Vue composition', link: '/packages/tabular/vue' },
      { text: 'DOM composition', link: '/packages/tabular/dom' },
      { text: 'Optional virtualization', link: '/packages/tabular/virtual' },
    ],
  },
  {
    text: '@sectile/chart',
    collapsed: false,
    items: [
      { text: 'Overview and chart types', link: '/packages/chart' },
      { text: 'Data and scales', link: '/packages/chart/model' },
      { text: 'Drawing and hit testing', link: '/packages/chart/projection' },
      { text: 'Interaction and state', link: '/packages/chart/interaction' },
      { text: 'DOM rendering', link: '/packages/chart/dom' },
      { text: 'Vue composition', link: '/packages/chart/vue' },
      { text: 'Large datasets', link: '/packages/chart/performance' },
    ],
  },
  {
    text: 'Host adapters',
    items: [
      { text: 'DOM', link: '/packages/dom' },
      { text: 'Terminal', link: '/packages/terminal' },
      { text: 'Vue', link: '/packages/vue' },
    ],
  },
];

const koPackageSidebar: DefaultTheme.SidebarItem[] = [
  { text: '패키지 지도', link: '/ko/packages/' },
  {
    text: '@sectile/core',
    collapsed: false,
    items: [
      { text: '개요', link: '/ko/packages/core' },
      { text: '기본 계약', link: '/ko/packages/core/foundations' },
      { text: '구조와 상태', link: '/ko/packages/core/structures' },
      { text: '상태 전이와 조합', link: '/ko/packages/core/transitions' },
    ],
  },
  {
    text: '@sectile/form',
    collapsed: false,
    items: [
      { text: '개요', link: '/ko/packages/form' },
      { text: 'Vue 폼', link: '/ko/packages/form/vue/' },
      { text: 'DOM 폼', link: '/ko/packages/form/dom/' },
      { text: 'API 레퍼런스 선택', link: '/ko/packages/form/api' },
    ],
  },
  {
    text: '@sectile/temporal',
    collapsed: false,
    items: [
      { text: '개요', link: '/ko/packages/temporal' },
      { text: '값과 입력란', link: '/ko/packages/temporal/values' },
      { text: '달력과 선택기', link: '/ko/packages/temporal/calendars' },
      { text: '결정적인 화면 생성', link: '/ko/packages/temporal/determinism' },
    ],
  },
  {
    text: '@sectile/virtual',
    collapsed: false,
    items: [
      { text: '개요', link: '/ko/packages/virtual' },
      { text: '핵심 개념', link: '/ko/packages/virtual/concepts' },
      { text: '선형 목록', link: '/ko/packages/virtual/linear' },
      { text: '격자·벽돌형·자유 좌표', link: '/ko/packages/virtual/layouts' },
      { text: '측정과 위치 유지', link: '/ko/packages/virtual/measurement' },
      { text: 'DOM 연결', link: '/ko/packages/virtual/dom' },
      { text: 'Vue 연결', link: '/ko/packages/virtual/vue' },
      { text: '벤치마크', link: '/ko/packages/virtual/benchmark' },
      { text: '벤치마크 실행', link: '/ko/benchmarks/virtual' },
    ],
  },
  {
    text: '@sectile/tabular',
    collapsed: false,
    items: [
      { text: '개요와 프로필', link: '/ko/packages/tabular' },
      { text: '공통 계약과 기능', link: '/ko/packages/tabular/contracts' },
      { text: '비동기 source', link: '/ko/packages/tabular/data-source' },
      { text: 'DataTable', link: '/ko/packages/tabular/data-table' },
      { text: 'DataGrid', link: '/ko/packages/tabular/data-grid' },
      { text: 'DataTreeGrid', link: '/ko/packages/tabular/data-tree-grid' },
      { text: 'Vue 구성', link: '/ko/packages/tabular/vue' },
      { text: 'DOM 연결', link: '/ko/packages/tabular/dom' },
      { text: '선택적 가상화', link: '/ko/packages/tabular/virtual' },
    ],
  },
  {
    text: '@sectile/chart',
    collapsed: false,
    items: [
      { text: '개요와 차트 종류', link: '/ko/packages/chart' },
      { text: '데이터와 스케일', link: '/ko/packages/chart/model' },
      { text: '그리기와 hit testing', link: '/ko/packages/chart/projection' },
      { text: '상호작용과 상태', link: '/ko/packages/chart/interaction' },
      { text: 'DOM 렌더링', link: '/ko/packages/chart/dom' },
      { text: 'Vue 구성', link: '/ko/packages/chart/vue' },
      { text: '대규모 데이터', link: '/ko/packages/chart/performance' },
    ],
  },
  {
    text: '실행 환경 연결',
    items: [
      { text: '브라우저', link: '/ko/packages/dom' },
      { text: '터미널', link: '/ko/packages/terminal' },
      { text: 'Vue', link: '/ko/packages/vue' },
    ],
  },
];

const rootLocaleTheme: DefaultTheme.Config = {
  nav: [
    { text: 'How it works', link: '/guide/introduction', activeMatch: '^/guide/' },
    { text: 'Core theory', link: '/theory/' },
    { text: 'Components', link: '/components/', activeMatch: '^/components/' },
    packageNav,
    { text: 'Benchmark', link: '/benchmarks/virtual', activeMatch: '^/benchmarks/' },
  ],
  sidebar: {
    '/packages/form/vue': formVueSidebar,
    '/packages/form/dom': formDOMSidebar,
    '/guide/': [
      { text: 'Introduction', link: '/guide/introduction' },
      { text: 'Getting started', link: '/guide/getting-started' },
      { text: 'Styling', link: '/guide/styling' },
      { text: 'State ownership', link: '/guide/state-ownership' },
      { text: 'Host model', link: '/guide/host-model' },
      { text: 'Adapter authoring', link: '/guide/adapter-authoring' },
    ],
    '/components/': componentSidebar,
    '/packages/': packageSidebar,
    '/theory/': theorySidebar,
  },
  editLink: { pattern: 'https://github.com/sectile/sectile/edit/main/docs/:path', text: 'Edit this page on GitHub' },
  footer: { message: 'Released under the MIT License.', copyright: 'Copyright © 2026 Sectile contributors' },
  outline: { level: [2, 3], label: 'On this page' },
};

const koLocaleTheme: DefaultTheme.Config = {
  nav: [
    { text: '동작 방식', link: '/ko/guide/introduction', activeMatch: '^/ko/guide/' },
    { text: '코어 이론', link: '/ko/theory/' },
    { text: '컴포넌트', link: '/ko/components/', activeMatch: '^/ko/components/' },
    koPackageNav,
    { text: '벤치마크', link: '/ko/benchmarks/virtual', activeMatch: '^/ko/benchmarks/' },
  ],
  sidebar: {
    '/ko/packages/form/vue': koFormVueSidebar,
    '/ko/packages/form/dom': koFormDOMSidebar,
    '/ko/guide/': [
      { text: '소개', link: '/ko/guide/introduction' },
      { text: '시작하기', link: '/ko/guide/getting-started' },
      { text: '스타일 적용', link: '/ko/guide/styling' },
      { text: '상태 관리 방식', link: '/ko/guide/state-ownership' },
      { text: '실행 환경', link: '/ko/guide/host-model' },
      { text: 'Adapter 작성', link: '/ko/guide/adapter-authoring' },
    ],
    '/ko/components/': koComponentSidebar,
    '/ko/packages/': koPackageSidebar,
    '/ko/theory/': koTheorySidebar,
  },
  editLink: { pattern: 'https://github.com/sectile/sectile/edit/main/docs/:path', text: 'GitHub에서 이 페이지 수정' },
  footer: { message: 'MIT 라이선스로 배포합니다.', copyright: 'Copyright © 2026 Sectile contributors' },
  outline: { level: [2, 3], label: '이 페이지에서' },
  docFooter: { prev: '이전 페이지', next: '다음 페이지' },
  lastUpdated: { text: '마지막 수정' },
  sidebarMenuLabel: '문서 메뉴',
  returnToTopLabel: '맨 위로',
  langMenuLabel: '언어 선택',
  skipToContentLabel: '본문으로 이동',
};

export default defineConfig({
  title: 'Sectile',
  description: 'Renderer-neutral interaction semantics for the interfaces you need to own.',
  base,
  cleanUrls: true,
  lastUpdated: true,
  appearance: false,
  vue: {
    template: {
      compilerOptions: { comments: true },
    },
  },
  locales: {
    root: { label: 'English', lang: 'en-US' },
    ko: {
      label: '한국어',
      lang: 'ko-KR',
      link: '/ko/',
      title: 'Sectile',
      description: '화면 출력 방식과 분리된 상호작용 규칙',
      themeConfig: koLocaleTheme,
    },
  },
  srcExclude: [
    'architecture/**',
    'decisions/**',
    'engineering/**',
    'getting-started/**',
    'internals/**',
    'performance/**',
    'primitives/**',
    'references/**',
    'testing/**',
    'implementation-checklist.md',
    'roadmap.md',
  ],
  head: [
    ['link', { rel: 'icon', href: `${base}favicon.ico`, sizes: 'any' }],
    ['link', { rel: 'icon', type: 'image/png', href: `${base}favicon-32x32.png`, sizes: '32x32' }],
    ['link', { rel: 'icon', type: 'image/png', href: `${base}favicon-16x16.png`, sizes: '16x16' }],
    ['link', { rel: 'apple-touch-icon', href: `${base}apple-touch-icon.png`, sizes: '180x180' }],
    ['link', { rel: 'manifest', href: `${base}site.webmanifest` }],
    ['meta', { name: 'theme-color', content: '#0a0f1c' }],
    ['meta', { name: 'color-scheme', content: 'dark light' }],
  ],
  markdown: {
    theme: { dark: 'github-dark-default', light: 'github-light-default' },
    lineNumbers: true,
    config: vueTemplateFencePlugin,
    shikiSetup(highlighter) {
      const codeToHtml = highlighter.codeToHtml.bind(highlighter);
      highlighter.codeToHtml = (code, options) => {
        // VitePress fixes the transformer set; fence attributes remain part of meta.
        const { transformers: _transformers, ...stableOptions } = options;
        const key = `${code}\0${JSON.stringify(stableOptions)}`;
        const cached = markdownHighlightCache.get(key);
        if (cached !== undefined) return cached;

        const highlighted = codeToHtml(code, options);
        markdownHighlightCache.set(key, highlighted);
        return highlighted;
      };
    },
  },
  vite: {
    plugins: [virtualBenchmarkRunner()],
    ssr: {
      noExternal: ['@xterm/xterm', '@xterm/addon-fit'],
    },
  },
  themeConfig: {
    logo: { src: '/logo.png', alt: '' },
    search: {
      provider: 'local',
      options: {
        locales: {
          ko: {
            translations: {
              button: { buttonText: '검색', buttonAriaLabel: '문서 검색' },
              modal: {
                displayDetails: '자세히 보기',
                resetButtonTitle: '검색어 지우기',
                backButtonTitle: '검색 닫기',
                noResultsText: '검색 결과가 없습니다.',
                footer: {
                  selectText: '선택',
                  selectKeyAriaLabel: 'Enter',
                  navigateText: '이동',
                  navigateUpKeyAriaLabel: '위쪽 화살표',
                  navigateDownKeyAriaLabel: '아래쪽 화살표',
                  closeText: '닫기',
                  closeKeyAriaLabel: 'Escape',
                },
              },
            },
          },
        },
      },
    },
    ...rootLocaleTheme,
  },
});
