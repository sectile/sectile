import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import BashTerminal from './components/BashTerminal.vue';
import ComponentCatalog from './components/ComponentCatalog.vue';
import ComponentExample from './components/ComponentExample.vue';
import HostCode from './components/HostCode.vue';
import HostInstall from './components/HostInstall.vue';
import PackageImport from './components/PackageImport.vue';
import TerminalCheckboxDemo from './components/TerminalCheckboxDemo.vue';
import TheoryComposition from './components/TheoryComposition.vue';
import TheoryOverview from './components/TheoryOverview.vue';
import Layout from './Layout.vue';
import './styles.css';
import './component-examples.css';
import '@xterm/xterm/css/xterm.css';

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('BashTerminal', BashTerminal);
    app.component('ComponentCatalog', ComponentCatalog);
    app.component('ComponentExample', ComponentExample);
    app.component('HostCode', HostCode);
    app.component('HostInstall', HostInstall);
    app.component('PackageImport', PackageImport);
    app.component('TerminalCheckboxDemo', TerminalCheckboxDemo);
    app.component('TheoryComposition', TheoryComposition);
    app.component('TheoryOverview', TheoryOverview);
  },
} satisfies Theme;
