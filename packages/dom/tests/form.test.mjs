import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createForm, defineFormSubmission } from '../.verification-dist/form.js';

test('DOM defineFormSubmission returns one immutable schema/handler binding', () => {
  const schema = { '~standard': { version: 1, vendor: 'test', validate: () => ({ value: {} }) } };
  const onSubmit = () => ({ ok: true });
  const submission = defineFormSubmission({ schema, onSubmit });
  assert.equal(submission.schema, schema);
  assert.equal(submission.onSubmit, onSubmit);
  assert.equal(Object.isFrozen(submission), true);
});

function installDOM() {
  const window = new Window({ url: 'https://sectile.dev/forms' });
  const previous = {
    FormData: globalThis.FormData,
    HTMLElement: globalThis.HTMLElement,
    Node: globalThis.Node,
  };
  globalThis.FormData = window.FormData;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.Node = window.Node;
  return {
    window,
    restore() {
      globalThis.FormData = previous.FormData;
      globalThis.HTMLElement = previous.HTMLElement;
      globalThis.Node = previous.Node;
      window.close();
    },
  };
}

test('DOM Form coordinates native invalid submission and accessible focus recovery', async () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const email = document.createElement('input');
    const summary = document.createElement('div');
    email.name = 'email';
    email.required = true;
    formElement.append(email, summary);
    document.body.append(formElement);

    const form = createForm({
      form: formElement,
      summary,
      participants: [{ id: 'email', element: email }],
    });

    formElement.requestSubmit();
    await Promise.resolve();

    assert.equal(form.state.validationStatus, 'invalid');
    assert.equal(form.state.submissionStatus, 'idle');
    assert.equal(form.state.submitCount, 1);
    assert.equal(form.state.fields[0].touched, true);
    assert.equal(form.state.fields[0].issues[0].source, 'native');
    assert.equal(document.activeElement, email);
    assert.equal(summary.hidden, false);
    assert.notEqual(summary.textContent.trim(), '');
    assert.equal(formElement.dataset.scope, 'form');
    assert.equal(email.dataset.part, 'field');
  } finally {
    dom.restore();
  }
});

test('DOM Form reads successful native controls through FormData and observes submission lifecycle', () => {
  const dom = installDOM();
  try {
    const { document, Event } = dom.window;
    const formElement = document.createElement('form');
    const email = document.createElement('input');
    const ignored = document.createElement('input');
    email.name = 'email';
    email.value = 'team@sectile.dev';
    ignored.value = 'browser omits unnamed controls';
    formElement.append(email, ignored);
    document.body.append(formElement);
    let entries = [];
    let values;

    const form = createForm({
      form: formElement,
      participants: [{ id: 'email', element: email }],
      onSubmit(details) {
        details.event.preventDefault();
        entries = [...details.formData.entries()];
        values = details.values;
      },
    });

    email.value = 'release@sectile.dev';
    email.dispatchEvent(new Event('input', { bubbles: true }));
    formElement.requestSubmit();

    assert.deepEqual(entries, [['email', 'release@sectile.dev']]);
    assert.equal(values.email, 'release@sectile.dev');
    assert.equal(form.state.fields[0].dirty, true);
    assert.equal(form.state.validationStatus, 'valid');
    assert.equal(form.state.submissionStatus, 'succeeded');
  } finally {
    dom.restore();
  }
});

test('DOM Form owns async managed submission, duplicate suppression, and server failure', async () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const email = document.createElement('input');
    email.name = 'email';
    email.value = 'taken@sectile.dev';
    formElement.append(email);
    document.body.append(formElement);
    let resolveSubmission;
    let submissions = 0;

    const form = createForm({
      form: formElement,
      participants: [{ id: 'email', element: email }],
      onSubmit() {
        submissions += 1;
        return new Promise((resolve) => { resolveSubmission = resolve; });
      },
    });

    formElement.requestSubmit();
    formElement.requestSubmit();
    assert.equal(submissions, 1);
    assert.equal(form.state.submissionStatus, 'submitting');

    resolveSubmission({
      ok: false,
      issues: [{
        id: 'email:taken',
        fieldId: 'email',
        source: 'form',
        message: 'This email is already registered.',
      }],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(form.state.submissionStatus, 'failed');
    assert.equal(form.state.fields[0].issues[0].source, 'server');
    assert.equal(document.activeElement, email);
  } finally {
    dom.restore();
  }
});

