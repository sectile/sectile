import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import BashTerminal from './components/BashTerminal.vue';
import ComponentCatalog from './components/ComponentCatalog.vue';
import ComponentExample from './components/ComponentExample.vue';
import DocsHome from './components/DocsHome.vue';
import FormPackageExample from './components/FormPackageExample.vue';
import HostCode from './components/HostCode.vue';
import HostInstall from './components/HostInstall.vue';
import PackageImport from './components/PackageImport.vue';
import PackageBoundaryMap from './components/PackageBoundaryMap.vue';
import TerminalCheckboxDemo from './components/TerminalCheckboxDemo.vue';
import TheoryComposition from './components/TheoryComposition.vue';
import TheoryContractDiagram from './components/TheoryContractDiagram.vue';
import TheoryOverview from './components/TheoryOverview.vue';
import VirtualBenchmarkReport from './components/VirtualBenchmarkReport.vue';
import VirtualExample from './components/VirtualExample.vue';
import VirtualInstall from './components/VirtualInstall.vue';
import Layout from './Layout.vue';
import './styles.css';
import './component-examples.css';
import './semantic-system.css';
import '@xterm/xterm/css/xterm.css';

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('BashTerminal', BashTerminal);
    app.component('ComponentCatalog', ComponentCatalog);
    app.component('ComponentExample', ComponentExample);
    app.component('DocsHome', DocsHome);
    app.component('FormPackageExample', FormPackageExample);
    app.component('HostCode', HostCode);
    app.component('HostInstall', HostInstall);
    app.component('PackageImport', PackageImport);
    app.component('PackageBoundaryMap', PackageBoundaryMap);
    app.component('TerminalCheckboxDemo', TerminalCheckboxDemo);
    app.component('TheoryComposition', TheoryComposition);
    app.component('TheoryContractDiagram', TheoryContractDiagram);
    app.component('TheoryOverview', TheoryOverview);
    app.component('VirtualBenchmarkReport', VirtualBenchmarkReport);
    app.component('VirtualExample', VirtualExample);
    app.component('VirtualInstall', VirtualInstall);
  },
} satisfies Theme;
