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

test('DOM Form selector channels notify only affected form and field dependencies', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const email = document.createElement('input');
    const profile = document.createElement('input');
    email.name = 'email';
    profile.name = 'profile';
    formElement.append(email, profile);
    document.body.append(formElement);
    const form = createForm({
      form: formElement,
      participants: [
        { id: 'email', element: email },
        { id: 'profile', element: profile },
      ],
    });
    const dirty = [];
    const emailDirty = [];
    const profileDirty = [];
    const unsubscribeDirty = form.subscribeForm(
      (state) => state.dirty,
      (selected, previous) => dirty.push([previous, selected]),
    );
    const unsubscribeEmail = form.subscribeField(
      'email',
      (field) => field?.dirty ?? false,
      (selected, previous) => emailDirty.push([previous, selected]),
    );
    form.subscribeField(
      'profile',
      (field) => field?.dirty ?? false,
      (selected, previous) => profileDirty.push([previous, selected]),
    );

    assert.equal(form.setFieldMeta('email', { dirty: true }), true);
    assert.deepEqual(dirty, [[false, true]]);
    assert.deepEqual(emailDirty, [[false, true]]);
    assert.deepEqual(profileDirty, []);

    assert.equal(form.setFieldMeta('email', { dirty: true }), true);
    assert.deepEqual(dirty, [[false, true]]);
    assert.deepEqual(emailDirty, [[false, true]]);

    unsubscribeDirty();
    unsubscribeEmail();
    form.destroy();
    assert.equal(form.setFieldMeta('profile', { dirty: true }), false);
    assert.deepEqual(profileDirty, []);
  } finally {
    dom.restore();
  }
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

    assert.equal(form.state.validation.status, 'invalid');
    assert.equal(form.state.submission.status, 'idle');
    assert.equal(form.state.submission.count, 1);
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

test('DOM Form can leave summary visibility under renderer ownership', async () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const input = document.createElement('input');
    const summary = document.createElement('div');
    input.name = 'email';
    input.required = true;
    summary.hidden = true;
    formElement.append(input, summary);
    document.body.append(formElement);

    const form = createForm({
      form: formElement,
      summary,
      manageSummaryVisibility: false,
      participants: [{ id: 'email', element: input }],
    });
    assert.equal(summary.hidden, true);
    formElement.requestSubmit();
    await Promise.resolve();
    assert.equal(form.state.validation.status, 'invalid');
    assert.equal(summary.hidden, true, 'renderer-owned visibility is not overwritten by invalid projection');
    summary.hidden = false;
    form.reset();
    assert.equal(summary.hidden, false, 'reset also preserves renderer-owned visibility');
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
    assert.equal(form.state.validation.status, 'valid');
    assert.equal(form.state.submission.status, 'succeeded');
  } finally {
    dom.restore();
  }
});

test('DOM Form submits three same-name native values without a form-values issue', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const element = document.createElement('form');
    const inputs = [];
    for (const name of ['tags', 'settings.tags']) {
      for (const value of ['red', 'green', 'blue']) {
        const input = document.createElement('input');
        input.type = 'checkbox'; input.name = name; input.value = value; input.checked = true;
        inputs.push(input); element.append(input);
      }
    }
    document.body.append(element);
    let values; let submissions = 0;
    const form = createForm({
      form: element,
      participants: [{ id: 'tags', element: inputs[0] }, { id: 'settings-tags', element: inputs[3] }],
      onSubmit(details) { details.event.preventDefault(); submissions += 1; values = details.values; },
    });
    element.requestSubmit();
    assert.equal(submissions, 1);
    assert.deepEqual(values.tags, ['red', 'green', 'blue']);
    assert.deepEqual(values.settings.tags, ['red', 'green', 'blue']);
    assert.equal(Object.isFrozen(values.tags), true);
    assert.equal(form.state.validation.status, 'valid');
    assert.equal(form.state.submission.status, 'succeeded');
    assert.deepEqual(form.state.allIssues, []);
    form.destroy();
  } finally { dom.restore(); }
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
    assert.equal(form.state.submission.status, 'submitting');

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

    assert.equal(form.state.submission.status, 'failed');
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
      mapSubmitError: () => ({ message: 'Please try again.' }),
    });

    formElement.requestSubmit();

    assert.equal(form.state.submission.status, 'failed');
    assert.deepEqual(form.state.submission.failure, { message: 'Please try again.' });
    assert.equal(form.state.valid, true);
    assert.deepEqual(form.state.allIssues, []);
  } finally {
    dom.restore();
  }
});

