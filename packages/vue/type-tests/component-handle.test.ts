import { createComponentHandle, type ComponentHandle } from '@sectile/vue/component-handle';

interface Control { focus(): void }
interface View { focus(): boolean }
const handle: ComponentHandle<Control, View> = createComponentHandle<Control, View>(current => ({
  focus() {
    const control = current();
    if (control === null) return false;
    control.focus();
    return true;
  },
}));
handle.set({ focus() {} });
handle.set(null);
handle.release();
const focused: boolean = handle.view.focus();
void focused;
// @ts-expect-error attachment must implement the selected control contract
handle.set({ focus: 'not a method' });
// @ts-expect-error view identity is stable and read-only
handle.view = { focus: () => true };
