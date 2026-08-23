import { defineConfig, type DefaultTheme } from 'vitepress';
import catalog from '../data/components.json' with { type: 'json' };

const title = (value: string): string => value
  .split('-')
  .map((part) => part.length === 0 ? part : `${part[0]?.toUpperCase()}${part.slice(1)}`)
  .join(' ');

const familyOrder = [
  'checked',
  'editing',
  'linear-choice',
  'range',
  'date-time',
  'collection',
  'menu',
  'popup',
  'expansion',
  'navigation',
  'paged-navigation',
  'linear-action',
  'tree-choice',
  'feedback',
];

const componentSidebar: DefaultTheme.SidebarItem[] = familyOrder
  .map((family) => ({
    text: title(family),
    collapsed: true,
    items: catalog.components
      .filter((component) => component.family === family)
      .map((component) => ({ text: title(component.id), link: `/components/${component.id}` })),
  }))
  .filter((section) => section.items.length > 0);

const koFamilyLabels: Readonly<Record<string, string>> = Object.freeze({
  checked: '선택 상태',
  editing: '입력과 편집',
  'linear-choice': '목록 선택',
  range: '범위와 수치',
  'date-time': '날짜와 시간',
  collection: '모음과 탐색',
  menu: '메뉴',
  popup: '떠 있는 영역',
  expansion: '펼침과 접힘',
  navigation: '이동',
  'paged-navigation': '페이지 이동',
  'linear-action': '작업 모음',
  'tree-choice': '계층 선택',
  feedback: '알림과 피드백',
});

const koComponentNames: Readonly<Record<string, string>> = Object.freeze({
  accordion: '아코디언',
  'alert-dialog': '확인 대화상자',
  calendar: '달력',
  carousel: '회전 목록',
  'cascade-select': '단계별 선택',
  checkbox: '체크박스',
  'checkbox-group': '체크박스 묶음',
  'color-picker': '색상 선택기',
  combobox: '콤보박스',
  'date-field': '날짜 입력',
  'date-picker': '날짜 선택기',
  'date-range-field': '날짜 범위 입력',
  'date-range-picker': '날짜 범위 선택기',
  'date-time-field': '날짜·시간 입력',
  'date-time-picker': '날짜·시간 선택기',
  'date-time-range-picker': '날짜·시간 범위 선택기',
  dialog: '대화상자',
  disclosure: '상세 내용 펼치기',
  editable: '인라인 편집',
  feed: '피드',
  grid: '격자',
  listbox: '목록 상자',
  menu: '메뉴',
  'menu-button': '메뉴 버튼',
  menubar: '메뉴 막대',
  'multi-thumb-slider': '다중 슬라이더',
  'navigation-menu': '이동 메뉴',
  'number-field': '숫자 입력',
  pagination: '페이지 나누기',
  'pin-input': '인증 번호 입력',
  popover: '팝오버',
  'quantity-field': '수량 입력',
  'radio-group': '라디오 버튼 묶음',
  rating: '평점',
  select: '선택 상자',
  slider: '슬라이더',
  'spin-button': '증감 입력',
  stepper: '단계 진행',
  switch: '스위치',
  tabs: '탭',
  'tags-input': '태그 입력',
  text: '텍스트 입력',
  'time-field': '시간 입력',
  'time-range-field': '시간 범위 입력',
  timer: '타이머',
  toast: '토스트 알림',
  'toggle-button': '토글 버튼',
  'toggle-group': '토글 버튼 묶음',
  toolbar: '도구 막대',
  tooltip: '도움말',
  'tree-grid': '계층 격자',
  'tree-view': '계층 보기',
  'window-splitter': '영역 크기 조절',
});

const koComponentSidebar: DefaultTheme.SidebarItem[] = familyOrder
  .map((family) => ({
    text: koFamilyLabels[family] ?? family,
    collapsed: true,
    items: catalog.components
      .filter((component) => component.family === family)
      .map((component) => ({ text: koComponentNames[component.id] ?? title(component.id), link: `/ko/components/${component.id}` })),
  }))
  .filter((section) => section.items.length > 0);

