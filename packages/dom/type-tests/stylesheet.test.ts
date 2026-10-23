import { connectStylesheet, type StylesheetConnection, type StylesheetOptions } from '@sectile/dom/stylesheet';

const options: StylesheetOptions = { element: document.createElement('div'), scopeId: 'preview', style: document.createElement('style'), nonce: 'request' };
const result = connectStylesheet(options);
if (result.ok) {
  const connection: StylesheetConnection = result.value;
  connection.apply('.preview{}');
  // @ts-expect-error CSS is supplied as text, not a declaration object.
  connection.apply({ color: 'red' });
  connection.disconnect();
}
// @ts-expect-error An explicit boundary is required.
connectStylesheet({ scopeId: 'preview' });
