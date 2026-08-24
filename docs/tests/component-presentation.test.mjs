import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const styles = await readFile(
  new URL('../.vitepress/theme/component-examples.css', import.meta.url),
  'utf8',
);
const anatomy = await readFile(
  new URL('../.vitepress/theme/component-anatomy.ts', import.meta.url),
  'utf8',
);
const anatomyStyles = await readFile(
  new URL('../.vitepress/theme/components/ComponentAnatomy.vue', import.meta.url),
  'utf8',
);
const navigation = await readFile(
  new URL('../.vitepress/theme/components/CatalogCase.vue', import.meta.url),
  'utf8',
);
const toast = await readFile(
  new URL('../.vitepress/theme/components/ToastCase.vue', import.meta.url),
  'utf8',
);
const popover = await readFile(
  new URL('../.vitepress/theme/components/PopoverCase.vue', import.meta.url),
  'utf8',
);
const exampleSources = await readFile(
  new URL('../.vitepress/theme/component-example-sources.ts', import.meta.url),
  'utf8',
);
const catalogCode = await readFile(
  new URL('../.vitepress/theme/catalog-code.ts', import.meta.url),
  'utf8',
);

test('navigation menu resets document markers and presents a composed popup', () => {
  assert.match(styles, /\.catalog-navigation-menu :is\(ul, ol\)[^{]*\{[^}]*list-style:\s*none;/s);
  assert.match(styles, /\.catalog-navigation-panel\s*\{[^}]*position:\s*absolute;[^}]*grid-template-columns:\s*repeat\(2,/s);
  assert.match(navigation, /catalog-navigation-card/);
  assert.match(navigation, /<ChevronDown/);
  assert.match(styles, /a\.catalog-navigation-link\s*\{[^}]*text-decoration:\s*none\s*!important;/s);
});

test('popover always renders its trigger and starts with representative content visible', () => {
  assert.doesNotMatch(popover, /PopoverRoot v-if=/);
  assert.match(popover, /const open = ref\(true\)/);
  assert.match(popover, /:default-open="controlled \? undefined : true"/);
  assert.match(popover, /:close-on-interact-outside="false"/);
});

test('popover Vue code never falls back to the DOM adapter and follows its scenario', () => {
  assert.doesNotMatch(exampleSources, /vue:[^\n]+domDemoCode/u);
  assert.match(catalogCode, /const specifier = '@sectile\/vue\/'/u);
  assert.match(catalogCode, /popover: sfc\(\s*'PopoverRoot,/u);
  assert.match(catalogCode, /anchored: catalogCode\['popover'\]/u);
  assert.match(catalogCode, /collision: sfc\([\s\S]*?side="right"[\s\S]*?:collision-padding="16"/u);
});

test('dialog uses the public overlay and separates modal from non-modal presentation', () => {
  assert.match(navigation, /DialogOverlay/);
  assert.match(navigation, /catalog-modal-dialog/);
  assert.match(navigation, /catalog-nonmodal-dialog/);
  assert.match(styles, /\.catalog-modal-dialog\s*\{[^}]*position:\s*absolute;[^}]*transform:\s*translate\(-50%, -50%\);/s);
});

test('dialog code resolves the exact modal, non-modal, and controlled scenario', () => {
  assert.match(exampleSources, /catalogCodeFor\(component, scenario\)/u);
  assert.match(catalogCode, /'non-modal': sfc\([\s\S]*?<DialogRoot default-open :modal="false">/u);
  assert.match(catalogCode, /'non-modal': sfc\([\s\S]*?<DialogContent>[\s\S]*?<\/DialogRoot>/u);
  assert.doesNotMatch(
    catalogCode.match(/'non-modal': sfc\([\s\S]*?<\/DialogRoot>`/u)?.[0] ?? '',
    /DialogOverlay/u,
  );
  assert.match(catalogCode, /controlled: sfc\([\s\S]*?<DialogRoot v-model:open="open">/u);
});

test('pagination controls remain on one row and use an icon ellipsis', () => {
  assert.match(styles, /\.pagination-items\s*\{[^}]*grid-auto-flow:\s*column;[^}]*overflow-x:\s*auto;/s);
  assert.match(anatomy, /icon:\s*'ellipsis'/);
  assert.doesNotMatch(anatomy, /n\('muted', undefined, '…'\)/);
  assert.match(anatomyStyles, /\.anatomy-node--pagination-root\s*\{[^}]*flex-wrap:\s*nowrap;/s);
});

test('toast notifications float above the example instead of expanding document flow', () => {
  assert.match(styles, /\.toast-example\s*\{[^}]*position:\s*relative;/s);
  assert.match(styles, /\.toast-viewport\s*\{[^}]*position:\s*absolute;[^}]*right:\s*0;[^}]*bottom:\s*0;/s);
  assert.match(styles, /\.toast-copy \[data-part="title"\]\s*\{[^}]*margin:\s*0;[^}]*border:\s*0;/s);
  assert.match(toast, /Dismiss notification/);
  assert.match(toast, /CheckCircle2/);
});

test('cascade anatomy uses two balanced hierarchy columns without release-channel filler', () => {
  assert.match(anatomy, /Engineering \/ Web platform/);
  assert.match(anatomy, /Mobile apps/);
  assert.doesNotMatch(anatomy, /isCascade && index === 1/);
  assert.match(anatomyStyles, /\.anatomy-node--cascade-root > \.anatomy-node--list\s*\{[^}]*repeat\(2, minmax\(0, 1fr\)\)/s);
});
