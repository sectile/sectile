import type {
  TabularDOMEditorElement,
  TabularDOMEditorValueParser,
  TabularDOMEditorOptions,
} from '../contracts.js';
import type {
  TabularResult,
  TabularWireValue,
  TabularCellAddress,
} from '@sectile/tabular';
import {
  ok,
} from '../result.js';

export function readEditorValue(
  element: TabularDOMEditorElement,
  parser: TabularDOMEditorValueParser | undefined,
): TabularResult<TabularWireValue> {
  return parser?.(element.value) ?? ok(element.value);
}

export function setEditorAttributes(
  element: TabularDOMEditorElement,
  options: TabularDOMEditorOptions,
  part: string,
): void {
  element.setAttribute('data-part', part);
  element.setAttribute('data-row-id', options.cell.rowID);
  element.setAttribute('data-column-id', options.cell.columnID);
  if (options.label === undefined) element.removeAttribute('aria-label');
  else element.setAttribute('aria-label', options.label);
  element.disabled = options.disabled === true;
  if ('readOnly' in element) element.readOnly = options.readOnly === true;
}

export function cellKey(cell: TabularCellAddress): string {
  return JSON.stringify([cell.rowID, cell.columnID]);
}

export function sameCell(left: TabularCellAddress, right: TabularCellAddress): boolean {
  return left.rowID === right.rowID && left.columnID === right.columnID;
}
