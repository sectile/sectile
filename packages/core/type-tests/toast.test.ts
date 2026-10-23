import { areToastInputsEqual, createToastState, getToastInputs, reconcileToastProposal, reconcileToastState, type ToastInput, type ToastState } from '@sectile/core/toast';

const state = createToastState<'saved' | 'failed'>([{ id: 'saved', title: 'Saved' }]);
const inputs: readonly ToastInput<'saved' | 'failed'>[] = getToastInputs(state.items);
// @ts-expect-error Public input projection is immutable and does not expose countdown progress.
inputs[0]!.remainingMs;
// @ts-expect-error The projected identity domain cannot widen to unrelated numeric IDs.
const numericInputs: readonly ToastInput<number>[] = inputs;
void numericInputs;
const synchronized = reconcileToastState(state, [{ id: 'failed', title: 'Failed', durationMs: null }]);
if (synchronized.ok) {
  const result: ToastState<'saved' | 'failed'> = synchronized.value;
  reconcileToastProposal(state, result, 'input');
  areToastInputsEqual(state.items, result.items);
}
reconcileToastProposal(state, state, 'clock');
// @ts-expect-error Reconciliation does not widen the previous state's identity domain.
reconcileToastState(state, [{ id: 'foreign', title: 'Foreign' }]);
// @ts-expect-error Proposal membership uses the same identity domain.
reconcileToastProposal(state, createToastState([{ id: 1, title: 'Numeric' }]), 'input');
// @ts-expect-error Input equivalence cannot silently compare incompatible identity domains.
areToastInputsEqual(state.items, createToastState([{ id: 1, title: 'Numeric' }]).items);
// @ts-expect-error Proposal origin is an explicit portable input/clock discriminator.
reconcileToastProposal(state, state, 'manual');
const numeric = createToastState<1 | 2>([{ id: 1, title: 'One' }]);
reconcileToastState(numeric, [{ id: 2, title: 'Two' }]);
// @ts-expect-error Numeric domains remain numeric and bounded.
reconcileToastState(numeric, [{ id: '2', title: 'String' }]);
// @ts-expect-error Portable component operations belong to their focused subpath.
import { reconcileToastState as rootReconcile } from '@sectile/core';
void rootReconcile;