test('ISSUE-192: DOM Form settles PromiseLike inspection failures', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const throwingThenable = (message) => {
      const result = {};
      Object.defineProperty(result, 'then', {
        get() { throw new Error(message); },
      });
      return result;
    };

    for (const { options, message } of [
      {
        options: { validate: () => throwingThenable('validate inspection failed') },
        message: 'Form validation failed.',
      },
      {
        options: {
          schema: {
            '~standard': {
              version: 1,
              vendor: 'issue-192',
              validate: () => throwingThenable('schema inspection failed'),
            },
          },
        },
        message: 'Schema validation failed.',
      },
    ]) {
      const formElement = document.createElement('form');
      document.body.append(formElement);
      const form = createForm({ form: formElement, ...options });

      formElement.requestSubmit();

      assert.equal(form.state.validation.status, 'invalid');
      assert.equal(form.state.submission.status, 'idle');
      assert.equal(form.state.allIssues.some((issue) => issue.message === message), true);
      form.destroy();
      formElement.remove();
    }

    const formElement = document.createElement('form');
    document.body.append(formElement);
    let mappedReason;
    const form = createForm({
      form: formElement,
      onSubmit: () => throwingThenable('submit inspection failed'),
      mapSubmitError: (reason) => {
        mappedReason = reason;
        return { message: 'Mapped submission inspection failure.' };
      },
    });

    formElement.requestSubmit();

    assert.equal(mappedReason?.message, 'submit inspection failed');
    assert.equal(form.state.submission.status, 'failed');
    assert.deepEqual(form.state.submission.failure, { message: 'Mapped submission inspection failure.' });
    form.destroy();
  } finally {
    dom.restore();
  }
});

test('DOM Form clears one canonical multi-field server issue on related input', () => {
  const dom = installDOM();
  try {
    const { document, Event } = dom.window;
    const formElement = document.createElement('form');
    const orderNumber = document.createElement('input');
    const email = document.createElement('input');
    const summary = document.createElement('div');
    orderNumber.name = 'orderNumber';
    email.name = 'email';
    orderNumber.value = 'A-1';
    email.value = 'wrong@example.com';
    formElement.append(orderNumber, email, summary);
    document.body.append(formElement);

    const form = createForm({
      form: formElement,
      summary,
      participants: [
        { id: 'order-number', element: orderNumber },
        { id: 'email', element: email },
      ],
      onSubmit: () => ({
        ok: false,
        issues: [{
          id: 'lookup-mismatch',
          message: 'Check the order number and email.',
          source: 'server',
          relatedFieldIds: ['order-number', 'email'],
        }],
      }),
    });

    formElement.requestSubmit();
    assert.equal(form.state.allIssues.length, 1);
    assert.equal(form.state.fields[0].valid, false);
    assert.equal(form.state.fields[1].valid, false);
    assert.equal(summary.textContent, 'Check the order number and email.');
    assert.equal(document.activeElement, orderNumber);

    email.value = 'correct@example.com';
    email.dispatchEvent(new Event('input', { bubbles: true }));

    assert.deepEqual(form.state.allIssues, []);
    assert.equal(form.state.fields[0].valid, true);
    assert.equal(form.state.fields[1].valid, true);
    assert.equal(form.state.submission.status, 'idle');
    assert.equal(summary.hidden, true);
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
    assert.equal(resetForm.state.submission.status, 'submitting');
    assert.equal(destroyedForm.state.submission.status, 'submitting');

    resetForm.reset();
    const destroyedRevision = destroyedForm.getSnapshot().revision;
    destroyedForm.destroy();
    resolveResetSubmission({ ok: true });
    resolveDestroyedSubmission({ ok: false });
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(resetForm.state.submission.status, 'idle');
    assert.equal(resetForm.state.submission.count, 0);
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
    assert.equal(form.state.validation.status, 'idle');

    formElement.requestSubmit();
    assert.equal(validations, 1);
    assert.equal(form.state.validation.status, 'invalid');
    assert.equal(form.state.fields[0].issues[0].source, 'schema');

    code.value = '1234567890';
    code.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(validations, 2);
    assert.equal(form.state.validation.status, 'valid');

    formElement.requestSubmit();
    assert.equal(validations, 3);
    assert.deepEqual(submitted, { code: 1234567890 });
  } finally {
    dom.restore();
  }
});

