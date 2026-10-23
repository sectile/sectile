import {TransferRoot,TransferItem,type TransferExpose,type TransferRootSlotProps,type TransferMoveProposal} from '@sectile/vue/transfer';
import { shallowRef, type ShallowRef } from 'vue';
import { createDataTransferFormat, useDragSource, useDropTarget, type DataTransferSnapshot, type DataTransferRequest, type UseDataTransferReturn } from '@sectile/vue/drag-drop';
const externalFormat = createDataTransferFormat({ type: 'application/vnd.sectile.parcel+json', maxBytes: 512,
  decode: source => ({ ok: true, value: { id: source, kind: 'parcel' as const } }), encode: value => value.id });
const externalElement = shallowRef<HTMLElement | null>(null), externalActive = shallowRef(true);
const nativeSource: UseDataTransferReturn = useDragSource({ element: externalElement, active: externalActive, format: () => externalFormat,
  operations: () => ['copy', 'move'], getValue: () => ({ id: 'a', kind: 'parcel' as const }) });
const nativeSnapshot: Readonly<ShallowRef<DataTransferSnapshot | undefined>> = nativeSource.snapshot; void nativeSnapshot;
nativeSource.cancel();
useDropTarget({ element: externalElement, format: externalFormat, operations: shallowRef(['copy'] as const), maxTypes: () => 8, onDrop: request => {
  const exact: DataTransferRequest<{ id: string; kind: 'parcel' }> = request; void exact;
  request.accept(value => { const kind: 'parcel' = value.kind; void kind; return { ok: true, value: undefined }; });
  // @ts-expect-error Native commits cannot widen the decoded value domain.
  request.accept((value: { id: number }) => ({ ok: true, value: undefined }));
} });
// @ts-expect-error Source values must match their format's decoder.
useDragSource({ element: externalElement, format: externalFormat, operations: ['copy'], getValue: () => ({ id: 1 }) });
// @ts-expect-error Vue cannot defer native drop acknowledgement to async staging.
useDropTarget({ element: externalElement, format: externalFormat, operations: ['copy'], maxTypes: 8, onDrop: async () => {} });
// @ts-expect-error DOM elements are reactive inputs to the scoped bridge.
useDragSource({ element: document.createElement('button'), format: externalFormat, operations: ['copy'], getValue: () => ({ id: 'a', kind: 'parcel' as const }) });
// @ts-expect-error Publication remains owned by the bridge.
nativeSource.snapshot.value = undefined;
const nodes=[{id:'available',parentID:null},{id:'assigned',parentID:null},{id:'item',parentID:'available'}] as const;
new TransferRoot({nodes,sourceId:'available',targetId:'assigned',sourceValue:['item'],onMove:proposal=>{const exact:TransferMoveProposal<'available'|'assigned'|'item'>=proposal;void exact;},'onUpdate:sourceValue':values=>{const exact:readonly ('available'|'assigned'|'item')[]=values;void exact;}});
// @ts-expect-error Bucket IDs cannot widen the canonical source domain.
new TransferRoot({nodes,sourceId:'missing',targetId:'assigned'});
// @ts-expect-error Pane selections retain source identity types.
new TransferRoot({nodes,sourceId:'available',targetId:'assigned',defaultTargetValue:['missing']});
// @ts-expect-error Eligibility callback input cannot widen the source identity domain.
new TransferRoot({nodes,sourceId:'available',targetId:'assigned',policies:{eligible:(id:'missing')=>!!id}});
declare const root:TransferExpose<'available'|'assigned'|'item'>;
root.move('source',['item']);root.focus('target');
// @ts-expect-error Exposed moves are source-ID bound.
root.move('source',['missing']);
declare const slot:TransferRootSlotProps<'available'|'assigned'|'item'>;
const value:readonly ('available'|'assigned'|'item')[]=slot.targetItems;void value;
type ItemProps=InstanceType<typeof TransferItem>['$props'];
// @ts-expect-error Root owns disabled eligibility, including unmounted IDs.
const invalid:ItemProps={value:'item',disabled:true};void invalid;
new TransferRoot({nodes,sourceId:'available',targetId:'assigned',typeahead:{textValue:id=>{const exact:'available'|'assigned'|'item'=id;return exact;},maxQueryLength:16}});
// @ts-expect-error Text resolution cannot widen source IDs.
new TransferRoot({nodes,sourceId:'available',targetId:'assigned',typeahead:{textValue:(id:'missing')=>id}});
