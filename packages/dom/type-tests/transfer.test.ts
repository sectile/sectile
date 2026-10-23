import {createTransfer,tryCreateTransfer,connectTransfer,createTransferController,toTransferEvent,type TransferController,type TransferMoveProposal,type TransferConnection} from '@sectile/dom/transfer';
import { createDataTransferFormat, connectDragSource, connectDropTarget, type DataTransferFormat, type DataTransferPayload, type DataTransferRequest } from '@sectile/dom/drag-drop';
const parcelFormat = createDataTransferFormat({ type: 'application/vnd.sectile.parcel+json', maxBytes: 512,
  decode: source => ({ ok: true, value: { id: source, kind: 'parcel' as const } }),
  encode: value => value.id,
});
createDataTransferFormat<{ id: string }>({ type: 'application/vnd.sectile.parcel+json', maxBytes: 512,
  encode: value => value.id, decode: source => ({ ok: true, value: { id: source } }),
});
const typedParcelFormat: DataTransferFormat<{ id: string; kind: 'parcel' }> = parcelFormat;
typedParcelFormat.write({ id: 'a', kind: 'parcel' });
// @ts-expect-error Writes cannot widen the decoder's application value.
parcelFormat.write({ id: 'a', kind: 'other' });
// @ts-expect-error Encoders must return native string data, not asynchronous work.
createDataTransferFormat<string>({ type: 'text/plain', maxBytes: 16, encode: async value => value, decode: value => ({ ok: true, value }) });
declare const nativePayload: DataTransferPayload;
// @ts-expect-error A payload is immutable after admission.
nativePayload.data = 'changed';
const foreignParcel: unknown = {};
const decodedParcel = parcelFormat.read(foreignParcel);
if (decodedParcel.ok) { const exact: 'parcel' = decodedParcel.value.kind; void exact; }
declare const dragElement: HTMLElement;
connectDragSource({ element: dragElement, format: parcelFormat, operations: ['copy', 'move'], getValue: () => ({ id: 'a', kind: 'parcel' as const }) });
// @ts-expect-error A source cannot widen the format's inferred application value.
connectDragSource({ element: dragElement, format: parcelFormat, operations: ['copy'], getValue: () => ({ id: 1, kind: 'other' }) });
connectDropTarget({ element: dragElement, format: parcelFormat, operations: ['copy'], maxTypes: 8, onDrop: request => {
  const exact: DataTransferRequest<{ id: string; kind: 'parcel' }> = request;
  exact.accept(value => { const kind: 'parcel' = value.kind; void kind; return { ok: true, value: undefined }; });
  // @ts-expect-error A commit cannot reinterpret the application's value domain.
  request.accept((value: { id: number }) => ({ ok: true, value: undefined }));
  // @ts-expect-error Native ownership acknowledgement cannot await an asynchronous commit.
  request.accept(async () => ({ ok: true, value: undefined }));
} });
// @ts-expect-error Native staging must finish synchronously before drop acknowledgement.
connectDropTarget({ element: dragElement, format: parcelFormat, operations: ['copy'], maxTypes: 8, onDrop: async () => {} });
const nodes=[{id:'left',parentID:null},{id:'right',parentID:null},{id:'a',parentID:'left'}] as const;
const result=createTransferController({nodes,sourceID:'left',targetID:'right',source:{value:['a'],highlightedValue:'a'},onMove:proposal=>{const exact:TransferMoveProposal<'left'|'right'|'a'>=proposal;void exact;},onValueChange:(_side,value)=>{const exact:readonly ('left'|'right'|'a')[]=value;void exact;}});
toTransferEvent('source',{key:'ArrowRight',ctrlKey:true},'rtl');
if(result.ok){const controller:TransferController<'left'|'right'|'a'>=result.value;controller.syncControlledValues({source:{value:['a'],highlightedValue:null}});controller.handleEvent({type:'move',from:'source',ids:['a']});
// @ts-expect-error Events cannot widen source identities.
controller.handleEvent({type:'move',from:'source',ids:['missing']});
// @ts-expect-error Controlled pane values retain the source identity domain.
controller.syncControlledValues({source:{value:['missing']}});
controller.dispose();}
// @ts-expect-error Bucket identities cannot widen source node identities.
createTransferController({nodes,sourceID:'missing',targetID:'right'});
// @ts-expect-error Default pane values cannot widen source node identities.
createTransferController({nodes,sourceID:'left',targetID:'right',source:{defaultValue:['missing']}});
declare const sourceRoot:HTMLElement,targetRoot:HTMLElement;
const connection=createTransfer({nodes,sourceID:'left',targetID:'right',sourceRoot,targetRoot,onActivate:(_side,id)=>{const exact:'left'|'right'|'a'=id;void exact;}});
const exact:TransferConnection<'left'|'right'|'a'>=connection;
exact.setItemAttributes(sourceRoot,{side:'source',id:'a'});exact.move('source',['a']);
// @ts-expect-error Factory callbacks cannot widen source identities.
createTransfer({nodes,sourceID:'left',targetID:'right',sourceRoot,targetRoot,onActivate:(_side,id:'missing')=>{void id;}});
// @ts-expect-error Registered row identities cannot widen the domain.
exact.setItemAttributes(sourceRoot,{side:'source',id:'missing'});
// @ts-expect-error Fallible factories retain the same identity admission.
tryCreateTransfer({nodes,sourceID:'missing',targetID:'right',sourceRoot,targetRoot});
if(result.ok){const borrowed=connectTransfer({controller:result.value,sourceRoot,targetRoot});
// @ts-expect-error Borrowed connections retain the controller identity domain.
borrowed.move('source',['missing']);
borrowed.disconnect();}
connection.destroy();
createTransferController({nodes,sourceID:'left',targetID:'right',typeahead:{textValue:id=>{const exact:'left'|'right'|'a'=id;return exact;},maxQueryLength:32}});
// @ts-expect-error Typeahead text cannot widen source node identities.
createTransferController({nodes,sourceID:'left',targetID:'right',typeahead:{textValue:(id:'missing')=>id}});
