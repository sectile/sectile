import { h } from 'vue';
import { CalendarRoot } from '../../dist/calendar.js';
import { DialogContent, DialogRoot, DialogTrigger } from '../../dist/dialog.js';
import { DisclosureContent, DisclosureRoot, DisclosureTrigger } from '../../dist/disclosure.js';
import { HostProvider } from '../../dist/host-provider.js';
import { PinInputInput, PinInputRoot } from '../../dist/pin-input.js';

export const referenceDate = Object.freeze({ year: 2026, month: 8, day: 26 });

export function createHydrationFixture() {
  return {
    render: () => h(HostProvider, { referenceDate }, {
      default: () => h('main', { id: 'verification-root' }, [
        h(DisclosureRoot, null, {
          default: () => [
            h(DisclosureTrigger, null, { default: () => 'Details' }),
            h(DisclosureContent, null, { default: () => 'Content' }),
          ],
        }),
        h(DialogRoot, {
          defaultOpen: false,
          modal: false,
          label: 'Closed dialog',
          unmountOnExit: true,
        }, {
          default: () => [
            h(DialogTrigger, { id: 'closed-trigger' }, { default: () => 'Open closed' }),
            h(DialogContent, { 'data-browser-state': 'closed' }, { default: () => 'Closed content' }),
          ],
        }),
        h(DialogRoot, {
          defaultOpen: true,
          modal: false,
          label: 'Open dialog',
          unmountOnExit: true,
        }, {
          default: () => [
            h(DialogTrigger, { id: 'open-trigger' }, { default: () => 'Open active' }),
            h(DialogContent, { 'data-browser-state': 'open' }, { default: () => 'Open content' }),
          ],
        }),
        h('form', { id: 'pin-form' }, [
          h(PinInputRoot, { length: 4, defaultValue: '1234', name: 'pin' }, {
            default: () => Array.from(
              { length: 4 },
              (_, index) => h(PinInputInput, { index }),
            ),
          }),
        ]),
        h(CalendarRoot, { referenceDate }, {
          default: ({ highlightedValue }) => h(
            'output',
            { id: 'reference-date' },
            `${highlightedValue.year}-${highlightedValue.month}-${highlightedValue.day}`,
          ),
        }),
      ]),
    }),
  };
}
