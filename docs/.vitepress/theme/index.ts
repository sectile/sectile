import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import CheckboxDemo from './components/CheckboxDemo.vue';
import ComponentCatalog from './components/ComponentCatalog.vue';
import './styles.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('CheckboxDemo', CheckboxDemo);
    app.component('ComponentCatalog', ComponentCatalog);
  },
} satisfies Theme;
