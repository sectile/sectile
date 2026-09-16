import assert from 'node:assert/strict'; import test from 'node:test'; import { unwrap } from '@sectile/core/result';
import { createCheckbox, createCheckboxController, getCheckboxAttributes, getCheckboxInputAttributes } from '../.verification-dist/checkbox.js'; import { createSwitch, createSwitchController, getSwitchAttributes, getSwitchInputAttributes } from '../.verification-dist/switch.js'; import { createToggleButton, createToggleButtonController, getToggleButtonAttributes } from '../.verification-dist/toggle-button.js';
test('DOM checked controls own click dispatch and role-specific ARIA', () => {
  const checkboxElement = new FakeElement(); const checkbox = createCheckbox({ element: checkboxElement, defaultValue: 'mixed' }); checkboxElement.emit('click'); assert.equal(checkbox.getSnapshot().state.checked, true); assert.equal(checkboxElement.attributes.get('aria-checked'), 'true');
  const switchElement = new FakeElement(); const control = createSwitch({ element: switchElement }); switchElement.emit('click'); assert.equal(control.getSnapshot().state.checked, true); assert.equal(switchElement.attributes.get('role'), 'switch');
  const button = new FakeElement(); const toggle = createToggleButton({ element: button }); button.emit('click'); assert.equal(toggle.getSnapshot().state.pressed, true); assert.equal(button.attributes.get('aria-pressed'), 'true');
});
test('DOM checked controls project and enforce interaction state', () => {
  const disabledElement = new FakeElement();
  const disabled = createSwitch({ element: disabledElement, disabled: true });
  assert.equal(disabledElement.attributes.get('aria-disabled'), 'true');
  assert.equal(disabledElement.disabled, true);
  disabledElement.emit('click');
  assert.equal(disabled.getSnapshot().state.checked, false);

  const readOnlyElement = new FakeElement();
  const readOnly = createCheckbox({ element: readOnlyElement, readOnly: true });
  assert.equal(readOnlyElement.attributes.get('aria-readonly'), 'true');
  readOnlyElement.emit('click');
  assert.equal(readOnly.getSnapshot().state.checked, false);
});
test('DOM checkbox exposes a pure declarative attribute projection', () => {
  const controller = unwrap(createCheckboxController({ defaultValue: 'mixed', readOnly: true }));
  const attributes = getCheckboxAttributes(controller.getSnapshot().state, { readOnly: true, native: true });
  assert.deepEqual(attributes, {
    role: 'checkbox',
    'aria-checked': 'mixed',
    'aria-disabled': undefined,
    'aria-readonly': 'true',
    'data-state': 'indeterminate',
    'data-disabled': undefined,
    'data-readonly': '',
    disabled: false,
    readOnly: undefined,
    'aria-required': undefined,
    'data-scope': 'checkbox',
    'data-part': 'root',
  });
});
test('DOM checkbox projects native form state without reimplementing browser behavior', () => {
  const mixed = unwrap(createCheckboxController({ defaultValue: 'mixed' }));
  assert.deepEqual(getCheckboxInputAttributes(mixed.getSnapshot().state, {
    name: 'channels',
    value: 'deployment',
    form: 'release-form',
    required: true,
  }), {
    type: 'checkbox',
    name: 'channels',
    value: 'deployment',
    form: 'release-form',
    checked: false,
    indeterminate: true,
    required: true,
    disabled: false,
    tabIndex: -1,
    'aria-hidden': 'true',
  });

  const checked = unwrap(createCheckboxController({ defaultValue: true }));
  assert.equal(getCheckboxInputAttributes(checked.getSnapshot().state).checked, true);
  assert.equal(getCheckboxInputAttributes(checked.getSnapshot().state).value, 'on');
});
test('DOM checkbox synchronizes native checkbox properties while the browser owns input behavior', () => {
  const input = new FakeCheckboxInput();
  const checkbox = createCheckbox({ element: input, defaultValue: 'mixed' });
  assert.equal(input.checked, false);
  assert.equal(input.indeterminate, true);

  input.emit('click');
  assert.equal(checkbox.getSnapshot().state.checked, true);
  assert.equal(input.checked, true);
  assert.equal(input.indeterminate, false);
});
test('DOM switch exposes native form projection and read-only semantics', () => {
  const controller = unwrap(createSwitchController({ defaultChecked: true, readOnly: true }));
  assert.deepEqual(getSwitchAttributes(controller.getSnapshot().state, {
    readOnly: true,
    required: true,
    native: true,
  }), {
    role: 'switch',
    'aria-checked': 'true',
    'aria-disabled': undefined,
    'aria-readonly': 'true',
    'data-state': 'checked',
    'data-disabled': undefined,
    'data-readonly': '',
    disabled: false,
    readOnly: undefined,
    'aria-required': 'true',
    'data-scope': 'switch',
    'data-part': 'root',
  });
  assert.equal(getSwitchInputAttributes(controller.getSnapshot().state, {
    name: 'notifications',
  }).checked, true);
  assert.equal(controller.handleEvent('toggle'), false);
});
test('DOM toggle button exposes declarative pressed state and blocks read-only input', () => {
  const controller = unwrap(createToggleButtonController({ defaultPressed: true, readOnly: true }));
  assert.deepEqual(getToggleButtonAttributes(controller.getSnapshot().state, {
    readOnly: true,
    native: true,
  }), {
    role: undefined,
    'aria-pressed': 'true',
    'aria-disabled': undefined,
    'aria-readonly': undefined,
    'data-state': 'checked',
    'data-disabled': undefined,
    'data-readonly': '',
    disabled: false,
    readOnly: undefined,
    'data-scope': 'toggle-button',
    'data-part': 'root',
  });
  assert.equal(controller.handleEvent('toggle'), false);
});
class FakeElement { attributes = new Map(); listeners = new Map(); disabled = false; readOnly = false; setAttribute(name, value) { this.attributes.set(name, value); } removeAttribute(name) { this.attributes.delete(name); } addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); } removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); } emit(type) { for (const listener of this.listeners.get(type) ?? []) listener(); } }
class FakeCheckboxInput extends FakeElement { type = 'checkbox'; checked = false; indeterminate = false; }

