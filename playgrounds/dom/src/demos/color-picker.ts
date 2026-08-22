import { createColorPicker, type ColorCoordinateValue, type ColorFormat, type ColorModel, type ColorPickerConnection, type ColorValue } from '@sectile/dom/color-picker';
import type { DemoContext, DemoDefinition, DemoSession } from '../playground.js';

export const colorPickerDemo: DemoDefinition = {
  id: 'color-picker', label: 'Color Picker', title: 'Color Picker', description: 'Exact RGBA state with native color and range controls, editable HEX, RGB, HSL, HSV, CMYK, and OKLCH representations, and controlled ownership.',
  shortcuts: [{ keys: ['Enter'], label: 'commit text' }, { keys: ['Escape'], label: 'restore color' }],
  cases: [
    { id: 'native', title: 'Native accent color', mount: (context) => mountColorPicker(context, { value: '#5b6df6', alpha: false }) },
    { id: 'alpha', title: 'RGBA channels', mount: (context) => mountColorPicker(context, { value: '#26c6a080', alpha: true }) },
    { id: 'controlled', title: 'Controlled brand color', mount: (context) => mountColorPicker(context, { value: '#f59e0b', alpha: true, controlled: true }) },
  ],
};

function mountColorPicker(context: DemoContext, options: { readonly value: string; readonly alpha: boolean; readonly controlled?: boolean }): DemoSession {
  const root = document.createElement('div'); root.className = 'color-picker-demo';
  const description = document.createElement('p'); description.className = 'demo-copy'; description.textContent = 'Pick visually, then refine the same color in any supported coordinate model.';
  const label = document.createElement('strong'); label.className = 'color-picker-label'; label.textContent = 'Accent color';
  const visual = document.createElement('div'); visual.className = 'color-picker-visual';
  const area = document.createElement('div'); area.className = 'color-picker-area';
  const areaThumb = document.createElement('span'); areaThumb.className = 'color-picker-area-thumb'; area.append(areaThumb);
  const sliders = document.createElement('div'); sliders.className = 'color-picker-sliders';
  const hue = sliderRow('Hue', 'color-picker-hue'); const alpha = sliderRow('Alpha', 'color-picker-alpha'); alpha.row.classList.add('color-picker-opacity'); sliders.append(hue.row, ...(options.alpha ? [alpha.row] : []));
  const modelSliderHost = document.createElement('div'); modelSliderHost.className = 'color-picker-model-slider-host';
  visual.append(area, modelSliderHost, sliders);
  const formats = document.createElement('div'); formats.className = 'color-picker-formats';
  const formatButtons = (['hex', 'rgb', 'hsl', 'hsv', 'cmyk', 'oklch'] as const satisfies readonly ColorFormat[]).map((format) => [format, button(format.toUpperCase())] as const);
  formats.append(...formatButtons.map(([, element]) => element));
  const editor = document.createElement('div'); editor.className = 'color-picker-editor';
  const control = document.createElement('div'); control.className = 'color-picker-control';
  const swatch = document.createElement('span'); swatch.className = 'color-picker-swatch';
  const textField = document.createElement('label'); textField.className = 'color-picker-text-field'; const textLabel = document.createElement('span'); textLabel.textContent = 'HEX';
  const text = document.createElement('input'); text.className = 'color-picker-text'; text.setAttribute('aria-label', 'Color value'); textField.append(textLabel, text);
  const nativeControl = document.createElement('label'); nativeControl.className = 'color-picker-native-control'; const nativeLabel = document.createElement('span'); nativeLabel.textContent = 'System';
  const native = document.createElement('input'); native.className = 'color-picker-native';
  nativeControl.append(nativeLabel, native); control.append(swatch, textField, nativeControl);
  const coordinateHost = document.createElement('div'); editor.append(control, coordinateHost);
  const valueText = document.createElement('output'); valueText.className = 'color-picker-value';
  root.append(description, label, visual, formats, editor, valueText); context.surface.append(root);
  let connection!: ColorPickerConnection;
  const connectOptions = { root, allowAlpha: options.alpha, ...(options.controlled ? { value: options.value } : { defaultValue: options.value }), onValueChange: (value: ColorValue) => { if (options.controlled) connection.syncControlledValues({ value }); }, onUpdate: render };
  connection = createColorPicker(connectOptions); connection.setNativeInputAttributes(native); connection.setTextInputAttributes(text); connection.setSwatchAttributes(swatch); connection.setAreaAttributes(area); connection.setAreaThumbAttributes(areaThumb); connection.setHueInputAttributes(hue.input); if (options.alpha) connection.setAlphaInputAttributes(alpha.input);
  const modelEditors = new Map<ColorModel, HTMLElement>();
  const modelSliders = new Map<ColorModel, HTMLElement>();
  const modelSliderOutputs = new Map<ColorModel, Map<ColorCoordinateValue['coordinate'], HTMLOutputElement>>();
  for (const model of ['rgb', 'hsl', 'hsv', 'cmyk', 'oklch'] as const) {
    const group = document.createElement('div'); group.className = 'color-picker-coordinates';
    for (const field of connection.getCoordinates(model).filter((entry) => options.alpha || entry.coordinate !== 'alpha')) group.append(coordinateField(connection, model, field));
    modelEditors.set(model, group); coordinateHost.append(group);
    if (model !== 'hsv') {
      const sliderGroup = document.createElement('div'); sliderGroup.className = 'color-picker-model-sliders';
      const outputs = new Map<ColorCoordinateValue['coordinate'], HTMLOutputElement>();
      for (const field of connection.getCoordinates(model).filter((entry) => entry.coordinate !== 'alpha')) { const slider = coordinateSlider(connection, model, field); sliderGroup.append(slider.row); outputs.set(field.coordinate, slider.output); }
      modelSliderOutputs.set(model, outputs);
      modelSliders.set(model, sliderGroup); modelSliderHost.append(sliderGroup);
    }
  }
  const setFormat = (format: ColorFormat): void => { connection.handleEvent({ type: 'set-format', format }); render(); };
  for (const [format, element] of formatButtons) element.addEventListener('click', () => setFormat(format));
  function render(): void { const snapshot = connection.getSnapshot(); const css = connection.getCSSColor(); const usesArea = snapshot.state.format === 'hex' || snapshot.state.format === 'hsv'; visual.dataset['format'] = snapshot.state.format; area.hidden = !usesArea; hue.row.hidden = !usesArea; swatch.style.backgroundColor = css; valueText.textContent = connection.getText(); textLabel.textContent = snapshot.state.format.toUpperCase(); for (const [format, element] of formatButtons) element.setAttribute('aria-pressed', String(snapshot.state.format === format)); for (const [model, element] of modelEditors) element.hidden = snapshot.state.format !== model; for (const [model, element] of modelSliders) element.hidden = snapshot.state.format !== model; for (const [model, outputs] of modelSliderOutputs) for (const field of connection.getCoordinates(model)) outputs.get(field.coordinate)?.replaceChildren(`${field.value}${field.unit}`); context.showState(snapshot.revision, { value: snapshot.state.value, text: connection.getText(), format: snapshot.state.format, area: connection.getAreaValue(), ownership: options.controlled ? 'controlled' : 'uncontrolled' }); }
  render(); return { focus: () => { const snapshot = connection.getSnapshot(); if (snapshot.state.format === 'hex' || snapshot.state.format === 'hsv') area.focus(); else modelSliders.get(snapshot.state.format)?.querySelector<HTMLInputElement>('input')?.focus(); }, disconnect: () => connection.disconnect() };
}
function button(label: string): HTMLButtonElement { const element = document.createElement('button'); element.type = 'button'; element.className = 'secondary'; element.textContent = label; return element; }
function sliderRow(label: string, className: string): { readonly row: HTMLLabelElement; readonly input: HTMLInputElement } { const row = document.createElement('label'); const text = document.createElement('span'); text.textContent = label; const input = document.createElement('input'); input.className = className; row.append(text, input); return { row, input }; }
function coordinateField(connection: ColorPickerConnection, model: ColorModel, field: ColorCoordinateValue): HTMLLabelElement { const label = document.createElement('label'); const text = document.createElement('span'); text.textContent = field.label; const control = document.createElement('span'); control.className = 'color-picker-coordinate-control'; const input = document.createElement('input'); const unit = document.createElement('small'); unit.textContent = field.unit; control.append(input, unit); label.append(text, control); connection.setCoordinateInputAttributes(input, model, field.coordinate); return label; }
function coordinateSlider(connection: ColorPickerConnection, model: ColorModel, field: ColorCoordinateValue): { readonly row: HTMLLabelElement; readonly output: HTMLOutputElement } { const row = document.createElement('label'); const text = document.createElement('span'); text.textContent = field.label; const input = document.createElement('input'); const output = document.createElement('output'); output.textContent = `${field.value}${field.unit}`; row.append(text, input, output); connection.setCoordinateSliderAttributes(input, model, field.coordinate); return { row, output }; }
