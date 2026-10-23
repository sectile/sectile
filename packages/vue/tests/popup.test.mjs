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
} from '../.verification-dist/overlay/dialog.js';
import { AlertDialogContent, AlertDialogRoot, AlertDialogTitle } from '../.verification-dist/overlay/alert-dialog.js';
import {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerRoot,
  DrawerTitle,
  DrawerTrigger,
} from '../.verification-dist/overlay/drawer.js';
import { PopoverAnchor, PopoverArrow, PopoverContent, PopoverRoot, PopoverTrigger } from '../.verification-dist/overlay/popover.js';
import { TooltipArrow, TooltipContent, TooltipRoot, TooltipTrigger } from '../.verification-dist/overlay/tooltip.js';

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
  let closed = 0;
  const html = await renderToString(createSSRApp({
    render: () => h(DialogRoot, { defaultOpen: true, label: 'Preferences', describedBy: null, onAfterClose() { closed++; } }, {
      default: () => h(DialogContent, null, { default: () => 'Settings' }),
    }),
  }));
  assert.match(html, /aria-label="Preferences"/);
  assert.doesNotMatch(html, /aria-labelledby=/);
  assert.doesNotMatch(html, /aria-describedby=/);
  assert.equal(closed, 0, 'SSR completion is not a visual exit');
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

test('SSR inline Drawer exposes retained labelled navigation without dialog semantics', async () => {
  let placement;
  const html = await renderToString(createSSRApp({ render: () => h(DrawerRoot, { presentation: 'inline', unmountOnExit: false }, {
    default: state => {
      placement = state.placement;
      return h(DrawerContent, null, { default: () => h('nav', { 'aria-label': 'Workspace' }, 'Projects') });
    },
  }) }));
  assert.equal(placement, 'inline'); assert.match(html, /data-presentation="inline"/);
  assert.match(html, /<nav aria-label="Workspace">Projects<\/nav>/);
  assert.doesNotMatch(html, /role="dialog"|aria-modal=|aria-labelledby=| hidden| inert/);
  for (const invalid of [{ open: true }, { defaultOpen: true }, { unmountOnExit: true }]) {
    await assert.rejects(renderToString(createSSRApp({ render: () => h(DrawerRoot, { presentation: 'inline', unmountOnExit: false, ...invalid }, {
      default: () => h(DrawerContent),
    }) })), /Inline Drawer presentation requires closed, retained content/);
  }
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

test('Tooltip SSR composes caller descriptions without inventing dialog title or description references', async () => {
  const html = await renderToString(createSSRApp({ render: () => h(TooltipRoot, { defaultOpen: true }, { default: () => [
    h(TooltipTrigger, { 'aria-describedby': 'caller-help' }, { default: () => 'Details' }),
    h(TooltipContent, null, { default: () => 'Extra details' }),
  ] }) }));
  assert.match(html, /aria-describedby="caller-help sectile-tooltip-[^"]+-content"/u);
  const content = html.match(/<[^>]+role="tooltip"[^>]*>/u)?.[0];
  assert.ok(content); assert.doesNotMatch(content, /aria-labelledby|aria-describedby/u);
  const closed = await renderToString(createSSRApp({ render: () => h(TooltipRoot, { unmountOnExit: true }, { default: () => [
    h(TooltipTrigger, { 'aria-describedby': 'caller-help' }, { default: () => 'Details' }), h(TooltipContent, null, { default: () => 'Extra details' }),
  ] }) }));
  assert.match(closed, /aria-describedby="caller-help"/u); assert.doesNotMatch(closed, /role="tooltip"/u);
  let renders = 0;
  const adopted = await renderToString(createSSRApp({ render: () => h(TooltipRoot, { defaultOpen: true }, { default: () => [
    h(TooltipTrigger, { asChild: true }, { default: () => { renders++; return h('button', {
      type: 'submit', disabled: true, 'aria-describedby': 'child-help', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-controls': 'menu-panel',
    }, 'Details'); } }),
    h(TooltipContent, null, { default: () => 'Extra details' }),
  ] }) }));
  assert.equal(renders, 1); assert.match(adopted, /aria-describedby="child-help sectile-tooltip-/u);
  const trigger = adopted.match(/<button[^>]*>/u)[0];
  assert.match(trigger, /type="submit"/u); assert.match(trigger, / disabled/u);
  assert.match(trigger, /aria-haspopup="menu"/u); assert.match(trigger, /aria-expanded="false"/u); assert.match(trigger, /aria-controls="menu-panel"/u);
});

test('Vue popover exposes non-modal anchored compound parts', async () => {
  const externalAnchor = { getBoundingClientRect() { throw new Error('SSR must not measure an external host'); } };
  const html = await renderToString(createSSRApp({
    render: () => h(PopoverRoot, { defaultOpen: true, side: 'right', align: 'start', anchor: externalAnchor, restoreFocusTarget: externalAnchor }, {
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
  assert.doesNotMatch(html, / anchor=/u);
  assert.doesNotMatch(html, /restorefocustarget/iu);
});
