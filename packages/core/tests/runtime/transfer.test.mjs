import assert from 'node:assert/strict';
import test from 'node:test';
import { createTransferState, tryCreateTransferState, getTransferItems, applyTransferEvent, synchronizeTransferState, reconcileTransferState } from '../../.verification-dist/transfer.js';

const nodes = [
  { id: 'available', parentID: null }, { id: 'chosen', parentID: null },
  { id: 'a', parentID: 'available' }, { id: 'b', parentID: 'available' },
  { id: 'c', parentID: 'chosen' }, { id: 'child', parentID: 'a' },
];
const create = input => createTransferState(nodes, { sourceID: 'available', targetID: 'chosen', ...input });
const value = result => { assert.equal(result.ok, true, JSON.stringify(result)); return result.value; };
const items = (state, side) => getTransferItems(state, side).ids;

test('Transfer admits one source tree and borrows stable disjoint child domains', () => {
  const state = create();
  assert.deepEqual(items(state,'source'), ['a','b']); assert.deepEqual(items(state,'target'), ['c']);
  assert.equal(getTransferItems(state,'source'), getTransferItems(state,'source'));
  assert.equal(Object.isFrozen(state), true); assert.equal(Object.isFrozen(state.nodes), true);
  for (const pair of [ {sourceID:'a',targetID:'chosen'}, {sourceID:'available',targetID:'available'}, {sourceID:'missing',targetID:'chosen'} ]) {
    assert.equal(tryCreateTransferState(nodes,pair).error.code, 'transfer-bucket-invalid');
  }
  assert.equal(tryCreateTransferState(nodes,{sourceID:'available',targetID:'chosen',source:{selected:['c']}}).ok,false);
  assert.equal(applyTransferEvent({...state},{type:'move',from:'source'}).error.code,'transfer-state-owner-mismatch');
  const input = nodes.map(node=>({...node})); const snapshot = createTransferState(input,{sourceID:'available',targetID:'chosen'});
  input[2].parentID='chosen'; input.pop(); assert.deepEqual(items(snapshot,'source'),['a','b']);
  let reads=0; const oversized=Array(3); Object.defineProperty(oversized,0,{get(){reads++;throw Error('not admitted');}});
  assert.equal(tryCreateTransferState(nodes,{sourceID:'available',targetID:'chosen',source:{selected:oversized}}).error.code,'item-ceiling-exceeded'); assert.equal(reads,0);
  const selected=['a']; selected[Symbol.iterator]=function*(){throw Error('caller iterator must not run');};
  assert.deepEqual(create({source:{selected}}).source.selection.selected,['a']);
});

test('Transfer delegates pane selection/navigation and respects readonly and disabled boundaries', () => {
  const state = create();
  const first = value(applyTransferEvent(state,{type:'listbox',side:'source',event:'first'}));
  assert.equal(first.state.source.cursor.current,'a'); assert.deepEqual(first.commands,[{type:'focus',id:'a',side:'source'}]);
  const selected = value(applyTransferEvent(first.state,{type:'listbox',side:'source',event:'toggle'}));
  assert.deepEqual(selected.state.source.selection.selected,['a']); assert.deepEqual(selected.state.target.selection.selected,[]);
  const skipped = value(applyTransferEvent(state,{type:'listbox',side:'source',event:'first'},{eligible:id=>id!=='a'}));
  assert.equal(skipped.state.source.cursor.current,'b');
  assert.equal(value(applyTransferEvent(selected.state,{type:'move',from:'source'},{readonly:true})).state,selected.state);
  assert.equal(value(applyTransferEvent(selected.state,{type:'listbox',side:'source',event:'toggle'},{readonly:true})).state,selected.state);
  assert.equal(value(applyTransferEvent(selected.state,{type:'listbox',side:'source',event:'next'},{readonly:true})).state.source.cursor.current,'b');
  assert.equal(value(applyTransferEvent(selected.state,{type:'listbox',side:'source',event:'next'},{disabled:true})).state,selected.state);
});

