import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyFormEvent,
  clearFormFieldIssues,
  createFormState,
  getFormField,
  getFormFieldIDByPath,
  getFormFieldIDsByIssueSource,
  getFormIssuesBySource,
  removeFormFieldIssue,
  replaceFormFieldIssues,
  setFormFieldMeta,
  tryCreateFormState,
  upsertFormFieldIssue,
} from '../../.verification-dist/state.js';
import {
  appendFormFieldPath,
  createFormFieldPath,
  createFormRelativePath,
  encodeFormFieldPath,
  tryCreateFormFieldPath,
  tryCreateFormRelativePath,
} from '../../.verification-dist/path.js';
import {
  createFormValues,
  tryCreateFormValues,
} from '../../.verification-dist/values.js';

// FRM-10
test('form field paths normalize dot, bracket, and explicit segment syntax', () => {
  assert.deepEqual(createFormFieldPath('profile.name'), ['profile', 'name']);
  assert.deepEqual(createFormFieldPath('addresses[0].city'), ['addresses', 0, 'city']);
  assert.deepEqual(createFormFieldPath('profile[email]'), ['profile', 'email']);
  assert.equal(
    encodeFormFieldPath(['addresses', 0, 'city']),
    'addresses[0].city',
  );
  assert.equal(tryCreateFormFieldPath('profile..name').ok, false);
  assert.equal(tryCreateFormFieldPath(['items', -1, 'name']).ok, false);
  assert.equal(tryCreateFormFieldPath([0, 'name']).ok, false);
  assert.deepEqual(createFormRelativePath(0), [0]);
  assert.deepEqual(createFormRelativePath('start.date'), ['start', 'date']);
  assert.deepEqual(
    appendFormFieldPath('filters.price', [0]),
    ['filters', 'price', 0],
  );
  for (const path of [['profile', 'name'], ['addresses', 0, 'city'], ['items', 12]]) {
    assert.deepEqual(createFormFieldPath(encodeFormFieldPath(path)), path);
  }
});

test('form values build immutable nested objects, indexed arrays, and repeated leaves', () => {
  const values = createFormValues([
    { path: 'profile.name', value: 'Mina' },
    { path: 'addresses[0].city', value: 'Seoul' },
    { path: ['addresses', 1, 'city'], value: 'Busan' },
    { path: 'roles', value: 'admin' },
    { path: 'roles', value: 'reviewer' },
    { path: 'roles', value: 'editor' },
    { path: 'profile.note', value: '' },
  ]);

  assert.equal(Object.getPrototypeOf(values), null);
  assert.deepEqual({ ...values.profile }, { name: 'Mina', note: '' });
  assert.deepEqual(values.addresses.map((address) => ({ ...address })), [
    { city: 'Seoul' },
    { city: 'Busan' },
  ]);
  assert.deepEqual(values.roles, ['admin', 'reviewer', 'editor']);
  assert.equal(Object.isFrozen(values), true);
  assert.equal(Object.isFrozen(values.addresses), true);
  assert.equal(Object.isFrozen(values.roles), true);
});

test('repeated FormData leaves remain ordered, bounded and distinct from structural arrays', () => {
  for (const count of [3, 16, 4_096]) {
    const data = new FormData();
    for (let index = 0; index < count; index += 1) {
      data.append('tags', String(index));
      data.append('settings.tags', String(index));
    }
    const values = createFormValues([...data.entries()].map(([path, value]) => ({ path, value })));
    const expected = Array.from({ length: count }, (_, index) => String(index));
    assert.deepEqual(values.tags, expected);
    assert.deepEqual(values.settings.tags, expected);
    assert.equal(Object.isFrozen(values.tags), true);
    assert.equal(Object.isFrozen(values.settings.tags), true);
    assert.equal(Object.isFrozen(values.settings), true);
  }
  const entries = ['red', 'green', 'blue'].map((value) => ({ path: 'tags', value }));
  assert.equal(tryCreateFormValues(entries, { maxEntries: 3, maxOutputNodes: 5, maxPathCodeUnits: 12 }).ok, true);
  for (const [limits, code] of [
    [{ maxEntries: 2 }, 'form-entry-ceiling-exceeded'],
    [{ maxOutputNodes: 4 }, 'form-output-node-ceiling-exceeded'],
    [{ maxPathCodeUnits: 11 }, 'form-path-code-unit-ceiling-exceeded'],
  ]) assert.equal(tryCreateFormValues(entries, limits).error.code, code);
  for (const descendant of ['tags[0]', 'tags.name']) {
    const child = { path: descendant, value: 'nested' };
    for (const input of [[...entries, child], [child, ...entries]]) {
      assert.equal(tryCreateFormValues(input).error.code, 'form-value-path-collision');
    }
  }
});

test('form values preserve opaque values and reject leaf-container collisions', () => {
  const file = { name: 'avatar.png' };
  const values = createFormValues([{ path: 'profile.avatar', value: file }]);
  assert.equal(values.profile.avatar, file);

  const leafFirst = tryCreateFormValues([
    { path: 'profile', value: 'Mina' },
    { path: 'profile.name', value: 'Mina' },
  ]);
  assert.equal(leafFirst.ok, false);
  assert.equal(leafFirst.error.code, 'form-value-path-collision');

  const objectFirst = tryCreateFormValues([
    { path: 'profile.name', value: 'Mina' },
    { path: 'profile', value: 'Mina' },
  ]);
  assert.equal(objectFirst.ok, false);
  assert.equal(objectFirst.error.code, 'form-value-path-collision');

  assert.equal(tryCreateFormValues([
    { path: 'items[0]', value: 'first' },
    { path: 'items.name', value: 'invalid' },
  ]).ok, false);
});

const requiredIssue = {
  id: 'email-required',
  fieldId: 'email',
  message: 'Enter an email address.',
  source: 'field',
};

test('form state preserves numeric and textual field identities independently', () => {
  const state = createFormState({
    fields: [
      { id: 1, name: 'numeric' },
      { id: '1', name: 'textual' },
    ],
  });
  assert.equal(getFormField(state, 1)?.name, 'numeric');
  assert.equal(getFormField(state, '1')?.name, 'textual');
  assert.notEqual(getFormField(state, 1), getFormField(state, '1'));
});

