import type { CoreErrorCode, Result, SectileError } from '@sectile/core';

export type VirtualOwnErrorCode =
  | 'extent-index-ceiling-exceeded'
  | 'extent-index-move-invalid'
  | 'extent-index-size-invalid'
  | 'extent-index-splice-invalid'
  | 'extent-index-update-invalid'
  | 'extent-invalid'
  | 'virtual-collection-input-invalid'
  | 'virtual-collection-patch-invalid'
  | 'virtual-lane-policy-invalid'
  | 'virtual-size-policy-invalid'
  | 'virtual-layout-domain-mismatch'
  | 'virtual-layout-generation-exhausted'
  | 'virtual-layout-geometry-invalid'
  | 'virtual-layout-inserted-extents-mismatch'
  | 'virtual-layout-measurement-invalid'
  | 'virtual-layout-measurement-stale'
  | 'virtual-layout-mutation-invalid'
  | 'virtual-layout-region-invalid'
  | 'virtual-layout-region-overlap'
  | 'virtual-layout-scroll-target-invalid'
  | 'virtual-layout-snapshot-invalid'
  | 'virtual-layout-window-mismatch';

export type VirtualErrorCode = CoreErrorCode | VirtualOwnErrorCode;
export type VirtualError<Code extends VirtualErrorCode = VirtualErrorCode> = SectileError<Code>;
export type VirtualResult<T, Code extends VirtualErrorCode = VirtualErrorCode> = Result<T, Code>;
