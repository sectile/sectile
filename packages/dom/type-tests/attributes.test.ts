import { connectDataAttributes, type DataAttributesConnection } from '@sectile/dom/attributes';
import { getAnchorAttributes, guardAnchorActivation, type AnchorOptions } from '@sectile/dom/attributes';
const anchor = getAnchorAttributes({ href: '/docs', current: 'page', target: '_blank', download: true });
const destination: string | undefined = anchor.href; void destination;
guardAnchorActivation(new MouseEvent('click'), true);
// @ts-expect-error Native current markers are a closed semantic domain.
const invalidCurrent: AnchorOptions = { current: 'selected' }; void invalidCurrent;
// @ts-expect-error Download names are strings or the native boolean choice.
getAnchorAttributes({ href: '/file', download: 1 });

const result = connectDataAttributes({ element: document.createElement('div'), names: ['data-mode', 'data-density'] });
if (result.ok) {
  const connection: DataAttributesConnection<'data-mode' | 'data-density'> = result.value;
  connection.apply({ 'data-mode': 'dark' });
  connection.apply({});
  // @ts-expect-error Only the captured names are available.
  connection.apply({ 'data-other': 'value' });
  // @ts-expect-error Attribute values are strings.
  connection.apply({ 'data-mode': 1 });
  connection.disconnect();
}
// @ts-expect-error Data metadata excludes event handler attributes.
connectDataAttributes({ element: document.createElement('div'), names: ['onclick'] });
