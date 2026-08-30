import { createSSRApp, nextTick } from 'vue';
import { createHydrationFixture } from './hydration-fixture.mjs';
import { runTabularVirtualScenarios } from './tabular-virtual-fixture.mjs?wi=15e';

const warnings = [];
const app = createSSRApp(createHydrationFixture());
app.config.warnHandler = (message) => { warnings.push(message); };
app.mount('#app');
await nextTick();

const failures = [];
const emailInput = document.querySelector('#browser-email-input');
let emailBeforeInputCanceled = null;
let emailSelectionUnavailable = null;
if (!(emailInput instanceof HTMLInputElement)) {
  failures.push('email text input');
} else {
  emailSelectionUnavailable = emailInput.selectionStart === null && emailInput.selectionEnd === null;
  if (!emailSelectionUnavailable) failures.push('email selection API contract');
  const beforeInput = new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    inputType: 'insertReplacementText',
    data: 'other@example.com',
  });
  emailInput.dispatchEvent(beforeInput);
  emailBeforeInputCanceled = beforeInput.defaultPrevented;
  if (emailBeforeInputCanceled) failures.push('native beforeinput ownership');
  emailInput.value = 'other@example.com';
  emailInput.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertReplacementText',
  }));
  await nextTick();
  emailInput.value = 'other@example.co';
  emailInput.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'deleteContentBackward',
  }));
  await nextTick();
  if (emailInput.value !== 'other@example.co') failures.push('email native deletion reconciliation');
}
const trigger = document.querySelector('[data-scope="disclosure"][data-part="trigger"]');
const content = document.querySelector('[data-scope="disclosure"][data-part="content"]');
if (trigger?.getAttribute('aria-controls') !== content?.id) failures.push('generated ID relationship');
if (document.querySelector('[data-browser-state="closed"]') !== null) failures.push('closed conditional presence');
if (document.querySelector('[data-browser-state="open"]') === null) failures.push('open conditional presence');
const hidden = document.querySelector('input[type="hidden"][name="pin"]');
if (!(hidden instanceof HTMLInputElement) || hidden.value !== '1234') failures.push('hidden form control');
const form = document.querySelector('#pin-form');
if (!(form instanceof HTMLFormElement) || new FormData(form).get('pin') !== '1234') failures.push('native form submission');
const coordinatedForm = document.querySelector('#browser-form');
const nativeInput = document.querySelector('#browser-native-input');
const sectileInput = document.querySelector('#browser-sectile-input');
let formInvalidFocus = false;
let fieldsetInvalidFocus = false;
await nextTick();
await nextTick();
const externalInput = document.querySelector('#browser-external-input');
if (!(coordinatedForm instanceof HTMLFormElement)) failures.push('Form hydration root');
if (!(nativeInput instanceof HTMLInputElement)) failures.push('native Form field');
if (!(sectileInput instanceof HTMLInputElement)) failures.push('Sectile Form field');
if (!(externalInput instanceof HTMLInputElement) || externalInput.form !== coordinatedForm) {
  failures.push('teleported Form field');
}
if (coordinatedForm instanceof HTMLFormElement) {
  const initialFormData = new FormData(coordinatedForm);
  if (initialFormData.get('native') !== 'native-default'
    || initialFormData.get('sectile') !== 'sectile-default'
    || initialFormData.get('external') !== 'external-default') {
    failures.push('mixed FormData');
  }
}
if (nativeInput instanceof HTMLInputElement
  && sectileInput instanceof HTMLInputElement
  && externalInput instanceof HTMLInputElement) {
  nativeInput.value = 'native-changed';
  nativeInput.dispatchEvent(new Event('input', { bubbles: true }));
  sectileInput.value = 'sectile-changed';
  sectileInput.dispatchEvent(new Event('input', { bubbles: true }));
  externalInput.value = 'external-changed';
  externalInput.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('#browser-form-reset')?.click();
  await nextTick();
  if (nativeInput.value !== 'native-default'
    || sectileInput.value !== 'sectile-default'
    || externalInput.value !== 'external-default') {
    failures.push('Form reset defaults');
  }

  nativeInput.value = '';
  nativeInput.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('#browser-form-submit')?.click();
  await new Promise((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
  formInvalidFocus = document.activeElement === nativeInput;
  if (!formInvalidFocus) failures.push('first invalid Form focus');

  nativeInput.value = 'native-submitted';
  nativeInput.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('#browser-form-submit')?.click();
  await nextTick();
  const submission = document.querySelector('#browser-form-submission')?.textContent ?? '';
  if (!submission.includes('native-submitted')
    || !submission.includes('sectile-default')
    || !submission.includes('external-default')) {
    failures.push('managed Form submission');
  }
}
const fieldsetInvalidInput = document.querySelector('#browser-fieldset-invalid');
document.querySelector('#browser-fieldset-submit')?.click();
await new Promise((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
fieldsetInvalidFocus = fieldsetInvalidInput instanceof HTMLInputElement
  && document.activeElement === fieldsetInvalidInput;
if (!fieldsetInvalidFocus) failures.push('fieldset first invalid Form focus');
if (document.querySelector('#reference-date')?.textContent !== '2026-8-26') failures.push('reference date');
const meter = document.querySelector('[role="meter"][aria-label="Browser meter"]');
const progress = document.querySelector('[role="progressbar"][aria-label="Browser progress"]');
const group = document.querySelector('[role="group"][aria-label="Browser capacity"]');
if (meter?.getAttribute('aria-valuenow') !== '0.1') failures.push('initial meter value');
if (progress?.hasAttribute('aria-valuenow')) failures.push('indeterminate progress omission');
if (group?.getAttribute('aria-live') !== null) failures.push('group live region');
if ([...group?.querySelectorAll('[role="meter"]') ?? []].map((element) => element.getAttribute('data-id')).join(',') !== 'documents,media') {
  failures.push('initial group order');
}

document.querySelector('#update-range-projections')?.click();
await nextTick();
if (meter?.getAttribute('aria-valuenow') !== '0.2') failures.push('updated meter value');
if (progress?.getAttribute('aria-valuenow') !== '0.1') failures.push('updated progress value');
if (progress?.getAttribute('data-percentage') !== '33.333333333333') failures.push('updated progress percentage');
if ([...group?.querySelectorAll('[role="meter"]') ?? []].map((element) => element.getAttribute('data-id')).join(',') !== 'media,documents') {
  failures.push('updated group order');
}
if ([...group?.querySelectorAll('[role="meter"]') ?? []].map((element) => element.getAttribute('aria-valuenow')).join(',') !== '0.3,0.1') {
  failures.push('updated group values');
}
if (warnings.length > 0) failures.push('Vue hydration warnings');
let tabularVirtual;
try {
  tabularVirtual = await runTabularVirtualScenarios();
  for (const [scenario, evidence] of Object.entries(tabularVirtual)) if (!evidence.ok) failures.push(scenario);
} catch (error) {
  failures.push(`tabular virtual exception: ${error instanceof Error ? error.message : String(error)}`);
  tabularVirtual = Object.freeze({});
}

const result = Object.freeze({
  ok: failures.length === 0,
  failures: Object.freeze(failures),
  warnings: Object.freeze(warnings),
  userAgent: navigator.userAgent,
  rangeProjection: Object.freeze({
    meterValue: meter?.getAttribute('aria-valuenow') ?? null,
    progressValue: progress?.getAttribute('aria-valuenow') ?? null,
    groupOrder: Object.freeze([...group?.querySelectorAll('[role="meter"]') ?? []]
      .map((element) => element.getAttribute('data-id'))),
  }),
  form: Object.freeze({
    hydrated: coordinatedForm instanceof HTMLFormElement,
    mixed: coordinatedForm instanceof HTMLFormElement
      ? Object.freeze([...new FormData(coordinatedForm).entries()])
      : Object.freeze([]),
    teleported: externalInput instanceof HTMLInputElement && externalInput.form === coordinatedForm,
    invalidFocus: formInvalidFocus,
    fieldsetInvalidFocus,
    submission: document.querySelector('#browser-form-submission')?.textContent ?? '',
  }),
  text: Object.freeze({
    emailSelectionUnavailable,
    emailBeforeInputCanceled,
    emailValue: emailInput instanceof HTMLInputElement ? emailInput.value : null,
  }),
  tabularVirtual,
});
window.__SECTILE_BROWSER_RESULT__ = result;
document.documentElement.dataset.sectileVerification = result.ok ? 'passed' : 'failed';
document.querySelector('#result').textContent = JSON.stringify(result);
