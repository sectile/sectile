import {
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  provide,
  type ComputedRef,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import { createMeterGroupState, type MeterGroupState } from '@sectile/core/meter-group';
import {
  getMeterGroupRootAttributes,
  getMeterGroupSegmentAttributes,
  getMeterGroupTrackAttributes,
} from '@sectile/dom/meter-group';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { normalizeDecimalInput } from './internal/decimal-input.js';

export interface MeterGroupEntry {
  readonly id: string;
  readonly value: number | string;
  readonly label: string;
}
export type MeterGroupValueFormatter = (value: string, entry: MeterGroupEntry) => string;
export type MeterGroupTotalFormatter = (total: string, max: string) => string;
export interface MeterGroupRootProps {
  readonly items: readonly MeterGroupEntry[];
  readonly max?: number | string;
  readonly low?: number | string;
  readonly high?: number | string;
  readonly optimum?: number | string;
  readonly label?: string;
  readonly formatValue?: MeterGroupValueFormatter;
  readonly formatTotal?: MeterGroupTotalFormatter;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface MeterGroupSegmentSlotProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly valueText: string;
  readonly start: string;
  readonly end: string;
  readonly percentage: number;
  readonly startPercentage: number;
  readonly endPercentage: number;
}
export interface MeterGroupRootSlotProps {
  readonly segments: readonly MeterGroupSegmentSlotProps[];
  readonly max: string;
  readonly total: string;
  readonly remaining: string;
  readonly percentage: number;
  readonly zone: 'optimum' | 'suboptimal' | 'even-less-good';
  readonly valueText: string;
}
export interface MeterGroupSegmentProps { readonly id: string; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface MeterGroupItemProps { readonly id: string; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export type MeterGroupItemSlotProps = MeterGroupSegmentSlotProps;
export interface MeterGroupPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }

interface MeterGroupProjection {
  readonly state: MeterGroupState<string>;
  readonly entries: ReadonlyMap<string, MeterGroupEntry>;
  readonly slot: MeterGroupRootSlotProps;
}
interface MeterGroupContext { readonly projection: ComputedRef<MeterGroupProjection> }
interface MeterGroupEntryContext { readonly segment: ComputedRef<MeterGroupSegmentSlotProps> }

const meterGroupKey = Symbol('SectileMeterGroupRoot');
const meterGroupEntryKey = Symbol('SectileMeterGroupEntry');
const partProps = {
  as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
  asChild: { type: Boolean, default: false },
};
const keyedPartProps = {
  id: { type: String, required: true as const },
  ...partProps,
};

export const MeterGroupRoot = defineComponent({
  name: 'SectileMeterGroupRoot',
  inheritAttrs: false,
  props: {
    items: { type: Array as PropType<readonly MeterGroupEntry[]>, required: true },
    max: { type: [Number, String], default: 100 },
    low: { type: [Number, String], default: undefined },
    high: { type: [Number, String], default: undefined },
    optimum: { type: [Number, String], default: undefined },
    label: { type: String, default: undefined },
    formatValue: { type: Function as PropType<MeterGroupValueFormatter>, default: undefined },
    formatTotal: { type: Function as PropType<MeterGroupTotalFormatter>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: (props: MeterGroupRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const projection = computed<MeterGroupProjection>(() => {
      const entries = new Map(props.items.map((entry) => [entry.id, entry]));
      const state = createMeterGroupState({
        items: props.items.map((entry) => ({ id: entry.id, value: normalizeDecimalInput(entry.value) })),
        max: normalizeDecimalInput(props.max),
        ...(props.low === undefined ? {} : { low: normalizeDecimalInput(props.low) }),
        ...(props.high === undefined ? {} : { high: normalizeDecimalInput(props.high) }),
        ...(props.optimum === undefined ? {} : { optimum: normalizeDecimalInput(props.optimum) }),
      });
      const segments = Object.freeze(state.segments.map((segment) => {
        const entry = entries.get(segment.id);
        if (entry === undefined) throw new Error('Internal invariant breach: MeterGroup entry lookup failed.');
        return projectSegment(state, entry, props.formatValue);
      }));
      const rootAttributes = getMeterGroupRootAttributes(state);
      return Object.freeze({
        state,
        entries,
        slot: Object.freeze({
          segments,
          max: state.max,
          total: state.total,
          remaining: state.remaining,
          percentage: Number(rootAttributes['data-percentage']),
          zone: state.zone,
          valueText: props.formatTotal?.(state.total, state.max) ?? `${state.total} / ${state.max}`,
        }),
      });
    });
    provide<MeterGroupContext>(meterGroupKey, { projection });
    return (): VNodeChild => {
      const current = projection.value;
      const projected = getMeterGroupRootAttributes(current.state, {
        ...(props.label === undefined ? {} : { label: props.label }),
        ...(typeof attrs['aria-labelledby'] === 'string' ? { labelledBy: attrs['aria-labelledby'] } : {}),
        ...(typeof attrs['aria-describedby'] === 'string' ? { describedBy: attrs['aria-describedby'] } : {}),
      });
      return h(Primitive, mergeProps(attrs, projected, {
        as: props.as,
        asChild: props.asChild,
      }), { default: () => slots['default']?.(current.slot) });
    };
  },
});

export const MeterGroupTrack = defineComponent({
  name: 'SectileMeterGroupTrack',
  inheritAttrs: false,
  props: partProps,
  setup(props, { attrs, slots }) {
    const root = useMeterGroup('MeterGroupTrack');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, getMeterGroupTrackAttributes(root.projection.value.state), {
      as: props.as,
      asChild: props.asChild,
    }), slots);
  },
});

export const MeterGroupSegment = defineComponent({
  name: 'SectileMeterGroupSegment',
  inheritAttrs: false,
  props: keyedPartProps,
  slots: Object as SlotsType<{ default: (props: MeterGroupSegmentSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useMeterGroup('MeterGroupSegment');
    const segment = computed(() => segmentByID(root, props.id ?? '', 'MeterGroupSegment'));
    provide<MeterGroupEntryContext>(meterGroupEntryKey, { segment });
    return (): VNodeChild => {
      const current = segment.value;
      const projected = getMeterGroupSegmentAttributes(root.projection.value.state, current.id, {
        label: current.label,
        formatValue: () => current.valueText,
      });
      if (!projected.ok) throw new TypeError(`MeterGroupSegment id ${current.id} is unavailable.`);
      return h(Primitive, mergeProps(attrs, projected.value, {
        as: props.as,
        asChild: props.asChild,
      }), { default: () => slots['default']?.(current) });
    };
  },
});

export const MeterGroupIndicator = entryPart('SectileMeterGroupIndicator', 'indicator', 'div', (segment) => ({
  'aria-hidden': 'true',
  'data-percentage': segment.percentage,
  'data-start-percentage': segment.startPercentage,
  'data-end-percentage': segment.endPercentage,
  style: [
    `--sectile-meter-group-percentage: ${segment.percentage}%`,
    `--sectile-meter-group-start-percentage: ${segment.startPercentage}%`,
    `--sectile-meter-group-end-percentage: ${segment.endPercentage}%`,
  ].join('; '),
}));

export const MeterGroupValueText = defineComponent({
  name: 'SectileMeterGroupValueText',
  inheritAttrs: false,
  props: {
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' },
    asChild: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    const root = useMeterGroup('MeterGroupValueText');
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      'data-scope': 'meter-group',
      'data-part': 'value-text',
    }), { default: () => slots['default']?.(root.projection.value.slot) ?? root.projection.value.slot.valueText });
  },
});