test('indexed field commands preserve unrelated identity and make equal writes no-ops', () => {
  const initial = createFormState({
    fields: [
      { id: 'email', name: 'email' },
      { id: 'profile', name: 'profile' },
    ],
  });
  const profile = getFormField(initial, 'profile');
  const validation = initial.validation;
  const submission = initial.submission;
  assert.ok(profile !== null);

  const changed = setFormFieldMeta(initial, 'email', { dirty: true });
  assert.equal(changed.ok, true);
  assert.equal(getFormField(changed.value.state, 'profile'), profile);
  assert.equal(getFormField(changed.value.state, 'email')?.dirty, true);
  assert.equal(changed.value.state.validation, validation);
  assert.equal(changed.value.state.submission, submission);

  const equal = setFormFieldMeta(changed.value.state, 'email', { dirty: true });
  assert.equal(equal.ok, true);
  assert.equal(equal.value.state, changed.value.state);
  assert.deepEqual(equal.value.commands, []);

  const missing = setFormFieldMeta(initial, 'missing', { touched: true });
  assert.equal(missing.ok, false);
  assert.equal(missing.error.code, 'form-field-id-missing');
});

test('indexed issue commands update only the selected owner and retained source index', () => {
  const issue = {
    id: 'email-server',
    fieldId: 'email',
    message: 'Already used.',
    source: 'server',
  };
  const initial = createFormState({
    fields: [
      { id: 'email', name: 'email' },
      { id: 'profile', name: 'profile' },
    ],
  });
  const profile = getFormField(initial, 'profile');

  const replaced = replaceFormFieldIssues(initial, 'email', 'server', [issue]);
  assert.equal(replaced.ok, true);
  assert.equal(getFormField(replaced.value.state, 'profile'), profile);
  assert.deepEqual(getFormFieldIDsByIssueSource(replaced.value.state, 'server'), ['email']);
  assert.equal(replaced.value.state.valid, false);

  const upserted = upsertFormFieldIssue(replaced.value.state, 'email', {
    ...issue,
    message: 'Use another address.',
  });
  assert.equal(upserted.ok, true);
  assert.equal(getFormField(upserted.value.state, 'email')?.issues[0].message, 'Use another address.');

  const absent = removeFormFieldIssue(upserted.value.state, 'email', 'absent');
  assert.equal(absent.ok, true);
  assert.equal(absent.value.state, upserted.value.state);

  const removed = removeFormFieldIssue(upserted.value.state, 'email', issue.id);
  assert.equal(removed.ok, true);
  assert.deepEqual(getFormFieldIDsByIssueSource(removed.value.state, 'server'), []);

  const cleared = clearFormFieldIssues(replaced.value.state, 'email', 'server');
  assert.equal(cleared.ok, true);
  assert.equal(cleared.value.state.valid, true);
});

test('ISSUE-047: source-owner enumeration compacts history to current cardinality', () => {
  const countEntries = (action) => {
    const iterate = Map.prototype[Symbol.iterator];
    let entries = 0;
    Map.prototype[Symbol.iterator] = function(...args) {
      const iterator = iterate.apply(this, args);
      return {
        [Symbol.iterator]() { return this; },
        next() {
          const result = iterator.next();
          if (!result.done) entries += 1;
          return result;
        },
      };
    };
    try { return { value: action(), entries }; }
    finally { Map.prototype[Symbol.iterator] = iterate; }
  };

  for (const size of [10, 100, 1000]) {
    const initial = createFormState({
      fields: Array.from({ length: size }, (_, index) => ({
        id: `field-${index}`,
        issues: [{ id: `server-${index}`, source: 'server', message: 'Server issue.' }],
      })),
    });
    const shrunk = applyFormEvent(initial, {
      type: 'replace-issues',
      source: 'server',
      issues: [{ id: 'remaining', fieldId: 'field-0', source: 'server', message: 'Still invalid.' }],
    });
    assert.equal(shrunk.ok, true);
    const afterShrink = countEntries(() => getFormFieldIDsByIssueSource(shrunk.value.state, 'server'));
    assert.deepEqual(afterShrink.value, ['field-0']);
    assert.ok(afterShrink.entries <= 3, `${size}: dense shrink replayed ${afterShrink.entries} map entries`);

    const grown = applyFormEvent(shrunk.value.state, {
      type: 'replace-issues',
      source: 'server',
      issues: Array.from({ length: size }, (_, index) => ({
        id: `grown-${index}`,
        fieldId: `field-${index}`,
        source: 'server',
        message: 'Grown issue.',
      })),
    });
    assert.equal(grown.ok, true);
    const afterGrow = countEntries(() => getFormFieldIDsByIssueSource(grown.value.state, 'server'));
    assert.equal(afterGrow.value.length, size);
    assert.ok(afterGrow.entries <= size * 3, `${size}: growth replayed ${afterGrow.entries} map entries`);
  }
});

test('form registry preserves order and derives aggregate field state', () => {
  let state = createFormState({
    fields: [
      { id: 'email', name: 'email' },
      { id: 'team', name: 'team', touched: true, dirty: true },
    ],
  });
  assert.deepEqual(state.fields.map((field) => field.id), ['email', 'team']);
  assert.equal(state.touched, true);
  assert.equal(state.dirty, true);

  state = applyFormEvent(state, {
    type: 'register-field',
    field: { id: 'email', name: 'account-email', dirty: true },
  }).value.state;
  assert.deepEqual(state.fields.map((field) => field.id), ['email', 'team']);
  assert.equal(state.fields[0].name, 'account-email');

  state = applyFormEvent(state, {
    type: 'set-field-meta',
    id: 'email',
    meta: {
      name: 'profile.email',
      touched: true,
    },
  }).value.state;
  assert.equal(state.fields[0].name, 'profile.email');
  assert.equal(state.fields[0].touched, true);
  assert.equal(state.fields[0].dirty, true);

  state = applyFormEvent(state, {
    type: 'reorder-fields',
    ids: ['team', 'email'],
  }).value.state;
  assert.deepEqual(state.fields.map((field) => field.id), ['team', 'email']);

  state = applyFormEvent(state, { type: 'unregister-field', id: 'team' }).value.state;
  assert.deepEqual(state.fields.map((field) => field.id), ['email']);
});

// FRM-11
test('invalid submit focuses the first invalid field and announces its issues', () => {
  const state = createFormState({
    fields: [
      { id: 'email', valid: false, issues: [requiredIssue] },
      {
        id: 'password',
        valid: false,
        issues: [{
          id: 'password-short',
          fieldId: 'password',
          message: 'Use at least twelve characters.',
          source: 'field',
        }],
      },
    ],
  });
  const started = applyFormEvent(state, {
    type: 'validation-started', trigger: 'submit', intent: 'submission',
  }).value.state;
  const submitted = applyFormEvent(started, {
    type: 'validation-completed', trigger: 'submit', intent: 'submission', generation: started.validation.generation,
  }).value;
  assert.equal(submitted.state.validation.status, 'invalid');
  assert.equal(submitted.state.submission.status, 'idle');
  assert.equal(submitted.state.submission.count, 1);
  assert.deepEqual(submitted.commands, [
    { type: 'focus-field', id: 'email' },
    {
      type: 'announce-summary',
      issueIds: ['email-required', 'password-short'],
    },
  ]);
});

