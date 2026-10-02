import { createApp, createSSRApp, h, nextTick, ref } from 'vue';
import { ComboboxInput, ComboboxRoot } from '../../.verification-dist/combobox.js';
import { TextField } from '../../.verification-dist/text.js';
import { createHydrationFixture } from './hydration-fixture.mjs';
import { runConditionalPresenceScenarios } from './conditional-presence-fixture.mjs?wi=118';
import { runTreeGridEditorPresenceScenario } from './tree-grid-editor-presence-fixture.mjs?wi=118';
import { runDocumentVirtualScenarios } from './document-virtual-fixture.mjs?wi=110';
import { runHighLevelDocumentVirtualScenarios } from './high-level-document-virtual-fixture.mjs?wi=112';
import { runPopupPresenceFocusScenarios } from './popup-presence-focus-fixture.mjs';
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

let comboboxNativeEditing = Object.freeze({ ok: false, reason: 'not-run' });
{
  const host = document.createElement('div');
  document.body.append(host);
  const inputValue = ref('');
  const items = ref([
    { id: 'hangul', label: '한글' },
    { id: 'fresh', label: '후레쉬' },
  ]);
  const comboboxApp = createApp({
    render: () => h(ComboboxRoot, {
      items: items.value,
      inputValue: inputValue.value,
      policies: {
        matches: (label, query) => query.length === 0 || label.includes(query),
      },
      'onUpdate:inputValue': (value) => { inputValue.value = value; },
    }, { default: () => h(ComboboxInput) }),
  });
  comboboxApp.mount(host);
  try {
    await nextTick();
    const input = host.querySelector('input');
    if (!(input instanceof HTMLInputElement)) {
      comboboxNativeEditing = Object.freeze({ ok: false, reason: 'missing input' });
    } else {
      input.value = 'abc';
      input.setSelectionRange(3, 3);
      input.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: 'abc',
      }));
      await nextTick();
      const inserted = input.value === 'abc' && inputValue.value === 'abc';

      items.value = [...items.value, { id: 'result', label: 'abc 결과' }];
      await nextTick();
      await nextTick();
      const survivedItemsRefresh = input.value === 'abc' && inputValue.value === 'abc';

      input.value = 'ab';
      input.setSelectionRange(2, 2);
      input.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'deleteContentBackward',
      }));
      await nextTick();
      const deleted = input.value === 'ab' && inputValue.value === 'ab';

      comboboxNativeEditing = Object.freeze({
        ok: inserted && survivedItemsRefresh && deleted,
        inserted,
        survivedItemsRefresh,
        deleted,
      });
    }
  } catch (error) {
    comboboxNativeEditing = Object.freeze({
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    });
  } finally {
    comboboxApp.unmount();
    host.remove();
  }
  if (!comboboxNativeEditing.ok) failures.push('controlled combobox native editing');
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
const openHydrationDialog = document.querySelector('[data-browser-state="open"]');
if (openHydrationDialog instanceof HTMLElement) {
  openHydrationDialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await nextTick();
}
let conditionalPresence;
try {
  conditionalPresence = Object.freeze({
    ...await runConditionalPresenceScenarios(),
    'conditional-presence-tree-grid-editor-focus': await runTreeGridEditorPresenceScenario(),
  });
  for (const [scenario, evidence] of Object.entries(conditionalPresence)) if (!evidence.ok) failures.push(scenario);
} catch (error) {
  failures.push(`conditional presence exception: ${error instanceof Error ? error.message : String(error)}`);
  conditionalPresence = Object.freeze({});
}
let popupPresenceFocus;
try {
  popupPresenceFocus = await runPopupPresenceFocusScenarios();
  for (const [scenario, evidence] of Object.entries(popupPresenceFocus)) if (!evidence.ok) failures.push(scenario);
} catch (error) {
  failures.push(`popup presence focus exception: ${error instanceof Error ? error.message : String(error)}`);
  popupPresenceFocus = Object.freeze({});
}
let documentVirtual;
try {
  documentVirtual = await runDocumentVirtualScenarios();
  if (!documentVirtual.ok) failures.push('document virtual host');
} catch (error) {
  failures.push(`document virtual exception: ${error instanceof Error ? error.message : String(error)}`);
  documentVirtual = Object.freeze({ ok: false });
}
let highLevelDocumentVirtual;
try {
  highLevelDocumentVirtual = await runHighLevelDocumentVirtualScenarios();
  if (!highLevelDocumentVirtual.ok) failures.push('high-level document virtual');
} catch (error) {
  failures.push(`high-level document virtual exception: ${error instanceof Error ? error.message : String(error)}`);
  highLevelDocumentVirtual = Object.freeze({ ok: false });
}
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
  comboboxNativeEditing,
  conditionalPresence,
  popupPresenceFocus,
  documentVirtual,
  highLevelDocumentVirtual,
  tabularVirtual,
});
window.__SECTILE_BROWSER_RESULT__ = result;
console.info('Sectile browser verification:', JSON.stringify({ ok: result.ok, failures, warnings }));
console.info('Sectile document virtual:', JSON.stringify(documentVirtual));
console.info('Sectile high-level document virtual:', JSON.stringify(highLevelDocumentVirtual));
for (const [scenario, evidence] of Object.entries(conditionalPresence)) {
  console.info('Sectile conditional presence:', scenario, JSON.stringify(evidence));
}
for (const [scenario, evidence] of Object.entries(popupPresenceFocus)) {
  console.info('Sectile popup focus:', scenario, JSON.stringify(evidence));
}
document.documentElement.dataset.sectileVerification = result.ok ? 'passed' : 'failed';
document.querySelector('#result').textContent = JSON.stringify(result);