test('DOM Form focuses invalid schema fields in document order', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const firstField = document.createElement('div');
    const firstInput = document.createElement('input');
    const secondField = document.createElement('div');
    const secondInput = document.createElement('input');
    firstInput.name = 'first';
    secondInput.name = 'second';
    firstField.append(firstInput);
    secondField.append(secondInput);
    formElement.append(firstField, secondField);
    document.body.append(formElement);

    createForm({
      form: formElement,
      participants: [
        { id: 'first', element: firstField, focusTarget: firstInput, name: 'first' },
        { id: 'second', element: secondField, focusTarget: secondInput, name: 'second' },
      ],
      schema: {
        '~standard': {
          version: 1,
          vendor: 'test',
          validate: () => ({
            issues: [
              { path: ['second'], message: 'Check the second value.' },
              { path: ['first'], message: 'Check the first value.' },
            ],
          }),
        },
      },
    });

    formElement.requestSubmit();

    assert.equal(document.activeElement, firstInput);
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

    assert.equal(form.state.validation.status, 'invalid');
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
    assert.equal(form.state.validation.status, 'idle');
    assert.equal(form.state.submission.status, 'idle');
    assert.equal(form.state.dirty, false);
    assert.equal(form.state.touched, false);
    assert.equal(form.state.submission.count, 0);
  } finally {
    dom.restore();
  }
});

test('ISSUE-134: initial participant topology is batched with linear ordered comparisons', () => {
  const dom = installDOM();
  const originalCompareDocumentPosition = dom.window.Node.prototype.compareDocumentPosition;
  try {
    const { document } = dom.window;
    for (const size of [100, 250, 500, 1_000]) {
      const formElement = document.createElement('form');
      const participants = [];
      for (let index = 0; index < size; index += 1) {
        const input = document.createElement('input');
        input.name = `field${index}`;
        input.value = String(index);
        formElement.append(input);
        participants.push({ id: `field${index}`, element: input });
      }
      document.body.append(formElement);
      let comparisons = 0;
      let stateChanges = 0;
      let updates = 0;
      dom.window.Node.prototype.compareDocumentPosition = function compareDocumentPosition(other) {
        comparisons += 1;
        return originalCompareDocumentPosition.call(this, other);
      };

      const form = createForm({
        form: formElement,
        participants,
        onStateChange: () => { stateChanges += 1; },
        onUpdate: () => { updates += 1; },
      });

      assert.equal(form.state.fields.length, size);
      assert.equal(form.state.fields[0].id, 'field0');
      assert.equal(form.state.fields.at(-1).id, `field${size - 1}`);
      assert.equal(form.getSnapshot().revision, 0);
      assert.equal(stateChanges, 0);
      assert.equal(updates, 0);
      assert.equal(comparisons <= size * 2, true, `${size} participants used ${comparisons} document comparisons`);
      form.destroy();
      formElement.remove();
    }
  } finally {
    dom.window.Node.prototype.compareDocumentPosition = originalCompareDocumentPosition;
    dom.restore();
  }
});

test('ISSUE-134: initial duplicate participants preserve first baseline and final owner', () => {
  const dom = installDOM();
  try {
    const { document, Event } = dom.window;
    const formElement = document.createElement('form');
    const first = document.createElement('input');
    const replacement = document.createElement('input');
    const sibling = document.createElement('input');
    first.value = 'baseline';
    replacement.value = 'replacement';
    sibling.value = 'sibling';
    formElement.append(sibling, replacement, first);
    document.body.append(formElement);
    let firstReads = 0;
    let replacementReads = 0;

    const form = createForm({
      form: formElement,
      participants: [
        {
          id: 'field',
          element: first,
          name: 'before',
          getValue: () => { firstReads += 1; return first.value; },
        },
        { id: 'sibling', element: sibling, name: 'sibling' },
        {
          id: 'field',
          element: replacement,
          name: 'after',
          getValue: () => { replacementReads += 1; return replacement.value; },
        },
      ],
    });

    assert.deepEqual(form.state.fields.map((field) => field.id), ['sibling', 'field']);
    assert.equal(form.getField('field').name, 'after');
    assert.equal(form.getField('field').dirty, true);
    assert.equal(form.state.dirty, true);
    assert.equal(firstReads, 1);
    assert.equal(replacementReads, 1);

    replacement.value = 'baseline';
    replacement.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(form.getField('field').dirty, false);
    assert.equal(form.state.dirty, false);

    first.value = 'ignored';
    first.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(form.getField('field').dirty, false);
    form.destroy();
  } finally {
    dom.restore();
  }
});

