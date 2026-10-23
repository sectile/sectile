import type {
  TabularBulkSelectionState,
  TabularColumnID,
  TabularResult,
  TabularWireValue,
  TabularCellAddress,
  TabularHeaderNodeID,
  TabularHeaderLayout,
  TabularRowID,
} from '@sectile/tabular';

export interface TabularDOMColumnSizeState {
  readonly revision: number;
  readonly values: Readonly<Record<TabularColumnID, number>>;
}

export interface TabularDOMColumnSizeOptions {
  readonly columnSizes?: Readonly<Record<TabularColumnID, number>>;
  readonly defaultColumnSizes?: Readonly<Record<TabularColumnID, number>>;
  readonly onColumnSizesChange?: (state: TabularDOMColumnSizeState) => void;
}

export interface TabularDOMRegistrationOptions {
  readonly expectedProjectionGeneration?: number;
}

export interface TabularDOMColumnResizeHandleOptions {
  readonly columnID: TabularColumnID;
  readonly minSize?: number;
  readonly maxSize?: number;
  readonly step?: number;
}

export type TabularDOMEditorElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export type TabularDOMEditorValueParser = (value: string) => TabularResult<TabularWireValue>;

export interface TabularDOMEditorOptions {
  readonly cell: TabularCellAddress;
  readonly parseValue?: TabularDOMEditorValueParser;
  readonly commitOnBlur?: boolean;
  readonly commitOnChange?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  /** Optional override; omission preserves the authored native accessible name. */
  readonly label?: string;
}

export type TabularHeaderMetrics = TabularHeaderLayout;

export type TabularDOMHeaderReference =
  | { readonly columnID: TabularColumnID; readonly headerNodeID?: never }
  | { readonly headerNodeID: TabularHeaderNodeID; readonly columnID?: never };

export interface ResolvedTabularHeaderReference {
  readonly headerNodeID: TabularHeaderNodeID;
  readonly metric: TabularHeaderMetrics | undefined;
}

export type TabularDOMBulkSelectionState = TabularBulkSelectionState;

export interface TabularDOMRowSelectionAnchor {
  readonly rowID: TabularRowID;
  readonly projectionGeneration: number;
}

export type TabularDOMRowSelectionEvent =
  | { readonly type: 'toggle-row-selection'; readonly rowID: TabularRowID }
  | { readonly type: 'set-row-selection-range'; readonly anchorRowID: TabularRowID; readonly rowID: TabularRowID; readonly selected: boolean };

export interface TabularDOMRowSelectionActivation {
  readonly event: TabularDOMRowSelectionEvent;
  readonly anchor: TabularDOMRowSelectionAnchor;
}