export const MeterGroupList = meterGroupPart('SectileMeterGroupList', 'list', 'ul', { 'aria-hidden': 'true' });

export const MeterGroupItem = defineComponent({
  name: 'SectileMeterGroupItem',
  inheritAttrs: false,
  props: {
    id: { type: String, required: true },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'li' },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: (props: MeterGroupItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useMeterGroup('MeterGroupItem');
    const segment = computed(() => segmentByID(root, props.id, 'MeterGroupItem'));
    provide<MeterGroupEntryContext>(meterGroupEntryKey, { segment });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as,
      asChild: props.asChild,
      'data-scope': 'meter-group',
      'data-part': 'item',
      'data-id': segment.value.id,
      'aria-hidden': 'true',
    }), { default: () => slots['default']?.(segment.value) });
  },
});

export const MeterGroupItemIndicator = entryPart('SectileMeterGroupItemIndicator', 'item-indicator', 'span', (segment) => ({
  'aria-hidden': 'true',
  'data-percentage': segment.percentage,
}));
export const MeterGroupItemLabel = entryTextPart('SectileMeterGroupItemLabel', 'item-label', (segment) => segment.label);
export const MeterGroupItemValue = entryTextPart('SectileMeterGroupItemValue', 'item-value', (segment) => segment.valueText);

