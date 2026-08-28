import {
  defineComponent,
  h,
  type AllowedComponentProps,
  type Component,
  type ComponentCustomProps,
  type VNodeChild,
  type VNodeProps,
} from 'vue';
import type { VueProfileController } from './tabular-profile.js';

export type TabularPublicProps<Props> = Props & VNodeProps & AllowedComponentProps & ComponentCustomProps;

export interface TabularComponent<Props, SlotProps> {
  new (props: TabularPublicProps<Props>): {
    $props: TabularPublicProps<Props>;
    $slots: { readonly default?: (props: SlotProps) => VNodeChild };
  };
}

export interface TabularBodyComponent<Props extends { readonly manual?: boolean }, RootSlotProps, BodySlotProps> {
  new <Manual extends boolean = false>(props: Omit<TabularPublicProps<Props>, 'manual'> & { readonly manual?: Manual }): {
    $props: Omit<TabularPublicProps<Props>, 'manual'> & { readonly manual?: Manual };
    $slots: {
      readonly default?: (props: Manual extends true ? RootSlotProps : BodySlotProps) => VNodeChild;
      readonly empty?: (props: RootSlotProps) => VNodeChild;
    };
  };
}

export function createTabularComponentSuite<State, Event, Command>(
  parts: Readonly<Record<string, Component>>,
  controller: VueProfileController<State, Event, Command>,
  cache: WeakMap<object, Readonly<Record<string, Component>>>,
  name: string,
  componentMap: Readonly<Record<string, string>>,
): Readonly<Record<string, Component>> {
  const cached = cache.get(controller);
  if (cached !== undefined) return cached;
  const runtimeProvider = parts['Provider'];
  if (runtimeProvider === undefined) throw new TypeError(`${name} runtime Provider is unavailable.`);
  const Provider = defineComponent({
    name: `Sectile${name}Provider`,
    setup(_props, { slots }) {
      return (): VNodeChild => h(runtimeProvider, { controller }, slots);
    },
  });
  const selected: Record<string, Component> = { Provider };
  for (const [publicName, runtimeName] of Object.entries(componentMap)) {
    const component = parts[runtimeName];
    if (component === undefined) throw new TypeError(`${name} runtime ${runtimeName} is unavailable.`);
    selected[publicName] = component;
  }
  const suite = Object.freeze(selected);
  cache.set(controller, suite);
  return suite;
}
