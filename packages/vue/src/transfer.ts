import {computed,defineComponent,h,inject,mergeProps,onBeforeUnmount,onMounted,onUpdated,provide,shallowRef,useId,watch,
  type ComputedRef,type DefineSetupFnComponent,type EmitsToProps,type PropType,type PublicProps,type SlotsType,type VNodeChild} from 'vue';
import type {TreeNodeInput} from '@sectile/core/tree';
import {getTransferItems,synchronizeTransferState,type TransferState} from '@sectile/core/transfer';
import {unwrap} from '@sectile/core/result';
import {connectTransfer,createTransferController,type TransferConnection,type TransferController,type TransferControlledValues,
  type TransferControllerPolicies,type TransferMoveProposal,type TransferSide,type TransferTypeaheadOptions} from '@sectile/dom/transfer';
import {getListboxItemAttributes,getListboxRootAttributes} from '@sectile/dom/listbox';
import {stableIDElementToken} from '@sectile/dom/identity';
import {Primitive,type PrimitiveAs} from './primitive.js';
import {useHostActive,useHostDirection} from './host-provider.js';
import {useControlledStateInvariant} from './internal/controlled-state.js';
import {useNextTickTask} from './internal/scheduled-task.js';
import {sameIDs} from './internal/collection.js';
import {hiddenSelectSubmissionCapabilities,provideFormControlOwner,useCompositeFormControl,useFormFieldDefaults} from './form/control.js';
import {visuallyHiddenInputStyle} from './input/native-input.js';

export type {TransferSide,TransferMoveProposal,TransferControllerPolicies,TransferTypeaheadOptions} from '@sectile/dom/transfer';
export interface TransferPartProps {readonly as?:PrimitiveAs;readonly asChild?:boolean}
export interface TransferRootProps<ID extends string=string> extends TransferPartProps {
  readonly nodes:readonly TreeNodeInput<ID>[];readonly sourceId:NoInfer<ID>;readonly targetId:NoInfer<ID>;readonly controlled?:boolean;
  readonly sourceValue?:readonly NoInfer<ID>[];readonly defaultSourceValue?:readonly NoInfer<ID>[];
  readonly targetValue?:readonly NoInfer<ID>[];readonly defaultTargetValue?:readonly NoInfer<ID>[];
  readonly sourceHighlightedValue?:NoInfer<ID>|null;readonly defaultSourceHighlightedValue?:NoInfer<ID>|null;
  readonly targetHighlightedValue?:NoInfer<ID>|null;readonly defaultTargetHighlightedValue?:NoInfer<ID>|null;
  readonly disabledItems?:readonly NoInfer<ID>[];readonly policies?:TransferControllerPolicies<NoInfer<ID>>;
  readonly typeahead?:TransferTypeaheadOptions<NoInfer<ID>>;
  readonly disabled?:boolean;readonly?:boolean;readonly required?:boolean;readonly name?:string;readonly form?:string;
}
export interface TransferRootSlotProps<ID extends string=string> {
  readonly nodes:readonly TreeNodeInput<ID>[];readonly sourceItems:readonly ID[];readonly targetItems:readonly ID[];
  readonly sourceValue:readonly ID[];readonly targetValue:readonly ID[];
  readonly sourceHighlightedValue:ID|null;readonly targetHighlightedValue:ID|null;readonly disabled:boolean;readonly: boolean;
}
export type TransferEmits<ID extends string=string>={
  'update:nodes':[nodes:readonly TreeNodeInput<NoInfer<ID>>[]];move:[proposal:TransferMoveProposal<NoInfer<ID>>];
  'update:sourceValue':[value:readonly NoInfer<ID>[]];'update:targetValue':[value:readonly NoInfer<ID>[]];
  'update:sourceHighlightedValue':[value:NoInfer<ID>|null];'update:targetHighlightedValue':[value:NoInfer<ID>|null];
  activate:[side:TransferSide,id:NoInfer<ID>];
};
export interface TransferSlots<ID extends string=string>{default?:(state:TransferRootSlotProps<ID>)=>VNodeChild}
export interface TransferExpose<ID extends string=string>{readonly element:HTMLElement|null;focus(side?:TransferSide):void;move(from:TransferSide,ids?:readonly NoInfer<ID>[]):boolean}
export interface TransferListProps extends TransferPartProps {readonly side:TransferSide;readonly label?:string}
export interface TransferItemProps extends TransferPartProps {readonly value:string;readonly disabled?:never}
export interface TransferItemSlotProps {readonly value:string;readonly selected:boolean;readonly highlighted:boolean;readonly disabled:boolean}
export interface TransferMoveProps extends TransferPartProps {readonly from:TransferSide;readonly disabled?:boolean}
interface Context {
  readonly state:ComputedRef<TransferRootSlotProps>;readonly snapshot:ComputedRef<TransferState<string>>;
  readonly sourceItems:ComputedRef<ReturnType<TransferController<string>['getItems']>>;readonly targetItems:ComputedRef<ReturnType<TransferController<string>['getItems']>>;
  readonly controlProps:ComputedRef<Readonly<Record<string,unknown>>>;readonly active:ComputedRef<boolean>;
  elementID(side:TransferSide,id:string):string;isDisabled(id:string):boolean;
  registerList(side:TransferSide,element:HTMLElement|undefined):void;
  registerItem(side:TransferSide,element:HTMLElement,id:string):void;releaseItem(element:HTMLElement,id:string):void;
  move(from:TransferSide):boolean;
}
const key=/* @__PURE__ */ Symbol('SectileTransfer'),listKey=/* @__PURE__ */ Symbol('SectileTransferList');
const empty:readonly string[]=/* @__PURE__ */ Object.freeze([]);
const partProps={as:{type:[String,Object,Function] as PropType<PrimitiveAs>,default:'div'},asChild:{type:Boolean,default:false}};
function useRoot(name:string):Context{const root=inject<Context>(key);if(!root)throw new TypeError(`${name} must be used inside TransferRoot.`);return root;}
// Saved public methods hold a retireable port, not the component setup context.
function createExposure(target:TransferExpose){
  let port:TransferExpose|undefined=target;
  return {value:{get element(){return port?.element??null;},focus:(side?:TransferSide)=>port?.focus(side),move:(from:TransferSide,ids?:readonly string[])=>port?.move(from,ids)??false},retire:()=>{port=undefined;}};
}

