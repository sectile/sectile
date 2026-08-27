import {
  createMeterGroupState,
  tryCreateMeterGroupState,
  type MeterGroupInput,
  type MeterGroupItemInput,
  type MeterGroupSegment,
  type MeterGroupState,
} from '@sectile/core/meter-group';
import {
  createMeterGroup as createDOMMeterGroup,
  getMeterGroupRootAttributes,
  getMeterGroupSegmentAttributes,
  getMeterGroupTrackAttributes,
  tryCreateMeterGroup as tryCreateDOMMeterGroup,
  type MeterGroupAttributeRecord,
  type MeterGroupConnection as DOMMeterGroupConnection,
  type MeterGroupControlledValues as DOMMeterGroupControlledValues,
  type MeterGroupOptions as DOMMeterGroupOptions,
  type MeterGroupRootAttributesOptions,
  type MeterGroupSegmentAttributesOptions,
  type MeterGroupValueFormatter as DOMMeterGroupValueFormatter,
} from '@sectile/dom/meter-group';
import {
  createMeterGroup as createTerminalMeterGroup,
  tryCreateMeterGroup as tryCreateTerminalMeterGroup,
  type MeterGroupConnection as TerminalMeterGroupConnection,
  type MeterGroupControlledValues as TerminalMeterGroupControlledValues,
  type MeterGroupOptions as TerminalMeterGroupOptions,
  type MeterGroupRenderPlan,
  type MeterGroupRenderSegment,
} from '@sectile/terminal/meter-group';
import {
  MeterGroupIndicator,
  MeterGroupItem,
  MeterGroupItemIndicator,
  MeterGroupItemLabel,
  MeterGroupItemValue,
  MeterGroupList,
  MeterGroupRoot,
  MeterGroupSegment as VueMeterGroupSegment,
  MeterGroupTrack,
  MeterGroupValueText,
  type MeterGroupEntry,
  type MeterGroupItemProps,
  type MeterGroupItemSlotProps,
  type MeterGroupPartProps,
  type MeterGroupRootProps,
  type MeterGroupRootSlotProps,
  type MeterGroupSegmentProps,
  type MeterGroupSegmentSlotProps,
  type MeterGroupTotalFormatter,
  type MeterGroupValueFormatter as VueMeterGroupValueFormatter,
} from '@sectile/vue/meter-group';

const item: MeterGroupItemInput = { id: 'used', value: '25' };
const input: MeterGroupInput = { max: '100', items: [item] };
const state: MeterGroupState = createMeterGroupState(input);
declare const coreSegment: MeterGroupSegment;
const rootOptions: MeterGroupRootAttributesOptions = { label: 'Capacity' };
const segmentOptions: MeterGroupSegmentAttributesOptions = { label: 'Used' };
const attributes: MeterGroupAttributeRecord = getMeterGroupRootAttributes(state, rootOptions);
const domFormatter: DOMMeterGroupValueFormatter = (value, id) => `${id}: ${value}`;
const domValues: DOMMeterGroupControlledValues = input;
declare const domOptions: DOMMeterGroupOptions;
declare const domConnection: DOMMeterGroupConnection;
const terminalValues: TerminalMeterGroupControlledValues = input;
const terminalOptions: TerminalMeterGroupOptions = input;
declare const terminalConnection: TerminalMeterGroupConnection;
declare const terminalPlan: MeterGroupRenderPlan;
declare const terminalSegment: MeterGroupRenderSegment;
const entry: MeterGroupEntry = { id: 'used', value: 25, label: 'Used' };
const vueProps: MeterGroupRootProps = { items: [entry] };
const vueSegmentProps: MeterGroupSegmentProps = { id: 'used' };
const vueItemProps: MeterGroupItemProps = { id: 'used' };
const vuePart: MeterGroupPartProps = {};
const vueFormatter: VueMeterGroupValueFormatter = (value, current) => `${current.label}: ${value}`;
const totalFormatter: MeterGroupTotalFormatter = (total, max) => `${total} / ${max}`;
declare const rootSlot: MeterGroupRootSlotProps;
declare const segmentSlot: MeterGroupSegmentSlotProps;
declare const itemSlot: MeterGroupItemSlotProps;

void [
  tryCreateMeterGroupState, coreSegment, createDOMMeterGroup, tryCreateDOMMeterGroup,
  getMeterGroupSegmentAttributes, getMeterGroupTrackAttributes, domFormatter, domValues,
  domOptions, domConnection, createTerminalMeterGroup, tryCreateTerminalMeterGroup,
  terminalValues, terminalOptions, terminalConnection, terminalPlan, terminalSegment,
  MeterGroupIndicator, MeterGroupItem, MeterGroupItemIndicator, MeterGroupItemLabel,
  MeterGroupItemValue, MeterGroupList, MeterGroupRoot, VueMeterGroupSegment,
  MeterGroupTrack, MeterGroupValueText, vueProps, vueSegmentProps, vueItemProps,
  vuePart, vueFormatter, totalFormatter, rootSlot, segmentSlot, itemSlot,
  attributes, segmentOptions,
];