test('invalid input revalidation preserves focus while announcing submission issues', () => {
  const state = createFormState({
    fields: [
      { id: 'current-password' },
      {
        id: 'new-password',
        valid: false,
        issues: [{
          id: 'new-password-required',
          fieldId: 'new-password',
          message: 'Enter a new password.',
          source: 'field',
        }],
      },
    ],
  });
  const started = applyFormEvent(state, {
    type: 'validation-started', trigger: 'input', intent: 'submission',
  }).value.state;
  const revalidated = applyFormEvent(started, {
    type: 'validation-completed',
    trigger: 'input',
    intent: 'submission',
    generation: started.validation.generation,
  }).value;

  assert.deepEqual(revalidated.commands, [{
    type: 'announce-summary',
    issueIds: ['new-password-required'],
  }]);
});

test('valid submit has an explicit request, pending, success, and failure lifecycle', () => {
  let state = createFormState({ fields: [{ id: 'email', name: 'email' }] });
  state = applyFormEvent(state, {
    type: 'validation-started', trigger: 'submit', intent: 'submission',
  }).value.state;
  const requested = applyFormEvent(state, {
    type: 'validation-completed', trigger: 'submit', intent: 'submission', generation: state.validation.generation,
  }).value;
  assert.equal(requested.state.validation.status, 'valid');
  assert.equal(requested.state.submission.status, 'idle');
  assert.deepEqual(requested.commands, [{ type: 'submit-requested', generation: 1 }]);

  state = applyFormEvent(requested.state, { type: 'submit-started', generation: 1 }).value.state;
  assert.equal(state.submission.status, 'submitting');

  const failed = applyFormEvent(state, {
    type: 'submit-failed',
    generation: 1,
    issues: [{ id: 'server-down', message: 'Try again.', source: 'server' }],
  }).value.state;
  assert.equal(failed.submission.status, 'failed');
  assert.equal(failed.valid, false);

  state = applyFormEvent(failed, {
    type: 'replace-issues',
    source: 'server',
    issues: [],
  }).value.state;
  assert.equal(state.validation.status, 'idle');
  assert.equal(state.submission.status, 'idle');
  state = applyFormEvent(state, {
    type: 'validation-started', trigger: 'submit', intent: 'submission',
  }).value.state;
  state = applyFormEvent(state, {
    type: 'validation-completed', trigger: 'submit', intent: 'submission', generation: state.validation.generation,
  }).value.state;
  state = applyFormEvent(state, { type: 'submit-started', generation: state.submission.generation }).value.state;
  state = applyFormEvent(state, { type: 'submit-succeeded', generation: state.submission.generation }).value.state;
  assert.equal(state.submission.status, 'succeeded');
  assert.equal(state.issues.length, 0);
});

// FRM-08
test('issue replacement preserves other sources and unregistered server issues', () => {
  let state = createFormState({
    fields: [{ id: 'email', valid: false, issues: [requiredIssue] }],
    issues: [{ id: 'form-policy', message: 'Review the form.', source: 'form' }],
  });
  state = applyFormEvent(state, {
    type: 'replace-issues',
    source: 'server',
    issues: [
      {
        id: 'email-used',
        fieldId: 'email',
        message: 'That email is already registered.',
        source: 'server',
      },
      {
        id: 'account-locked',
        fieldId: 'missing-field',
        message: 'The account is locked.',
        source: 'server',
      },
    ],
  }).value.state;
  assert.deepEqual(
    state.fields[0].issues.map((issue) => issue.id),
    ['email-required', 'email-used'],
  );
  assert.deepEqual(
    state.issues.map((issue) => issue.id),
    ['form-policy', 'account-locked'],
  );
});

test('path owner index preserves longest boundary and duplicate order through field changes', () => {
  let state = createFormState({ fields: [
    { id: 'root', name: 'account' }, { id: 'first', name: 'account.items' },
    { id: 'second', name: 'account.items' }, { id: 'indexed', name: 'account.items[0]' },
    { id: 'leaf', name: 'account.items[0].value' }, { id: 'numeric', name: 'account.items.0' },
    { id: 'other', name: 'accounting' }, { id: 'unnamed' },
  ] });
  const paths = ['account', 'account.value', 'account.items', 'account.items[0].value.deep',
    'account.items[1].value', 'account.items.0.value', 'account.itemsMore', 'accounting.x',
    'absent', 'account[0].x', ['account', 'items', 0, 'value'], '', 'account..value'];
  const check = () => {
    const external = { ...state };
    for (let pass = 0; pass < 3; pass += 1) {
      for (const path of paths) assert.equal(getFormFieldIDByPath(state, path), getFormFieldIDByPath(external, path), String(path));
    }
  };
  check();
  assert.equal(getFormFieldIDByPath(state, 'account.items'), 'first');
  const original = state;
  for (const event of [
    { type: 'set-field-meta', id: 'first', meta: { name: 'renamed' } },
    { type: 'register-field', field: { id: 'new', name: 'account.items[1]' } },
    { type: 'unregister-field', id: 'leaf' },
    { type: 'set-field-meta', id: 'first', meta: { name: 'account.items' } },
  ]) {
    const result = applyFormEvent(state, event);
    assert.equal(result.ok, true);
    state = result.value.state;
    check();
  }
  state = applyFormEvent(state, { type: 'reorder-fields', ids: state.fields.map(({ id }) => id).reverse() }).value.state;
  check();
  assert.equal(getFormFieldIDByPath(state, 'account.items'), 'second');
  assert.equal(getFormFieldIDByPath(original, 'account.items'), 'first');
});