const theorySidebar: DefaultTheme.SidebarItem[] = [
  { text: 'Overview', link: '/theory/' },
  { text: 'Canonical structures', link: '/theory/structures' },
  { text: 'State and text', link: '/theory/state-and-text' },
  { text: 'Transitions', link: '/theory/transitions' },
  { text: 'Composition', link: '/theory/composition' },
  { text: 'Scope and guarantees', link: '/theory/scope' },
];

const koTheorySidebar: DefaultTheme.SidebarItem[] = [
  { text: '개요', link: '/ko/theory/' },
  { text: '기본 구조', link: '/ko/theory/structures' },
  { text: '상태와 텍스트', link: '/ko/theory/state-and-text' },
  { text: '상태 전이', link: '/ko/theory/transitions' },
  { text: '조합 원리', link: '/ko/theory/composition' },
  { text: '보장 범위', link: '/ko/theory/scope' },
];

const rootLocaleTheme: DefaultTheme.Config = {
  nav: [
    { text: 'Guide', link: '/guide/getting-started' },
    { text: 'Theory', link: '/theory/' },
    { text: 'Components', link: '/components/' },
    { text: 'Packages', link: '/packages/' },
  ],
  sidebar: {
    '/guide/': [
      { text: 'Introduction', link: '/guide/introduction' },
      { text: 'Getting started', link: '/guide/getting-started' },
      { text: 'Styling', link: '/guide/styling' },
      { text: 'State ownership', link: '/guide/state-ownership' },
      { text: 'Host model', link: '/guide/host-model' },
    ],
    '/components/': [
      { text: 'Component catalog', link: '/components/' },
      ...componentSidebar,
    ],
    '/packages/': [
      { text: 'Packages', link: '/packages/' },
      { text: 'Core', link: '/packages/core' },
      { text: 'DOM', link: '/packages/dom' },
      { text: 'Terminal', link: '/packages/terminal' },
      { text: 'Vue', link: '/packages/vue' },
    ],
    '/playground/': [
      { text: 'Playgrounds', link: '/playground/terminal/' },
      { text: 'Actual Bash', link: '/playground/terminal/' },
    ],
    '/theory/': theorySidebar,
  },
  editLink: { pattern: 'https://github.com/sectile/sectile/edit/main/docs/:path', text: 'Edit this page on GitHub' },
  footer: { message: 'Released under the MIT License.', copyright: 'Copyright © 2026 Sectile contributors' },
  outline: { level: [2, 3], label: 'On this page' },
};

const koLocaleTheme: DefaultTheme.Config = {
  nav: [
    { text: '사용 안내', link: '/ko/guide/getting-started' },
    { text: '이론', link: '/ko/theory/' },
    { text: '컴포넌트', link: '/ko/components/' },
    { text: '패키지', link: '/ko/packages/' },
  ],
  sidebar: {
    '/ko/guide/': [
      { text: '소개', link: '/ko/guide/introduction' },
      { text: '시작하기', link: '/ko/guide/getting-started' },
      { text: '스타일 적용', link: '/ko/guide/styling' },
      { text: '상태 관리 방식', link: '/ko/guide/state-ownership' },
      { text: '실행 환경', link: '/ko/guide/host-model' },
    ],
    '/ko/components/': [
      { text: '컴포넌트 목록', link: '/ko/components/' },
      ...koComponentSidebar,
    ],
    '/ko/packages/': [
      { text: '패키지', link: '/ko/packages/' },
      { text: '코어', link: '/ko/packages/core' },
      { text: '브라우저', link: '/ko/packages/dom' },
      { text: '터미널', link: '/ko/packages/terminal' },
      { text: 'Vue', link: '/ko/packages/vue' },
    ],
    '/ko/playground/': [
      { text: '실습', link: '/ko/playground/terminal/' },
      { text: '실제 Bash', link: '/ko/playground/terminal/' },
    ],
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
  base: '/sectile/',
  cleanUrls: true,
  lastUpdated: true,
  appearance: false,
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
    ['meta', { name: 'theme-color', content: '#0a0f1c' }],
    ['meta', { name: 'color-scheme', content: 'dark light' }],
  ],
  markdown: {
    theme: { dark: 'github-dark-default', light: 'github-light-default' },
    lineNumbers: true,
  },
  vite: {
    ssr: {
      noExternal: ['@xterm/xterm', '@xterm/addon-fit'],
    },
  },
  themeConfig: {
    logo: '/mark.svg',
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
