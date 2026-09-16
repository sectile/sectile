import assert from 'node:assert/strict'; import test from 'node:test'; import { unwrap } from '@sectile/core/result';
import { createCheckbox } from '../.verification-dist/checkbox.js'; import { createSwitch } from '../.verification-dist/switch.js'; import { createToggleButton } from '../.verification-dist/toggle-button.js';
test('terminal checked controls own enter and space dispatch', () => {
  const checkbox = createCheckbox({ defaultValue: 'mixed' }); checkbox.handleKeyboardInput({ key: 'space' }); assert.equal(checkbox.getSnapshot().state.checked, true);
  const control = createSwitch(); control.handleKeyboardInput({ key: 'enter' }); assert.equal(control.getSnapshot().state.checked, true);
  const toggle = createToggleButton(); toggle.handleKeyboardInput({ key: 'space' }); assert.equal(toggle.getSnapshot().state.pressed, true); assert.equal(toggle.handleKeyboardInput({ key: 'tab' }), false);
});
test('terminal checked controls enforce disabled and read-only policies', () => {
  const disabled = createSwitch({ disabled: true });
  assert.equal(disabled.handleKeyboardInput({ key: 'space' }), false);
  assert.equal(disabled.getSnapshot().state.checked, false);

  const readOnly = createCheckbox({ readOnly: true });
  assert.equal(readOnly.handleKeyboardInput({ key: 'space' }), false);
  assert.equal(readOnly.getSnapshot().state.checked, false);
});

for (const { name, create, change, value, field } of [
  { name: 'checkbox', create: createCheckbox, change: 'onValueChange', value: 'value', field: 'checked' },
  { name: 'switch', create: createSwitch, change: 'onCheckedChange', value: 'checked', field: 'checked' },
  { name: 'toggle button', create: createToggleButton, change: 'onPressedChange', value: 'pressed', field: 'pressed' },
]) {
  test(`terminal ${name} completes all observers before the first callback error escapes`, () => {
    for (const failure of [new Error('value failed'), undefined, null]) {
      const trace = [];
      const control = create({
        [change]: () => { trace.push('value'); throw failure; },
        onUpdate: () => { trace.push('update'); throw new Error('later update failure'); },
      });
      control.subscribe((snapshot) => {
        trace.push(['observer', snapshot.revision, snapshot.state[field]]);
        throw new Error('later observer failure');
      });
      control.subscribe((snapshot) => trace.push(['later observer', snapshot.revision]));

      for (const [revision, checked] of [[1, true], [2, false]]) {
        trace.length = 0;
        assert.throws(() => control.handleKeyboardInput({ key: 'space' }), (error) => Object.is(error, failure));
        assert.equal(control.state[field], checked);
        assert.equal(control.getSnapshot().revision, revision);
        assert.deepEqual(trace, [
          'value', ['observer', revision, checked], ['later observer', revision], 'update',
        ]);
      }
      control.destroy();
    }
  });

  test(`terminal ${name} publishes the current controlled revision once after proposal callbacks`, () => {
    for (const synchronize of [false, true]) {
      for (const throws of [false, true]) {
        const failure = new Error('proposal failed');
        const snapshots = [];
        let updates = 0;
        let proposals = 0;
        const control = create({
          [value]: false,
          [change]: (proposed) => {
            proposals += 1;
            if (synchronize) assert.equal(control.update(proposed).ok, true);
            if (throws) throw failure;
          },
          onUpdate: () => { updates += 1; },
        });
        control.subscribe((snapshot) => snapshots.push([snapshot.revision, snapshot.state[field]]));

        if (throws) assert.throws(() => control.send('toggle'), (error) => error === failure);
        else assert.equal(control.send('toggle'), true);
        const revision = synchronize ? 2 : 1;
        assert.deepEqual(snapshots, [[revision, synchronize]]);
        assert.equal(control.state[field], synchronize);
        assert.equal(updates, 1);
        assert.equal(proposals, 1);
        assert.equal(control.update(false).ok, true);
        assert.deepEqual(snapshots.at(-1), [revision + 1, false]);
        assert.equal(updates, 2);
        control.destroy();
      }
    }
  });

  test(`terminal ${name} preserves the latest nested revision without duplicate publication`, () => {
    for (const source of ['change', 'subscriber']) {
      for (const throws of [false, true]) {
        const failure = new Error('nested callback failed');
        const snapshots = [];
        let updates = 0;
        const control = create({
          [change]: (checked) => {
            if (source !== 'change' || !checked) return;
            assert.equal(control.send('toggle'), true);
            if (throws) throw failure;
          },
          onUpdate: () => { updates += 1; },
        });
        control.subscribe((snapshot) => {
          snapshots.push([snapshot.revision, snapshot.state[field]]);
          if (source !== 'subscriber' || snapshot.revision !== 1) return;
          assert.equal(control.send('toggle'), true);
          if (throws) throw failure;
        });

        if (throws) assert.throws(() => control.send('toggle'), (error) => error === failure);
        else assert.equal(control.send('toggle'), true);
        assert.deepEqual(snapshots, source === 'change' ? [[2, false]] : [[1, true], [2, false]]);
        assert.equal(updates, 1);
        assert.equal(control.getSnapshot().revision, 2);
        assert.equal(control.state[field], false);
        control.destroy();
      }
    }
  });

  test(`terminal ${name} preserves uncommitted snapshots without observer publication`, () => {
    for (const policy of [{}, { disabled: true }, { readOnly: true }]) {
      const trace = [];
      const control = create({
        ...policy,
        [change]: () => trace.push('value'),
        onUpdate: () => trace.push('update'),
      });
      control.subscribe(() => trace.push('observer'));
      const initial = control.getSnapshot();
      assert.equal(control.send('invalid'), false);
      assert.equal(control.handleKeyboardInput({ key: 'tab' }), false);
      if (policy.disabled || policy.readOnly) assert.equal(control.send('toggle'), false);
      assert.equal(control.update(true).ok, false);
      assert.equal(control.getSnapshot(), initial);
      assert.deepEqual(trace, []);
      control.destroy();
    }
  });
}