for (const { name, create, change, value, field, attribute } of [
  { name: 'checkbox', create: createCheckbox, change: 'onValueChange', value: 'value', field: 'checked', attribute: 'aria-checked' },
  { name: 'switch', create: createSwitch, change: 'onCheckedChange', value: 'checked', field: 'checked', attribute: 'aria-checked' },
  { name: 'toggle button', create: createToggleButton, change: 'onPressedChange', value: 'pressed', field: 'pressed', attribute: 'aria-pressed' },
]) {
  test(`DOM ${name} completes committed projection and all observers before the first callback error escapes`, () => {
    for (const failure of [new Error('value failed'), undefined, null]) {
      const element = new FakeCheckboxInput();
      const trace = [];
      const control = create({
        element,
        ...(name === 'checkbox' ? { defaultValue: 'mixed' } : {}),
        [change]: () => { trace.push('value'); throw failure; },
        onUpdate: () => { trace.push('update'); throw new Error('later update failure'); },
      });
      control.subscribe((snapshot) => {
        trace.push(['observer', snapshot.revision, snapshot.state[field], element.attributes.get(attribute)]);
        trace.push(['projection', element.attributes.get('data-state'),
          name === 'checkbox' ? [element.checked, element.indeterminate] : null]);
        throw new Error('later observer failure');
      });
      control.subscribe((snapshot) => trace.push(['later observer', snapshot.revision]));

      for (const [revision, checked] of [[1, true], [2, false]]) {
        trace.length = 0;
        assert.throws(() => element.emit('click'), (error) => Object.is(error, failure));
        assert.equal(control.state[field], checked);
        assert.equal(control.getSnapshot().revision, revision);
        assert.deepEqual(trace, [
          'value', ['observer', revision, checked, String(checked)],
          ['projection', checked ? 'checked' : 'unchecked', name === 'checkbox' ? [checked, false] : null],
          ['later observer', revision], 'update',
        ]);
      }
      control.destroy();
    }
  });

  test(`DOM ${name} publishes the current controlled revision once after proposal callbacks`, () => {
    for (const synchronize of [false, true]) {
      for (const throws of [false, true]) {
        const element = new FakeCheckboxInput();
        const failure = new Error('proposal failed');
        const snapshots = [];
        let updates = 0;
        let proposals = 0;
        const control = create({
          element, [value]: false,
          [change]: (proposed) => {
            proposals += 1;
            if (synchronize) assert.equal(control.update(proposed).ok, true);
            if (throws) throw failure;
          },
          onUpdate: () => { updates += 1; },
        });
        control.subscribe((snapshot) => snapshots.push([
          snapshot.revision, snapshot.state[field], element.attributes.get(attribute),
        ]));

        if (throws) assert.throws(() => control.send('toggle'), (error) => error === failure);
        else assert.equal(control.send('toggle'), true);
        const revision = synchronize ? 2 : 1;
        assert.deepEqual(snapshots, [[revision, synchronize, String(synchronize)]]);
        assert.equal(control.state[field], synchronize);
        if (name === 'checkbox') assert.equal(element.checked, synchronize);
        assert.equal(updates, 1);
        assert.equal(proposals, 1);
        assert.equal(control.update(false).ok, true);
        assert.deepEqual(snapshots.at(-1), [revision + 1, false, 'false']);
        assert.equal(updates, 2);
        control.destroy();
      }
    }
  });

  test(`DOM ${name} preserves the latest nested revision without duplicate publication`, () => {
    for (const source of ['change', 'subscriber']) {
      for (const throws of [false, true]) {
        const element = new FakeCheckboxInput();
        const failure = new Error('nested callback failed');
        const snapshots = [];
        let updates = 0;
        const control = create({
          element,
          [change]: (checked) => {
            if (source !== 'change' || !checked) return;
            assert.equal(control.send('toggle'), true);
            if (throws) throw failure;
          },
          onUpdate: () => { updates += 1; },
        });
        control.subscribe((snapshot) => {
          snapshots.push([snapshot.revision, snapshot.state[field], element.attributes.get(attribute)]);
          if (source !== 'subscriber' || snapshot.revision !== 1) return;
          assert.equal(control.send('toggle'), true);
          if (throws) throw failure;
        });

        if (throws) assert.throws(() => control.send('toggle'), (error) => error === failure);
        else assert.equal(control.send('toggle'), true);
        assert.deepEqual(snapshots, source === 'change'
          ? [[2, false, 'false']]
          : [[1, true, 'true'], [2, false, 'false']]);
        assert.equal(updates, 1);
        assert.equal(control.getSnapshot().revision, 2);
        assert.equal(control.state[field], false);
        assert.equal(element.attributes.get(attribute), 'false');
        if (name === 'checkbox') assert.equal(element.checked, false);
        control.destroy();
      }
    }
  });

  test(`DOM ${name} preserves uncommitted snapshots without observer publication`, () => {
    for (const policy of [{}, { disabled: true }, { readOnly: true }]) {
      const element = new FakeCheckboxInput();
      const trace = [];
      const control = create({
        element, ...policy,
        [change]: () => trace.push('value'),
        onUpdate: () => trace.push('update'),
      });
      control.subscribe(() => trace.push('observer'));
      const initial = control.getSnapshot();
      assert.equal(control.send('invalid'), false);
      if (policy.disabled || policy.readOnly) assert.equal(control.send('toggle'), false);
      assert.equal(control.update(true).ok, false);
      assert.equal(control.getSnapshot(), initial);
      assert.equal(element.attributes.get(attribute), 'false');
      assert.deepEqual(trace, []);
      control.destroy();
    }
  });
}