function projectSegment(
  state: MeterGroupState<string>,
  entry: MeterGroupEntry,
  formatValue: MeterGroupValueFormatter | undefined,
): MeterGroupSegmentSlotProps {
  const attributes = getMeterGroupSegmentAttributes(state, entry.id, {
    label: entry.label,
    ...(formatValue === undefined ? {} : { formatValue: (value) => formatValue(value, entry) }),
  });
  if (!attributes.ok) throw new Error('Internal invariant breach: MeterGroup segment projection failed.');
  const segment = state.segments.find((candidate) => candidate.id === entry.id);
  if (segment === undefined) throw new Error('Internal invariant breach: MeterGroup segment lookup failed.');
  return Object.freeze({
    id: entry.id,
    label: entry.label,
    value: segment.value,
    valueText: String(attributes.value['aria-valuetext']),
    start: segment.start,
    end: segment.end,
    percentage: Number(attributes.value['data-percentage']),
    startPercentage: Number(attributes.value['data-start-percentage']),
    endPercentage: Number(attributes.value['data-end-percentage']),
  });
}

function segmentByID(root: MeterGroupContext, id: string, part: string): MeterGroupSegmentSlotProps {
  const segment = root.projection.value.slot.segments.find((candidate) => candidate.id === id);
  if (segment === undefined) throw new TypeError(`${part} id ${id} is unavailable.`);
  return segment;
}

function meterGroupPart(
  name: string,
  part: string,
  defaultAs: PrimitiveAs = 'div',
  extra: Readonly<Record<string, string>> = {},
) {
  return defineComponent({
    name,
    inheritAttrs: false,
    props: {
      as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: defaultAs },
      asChild: { type: Boolean, default: false },
    },
    setup(props, { attrs, slots }) {
      useMeterGroup(name);
      return (): VNodeChild => h(Primitive, mergeProps(attrs, extra, {
        as: props.as,
        asChild: props.asChild,
        'data-scope': 'meter-group',
        'data-part': part,
      }), slots);
    },
  });
}

function entryPart(
  name: string,
  part: string,
  defaultAs: PrimitiveAs,
  project: (segment: MeterGroupSegmentSlotProps) => Readonly<Record<string, string | number>>,
) {
  return defineComponent({
    name,
    inheritAttrs: false,
    props: {
      as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: defaultAs },
      asChild: { type: Boolean, default: false },
    },
    setup(props, { attrs, slots }) {
      const entry = useMeterGroupEntry(name);
      return (): VNodeChild => h(Primitive, mergeProps(attrs, project(entry.segment.value), {
        as: props.as,
        asChild: props.asChild,
        'data-scope': 'meter-group',
        'data-part': part,
        'data-id': entry.segment.value.id,
      }), slots);
    },
  });
}

function entryTextPart(
  name: string,
  part: string,
  text: (segment: MeterGroupSegmentSlotProps) => string,
) {
  return defineComponent({
    name,
    inheritAttrs: false,
    props: {
      as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' },
      asChild: { type: Boolean, default: false },
    },
    setup(props, { attrs, slots }) {
      const entry = useMeterGroupEntry(name);
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        'data-scope': 'meter-group',
        'data-part': part,
        'data-id': entry.segment.value.id,
      }), { default: () => slots['default']?.(entry.segment.value) ?? text(entry.segment.value) });
    },
  });
}

function useMeterGroup(part: string): MeterGroupContext {
  const root = inject<MeterGroupContext>(meterGroupKey);
  if (root === undefined) throw new TypeError(`${part} must be used inside MeterGroupRoot.`);
  return root;
}

function useMeterGroupEntry(part: string): MeterGroupEntryContext {
  const entry = inject<MeterGroupEntryContext>(meterGroupEntryKey);
  if (entry === undefined) throw new TypeError(`${part} must be used inside MeterGroupSegment or MeterGroupItem.`);
  return entry;
}
