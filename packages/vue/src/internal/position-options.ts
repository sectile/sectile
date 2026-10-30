import type { ExtractPropTypes, PropType, WatchSource } from 'vue';
import type { PositionOptions, PositionSide, PositionAlign, PositionPadding, PositionBoundary, PositionStrategy, PositionTracking } from '@sectile/dom/position';

// Framework declarations and transport only. DOM resolves collision policies.
// Choices and pickers import this owner without importing the popup factory.
export const positionProps = {
  position: { type: Boolean, default: true },
  side: { type: String as PropType<PositionSide>, default: 'bottom' },
  align: { type: String as PropType<PositionAlign>, default: 'center' },
  sideOffset: { type: Number, default: 8 },
  collisionPadding: { type: [Number, Object] as PropType<PositionPadding>, default: 8 },
  collisionBoundary: { type: [String, Object] as PropType<PositionBoundary>, default: undefined },
  avoidCollisions: { type: Boolean, default: true },
  flip: { type: Boolean, default: undefined },
  shift: { type: Boolean, default: undefined },
  hideWhenDetached: { type: Boolean, default: false },
  strategy: { type: String as PropType<PositionStrategy>, default: 'absolute' },
  tracking: { type: String as PropType<PositionTracking>, default: 'events' },
} as const;

export type ResolvedPositionProps = Readonly<ExtractPropTypes<typeof positionProps>>;

type PositionInput = { readonly [K in keyof Omit<PositionOptions, 'arrowPadding'>]?: PositionOptions[K] | undefined }
  & { readonly position?: boolean | undefined };
const positionKeys = Object.keys(positionProps) as Array<keyof typeof positionProps>;

/** Capture one connection/reconfiguration input; preserve omitted overrides. */
export function readPositionOptions(props: PositionInput): PositionOptions & { readonly position?: boolean } {
  const options: Record<string, unknown> = {};
  for (const key of positionKeys) {
    const value = props[key];
    if (value !== undefined) options[key] = value;
  }
  return options;
}

/** Allocate narrow getters once per component setup, never a deep watcher. */
export function positionSources(props: PositionInput): WatchSource[] {
  return positionKeys.map(key => () => props[key]);
}