test('ISSUE-039: proportional path batches have linear owner work and reuse metadata generations', () => {
  const totals = [];
  for (const size of [250, 500, 1_000]) {
    let state = createFormState({ fields: Array.from({ length: size }, (_, index) => ({ id: `id-${index}`, name: `field${index}` })) });
    const startsWith = String.prototype.startsWith;
    const get = Map.prototype.get;
    const has = Map.prototype.has;
    const set = Map.prototype.set;
    let scans = 0;
    let lookups = 0;
    let inserts = 0;
    const named = (key) => typeof key === 'string' && startsWith.call(key, 'field');
    String.prototype.startsWith = function(prefix, ...args) { if (named(prefix)) scans += 1; return startsWith.call(this, prefix, ...args); };
    Map.prototype.get = function(key) { if (named(key)) lookups += 1; return get.call(this, key); };
    Map.prototype.has = function(key) { if (named(key)) lookups += 1; return has.call(this, key); };
    Map.prototype.set = function(key, value) { if (named(key)) inserts += 1; return set.call(this, key, value); };
    try {
      for (let index = 0; index < size; index += 1) assert.equal(getFormFieldIDByPath(state, `field${index}.value`), `id-${index}`);
      const work = scans + lookups + inserts;
      totals.push(work);
      assert.ok(work <= size * 8, `${size} fields: ${work} owner operations`);
      assert.equal(inserts, size);
      const previousScans = scans;
      const previousInserts = inserts;
      state = applyFormEvent(state, { type: 'set-field-meta', id: 'id-0', meta: { touched: true } }).value.state;
      assert.equal(getFormFieldIDByPath(state, 'field0.value'), 'id-0');
      assert.equal(scans, previousScans);
      assert.equal(inserts, previousInserts);
    } finally {
      String.prototype.startsWith = startsWith;
      Map.prototype.get = get;
      Map.prototype.has = has;
      Map.prototype.set = set;
    }
  }
  assert.ok(totals[1] <= totals[0] * 2.1);
  assert.ok(totals[2] <= totals[1] * 2.1);
});

test('deep path ownership hashes disjoint tokens rather than repeated full prefixes', () => {
  for (const depth of [128, 256, 512, 1024]) {
    const paths = Array.from({ length: 50 }, (_, path) => ['root', ...Array.from({ length: depth - 1 }, (_, index) => `segment${index}payload${path}`)]);
    const deepName = paths[0].join('.');
    const state = createFormState({ fields: [{ id: 'root-id', name: 'root' }, { id: 'deep-id', name: deepName }] });
    getFormFieldIDByPath(state, 'root.warm');
    getFormFieldIDByPath(state, 'root.warm');
    const slice = String.prototype.slice;
    const get = Map.prototype.get;
    let slices = 0;
    let slicedCodeUnits = 0;
    let probes = 0;
    String.prototype.slice = function(...args) {
      const result = slice.apply(this, args);
      slices += 1;
      slicedCodeUnits += result.length;
      return result;
    };
    Map.prototype.get = function(key) { probes += 1; return get.call(this, key); };
    try {
      for (const [index, path] of paths.entries()) assert.equal(getFormFieldIDByPath(state, path), index === 0 ? 'deep-id' : 'root-id');
    } finally {
      String.prototype.slice = slice;
      Map.prototype.get = get;
    }
    const inputCodeUnits = paths.reduce((sum, path) => sum + path.join('.').length, 0);
    assert.ok(slicedCodeUnits <= inputCodeUnits, `${depth}: ${slicedCodeUnits} sliced code units`);
    assert.ok(slices <= depth + 100, `${depth}: ${slices} slices`);
    assert.ok(probes <= depth + 100, `${depth}: ${probes} probes`);
  }
  // A fully shared deep branch still hashes only disjoint token bytes.
  const prefix = ['root', ...Array.from({ length: 1022 }, (_, index) => `shared${index}`)];
  const paths = Array.from({ length: 50 }, (_, index) => [...prefix, `tail${index}`]);
  const shared = createFormState({ fields: [{ id: 'root', name: 'root' }, { id: 'shared', name: prefix.join('.') }] });
  getFormFieldIDByPath(shared, 'root.warm');
  getFormFieldIDByPath(shared, 'root.warm');
  const get = Map.prototype.get;
  const slice = String.prototype.slice;
  let hashedCodeUnits = 0;
  let slicedCodeUnits = 0;
  Map.prototype.get = function(key) {
    if (typeof key === 'string') hashedCodeUnits += key.length;
    return get.call(this, key);
  };
  String.prototype.slice = function(...args) {
    const result = slice.apply(this, args);
    slicedCodeUnits += result.length;
    return result;
  };
  try {
    for (const path of paths) assert.equal(getFormFieldIDByPath(shared, path), 'shared');
  } finally {
    Map.prototype.get = get;
    String.prototype.slice = slice;
  }
  const encodedCodeUnits = paths.reduce((sum, path) => sum + path.join('.').length, 0);
  assert.ok(hashedCodeUnits <= encodedCodeUnits);
  assert.ok(slicedCodeUnits <= encodedCodeUnits);
  const external = { fields: [{ id: 'before', name: 'root' }] };
  assert.equal(getFormFieldIDByPath(external, ['root', 'child']), 'before');
  external.fields[0] = { id: 'after', name: 'root' };
  assert.equal(getFormFieldIDByPath(external, ['root', 'child']), 'after');
});

// FRM-09
test('multi-field server issues stay canonical and clear when a related value changes', () => {
  const issue = {
    id: 'lookup-mismatch',
    message: 'Check the order number and email.',
    source: 'server',
    relatedFieldIds: ['order-number', 'email'],
  };
  const state = createFormState({
    validation: { generation: 1, status: 'invalid', trigger: 'submit', intent: 'submission' },
    submission: { generation: 1, status: 'failed', count: 1, failure: null },
    fields: [
      { id: 'order-number', name: 'orderNumber' },
      { id: 'email', name: 'email' },
    ],
    issues: [issue],
  });

  assert.equal(state.allIssues.length, 1);
  assert.equal(state.fields[0].relatedIssues[0], state.allIssues[0]);
  assert.equal(state.fields[1].relatedIssues[0], state.allIssues[0]);
  assert.equal(state.fields[0].valid, false);
  assert.equal(state.fields[1].valid, false);
  assert.deepEqual(getFormIssuesBySource(state, 'server'), state.allIssues);
  assert.equal(getFormFieldIDByPath(state, 'orderNumber.value'), 'order-number');

  const changed = applyFormEvent(state, {
    type: 'field-value-changed',
    id: 'email',
  }).value.state;

  assert.equal(changed.valid, true);
  assert.deepEqual(changed.allIssues, []);
  assert.equal(changed.fields[0].valid, true);
  assert.equal(changed.fields[1].valid, true);
  assert.equal(changed.validation.status, 'idle');
  assert.equal(changed.submission.status, 'idle');
});

