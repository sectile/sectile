import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { HostProvider } from '../.verification-dist/host-provider.js';
import {
  DialogContent,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '../.verification-dist/dialog.js';

test('HostProvider supplies deterministic IDs and reading direction', async () => {
  const html = await renderToString(createSSRApp({
    render: () => h(HostProvider, {
      direction: 'rtl',
      createId: () => 'account-dialog',
    }, {
      default: () => h(DialogRoot, { defaultOpen: true }, {
        default: () => [
          h(DialogTrigger, null, { default: () => 'Open' }),
          h(DialogContent, null, {
            default: () => h(DialogTitle, null, { default: () => 'Account' }),
          }),
        ],
      }),
    }),
  }));

  assert.match(html, /aria-controls="sectile-dialog-account-dialog-content"/);
  assert.match(html, /aria-labelledby="sectile-dialog-account-dialog-title"/);
  assert.match(html, /role="dialog"[^>]*dir="rtl"/);
});