test('ISSUE-134: initial out-of-tree participant owns one listener set and releases it on destroy', () => {
  const dom = installDOM();
  try {
    const { document, Event } = dom.window;
    const formElement = document.createElement('form');
    const external = document.createElement('input');
    formElement.id = 'initial-external';
    external.setAttribute('form', 'initial-external');
    external.name = 'email';
    external.value = 'before@sectile.dev';
    document.body.append(formElement, external);
    const form = createForm({
      form: formElement,
      participants: [{ id: 'external', element: external }],
    });

    external.value = 'after@sectile.dev';
    external.dispatchEvent(new Event('input', { bubbles: true }));
    external.dispatchEvent(new Event('blur'));
    assert.equal(form.getField('external').dirty, true);
    assert.equal(form.getField('external').touched, true);

    const revision = form.getSnapshot().revision;
    form.destroy();
    external.value = 'ignored@sectile.dev';
    external.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(form.getSnapshot().revision, revision);
  } finally {
    dom.restore();
  }
});

test('ISSUE-159: delegated direct target lookup stays independent of participant cardinality', () => {
  const dom = installDOM();
  const originalContains = dom.window.HTMLElement.prototype.contains;
  try {
    const { document, Event } = dom.window;
    for (const size of [100, 1_000, 5_000]) {
      const formElement = document.createElement('form');
      const participants = [];
      const elements = [];
      for (let index = 0; index < size; index += 1) {
        const input = document.createElement('input');
        input.name = `field${index}`;
        input.value = String(index);
        formElement.append(input);
        elements.push(input);
        participants.push({ id: `field${index}`, element: input });
      }
      document.body.append(formElement);
      const form = createForm({ form: formElement, participants });
      const owned = new Set(elements);
      let containsCalls = 0;
      dom.window.HTMLElement.prototype.contains = function contains(target) {
        if (owned.has(this)) containsCalls += 1;
        return originalContains.call(this, target);
      };
      elements.at(-1).dispatchEvent(new Event('input', { bubbles: true }));
      dom.window.HTMLElement.prototype.contains = originalContains;

      assert.equal(containsCalls, 0, `${size} participants used ${containsCalls} participant contains checks`);
      assert.equal(form.getSnapshot().revision, 0);
      form.destroy();
      formElement.remove();
    }
  } finally {
    dom.window.HTMLElement.prototype.contains = originalContains;
    dom.restore();
  }
});

