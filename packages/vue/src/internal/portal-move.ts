import { inject, onScopeDispose, provide } from 'vue';

export interface PortalMoveConnection {
  prepareMove(): void;
  completeMove(restoreFocus?: boolean): void;
}
interface PortalMoveScope { read: (() => PortalMoveConnection | undefined) | undefined }
const portalMoveKey = Symbol('SectilePortalMove');

/** Borrow the nearest popup's native owner without retaining it after scope disposal. */
export function providePortalMove(read: () => PortalMoveConnection | undefined): void {
  const scope: PortalMoveScope = { read };
  provide(portalMoveKey, scope);
  onScopeDispose(() => { scope.read = undefined; });
}

export function usePortalMove(): PortalMoveScope | undefined {
  return inject<PortalMoveScope | undefined>(portalMoveKey, undefined);
}
