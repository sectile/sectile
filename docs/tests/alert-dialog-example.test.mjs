import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const catalog = await readFile(
  new URL('../.vitepress/theme/components/CatalogCase.vue', import.meta.url),
  'utf8',
);
const styles = await readFile(
  new URL('../.vitepress/theme/component-examples.css', import.meta.url),
  'utf8',
);
const code = await readFile(
  new URL('../.vitepress/theme/catalog-code.ts', import.meta.url),
  'utf8',
);

test('alert dialog renders as a dimmed modal overlay', () => {
  assert.match(catalog, /<AlertDialogOverlay class="catalog-dialog-overlay" \/>/u);
  assert.match(catalog, /class="catalog-dialog catalog-alert-dialog"/u);
  assert.doesNotMatch(catalog, /catalog-alert-dialog--/u);
  assert.match(catalog, /class="catalog-dialog-actions"/u);
  assert.doesNotMatch(catalog, /<AlertDialogRoot[^>]+default-open/u);
  assert.match(styles, /\.catalog-dialog-overlay\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;/su);
  assert.match(styles, /\.catalog-alert-dialog\s*\{[^}]*position:\s*absolute;[^}]*transform:\s*translate\(-50%, -50%\);/su);
  assert.match(code, /AlertDialogOverlay/u);
});

test('destructive and unsaved dialogs communicate different decisions', () => {
  assert.match(catalog, /This permanently removes the project and its deployment history\./u);
  assert.match(catalog, /Your edits to Release 0\.3 will be lost\./u);
  assert.match(catalog, /Keep editing/u);
  assert.match(catalog, /catalog-warning-button/u);
  assert.match(code, /const alertDialogScenarioCode/u);
  assert.match(code, /destructive: catalogCode\['alert-dialog'\]/u);
  assert.match(code, /unsaved: sfc\([\s\S]*?Discard draft[\s\S]*?Keep editing[\s\S]*?Discard changes/u);
});
