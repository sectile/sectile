import assert from 'node:assert/strict';
import test from 'node:test';
import {createTransfer,tryCreateTransfer,connectTransfer,createTransferController,toTransferEvent} from '../.verification-dist/transfer.js';
const nodes=[{id:'left',parentID:null},{id:'right',parentID:null},{id:'a',parentID:'left'},{id:'b',parentID:'left'},{id:'c',parentID:'right'}];
const create=options=>{const result=createTransferController({nodes,sourceID:'left',targetID:'right',...options});assert.equal(result.ok,true,result.error?.message);return result.value;};
test('Native Transfer reuses Listbox keys and maps logical cross-pane moves without consuming IME/native keys',()=>{
  assert.deepEqual(toTransferEvent('source',{key:'ArrowDown'}),{type:'listbox',side:'source',event:'next'});
  assert.deepEqual(toTransferEvent('target',{key:' '}),{type:'listbox',side:'target',event:'toggle'});
  assert.deepEqual(toTransferEvent('source',{key:'ArrowRight',ctrlKey:true}),{type:'move',from:'source'});
  assert.deepEqual(toTransferEvent('source',{key:'ArrowLeft',ctrlKey:true},'rtl'),{type:'move',from:'source'});
  assert.deepEqual(toTransferEvent('target',{key:'ArrowRight',ctrlKey:true},'rtl'),{type:'move',from:'target'});
  for(const input of [{key:'Tab'},{key:'Enter',isComposing:true},{key:'ArrowDown',altKey:true},{key:'ArrowDown',shiftKey:true},{key:'ArrowDown',metaKey:true},{key:'ArrowDown',ctrlKey:true}])assert.equal(toTransferEvent('source',input),null);
});
test('Native Transfer keeps controlled membership refusal atomic and focuses only after accepted synchronization',()=>{
  const moves=[],values=[],highlights=[],effects=[];
  const owner=create({controlled:true,source:{defaultValue:['a'],defaultHighlightedValue:'a'},onMove:value=>moves.push(value),onValueChange:(...value)=>values.push(value),onHighlightedValueChange:(...value)=>highlights.push(value),onEffect:value=>effects.push(value)});
  const before=owner.getSnapshot().state;
  try{
    const result=owner.handleKeyboardInput('source',{key:'ArrowRight',ctrlKey:true});assert.equal(result.ok,true);
    assert.equal(owner.getSnapshot().state,before);assert.deepEqual(result.commands,[]);assert.deepEqual(effects,[]);
    assert.equal(moves.length,1);assert.deepEqual(moves[0].sourceValue,[]);assert.equal(moves[0].sourceHighlightedValue,'b');
    assert.deepEqual(values,[]);assert.deepEqual(highlights,[]);
    assert.equal(owner.syncControlledValues({nodes:moves[0].nodes}).ok,true);
    assert.deepEqual(owner.getItems('target').ids,['c','a']);assert.equal(owner.getSnapshot().state.source.cursor.current,'b');
    assert.deepEqual(effects,[{type:'focus-element',side:'source',id:'b'}]);assert.equal(moves.length,1);
  }finally{owner.dispose();}
});
test('Native Transfer accepts synchronous parent moves once and fences obsolete proposal effects',()=>{
  const effects=[];let owner,updates=0;
  owner=create({controlled:true,source:{value:['a'],highlightedValue:'a'},target:{value:['c'],highlightedValue:'c'},
    onMove:proposal=>{assert.equal(owner.syncControlledValues({nodes:proposal.nodes,source:{value:proposal.sourceValue,highlightedValue:proposal.sourceHighlightedValue},target:{value:proposal.targetValue,highlightedValue:proposal.targetHighlightedValue}}).ok,true);},
    onEffect:effect=>effects.push(effect),onUpdate:()=>updates++});
  try{
    const result=owner.handleEvent({type:'move',from:'source'});assert.equal(result.ok,true);assert.deepEqual(result.commands,[]);
    assert.deepEqual(owner.getItems('source').ids,['b']);assert.deepEqual(owner.getSnapshot().state.source.selection.selected,[]);
    assert.deepEqual(effects,[{type:'focus-element',side:'source',id:'b'}]);assert.equal(updates,1);
  }finally{owner.dispose();}
});
test('Native Transfer independently controls pane value/cursor and enforces stable synchronization modes',()=>{
  const values=[],highlights=[],effects=[];
  const owner=create({source:{value:['a'],highlightedValue:'a'},onValueChange:(...value)=>values.push(value),onHighlightedValueChange:(...value)=>highlights.push(value),onEffect:effect=>effects.push(effect)});
  try{
    assert.equal(owner.handleKeyboardInput('source',{key:'ArrowDown'}).ok,true);
    assert.equal(owner.getSnapshot().state.source.cursor.current,'a');assert.deepEqual(highlights,[['source','b']]);assert.deepEqual(effects,[]);
    assert.equal(owner.handleKeyboardInput('source',{key:' '}).ok,true);assert.deepEqual(owner.getSnapshot().state.source.selection.selected,['a']);assert.deepEqual(values,[['source',[]]]);
    assert.equal(owner.syncControlledValues({source:{value:['a']}}).error.code,'controlled-highlighted-value-required');
    assert.equal(owner.syncControlledValues({nodes,source:{value:['a'],highlightedValue:'b'}}).error.code,'uncontrolled-value-update');
    assert.equal(owner.syncControlledValues({source:{value:['a'],highlightedValue:'b'}}).ok,true);assert.equal(owner.getSnapshot().state.source.cursor.current,'b');
    const revision=owner.getSnapshot().revision;
    assert.equal(owner.handleKeyboardInput('source',{key:'Home'},revision-1).error.code,'stale-revision');
  }finally{owner.dispose();}
});
test('Native Transfer respects disabled/read-only state, bounded item admission and eligibility',()=>{
  const owner=create({disabledItems:['a'],policies:{capacity:{target:1}}});
  try{
    assert.equal(owner.isDisabled('a'),true);assert.equal(owner.isDisabled('b'),false);assert.equal(owner.isDisabled('missing'),null);
    assert.equal(owner.handleKeyboardInput('source',{key:'Home'}).ok,true);assert.equal(owner.getSnapshot().state.source.cursor.current,'b');
    assert.equal(owner.handleEvent({type:'move',from:'source',ids:['a']}).error.code,'transfer-capacity-exceeded');
    owner.syncInteraction({readOnly:true});assert.equal(Object.isFrozen(owner.getInteraction()),true);
    assert.equal(owner.handleKeyboardInput('source',{key:' '}).error.code,'interaction-read-only');
    assert.equal(owner.handleKeyboardInput('source',{key:'Home'}).ok,true);
    owner.syncInteraction({disabled:true});assert.equal(owner.handleKeyboardInput('source',{key:'Home'}).error.code,'interaction-disabled');
  }finally{owner.dispose();}
  let reads=0;const oversized=Array(4);Object.defineProperty(oversized,0,{get(){reads++;throw Error('not admitted');}});
  assert.equal(createTransferController({nodes,sourceID:'left',targetID:'right',disabledItems:oversized}).error.code,'item-ceiling-exceeded');assert.equal(reads,0);
  assert.equal(createTransferController({nodes,sourceID:'left',targetID:'right',disabledItems:['left']}).error.code,'disabled-item-outside-domain');
  assert.equal(createTransferController({nodes,sourceID:'left',targetID:'right',policies:{eligible:1}}).error.code,'invalid-eligibility-policy');
});
test('Native Transfer drains committed callback failures and preserves the first exception',()=>{
  const first=Error('move'),effect=Error('effect'),last=Error('update');let updates=0;
  const owner=create({source:{defaultValue:['a'],defaultHighlightedValue:'a'},onMove:()=>{throw first;},onEffect:()=>{throw effect;},onUpdate:()=>{updates++;throw last;}});
  assert.throws(()=>owner.handleEvent({type:'move',from:'source'}),error=>error===first);
  assert.deepEqual(owner.getItems('source').ids,['b']);assert.equal(updates,1);
  assert.throws(()=>owner.dispose(),error=>error===last);owner.dispose();assert.equal(owner.getActive(),false);
  assert.equal(owner.handleEvent({get type(){throw Error('retired event');}}).error.code,'interaction-disabled');
  assert.equal(owner.handleKeyboardInput('source',{get key(){throw Error('retired key');}}).error.code,'interaction-disabled');
  assert.equal(owner.syncControlledValues({get nodes(){throw Error('retired values');}}).error.code,'interaction-disabled');
});
test('Native Transfer rejects reentrant input and disposal during either admission phase',()=>{
  let owner,armed=false,reentrant;
  owner=create({source:{defaultValue:['a']},policies:{canMove:()=>{if(armed){reentrant=owner.handleEvent({type:'move',from:'source'});owner.dispose();}return true;}}});
  armed=true;const before=owner.getSnapshot().state;
  assert.equal(owner.handleEvent({type:'move',from:'source'}).error.code,'interaction-disabled');
  assert.equal(reentrant.error.code,'invalid-boundary');assert.equal(owner.getSnapshot().state,before);
  let second,queries=0,active=false;
  second=create({policies:{eligible:()=>{if(active&&++queries===2)second.dispose();return true;}}});
  active=true;const previous=second.getSnapshot().state;
  assert.equal(second.handleEvent({type:'listbox',side:'source',event:{type:'focus',id:'a'}}).ok,false);
  assert.equal(second.getSnapshot().state,previous);assert.equal(second.getActive(),false);
  const third=create();let nested;
  const interaction=third.syncInteraction({get disabled(){nested=third.handleKeyboardInput('source',{key:'Home'});third.dispose();return false;},get readOnly(){throw Error('retired interaction tail');}});
  assert.equal(interaction.error.code,'interaction-disabled');assert.equal(nested.error.code,'invalid-boundary');assert.equal(third.getInteraction().disabled,true);
});
test('Native Transfer ordinary navigation never renormalizes dense selected arrays or rebuilds topology',()=>{
  for(const size of [16,128,4096]){
    const ids=Array.from({length:size},(_,i)=>`item${i}`),input=[{id:'left',parentID:null},{id:'right',parentID:null},...ids.map(id=>({id,parentID:'left'}))];
    const owner=createTransferController({nodes:input,sourceID:'left',targetID:'right',source:{defaultValue:ids}}).value;
    const domain=owner.getItems('source'),selected=owner.getSnapshot().state.source.selection;
    let sorts=0,writes=0;const sort=Array.prototype.sort,set=Map.prototype.set;
    Array.prototype.sort=function(...args){sorts++;return sort.apply(this,args);};Map.prototype.set=function(...args){writes++;return set.apply(this,args);};
    try{
      owner.handleKeyboardInput('source',{key:'Home'});owner.handleKeyboardInput('source',{key:'End'});
      assert.equal(sorts,0);assert.equal(writes,0);assert.equal(owner.getItems('source'),domain);assert.equal(owner.getSnapshot().state.source.selection,selected);
    }finally{Array.prototype.sort=sort;Map.prototype.set=set;owner.dispose();}
  }
});
test('held retired Native Transfer controllers release callbacks and policy payloads',{skip:typeof global.gc!=='function'},async()=>{
  const retained=retiredOwner();retained.owner.dispose();
  for(let i=0;i<25;i++){await new Promise(resolve=>setImmediate(resolve));global.gc();}
  assert.equal(retained.payload.deref(),undefined);assert.equal(retained.saved({get type(){throw Error('retired saved method');}}).ok,false);
});
function retiredOwner(){const payload={message:'payload'};const owner=create({unused:payload,onMove:()=>payload,onValueChange:()=>payload,onEffect:()=>payload,policies:{canMove:()=>!!payload},typeahead:{textValue:()=>payload.message,normalize:text=>payload.message+text,now:()=>payload.message.length}});return{owner,payload:new WeakRef(payload),saved:owner.handleEvent.bind(owner)};}