const RootImplementation=/* @__PURE__ */ defineComponent({
  name:'SectileTransferRoot',inheritAttrs:false,
  props:{nodes:{type:Array as PropType<readonly TreeNodeInput<string>[]>,required:true},sourceId:{type:String,required:true},targetId:{type:String,required:true},controlled:{type:Boolean,default:false},
    sourceValue:{type:Array as PropType<readonly string[]>,default:undefined},defaultSourceValue:{type:Array as PropType<readonly string[]>,default:()=>empty},
    targetValue:{type:Array as PropType<readonly string[]>,default:undefined},defaultTargetValue:{type:Array as PropType<readonly string[]>,default:()=>empty},
    sourceHighlightedValue:{type:String as PropType<string|null>,default:undefined},defaultSourceHighlightedValue:{type:String as PropType<string|null>,default:null},
    targetHighlightedValue:{type:String as PropType<string|null>,default:undefined},defaultTargetHighlightedValue:{type:String as PropType<string|null>,default:null},
    disabledItems:{type:Array as PropType<readonly string[]>,default:()=>empty},policies:{type:Object as PropType<TransferControllerPolicies<string>>,default:undefined},
    typeahead:{type:Object as PropType<TransferTypeaheadOptions<string>>,default:undefined},
    disabled:{type:Boolean,default:undefined},readonly:{type:Boolean,default:undefined},required:{type:Boolean,default:undefined},name:String,form:String,
    as:{type:[String,Object,Function] as PropType<PrimitiveAs>,default:'div'},asChild:{type:Boolean,default:false}},
  emits:{'update:nodes':(_value:readonly TreeNodeInput<string>[])=>true,move:(_value:TransferMoveProposal<string>)=>true,
    'update:sourceValue':(_value:readonly string[])=>true,'update:targetValue':(_value:readonly string[])=>true,
    'update:sourceHighlightedValue':(_value:string|null)=>true,'update:targetHighlightedValue':(_value:string|null)=>true,activate:(_side:TransferSide,_id:string)=>true},
  slots:Object as SlotsType<TransferSlots>,
  setup(props,{attrs,emit,slots,expose}){
    const element=shallowRef<HTMLElement>(),sourceRoot=shallowRef<HTMLElement>(),targetRoot=shallowRef<HTMLElement>(),submission=shallowRef<HTMLSelectElement>();
    const controller=shallowRef<TransferController<string>>(),accepted=shallowRef<ReturnType<TransferController<string>['getSnapshot']>>();
    const active=useHostActive(),direction=useHostDirection(),defaults=useFormFieldDefaults();
    const disabled=computed(()=>props.disabled??defaults?.value.disabled??false),readonly=computed(()=>props.readonly??defaults?.value.readonly??false),required=computed(()=>props.required??defaults?.value.required??false);
    const snapshot=computed(()=>accepted.value!.state),sourceItems=computed(()=>getTransferItems(snapshot.value,'source')),targetItems=computed(()=>getTransferItems(snapshot.value,'target'));
    const prefix=`sectile-transfer-${useId()}`,elementID=(side:TransferSide,id:string):string=>`${prefix}-${side}-${stableIDElementToken(id)}`;
    const rows=new Map<HTMLElement,{side:TransferSide;id:string}>();
    let connection:TransferConnection<string>|undefined,alive=true,mounted=false,generation=0;
    let restore:{side:TransferSide;old:HTMLElement}|undefined;
    const controlled={membership:useControlledStateInvariant('TransferRoot','controlled',()=>props.controlled?true:undefined),
      sourceValue:useControlledStateInvariant('TransferRoot','sourceValue',()=>props.sourceValue),targetValue:useControlledStateInvariant('TransferRoot','targetValue',()=>props.targetValue),
      sourceCursor:useControlledStateInvariant('TransferRoot','sourceHighlightedValue',()=>props.sourceHighlightedValue),targetCursor:useControlledStateInvariant('TransferRoot','targetHighlightedValue',()=>props.targetHighlightedValue)};
    const initial={nodes:props.nodes,sourceValue:props.defaultSourceValue,targetValue:props.defaultTargetValue,sourceCursor:props.defaultSourceHighlightedValue,targetCursor:props.defaultTargetHighlightedValue};
    const publish=():void=>{if(alive&&controller.value)accepted.value=controller.value.getSnapshot();};
    const retire=():void=>{const old=connection;connection=undefined;old?.disconnect();};
    const attach=():void=>{
      retire();if(!alive||!mounted||!active.value||!sourceRoot.value||!targetRoot.value||!controller.value){if(!active.value)restore=undefined;return;}
      try{
        connection=connectTransfer({controller:controller.value,sourceRoot:sourceRoot.value,targetRoot:targetRoot.value,direction:direction.value,getItemElementID:elementID,
          onActivate:(side,id)=>emit('activate',side,id),onUpdate:publish});
        for(const [node,row]of rows)connection.setItemAttributes(node,row);
        const pending=restore;restore=undefined;
        if(pending&&(pending.old.ownerDocument.activeElement===pending.old||pending.old.ownerDocument.activeElement===pending.old.ownerDocument.body))connection.focus(pending.side);
      }catch(error){try{retire();}catch{/* Preserve the acquisition failure. */}throw error;}
    };
    const attachment=useNextTickTask(attach),scheduleAttach=():void=>{if(alive&&mounted)attachment.schedule();};
    const values=():TransferControlledValues<string>=>({...(controlled.membership?{nodes:props.nodes}:{}),
      ...((controlled.sourceValue||controlled.sourceCursor)?{source:{...(controlled.sourceValue?{value:props.sourceValue as readonly string[]}:{}),...(controlled.sourceCursor?{highlightedValue:props.sourceHighlightedValue as string|null}:{})}}:{}),
      ...((controlled.targetValue||controlled.targetCursor)?{target:{...(controlled.targetValue?{value:props.targetValue as readonly string[]}:{}),...(controlled.targetCursor?{highlightedValue:props.targetHighlightedValue as string|null}:{})}}:{})});
    const build=(reset=false,replacement?:readonly TreeNodeInput<string>[]):void=>{
      if(!alive)return;const previous=reset?undefined:controller.value?.getSnapshot().state;
      const nodes=controlled.membership?props.nodes:replacement??(reset?initial.nodes:previous?.nodes??props.nodes);
      const prior=previous&&previous.sourceID===props.sourceId&&previous.targetID===props.targetId
        ?unwrap(synchronizeTransferState(previous,{nodes},props.policies)):undefined;
      const sourceValue=controlled.sourceValue?props.sourceValue as readonly string[]:prior?.source.selection.selected??initial.sourceValue;
      const targetValue=controlled.targetValue?props.targetValue as readonly string[]:prior?.target.selection.selected??initial.targetValue;
      const sourceCursor=controlled.sourceCursor?props.sourceHighlightedValue as string|null:prior?prior.source.cursor.current:initial.sourceCursor;
      const targetCursor=controlled.targetCursor?props.targetHighlightedValue as string|null:prior?prior.target.cursor.current:initial.targetCursor;
      const nextGeneration=generation+1,current=():boolean=>alive&&generation===nextGeneration;
      const next=unwrap(createTransferController({nodes,sourceID:props.sourceId,targetID:props.targetId,controlled:controlled.membership,direction:direction.value,disabled:disabled.value,readOnly:readonly.value,
        disabledItems:props.disabledItems,...(props.policies===undefined?{}:{policies:props.policies}),
        typeahead:props.typeahead??{textValue:id=>id},
        source:{...(controlled.sourceValue?{value:sourceValue}:{defaultValue:sourceValue}),...(controlled.sourceCursor?{highlightedValue:sourceCursor}:{defaultHighlightedValue:sourceCursor})},
        target:{...(controlled.targetValue?{value:targetValue}:{defaultValue:targetValue}),...(controlled.targetCursor?{highlightedValue:targetCursor}:{defaultHighlightedValue:targetCursor})},
        onMove:proposal=>{if(current()){emit('update:nodes',proposal.nodes);if(current())emit('move',proposal);}},
        onValueChange:(side,value)=>{if(current()){if(side==='source')emit('update:sourceValue',value);else emit('update:targetValue',value);}},
        onHighlightedValueChange:(side,value)=>{if(current()){if(side==='source')emit('update:sourceHighlightedValue',value);else emit('update:targetHighlightedValue',value);}},
        onUpdate:()=>{if(current())publish();}}));
      const old=controller.value;
      try{retire();}catch(error){try{next.dispose();}catch{/* Preserve the old connection's cleanup failure. */}throw error;}
      generation=nextGeneration;controller.value=next;old?.dispose();publish();scheduleAttach();
    };
    build();
    const state=computed<TransferRootSlotProps>(()=>({nodes:snapshot.value.nodes,sourceItems:sourceItems.value.ids,targetItems:targetItems.value.ids,
      sourceValue:snapshot.value.source.selection.selected,targetValue:snapshot.value.target.selection.selected,
      sourceHighlightedValue:snapshot.value.source.cursor.current,targetHighlightedValue:snapshot.value.target.cursor.current,disabled:disabled.value||!active.value,readonly:readonly.value}));
    const resetTask=useNextTickTask(()=>build(true));
    const participation=useCompositeFormControl({root:targetRoot,validationTarget:submission,submissions:[{element:submission,capabilities:hiddenSelectSubmissionCapabilities}],
      getValue:()=>targetItems.value.ids,isValueEqual:(left,right)=>Array.isArray(left)&&Array.isArray(right)&&sameIDs(left,right),reset:resetTask.schedule});
    provideFormControlOwner();
    provide<Context>(key,{state,snapshot,sourceItems,targetItems,controlProps:participation.controlProps,active,elementID,
      isDisabled:id=>{accepted.value;return !alive||disabled.value||!active.value||controller.value?.isDisabled(id)!==false;},
      registerList:(side,node)=>{if(!alive)return;const ref=side==='source'?sourceRoot:targetRoot;if(ref.value===node)return;
        if(ref.value&&ref.value.contains(ref.value.ownerDocument.activeElement))restore={side,old:ref.value};ref.value=node;scheduleAttach();},
      registerItem:(side,node,id)=>{if(!alive)return;rows.set(node,{side,id});connection?.setItemAttributes(node,{side,id});},
      releaseItem:(node,id)=>{if(rows.get(node)?.id===id){rows.delete(node);connection?.releaseItem(node,id);}},
      move:from=>move(from)});
    const move=(from:TransferSide,ids?:readonly string[]):boolean=>{
      if(!alive||!active.value)return false;
      return connection?connection.move(from,ids):controller.value?.handleEvent({type:'move',from,...(ids===undefined?{}:{ids})}).ok===true;
    };
    const exposure=createExposure({get element(){return element.value??null;},focus(side:TransferSide='target'){if(alive&&active.value)(side==='source'?sourceRoot.value:targetRoot.value)?.focus();},move});
    expose(exposure.value);
    onMounted(()=>{mounted=true;attachment.cancel();attach();});
    onBeforeUnmount(()=>{alive=false;mounted=false;generation++;exposure.retire();attachment.cancel();resetTask.cancel();restore=undefined;
      try{retire();}finally{try{controller.value?.dispose();}finally{controller.value=undefined;rows.clear();element.value=undefined;sourceRoot.value=undefined;targetRoot.value=undefined;submission.value=undefined;}}});
    watch(active,()=>{if(active.value){if(connection)connection.resume();else attach();}else{restore=undefined;connection?.suspend();}},{flush:'post'});
    watch([disabled,readonly],()=>{if(controller.value)unwrap(controller.value.syncInteraction({disabled:disabled.value,readOnly:readonly.value}));connection?.render();});
    watch([()=>props.sourceId,()=>props.targetId,()=>props.disabledItems,()=>props.policies,()=>props.typeahead,direction],()=>build());
    watch([()=>props.nodes,()=>props.sourceValue,()=>props.targetValue,()=>props.sourceHighlightedValue,()=>props.targetHighlightedValue],(next,before)=>{
      if(!alive||!controller.value)return;
      if(!controlled.membership&&next[0]!==before[0]){
        build(false,props.nodes);return;
      }
      unwrap(connection?connection.syncControlledValues(values()):controller.value.syncControlledValues(values()));publish();
    },{flush:'post'});
    const submissionOptions=computed(()=>targetItems.value.ids.map(id=>h('option',{key:id,value:id,selected:true},id)));
    return():VNodeChild=>[h(Primitive,mergeProps(attrs,{as:props.as,asChild:props.asChild,elementRef:(node:unknown)=>{element.value=typeof HTMLElement!=='undefined'&&node instanceof HTMLElement?node:undefined;},'data-scope':'transfer','data-part':'root'}),{default:()=>slots.default?.(state.value)}),
      ...(participation.participating||props.name!==undefined||props.form!==undefined||required.value?[h('select',{
        ref:(node:unknown)=>{submission.value=typeof HTMLSelectElement!=='undefined'&&node instanceof HTMLSelectElement?node:undefined;},
        name:props.name,form:props.form,required:required.value,disabled:disabled.value,multiple:true,tabindex:-1,'aria-hidden':'true',style:visuallyHiddenInputStyle,
      },submissionOptions.value)]:[])];
  },
});
type RootProps<ID extends string>=TransferRootProps<ID>&PublicProps&EmitsToProps<TransferEmits<ID>>;
type RootInstance<ID extends string>=InstanceType<DefineSetupFnComponent<TransferRootProps<ID>,TransferEmits<ID>,SlotsType<TransferSlots<ID>>>>&TransferExpose<ID>;
export const TransferRoot:new<const ID extends string=string>(props:RootProps<ID>)=>Omit<RootInstance<ID>,'$props'>&{readonly $props:RootProps<ID>}=RootImplementation as unknown as new<const ID extends string=string>(props:RootProps<ID>)=>Omit<RootInstance<ID>,'$props'>&{readonly $props:RootProps<ID>};

