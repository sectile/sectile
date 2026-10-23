import { createColorPickerState, getColorAreaValue, reconcileColorPickerState, type ColorAreaSelection, type ColorPickerState } from '@sectile/core/color-picker';
const selection: ColorAreaSelection = { x: 0, y: 0, hue: 120 };
const state: ColorPickerState = createColorPickerState({ value: '#000000', area: selection });
getColorAreaValue(state.value, state.area);
reconcileColorPickerState(state, { value: '#000000' }, {}, state);
const legacy: ColorPickerState = { value: state.value, draft: null, format: 'hex', channel: 'red' };
void legacy;
// @ts-expect-error Color selections retain numerical coordinates.
const invalid: ColorAreaSelection = { x: '0', y: 0, hue: 120 };
void invalid;