test('DOM Form maps thrown managed submission errors without exposing the reason', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    document.body.append(formElement);

    const form = createForm({
      form: formElement,
      onSubmit() { throw new Error('secret service detail'); },
      mapSubmitError: () => [{
        id: 'server:unavailable',
        message: 'Please try again.',
        source: 'server',
      }],
    });

    formElement.requestSubmit();

    assert.equal(form.state.submissionStatus, 'failed');
    assert.deepEqual(form.state.issues.map((issue) => issue.message), ['Please try again.']);
  } finally {
    dom.restore();
  }
});

test('DOM Form ignores managed submission completion after reset or destroy', async () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const firstElement = document.createElement('form');
    const secondElement = document.createElement('form');
    document.body.append(firstElement, secondElement);
    let resolveResetSubmission;
    let resolveDestroyedSubmission;
    const resetForm = createForm({
      form: firstElement,
      onSubmit: () => new Promise((resolve) => { resolveResetSubmission = resolve; }),
    });
    const destroyedForm = createForm({
      form: secondElement,
      onSubmit: () => new Promise((resolve) => { resolveDestroyedSubmission = resolve; }),
    });

    firstElement.requestSubmit();
    secondElement.requestSubmit();
    assert.equal(resetForm.state.submissionStatus, 'submitting');
    assert.equal(destroyedForm.state.submissionStatus, 'submitting');

    resetForm.reset();
    const destroyedRevision = destroyedForm.getSnapshot().revision;
    destroyedForm.destroy();
    resolveResetSubmission({ ok: true });
    resolveDestroyedSubmission({ ok: false });
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(resetForm.state.submissionStatus, 'idle');
    assert.equal(resetForm.state.submitCount, 0);
    assert.equal(destroyedForm.getSnapshot().revision, destroyedRevision);
  } finally {
    dom.restore();
  }
});

test('DOM Form rejects completion from a submission invalidated by reset', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    document.body.append(formElement);
    const form = createForm({ form: formElement });

    formElement.requestSubmit();
    const generation = form.submitStarted();
    assert.equal(typeof generation, 'number');
    form.reset();
    assert.equal(form.submitSucceeded(generation), false);

    formElement.requestSubmit();
    const nextGeneration = form.submitStarted();
    assert.notEqual(nextGeneration, generation);
    assert.equal(form.submitSucceeded(generation), false);
    assert.equal(form.submitSucceeded(nextGeneration), true);
  } finally {
    dom.restore();
  }
});

test('DOM Form derives nested values from the exact submitter-aware successful controls', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const email = document.createElement('input');
    const city = document.createElement('input');
    const firstTag = document.createElement('input');
    const secondTag = document.createElement('input');
    const disabled = document.createElement('input');
    const submitter = document.createElement('button');
    email.name = 'profile.email';
    email.value = 'team@sectile.dev';
    city.name = 'addresses[0].city';
    city.value = 'Seoul';
    firstTag.name = 'tags';
    firstTag.value = 'vue';
    secondTag.name = 'tags';
    secondTag.value = 'a11y';
    disabled.name = 'ignored';
    disabled.value = 'not successful';
    disabled.disabled = true;
    submitter.type = 'submit';
    submitter.name = 'intent.action';
    submitter.value = 'save';
    formElement.append(email, city, firstTag, secondTag, disabled, submitter);
    document.body.append(formElement);
    let details;

    createForm({
      form: formElement,
      onSubmit(next) {
        next.event.preventDefault();
        details = next;
      },
    });

    formElement.requestSubmit(submitter);

    assert.equal(details.submitter, submitter);
    assert.deepEqual([...details.formData.entries()], [
      ['profile.email', 'team@sectile.dev'],
      ['addresses[0].city', 'Seoul'],
      ['tags', 'vue'],
      ['tags', 'a11y'],
      ['intent.action', 'save'],
    ]);
    assert.equal(details.values.profile.email, 'team@sectile.dev');
    assert.equal(details.values.addresses[0].city, 'Seoul');
    assert.deepEqual(details.values.tags, ['vue', 'a11y']);
    assert.equal(details.values.intent.action, 'save');
    assert.equal('ignored' in details.values, false);
  } finally {
    dom.restore();
  }
});