test('Transfer typeahead keeps pane prefixes independent and cycles repeated keys without changing selection',()=>{
  let now=0;const input=[...nodes,{id:'d',parentID:'left'},{id:'e',parentID:'right'}],labels={a:'Alpha',b:'Alpine',c:'Beta',d:'Gamma',e:'Bravo'};
  const owner=create({nodes:input,source:{defaultValue:['d']},target:{defaultValue:['e']},typeahead:{textValue:id=>labels[id],now:()=>now}});
  try{
    const sourceSelection=owner.getSnapshot().state.source.selection,targetSelection=owner.getSnapshot().state.target.selection;
    assert.equal(owner.handleKeyboardInput('source',{key:'a'}).ok,true);assert.equal(owner.getSnapshot().state.source.cursor.current,'a');
    assert.equal(owner.handleKeyboardInput('source',{key:'a'}).ok,true);assert.equal(owner.getSnapshot().state.source.cursor.current,'b');
    assert.equal(owner.handleKeyboardInput('source',{key:'l'}).ok,true);assert.equal(owner.getSnapshot().state.source.cursor.current,'a');
    assert.equal(owner.handleKeyboardInput('target',{key:'b'}).ok,true);assert.equal(owner.getSnapshot().state.target.cursor.current,'c');
    assert.equal(owner.handleKeyboardInput('target',{key:'b'}).ok,true);assert.equal(owner.getSnapshot().state.target.cursor.current,'e');
    now=501;assert.equal(owner.handleKeyboardInput('source',{key:'G',shiftKey:true}).ok,true);assert.equal(owner.getSnapshot().state.source.cursor.current,'d');
    assert.equal(owner.getSnapshot().state.source.selection,sourceSelection);assert.equal(owner.getSnapshot().state.target.selection,targetSelection);
    assert.equal(owner.getSnapshot().state.nodes.length,input.length);
  }finally{owner.dispose();}
});
test('Transfer typeahead respects controlled cursors and readonly navigation while disabled/stale input reads nothing',()=>{
  const effects=[],proposals=[];let reads=0;
  const owner=create({source:{highlightedValue:'a',defaultValue:['a']},readOnly:true,typeahead:{textValue:id=>{reads++;return id;},now:()=>0},onHighlightedValueChange:(side,id)=>proposals.push([side,id]),onEffect:effect=>effects.push(effect)});
  try{
    assert.equal(owner.handleKeyboardInput('source',{key:'b'}).ok,true);assert.deepEqual(proposals,[['source','b']]);assert.equal(owner.getSnapshot().state.source.cursor.current,'a');assert.deepEqual(effects,[]);
    assert.equal(owner.syncControlledValues({source:{highlightedValue:'b'}}).ok,true);assert.deepEqual(effects,[{type:'focus-element',side:'source',id:'b'}]);
    assert.deepEqual(owner.getSnapshot().state.source.selection.selected,['a']);
    const before=reads;assert.equal(owner.handleKeyboardInput('source',{get key(){throw Error('stale keyboard');}},-1).error.code,'stale-revision');assert.equal(reads,before);
    owner.syncInteraction({disabled:true});assert.equal(owner.handleKeyboardInput('source',{get key(){throw Error('disabled keyboard');}}).error.code,'interaction-disabled');assert.equal(reads,before);
  }finally{owner.dispose();}
});
test('Transfer typeahead bounds retained Unicode queries and restarts after membership or clock changes',()=>{
  let now=0;const queries=[],owner=create({typeahead:{textValue:id=>id,normalize:text=>{queries.push(text);return text;},maxQueryLength:2,now:()=>now}});
  const type=key=>{queries.length=0;owner.handleKeyboardInput('source',{key});return queries[0];};
  try{
    assert.equal(type('b'),'b');assert.equal(type('a'),'ba');assert.equal(type('a'),'a');
    now=-1;assert.equal(type('b'),'b');now=0;owner.handleEvent({type:'move',from:'source',ids:['a']});assert.equal(type('b'),'b');
    owner.syncInteraction({disabled:true});owner.syncInteraction({disabled:false});assert.equal(type('a'),'a');
  }finally{owner.dispose();}
  const emoji=create({typeahead:{textValue:()=> '😀',maxQueryLength:1}});
  try{assert.equal(emoji.handleKeyboardInput('source',{key:'😀'}).ok,true);assert.equal(emoji.getSnapshot().state.source.cursor.current,'a');}
  finally{emoji.dispose();}
});
test('Transfer typeahead uses the shared scan ceiling at small and large pane cardinalities',()=>{
  for(const size of [16,128,4096]){
    let texts=0;const input=[{id:'left',parentID:null},{id:'right',parentID:null},...Array.from({length:size},(_,i)=>({id:`item${i}`,parentID:'left'}))];
    const owner=create({nodes:input,policies:{maxScan:4},typeahead:{textValue:id=>{texts++;return id;}}});
    try{assert.equal(owner.handleKeyboardInput('source',{key:'z'}).error.code,'scan-ceiling-reached');assert.equal(texts,4);assert.equal(owner.getSnapshot().state.source.cursor.current,null);}
    finally{owner.dispose();}
  }
});
test('Transfer typeahead rejects invalid settings and retires admission before reading stale callback tails',()=>{
  for(const [typeahead,code]of[[{textValue:1},'invalid-typeahead-text-value'],[{textValue:id=>id,normalize:1},'invalid-typeahead-normalizer'],[{textValue:id=>id,timeoutMs:-1},'invalid-typeahead-timeout'],[{textValue:id=>id,maxQueryLength:0},'invalid-boundary'],[{textValue:id=>id,now:1},'invalid-boundary']]){
    assert.equal(createTransferController({nodes,sourceID:'left',targetID:'right',typeahead}).error.code,code);
  }
  let owner,reentrant,texts=0;
  owner=create({typeahead:{now:()=>{reentrant=owner.handleKeyboardInput('target',{get key(){throw Error('reentrant key');}});owner.dispose();return 0;},textValue:()=>{texts++;throw Error('retired text');}}});
  assert.equal(owner.handleKeyboardInput('source',{key:'b'}).error.code,'interaction-disabled');assert.equal(reentrant.error.code,'invalid-boundary');assert.equal(texts,0);
  for(const retireAt of ['normalize','textValue','eligible']){
    let current,armed=false,calls=0;
    const retire=()=>{if(armed){calls++;current.dispose();}};
    current=create({policies:{eligible:()=>{if(retireAt==='eligible')retire();return true;}},typeahead:{textValue:id=>{if(retireAt==='textValue')retire();return id;},normalize:text=>{if(retireAt==='normalize')retire();return text;}}});
    armed=true;const before=current.getSnapshot().state;assert.equal(current.handleKeyboardInput('source',{key:'b'}).error.code,'interaction-disabled');assert.equal(calls,1);assert.equal(current.getSnapshot().state,before);
  }
  const captured=create();assert.equal(captured.handleKeyboardInput('source',{get key(){captured.dispose();return 'b';},get isComposing(){throw Error('retired key tail');}}).error.code,'interaction-disabled');
  let fail=true;const failure=Error('text resolver'),recover=create({typeahead:{textValue:id=>{if(fail)throw failure;return id;}}});
  try{assert.throws(()=>recover.handleKeyboardInput('source',{key:'b'}),error=>error===failure);fail=false;assert.equal(recover.handleKeyboardInput('source',{key:'b'}).ok,true);}
  finally{recover.dispose();}
  const disabled=create({disabledItems:['b'],typeahead:{textValue:id=>id}});
  try{assert.equal(disabled.handleKeyboardInput('source',{key:'b'}).error.code,'typeahead-no-match');assert.equal(disabled.getSnapshot().state.source.cursor.current,null);}
  finally{disabled.dispose();}
});
test('Transfer DOM typeahead consumes accepted focus only and leaves IME and native descendants alone',()=>{
  const dom=panes();let updates=0,texts=0;const connection=present(dom,{typeahead:{textValue:id=>{texts++;return id;}},onUpdate:()=>updates++});
  const a=row(dom.source),b=row(dom.source);connection.setItemAttributes(a,{side:'source',id:'a'});connection.setItemAttributes(b,{side:'source',id:'b'});dom.source.focus();updates=0;
  assert.equal(dom.source.emit('keydown',{key:'b'}).defaultPrevented,true);assert.equal(dom.source.getAttribute('aria-activedescendant'),b.id);assert.equal(updates,1);
  const before=texts,count=updates,input=row(a,'INPUT');
  for(const event of [{key:'a',isComposing:true},{key:'a',ctrlKey:true},{key:'a',altKey:true},{key:'a',metaKey:true},{key:'Tab'},{key:' ',shiftKey:true},{key:'a',target:input}])assert.equal(dom.source.emit('keydown',event).defaultPrevented,false);
  assert.equal(texts,before);assert.equal(updates,count);assert.deepEqual(connection.state.source.selection.selected,[]);connection.destroy();
  const capture=panes(),retired=present(capture,{typeahead:{textValue:id=>id}});let keys=0;
  assert.equal(retired.handleKeyboardEvent('source',{target:capture.source,get key(){keys++;retired.destroy();return 'a';},get isComposing(){throw Error('retired connection input');}}),false);assert.equal(keys,1);
});

