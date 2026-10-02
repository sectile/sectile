import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createServer } from 'vite';
import {
  areas,
  components,
  componentPath,
  examplePath,
  examples,
  hosts,
  validateExampleCatalog,
} from '../src/examples/catalog.ts';
import { routes } from '../src/routes.ts';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('the active documentation package is a Vue and Vite shell', async () => {
  const packageJSON = JSON.parse(await read('package.json'));
  const dependencySurface = JSON.stringify({
    dependencies: packageJSON.dependencies,
    devDependencies: packageJSON.devDependencies,
    scripts: packageJSON.scripts,
  });

  assert.equal(packageJSON.dependencies.vue, '^3.5.22');
  assert.equal(packageJSON.scripts.dev, 'vite --host 127.0.0.1');
  assert.equal(packageJSON.scripts.build, 'vite build && node scripts/materialize-routes.mjs');
  assert.doesNotMatch(dependencySurface, /vitepress/u);
});

test('the shell derives separate Vue and DOM package and example routes', () => {
  const paths = routes.map((route) => route.path);

  assert.equal(paths[0], '/');
  assert.equal(new Set(paths).size, paths.length);
  for (const host of hosts) {
    assert.ok(paths.includes(`/${host.id}`));
    for (const area of areas) assert.ok(paths.includes(`/${host.id}/${area.id}`));
  }
  for (const example of examples) assert.ok(paths.includes(examplePath(example)));
  for (const component of components) assert.ok(paths.includes(componentPath(component.subject)));
  assert.throws(() => componentPath('Unknown'), /Unknown documented component/u);
  assert.ok(!paths.includes('/components'));
  assert.ok(!paths.includes('/packages'));
});

