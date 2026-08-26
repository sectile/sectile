import { createSSRApp, nextTick } from 'vue';
import { createHydrationFixture } from './hydration-fixture.mjs';

const warnings = [];
const app = createSSRApp(createHydrationFixture());
app.config.warnHandler = (message) => { warnings.push(message); };
app.mount('#app');
await nextTick();

const failures = [];
const trigger = document.querySelector('[data-scope="disclosure"][data-part="trigger"]');
const content = document.querySelector('[data-scope="disclosure"][data-part="content"]');
if (trigger?.getAttribute('aria-controls') !== content?.id) failures.push('generated ID relationship');
if (document.querySelector('[data-browser-state="closed"]') !== null) failures.push('closed conditional presence');
if (document.querySelector('[data-browser-state="open"]') === null) failures.push('open conditional presence');
const hidden = document.querySelector('input[type="hidden"][name="pin"]');
if (!(hidden instanceof HTMLInputElement) || hidden.value !== '1234') failures.push('hidden form control');
const form = document.querySelector('#pin-form');
if (!(form instanceof HTMLFormElement) || new FormData(form).get('pin') !== '1234') failures.push('native form submission');
if (document.querySelector('#reference-date')?.textContent !== '2026-8-26') failures.push('reference date');
if (warnings.length > 0) failures.push('Vue hydration warnings');

const result = Object.freeze({
  ok: failures.length === 0,
  failures: Object.freeze(failures),
  warnings: Object.freeze(warnings),
  userAgent: navigator.userAgent,
});
window.__SECTILE_BROWSER_RESULT__ = result;
document.documentElement.dataset.sectileVerification = result.ok ? 'passed' : 'failed';
document.querySelector('#result').textContent = JSON.stringify(result);
