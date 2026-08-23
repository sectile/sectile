import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import CheckboxDemo from './components/CheckboxDemo.vue';
import CheckboxIndeterminateDemo from './components/CheckboxIndeterminateDemo.vue';
import BashPlayground from './components/BashPlayground.vue';
import ComponentCatalog from './components/ComponentCatalog.vue';
import HostCode from './components/HostCode.vue';
import HostInstall from './components/HostInstall.vue';
import PackageImport from './components/PackageImport.vue';
import TerminalCheckboxDemo from './components/TerminalCheckboxDemo.vue';
import TheoryComposition from './components/TheoryComposition.vue';
import TheoryOverview from './components/TheoryOverview.vue';
import Layout from './Layout.vue';
import './styles.css';
import '@xterm/xterm/css/xterm.css';

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('CheckboxDemo', CheckboxDemo);
    app.component('CheckboxIndeterminateDemo', CheckboxIndeterminateDemo);
    app.component('BashPlayground', BashPlayground);
    app.component('ComponentCatalog', ComponentCatalog);
    app.component('HostCode', HostCode);
    app.component('HostInstall', HostInstall);
    app.component('PackageImport', PackageImport);
    app.component('TerminalCheckboxDemo', TerminalCheckboxDemo);
    app.component('TheoryComposition', TheoryComposition);
    app.component('TheoryOverview', TheoryOverview);
  },
} satisfies Theme;
