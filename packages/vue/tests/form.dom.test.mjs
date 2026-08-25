import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { Window } from 'happy-dom';

const browserWindow = new Window({ url: 'https://sectile.dev/account' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  HTMLButtonElement: browserWindow.HTMLButtonElement,
  HTMLFormElement: browserWindow.HTMLFormElement,
  HTMLInputElement: browserWindow.HTMLInputElement,
  HTMLSelectElement: browserWindow.HTMLSelectElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  InputEvent: browserWindow.InputEvent,
  SubmitEvent: browserWindow.SubmitEvent,
  FormData: browserWindow.FormData,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, defineComponent, h, mergeProps, nextTick, ref } = await import('vue');
const {
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  FormReset,
  FormRoot,
  FormSubmit,
  FormSummary,
  useFormControl,
} = await import('../dist/form.js');
const { CheckboxRoot } = await import('../dist/checkbox.js');
const { CheckboxGroupRoot } = await import('../dist/checkbox-group.js');
const { CalendarRoot } = await import('../dist/calendar.js');
const { ColorPickerRoot } = await import('../dist/color-picker.js');
const { DateRangeFieldEndInput, DateRangeFieldRoot, DateRangeFieldStartInput } = await import('../dist/date-range-field.js');
const {
  DateRangePickerContent,
  DateRangePickerEndInput,
  DateRangePickerRoot,
  DateRangePickerStartInput,
  DateRangePickerTrigger,
} = await import('../dist/date-range-picker.js');
const { EditableInput, EditablePreview, EditableRoot } = await import('../dist/editable.js');
const { ListboxRoot } = await import('../dist/listbox.js');
const { MultiThumbSliderRoot } = await import('../dist/multi-thumb-slider.js');
const { PinInputInput, PinInputRoot } = await import('../dist/pin-input.js');
const { RadioGroupRoot } = await import('../dist/radio-group.js');
const {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} = await import('../dist/select.js');
const { SliderRoot } = await import('../dist/slider.js');
const { SpinButtonInput, SpinButtonRoot } = await import('../dist/spin-button.js');
const { SwitchRoot } = await import('../dist/switch.js');
const { TagsInputInput, TagsInputRoot } = await import('../dist/tags-input.js');
const { TextField } = await import('../dist/text.js');
const { TimeRangeFieldEndInput, TimeRangeFieldRoot, TimeRangeFieldStartInput } = await import('../dist/time-range-field.js');
const { ToggleGroupRoot } = await import('../dist/toggle-group.js');
const { formValueControlInventory } = await import('../dist/internal/form-control-inventory.js');

test('nested Form controls mount without a reactive render loop', () => {
  const fixture = fileURLToPath(new URL('./fixtures/form-nested-mount.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [fixture], {
    encoding: 'utf8',
    timeout: 3_000,
  });

  assert.equal(result.error?.code, undefined, result.error?.message);
  assert.equal(result.signal, null, `fixture terminated with ${result.signal}`);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('Vue Form value-control inventory is an explicit integration ratchet', () => {
  assert.deepEqual(Object.keys(formValueControlInventory), [
    'TextField',
    'NumberField',
    'CheckboxRoot',
    'SwitchRoot',
    'CheckboxGroupRoot',
    'RadioGroupRoot',
    'ListboxRoot',
    'SelectRoot',
    'ComboboxRoot',
    'CascadeSelectRoot',
    'RatingRoot',
    'ToggleGroupRoot',
    'EditableRoot',
    'TagsInputRoot',
    'PinInputRoot',
    'SpinButtonRoot',
    'QuantityFieldRoot',
    'DateField',
    'DateTimeField',
    'TimeField',
    'DateRangeFieldRoot',
    'TimeRangeFieldRoot',
    'SliderRoot',
    'MultiThumbSliderRoot',
    'ColorPickerRoot',
    'CalendarRoot',
    'RangeCalendarRoot',
    'DatePickerRoot',
    'DateRangePickerRoot',
    'DateTimePickerRoot',
    'DateTimeRangePickerRoot',
    'MonthPickerRoot',
    'MonthRangePickerRoot',
    'YearPickerRoot',
    'YearRangePickerRoot',
  ]);
  assert.equal(
    Object.values(formValueControlInventory)
      .filter(({ phase }) => phase === 'simple')
      .every(({ family }) => family !== 'compound'),
    true,
  );
});

test('Vue Form coordinates native validation, focus, FormData, and reset without owning values', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const submissions = [];
  const states = [];
  const app = createApp({
    render: () => h(FormRoot, {
      onSubmit: (event) => {
        event.preventDefault();
        submissions.push([...event.formData.entries()]);
      },
      onStateChange: (state) => states.push(state),
    }, {
      default: () => [
        h(FormSummary),
        h(FormField, { id: 'email', name: ['account', 'email'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Email' }),
            h(FormDescription, null, { default: () => 'Account email' }),
            h('input', {
              type: 'email',
              defaultValue: 'initial@sectile.dev',
            }),
            h(FormMessage),
          ],
        }),
        h(FormReset, null, { default: () => 'Reset' }),
        h(FormSubmit, null, { default: () => 'Save' }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const form = host.querySelector('form');
  const input = host.querySelector('input');
  const summary = host.querySelector('[data-part="summary"]');
  assert.ok(form instanceof HTMLFormElement);
  assert.ok(input instanceof HTMLInputElement);
  assert.equal(input.id, 'email-control');
  assert.equal(input.name, 'account.email');
  assert.equal(input.required, true);
  assert.equal(input.getAttribute('aria-describedby'), 'email-description email-message');

  input.value = '';
  form.requestSubmit();
  await Promise.resolve();
  await nextTick();
  assert.equal(document.activeElement?.id, input.id);
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.equal(summary.hidden, false);
  assert.equal(submissions.length, 0);
  assert.equal(states.some((state) => state.validationStatus === 'invalid'), true);

  input.value = 'release@sectile.dev';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  form.requestSubmit();
  await nextTick();
  assert.deepEqual(submissions, [[['account.email', 'release@sectile.dev']]]);

  const reset = host.querySelector('[data-part="reset"]');
  assert.ok(reset instanceof HTMLButtonElement);
  reset.click();
  await nextTick();
  assert.equal(input.value, 'initial@sectile.dev');
  assert.equal(states.at(-1).validationStatus, 'idle');
  assert.equal(states.at(-1).submissionStatus, 'idle');

  app.unmount();
  host.remove();
});

test('Vue Form owns async submission success and failure lifecycle', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  let mode = 'pending';
  let resolveSubmission;
  const handler = (event) => {
    event.preventDefault();
    if (mode === 'pending') {
      return new Promise((resolve) => { resolveSubmission = resolve; });
    }
    if (mode === 'field-error') {
      return {
        ok: false,
        issues: [{ id: 'email-taken', fieldId: 'email', message: 'Email already in use.' }],
      };
    }
    return Promise.reject(new Error('Network unavailable.'));
  };
  const app = createApp({
    render: () => h(FormRoot, { onSubmit: handler }, {
      default: () => [
        h(FormSummary),
        h(FormField, { id: 'email', name: 'email' }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Email' }),
            h(TextField, { defaultValue: 'mina@sectile.dev' }),
            h(FormMessage),
          ],
        }),
        h(FormSubmit, null, { default: () => 'Save' }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();
  const form = host.querySelector('form');
  const input = host.querySelector('input');
  const message = host.querySelector('[data-part="message"]');
  const summary = host.querySelector('[data-part="summary"]');
  assert.ok(form instanceof HTMLFormElement);
  assert.ok(input instanceof HTMLInputElement);
  assert.ok(message instanceof HTMLElement);
  assert.ok(summary instanceof HTMLElement);

  form.requestSubmit();
  await nextTick();
  assert.equal(form.dataset.submissionStatus, 'submitting');
  resolveSubmission();
  await Promise.resolve();
  await nextTick();
  assert.equal(form.dataset.submissionStatus, 'succeeded');

  mode = 'field-error';
  form.requestSubmit();
  await nextTick();
  assert.equal(form.dataset.submissionStatus, 'failed');
  assert.equal(message.textContent, 'Email already in use.');
  assert.equal(summary.hidden, false);
  assert.equal(document.activeElement, input);

  mode = 'reject';
  form.requestSubmit();
  await Promise.resolve();
  await nextTick();
  assert.equal(form.dataset.submissionStatus, 'failed');
  assert.match(summary.textContent ?? '', /Network unavailable/);

  app.unmount();
  host.remove();
});

test('Vue FormField uses native fieldset semantics and preserves explicit child metadata', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => h(FormField, {
        id: 'channels',
        name: 'channels',
        required: true,
        disabled: true,
      }, {
        default: () => h('fieldset', null, [
          h(FormLabel, null, { default: () => 'Channels' }),
          h(FormDescription, null, { default: () => 'Choose notification channels.' }),
          h('input', { id: 'explicit-email', name: 'explicit-channel', type: 'checkbox', value: 'email' }),
          h('input', { type: 'checkbox', value: 'sms' }),
        ]),
      }),
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const fieldset = host.querySelector('fieldset');
  const legend = host.querySelector('legend');
  const inputs = [...host.querySelectorAll('input')];
  assert.ok(fieldset instanceof browserWindow.HTMLFieldSetElement);
  assert.ok(legend instanceof browserWindow.HTMLLegendElement);
  assert.equal(legend.hasAttribute('for'), false);
  assert.equal(fieldset.getAttribute('aria-required'), 'true');
  assert.equal(fieldset.getAttribute('aria-describedby'), 'channels-description channels-message');
  assert.equal(fieldset.disabled, true);
  assert.equal(inputs[0].id, 'explicit-email');
  assert.equal(inputs[0].name, 'explicit-channel');
  assert.equal(inputs[1].name, 'channels');

  app.unmount();
  host.remove();
});

test('native fallback prefers a visible control over hidden submission elements', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => h(FormField, { id: 'search', name: 'query' }, {
        default: () => [
          h(FormLabel, null, { default: () => 'Search' }),
          h('input', { name: 'source', type: 'hidden', value: 'metadata' }),
          h('input', { type: 'search' }),
        ],
      }),
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const hidden = host.querySelector('input[type="hidden"]');
  const search = host.querySelector('input[type="search"]');
  const label = host.querySelector('label');
  assert.ok(hidden instanceof HTMLInputElement);
  assert.ok(search instanceof HTMLInputElement);
  assert.ok(label instanceof browserWindow.HTMLLabelElement);
  assert.equal(search.id, 'search-control');
  assert.equal(label.htmlFor, search.id);
  assert.equal(hidden.id, '');
  assert.equal(hidden.name, 'source');
  assert.equal(search.name, 'query');

  app.unmount();
  host.remove();
});

test('useFormControl maps compound semantics and nested submission names to separate elements', async () => {
  const CompoundControl = defineComponent({
    name: 'CompoundControl',
    inheritAttrs: false,
    setup(_, { attrs }) {
      const semantic = ref(null);
      const hidden = ref(null);
      const participation = useFormControl({
        element: semantic,
        semanticControl: semantic,
        focusTarget: semantic,
        labelMode: 'labelledby',
        capabilities: {
          id: true,
          describedBy: true,
          invalid: true,
          labelledBy: true,
        },
        submissions: [{
          element: hidden,
          relativeName: 'value',
          capabilities: { name: true, form: true, disabled: true },
        }],
      });
      return () => h('div', mergeProps(participation.controlProps.value, attrs, {
        ref: semantic,
        role: 'group',
        tabindex: 0,
      }), [h('input', { ref: hidden, type: 'hidden', value: 'release' })]);
    },
  });
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => h(FormField, {
        id: 'channel',
        name: ['notifications', 0],
        required: true,
        readonly: true,
      }, {
        default: () => [
          h(FormLabel, null, { default: () => 'Channel' }),
          h(FormDescription, null, { default: () => 'Primary notification channel.' }),
          h(CompoundControl),
        ],
      }),
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const semantic = host.querySelector('[role="group"]');
  const hidden = host.querySelector('input[type="hidden"]');
  const label = host.querySelector('[data-part="label"]');
  assert.ok(semantic instanceof HTMLElement);
  assert.ok(hidden instanceof HTMLInputElement);
  assert.ok(label instanceof HTMLElement);
  assert.equal(label.tagName, 'SPAN');
  assert.equal(label.hasAttribute('for'), false);
  assert.equal(semantic.id, 'channel-control');
  assert.equal(semantic.getAttribute('aria-labelledby'), 'channel-label');
  assert.equal(semantic.getAttribute('aria-describedby'), 'channel-description channel-message');
  assert.equal(semantic.getAttribute('aria-required'), 'true');
  assert.equal(semantic.getAttribute('aria-readonly'), 'true');
  assert.equal(semantic.hasAttribute('name'), false);
  assert.equal(hidden.name, 'notifications[0].value');
  assert.equal(hidden.required, false);

  app.unmount();
  host.remove();
});

test('Sectile scalar and boolean controls inherit FormField metadata through their actual targets', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, { id: 'settings-form' }, {
      default: () => [
        h(FormField, { id: 'display-name', name: ['profile', 'displayName'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Display name' }),
            h(TextField, { defaultValue: 'Mina' }),
          ],
        }),
        h(FormField, { id: 'analytics', name: ['preferences', 'analytics'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Analytics' }),
            h(CheckboxRoot, { defaultValue: true, value: 'enabled' }),
          ],
        }),
        h(FormField, { id: 'notifications', name: ['preferences', 'notifications'] }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Notifications' }),
            h(SwitchRoot, { defaultValue: true, value: 'enabled' }),
          ],
        }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const text = host.querySelector('[data-scope="text"]');
  const checkbox = host.querySelector('[role="checkbox"]');
  const switchControl = host.querySelector('[role="switch"]');
  const hiddenInputs = [...host.querySelectorAll('input[type="checkbox"]')];
  assert.ok(text instanceof HTMLInputElement);
  assert.ok(checkbox instanceof HTMLElement);
  assert.ok(switchControl instanceof HTMLElement);
  assert.equal(text.id, 'display-name-control');
  assert.equal(text.name, 'profile.displayName');
  assert.equal(text.required, true);
  assert.equal(checkbox.getAttribute('aria-labelledby'), 'analytics-label');
  assert.equal(switchControl.getAttribute('aria-labelledby'), 'notifications-label');
  assert.deepEqual(hiddenInputs.map((input) => [input.name, input.value]), [
    ['preferences.analytics', 'enabled'],
    ['preferences.notifications', 'enabled'],
  ]);

  app.unmount();
  host.remove();
});

test('Sectile group and selection controls keep semantics separate from successful controls', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => [
        h(FormField, { id: 'channels', name: ['preferences', 'channels'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Channels' }),
            h(CheckboxGroupRoot, { defaultValue: ['email', 'sms'] }),
          ],
        }),
        h(FormField, { id: 'plan', name: ['billing', 'plan'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Plan' }),
            h(RadioGroupRoot, { items: ['starter', 'team'], defaultValue: 'team' }),
          ],
        }),
        h(FormField, { id: 'regions', name: ['deployment', 'regions'] }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Regions' }),
            h(ListboxRoot, {
              items: ['icn', 'fra'],
              selectionMode: 'multiple',
              defaultValue: ['icn', 'fra'],
            }),
          ],
        }),
        h(FormField, { id: 'environment', name: ['deployment', 'environment'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Environment' }),
            h(SelectRoot, { items: ['preview', 'production'], defaultValue: 'production' }),
          ],
        }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const roots = [...host.querySelectorAll('[data-part="root"]')];
  assert.equal(roots.every((root) => !root.hasAttribute('name')), true);
  assert.equal(host.querySelector('[data-scope="checkbox-group"]')?.getAttribute('aria-labelledby'), 'channels-label');
  assert.equal(host.querySelector('[data-scope="radio-group"]')?.getAttribute('aria-labelledby'), 'plan-label');
  assert.deepEqual(
    [...host.querySelectorAll('input[type="hidden"]')].map((input) => [input.name, input.value]),
    [
      ['preferences.channels', 'email'],
      ['preferences.channels', 'sms'],
    ],
  );
  assert.deepEqual(
    [...host.querySelectorAll('input[type="radio"]')].map((input) => [input.name, input.value, input.checked]),
    [
      ['billing.plan', 'starter', false],
      ['billing.plan', 'team', true],
    ],
  );
  assert.deepEqual(
    [...host.querySelectorAll('select')].map((select) => [select.name, select.value, select.multiple]),
    [
      ['deployment.regions', 'icn', true],
      ['deployment.environment', 'production', false],
    ],
  );

  app.unmount();
  host.remove();
});

test('TextField and Select remain editable inside a reactive FormField', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const submissions = [];
  const roles = ['member', 'admin'];
  const app = createApp({
    render: () => h(FormRoot, {
      onSubmit: (event) => {
        event.preventDefault();
        submissions.push(event.values);
      },
    }, {
      default: () => [
        h(FormField, { name: ['invitation', 'email'] }, {
          default: () => h(TextField, { defaultValue: 'alex@example.com' }),
        }),
        h(FormField, { name: ['invitation', 'role'] }, {
          default: () => h(SelectRoot, { items: roles, defaultValue: 'member' }, {
            default: () => [
              h(SelectTrigger, null, { default: () => h(SelectValue) }),
              h(SelectContent, null, {
                default: () => roles.map((role) => h(SelectItem, { value: role }, {
                  default: () => role,
                })),
              }),
            ],
          }),
        }),
        h(FormSubmit, null, { default: () => 'Invite' }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const form = host.querySelector('form');
  const email = host.querySelector('input[type="text"]');
  const trigger = host.querySelector('[data-scope="select"][data-part="trigger"]');
  const content = host.querySelector('[data-scope="select"][data-part="content"]');
  const admin = host.querySelector('[data-sectile-select-id="admin"]');
  assert.ok(form instanceof HTMLFormElement);
  assert.ok(email instanceof HTMLInputElement);
  assert.ok(trigger instanceof browserWindow.HTMLButtonElement);
  assert.ok(content instanceof HTMLElement);
  assert.ok(admin instanceof HTMLElement);

  email.value = 'mina@sectile.dev';
  email.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertReplacementText',
  }));
  await nextTick();
  assert.equal(email.value, 'mina@sectile.dev');

  trigger.click();
  await nextTick();
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  assert.equal(content.hidden, false);

  admin.click();
  await nextTick();
  assert.equal(trigger.textContent, 'admin');
  assert.equal(content.hidden, true);

  form.requestSubmit();
  await nextTick();
  assert.equal(submissions[0]?.invitation?.email, 'mina@sectile.dev');
  assert.equal(submissions[0]?.invitation?.role, 'admin');

  app.unmount();
  host.remove();
});

test('explicit control metadata wins over inherited FormField defaults', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => h(FormField, {
        id: 'inherited',
        name: 'inherited-name',
        required: true,
        disabled: true,
        readonly: true,
      }, {
        default: () => [
          h(FormLabel, null, { default: () => 'Explicit control' }),
          h(TextField, {
            id: 'explicit-control',
            name: 'explicit-name',
            required: false,
            disabled: false,
            readonly: false,
          }),
        ],
      }),
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const input = host.querySelector('[data-scope="text"]');
  const label = host.querySelector('label');
  assert.ok(input instanceof HTMLInputElement);
  assert.ok(label instanceof browserWindow.HTMLLabelElement);
  assert.equal(input.id, 'explicit-control');
  assert.equal(input.name, 'explicit-name');
  assert.equal(input.required, false);
  assert.equal(input.disabled, false);
  assert.equal(input.readOnly, false);
  assert.equal(label.htmlFor, input.id);

  app.unmount();
  host.remove();
});

test('token and toggle controls inherit metadata without naming their focus inputs', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => [
        h(FormField, { id: 'skills', name: ['profile', 'skills'] }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Skills' }),
            h(TagsInputRoot, { defaultValue: ['TypeScript', 'Accessibility'] }, {
              default: () => h(TagsInputInput),
            }),
          ],
        }),
        h(FormField, { id: 'verification', name: ['security', 'code'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Verification code' }),
            h(PinInputRoot, { length: 4, defaultValue: '7291' }, {
              default: () => Array.from({ length: 4 }, (_, index) => h(PinInputInput, { index })),
            }),
          ],
        }),
        h(FormField, { id: 'formatting', name: ['editor', 'formats'] }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Formatting' }),
            h(ToggleGroupRoot, {
              items: ['bold', 'italic'],
              multiple: true,
              defaultValue: ['bold', 'italic'],
            }),
          ],
        }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const tagsRoot = host.querySelector('[data-scope="tags-input"]');
  const tagsDraft = host.querySelector('[data-scope="tags-input"][data-part="input"]');
  const pinRoot = host.querySelector('[data-scope="pin-input"]');
  const pinDigits = [...host.querySelectorAll('[data-scope="pin-input"][data-part="input"]')];
  assert.ok(tagsRoot instanceof HTMLElement);
  assert.ok(tagsDraft instanceof HTMLInputElement);
  assert.ok(pinRoot instanceof HTMLElement);
  assert.equal(tagsRoot.getAttribute('aria-labelledby'), 'skills-label');
  assert.equal(tagsDraft.name, '');
  assert.equal(pinRoot.getAttribute('aria-required'), 'true');
  assert.equal(pinDigits.every((input) => input instanceof HTMLInputElement && input.name === ''), true);
  assert.deepEqual(
    [...host.querySelectorAll('input[type="hidden"]')].map((input) => [input.name, input.value]),
    [
      ['profile.skills', 'TypeScript'],
      ['profile.skills', 'Accessibility'],
      ['security.code', '7291'],
      ['editor.formats', 'bold'],
      ['editor.formats', 'italic'],
    ],
  );

  app.unmount();
  host.remove();
});

test('numeric and editable controls register the actual native input', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => [
        h(FormField, { id: 'quantity', name: ['order', 'quantity'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Quantity' }),
            h(SpinButtonRoot, { min: 1, max: 20, defaultValue: 4 }, {
              default: () => h(SpinButtonInput),
            }),
          ],
        }),
        h(FormField, { id: 'title', name: ['release', 'title'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Release title' }),
            h(EditableRoot, { defaultValue: 'Version 0.3' }, {
              default: () => [
                h(EditablePreview),
                h(EditableInput),
              ],
            }),
          ],
        }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const quantity = host.querySelector('[data-scope="spin-button"][data-part="input"]');
  const title = host.querySelector('[data-scope="editable"][data-part="input"]');
  assert.ok(quantity instanceof HTMLInputElement);
  assert.ok(title instanceof HTMLInputElement);
  assert.equal(quantity.id, 'quantity-control');
  assert.equal(quantity.name, 'order.quantity');
  assert.equal(quantity.required, true);
  assert.equal(title.id, 'title-control');
  assert.equal(title.name, 'release.title');
  assert.equal(title.required, true);

  app.unmount();
  host.remove();
});

test('compound range fields inherit one FormField path and submit named endpoints', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, { id: 'schedule-form' }, {
      default: () => [
        h(FormField, { id: 'dates', name: ['availability', 'dates'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Available dates' }),
            h(DateRangeFieldRoot, {
              defaultValue: {
                start: { year: 2026, month: 8, day: 22 },
                end: { year: 2026, month: 8, day: 25 },
              },
            }, {
              default: () => [h(DateRangeFieldStartInput), h(DateRangeFieldEndInput)],
            }),
          ],
        }),
        h(FormField, { id: 'hours', name: ['availability', 'hours'], required: true }, {
          default: () => [
            h(FormLabel, null, { default: () => 'Available hours' }),
            h(TimeRangeFieldRoot, {
              defaultValue: {
                start: { hour: 9, minute: 30, second: 0, millisecond: 0 },
                end: { hour: 17, minute: 30, second: 0, millisecond: 0 },
              },
            }, {
              default: () => [h(TimeRangeFieldStartInput), h(TimeRangeFieldEndInput)],
            }),
          ],
        }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const dateGroup = host.querySelector('[data-scope="date-range-field"][data-part="root"]');
  const timeGroup = host.querySelector('[data-scope="time-range-field"][data-part="root"]');
  const dateInputs = [...host.querySelectorAll('[data-scope="date-range-field"] input')];
  const timeInputs = [...host.querySelectorAll('[data-scope="time-range-field"] input')];
  assert.ok(dateGroup instanceof HTMLElement);
  assert.ok(timeGroup instanceof HTMLElement);
  assert.equal(dateGroup.getAttribute('aria-labelledby'), 'dates-label');
  assert.equal(timeGroup.getAttribute('aria-labelledby'), 'hours-label');
  assert.deepEqual(dateInputs.map((input) => input.name), [
    'availability.dates.start',
    'availability.dates.end',
  ]);
  assert.deepEqual(timeInputs.map((input) => input.name), [
    'availability.hours.start',
    'availability.hours.end',
  ]);
  assert.equal(dateInputs.every((input) => input.form?.id === 'schedule-form'), true);
  assert.equal(timeInputs.every((input) => input.form?.id === 'schedule-form'), true);
  assert.equal(dateInputs.every((input) => input.required), true);
  assert.equal(timeInputs.every((input) => input.required), true);

  app.unmount();
  host.remove();
});

test('compound picker inputs inherit endpoint paths without duplicating the field name', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, null, {
      default: () => h(FormField, {
        id: 'booking-dates',
        name: ['booking', 'dates'],
        required: true,
      }, {
        default: () => [
          h(FormLabel, null, { default: () => 'Booking dates' }),
          h(DateRangePickerRoot, {
            defaultOpen: true,
            defaultValue: {
              start: { year: 2026, month: 8, day: 22 },
              end: { year: 2026, month: 8, day: 25 },
            },
          }, {
            default: () => [
              h(DateRangePickerTrigger, null, { default: () => 'Choose dates' }),
              h(DateRangePickerStartInput),
              h(DateRangePickerEndInput),
              h(DateRangePickerContent),
            ],
          }),
        ],
      }),
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();

  const content = host.querySelector('[data-scope="date-range"][data-part="content"]');
  const start = host.querySelector('[data-part="start-input"]');
  const end = host.querySelector('[data-part="end-input"]');
  assert.ok(content instanceof HTMLElement);
  assert.ok(start instanceof HTMLInputElement);
  assert.ok(end instanceof HTMLInputElement);
  assert.equal(content.getAttribute('aria-labelledby'), 'booking-dates-label');
  assert.equal(start.name, 'booking.dates.start');
  assert.equal(end.name, 'booking.dates.end');
  assert.equal(start.required, true);
  assert.equal(end.required, true);

  app.unmount();
  host.remove();
});

const mountCompoundField = async ({ id, name, label, control }) => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(FormRoot, { id: 'filters-form' }, {
      default: () => h(FormField, { id, name, required: true }, {
        default: () => [
          h(FormLabel, null, { default: () => label }),
          control(),
        ],
      }),
    }),
  });

  app.mount(host);
  await nextTick();
  await nextTick();
  return { app, host };
};

test('slider submits a scalar value through a FormField path', async () => {
  const { app, host } = await mountCompoundField({
    id: 'traffic',
    name: ['filters', 'traffic'],
    label: 'Traffic',
    control: () => h(SliderRoot, { defaultValue: 40 }),
  });

  const root = host.querySelector('[data-scope="slider"][data-part="root"]');
  const input = host.querySelector('input[name="filters.traffic"]');
  assert.equal(root?.getAttribute('aria-labelledby'), 'traffic-label');
  assert.deepEqual([input?.name, input?.value, input?.form?.id], [
    'filters.traffic', '40', 'filters-form',
  ]);

  app.unmount();
  host.remove();
});

test('multi-thumb slider submits indexed values through a FormField path', async () => {
  const { app, host } = await mountCompoundField({
    id: 'price',
    name: ['filters', 'price'],
    label: 'Price range',
    control: () => h(MultiThumbSliderRoot, {
      thumbs: ['minimum', 'maximum'],
      defaultValue: [47, 95],
    }),
  });

  const root = host.querySelector('[data-scope="multi-thumb-slider"][data-part="root"]');
  assert.equal(root?.getAttribute('aria-labelledby'), 'price-label');
  assert.equal(root?.getAttribute('aria-required'), 'true');
  assert.deepEqual(
    [...host.querySelectorAll('input[type="hidden"]')].map((input) => [input.name, input.value]),
    [['filters.price[0]', '47'], ['filters.price[1]', '95']],
  );

  app.unmount();
  host.remove();
});

test('calendar submits a scalar value through a FormField path', async () => {
  const { app, host } = await mountCompoundField({
    id: 'release-date',
    name: ['release', 'date'],
    label: 'Release date',
    control: () => h(CalendarRoot, {
      rows: [['2026-08-22']],
      defaultValue: '2026-08-22',
      defaultHighlightedValue: '2026-08-22',
    }),
  });

  const root = host.querySelector('[data-scope="calendar"][data-part="root"]');
  const input = host.querySelector('input[type="hidden"]');
  assert.equal(root?.getAttribute('aria-labelledby'), 'release-date-label');
  assert.deepEqual([input?.name, input?.value, input?.form?.id], [
    'release.date', '2026-08-22', 'filters-form',
  ]);

  app.unmount();
  host.remove();
});

test('color picker submits a scalar value through a FormField path', async () => {
  const { app, host } = await mountCompoundField({
    id: 'accent',
    name: ['theme', 'accent'],
    label: 'Accent color',
    control: () => h(ColorPickerRoot, { defaultValue: '#5b6df6' }),
  });

  const root = host.querySelector('[data-scope="color-picker"][data-part="root"]');
  const input = host.querySelector('input[type="hidden"]');
  assert.equal(root?.getAttribute('aria-labelledby'), 'accent-label');
  assert.deepEqual([input?.name, input?.value, input?.form?.id], [
    'theme.accent', '#5b6df6', 'filters-form',
  ]);

  app.unmount();
  host.remove();
});