test('ISSUE-159: participant target ownership follows descendants, replacement, refresh, unregister, and destroy', () => {
  const dom = installDOM();
  try {
    const { document, Event } = dom.window;
    const formElement = document.createElement('form');
    const firstRoot = document.createElement('div');
    const firstInput = document.createElement('input');
    const replacementRoot = document.createElement('div');
    const replacementInput = document.createElement('input');
    firstInput.value = 'one';
    replacementInput.value = 'two';
    firstRoot.append(firstInput);
    replacementRoot.append(replacementInput);
    formElement.append(firstRoot, replacementRoot);
    document.body.append(formElement);
    const form = createForm({ form: formElement });

    const staleUnregister = form.registerParticipant({
      id: 'field', element: firstRoot, name: 'field', getValue: () => firstInput.value,
    });
    firstInput.value = 'one-updated';
    firstInput.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(form.getField('field').dirty, true);

    const unregisterReplacement = form.registerParticipant({
      id: 'field', element: replacementRoot, name: 'field', getValue: () => replacementInput.value,
    });
    staleUnregister();
    const afterReplacement = form.getSnapshot().revision;
    firstInput.value = 'stale';
    firstInput.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(form.getSnapshot().revision, afterReplacement);
    replacementInput.value = 'three';
    replacementInput.dispatchEvent(new Event('change', { bubbles: true }));
    replacementInput.dispatchEvent(new Event('blur'));
    assert.equal(form.getField('field').dirty, true);
    assert.equal(form.getField('field').touched, true);

    const anchor = document.createElement('div');
    const externalBefore = document.createElement('input');
    const externalAfter = document.createElement('input');
    externalBefore.value = 'before';
    externalAfter.value = 'after';
    formElement.append(anchor);
    document.body.append(externalBefore, externalAfter);
    let dynamicReads = 0;
    const dynamic = {
      id: 'external',
      element: anchor,
      semanticControl: externalBefore,
      name: 'external',
      getValue: () => { dynamicReads += 1; return dynamic.semanticControl.value; },
    };
    const unregisterDynamic = form.registerParticipant(dynamic);
    externalBefore.value = 'before-updated';
    externalBefore.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(form.getField('external').dirty, true);

    dynamic.semanticControl = externalAfter;
    assert.equal(form.refreshParticipant('external'), true);
    const afterRefreshReads = dynamicReads;
    externalBefore.value = 'stale-after-refresh';
    externalBefore.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(dynamicReads, afterRefreshReads);
    externalAfter.value = 'after-updated';
    externalAfter.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(dynamicReads, afterRefreshReads + 1);

    unregisterDynamic();
    const afterUnregister = form.getSnapshot().revision;
    externalAfter.value = 'ignored-after-unregister';
    externalAfter.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(form.getSnapshot().revision, afterUnregister);

    const beforeDestroy = form.getSnapshot().revision;
    form.destroy();
    replacementInput.value = 'ignored-after-destroy';
    replacementInput.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(form.getSnapshot().revision, beforeDestroy);
    unregisterReplacement();
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

test('ISSUE-123: reinitialize cannot preserve a canceled submission validation as pending', async () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    document.body.append(formElement);
    const resolvers = [];
    let validationCalls = 0;
    let submissions = 0;
    const form = createForm({
      form: formElement,
      validate: () => {
        validationCalls += 1;
        return new Promise((resolve) => { resolvers.push(resolve); });
      },
      onSubmit: () => {
        submissions += 1;
        return { ok: true };
      },
    });

    formElement.requestSubmit();
    assert.equal(validationCalls, 1);
    assert.equal(form.state.validation.status, 'validating');
    assert.equal(form.state.validation.intent, 'submission');

    form.reinitialize({ preserve: { validation: true } });
    assert.equal(form.state.validation.status, 'idle');
    assert.equal(form.state.validation.trigger, null);
    assert.equal(form.state.validation.intent, null);

    resolvers[0]({ issues: [{ message: 'Stale validation must stay canceled.' }] });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(form.state.validation.status, 'idle');
    assert.equal(form.state.issues.length, 0);
    assert.equal(submissions, 0);

    formElement.requestSubmit();
    assert.equal(validationCalls, 2);
    assert.equal(form.state.validation.status, 'validating');
    resolvers[1]({});
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(submissions, 1);
    assert.equal(form.state.validation.status, 'valid');
    assert.equal(form.state.submission.status, 'succeeded');
    assert.equal(form.state.submission.count, 1);
  } finally {
    dom.restore();
  }
});

test('ISSUE-123: reinitialize still preserves settled validation metadata', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    document.body.append(formElement);
    const form = createForm({
      form: formElement,
      validate: () => ({ issues: [{ message: 'Keep this settled issue.' }] }),
    });

    formElement.requestSubmit();
    assert.equal(form.state.validation.status, 'invalid');
    assert.equal(form.state.validation.trigger, 'submit');
    assert.equal(form.state.validation.intent, 'submission');
    assert.deepEqual(form.state.issues.map((issue) => [issue.source, issue.message]), [
      ['validate', 'Keep this settled issue.'],
    ]);

    form.reinitialize({ preserve: { validation: true } });

    assert.equal(form.state.validation.status, 'invalid');
    assert.equal(form.state.validation.trigger, 'submit');
    assert.equal(form.state.validation.intent, 'submission');
    assert.deepEqual(form.state.issues.map((issue) => [issue.source, issue.message]), [
      ['validate', 'Keep this settled issue.'],
    ]);
  } finally {
    dom.restore();
  }
});