export const TransferList=/* @__PURE__ */ defineComponent({
  name:'SectileTransferList',inheritAttrs:false,props:{...partProps,side:{type:String as PropType<TransferSide>,required:true},label:String},slots:Object as SlotsType<TransferSlots>,
  setup(props,{attrs,slots}){
    const root=useRoot('TransferList'),element=shallowRef<HTMLElement>(),side=computed(()=>props.side);provide(listKey,side);
    const unregister=():void=>root.registerList(props.side,undefined);
    watch(side,(next,previous)=>{root.registerList(previous,undefined);root.registerList(next,element.value);});onBeforeUnmount(unregister);
    return():VNodeChild=>h(Primitive,mergeProps(attrs,props.side==='target'?root.controlProps.value:{},{as:props.as,asChild:props.asChild,
      elementRef:(node:unknown)=>{const next=typeof HTMLElement!=='undefined'&&node instanceof HTMLElement?node:undefined;element.value=next;root.registerList(props.side,next);},
      ...getListboxRootAttributes({selectionMode:'multiple',disabled:root.state.value.disabled,readOnly:root.state.value.readonly,
        ...(props.label===undefined?{}:{label:props.label}),...(element.value?.getAttribute('aria-activedescendant')?{activeDescendantID:element.value.getAttribute('aria-activedescendant')!}:{})}),
      'aria-disabled':root.state.value.disabled?'true':undefined,'aria-readonly':root.state.value.readonly?'true':undefined,'data-scope':'transfer','data-part':props.side,
    }),{default:()=>slots.default?.(root.state.value)});
  },
});
export const TransferItem=/* @__PURE__ */ defineComponent({
  name:'SectileTransferItem',inheritAttrs:false,props:{...partProps,value:{type:String,required:true},disabled:{type:null as unknown as PropType<never>}},
  slots:Object as SlotsType<{default?:(state:TransferItemSlotProps)=>VNodeChild}>,
  setup(props,{attrs,slots}){
    const root=useRoot('TransferItem'),side=inject<ComputedRef<TransferSide>>(listKey);if(!side)throw new TypeError('TransferItem must be used inside TransferList.');
    const element=shallowRef<HTMLElement>();let registered:{node:HTMLElement;id:string}|undefined;
    const release=():void=>{if(registered){root.releaseItem(registered.node,registered.id);registered=undefined;}};
    const register=():void=>{release();if(element.value){registered={node:element.value,id:props.value};root.registerItem(side.value,element.value,props.value);}};
    onMounted(register);onUpdated(register);onBeforeUnmount(release);
    const selected=computed(()=>root.snapshot.value[side.value].selection),cursor=computed(()=>root.snapshot.value[side.value].cursor.current);
    const state=computed<TransferItemSlotProps>(()=>({value:props.value,selected:selected.value.has(props.value),highlighted:cursor.value===props.value,disabled:root.isDisabled(props.value)}));
    return():VNodeChild=>h(Primitive,mergeProps(attrs,{as:props.as,asChild:props.asChild,elementRef:(node:unknown)=>{element.value=typeof HTMLElement!=='undefined'&&node instanceof HTMLElement?node:undefined;},
      ...getListboxItemAttributes({selection:selected.value,cursor:{current:cursor.value}},{id:props.value},{elementID:root.elementID(side.value,props.value),disabled:state.value.disabled}),
      hidden:!(side.value==='source'?root.sourceItems.value:root.targetItems.value).contains(props.value),'data-scope':'transfer','data-part':'item','data-transfer-side':side.value,
    }),{default:()=>slots.default?.(state.value)});
  },
});
export const TransferMove=/* @__PURE__ */ defineComponent({
  name:'SectileTransferMove',inheritAttrs:false,props:{as:{type:[String,Object,Function] as PropType<PrimitiveAs>,default:'button'},asChild:{type:Boolean,default:false},from:{type:String as PropType<TransferSide>,required:true},disabled:{type:Boolean,default:false}},
  setup(props,{attrs,slots}){const root=useRoot('TransferMove');return():VNodeChild=>h(Primitive,mergeProps(attrs,{as:props.as,asChild:props.asChild,type:props.as==='button'?'button':undefined,
    disabled:props.disabled||root.state.value.disabled||root.state.value.readonly,'data-scope':'transfer','data-part':'move',
    onClick:(event:MouseEvent)=>{if(!event.defaultPrevented&&!props.disabled)root.move(props.from);}}),slots);},
});
