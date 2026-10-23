import { createTransferState, applyTransferEvent, getTransferItems, synchronizeTransferState, reconcileTransferState, type TransferEvent, type TransferPolicies } from '@sectile/core/transfer';
const nodes = [{ id: 'left', parentID: null }, { id: 'right', parentID: null }, { id: 'a', parentID: 'left' }] as const;
const state = createTransferState(nodes, { sourceID: 'left', targetID: 'right', source: { selected: ['a'] } });
const domain: readonly ('left' | 'right' | 'a')[] = getTransferItems(state, 'source').ids; void domain;
const policies: TransferPolicies<'left' | 'right' | 'a'> = { eligible: id => id === 'a', canMove: (id, from, to) => id === 'a' && from !== to, capacity: { target: 2 } };
const event: TransferEvent<'left' | 'right' | 'a'> = { type: 'move', from: 'source', ids: ['a'] };
const next = applyTransferEvent(state, event, policies);
if (next.ok) reconcileTransferState(state, next.value.state, { membership: true });
synchronizeTransferState(state, { source: { selected: ['a'], current: 'a' } });
reconcileTransferState(state,state,{sourceCursor:true,targetCursor:true});
// @ts-expect-error Constructor bucket identities cannot widen the source node IDs.
createTransferState(nodes, { sourceID: 'missing', targetID: 'right' });
// @ts-expect-error Event identities cannot widen the owning state.
applyTransferEvent(state, { type: 'move', from: 'source', ids: ['missing'] });
// @ts-expect-error Nested Listbox events retain the owning identity domain.
applyTransferEvent(state, { type: 'listbox', side: 'source', event: { type: 'toggle', id: 'missing' } });
// @ts-expect-error Accepted selection snapshots retain the identity domain.
synchronizeTransferState(state, { source: { selected: ['missing'] } });
// @ts-expect-error Capacity is a count, not a CSS length.
const invalid: TransferPolicies = { capacity: { source: '10px' } }; void invalid;
