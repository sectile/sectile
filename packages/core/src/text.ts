export {
  applyTextEvent,
  cancelTextComposition,
  commitTextComposition,
  createTextEditingState,
  createTextSnapshot,
  isTextCodeUnitBoundary,
  isWellFormedPlainText,
  normalizeTextEditingState,
  replacePlainText,
  replaceTextState,
  sameTextEditingState,
  slicePlainText,
  startTextComposition,
  updateTextComposition,
  type TextComposition,
  type TextEditingState,
  type TextEvent,
  type TextSelection,
  type TextSelectionDirection,
  type TextSelectionInput,
  type TextSnapshot,
  type TextUpdate,
} from './internal/editing/text.js';

export { tryCreateTextEditingState } from './internal/editing/text.js';
export { tryCreateTextSnapshot } from './internal/editing/text.js';
