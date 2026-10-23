import * as Meter from '@sectile/vue/meter';
import * as Progress from '@sectile/vue/progress';
import * as Group from '@sectile/vue/meter-group';
import * as Timer from '@sectile/vue/timer';
const timerProps: Timer.TimerRootProps = { label: 'Delivery time', startMs: 90000, targetMs: 0, countdown: true, autoStart: false, intervalMs: 100 };
const forwardedTimerDefaults: Timer.TimerRootProps = { startMs: undefined, autoStart: undefined, intervalMs: undefined }; void forwardedTimerDefaults;
declare const timerSlot: Timer.TimerSlotProps;
const timerProgress: number | null = timerSlot.progress;
const timerValue: number = timerSlot.valueMs;
timerSlot.start(); timerSlot.pause(); timerSlot.resume(); timerSlot.reset(); timerSlot.restart();
// @ts-expect-error Canonical slot data is readonly.
timerSlot.running = false;
void [Timer.TimerRoot, Timer.TimerItem, Timer.TimerActionTrigger, timerProps, timerProgress, timerValue];

const meterProps: Meter.MeterRootProps = { value: '25' };
const meterPart: Meter.MeterPartProps = {};
const meterFormatter: Meter.MeterValueFormatter = (value) => value;
declare const meterSlot: Meter.MeterRootSlotProps;
const progressProps: Progress.ProgressRootProps = { value: null, max: '100' };
const progressPart: Progress.ProgressPartProps = {};
const progressFormatter: Progress.ProgressValueFormatter = (value) => value;
declare const progressSlot: Progress.ProgressRootSlotProps;
const entry: Group.MeterGroupEntry = { id: 'used', value: 25, label: 'Used' };
const groupProps: Group.MeterGroupRootProps = { items: [entry] };
const groupSegment: Group.MeterGroupSegmentProps = { id: 'used' };
const groupItem: Group.MeterGroupItemProps = { id: 'used' };
const groupPart: Group.MeterGroupPartProps = {};
const groupFormatter: Group.MeterGroupValueFormatter = (value, current) => `${current.label}: ${value}`;
const totalFormatter: Group.MeterGroupTotalFormatter = (total, max) => `${total} / ${max}`;
declare const groupRootSlot: Group.MeterGroupRootSlotProps;
declare const groupSegmentSlot: Group.MeterGroupSegmentSlotProps;
declare const groupItemSlot: Group.MeterGroupItemSlotProps;
void [Meter.MeterRoot, Meter.MeterTrack, Meter.MeterIndicator, Meter.MeterValueText,
  meterProps, meterPart, meterFormatter, meterSlot,
  Progress.ProgressRoot, Progress.ProgressTrack, Progress.ProgressIndicator, Progress.ProgressValueText,
  progressProps, progressPart, progressFormatter, progressSlot,
  Group.MeterGroupIndicator, Group.MeterGroupItem, Group.MeterGroupItemIndicator, Group.MeterGroupItemLabel,
  Group.MeterGroupItemValue, Group.MeterGroupList, Group.MeterGroupRoot, Group.MeterGroupSegment,
  Group.MeterGroupTrack, Group.MeterGroupValueText, groupProps, groupSegment, groupItem, groupPart,
  groupFormatter, totalFormatter, groupRootSlot, groupSegmentSlot, groupItemSlot];

// @ts-expect-error DOM connections belong to their DOM subpaths.
import type { MeterConnection } from '@sectile/vue/meter';
// @ts-expect-error DOM connections belong to their DOM subpaths.
import type { ProgressConnection } from '@sectile/vue/progress';
// @ts-expect-error DOM connections belong to their DOM subpaths.
import type { MeterGroupConnection } from '@sectile/vue/meter-group';
type ConnectionLeaks = [MeterConnection, ProgressConnection, MeterGroupConnection];
const unsupportedMeter: Meter.MeterRootProps = {
  value: '25',
  // @ts-expect-error Read-only Meter takes a value, not model ownership.
  modelValue: '30',
};
const unsupportedProgress: Progress.ProgressRootProps = {
  value: '25',
  // @ts-expect-error Progress takes a value, not model ownership.
  modelValue: '30',
};
const unsupportedGroup: Group.MeterGroupRootProps = {
  items: [],
  // @ts-expect-error MeterGroup takes items, not model ownership.
  modelValue: [],
};
const unsupportedPresentation: Group.MeterGroupRootProps = {
  items: [],
  // @ts-expect-error Colors are supplied by consumer styling.
  colors: ['red'],
};
void [unsupportedMeter, unsupportedProgress, unsupportedGroup, unsupportedPresentation];
