import { createMeterState } from '@sectile/core/meter';
import { createProgressState } from '@sectile/core/progress';
import { createMeterGroupState } from '@sectile/core/meter-group';
import * as Meter from '@sectile/dom/meter';
import * as Progress from '@sectile/dom/progress';
import * as Group from '@sectile/dom/meter-group';
import { getTimerRootAttributes, tryResolveTimerInterval, tryCreateTimer, type TimerAttributeRecord, type TimerRootAttributesOptions, type TimerConnection, type TimerErrorCode, type TimerOptions } from '@sectile/dom/timer';
import type { TimerErrorCode as RootTimerErrorCode } from '@sectile/dom';
declare const timerOptions: TimerOptions;
const timerAttributesOptions: TimerRootAttributesOptions = { label: 'Delivery time' };
const timerAttributes: TimerAttributeRecord = getTimerRootAttributes({ valueMs: 0, running: false, completed: false }, {}, timerAttributesOptions);
declare const timerConnection: TimerConnection, timerItem: HTMLElement, timerAction: HTMLButtonElement;
const unregisterTime: () => void = timerConnection.registerItem(timerItem, 'seconds');
const unregisterAction: () => void = timerConnection.registerAction(timerAction, 'pause');
const delay = tryResolveTimerInterval(100);
if (!delay.ok) { const code: TimerErrorCode = delay.error.code; void code; }
void [timerAttributes, unregisterTime, unregisterAction];
const timerResult = tryCreateTimer(timerOptions);
if (!timerResult.ok) {
  const timerError: TimerErrorCode = timerResult.error.code;
  const rootTimerError: RootTimerErrorCode = timerError;
  if (timerError === 'dom.timer-interval-invalid') { const hostError: 'dom.timer-interval-invalid' = timerError; void hostError; }
  void rootTimerError;
}
// @ts-expect-error Timer scheduling errors remain a closed host/Core error domain.
const unknownTimerError: TimerErrorCode = 'foreign'; void unknownTimerError;

const meterOptions: Meter.MeterRootAttributesOptions = { label: 'Quota' };
const meterIndicator: Meter.MeterIndicatorAttributesOptions = {};
const meterAttributes: Meter.MeterAttributeRecord = Meter.getMeterRootAttributes(createMeterState({ value: '25' }), meterOptions);
const meterFormatter: Meter.MeterValueFormatter = (value) => value;
const meterValues: Meter.MeterControlledValues = { value: '25' };
declare const meterConnection: Meter.MeterConnection;
declare const meterFactoryOptions: Meter.MeterOptions;

const progressOptions: Progress.ProgressRootAttributesOptions = { label: 'Upload' };
const progressIndicator: Progress.ProgressIndicatorAttributesOptions = {};
const progressAttributes: Progress.ProgressAttributeRecord = Progress.getProgressRootAttributes(createProgressState({ value: null, max: '100' }), progressOptions);
const progressFormatter: Progress.ProgressValueFormatter = (value) => value;
const progressValues: Progress.ProgressControlledValues = { value: null, max: '100' };
declare const progressConnection: Progress.ProgressConnection;
declare const progressFactoryOptions: Progress.ProgressOptions;

const groupOptions: Group.MeterGroupRootAttributesOptions = { label: 'Capacity' };
const groupSegment: Group.MeterGroupSegmentAttributesOptions = { label: 'Used' };
const groupAttributes: Group.MeterGroupAttributeRecord = Group.getMeterGroupRootAttributes(createMeterGroupState({ max: '100', items: [{ id: 'used', value: '25' }] }), groupOptions);
const groupFormatter: Group.MeterGroupValueFormatter = (value, id) => `${id}: ${value}`;
const indexedGroup = Group.getMeterGroupAttributes(createMeterGroupState({ max: '100', items: [{ id: 'used', value: '25' }, { id: 'free', value: '50' }] as const }), { label: 'Capacity' });
const typedGroup: Group.MeterGroupAttributes<'used' | 'free'> = indexedGroup;
indexedGroup.segment('used', { formatValue: (value, id) => { const known: 'used' | 'free' = id; return known + value; } });
// @ts-expect-error An immutable view cannot replace its accessor.
typedGroup.segment = () => ({ ok: false, error: { class: 'construction', code: 'invalid', message: 'invalid' } });
// @ts-expect-error The accessor retains the canonical state ID domain.
indexedGroup.segment('missing');
const groupValues: Group.MeterGroupControlledValues = { max: '100', items: [{ id: 'used', value: '25' }] };
declare const groupConnection: Group.MeterGroupConnection;
declare const groupFactoryOptions: Group.MeterGroupOptions;

void [Meter.createMeter, Meter.tryCreateMeter, Meter.getMeterIndicatorAttributes, Meter.getMeterNativeAttributes,
  meterIndicator, meterAttributes, meterFormatter, meterValues, meterConnection, meterFactoryOptions,
  Progress.createProgress, Progress.tryCreateProgress, Progress.getProgressIndicatorAttributes, Progress.getProgressNativeAttributes,
  progressIndicator, progressAttributes, progressFormatter, progressValues, progressConnection, progressFactoryOptions,
  Group.createMeterGroup, Group.tryCreateMeterGroup, Group.getMeterGroupSegmentAttributes, Group.getMeterGroupTrackAttributes,
  groupSegment, groupAttributes, groupFormatter, groupValues, groupConnection, groupFactoryOptions];

// @ts-expect-error Core state types belong to their Core subpaths.
import type { MeterState } from '@sectile/dom/meter';
// @ts-expect-error Core state types belong to their Core subpaths.
import type { ProgressState } from '@sectile/dom/progress';
// @ts-expect-error Core state types belong to their Core subpaths.
import type { MeterGroupState } from '@sectile/dom/meter-group';
type CoreStateLeaks = [MeterState, ProgressState, MeterGroupState];
