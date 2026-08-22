import { createColorPicker, type ColorChannel, type ColorPickerConnection, type ColorFormat, type ColorValue } from '@sectile/dom/color-picker';
import type { DemoContext, DemoDefinition, DemoSession } from '../playground.js';

export const colorPickerDemo: DemoDefinition = {
  id: 'color-picker', label: 'Color Picker', title: 'Color Picker', description: 'Exact RGBA state with native color and range controls, editable color text, format projection, and controlled ownership.',
  shortcuts: [{ keys: ['Enter'], label: 'commit text' }, { keys: ['Escape'], label: 'restore color' }],
  cases: [
    { id: 'native', title: 'Native accent color', mount: (context) => mountColorPicker(context, { value: '#5b6df6', alpha: false }) },
    { id: 'alpha', title: 'RGBA channels', mount: (context) => mountColorPicker(context, { value: '#26c6a080', alpha: true }) },
    { id: 'controlled', title: 'Controlled brand color', mount: (context) => mountColorPicker(context, { value: '#f59e0b', alpha: true, controlled: true }) },
  ],
};

function mountColorPicker(context: DemoContext, options: { readonly value: string; readonly alpha: boolean; readonly controlled?: boolean }): DemoSession {
  const root = document.createElement('div'); root.className = 'color-picker-demo';
  const preview = document.createElement('div'); preview.className = 'color-picker-preview';
  const swatch = document.createElement('span'); swatch.className = 'color-picker-swatch';
  const valueText = document.createElement('strong'); preview.append(swatch, valueText);
  const control = document.createElement('div'); control.className = 'color-picker-control';
  const native = document.createElement('input'); native.className = 'color-picker-native';
  const text = document.createElement('input'); text.className = 'color-picker-text'; text.setAttribute('aria-label', 'Color value');
  control.append(native, text);
  const channels = document.createElement('div'); channels.className = 'color-picker-channels';
  const channelNames: readonly ColorChannel[] = options.alpha ? ['red', 'green', 'blue', 'alpha'] : ['red', 'green', 'blue'];
  const channelInputs = channelNames.map((channel) => { const label = document.createElement('label'); label.textContent = channel[0]?.toUpperCase() ?? ''; const input = document.createElement('input'); label.append(input); channels.append(label); return [channel, input] as const; });
  const formats = document.createElement('div'); formats.className = 'color-picker-formats'; const hex = button('HEX'); const rgb = button('RGB'); formats.append(hex, rgb);
  root.append(preview, control, channels, formats); context.surface.append(root);
  let connection!: ColorPickerConnection;
  const connectOptions = { root, allowAlpha: options.alpha, ...(options.controlled ? { value: options.value } : { defaultValue: options.value }), onValueChange: (value: ColorValue) => { if (options.controlled) connection.syncControlledValues({ value }); }, onUpdate: render };
  connection = createColorPicker(connectOptions); connection.setNativeInputAttributes(native); connection.setTextInputAttributes(text); connection.setSwatchAttributes(swatch); for (const [channel, input] of channelInputs) connection.setChannelInputAttributes(input, channel);
  const setFormat = (format: ColorFormat): void => { connection.handleEvent({ type: 'set-format', format }); render(); }; hex.addEventListener('click', () => setFormat('hex')); rgb.addEventListener('click', () => setFormat('rgb'));
  function render(): void { const snapshot = connection.getSnapshot(); const css = connection.getCSSColor(); swatch.style.backgroundColor = css; valueText.textContent = connection.getText(); hex.setAttribute('aria-pressed', String(snapshot.state.format === 'hex')); rgb.setAttribute('aria-pressed', String(snapshot.state.format === 'rgb')); context.showState(snapshot.revision, { value: snapshot.state.value, text: connection.getText(), format: snapshot.state.format, channel: snapshot.state.channel, ownership: options.controlled ? 'controlled' : 'uncontrolled' }); }
  render(); return { focus: () => native.focus(), disconnect: () => connection.disconnect() };
}
function button(label: string): HTMLButtonElement { const element = document.createElement('button'); element.type = 'button'; element.className = 'secondary'; element.textContent = label; return element; }