// Manual OS-IME/history checks must use trusted browser input, not dispatched events.
const manualHost = document.createElement('section');
manualHost.id = 'manual-ime';
document.body.append(manualHost);
const manualTrace = [];
const manualValues = ref({ text: '', multiline: '', combobox: '' });
const manualItems = ref([{ id: 'hangul', label: '한글 입력 확인' }]);
const manualCopyStatus = ref('');
const manualCopying = ref(false);
let manualGeneration = 0;
function showManualEvidence() {
  const payload = { userAgent: navigator.userAgent, values: manualValues.value,
    itemGeneration: manualGeneration, browserResult: result, events: manualTrace };
  const text = JSON.stringify(payload, null, 2);
  document.querySelector('#ime-evidence').textContent = text;
  return text;
}
async function copyManualEvidence() {
  if (manualCopying.value) return;
  const text = showManualEvidence();
  manualCopying.value = true;
  manualCopyStatus.value = '';
  try {
    await navigator.clipboard.writeText(text);
    manualCopyStatus.value = '검증 로그를 복사했어요. 채팅에 붙여 넣어 주세요.';
  } catch {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('#ime-evidence'));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    manualCopyStatus.value = '자동 복사가 허용되지 않았어요. 선택된 로그를 Ctrl+C로 복사해 주세요.';
  } finally {
    manualCopying.value = false;
  }
}
const manualApp = createApp({
  render: () => h('div', { style: 'padding:24px;display:grid;gap:12px;max-width:760px' }, [
    h('h2', '실제 한글 입력기 · 네이티브 실행 취소 검증 (#227)'),
    h('p', '각 칸에 한글을 직접 입력하고, 같은 순서로 실행 취소/다시 실행과 선택 영역 교체를 확인하세요. Combobox는 조합 시작 시 항목만 자동 갱신합니다.'),
    h('label', ['기준 HTML input ', h('input', { id: 'ime-native' })]),
    h('label', ['Uncontrolled TextField ', h(TextField, { id: 'ime-uncontrolled' })]),
    h('label', ['Controlled TextField ', h(TextField, {
      id: 'ime-controlled', modelValue: manualValues.value.text,
      'onUpdate:modelValue': (text) => { manualValues.value = { ...manualValues.value, text }; },
    })]),
    h('label', ['Controlled textarea ', h(TextField, {
      id: 'ime-multiline', multiline: true, modelValue: manualValues.value.multiline,
      'onUpdate:modelValue': (multiline) => { manualValues.value = { ...manualValues.value, multiline }; },
    })]),
    h('label', ['Controlled Combobox ', h(ComboboxRoot, {
      items: manualItems.value, inputValue: manualValues.value.combobox,
      'onUpdate:inputValue': (combobox) => { manualValues.value = { ...manualValues.value, combobox }; },
    }, { default: () => h(ComboboxInput, { id: 'ime-combobox' }) })]),
    h('p', `Accepted owners: ${JSON.stringify(manualValues.value)}`),
    h('div', { style: 'display:flex;flex-wrap:wrap;gap:8px' }, [
      h('button', { id: 'ime-copy', type: 'button', disabled: manualCopying.value,
        onClick: copyManualEvidence }, manualCopying.value ? '복사 중…' : '검증 로그 복사'),
      h('button', { type: 'button', onClick: showManualEvidence }, '현재 검증 로그 표시'),
    ]),
    h('p', { role: 'status', 'aria-live': 'polite' }, manualCopyStatus.value),
    h('pre', { id: 'ime-evidence', style: 'white-space:pre-wrap;overflow-wrap:anywhere' }),
  ]),
});
manualApp.mount(manualHost);
await nextTick();
for (const element of manualHost.querySelectorAll('input,textarea')) {
  const descriptor = Object.getOwnPropertyDescriptor(
    element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value',
  );
  Object.defineProperty(element, 'value', {
    configurable: true,
    get() { return descriptor.get.call(this); },
    set(value) {
      manualTrace.push({ id: this.id, type: 'script-value-write', before: descriptor.get.call(this), value });
      descriptor.set.call(this, value);
    },
  });
  for (const type of ['beforeinput', 'input', 'compositionstart', 'compositionupdate', 'compositionend']) {
    element.addEventListener(type, (event) => {
      manualTrace.push({ id: element.id, type, trusted: event.isTrusted,
        inputType: event.inputType ?? null, data: event.data ?? null,
        value: element.value, selection: [element.selectionStart, element.selectionEnd] });
      if (element.id === 'ime-combobox' && type === 'compositionstart') {
        queueMicrotask(() => {
          manualGeneration += 1;
          manualItems.value = [{ id: 'hangul', label: `한글 입력 확인 ${manualGeneration}` }];
          manualTrace.push({ id: element.id, type: 'items-only-refresh', generation: manualGeneration });
        });
      }
    });
  }
}
