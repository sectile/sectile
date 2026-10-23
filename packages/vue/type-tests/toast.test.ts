import { ToastProvider, ToastRoot, type ToastProviderProps, type ToastRootProps, type UseToastReturn } from '@sectile/vue/toast';

const provider: ToastProviderProps = { toasts: [{ id: 'saved', title: 'Saved' }], defaultDurationMs: null };
const root: ToastRootProps = { value: 'saved', as: 'li' };
// @ts-expect-error Vue notification identities are strings.
const invalidProvider: ToastProviderProps = { toasts: [{ id: 1, title: 'Numeric' }] };
// @ts-expect-error A root requires its notification identity.
const invalidRoot: ToastRootProps = { as: 'li' };
type ProviderSlot = Parameters<InstanceType<typeof ToastProvider>['$slots']['default']>[0];
declare const slot: ProviderSlot;
const id: string | undefined = slot.toasts[0]?.id;
slot.toast({ id: 'saved', title: 'Saved' });
// @ts-expect-error Public slot data is immutable.
slot.toasts[0]!.title = 'Mutation';
type RootSlot = Parameters<InstanceType<typeof ToastRoot>['$slots']['default']>[0];
declare const row: RootSlot;
const active: boolean = row.open;
const title: string | undefined = row.toast?.title;
declare const api: UseToastReturn;
api.toast({ id: 'saved', title: 'Saved' }); api.update('saved', { durationMs: null });
// @ts-expect-error Runtime commands preserve the declared string identity input.
api.dismiss(1);
void [provider, root, invalidProvider, invalidRoot, id, active, title];
