import { computed, defineComponent, h, mergeProps, type PropType, type SlotsType, type VNodeChild } from 'vue';
import { MenuItem, MenuSubContent, NavigationMenuRoot } from './menu.js';
import { Primitive, type PrimitiveAs } from './primitive.js';

export { NavigationMenuRoot };
export { MenuItem as NavigationMenuLink, MenuItem as NavigationMenuTrigger, MenuSubContent as NavigationMenuContent };
export type {
  MenuItemProps as NavigationMenuItemProps,
  MenuItemSlotProps as NavigationMenuItemSlotProps,
  MenuRootProps as NavigationMenuRootProps,
  MenuRootSlotProps as NavigationMenuRootSlotProps,
  MenuSubContentProps as NavigationMenuContentProps,
} from './menu.js';

const partProps = {
  as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
  asChild: { type: Boolean, default: false },
};

export const NavigationMenuList = defineComponent({
  name: 'SectileNavigationMenuList', inheritAttrs: false,
  props: { ...partProps, as: { ...partProps.as, default: 'ul' } },
  slots: Object as SlotsType<{ default: () => VNodeChild }>,
  setup(props, { attrs, slots }) { return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, 'data-scope': 'navigation-menu', 'data-part': 'list' }), { default: slots['default'] }); },
});

export const NavigationMenuItem = defineComponent({
  name: 'SectileNavigationMenuItem', inheritAttrs: false,
  props: { ...partProps, as: { ...partProps.as, default: 'li' } },
  slots: Object as SlotsType<{ default: () => VNodeChild }>,
  setup(props, { attrs, slots }) { return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, 'data-scope': 'navigation-menu', 'data-part': 'item-container' }), { default: slots['default'] }); },
});

export const NavigationMenuViewport = defineComponent({
  name: 'SectileNavigationMenuViewport', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: () => VNodeChild }>,
  setup(props, { attrs, slots }) { return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, 'data-scope': 'navigation-menu', 'data-part': 'viewport' }), { default: slots['default'] }); },
});

export const NavigationMenuIndicator = defineComponent({
  name: 'SectileNavigationMenuIndicator', inheritAttrs: false,
  props: { open: { type: Boolean, default: false }, ...partProps },
  slots: Object as SlotsType<{ default: (props: { open: boolean }) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const state = computed(() => props.open);
    return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, hidden: !state.value, 'aria-hidden': 'true', 'data-scope': 'navigation-menu', 'data-part': 'indicator', 'data-state': state.value ? 'visible' : 'hidden' }), { default: () => slots['default']?.({ open: state.value }) });
  },
});
