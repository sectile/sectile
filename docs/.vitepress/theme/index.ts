import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { defineAsyncComponent } from 'vue';
import Layout from './Layout.vue';
import './styles.css';
import './component-examples.css';
import './semantic-system.css';
import '@xterm/xterm/css/xterm.css';

const docsComponents = {
  BashTerminal: defineAsyncComponent(() => import('./components/BashTerminal.vue')),
  ComponentCatalog: defineAsyncComponent(() => import('./components/ComponentCatalog.vue')),
  ComponentExample: defineAsyncComponent(() => import('./components/ComponentExample.vue')),
  DocsHome: defineAsyncComponent(() => import('./components/DocsHome.vue')),
  FormPackageExample: defineAsyncComponent(() => import('./components/FormPackageExample.vue')),
  HostCode: defineAsyncComponent(() => import('./components/HostCode.vue')),
  HostInstall: defineAsyncComponent(() => import('./components/HostInstall.vue')),
  PackageImport: defineAsyncComponent(() => import('./components/PackageImport.vue')),
  PackageBoundaryMap: defineAsyncComponent(() => import('./components/PackageBoundaryMap.vue')),
  TerminalCheckboxDemo: defineAsyncComponent(() => import('./components/TerminalCheckboxDemo.vue')),
  TheoryComposition: defineAsyncComponent(() => import('./components/TheoryComposition.vue')),
  TheoryContractDiagram: defineAsyncComponent(() => import('./components/TheoryContractDiagram.vue')),
  TheoryOverview: defineAsyncComponent(() => import('./components/TheoryOverview.vue')),
  VirtualBenchmarkReport: defineAsyncComponent(() => import('./components/VirtualBenchmarkReport.vue')),
  VirtualBenchmarkSuiteReport: defineAsyncComponent(() => import('./components/VirtualBenchmarkSuiteReport.vue')),
  VirtualBenchmarkLab: defineAsyncComponent(() => import('./components/VirtualBenchmarkLab.vue')),
  VirtualExample: defineAsyncComponent(() => import('./components/VirtualExample.vue')),
  VirtualInstall: defineAsyncComponent(() => import('./components/VirtualInstall.vue')),
} as const;

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    for (const [name, component] of Object.entries(docsComponents)) {
      app.component(name, component);
    }
  },
} satisfies Theme;