test('DOM Form preserves files and native omissions without registering unwrapped controls', () => {
  const dom = installDOM();
  try {
    const { DataTransfer, File, document } = dom.window;
    const formElement = document.createElement('form');
    const avatar = document.createElement('input');
    const unchecked = document.createElement('input');
    const unnamed = document.createElement('textarea');
    avatar.type = 'file';
    avatar.name = 'profile.avatar';
    unchecked.type = 'checkbox';
    unchecked.name = 'notifications';
    unchecked.value = 'email';
    unnamed.value = 'browser omits unnamed controls';
    const transfer = new DataTransfer();
    transfer.items.add(new File(['avatar'], 'avatar.txt', { type: 'text/plain' }));
    avatar.files = transfer.files;
    formElement.append(avatar, unchecked, unnamed);
    document.body.append(formElement);
    let details;

    const form = createForm({
      form: formElement,
      onSubmit(next) {
        next.event.preventDefault();
        details = next;
      },
    });

    formElement.requestSubmit();

    const file = details.values.profile.avatar;
    assert.ok(file instanceof File);
    assert.equal(file.name, 'avatar.txt');
    assert.equal(file.size, 6);
    assert.deepEqual([...details.formData.keys()], ['profile.avatar']);
    assert.equal('notifications' in details.values, false);
    assert.equal(form.state.fields.length, 0);
  } finally {
    dom.restore();
  }
});

test('DOM Form defers Standard Schema until submit and revalidates failed submission on input', () => {
  const dom = installDOM();
  try {
    const { document, Event } = dom.window;
    const formElement = document.createElement('form');
    const code = document.createElement('input');
    code.name = 'code';
    code.value = '12345678';
    formElement.append(code);
    document.body.append(formElement);
    let validations = 0;
    let submitted;

    const form = createForm({
      form: formElement,
      participants: [{ id: 'code', element: code, name: 'code' }],
      schema: {
        '~standard': {
          version: 1,
          vendor: 'test',
          validate(value) {
            validations += 1;
            return value.code.length === 10
              ? { value: { code: Number(value.code) } }
              : { issues: [{ path: ['code'], message: 'Enter exactly ten digits.' }] };
          },
        },
      },
      onSubmit(payload) {
        payload.event.preventDefault();
        submitted = payload.values;
      },
    });

    code.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(validations, 0);
    assert.equal(form.state.validationStatus, 'idle');

    formElement.requestSubmit();
    assert.equal(validations, 1);
    assert.equal(form.state.validationStatus, 'invalid');
    assert.equal(form.state.fields[0].issues[0].source, 'schema');

    code.value = '1234567890';
    code.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(validations, 2);
    assert.equal(form.state.validationStatus, 'valid');

    formElement.requestSubmit();
    assert.equal(validations, 3);
    assert.deepEqual(submitted, { code: 1234567890 });
  } finally {
    dom.restore();
  }
});

test('DOM Form keeps field, semantic, focus, validation, and submission targets distinct', async () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const field = document.createElement('div');
    const semanticControl = document.createElement('div');
    const focusTarget = document.createElement('button');
    const validationTarget = document.createElement('input');
    const submission = document.createElement('input');
    validationTarget.required = true;
    submission.type = 'hidden';
    submission.name = 'profile.preference';
    submission.value = 'compact';
    field.append(semanticControl, focusTarget, validationTarget, submission);
    formElement.append(field);
    document.body.append(formElement);

    const form = createForm({
      form: formElement,
      validate: (_values, context) => ({
        issues: context.intent === 'submission'
          ? [{ path: ['profile', 'preference'], message: 'Choose a preference.' }]
          : [],
      }),
    });
    form.registerParticipant({
      id: 'preference',
      element: field,
      semanticControl,
      focusTarget,
      validationTarget,
      submissionElements: [submission],
      name: ['profile', 'preference'],
    });

    formElement.requestSubmit();
    await Promise.resolve();

    assert.equal(form.state.fields[0].name, 'profile.preference');
    assert.deepEqual(
      form.state.fields[0].issues.map((issue) => issue.source),
      ['native', 'validate'],
    );
    assert.equal(document.activeElement, focusTarget);
  } finally {
    dom.restore();
  }
});