test('ISSUE-132: participant topology changes retire pending interaction validation and fresh validation sees current fields', async () => {
  const dom = installDOM();
  try {
    const { document, Event } = dom.window;
    const formElement = document.createElement('form');
    const first = document.createElement('input');
    first.name = 'a';
    first.value = 'before';
    formElement.append(first);
    document.body.append(formElement);
    const pending = [];
    const seen = [];
    const signals = [];
    const form = createForm({
      form: formElement,
      participants: [{ id: 'a', element: first }],
      validateOn: ['input'],
      validate(values, context) {
        seen.push({ ...values });
        signals.push(context.signal);
        return new Promise((resolve) => { pending.push(resolve); });
      },
    });

    first.value = 'after';
    first.dispatchEvent(new Event('input', { bubbles: true }));
    assert.deepEqual(seen[0], { a: 'after' });
    assert.equal(form.state.validation.status, 'validating');

    const second = document.createElement('input');
    second.name = 'b';
    second.value = 'registered';
    formElement.append(second);
    const unregisterSecond = form.registerParticipant({ id: 'b', element: second });
    assert.equal(signals[0].aborted, true);
    assert.equal(form.state.validation.status, 'idle');
    assert.deepEqual(form.state.fields.map((field) => field.id), ['a', 'b']);

    pending[0]({ issues: [{ message: 'stale register result', path: 'a' }] });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(form.state.validation.status, 'idle');
    assert.equal(form.state.allIssues.some((issue) => issue.message === 'stale register result'), false);

    second.value = 'invalid';
    second.dispatchEvent(new Event('input', { bubbles: true }));
    assert.deepEqual(seen[1], { a: 'after', b: 'invalid' });
    pending[1]({ issues: [{ message: 'B is invalid.', path: 'b' }] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(form.state.validation.status, 'invalid');
    assert.equal(form.state.allIssues.some((issue) => issue.message === 'B is invalid.'), true);

    second.value = 'pending-remove';
    second.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(form.state.validation.status, 'validating');
    assert.deepEqual(seen[2], { a: 'after', b: 'pending-remove' });
    second.remove();
    unregisterSecond();
    assert.equal(signals[2].aborted, true);
    assert.equal(form.state.validation.status, 'idle');
    assert.deepEqual(form.state.fields.map((field) => field.id), ['a']);

    pending[2]({ issues: [{ message: 'stale unregister result', path: 'a' }] });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(form.state.validation.status, 'idle');
    assert.equal(form.state.allIssues.some((issue) => issue.message === 'stale unregister result'), false);

    first.value = 'final';
    first.dispatchEvent(new Event('input', { bubbles: true }));
    assert.deepEqual(seen[3], { a: 'final' });
    pending[3]({});
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(form.state.validation.status, 'valid');
    form.destroy();
  } finally {
    dom.restore();
  }
});

test('ISSUE-158: topology validation abort commits before reentrant public Form updates', async () => {
  const dom = installDOM();
  try {
    const { document, Event } = dom.window;
    const formElement = document.createElement('form');
    const first = document.createElement('input');
    first.name = 'a';
    first.value = 'before';
    formElement.append(first);
    document.body.append(formElement);
    const pending = [];
    const signals = [];
    const seen = [];
    const notifications = [];
    const third = document.createElement('input');
    const fourth = document.createElement('input');
    let form;
    let unregisterThird;
    let unregisterFourth;
    form = createForm({
      form: formElement,
      participants: [{ id: 'a', element: first }],
      validateOn: ['input'],
      validate(values, context) {
        const index = signals.length;
        signals.push(context.signal);
        seen.push({ ...values });
        if (index === 0) {
          context.signal.addEventListener('abort', () => {
            assert.equal(form.setFieldMeta('a', { touched: true }), true);
            third.name = 'c';
            third.value = 'three';
            formElement.append(third);
            unregisterThird = form.registerParticipant({ id: 'c', element: third });
          }, { once: true });
        } else if (index === 1) {
          context.signal.addEventListener('abort', () => {
            fourth.name = 'd';
            fourth.value = 'four';
            formElement.append(fourth);
            unregisterFourth = form.registerParticipant({ id: 'd', element: fourth });
            assert.equal(form.setFieldMeta('a', { touched: false }), true);
          }, { once: true });
        }
        return new Promise((resolve) => { pending.push(resolve); });
      },
      onStateChange(state) {
        notifications.push({
          fields: state.fields.map((field) => field.id).join(','),
          touched: state.fields.find((field) => field.id === 'a')?.touched ?? false,
        });
      },
    });

    first.value = 'after';
    first.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(form.state.validation.status, 'validating');
    notifications.length = 0;

    const second = document.createElement('input');
    second.name = 'b';
    second.value = 'two';
    formElement.append(second);
    const unregisterSecond = form.registerParticipant({ id: 'b', element: second });

    assert.equal(signals[0].aborted, true);
    assert.deepEqual(form.state.fields.map((field) => field.id), ['a', 'b', 'c']);
    assert.equal(form.getField('a')?.touched, true);
    assert.notEqual(form.getField('c'), null);
    assert.equal(third.dataset.scope, 'form');
    assert.deepEqual(notifications, [
      { fields: 'a,b', touched: false },
      { fields: 'a,b', touched: true },
      { fields: 'a,b,c', touched: true },
    ]);

    pending[0]({ issues: [{ message: 'stale register result', path: 'a' }] });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(form.state.allIssues.some((issue) => issue.message === 'stale register result'), false);

    third.value = 'three-updated';
    third.dispatchEvent(new Event('input', { bubbles: true }));
    assert.equal(form.state.validation.status, 'validating');
    assert.deepEqual(seen[1], { a: 'after', b: 'two', c: 'three-updated' });
    notifications.length = 0;

    second.remove();
    unregisterSecond();

    assert.equal(signals[1].aborted, true);
    assert.deepEqual(form.state.fields.map((field) => field.id), ['a', 'c', 'd']);
    assert.equal(form.getField('b'), null);
    assert.notEqual(form.getField('d'), null);
    assert.equal(fourth.dataset.scope, 'form');
    assert.equal(form.getField('a')?.touched, false);
    assert.deepEqual(notifications, [
      { fields: 'a,c', touched: true },
      { fields: 'a,c,d', touched: true },
      { fields: 'a,c,d', touched: false },
    ]);

    pending[1]({ issues: [{ message: 'stale unregister result', path: 'c' }] });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(form.state.allIssues.some((issue) => issue.message === 'stale unregister result'), false);

    fourth.value = 'four-updated';
    fourth.dispatchEvent(new Event('input', { bubbles: true }));
    assert.deepEqual(seen[2], { a: 'after', c: 'three-updated', d: 'four-updated' });
    pending[2]({});
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(form.state.validation.status, 'valid');

    unregisterThird?.();
    unregisterFourth?.();
    form.destroy();
  } finally {
    dom.restore();
  }
});

test('ISSUE-132: topology changes cannot resume submission validation from stale values', async () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const first = document.createElement('input');
    first.name = 'a';
    first.value = 'one';
    formElement.append(first);
    document.body.append(formElement);
    const pending = [];
    const seen = [];
    const signals = [];
    let submissions = 0;
    const form = createForm({
      form: formElement,
      participants: [{ id: 'a', element: first }],
      validate(values, context) {
        seen.push({ ...values });
        signals.push(context.signal);
        return new Promise((resolve) => { pending.push(resolve); });
      },
      onSubmit() {
        submissions += 1;
        return { ok: true };
      },
    });

    formElement.requestSubmit();
    assert.deepEqual(seen[0], { a: 'one' });
    assert.equal(form.state.validation.status, 'validating');
    assert.equal(form.state.validation.intent, 'submission');

    const second = document.createElement('input');
    second.name = 'b';
    second.value = 'two';
    formElement.append(second);
    form.registerParticipant({ id: 'b', element: second });
    assert.equal(signals[0].aborted, true);
    assert.equal(form.state.validation.status, 'idle');

    pending[0]({});
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(submissions, 0);
    assert.equal(form.state.submission.status, 'idle');

    formElement.requestSubmit();
    assert.deepEqual(seen[1], { a: 'one', b: 'two' });
    pending[1]({});
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(submissions, 1);
    assert.equal(form.state.submission.status, 'succeeded');
    form.destroy();
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
    assert.equal(form.state.submission.status, 'idle');
  } finally {
    dom.restore();
  }
});