test('Transfer accepts membership, source selection removal and focus repair as one transaction', () => {
  const state = create({source:{selected:['a'],current:'a'},target:{selected:['c'],current:'c'}});
  const moved = value(applyTransferEvent(state,{type:'move',from:'source'}));
  assert.deepEqual(items(moved.state,'source'),['b']); assert.deepEqual(items(moved.state,'target'),['c','a']);
  assert.deepEqual(moved.state.source.selection.selected,[]); assert.deepEqual(moved.state.target.selection.selected,['c']);
  assert.equal(moved.state.source.cursor.current,'b'); assert.equal(moved.state.target.cursor.current,'c');
  assert.equal(moved.state.nodes.find(node=>node.id==='child').parentID,'a');
  assert.equal(moved.commands.filter(command=>command.type==='membership-changed').length,1);
  assert.deepEqual(moved.commands.find(command=>command.type==='focus'),{type:'focus',side:'source',id:'b'});
  const empty = value(applyTransferEvent(moved.state,{type:'move',from:'source',ids:['b']}));
  assert.deepEqual(items(empty.state,'source'),[]); assert.equal(empty.state.source.cursor.current,null);
  assert.deepEqual(empty.commands.find(command=>command.type==='focus'),{type:'focus',side:'source',id:null});
  assert.deepEqual(items(state,'source'),['a','b']);
});

test('Transfer rejects complete stale, duplicate, disabled and over-capacity moves without partial membership', () => {
  const state = create({source:{selected:['a','b'],current:'a'}});
  for (const [event,policies,code] of [
    [{type:'move',from:'source',ids:null},{},'invalid-transfer-event'],
    [{type:'move',from:'source',ids:['a','c']},{},'transfer-item-outside-source'],
    [{type:'move',from:'source',ids:['a','a']},{},'reorder-tree-ids-duplicate'],
    [{type:'move',from:'source'},{eligible:id=>id!=='b'},'transfer-target-unavailable'],
    [{type:'move',from:'source'},{canMove:id=>id!=='a'},'transfer-target-unavailable'],
    [{type:'move',from:'source'},{capacity:{target:2}},'transfer-capacity-exceeded'],
  ]) {
    const result=applyTransferEvent(state,event,policies); assert.equal(result.ok,false); assert.equal(result.error.code,code);
    assert.deepEqual(items(state,'source'),['a','b']); assert.deepEqual(state.source.selection.selected,['a','b']); assert.equal(state.source.cursor.current,'a');
  }
  const moved=value(applyTransferEvent(state,{type:'move',from:'source'})).state;
  assert.equal(applyTransferEvent(moved,{type:'move',from:'source',ids:['a']}).ok,false);
  const empty=create(); assert.equal(value(applyTransferEvent(empty,{type:'move',from:'source'})).state,empty);
  for(const policies of [{capacity:{target:-1}},{capacity:[]},{maxScan:-1},{eligible:1}]) assert.equal(applyTransferEvent(state,{type:'move',from:'source'},policies).ok,false);
});

test('Transfer controlled refusal keeps selection and focus until membership is accepted', () => {
  const state=create({source:{selected:['a'],current:'a'}});
  const proposed=value(applyTransferEvent(state,{type:'move',from:'source'})).state;
  assert.equal(value(reconcileTransferState(state,proposed,{membership:true})),state);
  assert.equal(value(reconcileTransferState(state,proposed)),proposed);
  const retained=value(reconcileTransferState(state,proposed,{sourceSelection:true}));
  assert.deepEqual(retained.source.selection.selected,[],'accepted membership cannot retain a selection in the other pane');
  assert.equal(retained.source.cursor.current,'b');
  const toggle=value(applyTransferEvent(state,{type:'listbox',side:'source',event:'toggle'})).state;
  assert.equal(value(reconcileTransferState(state,toggle,{sourceSelection:true})),state);
  const highlighted=value(applyTransferEvent(state,{type:'listbox',side:'source',event:'next'})).state;
  assert.equal(value(reconcileTransferState(state,highlighted,{sourceCursor:true})),state);
  assert.equal(value(reconcileTransferState(state,proposed,{sourceCursor:true})).source.cursor.current,'b','accepted membership repairs a retained cursor outside its new pane');
});

