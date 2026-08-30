import assert from 'node:assert/strict';
import { Window } from 'happy-dom';

const browserWindow = new Window({ url: 'https://sectile.dev/form' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  HTMLFormElement: browserWindow.HTMLFormElement,
  HTMLInputElement: browserWindow.HTMLInputElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  SubmitEvent: browserWindow.SubmitEvent,
  FormData: browserWindow.FormData,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, defineComponent, h, nextTick, ref } = await import('vue');
const { FormField, FormRoot } = await import('../../.verification-dist/form.js');
const { TextField } = await import('../../.verification-dist/text.js');

const revision = ref(0);
const FormCase = defineComponent({
  setup() {
    return () => h(FormRoot, null, {
      default: ({ state }) => h('section', {
        'data-validation-status': state.validation.status,
        'data-submission-status': state.submission.status,
      }, [
        h(FormField, {
          id: 'profile-name',
          name: ['profile', 'displayName'],
          required: true,
        }, {
          default: () => h(TextField, { defaultValue: 'Mina Kim' }),
        }),
      ]),
    });
  },
});

const host = document.createElement('div');
document.body.append(host);
const app = createApp({
  render: () => h('main', { 'data-revision': revision.value }, [h(FormCase)]),
});

app.mount(host);
await nextTick();
await nextTick();
revision.value += 1;
await nextTick();
await nextTick();

assert.equal(host.querySelectorAll('form').length, 1);
assert.equal(host.querySelectorAll('[data-part="field"]').length, 1);
assert.equal(host.querySelector('input')?.name, 'profile.displayName');

app.unmount();
host.remove();
await browserWindow.happyDOM.abort();
browserWindow.close();
process.exit(0);