test('multi-field submit issues focus their primary field before earlier related fields', () => {
  const state = createFormState({
    validation: { generation: 1, status: 'valid', trigger: 'submit', intent: 'submission' },
    submission: { generation: 1, status: 'submitting', count: 1, failure: null },
    fields: [
      { id: 'order-number', name: 'orderNumber' },
      { id: 'email', name: 'email' },
    ],
  });

  const failed = applyFormEvent(state, {
    type: 'submit-failed',
    generation: 1,
    issues: [{
      id: 'lookup-mismatch',
      fieldId: 'email',
      relatedFieldIds: ['order-number'],
      message: 'Check the order number and email.',
      source: 'server',
    }],
  }).value;

  assert.equal(failed.state.validation.status, 'invalid');
  assert.deepEqual(failed.commands[0], { type: 'focus-field', id: 'email' });
});

test('direct issue mutations invalidate settled validation snapshots', () => {
  const state = createFormState({
    validation: { generation: 1, status: 'valid', trigger: 'blur', intent: 'interaction' },
    fields: [{ id: 'email', name: 'email' }],
  });

  const changed = applyFormEvent(state, {
    type: 'replace-field-issues',
    id: 'email',
    source: 'field',
    issues: [{ id: 'required', message: 'Required.', source: 'field' }],
  }).value.state;

  assert.equal(changed.valid, false);
  assert.equal(changed.validation.status, 'idle');
  assert.equal(changed.validation.trigger, null);
  assert.equal(changed.validation.intent, null);
});

test('VAL-033: related server issue clearing changes only affected field identities', () => {
  const fieldCount = 4_096;
  const fields = Array.from({ length: fieldCount }, (_, index) => ({ id: `field-${index}` }));
  const state = createFormState({
    validation: { generation: 1, status: 'invalid', trigger: 'submit', intent: 'submission' },
    submission: { generation: 1, status: 'failed', count: 1, failure: null },
    fields,
    issues: [{
      id: 'related-server',
      fieldId: 'unmounted-primary',
      message: 'Check both fields.',
      source: 'server',
      relatedFieldIds: ['field-0', 'field-1'],
    }],
  });

  const changed = applyFormEvent(state, {
    type: 'field-value-changed',
    id: 'field-1',
  }).value.state;
  const changedFieldIdentities = changed.fields.reduce(
    (count, field, index) => count + Number(field !== state.fields[index]),
    0,
  );

  assert.equal(changedFieldIdentities, 2);
  assert.equal(changed.allIssues.length, 0);
  assert.deepEqual(changed.issues, []);
  const registered = applyFormEvent(changed, { type: 'register-field', field: { id: 'unmounted-primary' } }).value.state;
  assert.deepEqual(registered.allIssues, []);
  assert.equal(registered.valid, true);
});

test('related server issue removal stays coherent through submission, registration and reorder', () => {
  for (const fieldId of [undefined, 'unmounted', 'primary']) {
    let state = createFormState({ fields: [{ id: 'primary' }, { id: 'related' }, { id: 'untouched' }] });
    const step = (event) => {
      const result = applyFormEvent(state, event);
      assert.equal(result.ok, true, JSON.stringify(result));
      state = result.value.state;
    };
    step({ type: 'validation-started', trigger: 'submit', intent: 'submission' });
    step({ type: 'validation-completed', generation: state.validation.generation, trigger: 'submit', intent: 'submission' });
    step({ type: 'submit-started', generation: state.submission.generation });
    step({ type: 'submit-failed', generation: state.submission.generation, issues: [{
      id: 'conflict', source: 'server', message: 'Check both values.',
      ...(fieldId === undefined ? {} : { fieldId }), relatedFieldIds: ['related'],
    }] });
    assert.equal(state.valid, false);
    assert.equal(getFormField(state, 'related').relatedIssues.length, 1);
    const untouched = getFormField(state, 'untouched');
    step({ type: 'field-value-changed', id: 'related' });
    const cleared = () => {
      assert.equal(state.valid, true);
      assert.deepEqual(state.issues, []);
      assert.deepEqual(state.allIssues, []);
      assert.deepEqual(getFormIssuesBySource(state, 'server'), []);
      assert.deepEqual(getFormField(state, 'related').relatedIssues, []);
    };
    cleared();
    assert.equal(getFormField(state, 'untouched'), untouched);
    assert.equal(state.validation.status, 'idle');
    assert.equal(state.submission.status, 'idle');
    step({ type: 'register-field', field: { id: 'unrelated' } });
    cleared();
    step({ type: 'reorder-fields', ids: ['unrelated', 'untouched', 'related', 'primary'] });
    cleared();
  }
});

test('clearing a global related server issue preserves unrelated issues and sources', () => {
  const initial = createFormState({ fields: [{ id: 'related' }, { id: 'other' }], issues: [
    { id: 'removed', fieldId: 'unmounted', relatedFieldIds: ['related'], source: 'server', message: 'Remove.' },
    { id: 'server-kept', fieldId: 'other', source: 'server', message: 'Keep server.' },
    { id: 'schema-kept', relatedFieldIds: ['related'], source: 'schema', message: 'Keep schema.' },
  ] });
  const changed = applyFormEvent(initial, { type: 'field-value-changed', id: 'related' }).value.state;
  assert.equal(getFormField(changed, 'other'), getFormField(initial, 'other'));
  assert.deepEqual(changed.issues.map((issue) => issue.id), ['schema-kept']);
  assert.deepEqual(getFormIssuesBySource(changed, 'server').map((issue) => issue.id), ['server-kept']);
  assert.deepEqual(getFormIssuesBySource(changed, 'schema').map((issue) => issue.id), ['schema-kept']);
  const later = applyFormEvent(changed, { type: 'register-field', field: { id: 'extra' } }).value.state;
  assert.deepEqual(new Set(later.allIssues.map((issue) => issue.id)), new Set(['server-kept', 'schema-kept']));
  assert.equal(later.valid, false);
});

test('submission failures do not create validation issues or move field focus', () => {
  let state = createFormState({ fields: [{ id: 'email', name: 'email' }] });
  state = applyFormEvent(state, {
    type: 'validation-started', trigger: 'submit', intent: 'submission',
  }).value.state;
  const requested = applyFormEvent(state, {
    type: 'validation-completed',
    trigger: 'submit',
    intent: 'submission',
    generation: state.validation.generation,
  }).value;
  state = applyFormEvent(requested.state, {
    type: 'submit-started',
    generation: requested.state.submission.generation,
  }).value.state;

  const failed = applyFormEvent(state, {
    type: 'submit-failed',
    generation: state.submission.generation,
    failure: { message: 'Please try again.' },
  }).value;

  assert.equal(failed.state.valid, true);
  assert.deepEqual(failed.state.allIssues, []);
  assert.deepEqual(failed.state.submission.failure, { message: 'Please try again.' });
  assert.deepEqual(failed.commands, [{ type: 'announce-submission-failure' }]);
});

