import { createMeterState, tryCreateMeterState, type MeterInput, type MeterState, type MeterZone } from '@sectile/core/meter';
import {
  createMeter as createDOMMeter,
  getMeterIndicatorAttributes,
  getMeterNativeAttributes,
  getMeterRootAttributes,
  tryCreateMeter as tryCreateDOMMeter,
  type MeterAttributeRecord,
  type MeterConnection as DOMMeterConnection,
  type MeterControlledValues as DOMMeterControlledValues,
  type MeterIndicatorAttributesOptions,
  type MeterOptions as DOMMeterOptions,
  type MeterRootAttributesOptions,
  type MeterValueFormatter as DOMMeterValueFormatter,
} from '@sectile/dom/meter';
import {
  createMeter as createTerminalMeter,
  tryCreateMeter as tryCreateTerminalMeter,
  type MeterConnection as TerminalMeterConnection,
  type MeterControlledValues as TerminalMeterControlledValues,
  type MeterOptions as TerminalMeterOptions,
  type MeterRenderPlan,
} from '@sectile/terminal/meter';
import {
  MeterIndicator,
  MeterRoot,
  MeterTrack,
  MeterValueText,
  type MeterPartProps,
  type MeterRootProps,
  type MeterRootSlotProps,
  type MeterValueFormatter as VueMeterValueFormatter,
} from '@sectile/vue/meter';

const input: MeterInput = { value: '25' };
const state: MeterState = createMeterState(input);
const zone: MeterZone = state.zone;
const rootOptions: MeterRootAttributesOptions = { label: 'Quota' };
const indicatorOptions: MeterIndicatorAttributesOptions = {};
const attributes: MeterAttributeRecord = getMeterRootAttributes(state, rootOptions);
const domFormatter: DOMMeterValueFormatter = (value) => value;
const domValues: DOMMeterControlledValues = input;
declare const domOptions: DOMMeterOptions;
declare const domConnection: DOMMeterConnection;
const terminalValues: TerminalMeterControlledValues = input;
const terminalOptions: TerminalMeterOptions = input;
declare const terminalConnection: TerminalMeterConnection;
declare const plan: MeterRenderPlan;
const vueProps: MeterRootProps = { value: '25' };
const vuePart: MeterPartProps = {};
const vueFormatter: VueMeterValueFormatter = (value) => value;
declare const vueSlot: MeterRootSlotProps;

void [
  tryCreateMeterState, createDOMMeter, tryCreateDOMMeter, getMeterIndicatorAttributes,
  getMeterNativeAttributes, domFormatter, domValues, domOptions, domConnection,
  createTerminalMeter, tryCreateTerminalMeter, terminalValues, terminalOptions,
  terminalConnection, plan, MeterIndicator, MeterRoot, MeterTrack, MeterValueText,
  vueProps, vuePart, vueFormatter, vueSlot, zone, attributes, indicatorOptions,
];