test('Transfer synchronization rebases retained snapshots but rejects explicit invalid ones atomically', () => {
  const state=create({source:{selected:['a'],current:'a'},target:{selected:['c'],current:'c'}});
  const changed=nodes.map(node=>node.id==='a'?{...node,parentID:'chosen'}:node);
  const next=value(synchronizeTransferState(state,{nodes:changed}));
  assert.deepEqual(next.source.selection.selected,[]); assert.equal(next.source.cursor.current,'b');
  assert.deepEqual(next.target.selection.selected,['c']); assert.equal(next.target.cursor.current,'c');
  assert.equal(synchronizeTransferState(state,{nodes:changed,source:{selected:['a']}}).ok,false);
  assert.equal(synchronizeTransferState(state,{source:{current:'b'}},{eligible:id=>id!=='b'}).ok,false);
  assert.equal(value(synchronizeTransferState(state,{})),state);
  assert.equal(synchronizeTransferState(state,{nodes:nodes.filter(node=>node.id!=='available')}).ok,false);
});

test('Transfer captures explicit move IDs once and rejects incomplete focus repair without publication', () => {
  const state=create({source:{current:'a'}}); let reads=0;
  const ids=[]; Object.defineProperty(ids,0,{get(){reads++;return reads===1?'a':'missing';}});
  assert.deepEqual(items(value(applyTransferEvent(state,{type:'move',from:'source',ids})).state,'source'),['b']); assert.equal(reads,1);
  const more=[...nodes,{id:'d',parentID:'available'}];
  const original=createTransferState(more,{sourceID:'available',targetID:'chosen',source:{current:'a'}});
  const rejected=applyTransferEvent(original,{type:'move',from:'source',ids:['a']},{eligible:id=>id!=='b',maxScan:1});
  assert.equal(rejected.ok,false); assert.equal(rejected.error.code,'scan-ceiling-reached');
  assert.deepEqual(items(original,'source'),['a','b','d']);
});

test('Transfer selection navigation borrows topology and dense moves build only one next hierarchy', () => {
  for(const size of [16,128,4096]) {
    const ids=Array.from({length:size},(_,id)=>id), input=[{id:'left',parentID:null},{id:'right',parentID:null},...ids.map(id=>({id,parentID:'left'}))];
    const state=createTransferState(input,{sourceID:'left',targetID:'right',source:{selected:ids,current:0}});
    let writes=0; const set=Map.prototype.set;
    Map.prototype.set=function(...args){writes++;return set.apply(this,args);};
    let navigation,moved;
    try {
      navigation=value(applyTransferEvent(state,{type:'listbox',side:'source',event:'next'}));
      assert.equal(writes,0,'navigation does not reconstruct a tree or item-domain index');
      moved=value(applyTransferEvent(state,{type:'move',from:'source'}));
    } finally {Map.prototype.set=set;}
    assert.ok(writes<=18*(size+2),JSON.stringify({size,writes}));
    assert.equal(getTransferItems(navigation.state,'source'),getTransferItems(state,'source'));
    assert.deepEqual(items(moved.state,'target'),ids); assert.deepEqual(items(moved.state,'source'),[]);
  }
});

test('Transfer weak owners release retired states while a successor and borrowed views remain held',{skip:typeof global.gc!=='function'},async()=>{
  let retired;
  const successor=(()=>{const state=create({source:{selected:['a']}});retired=new WeakRef(state);return value(applyTransferEvent(state,{type:'move',from:'source'})).state;})();
  const borrowed=getTransferItems(successor,'source');
  for(let attempt=0;attempt<25;attempt++){await new Promise(resolve=>setImmediate(resolve));global.gc();}
  assert.equal(retired.deref(),undefined); assert.deepEqual(borrowed.ids,['b']);
});