test('reset clears coordinator metadata and emits participant commands in order', () => {
  const state = createFormState({
    validation: { generation: 1, status: 'invalid', trigger: 'submit', intent: 'submission' },
    submission: { generation: 1, status: 'failed', count: 2, failure: null },
    fields: [
      { id: 'email', touched: true, dirty: true, valid: false, issues: [requiredIssue] },
      { id: 'team', touched: true, dirty: true },
    ],
    issues: [{ id: 'server-down', message: 'Try again.', source: 'server' }],
  });
  const reset = applyFormEvent(state, 'reset').value;
  assert.equal(reset.state.validation.status, 'idle');
  assert.equal(reset.state.submission.status, 'idle');
  assert.equal(reset.state.submission.count, 0);
  assert.equal(reset.state.dirty, false);
  assert.equal(reset.state.valid, true);
  assert.deepEqual(reset.commands, [
    { type: 'reset-field', id: 'email' },
    { type: 'reset-field', id: 'team' },
  ]);
});

test('FRM-04: malformed path, value, and state construction returns typed failures', () => {
  const cases = [
    [tryCreateFormFieldPath(null), 'form-field-path-root-invalid'],
    [tryCreateFormRelativePath(null), 'form-relative-path-invalid'],
    [tryCreateFormValues(null), 'form-value-entry-invalid'],
    [tryCreateFormValues([null]), 'form-value-entry-invalid'],
    [tryCreateFormState(null), 'form-state-input-invalid'],
    [tryCreateFormState({ fields: null }), 'form-state-input-invalid'],
    [tryCreateFormState({ fields: [null] }), 'form-state-input-invalid'],
  ];
  for (const [result, code] of cases) {
    assert.equal(result.ok, false);
    assert.equal(result.error.code, code);
  }
});

test('FRM-05: relation slots consume the output budget before caller elements are read', () => {
  for (const size of [1, 10, 1000, 250_000]) {
    let reads = 0;
    const ids = new Proxy(Array.from({ length: size }, (_, index) => index + 1), {
      get(target, key, receiver) {
        if (typeof key === 'string' && /^\d+$/.test(key)) reads += 1;
        return Reflect.get(target, key, receiver);
      },
    });
    const issue = { id: 'issue', source: 'server', message: 'Related fields', relatedFieldIds: ids };
    const rejected = tryCreateFormState({ issues: [issue] }, { maxEntries: 1, maxOutputNodes: size });
    assert.equal(rejected.ok, false);
    assert.equal(rejected.error.class, 'resource-rejection');
    assert.equal(rejected.error.code, 'form-output-node-ceiling-exceeded');
    assert.equal(reads, 0);
    if (size === 250_000) {
      assert.equal(tryCreateFormState({ issues: [issue] }).ok, false);
      assert.equal(reads, 0);
      const transition = applyFormEvent(createFormState(), { type: 'replace-issues', source: 'server', issues: [issue] });
      assert.equal(transition.ok, false);
      assert.equal(transition.error.code, 'form-output-node-ceiling-exceeded');
      assert.equal(reads, 0);
      continue;
    }
    const accepted = tryCreateFormState({ issues: [issue] }, { maxEntries: 1, maxOutputNodes: size + 1 });
    assert.equal(accepted.ok, true);
    assert.equal(accepted.value.allIssues[0].relatedFieldIds.length, size);
    assert.equal(reads, size);
    assert.equal(Object.isFrozen(accepted.value.allIssues[0].relatedFieldIds), true);
    const fieldOwned = tryCreateFormState({ fields: [{ id: 'field', issues: [issue] }] }, { maxEntries: 2, maxOutputNodes: size + 1 });
    assert.equal(fieldOwned.ok, false);
    assert.equal(fieldOwned.error.code, 'form-output-node-ceiling-exceeded');
  }
});

test('FRM-05: output budgeting and normalization consume one caller snapshot', () => {
  const large = [1, 2, 3, 4];
  const issueWithRelations = (first, second) => {
    let reads = 0;
    return {
      issue: {
        id: 'issue',
        source: 'server',
        message: 'Snapshot relations.',
        get relatedFieldIds() {
          reads += 1;
          return reads === 1 ? first : second;
        },
      },
      reads: () => reads,
    };
  };

  const firstSmall = issueWithRelations([], large);
  const accepted = tryCreateFormState({ issues: [firstSmall.issue] }, { maxEntries: 1, maxOutputNodes: 1 });
  assert.equal(accepted.ok, true);
  assert.equal(firstSmall.reads(), 1);
  assert.deepEqual(accepted.value.allIssues[0].relatedFieldIds ?? [], []);

  const firstLarge = issueWithRelations(large, []);
  const rejected = tryCreateFormState({ issues: [firstLarge.issue] }, { maxEntries: 1, maxOutputNodes: 1 });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'form-output-node-ceiling-exceeded');
  assert.equal(firstLarge.reads(), 1);

  const state = createFormState({}, { maxOutputNodes: 1 });
  const transitionInput = issueWithRelations([], large);
  const transitioned = applyFormEvent(state, { type: 'replace-issues', source: 'server', issues: [transitionInput.issue] });
  assert.equal(transitioned.ok, true);
  assert.equal(transitionInput.reads(), 1);
  assert.deepEqual(transitioned.value.state.allIssues[0].relatedFieldIds ?? [], []);

  let fieldIssueReads = 0;
  const field = {
    id: 'field',
    get issues() {
      fieldIssueReads += 1;
      return fieldIssueReads === 1
        ? []
        : [{ id: 'late', source: 'server', message: 'Must not be reread.' }];
    },
  };
  const registered = applyFormEvent(state, { type: 'register-field', field });
  assert.equal(registered.ok, true);
  assert.equal(fieldIssueReads, 1);
  assert.deepEqual(registered.value.state.fields[0].issues, []);
});