test('DOM Form focuses the summary when invalid issues have no focusable field owner', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const summary = document.createElement('div');
    formElement.append(summary);
    document.body.append(formElement);
    const form = createForm({
      form: formElement,
      summary,
      validate: () => ({ issues: [{ message: 'Review the entire form.' }] }),
    });

    formElement.requestSubmit();

    assert.equal(form.state.validationStatus, 'invalid');
    assert.equal(document.activeElement, summary);
    assert.equal(summary.textContent, 'Review the entire form.');
  } finally {
    dom.restore();
  }
});

test('DOM Form preserves document order and delegates reset to participants and native controls', () => {
  const dom = installDOM();
  try {
    const { document, Event } = dom.window;
    const formElement = document.createElement('form');
    const first = document.createElement('input');
    const second = document.createElement('input');
    first.name = 'first';
    first.defaultValue = 'initial';
    first.value = 'initial';
    second.name = 'second';
    formElement.append(first, second);
    document.body.append(formElement);
    const resets = [];
    const form = createForm({ form: formElement });

    form.registerParticipant({ id: 'second', element: second, reset: () => resets.push('second') });
    form.registerParticipant({ id: 'first', element: first, reset: () => resets.push('first') });
    assert.deepEqual(form.state.fields.map((field) => field.id), ['first', 'second']);

    first.value = 'changed';
    first.dispatchEvent(new Event('input', { bubbles: true }));
    first.dispatchEvent(new Event('blur'));
    assert.equal(form.state.dirty, true);
    assert.equal(form.state.touched, true);

    first.value = 'initial';
    first.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(form.state.dirty, false);
    assert.equal(form.state.touched, true);

    first.value = 'changed';
    first.dispatchEvent(new Event('input', { bubbles: true }));

    form.reset();
    assert.equal(first.value, 'initial');
    assert.deepEqual(resets, ['first', 'second']);
    assert.equal(form.state.validationStatus, 'idle');
    assert.equal(form.state.submissionStatus, 'idle');
    assert.equal(form.state.dirty, false);
    assert.equal(form.state.touched, false);
    assert.equal(form.state.submitCount, 0);
  } finally {
    dom.restore();
  }
});

test('DOM Form reinitializes the current participant values as a reversible dirty baseline', () => {
  const dom = installDOM();
  try {
    const { document, Event } = dom.window;
    const formElement = document.createElement('form');
    const input = document.createElement('input');
    input.name = 'email';
    input.value = 'before@sectile.dev';
    formElement.append(input);
    document.body.append(formElement);
    const form = createForm({
      form: formElement,
      participants: [{ id: 'email', element: input }],
    });

    input.value = 'after@sectile.dev';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('blur'));
    assert.equal(form.state.dirty, true);
    assert.equal(form.state.touched, true);

    form.reinitialize();
    assert.equal(form.state.dirty, false);
    assert.equal(form.state.touched, false);

    input.value = 'before@sectile.dev';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(form.state.dirty, true);

    input.value = 'after@sectile.dev';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(form.state.dirty, false);
  } finally {
    dom.restore();
  }
});

test('DOM Form supports custom value snapshots and comparators', () => {
  const dom = installDOM();
  try {
    const { document, Event } = dom.window;
    const formElement = document.createElement('form');
    const control = document.createElement('button');
    control.type = 'button';
    formElement.append(control);
    document.body.append(formElement);
    let value = ['alpha'];
    const form = createForm({
      form: formElement,
      participants: [{
        id: 'tags',
        element: control,
        getValue: () => [...value],
        isValueEqual: (current, baseline) => (
          Array.isArray(current)
          && Array.isArray(baseline)
          && current.join('|') === baseline.join('|')
        ),
      }],
    });

    value = ['alpha', 'beta'];
    control.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(form.state.dirty, true);

    value = ['alpha'];
    control.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(form.state.dirty, false);
  } finally {
    dom.restore();
  }
});