test('ISSUE-133: DOM Form reconciles duplicate participant replacement against the retained baseline', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const first = document.createElement('input');
    const replacement = document.createElement('input');
    const baselineReplacement = document.createElement('input');
    first.value = 'baseline';
    replacement.value = 'replacement';
    baselineReplacement.value = 'baseline';
    formElement.append(first, replacement, baselineReplacement);
    document.body.append(formElement);
    const form = createForm({ form: formElement });

    form.registerParticipant({ id: 'field', element: first, name: 'before' });
    const staleUnregister = form.registerParticipant({ id: 'field', element: replacement, name: 'changed' });

    assert.equal(form.state.fields.length, 1);
    assert.equal(form.state.fields[0].name, 'changed');
    assert.equal(form.state.fields[0].dirty, true);
    assert.equal(form.state.dirty, true);
    assert.equal(form.refreshParticipant('field'), true);
    assert.equal(form.state.fields[0].dirty, true);

    const unregister = form.registerParticipant({
      id: 'field',
      element: baselineReplacement,
      name: 'restored',
    });
    assert.equal(form.state.fields.length, 1);
    assert.equal(form.state.fields[0].name, 'restored');
    assert.equal(form.state.fields[0].dirty, false);
    assert.equal(form.state.dirty, false);
    assert.equal(form.refreshParticipant('field'), true);
    assert.equal(form.state.fields[0].dirty, false);

    staleUnregister();
    assert.equal(form.state.fields.length, 1);
    unregister();
    assert.equal(form.state.fields.length, 0);
  } finally {
    dom.restore();
  }
});

