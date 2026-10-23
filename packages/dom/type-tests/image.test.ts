import { connectImage, type ImageConnection, type ImageSnapshot, type ImageStatus, type ImageErrorCode } from '@sectile/dom/image';
const element = document.createElement('img');
const result = connectImage({ element, onChange(snapshot) {
  const value: ImageSnapshot = snapshot, status: ImageStatus = value.status;
  const selected: string = value.currentSrc, width: number = value.naturalWidth;
  void status; void selected; void width;
  // @ts-expect-error The native resource snapshot is immutable.
  value.status = 'ready';
} });
if (result.ok) {
  const connection: ImageConnection = result.value;
  const changed = connection.invalidate();
  if (!changed.ok) { const code: ImageErrorCode = changed.error.code; void code; }
  connection.refresh(); connection.getSnapshot(); connection.disconnect();
}
// @ts-expect-error An actual HTML image is required, not a display container.
connectImage({ element: document.createElement('div'), onChange() {} });
// @ts-expect-error Resource observation needs its scoped publication owner.
connectImage({ element });
// @ts-expect-error Source mutation is caller-owned, not another image request API.
connectImage({ element, src: '/avatar.png', onChange() {} });