test('submit payload reinitialize commits only after a successful submission', async () => {
  const dom = installDOM();
  try {
    const { document, Event } = dom.window;
    const formElement = document.createElement('form');
    const input = document.createElement('input');
    input.name = 'name';
    input.value = 'before';
    formElement.append(input);
    document.body.append(formElement);
    let resolveSubmission;
    const form = createForm({
      form: formElement,
      participants: [{ id: 'name', element: input }],
      onSubmit(payload) {
        payload.reinitialize();
        return new Promise((resolve) => { resolveSubmission = resolve; });
      },
    });
    input.value = 'after';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    formElement.requestSubmit();
    assert.equal(form.state.dirty, true);

    resolveSubmission({ ok: true });
    await Promise.resolve();
    assert.equal(form.state.dirty, false);
    assert.equal(form.state.submissionStatus, 'idle');
  } finally {
    dom.restore();
  }
});

test('DOM Form updates duplicate participant ids in place and unregisters explicitly', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const first = document.createElement('input');
    const replacement = document.createElement('input');
    formElement.append(first, replacement);
    document.body.append(formElement);
    const form = createForm({ form: formElement });

    form.registerParticipant({ id: 'field', element: first, name: 'before' });
    const unregister = form.registerParticipant({ id: 'field', element: replacement, name: 'after' });

    assert.equal(form.state.fields.length, 1);
    assert.equal(form.state.fields[0].name, 'after');
    unregister();
    assert.equal(form.state.fields.length, 0);
  } finally {
    dom.restore();
  }
});

test('DOM Form turns malformed value shapes into safe form issues without losing FormData', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const profile = document.createElement('input');
    const email = document.createElement('input');
    profile.name = 'profile';
    profile.value = 'leaf';
    email.name = 'profile.email';
    email.value = 'nested@sectile.dev';
    formElement.append(profile, email);
    document.body.append(formElement);
    let submitted = false;

    const form = createForm({
      form: formElement,
      onSubmit() { submitted = true; },
    });

    formElement.requestSubmit();

    assert.equal(submitted, false);
    assert.equal(form.state.validationStatus, 'invalid');
    assert.equal(form.state.issues.length, 1);
    assert.equal(form.state.issues[0].source, 'validate');
    assert.deepEqual([...form.getFormData().entries()], [
      ['profile', 'leaf'],
      ['profile.email', 'nested@sectile.dev'],
    ]);
  } finally {
    dom.restore();
  }
});

test('DOM Form constructs prototype-sensitive native names without mutating prototypes', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const proto = document.createElement('input');
    const constructor = document.createElement('input');
    proto.name = '__proto__.polluted';
    proto.value = 'no';
    constructor.name = 'constructor.prototype.changed';
    constructor.value = 'still no';
    formElement.append(proto, constructor);
    document.body.append(formElement);
    let values;

    createForm({
      form: formElement,
      onSubmit(payload) { values = payload.values; },
    });

    formElement.requestSubmit();

    assert.equal(Object.getPrototypeOf(values), null);
    assert.equal(values.__proto__.polluted, 'no');
    assert.equal(values.constructor.prototype.changed, 'still no');
    assert.equal(Object.prototype.polluted, undefined);
    assert.equal(Object.prototype.changed, undefined);
  } finally {
    dom.restore();
  }
});

test('DOM Form routes descendant issues to the longest registered field path', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const profile = document.createElement('div');
    const email = document.createElement('input');
    email.name = 'profile.email';
    email.value = 'team@sectile.dev';
    profile.append(email);
    formElement.append(profile);
    document.body.append(formElement);

    const form = createForm({
      form: formElement,
      participants: [
        { id: 'profile', element: profile, name: 'profile' },
        { id: 'email', element: email, name: 'profile.email' },
      ],
      validate: () => ({
        issues: [
          { path: ['profile', 'email', 'domain'], message: 'Use an approved domain.' },
          { path: ['unowned'], message: 'Review the form.' },
        ],
      }),
    });

    formElement.requestSubmit();

    assert.equal(form.state.fields.find((field) => field.id === 'profile').issues.length, 0);
    assert.equal(form.state.fields.find((field) => field.id === 'email').issues.length, 1);
    assert.equal(form.state.issues.length, 1);
    assert.equal(document.activeElement, email);
  } finally {
    dom.restore();
  }
});