test('Form issue mutations preserve the state output budget and reject relation growth atomically', () => {
  for (const size of [1, 10, 1000]) {
    const state = createFormState({ fields: [{ id: 'field' }] }, { maxOutputNodes: size + 2 });
    for (const makeEvent of [
      (issue) => ({ type: 'replace-issues', source: 'server', issues: [issue] }),
      (issue) => ({ type: 'register-field', field: { id: 'field', issues: [issue] } }),
      (issue) => ({ type: 'replace-field-issues', id: 'field', source: 'server', issues: [issue] }),
      (issue) => ({ type: 'upsert-field-issue', id: 'field', issue }),
    ]) {
      const issue = { id: 'issue', source: 'server', message: 'Relations', relatedFieldIds: Array.from({ length: size }, (_, index) => index + 1) };
      const accepted = applyFormEvent(state, makeEvent(issue));
      assert.equal(accepted.ok, true);
      const canonical = accepted.value.state;
      assert.equal(canonical.allIssues[0].relatedFieldIds.length, size);
      // Replacement frees the previous record and relation slots before reserving the new input.
      assert.equal(applyFormEvent(canonical, makeEvent(issue)).ok, true);
      let reads = 0;
      const large = new Proxy([...issue.relatedFieldIds, size + 1], {
        get(target, key, receiver) {
          if (typeof key === 'string' && /^\d+$/.test(key)) reads += 1;
          return Reflect.get(target, key, receiver);
        },
      });
      const before = structuredClone(canonical);
      const rejected = applyFormEvent(canonical, makeEvent({ ...issue, relatedFieldIds: large }));
      assert.equal(rejected.ok, false);
      assert.equal(rejected.error.class, 'resource-rejection');
      assert.equal(rejected.error.code, 'form-output-node-ceiling-exceeded');
      assert.equal(reads, 0);
      assert.deepEqual(canonical, before);
    }
  }
  let state = createFormState({ fields: [{ id: 'field' }] }, { maxOutputNodes: 6 });
  const put = (id, relatedFieldIds) => ({ type: 'upsert-field-issue', id: 'field', issue: { id, relatedFieldIds, source: 'server', message: 'Related' } });
  state = applyFormEvent(state, put('one', [1, 2])).value.state;
  state = applyFormEvent(state, { type: 'set-field-meta', id: 'field', meta: { touched: true } }).value.state;
  state = applyFormEvent(state, put('two', [3])).value.state;
  assert.equal(applyFormEvent(state, put('three', [])).ok, false);
  state = applyFormEvent(state, { type: 'remove-field-issue', id: 'field', issueId: 'one' }).value.state;
  assert.equal(applyFormEvent(state, put('three', [4, 5])).ok, true);
  state = applyFormEvent(state, 'reset').value.state;
  assert.equal(applyFormEvent(state, put('large', [1, 2, 3, 4, 5])).ok, false);
  const duplicate = applyFormEvent(state, put('duplicate', [1, 1]));
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error.code, 'form-issue-related-field-id-duplicate');
  const pending = createFormState({ submission: { generation: 1, status: 'submitting', count: 1, failure: null } }, { maxOutputNodes: 2 });
  const failed = applyFormEvent(pending, { type: 'submit-failed', generation: 1, issues: [{ id: 'server', source: 'server', message: 'Failed', relatedFieldIds: [1, 2] }] });
  assert.equal(failed.ok, false);
  assert.equal(failed.error.code, 'form-output-node-ceiling-exceeded');
});

test('FRM-05: construction ceilings fail before unbounded output and deep paths stay iterative', () => {
  const ceilingCases = [
    [tryCreateFormFieldPath('abcd', { maxPathCodeUnits: 3 }), 'form-path-code-unit-ceiling-exceeded'],
    [tryCreateFormFieldPath(['root', 'nested'], { maxPathSegments: 1 }), 'form-path-segment-ceiling-exceeded'],
    [tryCreateFormFieldPath(['items', 2], { maxArrayIndex: 1 }), 'form-array-index-ceiling-exceeded'],
    [tryCreateFormValues([{ path: 'a', value: 1 }, { path: 'b', value: 2 }], { maxEntries: 1 }), 'form-entry-ceiling-exceeded'],
    [tryCreateFormValues([{ path: 'a.b', value: 1 }], { maxOutputNodes: 2 }), 'form-output-node-ceiling-exceeded'],
    [tryCreateFormState({ fields: [{ id: 'a' }, { id: 'b' }] }, { maxEntries: 1 }), 'form-entry-ceiling-exceeded'],
  ];
  for (const [result, code] of ceilingCases) {
    assert.equal(result.ok, false);
    assert.equal(result.error.code, code);
  }

  const deepPath = ['root', ...Array.from({ length: 1_200 }, (_, index) => `p${index}`)];
  const deep = tryCreateFormValues([{ path: deepPath, value: 'leaf' }], {
    maxPathSegments: 1_500,
    maxOutputNodes: 1_500,
    maxPathCodeUnits: 20_000,
  });
  assert.equal(deep.ok, true);
  assert.equal(Object.isFrozen(deep.value), true);
});

test('FRM-06: only library-owned branches and repeated wrappers are frozen', () => {
  const callerArray = [];
  const callerObject = { mutable: true };
  const callerFile = new File(['contents'], 'attachment.txt');
  const values = createFormValues([
    { path: 'single.array', value: callerArray },
    { path: 'single.object', value: callerObject },
    { path: 'repeated', value: callerArray },
    { path: 'repeated', value: callerObject },
    { path: 'repeated', value: callerFile },
  ]);
  assert.equal(values.single.array, callerArray);
  assert.equal(values.single.object, callerObject);
  assert.deepEqual(values.repeated, [callerArray, callerObject, callerFile]);
  assert.equal(values.repeated[0], callerArray);
  assert.equal(values.repeated[1], callerObject);
  assert.equal(values.repeated[2], callerFile);
  assert.equal(Object.isFrozen(values.single), true);
  assert.equal(Object.isFrozen(values.repeated), true);
  assert.equal(Object.isFrozen(callerArray), false);
  assert.equal(Object.isFrozen(callerObject), false);
  assert.equal(Object.isFrozen(callerFile), false);
  callerArray.push('still mutable');
  callerObject.mutable = false;
  assert.deepEqual(callerArray, ['still mutable']);
  assert.equal(callerObject.mutable, false);
});

test('FRM-03: unknown form events reject atomically without resetting state', () => {
  const state = createFormState({
    validation: { generation: 1, status: 'invalid', trigger: 'submit', intent: 'submission' },
    submission: { generation: 1, status: 'failed', count: 2, failure: { message: 'Submission failed.' } },
    fields: [{ id: 'email', touched: true, dirty: true, valid: false, issues: [requiredIssue] }],
  });
  const before = structuredClone(state);

  for (const event of ['unknown', { type: 'unknown' }, null, 1, true, undefined]) {
    const result = applyFormEvent(state, event);
    assert.equal(result.ok, false);
    assert.equal(result.error.class, 'transition-rejection');
    assert.equal(result.error.code, 'form-event-invalid');
    assert.deepEqual(state, before);
  }
});