test('the design shell keeps fixed navigation geometry in tokens', async () => {
  const tokens = await read('src/styles/tokens.css');
  const shell = await read('src/styles/shell.css');

  assert.match(tokens, /--docs-header-height: 56px/u);
  assert.match(tokens, /--docs-sidebar-width: 256px/u);
  assert.match(tokens, /--docs-reading-width: 760px/u);
  assert.match(shell, /grid-template-columns: var\(--docs-sidebar-width\) minmax\(0, 1fr\)/u);
  assert.doesNotMatch(shell, /--vp-/u);
  assert.match(shell, /\[data-highlighted\]/u);
  assert.doesNotMatch(shell, /\[data-highlighted="true"\]/u, 'highlight is a presence attribute, not a string boolean');
  const styleSources = [tokens, shell, await read('src/styles/base.css')];
  const declarations = new Set(styleSources.flatMap(source => [...source.matchAll(/(--docs-[\w-]+)\s*:/gu)].map(([, name]) => name)));
  for (const source of styleSources) {
    for (const [, name] of source.matchAll(/var\((--docs-[\w-]+)/gu)) {
      assert.ok(declarations.has(name), `${name} must have a declaration; missing tokens silently drop CSS rules`);
    }
  }
});

test('documentation palette maintains readable text and identifiable control edges', async () => {
  const tokens = await read('src/styles/tokens.css');
  const palette = Object.fromEntries([...tokens.matchAll(/--docs-([\w-]+):\s*(#[\da-f]{6});/gu)].map(([, name, value]) => [name, value]));
  const luminance = (hex) => {
    const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
      .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  for (const [foreground, background, minimum] of [
    ['text', 'bg', 4.5], ['text-muted', 'bg-muted', 4.5],
    ['bg', 'accent', 4.5], ['bg', 'accent-hover', 4.5],
    ['code-text', 'code-bg', 4.5], ['code-muted', 'code-bg', 4.5],
    ['control-border', 'bg', 3], ['control-border', 'bg-muted', 3],
    ['checkbox-border', 'bg', 3], ['error', 'bg', 4.5],
    ['accent', 'accent-soft', 4.5], ['focus', 'bg-muted', 3],
    ['disabled-text', 'disabled-bg', 4.5], ['disabled-border', 'disabled-bg', 3],
    ['error', 'error-soft', 4.5], ['success', 'success-soft', 4.5],
    ['warning', 'warning-soft', 4.5], ['on-accent', 'accent', 4.5],
  ]) {
    const levels = [luminance(palette[foreground]), luminance(palette[background])].sort((a, b) => b - a);
    const ratio = (levels[0] + 0.05) / (levels[1] + 0.05);
    assert.ok(ratio >= minimum, `${foreground} on ${background}: ${ratio.toFixed(2)} < ${minimum}`);
  }
});

test('the example catalog rejects host mixing and duplicate focused routes', () => {
  const vueExample = examples.find((example) => example.host === 'vue');
  assert.ok(vueExample);

  const hostMixed = { ...vueExample, sourceOwner: 'dom' };
  assert.ok(validateExampleCatalog([hostMixed]).some((issue) => issue.code === 'host-source-mismatch'));

  const duplicate = { ...vueExample, id: 'duplicate-example' };
  assert.ok(validateExampleCatalog([vueExample, duplicate]).some((issue) => issue.code === 'duplicate-path'));

  const unfocused = { ...vueExample, id: 'unfocused-example', slug: 'checkbox/unfocused', focus: '   ' };
  assert.ok(validateExampleCatalog([unfocused]).some((issue) => issue.code === 'empty-focus'));
});

test('behavior example sources stay inside their host and omit presentation styling', async () => {
  for (const example of examples) {
    assert.equal(example.sourceOwner, example.host);
    assert.match(example.previewPath, new RegExp(`^\\./${example.host}/`, 'u'));
    assert.ok(example.focus.trim().length > 0);

    await read(`src/examples/${example.previewPath.slice(2)}`);
    for (const section of example.code) {
      assert.match(section.path, new RegExp(`^\\./${example.host}/`, 'u'));
      const source = await read(`src/examples/${section.path.slice(2)}`);
      if (example.host === 'vue') assert.doesNotMatch(source, /@sectile\/dom/u);
      else assert.doesNotMatch(source, /@sectile\/vue|from ['"]vue['"]/u);
      if (example.kind === 'behavior') assert.doesNotMatch(source, /<style\b|\.css['"]|style\s*=/u);
    }
  }
});

test('vue checkbox preview keeps a persistent visual box around the conditional indicator', async () => {
  const preview = await read('src/examples/vue/components/checkbox/controlled-state/Preview.vue');
  const shell = await read('src/styles/shell.css');
  const boxIndex = preview.indexOf('data-example-checkbox-box');
  const indicatorIndex = preview.indexOf('<CheckboxIndicator>');

  assert.ok(boxIndex >= 0 && indicatorIndex > boxIndex);
  assert.match(shell, /\[data-example-checkbox-box\]/u);
  assert.match(shell, /\[data-state="checked"\].*\[data-example-checkbox-box\]/u);
});

test('runtime modules are resolved from catalog paths instead of a second example registry', async () => {
  const runtime = await read('src/examples/runtime.ts');
  assert.match(runtime, /import\.meta\.glob/u);
  for (const example of examples) assert.doesNotMatch(runtime, new RegExp(example.id, 'u'));
});

test('preview is primary and relevant code stays collapsed by default', async () => {
  const app = await read('src/components/ExamplePage.vue');
  const previewIndex = app.indexOf('class="docs-preview"');
  const codeIndex = app.indexOf('class="docs-code-disclosure"');

  assert.ok(previewIndex >= 0 && codeIndex > previewIndex);
  assert.match(app, /<details class="docs-code-disclosure">/u);
  assert.doesNotMatch(app, /<details class="docs-code-disclosure"\s+open/u);
});

test('Vue readers have a complete introduction and representative component destinations', () => {
  for (const path of ['/vue/getting-started', '/vue/guides/styling', '/vue/guides/state', '/vue/components/checkbox', '/vue/components/dialog', '/vue/form/native-submission']) {
    const route = routes.find((candidate) => candidate.path === path);
    assert.ok(route, path);
    assert.equal(route.host, 'vue');
  }
  assert.ok(examples.some((example) => example.subject === 'Dialog'));
  assert.ok(examples.some((example) => example.area === 'form'));
  assert.ok(examples.some((example) => example.kind === 'styling'));
});

test('every shipped route renders and all internal page links resolve', async () => {
  const server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    server: { middlewareMode: true, watch: null },
    appType: 'custom',
  });
  // The client router reads location at import time. This fixture supplies only
  // that boundary; rendering is real Vue SSR, not a browser-behavior assertion.
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  globalThis.window = {
    location: { pathname: '/sectile/' },
    addEventListener() {},
    history: { pushState() {} },
    scrollTo() {},
  };
  // Keep document absent: a title-only fake incorrectly selects browser-only
  // component setup paths during server rendering.
  delete globalThis.document;
  try {
    const { default: App } = await server.ssrLoadModule('/src/App.vue');
    const { currentPath } = await server.ssrLoadModule('/src/router.ts');
    const { validateNotificationEmail, submitNotificationEmail } = await server.ssrLoadModule('/src/examples/vue/form/validation-and-server-issues/example.ts');
    const validationContext = { trigger: 'submit', intent: 'submission', changedFieldId: null, signal: new AbortController().signal };
    assert.deepEqual(await validateNotificationEmail({ email: 'USER@example.com', confirmation: 'user@example.com' }, validationContext), { issues: [] });
    const mismatch = await validateNotificationEmail({ email: 'first@example.com', confirmation: 'second@example.com' }, validationContext);
    assert.equal(mismatch.issues[0].path, 'confirmation');
    assert.deepEqual(mismatch.issues[0].relatedPaths, ['email']);
    const abortedValidation = new AbortController();
    abortedValidation.abort();
    assert.throws(() => validateNotificationEmail({}, { ...validationContext, signal: abortedValidation.signal }), { name: 'AbortError' });
    for (const [email, accepted] of [['blocked@example.com', false], ['user@example.com', true]]) {
      let prevented = false;
      const formData = new FormData();
      formData.set('email', email);
      const result = await submitNotificationEmail({ formData, preventDefault: () => { prevented = true; } });
      assert.equal(result.ok, accepted);
      assert.equal(prevented, true);
      if (!accepted) assert.equal(result.issues[0].path, 'email');
    }
    const { resolveMembers } = await server.ssrLoadModule('/src/examples/vue/tabular/local-source/example.ts');
    const { useDataTable } = await server.ssrLoadModule('@sectile/vue/data-table');
    const table = useDataTable({ source: resolveMembers });
    try {
      const request = table.requestState.value.pendingRequest;
      assert.ok(request, 'table supplies its public source request');
      const response = await resolveMembers(request, { signal: new AbortController().signal });
      const accepted = table.synchronizeView(response);
      assert.equal(accepted.ok, true, 'the actual example resolver produces an accepted view');
      assert.deepEqual(table.getProjection().rows.map((row) => row.id), ['ada', 'grace', 'linus']);
      const aborted = new AbortController();
      aborted.abort();
      assert.throws(() => resolveMembers(request, { signal: aborted.signal }), { name: 'AbortError' });
    } finally {
      table.dispose();
    }
    const paths = new Set(routes.map((route) => route.path));
    for (const route of routes) {
      currentPath.value = route.path;
      const html = await renderToString(createSSRApp(App));
      assert.match(html, /<h1(?:\s[^>]*)?>[^<]/u, route.path);
      assert.ok(!html.includes('Page not found'), route.path);
      const pageIDs = new Set([...html.matchAll(/\sid="([^"]+)"/gu)].map(([, id]) => id));
      for (const [, target] of html.matchAll(/href="#([^"]+)"/gu)) {
        assert.ok(pageIDs.has(target), `${route.path}: unresolved section ${target}`);
      }
      for (const [, href] of html.matchAll(/href="([^"#]+)"/gu)) {
        assert.ok(href.startsWith('/sectile/'), `${route.path}: ${href}`);
        const path = href.slice('/sectile'.length).replace(/\/$/u, '') || '/';
        assert.ok(paths.has(path), `${route.path}: unresolved link ${href}`);
      }
      if (route.kind === 'example') {
        assert.match(html, /class="docs-preview/u);
        assert.match(html, /<details class="docs-code-disclosure">/u);
        const preview = html.slice(html.indexOf('class="docs-preview'), html.indexOf('<details class="docs-code-disclosure">'));
        const initialStates = {
          'vue-form-validation-and-server-issues': [/No accepted submission yet/u, /Confirm email/u, /does not contact a server/u],
          'vue-components-primitive-element-adoption': [/Activations: 0/u, /data-example-adopted-button/u],
          'vue-components-host-provider-rtl-tabs': [/Direction: rtl/u, /dir="rtl"/u, /Switch to LTR/u],
          'vue-components-cascade-list-visible-columns': [/Delivery city: Seoul/u, /Country/u, /Busan/u],
          'vue-components-cascade-select-hierarchical-choice': [/Delivery city: Seoul/u, /Korea \/ Seoul/u],
          'vue-components-color-picker-native-and-text': [/Committed color: #4659d4/u, /native-input/u],
          'vue-components-reorder-delivery-sequence': [/Order: Reception → Warehouse → Office/u, /Alt\+ArrowUp/u],
          'vue-components-tree-grid-editable-parcels': [/Selected cell: a-name/u, /Parcel A/u, /data-expanded/u],
          'vue-temporal-date-popover': [/Selected: 2026-10-03/u, /Choose date/u],
          'vue-temporal-date-range-popover': [/Selected: 2026-10-03 → 2026-10-08/u, /Range start/u, /Range end/u],
          'vue-temporal-inline-range-calendar': [/Selected: 2026-10-03 → 2026-10-08/u, /data-in-range/u],
          'vue-temporal-month-selection': [/Selected: 2026-10-01/u, />Oct<\/button>/u],
          'vue-temporal-month-range-selection': [/Selected: 2026-10-01 → 2026-12-01/u, />Dec<\/button>/u],
          'vue-temporal-year-selection': [/Selected: 2026-01-01/u, /year page/u],
          'vue-temporal-year-range-selection': [/Selected: 2026-01-01 → 2028-01-01/u, /Choose years/u],
          'vue-temporal-date-time-selection': [/Selected: 2026-10-03T09:00/u, /without a time zone/u],
          'vue-temporal-date-time-range-selection': [/Selected: 2026-10-03T09:00.*2026-10-08T17:00/u, /Range end/u],
          'vue-components-meter-group-storage-budget': [/60 \/ 100/u, /40 units remaining/u, /Documents/u, /Media/u],
          'vue-components-quantity-field-unit-conversion': [/Canonical value: 1\.5 metre/u, /Display unit/u],
          'vue-components-window-splitter-bounded-panes': [/First pane: 50%/u, /Resize delivery panels/u],
          'vue-virtual-measured-list': [/Delivery 1/u, /Mounted content establishes/u],
          'vue-virtual-responsive-grid': [/Parcel 1/u, /64px tall/u],
          'vue-virtual-masonry-notes': [/Delivery 1/u, /120px estimate/u],
          'vue-virtual-spatial-rectangles': [/Parcel 1/u, /surface-local rectangles/u],
          'vue-components-grid-two-dimensional-selection': [/Selected slot: A1/u, /data-part="cell"/u],
          'vue-components-tree-view-expanded-selection': [/Selected: Standard/u, /data-expanded/u],
          'vue-components-feed-window-request': [/3 updates · Revision 0/u, /Load newer updates/u],
          'vue-components-menu-nested-actions': [/Invoked: none/u, /Share/u],
          'vue-components-menubar-nested-actions': [/Invoked: none/u, /File/u, /Help/u],
          'vue-components-navigation-menu-link-destinations': [/Destination: none/u, /<a /u],
          'vue-components-tooltip-focus-hover': [/Archive message/u],
          'vue-components-alert-dialog-explicit-confirmation': [/Request: active/u],
          'vue-components-drawer-side-panel': [/Drawer open: false/u],
          'vue-components-toast-transient-feedback': [/0 notifications/u, /Show saved notification/u],
          'vue-components-menu-button-action-menu': [/Invoked: none/u, /Message actions/u],
          'vue-components-dialog-exit-transition': [/Open: false/u, /Open transition dialog/u],
          'vue-components-toolbar-action-navigation': [/role="toolbar"/u, /Last action: none/u],
          'vue-components-pagination-page-selection': [/Page 1 of 6/u, /Previous/u, /Next/u],
          'vue-components-stepper-manual-steps': [/Step: Address/u, /Confirm your delivery address./u],
          'vue-components-checkbox-group-selected-values': [/Channels: Email/u, /aria-checked="true"/u],
          'vue-components-multi-thumb-slider-interval-selection': [/Interval: 20 – 80/u, /--sectile-thumb-percentage:20%/u],
          'vue-components-carousel-presence-crossfade': [/Active service: Standard/u, /data-state="active"/u],
          'vue-temporal-date-field-bounded-date': [/Date: 2026-10-03/u, /Delivery date/u],
          'vue-temporal-time-field-native-time': [/Time: 09:30/u, /Collection time/u],
          'vue-temporal-date-time-field-local-date-time': [/Appointment: 2026-10-03T09:30/u],
          'vue-temporal-date-range-field-travel-dates': [/Stay: 2026-10-03 – 2026-10-07/u, /Arrival/u, /Departure/u],
          'vue-temporal-time-range-field-collection-window': [/Window: 09:00 – 12:00/u],
          'vue-components-select-disabled-options': [/Delivery: Standard/u, /aria-disabled="true"/u],
          'vue-components-combobox-search-results': [/role="combobox"/u, /Member: none/u],
          'vue-components-listbox-multiple-selection': [/aria-multiselectable="true"/u, /Destinations: Email/u],
          'vue-components-tags-input-edit-tags': [/Tags: priority/u, /data-part="item-delete"/u],
          'vue-components-pin-input-verification-code': [/Code incomplete/u, /data-part="input"/u],
          'vue-components-editable-commit-cancel': [/Saved name: Reception delivery/u, /Cancel edit/u],
          'vue-components-number-field-decimal-value': [/value="12.5"/u, /Committed weight: 12.5/u],
          'vue-components-spin-button-bounded-quantity': [/role="spinbutton"/u, /Quantity: 3/u],
          'vue-components-slider-stepped-value': [/role="slider"/u, /aria-valuenow="40"/u, /--sectile-slider-percentage:40%/u],
          'vue-components-progress-determinate-value': [/role="progressbar"/u, /aria-valuenow="25"/u, /--sectile-progress-percentage:\s*25%/u],
          'vue-components-meter-threshold-zones': [/role="meter"/u, /data-zone="optimum"/u, /Storage: 40%/u],
          'vue-components-rating-clearable-score': [/role="radiogroup"/u, /aria-checked="true"/u, /Rating: 3/u],
          'vue-components-timer-countdown-controls': [/Paused/u, /Start/u, /Reset/u],
          'vue-temporal-calendar-selection': [/role="grid"/u, /aria-selected="true"/u, /Selected date: 2026-10-03/u],
          'vue-virtual-fixed-list': [/Delivery 1/u, /500 items/u],
          'vue-tabular-local-source': [/<table/u, /Project members/u, /Status: idle/u],
          'vue-chart-line-series': [/<canvas/u, /drawn after mounting/u],
          'vue-components-checkbox-default-state': [/aria-checked="true"/u, /Weekly summary · enabled/u],
          'vue-components-checkbox-indeterminate-state': [/aria-checked="mixed"/u, /Value: indeterminate/u],
          'vue-components-checkbox-readonly-disabled': [/aria-readonly="true"/u, /<button[^>]*\sdisabled(?:=""|\s|>)/u, /Read-only notifications/u, /Disabled notifications/u],
          'vue-components-switch-readonly-disabled': [/aria-readonly="true"/u, /<button[^>]*\sdisabled(?:=""|\s|>)/u, /Read-only delivery/u, /Disabled delivery/u],
          'vue-components-toggle-group-single-selection': [/aria-pressed="true"/u, /Alignment: Left/u],
          'vue-components-tabs-automatic-activation': [/role="tablist"/u, /aria-selected="true"/u, /Selected: Overview/u],
          'vue-components-accordion-single-panel': [/aria-expanded="true"/u, /Open panel: Delivery/u],
          'vue-components-accordion-multiple-panels': [/aria-expanded="true"/u, /Open panels: Delivery/u],
          'vue-components-text-multiline-value': [/<textarea/u, /Delivery notes/u, /Value: Leave the parcel at reception./u],
          'vue-components-text-lazy-value': [/<input/u, /Display name/u, /Committed name: Ada/u],
          'vue-components-switch-controlled-state': [/role="switch"/u, /aria-checked="false"/u, /Enabled: false/u],
          'vue-components-toggle-button-pressed-state': [/aria-pressed="false"/u, /Pinned: false/u],
          'vue-components-toggle-group-multiple-selection': [/aria-pressed="true"/u, /Selected: bold/u, /aria-disabled="true"/u],
          'vue-components-radio-group-disabled-options': [/role="radiogroup"/u, /aria-checked="true"/u, /Delivery: Standard/u, /aria-disabled="true"/u],
          'vue-components-tabs-manual-activation': [/role="tablist"/u, /aria-selected="true"/u, /Selected: Overview/u, /aria-disabled="true"/u],
          'vue-components-popover-positioned-dismissal': [/aria-expanded="false"/u, /Open: false/u],
        };
        for (const state of initialStates[route.exampleId] ?? []) assert.match(preview, state, route.path);
        if (route.exampleId === 'vue-components-disclosure-exit-transition') {
          assert.match(html, /<output[^>]*aria-live="polite"[^>]*>Open: true · Present<\/output>/u);
          assert.match(html, /aria-expanded="true"/u);
        }
      } else if (route.kind === 'component') {
        const subjectExamples = examples.filter((example) => example.host === route.host && example.subject === route.subject);
        assert.equal([...html.matchAll(/class="[^"]*\bdocs-preview(?:\s|")/gu)].length, subjectExamples.length, route.path);
        assert.equal([...html.matchAll(/<details class="docs-code-disclosure">/gu)].length, subjectExamples.length, route.path);
        assert.equal([...html.matchAll(/>Reset example<\/button>/gu)].length, subjectExamples.length, route.path);
        for (const example of subjectExamples) assert.ok(html.includes(`id="${example.id}-preview"`));
        const ids = [...html.matchAll(/\sid="([^"]+)"/gu)].map(([, id]) => id);
        assert.equal(new Set(ids).size, ids.length, `${route.path}: unique element IDs`);
      } else if (route.kind === 'area' && route.host === 'vue' && route.area !== 'components') {
        const domainExamples = examples.filter((example) => example.host === 'vue' && example.area === route.area);
        assert.equal([...html.matchAll(/class="[^"]*\bdocs-preview(?:\s|")/gu)].length, domainExamples.length, route.path);
        assert.equal([...html.matchAll(/>Reset example<\/button>/gu)].length, domainExamples.length, route.path);
      } else {
        assert.doesNotMatch(html, /class="docs-preview/u, 'Galleries do not mount live previews');
        if (route.path === '/vue/components') {
          assert.equal([...html.matchAll(/class="docs-example-card"/gu)].length, components.length);
          for (const component of components) assert.ok(html.includes(`href="/sectile${componentPath(component.subject)}/"`));
        }
      }
      if (route.host === 'dom') assert.doesNotMatch(html, /Vue documentation/u);
    }
    currentPath.value = '/missing';
    assert.match(await renderToString(createSSRApp(App)), /Page not found/u);
  } finally {
    await server.close();
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
