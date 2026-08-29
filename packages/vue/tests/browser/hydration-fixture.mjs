import { Teleport, defineComponent, h, nextTick, onMounted, ref, shallowRef } from 'vue';
import { CalendarRoot } from '../../.verification-dist/calendar.js';
import { DialogContent, DialogRoot, DialogTrigger } from '../../.verification-dist/dialog.js';
import { DisclosureContent, DisclosureRoot, DisclosureTrigger } from '../../.verification-dist/disclosure.js';
import { HostProvider } from '../../.verification-dist/host-provider.js';
import { MeterRoot } from '../../.verification-dist/meter.js';
import {
  MeterGroupIndicator,
  MeterGroupRoot,
  MeterGroupSegment,
  MeterGroupTrack,
} from '../../.verification-dist/meter-group.js';
import { PinInputInput, PinInputRoot } from '../../.verification-dist/pin-input.js';
import { ProgressRoot } from '../../.verification-dist/progress.js';
import {
  FormField,
  FormLabel,
  FormMessage,
  FormReset,
  FormRoot,
  FormSubmit,
  defineFormSubmission,
  useNativeInputFormControl,
} from '../../.verification-dist/form.js';
import { TextField } from '../../.verification-dist/text.js';

export const referenceDate = Object.freeze({ year: 2026, month: 8, day: 26 });

const ExternalFormControl = defineComponent({
  name: 'BrowserExternalFormControl',
  setup() {
    const mounted = ref(false);
    const element = shallowRef(null);
    const participation = useNativeInputFormControl(element);
    onMounted(() => {
      mounted.value = true;
      void nextTick(() => {
        if (element.value === null) return;
        element.value.defaultValue = 'external-default';
        element.value.value = 'external-default';
      });
    });
    return () => mounted.value
      ? h(Teleport, { to: '#external-form-control' }, h('input', {
          ...participation.controlProps.value,
          id: 'browser-external-input',
          ref: element,
          form: 'browser-form',
        }))
      : null;
  },
});

export function createHydrationFixture() {
  const updated = ref(false);
  const submitted = ref('');
  const submission = defineFormSubmission({
    onSubmit: ({ formData }) => {
      submitted.value = JSON.stringify(Object.fromEntries(formData));
    },
  });
  return {
    render: () => h(HostProvider, null, {
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
        h(TextField, {
          id: 'browser-email-input',
          type: 'email',
          autocomplete: 'username',
          defaultValue: 'saved@example.com',
        }),
        h(FormRoot, { id: 'browser-form', ...submission }, {
          default: () => [
            h(FormField, { id: 'browser-native', name: 'native', required: true }, {
              default: () => [
                h(FormLabel, null, { default: () => 'Native value' }),
                h('input', {
                  id: 'browser-native-input',
                  onVnodeMounted: ({ el }) => {
                    el.defaultValue = 'native-default';
                    el.value = 'native-default';
                  },
                }),
                h(FormMessage),
              ],
            }),
            h(FormField, { id: 'browser-sectile', name: ['sectile'], required: true }, {
              default: () => [
                h(FormLabel, null, { default: () => 'Sectile value' }),
                h(TextField, { id: 'browser-sectile-input', defaultValue: 'sectile-default' }),
                h(FormMessage),
              ],
            }),
            h(FormField, { id: 'browser-external', name: 'external', required: true }, {
              default: () => [
                h(FormLabel, null, { default: () => 'External value' }),
                h(ExternalFormControl),
                h(FormMessage),
              ],
            }),
            h(FormReset, { id: 'browser-form-reset' }, { default: () => 'Reset form' }),
            h(FormSubmit, { id: 'browser-form-submit' }, { default: () => 'Submit form' }),
            h('output', { id: 'browser-form-submission' }, submitted.value),
          ],
        }),
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
