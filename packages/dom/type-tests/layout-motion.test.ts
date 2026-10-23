import { connectLayoutMotion, type LayoutMotionConnection } from '@sectile/dom/layout-motion';
const element = document.createElement('ol');
const result = connectLayoutMotion({ element, itemClass: 'notice', durationProperty: '--duration', easingProperty: '--easing', enabledProperty: '--spatial' });
if (result.ok) {
  const connection: LayoutMotionConnection = result.value;
  connection.refresh(); connection.disconnect();
}
// @ts-expect-error Timing policy is a CSS custom property, not an independent JavaScript duration.
connectLayoutMotion({ element, itemClass: 'notice', durationProperty: 200, easingProperty: '--easing', enabledProperty: '--spatial' });
// @ts-expect-error Spatial policy must be explicitly supplied.
connectLayoutMotion({ element, itemClass: 'notice', durationProperty: '--duration', easingProperty: '--easing' });
