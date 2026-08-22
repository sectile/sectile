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

export default defineConfig({
  title: 'Sectile',
  description: 'Renderer-neutral interaction semantics for the interfaces you need to own.',
  base: '/sectile/',
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'theme-color', content: '#0a0f1c' }],
    ['meta', { name: 'color-scheme', content: 'dark light' }],
  ],
  markdown: {
    theme: { dark: 'github-dark-default', light: 'github-light-default' },
    lineNumbers: true,
  },
  themeConfig: {
    logo: '/mark.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Components', link: '/components/' },
      { text: 'Packages', link: '/packages/' },
      { text: 'Internals', link: '/README' },
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
      '/architecture/': [{ text: 'Architecture', link: '/architecture/' }],
      '/decisions/': [{ text: 'Decisions', link: '/decisions/' }],
      '/engineering/': [{ text: 'Engineering', link: '/engineering/' }],
      '/performance/': [{ text: 'Performance', link: '/performance/' }],
      '/primitives/': [{ text: 'Core primitives', link: '/primitives/' }],
      '/references/': [{ text: 'References', link: '/references/' }],
      '/testing/': [{ text: 'Testing', link: '/testing/' }],
    },
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/sectile/sectile' }],
    editLink: {
      pattern: 'https://github.com/sectile/sectile/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Sectile contributors',
    },
    outline: { level: [2, 3], label: 'On this page' },
  },
});
