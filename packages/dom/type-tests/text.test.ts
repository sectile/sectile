import { createText, type TextInput } from '@sectile/dom/text';

declare const element: HTMLInputElement;
declare const nativeBeforeInput: InputEvent;

const connection = createText({ element });
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
