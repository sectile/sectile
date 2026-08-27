import { createProgressState, tryCreateProgressState, type ProgressInput, type ProgressState, type ProgressStatus } from '@sectile/core/progress';
import {
  createProgress as createDOMProgress,
  getProgressIndicatorAttributes,
  getProgressNativeAttributes,
  getProgressRootAttributes,
  tryCreateProgress as tryCreateDOMProgress,
  type ProgressAttributeRecord,
  type ProgressConnection as DOMProgressConnection,
  type ProgressControlledValues as DOMProgressControlledValues,
  type ProgressIndicatorAttributesOptions,
  type ProgressOptions as DOMProgressOptions,
  type ProgressRootAttributesOptions,
  type ProgressValueFormatter as DOMProgressValueFormatter,
} from '@sectile/dom/progress';
import {
  createProgress as createTerminalProgress,
  tryCreateProgress as tryCreateTerminalProgress,
  type ProgressConnection as TerminalProgressConnection,
  type ProgressControlledValues as TerminalProgressControlledValues,
  type ProgressOptions as TerminalProgressOptions,
  type ProgressRenderPlan,
} from '@sectile/terminal/progress';
import {
  ProgressIndicator,
  ProgressRoot,
  ProgressTrack,
  ProgressValueText,
  type ProgressPartProps,
  type ProgressRootProps,
  type ProgressRootSlotProps,
  type ProgressValueFormatter as VueProgressValueFormatter,
} from '@sectile/vue/progress';

const input: ProgressInput = { value: null, max: '100' };
const state: ProgressState = createProgressState(input);
const status: ProgressStatus = state.status;
const rootOptions: ProgressRootAttributesOptions = { label: 'Upload' };
const indicatorOptions: ProgressIndicatorAttributesOptions = {};
const attributes: ProgressAttributeRecord = getProgressRootAttributes(state, rootOptions);
const domFormatter: DOMProgressValueFormatter = (value) => value;
const domValues: DOMProgressControlledValues = input;
declare const domOptions: DOMProgressOptions;
declare const domConnection: DOMProgressConnection;
const terminalValues: TerminalProgressControlledValues = input;
const terminalOptions: TerminalProgressOptions = input;
declare const terminalConnection: TerminalProgressConnection;
declare const plan: ProgressRenderPlan;
const vueProps: ProgressRootProps = { value: null, max: '100' };
const vuePart: ProgressPartProps = {};
const vueFormatter: VueProgressValueFormatter = (value) => value;
declare const vueSlot: ProgressRootSlotProps;

void [
  tryCreateProgressState, createDOMProgress, tryCreateDOMProgress, getProgressIndicatorAttributes,
  getProgressNativeAttributes, domFormatter, domValues, domOptions, domConnection,
  createTerminalProgress, tryCreateTerminalProgress, terminalValues, terminalOptions,
  terminalConnection, plan, ProgressIndicator, ProgressRoot, ProgressTrack, ProgressValueText,
  vueProps, vuePart, vueFormatter, vueSlot, status, attributes, indicatorOptions,
];
