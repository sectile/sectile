import { createApp, h, nextTick, ref } from 'vue';
import { DialogClose, DialogContent, DialogRoot, DialogTrigger } from '../../.verification-dist/dialog.js';
import { PopoverClose, PopoverContent, PopoverRoot, PopoverTrigger } from '../../.verification-dist/popover.js';

const motion = Object.freeze({ transitionProperty: 'opacity', transitionDuration: '20ms' });

export async function runPopupPresenceFocusScenarios() {
  return Object.freeze({
    'popup-dialog-uncontrolled-retained-reopen-focus': await popupScenario('dialog', false),
    'popup-dialog-controlled-retained-reopen-focus': await popupScenario('dialog', true),
    'popup-popover-uncontrolled-retained-reopen-focus': await popupScenario('popover', false),
    'popup-popover-controlled-retained-reopen-focus': await popupScenario('popover', true),
  });
}

async function popupScenario(kind, controlled) {
  const host = document.createElement('div');
  document.body.append(host);
  const open = ref(false);
  const triggerID = `browser-${kind}-${controlled ? 'controlled' : 'uncontrolled'}-trigger`;
  const closeID = `browser-${kind}-${controlled ? 'controlled' : 'uncontrolled'}-close`;
  const parts = kind === 'dialog'
    ? { Root: DialogRoot, Trigger: DialogTrigger, Content: DialogContent, Close: DialogClose }
    : { Root: PopoverRoot, Trigger: PopoverTrigger, Content: PopoverContent, Close: PopoverClose };
  const rootProps = {
    ...(kind === 'dialog' ? { modal: false } : { position: false }),
    ...(controlled
      ? { open: open.value, 'onUpdate:open': (next) => { open.value = next; } }
      : { defaultOpen: false }),
  };
  const app = createApp({
    render: () => h(parts.Root, {
      ...rootProps,
      ...(controlled ? { open: open.value } : {}),
    }, {
      default: () => [
        h(parts.Trigger, { id: triggerID }, { default: () => 'Open' }),
        h(parts.Content, { style: motion }, {
          default: () => h(parts.Close, { id: closeID }, { default: () => 'Close' }),
        }),
      ],
    }),
  });

  try {
    app.mount(host);
    await settle();
    const trigger = host.querySelector(`#${triggerID}`);
    const content = host.querySelector('[data-part="content"]');
    if (!(trigger instanceof HTMLButtonElement) || !(content instanceof HTMLElement)) {
      return Object.freeze({ ok: false, reason: 'popup fixture elements unavailable' });
    }

    trigger.click();
    await settle();
    const close = host.querySelector(`#${closeID}`);
    const firstOpenFocus = close instanceof HTMLButtonElement && document.activeElement === close;

    close?.click();
    await settle();
    const restoredFocus = document.activeElement === trigger;
    const retainedExit = !content.hidden && content.inert && content.getAttribute('aria-hidden') === 'true';

    trigger.click();
    await settle();
    const retainedNode = host.querySelector('[data-part="content"]') === content;
    const reopenedFocus = document.activeElement === close;
    const reopenedInteractive = !content.hidden && !content.inert && content.getAttribute('aria-hidden') === null;

    close?.click();
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 25));
    content.dispatchEvent(new Event('transitionend', { bubbles: true }));
    await settle();
    const exited = content.hidden && !content.inert;

    trigger.click();
    await settle();
    const fullExitReopenFocus = document.activeElement === close;

    return Object.freeze({
      ok: firstOpenFocus && restoredFocus && retainedExit && retainedNode && reopenedFocus
        && reopenedInteractive && exited && fullExitReopenFocus,
      firstOpenFocus,
      restoredFocus,
      retainedExit,
      retainedNode,
      reopenedFocus,
      reopenedInteractive,
      exited,
      fullExitReopenFocus,
    });
  } finally {
    app.unmount();
    host.remove();
  }
}

async function settle() {
  await nextTick();
  await nextTick();
}
