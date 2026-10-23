import { createText, writeClipboardText, type ClipboardWriteOptions, type ClipboardWriteErrorCode, type TextInput } from '@sectile/dom/text';
import type { Result } from '@sectile/core/result';
import { writeClipboardText as rootWriteClipboardText } from '@sectile/dom';
const rootClipboardWrite: typeof writeClipboardText = rootWriteClipboardText; void rootClipboardWrite;
const clipboardOptions: ClipboardWriteOptions = { document, text: 'Delivery address' };
const copied: Promise<Result<void, ClipboardWriteErrorCode>> = writeClipboardText(clipboardOptions); void copied;
// @ts-expect-error The operation requires the caller's document, not a global clipboard.
writeClipboardText({ text: 'Address' });
// @ts-expect-error Clipboard text is supplied, never implicitly serialized.
writeClipboardText({ document, text: 150 });
// @ts-expect-error Native clipboard writes cannot be cancelled after invocation.
writeClipboardText({ document, text: 'Address', signal: new AbortController().signal });
import { getColorPickerInputAttributes, createColorPicker, type ColorPickerInputAttributes, type ColorPickerState, type ColorPickerAreaAxes } from '@sectile/dom/color-picker';
declare const colorState: ColorPickerState;
const colorInput: ColorPickerInputAttributes = getColorPickerInputAttributes(colorState, { part: 'text-input', readOnly: true });
const colorText: string = colorInput.value;
void colorText;
const colorConnection = createColorPicker({ root: document.createElement('div') });
colorConnection.setAreaAttributes(document.createElement('div'), document.createElement('div'));
const areaAxes: ColorPickerAreaAxes = { saturation: document.createElement('input'), brightness: document.createElement('input') };
colorConnection.setAreaAttributes(document.createElement('div'), undefined, areaAxes);
// @ts-expect-error Axis recipients must be native inputs, not generic surfaces.
colorConnection.setAreaAttributes(document.createElement('div'), undefined, { saturation: document.createElement('div'), brightness: document.createElement('input') });
colorConnection.disconnect();
// @ts-expect-error Native input kinds are a closed semantic domain.
getColorPickerInputAttributes(colorState, { part: 'anything' });
// @ts-expect-error Projected attributes are readonly caller facts.
colorInput.value = '#000000';
import { createTagsInput, type TagsInputRemoveLabelResolver } from '@sectile/dom/tags-input';
const removeTag: TagsInputRemoveLabelResolver = (value, index) => index ? undefined : `Remove ${value}`;
createTagsInput({ root: document.createElement('div'), input: document.createElement('input'), removeLabel: removeTag }).disconnect();
// @ts-expect-error Accessible names are text, not numeric values.
const invalidTagLabel: TagsInputRemoveLabelResolver = () => 1;
void invalidTagLabel;
import { createEditable, type EditableBindingOptions } from '@sectile/dom/editable';

declare const element: HTMLInputElement;
declare const nativeBeforeInput: InputEvent;
declare const preview: HTMLElement;
const editable = createEditable({ root: preview, preview, input: element, defaultValue: 'Text' });
const binding: EditableBindingOptions = { root: preview, preview, input: element, policies: { allowEmpty: false } };
const rebound = editable.syncOptions(binding);
if (rebound.ok) { const draft: string = rebound.value.state.draft; void draft; }
// @ts-expect-error Binding synchronization preserves the existing control/value mode.
editable.syncOptions({ ...binding, value: 'New controlled value' });
// @ts-expect-error Native bindings remain readonly caller facts.
binding.input = element;

const connection = createText({ element });
const selectionInput: TextInput = { type: 'select', selection: { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 0 } };
const selectionSent: boolean = connection.send(selectionInput);
void selectionSent;
// @ts-expect-error Selection-only inputs require explicit anchor and focus offsets.
const missingSelection: TextInput = { type: 'select' };
void missingSelection;
const semanticInput: TextInput = {
  type: 'input',
  inputType: 'insertText',
  text: '한',
  startCodeUnitOffset: 0,
  endCodeUnitOffset: 0,
  selection: { anchorCodeUnitOffset: 1, focusCodeUnitOffset: 1 },
};

const sent: boolean = connection.send(semanticInput);
const handled: boolean = connection.handleEvent(semanticInput);
const nativeOwned: boolean = connection.handleBeforeInput(nativeBeforeInput);

void sent;
void handled;
void nativeOwned;
