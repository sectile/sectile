import { connectFullscreen, type FullscreenConnection, type FullscreenSnapshot, type FullscreenErrorCode } from '@sectile/dom/fullscreen';
const element = document.createElement('div');
const result = connectFullscreen({ element, onChange(snapshot) {
  const state: FullscreenSnapshot = snapshot;
  const active: boolean = state.active, pending: 'enter' | 'exit' | null = state.pending;
  void active; void pending;
  // @ts-expect-error Native snapshots are immutable.
  state.available = true;
} });
if (result.ok) {
  const owner: FullscreenConnection = result.value;
  owner.enter().then(outcome => { if (!outcome.ok) { const code: FullscreenErrorCode = outcome.error.code; void code; } });
  owner.exit(); owner.refresh(); owner.getSnapshot(); owner.disconnect();
}
// @ts-expect-error One caller-owned HTML target is required, not a document.
connectFullscreen({ element: document, onChange() {} });
// @ts-expect-error Observation requires its scoped publication owner.
connectFullscreen({ element });
