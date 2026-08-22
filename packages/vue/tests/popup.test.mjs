import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '../dist/dialog.js';
import { AlertDialogContent, AlertDialogRoot, AlertDialogTitle } from '../dist/alert-dialog.js';
import { TooltipContent, TooltipRoot, TooltipTrigger } from '../dist/tooltip.js';

test('Vue dialog links persistent compound parts with native dialog semantics', async () => {
  const app = createSSRApp({
    render: () => h(DialogRoot, { defaultOpen: true }, {
      default: () => [
        h(DialogTrigger, null, { default: () => 'Open' }),
        h(DialogContent, null, {
          default: () => [
            h(DialogTitle, null, { default: () => 'Edit profile' }),
            h(DialogDescription, null, { default: () => 'Update your details.' }),
            h(DialogClose, null, { default: () => 'Close' }),
          ],
        }),
      ],
    }),
  });
  const html = await renderToString(app);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-labelledby="sectile-dialog-\d+-title"/);
  assert.match(html, /data-part="close"/);
});

test('Vue alert dialog and tooltip preserve their distinct native roles', async () => {
  const alert = await renderToString(createSSRApp({
    render: () => h(AlertDialogRoot, { defaultOpen: true }, {
      default: () => h(AlertDialogContent, null, {
        default: () => h(AlertDialogTitle, null, { default: () => 'Delete project?' }),
      }),
    }),
  }));
  const tooltip = await renderToString(createSSRApp({
    render: () => h(TooltipRoot, { defaultOpen: true }, {
      default: () => [
        h(TooltipTrigger, null, { default: () => 'Info' }),
        h(TooltipContent, null, { default: () => 'More information' }),
      ],
    }),
  }));
  assert.match(alert, /role="alertdialog"/);
  assert.match(tooltip, /role="tooltip"/);
  assert.match(tooltip, /aria-describedby="sectile-tooltip-\d+-content"/);
});