test('ISSUE-133: duplicate participant replacement uses custom value snapshots and comparators', () => {
  const dom = installDOM();
  try {
    const { document } = dom.window;
    const formElement = document.createElement('form');
    const first = document.createElement('button');
    const equalReplacement = document.createElement('button');
    const changedReplacement = document.createElement('button');
    first.type = 'button';
    equalReplacement.type = 'button';
    changedReplacement.type = 'button';
    formElement.append(first, equalReplacement, changedReplacement);
    document.body.append(formElement);
    let value = ['Alpha'];
    const isValueEqual = (current, baseline) => (
      Array.isArray(current)
      && Array.isArray(baseline)
      && current.map((entry) => entry.toLowerCase()).join('|')
        === baseline.map((entry) => entry.toLowerCase()).join('|')
    );
    const form = createForm({ form: formElement });

    form.registerParticipant({
      id: 'tags',
      element: first,
      getValue: () => [...value],
      isValueEqual,
    });
    value = ['ALPHA'];
    form.registerParticipant({
      id: 'tags',
      element: equalReplacement,
      getValue: () => [...value],
      isValueEqual,
    });
    assert.equal(form.state.fields[0].dirty, false);

    value = ['beta'];
    form.registerParticipant({
      id: 'tags',
      element: changedReplacement,
      getValue: () => [...value],
      isValueEqual,
    });
    assert.equal(form.state.fields[0].dirty, true);
    assert.equal(form.state.dirty, true);
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
    assert.equal(form.state.validation.status, 'invalid');
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
          { path: ['profile', 'email', 'domain'], relatedPaths: [['profile', 'preferences']], message: 'Use an approved domain.' },
          ...Array.from({ length: 50 }, (_, index) => ({
            path: ['profile', 'email', ...Array.from({ length: 1022 }, (_, segment) => `nested${segment}`)],
            relatedPaths: [['profile', ...Array.from({ length: 1023 }, (_, segment) => `related${segment}`)]],
            message: `Review nested value ${index}.`,
          })),
          { path: ['unowned'], message: 'Review the form.' },
        ],
      }),
    });

    formElement.requestSubmit();

    assert.equal(form.state.fields.find((field) => field.id === 'profile').issues.length, 0);
    assert.equal(form.state.fields.find((field) => field.id === 'email').issues.length, 51);
    assert.equal(form.state.fields.find((field) => field.id === 'email').issues.every((issue) => issue.relatedFieldIds.length === 1 && issue.relatedFieldIds[0] === 'profile'), true);
    assert.equal(form.state.fields.find((field) => field.id === 'profile').relatedIssues.length, 51);
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
    assert.equal(form.state.validation.status, 'validating');
    assert.deepEqual(events.map((event) => event.prevented), [true, true]);

    resolveValidation({});
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(validationCalls, 1);
    assert.equal(form.state.validation.status, 'valid');
    assert.equal(form.state.submission.count, 1);
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
    assert.equal(form.state.validation.status, 'invalid');
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
    assert.equal(form.state.validation.status, 'validating');
    form.reset();
    resolveValidation({});
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(submits, 1);
    assert.equal(form.state.validation.status, 'idle');
    assert.equal(form.state.submission.status, 'idle');
    assert.equal(form.state.submission.count, 0);
  } finally {
    dom.restore();
  }
});