test('DOM Form observes and refreshes registered out-of-tree controls exactly once', () => {
  const dom = installDOM();
  try {
    const { document, Event } = dom.window;
    const formElement = document.createElement('form');
    const external = document.createElement('input');
    formElement.id = 'settings';
    external.setAttribute('form', 'settings');
    external.name = 'email';
    external.value = 'outside@sectile.dev';
    document.body.append(formElement, external);
    const form = createForm({ form: formElement });
    form.registerParticipant({ id: 'external', element: external });

    external.value = 'changed@sectile.dev';
    external.dispatchEvent(new Event('input', { bubbles: true }));
    external.dispatchEvent(new Event('blur'));
    assert.equal(form.state.fields[0].dirty, true);
    assert.equal(form.state.fields[0].touched, true);
    assert.deepEqual([...form.getFormData().entries()], [['email', 'changed@sectile.dev']]);

    external.name = 'account.email';
    assert.equal(form.refreshParticipant('external'), true);
    assert.equal(form.state.fields[0].name, 'account.email');
    assert.equal(form.state.fields[0].dirty, true);
    assert.equal(form.state.fields[0].touched, true);

    const revision = form.getSnapshot().revision;
    form.destroy();
    external.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(form.getSnapshot().revision, revision);
  } finally {
    dom.restore();
  }
});

test('DOM Form resumes one async-gated native submission with the original submitter', async () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const submitter = document.createElement('button');
    submitter.type = 'submit';
    submitter.name = 'intent';
    submitter.value = 'publish';
    formElement.action = '/releases';
    formElement.method = 'post';
    formElement.enctype = 'multipart/form-data';
    formElement.target = 'release-frame';
    formElement.append(submitter);
    document.body.append(formElement);
    let resolveValidation;
    let validationCalls = 0;
    const events = [];

    const form = createForm({
      form: formElement,
      validate: () => {
        validationCalls += 1;
        return new Promise((resolve) => { resolveValidation = resolve; });
      },
    });
    formElement.addEventListener('submit', (event) => {
      events.push({ prevented: event.defaultPrevented, submitter: event.submitter });
    });

    formElement.requestSubmit(submitter);
    formElement.requestSubmit(submitter);
    assert.equal(validationCalls, 1);
    assert.equal(form.state.validationStatus, 'validating');
    assert.deepEqual(events.map((event) => event.prevented), [true, true]);

    resolveValidation({});
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(validationCalls, 1);
    assert.equal(form.state.validationStatus, 'valid');
    assert.equal(form.state.submitCount, 1);
    assert.equal(events.length, 3);
    assert.equal(events[2].prevented, false);
    assert.equal(events[2].submitter, submitter);
    assert.equal(formElement.getAttribute('action'), '/releases');
    assert.equal(formElement.method, 'post');
    assert.equal(formElement.enctype, 'multipart/form-data');
    assert.equal(formElement.target, 'release-frame');
  } finally {
    dom.restore();
  }
});

test('DOM Form skips native constraints for novalidate submitters but keeps custom validation', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const required = document.createElement('input');
    const submitter = document.createElement('button');
    required.name = 'email';
    required.required = true;
    submitter.type = 'submit';
    submitter.formNoValidate = true;
    formElement.append(required, submitter);
    document.body.append(formElement);
    let customValidations = 0;
    let submissions = 0;

    const form = createForm({
      form: formElement,
      participants: [{ id: 'email', element: required }],
      validate: () => {
        customValidations += 1;
        return { issues: [{ path: 'email', message: 'Application validation still runs.' }] };
      },
      onSubmit: () => { submissions += 1; },
    });

    formElement.requestSubmit(submitter);

    assert.equal(customValidations, 1);
    assert.equal(submissions, 0);
    assert.equal(form.state.validationStatus, 'invalid');
    assert.deepEqual(form.state.fields[0].issues.map((issue) => issue.source), ['validate']);
  } finally {
    dom.restore();
  }
});

test('DOM Form reset invalidates async validation and prevents native resumption', async () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    document.body.append(formElement);
    let resolveValidation;
    let submits = 0;
    const form = createForm({
      form: formElement,
      validate: () => new Promise((resolve) => { resolveValidation = resolve; }),
    });
    formElement.addEventListener('submit', () => { submits += 1; });

    formElement.requestSubmit();
    assert.equal(form.state.validationStatus, 'validating');
    form.reset();
    resolveValidation({});
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(submits, 1);
    assert.equal(form.state.validationStatus, 'idle');
    assert.equal(form.state.submissionStatus, 'idle');
    assert.equal(form.state.submitCount, 0);
  } finally {
    dom.restore();
  }
});
