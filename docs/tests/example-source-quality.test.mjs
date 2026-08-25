import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createServer } from 'vite';
import catalog from '../data/components.json' with { type: 'json' };
import { documentedScenarios } from '../data/component-documentation.mjs';

const hosts = ['vue', 'core', 'dom', 'terminal'];

async function loadExampleSources() {
  const server = await createServer({
    root: new URL('..', import.meta.url).pathname,
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true },
  });
  try {
    return {
      ...await server.ssrLoadModule('/.vitepress/theme/component-example-sources.ts'),
      ...await server.ssrLoadModule('/.vitepress/theme/code-rendering.ts'),
    };
  } finally {
    await server.close();
  }
}

test('every scenario has one exact, non-duplicated source per host', async () => {
  const { componentExampleSources } = await loadExampleSources();
  const seen = new Map(hosts.map((host) => [host, new Map()]));

  for (const component of catalog.components) {
    for (const scenario of documentedScenarios(component)) {
      const sources = componentExampleSources(component.id, scenario);
      for (const host of hosts) {
        const label = `${component.id}/${scenario}/${host}`;
        const source = sources[host];
        assert.equal(typeof source, 'string', label);
        assert.notEqual(source.trim(), '', label);
        const normalized = source.replaceAll(/\s+/gu, ' ').trim();
        const previous = seen.get(host).get(normalized);
        assert.equal(previous, undefined, `${label} duplicates ${previous}`);
        seen.get(host).set(normalized, label);
      }
    }
  }
});

test('every example parses through the shared formatter and formatting is idempotent', async () => {
  const { componentExampleSources, formatCodeSource } = await loadExampleSources();
  for (const component of catalog.components) {
    for (const scenario of documentedScenarios(component)) {
      const sources = componentExampleSources(component.id, scenario);
      for (const host of hosts) {
        const label = `${component.id}/${scenario}/${host}`;
        const language = host === 'vue' ? 'vue' : 'ts';
        const formatted = await formatCodeSource(sources[host], language);
        assert.equal(await formatCodeSource(formatted, language), formatted, label);
        if (host !== 'vue') continue;
        const body = /<template>\n([\s\S]*?)\n<\/template>/u.exec(formatted)?.[1];
        assert.notEqual(body, undefined, label);
        const firstLine = body.split('\n').find((line) => line.trim() !== '');
        assert.match(firstLine, /^ {2}\S/u, label);
      }
    }
  }
});

test('Pin Input sources teach host-specific behavior with intentional state examples', async () => {
  const { componentExampleSources } = await loadExampleSources();
  const scenarios = ['verification-code', 'custom-length', 'masked', 'placeholders', 'otp', 'readonly', 'disabled', 'controlled'];
  const sources = Object.fromEntries(scenarios.map((scenario) => [
    scenario,
    componentExampleSources('pin-input', scenario),
  ]));

  for (const scenario of scenarios.filter((name) => !['readonly', 'disabled'].includes(name))) {
    for (const host of hosts) {
      assert.doesNotMatch(sources[scenario][host], /default(?:-|V)alue=["']?\d/u, `${scenario}/${host}`);
    }
  }
  assert.match(sources['custom-length'].vue, /:length="4"/u);
  assert.match(sources.masked.dom, /input\.type = 'password'/u);
  assert.match(sources.placeholders.dom, /input\.placeholder = '○'/u);
  assert.match(sources['verification-code'].dom, /autocomplete = index === 0 \? 'off'/u);
  assert.match(sources.otp.dom, /autocomplete = index === 0 \? 'one-time-code'/u);
  assert.match(sources.otp.vue, /:otp="true"/u);
  assert.match(sources.readonly.vue, /default-value="246810"/u);
  assert.match(sources.disabled.vue, /default-value="593174"/u);
  assert.match(sources.readonly.dom, /defaultValue: '246810'/u);
  assert.match(sources.disabled.dom, /defaultValue: '593174'/u);
  assert.match(sources.readonly.terminal, /readOnly: true/u);
  assert.match(sources.disabled.terminal, /disabled: true/u);
  assert.match(sources.controlled.terminal, /syncControlledValue/u);
  assert.doesNotMatch(sources['verification-code'].terminal, /JSON\.stringify/u);
});

test('example resolution contains no fallback source selection', async () => {
  const source = await readFile(new URL('../.vitepress/theme/component-example-sources.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /specializedVueCodeFor\([^\n]+\)\s*\|\|/u);
  assert.doesNotMatch(source, /domDemoCode\[[^\]]+\]\s*\?\?/u);
  assert.doesNotMatch(source, /const name = pascal\(component\)/u);
  assert.doesNotMatch(source, /render\(control\.getSnapshot\(\)\)/u);
  assert.doesNotMatch(source, /JSON\.stringify\(snapshot\)/u);
});
