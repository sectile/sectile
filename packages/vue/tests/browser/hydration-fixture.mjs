import { h, ref } from 'vue';
import { CalendarRoot } from '../../dist/calendar.js';
import { DialogContent, DialogRoot, DialogTrigger } from '../../dist/dialog.js';
import { DisclosureContent, DisclosureRoot, DisclosureTrigger } from '../../dist/disclosure.js';
import { HostProvider } from '../../dist/host-provider.js';
import { MeterRoot } from '../../dist/meter.js';
import {
  MeterGroupIndicator,
  MeterGroupRoot,
  MeterGroupSegment,
  MeterGroupTrack,
} from '../../dist/meter-group.js';
import { PinInputInput, PinInputRoot } from '../../dist/pin-input.js';
import { ProgressRoot } from '../../dist/progress.js';

export const referenceDate = Object.freeze({ year: 2026, month: 8, day: 26 });

export function createHydrationFixture() {
  const updated = ref(false);
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
        h(MeterRoot, {
          value: updated.value ? '0.2' : '0.1',
          min: '0',
          max: '0.3',
          label: 'Browser meter',
        }),
        h(ProgressRoot, {
          value: updated.value ? '0.1' : null,
          max: '0.3',
          label: 'Browser progress',
        }),
        h(MeterGroupRoot, {
          max: '0.6',
          label: 'Browser capacity',
          items: updated.value
            ? [
                { id: 'media', value: '0.3', label: 'Media' },
                { id: 'documents', value: '0.1', label: 'Documents' },
              ]
            : [
                { id: 'documents', value: '0.1', label: 'Documents' },
                { id: 'media', value: '0.2', label: 'Media' },
              ],
        }, {
          default: ({ segments }) => h(MeterGroupTrack, null, {
            default: () => segments.map((segment) => h(MeterGroupSegment, {
              id: segment.id,
              key: segment.id,
            }, { default: () => h(MeterGroupIndicator) })),
          }),
        }),
        h('button', {
          id: 'update-range-projections',
          type: 'button',
          onClick: () => { updated.value = true; },
        }, 'Update range projections'),
      ]),
    }),
  };
}