test('Transfer facade connects two labelled listboxes and moves only accepted membership',()=>{
  const dom=panes(),connection=present(dom,{sourceLabel:'Available',targetLabel:'Assigned'}),a=row(dom.source),b=row(dom.source),c=row(dom.target);
  connection.setItemAttributes(a,{side:'source',id:'a'});connection.setItemAttributes(b,{side:'source',id:'b'});connection.setItemAttributes(c,{side:'target',id:'c'});
  assert.equal(dom.source.getAttribute('role'),'listbox');assert.equal(dom.source.getAttribute('aria-multiselectable'),'true');
  assert.equal(dom.source.getAttribute('aria-label'),'Available');assert.equal(dom.target.getAttribute('aria-label'),'Assigned');
  dom.source.focus();assert.equal(connection.state.source.cursor.current,'a');assert.equal(dom.source.getAttribute('aria-activedescendant'),a.id);
  const space=dom.source.emit('keydown',{key:' '});assert.equal(space.defaultPrevented,true);assert.equal(a.getAttribute('aria-selected'),'true');
  dom.source.emit('keydown',{key:'ArrowRight',ctrlKey:true});
  assert.deepEqual(connection.state.nodes.filter(node=>node.parentID==='right').map(node=>node.id),['c','a']);
  assert.equal(dom.source.getAttribute('aria-activedescendant'),b.id);assert.equal(a.getAttribute('role'),null);
  a.parentElement=dom.target;connection.setItemAttributes(a,{side:'target',id:'a'});assert.equal(a.getAttribute('aria-selected'),'false');
  assert.equal(dom.document.activeElement,dom.source,'membership moves do not steal focus into the destination');
  connection.releaseItem(b,'b');assert.equal(dom.source.getAttribute('aria-activedescendant'),null);
  connection.destroy();assert.equal(dom.source.count()+dom.target.count(),0);assert.equal(dom.source.getAttribute('role'),null);
});
test('Transfer controlled moves preserve both panes on refusal and publish synchronous acceptance once',()=>{
  for(const accept of [false,true]){
    const dom=panes();let connection,proposals=0;
    connection=present(dom,{controlled:true,source:{defaultValue:['a'],defaultHighlightedValue:'a'},onMove:proposal=>{proposals++;if(accept)connection.syncControlledValues({nodes:proposal.nodes});}});
    const a=row(dom.source),b=row(dom.source);connection.setItemAttributes(a,{side:'source',id:'a'});connection.setItemAttributes(b,{side:'source',id:'b'});
    dom.source.focus();connection.move('source');assert.equal(proposals,1);
    assert.equal(connection.state.nodes.find(node=>node.id==='a').parentID,accept?'right':'left');
    assert.equal(dom.source.getAttribute('aria-activedescendant'),accept?b.id:a.id);
    connection.destroy();
  }
});
test('Transfer ignores nested native controls and stale registrations while replacing and restoring owned attributes',()=>{
  const dom=panes(),connection=present(dom),a=row(dom.source);a.id='original';a.setAttribute('role','article');
  connection.setItemAttributes(a,{side:'source',id:'a'});
  for(const tag of ['INPUT','TEXTAREA','SELECT','BUTTON','A']){
    const input=row(a,tag),before=connection.state;
    assert.equal(dom.source.emit('keydown',{target:input,key:' '}).defaultPrevented,false);dom.source.emit('click',{target:input});assert.equal(connection.state,before);
  }
  const replacement=row(dom.source);connection.setItemAttributes(replacement,{side:'source',id:'a'});
  assert.equal(a.id,'original');assert.equal(a.getAttribute('role'),'article');dom.source.emit('click',{target:a});assert.deepEqual(connection.state.source.selection.selected,[]);
  dom.source.emit('click',{target:replacement});assert.deepEqual(connection.state.source.selection.selected,['a']);
  replacement.setAttribute('role','application');connection.releaseItem(replacement,'a');assert.equal(replacement.getAttribute('role'),'application','cleanup must not overwrite a newer external owner');
  connection.destroy();
});
test('Transfer borrowed ownership supports explicit refresh, suspension, reconnect and disabled projection',()=>{
  let disabled=false;const owner=create({policies:{eligible:id=>id!=='b'||!disabled}}),dom=panes();
  let connection=connectTransfer({controller:owner,sourceRoot:dom.source,targetRoot:dom.target});const b=row(dom.source);connection.setItemAttributes(b,{side:'source',id:'b'});
  disabled=true;connection.render();assert.equal(b.getAttribute('aria-disabled'),'true');
  connection.suspend();connection.suspend();assert.equal(dom.source.count()+dom.target.count(),0);assert.equal(dom.source.getAttribute('tabindex'),'-1');
  connection.resume();connection.resume();assert.equal(dom.source.count()+dom.target.count(),6);
  connection.disconnect();assert.equal(owner.getActive(),true);assert.equal(dom.source.count()+dom.target.count(),0);
  connection=connectTransfer({controller:owner,sourceRoot:dom.source,targetRoot:dom.target});
  owner.syncInteraction({disabled:true,readOnly:true});connection.render();assert.equal(dom.source.getAttribute('aria-readonly'),'true');assert.equal(dom.source.getAttribute('aria-disabled'),'true');
  assert.equal(dom.source.emit('keydown',{key:'Home'}).defaultPrevented,false);connection.disconnect();owner.dispose();
});
test('Transfer construction and cleanup failures retire every acquired resource and preserve the first failure',()=>{
  const dom=panes(),failure=Error('acquire');dom.target.addEventListener=()=>{throw failure;};
  assert.throws(()=>present(dom),error=>error===failure);assert.equal(dom.source.count()+dom.target.count(),0);
  const invalid=panes();assert.equal(tryCreateTransfer({nodes,sourceID:'left',targetID:'right',sourceRoot:invalid.source,targetRoot:invalid.source}).ok,false);
  invalid.target.parentElement=invalid.source;assert.equal(tryCreateTransfer({nodes,sourceID:'left',targetID:'right',sourceRoot:invalid.source,targetRoot:invalid.target}).ok,false);
  const clean=panes(),connection=present(clean),a=row(clean.source);connection.setItemAttributes(a,{side:'source',id:'a'});
  const saved=[...clean.source.listeners.get('keydown')][0],remove=clean.source.removeEventListener.bind(clean.source);
  clean.source.removeEventListener=(...args)=>{remove(...args);throw failure;};
  assert.throws(()=>connection.destroy(),error=>error===failure);assert.equal(clean.source.count()+clean.target.count(),0);assert.equal(a.getAttribute('role'),null);
  assert.equal(clean.target.getAttribute('role'),null);assert.equal(connection.getActive(),false);connection.destroy();saved({get key(){throw Error('stale listener read');}});
});
test('Transfer projects committed state after notification failure without stealing external focus',()=>{
  const dom=panes(),failure=Error('consumer notification'),connection=present(dom,{source:{defaultValue:['a'],defaultHighlightedValue:'a'},onMove:()=>{throw failure;}});
  const a=row(dom.source),b=row(dom.source);connection.setItemAttributes(a,{side:'source',id:'a'});connection.setItemAttributes(b,{side:'source',id:'b'});
  const external=new Element(dom.document,'INPUT');external.focus();assert.throws(()=>connection.move('source'),error=>error===failure);
  assert.equal(dom.source.getAttribute('aria-activedescendant'),b.id);assert.equal(a.getAttribute('role'),null);assert.equal(dom.document.activeElement,external);
  connection.destroy();
});
test('Transfer cursor projection is bounded by changed rows rather than mounted cardinality',()=>{
  for(const size of [16,128,4096]){
    const dom=panes(),input=[{id:'left',parentID:null},{id:'right',parentID:null},...Array.from({length:size},(_,i)=>({id:`item${i}`,parentID:'left'}))];
    const connection=present(dom,{nodes:input});const elements=input.slice(2).map(node=>{const element=row(dom.source);connection.setItemAttributes(element,{side:'source',id:node.id});return element;});
    dom.source.focus();for(const element of [...elements,dom.source,dom.target])element.reads=element.writes=0;
    dom.source.emit('keydown',{key:'End'});
    assert.equal(connection.state.source.cursor.current,`item${size-1}`);assert.equal(dom.source.getAttribute('aria-activedescendant'),elements.at(-1).id);
    assert.ok(elements.reduce((sum,element)=>sum+element.reads,0)<=80,'cursor changes project only old/new registered rows');
    assert.ok(elements.reduce((sum,element)=>sum+element.writes,0)<=8);connection.destroy();
  }
});
test('held Transfer connections and listeners release roots and callback payloads',{skip:typeof global.gc!=='function'},async()=>{
  for(const borrowed of [false,true]){
    const retained=retiredPresentation(borrowed);retained.retire();
    for(let turn=0;turn<25;turn++){await new Promise(resolve=>setImmediate(resolve));global.gc();}
    assert.equal(retained.source.deref(),undefined);assert.equal(retained.target.deref(),undefined);assert.equal(retained.payload.deref(),undefined);
    retained.listener({get target(){throw Error('retired listener');}});retained.render();assert.equal(retained.connection.getActive(),false);retained.owner?.dispose();
  }
});
function retiredPresentation(borrowed){
  const dom=panes(),payload={updates:0},owner=borrowed?create():undefined;
  const options={sourceRoot:dom.source,targetRoot:dom.target,onUpdate:()=>payload.updates++};
  const connection=borrowed?connectTransfer({...options,controller:owner}):present(dom,options);
  return {connection,owner,retire:borrowed?connection.disconnect.bind(connection):connection.destroy,source:new WeakRef(dom.source),target:new WeakRef(dom.target),payload:new WeakRef(payload),listener:[...dom.source.listeners.get('keydown')][0],render:connection.render.bind(connection)};
}
function panes(){const document={activeElement:null};return{document,source:new Element(document),target:new Element(document)};}
function present(dom,options={}){return createTransfer({nodes,sourceID:'left',targetID:'right',sourceRoot:dom.source,targetRoot:dom.target,...options});}
function row(parent,tag='DIV'){const element=new Element(parent.ownerDocument,tag);element.parentElement=parent;return element;}
class Element {
  attributes=new Map();listeners=new Map();parentElement=null;reads=0;writes=0;
  constructor(document,tag='DIV'){this.ownerDocument=document;this.tagName=tag;}
  get id(){return this.getAttribute('id')??'';}set id(value){this.setAttribute('id',value);}
  getAttribute(name){this.reads++;return this.attributes.get(name)??null;}
  setAttribute(name,value){this.writes++;this.attributes.set(name,String(value));}
  removeAttribute(name){this.writes++;this.attributes.delete(name);}
  contains(target){for(let element=target;element;element=element.parentElement)if(element===this)return true;return false;}
  matches(){return ['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(this.tagName)||this.getAttribute('role')==='textbox';}
  addEventListener(type,listener){const listeners=this.listeners.get(type)??new Set();listeners.add(listener);this.listeners.set(type,listeners);}
  removeEventListener(type,listener){this.listeners.get(type)?.delete(listener);}
  emit(type,input={}){const event={target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...input};for(const listener of this.listeners.get(type)??[])listener(event);return event;}
  focus(){if(this.ownerDocument.activeElement===this)return;this.ownerDocument.activeElement=this;this.emit('focus');}
  count(){return [...this.listeners.values()].reduce((sum,listeners)=>sum+listeners.size,0);}
}
