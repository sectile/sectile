import assert from 'node:assert/strict'; import test from 'node:test'; import { createMenuButton } from '../dist/menu-button.js'; import { createMenubar } from '../dist/menubar.js'; import { createNavigationMenu } from '../dist/navigation-menu.js';
test('terminal menu button owns popup and nested invocation keys', () => { let invoked = null; const menu = createMenuButton({ items: [{ id: 'file', parentID: null }, { id: 'open', parentID: 'file' }], onInvoke: (id) => { invoked = id; } }); menu.handleEvent('open-popup'); menu.handleKeyboardInput({ key: 'right' }); menu.handleKeyboardInput({ key: 'enter' }); assert.equal(invoked, 'open'); assert.equal(menu.getSnapshot().state.open, false); });
test('terminal menu button owns disabled, edge, typeahead, and controlled open state',()=>{let now=0;let external=false;let menu;menu=createMenuButton({items:[{id:'alpha',parentID:null},{id:'beta',parentID:null},{id:'build',parentID:null}],disabledItems:['beta'],open:external,typeahead:{textValue:(id)=>id,now:()=>now},onOpenChange:(open)=>{external=open;queueMicrotask(()=>menu.syncControlledValue(external))}});menu.handleEvent('open-popup');menu.syncControlledValue(true);menu.handleKeyboardInput({key:'end'});assert.equal(menu.getSnapshot().state.cursor.current,'build');menu.handleKeyboardInput({key:'a'});assert.equal(menu.getSnapshot().state.cursor.current,'alpha');now=600;menu.handleKeyboardInput({key:'b'});assert.equal(menu.getSnapshot().state.cursor.current,'beta');menu.handleEvent('invoke');assert.equal(menu.getSnapshot().state.open,true)});
test('terminal menubar follows its vertical tree projection', () => {
  const menubar = createMenubar({
    items: [
      { id: 'file', parentID: null },
      { id: 'new', parentID: 'file' },
      { id: 'open', parentID: 'file' },
      { id: 'edit', parentID: null },
      { id: 'copy', parentID: 'edit' },
      { id: 'help', parentID: null },
    ],
    defaultHighlightedValue: 'file',
  });

  menubar.handleKeyboardInput({ key: 'down' });
  assert.equal(menubar.getSnapshot().state.cursor.current, 'edit');
  menubar.handleKeyboardInput({ key: 'up' });
  assert.equal(menubar.getSnapshot().state.cursor.current, 'file');

  menubar.handleKeyboardInput({ key: 'right' });
  assert.equal(menubar.getSnapshot().state.cursor.current, 'new');
  assert.deepEqual(menubar.getSnapshot().state.openPath, ['file']);
  menubar.handleKeyboardInput({ key: 'down' });
  assert.equal(menubar.getSnapshot().state.cursor.current, 'open');
  menubar.handleKeyboardInput({ key: 'left' });
  assert.equal(menubar.getSnapshot().state.cursor.current, 'file');
  assert.deepEqual(menubar.getSnapshot().state.openPath, []);
});

test('terminal navigation menu keeps horizontal roots and uses vertical nested panels',()=>{const navigation=createNavigationMenu({items:[{id:'products',parentID:null},{id:'overview',parentID:'products'},{id:'pricing',parentID:'products'},{id:'docs',parentID:null}],defaultHighlightedValue:'products'});navigation.handleKeyboardInput({key:'right'});assert.equal(navigation.getSnapshot().state.cursor.current,'docs');navigation.handleKeyboardInput({key:'left'});assert.equal(navigation.getSnapshot().state.cursor.current,'products');navigation.handleKeyboardInput({key:'down'});assert.deepEqual(navigation.getSnapshot().state.openPath,['products']);assert.equal(navigation.getSnapshot().state.cursor.current,'overview');navigation.handleKeyboardInput({key:'down'});assert.equal(navigation.getSnapshot().state.cursor.current,'pricing');navigation.handleKeyboardInput({key:'left'});assert.equal(navigation.getSnapshot().state.cursor.current,'products');assert.deepEqual(navigation.getSnapshot().state.openPath,[])});
