import type {Result,StableID} from '@sectile/core';
import {createFacadeConnection,type FacadeConnection} from '@sectile/core/adapter-runtime';
import {unwrap} from '@sectile/core/result';
import type {RevisionResult,RevisionSnapshot} from '@sectile/core/revision';
import {getTransferItems,type TransferEvent,type TransferSide,type TransferState} from '@sectile/core/transfer';
import type {InteractionState} from '@sectile/core/interaction';
import {getListboxRootAttributes,getListboxItemAttributes} from '../listbox.js';
import {stableIDElementToken} from '../identity.js';
import {findDelegatedIdentity,isNativeInteractionTarget} from '../identity/delegated-event.js';
import {createDOMAttributeBinding,type DOMAttributeBinding} from '../interaction/attributes.js';
import type {ReadingDirection} from '../interaction/keyboard.js';
import {createTransferController,type TransferController,type TransferControllerOptions,type TransferControlledValues,type TransferEffect} from './controller.js';

export interface TransferConnectionOptions<ID extends StableID = StableID> {
  readonly controller: TransferController<ID>;
  readonly sourceRoot: HTMLElement;
  readonly targetRoot: HTMLElement;
  readonly sourceLabel?: string;
  readonly targetLabel?: string;
  readonly direction?: ReadingDirection;
  readonly getItemElementID?: (side: TransferSide,id: NoInfer<ID>) => string;
  readonly onActivate?: (side: TransferSide,id: NoInfer<ID>) => void;
  readonly onUpdate?: () => void;
}
export type TransferOptions<ID extends StableID = StableID> = TransferControllerOptions<ID> & Omit<TransferConnectionOptions<ID>,'controller'>;
export interface TransferConnection<ID extends StableID = StableID> {
  getSnapshot(): RevisionSnapshot<TransferState<ID>>;
  getActive(): boolean;
  syncControlledValues(values: TransferControlledValues<NoInfer<ID>>): Result<RevisionSnapshot<TransferState<ID>>>;
  setPaneAttributes(side: TransferSide,label?: string): void;
  setItemAttributes(element: HTMLElement,attributes: {readonly side: TransferSide;readonly id: NoInfer<ID>}): void;
  releaseItem(element: HTMLElement,id: NoInfer<ID>): void;
  handleEvent(event: TransferEvent<NoInfer<ID>>): boolean;
  handleKeyboardEvent(side: TransferSide,event: KeyboardEvent): boolean;
  move(from: TransferSide,ids?: readonly NoInfer<ID>[]): boolean;
  focus(side: TransferSide): void;
  render(): void;
  suspend(): void;
  resume(): void;
  disconnect(): void;
}
export function createTransfer<ID extends StableID>(options: Omit<TransferOptions<NoInfer<ID>>,'nodes'> & Pick<TransferOptions<ID>,'nodes'>): FacadeConnection<TransferConnection<ID>> {
  return unwrap(tryCreateTransfer(options));
}
export function tryCreateTransfer<ID extends StableID>(options: Omit<TransferOptions<NoInfer<ID>>,'nodes'> & Pick<TransferOptions<ID>,'nodes'>): Result<FacadeConnection<TransferConnection<ID>>> {
  return createFacadeConnection(options,createOwnedConnection);
}
export function connectTransfer<ID extends StableID>(options: TransferConnectionOptions<ID>): TransferConnection<ID> { return new DOMTransferConnection(options); }
function createOwnedConnection<ID extends StableID>(options: TransferOptions<ID>): Result<TransferConnection<ID>> {
  const valid=validateRoots(options.sourceRoot,options.targetRoot);if(!valid.ok)return valid;
  const relay=createRelay(options.onEffect,options.onUpdate);
  const controller=createTransferController({...options,onEffect:relay.effect,onUpdate:relay.update});
  if(!controller.ok){relay.clear();return controller;}
  try{
    const {onEffect:_effect,onUpdate:_update,...presentation}=options;
    const connection=new DOMTransferConnection({...presentation,controller:controller.value},controller.value,relay.clear);
    relay.attach(connection);return {ok:true,value:connection};
  }catch(error){relay.clear();try{controller.value.dispose();}catch{/* Preserve construction failure. */}throw error;}
}
function createRelay<ID extends StableID>(effect: ((effect:TransferEffect<ID>)=>void)|undefined,update: (()=>void)|undefined) {
  let target: {refresh():void;publishEffect(value:TransferEffect<ID>):void}|undefined;
  return {effect:(value:TransferEffect<ID>)=>completeAll([()=>target?.publishEffect(value),()=>effect?.(value)]),
    update:()=>completeAll([()=>target?.refresh(),()=>update?.()]),attach:(value:NonNullable<typeof target>)=>{target=value;},
    clear:()=>{target=undefined;effect=undefined;update=undefined;}};
}
type Pane={readonly root:HTMLElement;readonly attributes:DOMAttributeBinding;readonly listeners:Readonly<Record<'keydown'|'click'|'focus',EventListener>>;label:string|undefined};
type Row<ID extends StableID>={readonly id:ID;readonly side:TransferSide;readonly element:HTMLElement;readonly elementID:string;readonly attributes:DOMAttributeBinding};
interface Presentation<ID extends StableID> {
  readonly controller:TransferController<ID>;readonly owned:TransferController<ID>|undefined;readonly release:(()=>void)|undefined;
  readonly panes:Record<TransferSide,Pane>;readonly rows:Map<ID,Row<ID>>;readonly owners:WeakMap<HTMLElement,ID>;
  readonly prefix:string;readonly elementID:TransferConnectionOptions<ID>['getItemElementID'];readonly direction:ReadingDirection|undefined;
  readonly onActivate:TransferConnectionOptions<ID>['onActivate'];readonly onUpdate:(()=>void)|undefined;
  active:boolean;gesture:TransferSide|undefined;renderedRevision:number;lastState:TransferState<ID>|undefined;lastInteraction:InteractionState|undefined;lastActive:boolean;
}
const sides:readonly TransferSide[]=['source','target'];let nextTransferID=0;
class DOMTransferConnection<ID extends StableID> implements TransferConnection<ID> {
  #scope:Presentation<ID>|undefined;
  #snapshot:RevisionSnapshot<TransferState<ID>>;
  public constructor(options:TransferConnectionOptions<ID>,owned?:TransferController<ID>,release?:()=>void){
    const {controller,sourceRoot,targetRoot}=options,valid=validateRoots(sourceRoot,targetRoot);if(!valid.ok)throw new TypeError(valid.error.message);
    this.#snapshot=controller.getSnapshot();
    const pane=(side:TransferSide,root:HTMLElement,label:string|undefined):Pane=>({root,label,attributes:createDOMAttributeBinding(root),listeners:{
      keydown:event=>{if(this.handleKeyboardEvent(side,event as KeyboardEvent))event.preventDefault();},
      click:event=>this.#click(side,event),focus:event=>this.#enter(side,event)}});
    this.#scope={controller,owned,release,panes:{source:pane('source',sourceRoot,options.sourceLabel),target:pane('target',targetRoot,options.targetLabel)},
      rows:new Map(),owners:new WeakMap(),prefix:`sectile-transfer-${++nextTransferID}`,elementID:options.getItemElementID,direction:options.direction,
      onActivate:options.onActivate,onUpdate:options.onUpdate,active:true,gesture:undefined,renderedRevision:-1,lastState:undefined,lastInteraction:undefined,lastActive:false};
    try{this.#bind(this.#scope);this.render();}catch(error){try{this.disconnect();}catch{/* Preserve acquisition failure. */}throw error;}
  }
  public getSnapshot():RevisionSnapshot<TransferState<ID>>{return this.#scope?.controller.getSnapshot()??this.#snapshot;}
  public getActive():boolean{const scope=this.#scope;return !!scope&&scope.active&&scope.controller.getActive();}
  public syncControlledValues(values:TransferControlledValues<ID>):Result<RevisionSnapshot<TransferState<ID>>>{
    const scope=this.#scope;if(!scope)return {ok:false,error:{class:'resource-rejection',code:'connection-destroyed',message:'Transfer is disconnected.'}};
    const before=scope.controller.getSnapshot();let result!:Result<RevisionSnapshot<TransferState<ID>>>;
    completeAll([()=>{result=scope.controller.syncControlledValues(values);},()=>this.#ensureRender(scope),()=>{
      if(this.#scope!==scope||scope.owned)return;
      const next=scope.controller.getSnapshot();if(next.revision===before.revision)return;
      for(const side of sides)if(next.state[side].cursor.current!==before.state[side].cursor.current)this.publishEffect({type:'focus-element',side,id:next.state[side].cursor.current});
    },()=>{if(this.#scope===scope)scope.onUpdate?.();}]);return result;
  }
  public handleEvent(event:TransferEvent<ID>):boolean{
    const scope=this.#scope;if(!scope||!this.getActive())return false;
    return this.#invoke(scope,()=>scope.controller.handleEvent(event));
  }
  public move(from:TransferSide,ids?:readonly ID[]):boolean{return this.handleEvent({type:'move',from,...(ids===undefined?{}:{ids})});}
  public handleKeyboardEvent(side:TransferSide,event:KeyboardEvent):boolean{
    const scope=this.#scope;if(!scope||!this.getActive()||event.defaultPrevented)return false;
    if(!this.#allowed(scope,side,event.target)||this.#scope!==scope)return false;
    return this.#invoke(scope,()=>scope.controller.handleKeyboardInput(side,event));
  }
  #invoke(scope:Presentation<ID>,action:()=>RevisionResult<TransferState<ID>,TransferEffect<ID>>):boolean{
    const before=scope.controller.getSnapshot();let result:RevisionResult<TransferState<ID>,TransferEffect<ID>>|undefined;
    completeAll([()=>{result=action();},()=>this.#ensureRender(scope),()=>{
      if(this.#scope!==scope||scope.owned)return;
      if(result?.ok){for(const effect of result.commands){if(scope.controller.getSnapshot().revision!==result.snapshot.revision)break;this.publishEffect(effect);}}
      else if(!result&&scope.controller.getSnapshot().revision!==before.revision){
        for(const side of sides){const id=scope.controller.getSnapshot().state[side].cursor.current;if(id!==before.state[side].cursor.current)this.publishEffect({type:'focus-element',side,id});}
      }
    },()=>{if(this.#scope===scope&&(result?.ok||scope.controller.getSnapshot().revision!==before.revision))scope.onUpdate?.();}]);return result?.ok===true;
  }
  #click(side:TransferSide,event:Event):void{
    const scope=this.#scope;if(!scope||!this.getActive()||event.defaultPrevented)return;
    const id=findDelegatedIdentity(event.target,scope.panes[side].root,scope.owners),row=id===null?undefined:scope.rows.get(id);
    if(!row||row.side!==side||!this.#allowed(scope,side,event.target,row.element)||scope.controller.isDisabled(row.id)!==false||this.#scope!==scope)return;
    const previous=scope.gesture;scope.gesture=side;
    try{scope.panes[side].root.focus();if(this.#scope===scope)this.handleEvent({type:'listbox',side,event:{type:'toggle',id:row.id}});}finally{scope.gesture=previous;}
  }
  #enter(side:TransferSide,event:Event):void{
    const scope=this.#scope;if(!scope||!this.getActive()||scope.gesture===side||event.target!==scope.panes[side].root)return;
    const state=scope.controller.getSnapshot().state;
    if(state[side].cursor.current===null&&scope.controller.getItems(side).size>0)this.handleEvent({type:'listbox',side,event:'first'});
  }
  #allowed(scope:Presentation<ID>,side:TransferSide,target:EventTarget|null,boundary=scope.panes[side].root):boolean{
    const root=scope.panes[side].root;let element=target as HTMLElement|null;
    if(element!==root&&!root.contains(element))return false;
    while(element&&element!==boundary&&element!==root){if(isNativeInteractionTarget(element))return false;element=element.parentElement;}
    return true;
  }
  public focus(side:TransferSide):void{const scope=this.#scope;if(scope&&this.getActive())scope.panes[side].root.focus();}
  public publishEffect(effect:TransferEffect<ID>):void{
    const scope=this.#scope;if(!scope||!this.getActive()||scope.controller.getSnapshot().state[effect.side].cursor.current!==effect.id)return;
    this.#ensureRender(scope);if(this.#scope!==scope)return;
    if(effect.type==='dispatch-activation'){scope.onActivate?.(effect.side,effect.id);return;}
    const root=scope.panes[effect.side].root,active=root.ownerDocument?.activeElement;
    if(active&&root.contains(active))root.focus();
  }
  public setPaneAttributes(side:TransferSide,label?:string):void{const scope=this.#scope;if(!scope)return;if(label!==undefined)scope.panes[side].label=label;this.#projectPane(scope,side);}
  public setItemAttributes(element:HTMLElement,attributes:{readonly side:TransferSide;readonly id:ID}):void{
    const scope=this.#scope;if(!scope)return;const {side,id}=attributes;
    if(!scope.controller.getItems(side).contains(id)||element===scope.panes[side].root)return;
    const previous=scope.owners.get(element);if(previous!==undefined&&previous!==id)this.releaseItem(element,previous);
    const displaced=scope.rows.get(id);
    if(displaced&&(displaced.element!==element||displaced.side!==side))this.releaseItem(displaced.element,id);
    if(this.#scope!==scope)return;
    let row=scope.rows.get(id);
    if(!row){const elementID=scope.elementID?.(side,id)??(element.id||`${scope.prefix}-${side}-${stableIDElementToken(id)}`);
      if(this.#scope!==scope)return;
      if(typeof elementID!=='string'||!elementID||/[\t\n\f\r ]/u.test(elementID))throw new TypeError('Transfer item IDs must be nonempty ID-reference tokens.');
      row={id,side,element,elementID,attributes:createDOMAttributeBinding(element)};scope.rows.set(id,row);scope.owners.set(element,id);}
    this.#projectRow(scope,row);this.#projectPane(scope,side);
  }
  public releaseItem(element:HTMLElement,id:ID):void{
    const scope=this.#scope,row=scope?.rows.get(id);if(!scope||!row||row.element!==element)return;
    scope.rows.delete(id);scope.owners.delete(element);completeAll([()=>row.attributes.disconnect(),()=>{if(this.#scope===scope)this.#projectPane(scope,row.side);}]);
  }
  #projectRow(scope:Presentation<ID>,row:Row<ID>):void{
    const disabled=!this.getActive()||scope.controller.isDisabled(row.id)!==false;if(this.#scope!==scope)return;
    row.attributes.apply({...getListboxItemAttributes(scope.controller.getSnapshot().state[row.side],{id:row.id},{elementID:row.elementID,disabled}),
      'data-scope':'transfer','data-part':'item','data-transfer-side':row.side});
  }
  #projectPane(scope:Presentation<ID>,side:TransferSide):void{
    const pane=scope.panes[side],state=scope.controller.getSnapshot().state[side],interaction=scope.controller.getInteraction(),active=this.getActive();
    const row=state.cursor.current===null?undefined:scope.rows.get(state.cursor.current);
    const {'aria-label':_label,dir:_direction,...attributes}=getListboxRootAttributes({selectionMode:'multiple',disabled:interaction.disabled,readOnly:interaction.readOnly});
    pane.attributes.apply({...attributes,...(pane.label===undefined?{}:{'aria-label':pane.label}),...(scope.direction===undefined?{}:{dir:scope.direction}),
      tabindex:active&&!interaction.disabled?0:-1,'aria-disabled':!active||interaction.disabled?'true':undefined,'aria-readonly':interaction.readOnly?'true':undefined,
      'aria-activedescendant':active&&row?.side===side&&pane.root.contains(row.element)?row.elementID:undefined,'data-scope':'transfer','data-part':side});
  }
  #ensureRender(scope:Presentation<ID>):void{if(this.#scope===scope&&scope.renderedRevision!==scope.controller.getSnapshot().revision)this.refresh();}
  public render():void{this.#render(true);}
  public refresh():void{this.#render(false);}
  #render(full:boolean):void{
    const scope=this.#scope;if(!scope)return;const snapshot=scope.controller.getSnapshot(),state=snapshot.state,interaction=scope.controller.getInteraction(),active=this.getActive(),before=scope.lastState;
    const local=!full&&before&&before.nodes===state.nodes&&before.source.selection===state.source.selection&&before.target.selection===state.target.selection
      &&scope.lastInteraction?.disabled===interaction.disabled&&scope.lastInteraction.readOnly===interaction.readOnly&&scope.lastActive===active;
    const operations:(()=>void)[]=[];
    if(local){const ids=new Set<ID>();for(const side of sides){if(before[side].cursor.current!==null)ids.add(before[side].cursor.current);if(state[side].cursor.current!==null)ids.add(state[side].cursor.current!);}
      for(const id of ids){const row=scope.rows.get(id);if(row)operations.push(()=>{if(this.#scope===scope)this.#projectRow(scope,row);});}}
    else for(const [id,row]of scope.rows)operations.push(()=>{if(this.#scope!==scope)return;if(scope.controller.getItems(row.side).contains(id))this.#projectRow(scope,row);else this.releaseItem(row.element,id);});
    for(const side of sides)operations.push(()=>{if(this.#scope===scope)this.#projectPane(scope,side);});
    completeAll(operations);if(this.#scope!==scope)return;
    scope.renderedRevision=snapshot.revision;scope.lastState=state;scope.lastInteraction=interaction;scope.lastActive=active;
  }
  #bind(scope:Presentation<ID>):void{for(const side of sides)for(const [type,listener]of Object.entries(scope.panes[side].listeners))scope.panes[side].root.addEventListener(type,listener);}
  #unbind(scope:Presentation<ID>):void{completeAll(sides.flatMap(side=>Object.entries(scope.panes[side].listeners).map(([type,listener])=>()=>scope.panes[side].root.removeEventListener(type,listener))));}
  public suspend():void{const scope=this.#scope;if(!scope||!scope.active)return;scope.active=false;completeAll([()=>this.#unbind(scope),()=>this.render()]);}
  public resume():void{const scope=this.#scope;if(!scope||scope.active||!scope.controller.getActive())return;scope.active=true;try{this.#bind(scope);this.render();}catch(error){try{this.suspend();}catch{/* Preserve resume failure. */}throw error;}}
  public disconnect():void{
    const scope=this.#scope;if(!scope)return;this.#snapshot=scope.controller.getSnapshot();this.#scope=undefined;
    completeAll([()=>this.#unbind(scope),...Array.from(scope.rows.values(),row=>()=>row.attributes.disconnect()),()=>scope.rows.clear(),
      ...sides.map(side=>()=>scope.panes[side].attributes.disconnect()),()=>scope.owned?.dispose(),()=>scope.release?.()]);
  }
}
function completeAll(operations:readonly (()=>void)[]):void{let failed=false,first:unknown;for(const operation of operations){try{operation();}catch(error){if(!failed){failed=true;first=error;}}}if(failed)throw first;}
function validateRoots(source:HTMLElement,target:HTMLElement):Result<void>{
  if(!source||!target||source===target||typeof source.addEventListener!=='function'||typeof target.addEventListener!=='function'||source.contains?.(target)||target.contains?.(source)||source.ownerDocument!==target.ownerDocument)
    return {ok:false,error:{class:'construction',code:'invalid-boundary',message:'Transfer requires two distinct nonnested roots in one document.'}};
  return {ok:true,value:undefined};
}