// FRM-07
test('reinitialize establishes a clean baseline without resetting participant values', () => {
  const state = createFormState({
    validation: { generation: 1, status: 'invalid', trigger: 'submit', intent: 'submission' },
    submission: { generation: 1, status: 'failed', count: 2, failure: null },
    fields: [
      {
        id: 'email',
        touched: true,
        dirty: true,
        valid: false,
        issues: [
          requiredIssue,
          { id: 'email-native', fieldId: 'email', message: 'Invalid.', source: 'native' },
          { id: 'email-server', fieldId: 'email', message: 'Taken.', source: 'server' },
        ],
      },
    ],
  });

  const result = applyFormEvent(state, { type: 'reinitialize' }).value;

  assert.equal(result.state.dirty, false);
  assert.equal(result.state.touched, false);
  assert.equal(result.state.validation.status, 'idle');
  assert.equal(result.state.submission.status, 'idle');
  assert.equal(result.state.submission.count, 0);
  assert.deepEqual(result.state.fields[0].issues.map((issue) => issue.id), ['email-required']);
  assert.deepEqual(result.commands, []);
});

test('reinitialize can preserve independent metadata groups while dirty always clears', () => {
  const state = createFormState({
    validation: { generation: 1, status: 'invalid', trigger: 'submit', intent: 'submission' },
    submission: { generation: 1, status: 'failed', count: 1, failure: null },
    fields: [{
      id: 'email',
      touched: true,
      dirty: true,
      valid: false,
      issues: [
        { id: 'native', fieldId: 'email', message: 'Invalid.', source: 'native' },
        { id: 'server', fieldId: 'email', message: 'Taken.', source: 'server' },
      ],
    }],
  });

  const result = applyFormEvent(state, {
    type: 'reinitialize',
    options: { preserve: { touched: true, validation: true, submission: true } },
  }).value.state;

  assert.equal(result.dirty, false);
  assert.equal(result.touched, true);
  assert.equal(result.validation.status, 'invalid');
  assert.equal(result.submission.status, 'failed');
  assert.equal(result.submission.count, 1);
  assert.deepEqual(result.fields[0].issues.map((issue) => issue.id), ['native', 'server']);
});

test('constructors reject duplicate fields and malformed issue ownership', () => {
  assert.equal(tryCreateFormState({ fields: [{ id: 'email' }, { id: 'email' }] }).ok, false);
  assert.equal(tryCreateFormState({
    fields: [{
      id: 'email',
      issues: [{ ...requiredIssue, fieldId: 'other' }],
    }],
  }).ok, false);
});

test('ISSUE-048: submission attempt count rejects overflow and accepts the final safe value', () => {
  const maximum = createFormState({
    submission: { generation: 0, status: 'idle', count: Number.MAX_SAFE_INTEGER, failure: null },
  });
  const before = structuredClone(maximum);
  const rejected = applyFormEvent(maximum, { type: 'validation-started', trigger: 'submit', intent: 'submission' });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.class, 'resource-rejection');
  assert.equal(rejected.error.code, 'form-submit-count-invalid');
  assert.deepEqual(maximum, before);

  const interaction = applyFormEvent(maximum, { type: 'validation-started', trigger: 'input', intent: 'interaction' });
  assert.equal(interaction.ok, true);
  assert.equal(interaction.value.state.submission.count, Number.MAX_SAFE_INTEGER);

  const penultimate = createFormState({
    submission: { generation: 0, status: 'idle', count: Number.MAX_SAFE_INTEGER - 1, failure: null },
  });
  const accepted = applyFormEvent(penultimate, { type: 'validation-started', trigger: 'submit', intent: 'submission' });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.value.state.submission.count, Number.MAX_SAFE_INTEGER);
  assert.equal(Number.isSafeInteger(accepted.value.state.submission.count), true);
  assert.equal(tryCreateFormState({
    validation: accepted.value.state.validation,
    submission: accepted.value.state.submission,
    fields: accepted.value.state.fields,
    issues: accepted.value.state.issues,
  }).ok, true);
});

test('FRM-01, FRM-02: form generations reject stale validation and submission results atomically', () => {
  let state = createFormState({ fields: [{ id: 'email' }] });
  state = applyFormEvent(state, {
    type: 'validation-started', trigger: 'input', intent: 'interaction',
  }).value.state;
  const firstGeneration = state.validation.generation;
  state = applyFormEvent(state, {
    type: 'validation-started', trigger: 'input', intent: 'interaction',
  }).value.state;
  const staleValidation = applyFormEvent(state, {
    type: 'validation-completed',
    trigger: 'input',
    intent: 'interaction',
    generation: firstGeneration,
  });
  assert.equal(staleValidation.ok, false);
  assert.equal(staleValidation.error.code, 'form-validation-generation-stale');

  state = applyFormEvent(state, {
    type: 'validation-completed',
    trigger: 'input',
    intent: 'interaction',
    generation: state.validation.generation,
  }).value.state;
  state = applyFormEvent(state, {
    type: 'validation-started', trigger: 'submit', intent: 'submission',
  }).value.state;
  state = applyFormEvent(state, {
    type: 'validation-completed',
    trigger: 'submit',
    intent: 'submission',
    generation: state.validation.generation,
  }).value.state;
  const firstSubmissionGeneration = state.submission.generation;
  state = applyFormEvent(state, {
    type: 'submit-started', generation: firstSubmissionGeneration,
  }).value.state;
  state = applyFormEvent(state, {
    type: 'submit-failed', generation: firstSubmissionGeneration,
    failure: { message: 'Try again.' },
  }).value.state;
  state = applyFormEvent(state, {
    type: 'validation-started', trigger: 'submit', intent: 'submission',
  }).value.state;
  state = applyFormEvent(state, {
    type: 'validation-completed',
    trigger: 'submit',
    intent: 'submission',
    generation: state.validation.generation,
  }).value.state;
  const staleSubmission = applyFormEvent(state, {
    type: 'submit-started',
    generation: firstSubmissionGeneration,
  });
  assert.equal(staleSubmission.ok, false);
  assert.equal(staleSubmission.error.code, 'form-submission-generation-stale');
});
