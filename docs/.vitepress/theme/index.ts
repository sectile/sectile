import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import CheckboxDemo from './components/CheckboxDemo.vue';
import CheckboxAttributesDemo from './components/CheckboxAttributesDemo.vue';
import CheckboxFormDemo from './components/CheckboxFormDemo.vue';
import CheckboxIndeterminateDemo from './components/CheckboxIndeterminateDemo.vue';
import CheckboxInteractionDemo from './components/CheckboxInteractionDemo.vue';
import CheckboxOwnershipDemo from './components/CheckboxOwnershipDemo.vue';
import BashPlayground from './components/BashPlayground.vue';
import ComponentCatalog from './components/ComponentCatalog.vue';
import ComponentAnatomy from './components/ComponentAnatomy.vue';
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
import '../../examples/checkbox/styles.css';
import '@xterm/xterm/css/xterm.css';

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('CheckboxDemo', CheckboxDemo);
    app.component('CheckboxAttributesDemo', CheckboxAttributesDemo);
    app.component('CheckboxFormDemo', CheckboxFormDemo);
    app.component('CheckboxIndeterminateDemo', CheckboxIndeterminateDemo);
    app.component('CheckboxInteractionDemo', CheckboxInteractionDemo);
    app.component('CheckboxOwnershipDemo', CheckboxOwnershipDemo);
    app.component('BashPlayground', BashPlayground);
    app.component('ComponentCatalog', ComponentCatalog);
    app.component('ComponentAnatomy', ComponentAnatomy);
    app.component('ComponentExample', ComponentExample);
    app.component('HostCode', HostCode);
    app.component('HostInstall', HostInstall);
    app.component('PackageImport', PackageImport);
    app.component('TerminalCheckboxDemo', TerminalCheckboxDemo);
    app.component('TheoryComposition', TheoryComposition);
    app.component('TheoryOverview', TheoryOverview);
  },
} satisfies Theme;
