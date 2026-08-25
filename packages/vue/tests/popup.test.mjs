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
import {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerRoot,
  DrawerTitle,
  DrawerTrigger,
} from '../dist/drawer.js';
import { PopoverAnchor, PopoverArrow, PopoverContent, PopoverRoot, PopoverTrigger } from '../dist/popover.js';
import { TooltipArrow, TooltipContent, TooltipRoot, TooltipTrigger } from '../dist/tooltip.js';

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
  assert.match(html, /aria-labelledby="sectile-dialog-[^"]+-title"/);
  assert.match(html, /data-part="close"/);
});

test('Vue dialog uses an explicit accessible label without a dangling title reference', async () => {
  const html = await renderToString(createSSRApp({
    render: () => h(DialogRoot, { defaultOpen: true, label: 'Preferences' }, {
      default: () => h(DialogContent, null, { default: () => 'Settings' }),
    }),
  }));
  assert.match(html, /aria-label="Preferences"/);
  assert.doesNotMatch(html, /aria-labelledby=/);
});

test('Vue drawer exposes directional dialog anatomy and a decorative gesture handle', async () => {
  const html = await renderToString(createSSRApp({
    render: () => h(DrawerRoot, { defaultOpen: true, side: 'left' }, {
      default: () => [
        h(DrawerTrigger, null, { default: () => 'Open drawer' }),
        h(DrawerContent, null, {
          default: () => [
            h(DrawerHandle),
            h(DrawerTitle, null, { default: () => 'Filters' }),
            h(DrawerDescription, null, { default: () => 'Refine the results.' }),
            h(DrawerClose, null, { default: () => 'Close' }),
          ],
        }),
      ],
    }),
  }));
  assert.match(html, /data-scope="drawer"/);
  assert.match(html, /role="dialog"/);
  assert.match(html, /data-side="left"/);
  assert.match(html, /data-swipe-direction="left"/);
  assert.match(html, /<div aria-hidden="true"[^>]*data-part="handle"/);
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
        h(TooltipContent, null, { default: () => [h(TooltipArrow), 'More information'] }),
      ],
    }),
  }));
  assert.match(alert, /role="alertdialog"/);
  assert.match(tooltip, /role="tooltip"/);
  assert.match(tooltip, /aria-describedby="sectile-tooltip-[^"]+-content"/);
  assert.match(tooltip, /data-part="arrow"/);
});

test('Vue popover exposes non-modal anchored compound parts', async () => {
  const html = await renderToString(createSSRApp({
    render: () => h(PopoverRoot, { defaultOpen: true, side: 'right', align: 'start' }, {
      default: () => [
        h(PopoverAnchor, null, { default: () => 'Anchor' }),
        h(PopoverTrigger, null, { default: () => 'Open profile' }),
        h(PopoverContent, null, { default: () => [h(PopoverArrow), 'Profile'] }),
      ],
    }),
  }));
  assert.match(html, /data-scope="popover"/);
  assert.match(html, /aria-modal="false"/);
  assert.match(html, /data-part="anchor"/);
  assert.match(html, /data-part="arrow"/);
});
