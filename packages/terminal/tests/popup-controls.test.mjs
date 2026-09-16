import assert from'node:assert/strict';import test from'node:test';import{unwrap}from'@sectile/core/result';import{createDialog}from'../.verification-dist/dialog.js';import{createDrawer}from'../.verification-dist/drawer.js';import{createPopover}from'../.verification-dist/popover.js';import{createAlertDialog}from'../.verification-dist/alert-dialog.js';import{createTooltip}from'../.verification-dist/tooltip.js';test('terminal popup facades own escape and command delivery',()=>{let restored=0;const d=createDialog({defaultOpen:true,onFocusRestore:()=>restored++});d.handleKeyboardInput({key:'escape'});assert.equal(restored,1);const p=createPopover({defaultOpen:true});p.handleKeyboardInput({key:'escape'});assert.equal(p.getSnapshot().state.open,false);let announced=0;const a=createAlertDialog({onAnnounce:()=>announced++});a.handleEvent('open');assert.equal(announced,1);const t=createTooltip();t.handleEvent('open');t.handleKeyboardInput({key:'escape'});assert.equal(t.getSnapshot().state.open,false)});test('terminal drawer preserves its side through open reconciliation',()=>{const drawer=createDrawer({defaultOpen:true,side:'left'});assert.equal(drawer.getSnapshot().state.side,'left');drawer.handleEvent({type:'set-side',side:'right'});drawer.handleKeyboardInput({key:'escape'});assert.deepEqual(drawer.getSnapshot().state,{open:false,side:'right'})});

for (const { name, create, opening, closing } of [
  { name: 'Popover', create: createPopover, opening: ['focus'], closing: ['restore'] },
  { name: 'Dialog', create: createDialog, opening: ['focus'], closing: ['restore'] },
  { name: 'AlertDialog', create: createAlertDialog, opening: ['focus', 'announce'], closing: ['restore'] },
  { name: 'Drawer', create: createDrawer, opening: ['focus'], closing: ['restore'] },
  { name: 'Tooltip', create: createTooltip, opening: [], closing: [] },
]) {
  test(`terminal ${name} drains committed commands and observers before the first callback error escapes`, () => {
    for (const open of [true, false]) {
      const commands = open ? opening : closing;
      for (const firstPhase of [...commands, 'change']) {
        for (const failure of [new Error('first callback failed'), undefined, null]) {
          const trace = [];
          let failed = false;
          const publish = (phase) => {
            trace.push(phase);
            assert.equal(control.getSnapshot().revision, 1);
            assert.equal(control.state.open, open);
            if (phase === firstPhase) { failed = true; throw failure; }
            if (failed) throw new Error('later callback failed');
          };
          const control = create({
            defaultOpen: !open,
            onInitialFocus: () => publish('focus'),
            onFocusRestore: () => publish('restore'),
            onAnnounce: () => publish('announce'),
            onOpenChange: () => publish('change'),
            onUpdate: () => { trace.push('update'); throw new Error('update failed'); },
          });
          control.subscribe((snapshot) => {
            trace.push(`observer:${snapshot.revision}:${snapshot.state.open}`);
            throw new Error('observer failed');
          });
          control.subscribe((snapshot) => trace.push(`later:${snapshot.revision}`));

          assert.throws(
            () => open ? control.send('open') : control.handleKeyboardInput({ key: 'escape' }),
            (error) => Object.is(error, failure),
          );
          assert.equal(control.state.open, open);
          assert.deepEqual(trace, [...commands, 'change', `observer:1:${open}`, 'later:1', 'update']);
          control.destroy();
        }
      }
    }
  });

  test(`terminal ${name} publishes controlled synchronization once and retains external ownership`, () => {
    for (const synchronize of [false, true]) {
      for (const throws of [false, true]) {
        const failure = new Error('proposal failed');
        const snapshots = [];
        const effects = [];
        let updates = 0;
        const control = create({
          open: false,
          onInitialFocus: () => effects.push('focus'),
          onAnnounce: () => effects.push('announce'),
          onOpenChange: (proposed) => {
            if (synchronize) assert.equal(control.update(proposed).ok, true);
            if (throws) throw failure;
          },
          onUpdate: () => { updates += 1; },
        });
        control.subscribe((snapshot) => snapshots.push([snapshot.revision, snapshot.state.open]));
        if (throws) assert.throws(() => control.send('open'), (error) => error === failure);
        else assert.equal(control.send('open'), true);
        const revision = synchronize ? 2 : 1;
        assert.deepEqual(snapshots, [[revision, synchronize]]);
        assert.deepEqual(effects, opening);
        assert.equal(updates, 1);
        assert.equal(control.state.open, synchronize);
        assert.equal(control.update(false).ok, true);
        assert.deepEqual(snapshots.at(-1), [revision + 1, false]);
        assert.equal(updates, 2);
        control.destroy();
      }
    }
  });

  test(`terminal ${name} leaves rejected transitions unpublished`, () => {
    for (const policy of [{}, { disabled: true }, { readOnly: true }]) {
      const trace = [];
      const control = create({
        ...policy,
        onInitialFocus: () => trace.push('focus'),
        onAnnounce: () => trace.push('announce'),
        onOpenChange: () => trace.push('change'),
        onUpdate: () => trace.push('update'),
      });
      control.subscribe(() => trace.push('observer'));
      const initial = control.getSnapshot();
      assert.equal(control.send('invalid'), false);
      assert.equal(control.handleKeyboardInput({ key: 'tab' }), false);
      if (policy.disabled || policy.readOnly) assert.equal(control.send('open'), false);
      assert.equal(control.update(true).ok, false);
      assert.equal(control.getSnapshot(), initial);
      assert.deepEqual(trace, []);
      control.destroy();
    }
  });
}

test('terminal popup reentrant callbacks publish the latest revision without duplicate delivery', () => {
  for (const source of ['focus', 'change', 'subscriber', 'update']) {
    for (const throws of [false, true]) {
      const failure = new Error('reentrant callback failed');
      const snapshots = [];
      let updates = 0;
      let restores = 0;
      const close = () => {
        assert.equal(control.send('close'), true);
        if (throws) throw failure;
      };
      const control = createDialog({
        onInitialFocus: () => { if (source === 'focus') close(); },
        onFocusRestore: () => { restores += 1; },
        onOpenChange: (open) => { if (source === 'change' && open) close(); },
        onUpdate: () => {
          updates += 1;
          if (source === 'update' && control.getSnapshot().revision === 1) close();
        },
      });
      control.subscribe((snapshot) => {
        snapshots.push([snapshot.revision, snapshot.state.open]);
        if (source === 'subscriber' && snapshot.revision === 1) close();
      });
      if (throws) assert.throws(() => control.send('open'), (error) => error === failure);
      else assert.equal(control.send('open'), true);
      assert.deepEqual(snapshots, ['focus', 'change'].includes(source)
        ? [[2, false]] : [[1, true], [2, false]]);
      assert.equal(control.getSnapshot().revision, 2);
      assert.equal(control.state.open, false);
      assert.equal(updates, source === 'update' ? 2 : 1);
      assert.equal(restores, 1);
      control.destroy();
    }
  }
});
