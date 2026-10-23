import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {createTestWindow} from './happy-dom.mjs';
const browserWindow=createTestWindow({url:'http://localhost/'});
for(const name of ['window','document'])globalThis[name]=name==='window'?browserWindow:browserWindow.document;
for(const name of ['Node','Element','HTMLElement','HTMLInputElement','HTMLSelectElement','HTMLFormElement','HTMLButtonElement','SVGElement','Event','MouseEvent','KeyboardEvent','MutationObserver','FormData'])globalThis[name]=browserWindow[name];
const {createApp,h,nextTick,shallowRef,KeepAlive}=await import('vue');
const {TransferRoot:Root,TransferList:List,TransferItem:Item,TransferMove:Move}=await import('../.verification-dist/transfer.js');
const {HostProvider}=await import('../.verification-dist/host-provider.js');
const {FormRoot,FormField,FormLabel}=await import('../.verification-dist/form.js');
const nodes=[{id:'left',parentID:null},{id:'right',parentID:null},{id:'a',parentID:'left'},{id:'b',parentID:'left'},{id:'c',parentID:'right'}];
const drain=async()=>{for(let i=0;i<5;i++)await nextTick();};
const item=(host,id)=>[...host.querySelectorAll('[data-part="item"]')].find(element=>element.textContent===id);
const pane=(host,side)=>host.querySelector(`[data-part="${side}"]`);
const click=node=>node.dispatchEvent(new MouseEvent('click',{bubbles:true}));
const key=(node,value,extra={})=>node.dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true,...extra}));
function parts(state,options={}){return[
  h(List,{side:'source',label:'Available'},()=>state.sourceItems.map(id=>h(Item,{key:id,value:id},()=>id))),
  h(Move,{from:'source'},()=> 'Assign'),h(Move,{from:'target'},()=> 'Remove'),
  h(List,{side:'target',label:'Assigned',as:options.targetAs??'div'},()=>options.unmounted?[]:state.targetItems.map(id=>h(Item,{key:id,value:id},()=>id))),
];}
function mount(render){const host=document.createElement('div');document.body.append(host);const app=createApp({render});app.mount(host);return{host,close(){app.unmount();host.remove();}};}
test('Transfer SSR needs no DOM globals and renders both canonical panes and one assigned-membership encoding',()=>{
  const module=new URL('../.verification-dist/transfer.js',import.meta.url).href;
  const html=execFileSync(process.execPath,['--input-type=module','-e',`import {createSSRApp,h} from 'vue';import{renderToString}from'@vue/server-renderer';import{TransferRoot,TransferList,TransferItem}from${JSON.stringify(module)};if(typeof document!=='undefined')throw Error('DOM present');const nodes=${JSON.stringify(nodes)};console.log(await renderToString(createSSRApp({render:()=>h(TransferRoot,{nodes,sourceId:'left',targetId:'right',name:'assigned',defaultSourceValue:['a']},{default:state=>['source','target'].map(side=>h(TransferList,{side,label:side},{default:()=>state[side+'Items'].map(id=>h(TransferItem,{value:id},()=>id))}))})})));`],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  const template=document.createElement('template');template.innerHTML=html;
  assert.equal(template.content.querySelectorAll('[role="listbox"]').length,2);assert.equal(template.content.querySelectorAll('select[name="assigned"]').length,1);
  const options=[...template.content.querySelectorAll('select option')];assert.deepEqual(options.map(option=>option.value),['c']);assert.equal(options[0].hasAttribute('selected'),true);
  assert.equal(template.content.querySelector('[data-transfer-side="source"][data-part="item"]').getAttribute('aria-selected'),'true');
});
test('Transfer Vue keys/clicks share accepted membership and submit target contents rather than pending selections',async()=>{
  const root=shallowRef();let state;
  const mounted=mount(()=>h('form',null,[h(Root,{ref:root,nodes,sourceId:'left',targetId:'right',name:'assigned'},{default:current=>{state=current;return parts(current);}})]));
  try{
    await drain();pane(mounted.host,'source').focus();key(pane(mounted.host,'source'),' ');await drain();
    assert.deepEqual(state.sourceValue,['a']);assert.deepEqual(new FormData(mounted.host.querySelector('form')).getAll('assigned'),['c']);
    key(pane(mounted.host,'source'),'ArrowRight',{ctrlKey:true});await drain();
    assert.deepEqual(state.sourceItems,['b']);assert.deepEqual(state.targetItems,['c','a']);assert.deepEqual(state.sourceValue,[]);
    assert.equal(pane(mounted.host,'source').getAttribute('aria-activedescendant'),item(mounted.host,'b').id);
    assert.equal(document.activeElement,pane(mounted.host,'source'));assert.equal(item(mounted.host,'a').closest('[role="listbox"]'),pane(mounted.host,'target'));
    assert.deepEqual([...mounted.host.querySelector('select').selectedOptions].map(option=>option.value),['c','a']);assert.equal(mounted.host.querySelectorAll('[name="assigned"]').length,1);
    click(item(mounted.host,'a'));await drain();assert.equal(root.value.move('target'),true);await drain();assert.deepEqual(state.targetItems,['c']);
  }finally{mounted.close();}
});
test('Transfer Vue controlled moves remain atomic until the parent accepts a complete frame',async()=>{
  const input=shallowRef(nodes),sourceValue=shallowRef(['a']),targetValue=shallowRef(['c']),sourceCursor=shallowRef('a'),targetCursor=shallowRef('c');const proposals=[];let state;
  const mounted=mount(()=>h(Root,{nodes:input.value,sourceId:'left',targetId:'right',controlled:true,sourceValue:sourceValue.value,targetValue:targetValue.value,
    sourceHighlightedValue:sourceCursor.value,targetHighlightedValue:targetCursor.value,onMove:proposal=>proposals.push(proposal)},{default:current=>{state=current;return parts(current);}}));
  try{
    await drain();pane(mounted.host,'source').focus();click(mounted.host.querySelector('[data-part="move"]'));await drain();
    assert.equal(proposals.length,1);assert.deepEqual(state.sourceItems,['a','b']);assert.deepEqual(state.sourceValue,['a']);assert.equal(state.sourceHighlightedValue,'a');
    const accepted=proposals[0];input.value=accepted.nodes;sourceValue.value=accepted.sourceValue;targetValue.value=accepted.targetValue;sourceCursor.value=accepted.sourceHighlightedValue;targetCursor.value=accepted.targetHighlightedValue;
    await drain();assert.deepEqual(state.sourceItems,['b']);assert.deepEqual(state.sourceValue,[]);assert.deepEqual(state.targetItems,['c','a']);assert.equal(state.sourceHighlightedValue,'b');
    assert.equal(proposals.length,1);assert.equal(pane(mounted.host,'source').getAttribute('aria-activedescendant'),item(mounted.host,'b').id);
  }finally{mounted.close();}
});
test('Transfer uses one Form participant, assigned label, inherited defaults and uncontrolled reset',async()=>{
  const disabled=shallowRef(false),readonly=shallowRef(false);let state;
  const mounted=mount(()=>h(FormRoot,null,{default:()=>h(FormField,{name:'assigned',required:true,disabled:disabled.value,readonly:readonly.value},{default:()=>[
    h(FormLabel,null,()=> 'Assigned deliveries'),h(Root,{nodes,sourceId:'left',targetId:'right',defaultSourceValue:['a']},{default:current=>{state=current;return parts(current);}}),
  ]})}));
  try{
    await drain();const form=mounted.host.querySelector('form'),select=mounted.host.querySelector('select'),target=pane(mounted.host,'target');
    assert.equal(target.getAttribute('aria-labelledby'),mounted.host.querySelector('[data-part="label"]').id);assert.equal(select.name,'assigned');assert.equal(select.required,true);
    click(mounted.host.querySelector('[data-part="move"]'));await drain();assert.deepEqual(state.targetItems,['c','a']);
    form.reset();await drain();assert.deepEqual(state.targetItems,['c']);assert.deepEqual(state.sourceValue,['a']);assert.equal(mounted.host.querySelectorAll('[name="assigned"]').length,1);
    readonly.value=true;await drain();assert.equal(mounted.host.querySelector('[data-part="move"]').disabled,true);assert.equal(target.getAttribute('aria-readonly'),'true');
    disabled.value=true;await drain();assert.equal(select.disabled,true);assert.equal(target.getAttribute('tabindex'),'-1');
  }finally{mounted.close();}
});
test('Transfer preserves accepted state across Host/KeepAlive and releases all six listeners',async()=>{
  const active=shallowRef(true),visible=shallowRef(true),listeners=new Map();let reads=0,state;
  const input=nodes.map(node=>({get id(){reads++;return node.id;},parentID:node.parentID}));
  const add=HTMLElement.prototype.addEventListener,remove=HTMLElement.prototype.removeEventListener;
  HTMLElement.prototype.addEventListener=function(type,listener,...rest){if(this.dataset.scope==='transfer'&&['source','target'].includes(this.dataset.part)&&['keydown','click','focus'].includes(type)){const set=listeners.get(this)??new Set();set.add(listener);listeners.set(this,set);}return add.call(this,type,listener,...rest);};
  HTMLElement.prototype.removeEventListener=function(type,listener,...rest){listeners.get(this)?.delete(listener);return remove.call(this,type,listener,...rest);};
  const count=()=>[...listeners.values()].reduce((sum,set)=>sum+set.size,0);let mounted;
  try{
    mounted=mount(()=>h(HostProvider,{active:active.value},()=>h(KeepAlive,null,{default:()=>visible.value?h(Root,{nodes:input,sourceId:'left',targetId:'right'},{default:current=>{state=current;return parts(current);}}):null})));
    await drain();assert.equal(count(),6);click(item(mounted.host,'a'));await drain();const before=reads;
    for(let cycle=0;cycle<3;cycle++){active.value=false;await drain();assert.equal(count(),0);assert.equal(item(mounted.host,'a').getAttribute('aria-selected'),'true');active.value=true;await drain();assert.equal(count(),6);}
    visible.value=false;await drain();assert.equal(count(),0);visible.value=true;await drain();assert.equal(count(),6);assert.deepEqual(state.sourceValue,['a']);assert.equal(reads,before);
    mounted.close();mounted=undefined;assert.equal(count(),0);
  }finally{mounted?.close();HTMLElement.prototype.addEventListener=add;HTMLElement.prototype.removeEventListener=remove;}
});
test('Transfer pane/row replacement keeps accepted cursors without dangling active descendants or stealing focus',async()=>{
  const root=shallowRef(),as=shallowRef('div'),unmounted=shallowRef(false);let state;
  const mounted=mount(()=>h(Root,{ref:root,nodes,sourceId:'left',targetId:'right',defaultTargetHighlightedValue:'c'},{default:current=>{state=current;return parts(current,{targetAs:as.value,unmounted:unmounted.value});}}));
  try{
    await drain();root.value.focus('target');as.value='section';await drain();assert.equal(document.activeElement,pane(mounted.host,'target'));assert.equal(state.targetHighlightedValue,'c');
    unmounted.value=true;await drain();assert.equal(pane(mounted.host,'target').getAttribute('aria-activedescendant'),null);assert.equal(state.targetHighlightedValue,'c');
    unmounted.value=false;await drain();assert.equal(pane(mounted.host,'target').getAttribute('aria-activedescendant'),item(mounted.host,'c').id);
  }finally{mounted.close();}
});
test('Transfer immutable source replacement prunes through Core without replaying move proposals',async()=>{
  const input=shallowRef(nodes);let state,moves=0;
  const mounted=mount(()=>h(Root,{nodes:input.value,sourceId:'left',targetId:'right',defaultSourceValue:['a'],defaultSourceHighlightedValue:'a',onMove:()=>moves++},{default:current=>{state=current;return parts(current);}}));
  try{
    await drain();input.value=nodes.filter(node=>node.id!=='a');await drain();assert.deepEqual(state.sourceValue,[]);assert.equal(state.sourceHighlightedValue,'b');assert.deepEqual(state.sourceItems,['b']);assert.equal(moves,0);
    const nested=document.createElement('input');item(mounted.host,'b').append(nested);const before=state.sourceValue;key(nested,' ');click(nested);await drain();assert.equal(state.sourceValue,before);
  }finally{mounted.close();}
});
test('Transfer Vue typeahead uses configured labels and the same accepted native focus owner',async()=>{
  let state;const labels={a:'Alpha',b:'Beta',c:'Charlie'},settings={textValue:id=>labels[id]};
  const mounted=mount(()=>h(Root,{nodes,sourceId:'left',targetId:'right',typeahead:settings},{default:current=>{state=current;return parts(current);}}));
  try{
    await drain();const source=pane(mounted.host,'source');source.focus();key(source,'b');await drain();assert.equal(state.sourceHighlightedValue,'b');assert.equal(source.getAttribute('aria-activedescendant'),item(mounted.host,'b').id);
    assert.deepEqual(state.sourceValue,[]);key(source,'a',{isComposing:true});await drain();assert.equal(state.sourceHighlightedValue,'b');assert.equal(document.activeElement,source);
  }finally{mounted.close();}
});
test('saved Transfer methods release platform roots and caller hooks after unmount',{skip:typeof global.gc!=='function'},async()=>{
  const retained=heldMethods();retained.close();await drain();
  for(let turn=0;turn<25;turn++){await new Promise(resolve=>setImmediate(resolve));global.gc();}
  assert.equal(retained.source.deref(),undefined);assert.equal(retained.target.deref(),undefined);assert.equal(retained.payload.deref(),undefined);
  assert.equal(retained.move('source',new Proxy([],{get(){throw Error('retired payload');}})),false);retained.focus('target');
});
test('Transfer attachment failure releases acquired listeners before reporting the caller error',async()=>{
  const failure=Error('eligibility after native acquisition'),errors=[],listeners=new Set();let armed=false;
  const add=HTMLElement.prototype.addEventListener,remove=HTMLElement.prototype.removeEventListener;
  HTMLElement.prototype.addEventListener=function(type,listener,...rest){
    const result=add.call(this,type,listener,...rest);
    if(this.dataset.scope==='transfer'&&['source','target'].includes(this.dataset.part)&&['keydown','click','focus'].includes(type)){
      listeners.add(listener);if(this.dataset.part==='target'&&type==='focus')armed=true;
    }return result;
  };
  HTMLElement.prototype.removeEventListener=function(type,listener,...rest){listeners.delete(listener);return remove.call(this,type,listener,...rest);};
  const host=document.createElement('div');document.body.append(host);
  const app=createApp({render:()=>h(Root,{nodes,sourceId:'left',targetId:'right',policies:{eligible:()=>{if(armed)throw failure;return true;}}},{default:parts})});
  app.config.errorHandler=error=>errors.push(error);
  try{app.mount(host);armed=false;assert.ok(errors.includes(failure));assert.equal(listeners.size,0);await drain();}
  finally{armed=false;app.unmount();host.remove();HTMLElement.prototype.addEventListener=add;HTMLElement.prototype.removeEventListener=remove;}
});
function closing(callback){let live=callback;return()=>{const close=live;live=undefined;close?.();};}
function heldMethods(){
  const root=shallowRef(),payload={calls:0};
  const mounted=mount(()=>h(Root,{ref:root,nodes,sourceId:'left',targetId:'right',onMove:()=>payload.calls++},{default:parts}));
  return{move:root.value.move,focus:root.value.focus,close:closing(mounted.close),source:new WeakRef(pane(mounted.host,'source')),target:new WeakRef(pane(mounted.host,'target')),payload:new WeakRef(payload)};
}
