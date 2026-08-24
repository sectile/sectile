export type AnatomyNodeKind =
  | 'root' | 'row' | 'stack' | 'panel' | 'button' | 'icon-button' | 'input'
  | 'label' | 'text' | 'muted' | 'list' | 'item' | 'indicator' | 'grid'
  | 'cell' | 'track' | 'range' | 'thumb' | 'separator' | 'badge' | 'swatch'
  | 'textarea' | 'pane' | 'handle' | 'overlay' | 'viewport' | 'slide'
  | 'toolbar' | 'tab-list' | 'tab' | 'calendar' | 'weekday' | 'spacer';

export type AnatomyIconName =
  | 'align-left' | 'arrow-left' | 'arrow-right' | 'bold' | 'book-open' | 'calendar'
  | 'check' | 'chevron-down' | 'chevron-left' | 'chevron-right'
  | 'chevrons-left' | 'chevrons-right' | 'ellipsis' | 'file-code-2' | 'folder' | 'folder-open' | 'grip-vertical' | 'italic'
  | 'minus' | 'pause' | 'play' | 'plus' | 'rotate-ccw' | 'star' | 'x';

export interface AnatomyPreviewNode {
  readonly part?: string | undefined;
  readonly kind: AnatomyNodeKind;
  readonly text?: string | undefined;
  readonly detail?: string | undefined;
  readonly value?: string | undefined;
  readonly icon?: AnatomyIconName | undefined;
  readonly className?: string | undefined;
  readonly children?: readonly AnatomyPreviewNode[] | undefined;
}

export interface ComponentAnatomyDefinition {
  readonly scope: string;
  readonly parts: readonly string[];
  readonly preview: AnatomyPreviewNode;
  readonly partDetails: Readonly<Record<string, AnatomyPartDetail>>;
}

export interface AnatomyPartDetail {
  readonly scope?: string;
  readonly attributes?: readonly (readonly [name: string, value: string])[];
  readonly purpose?: Readonly<{ en: string; ko: string }>;
}

export interface AnatomyPartContract {
  readonly attributes: readonly (readonly [name: string, value: string])[];
  readonly purpose?: Readonly<{ en: string; ko: string }>;
}

export function anatomyPartContract(definition: ComponentAnatomyDefinition, part: string): AnatomyPartContract {
  const detail = definition.partDetails[part];
  return Object.freeze({
    attributes: Object.freeze([
      ['data-scope', detail?.scope ?? definition.scope] as const,
      ['data-part', part] as const,
      ...(detail?.attributes ?? []),
    ]),
    ...(detail?.purpose === undefined ? {} : { purpose: detail.purpose }),
  });
}

type NodeOptions = Omit<AnatomyPreviewNode, 'part' | 'kind' | 'text' | 'children'>;

const n = (
  kind: AnatomyNodeKind,
  part?: string,
  text?: string,
  children?: readonly AnatomyPreviewNode[],
  options: NodeOptions = {},
): AnatomyPreviewNode => Object.freeze({ kind, part, text, children, ...options });

const row = (children: readonly AnatomyPreviewNode[], className?: string) => n('row', undefined, undefined, children, { className });
const stack = (children: readonly AnatomyPreviewNode[], className?: string) => n('stack', undefined, undefined, children, { className });
const root = (children: readonly AnatomyPreviewNode[], className?: string) => n('root', 'root', undefined, children, { className });
const button = (part: string, text: string, icon?: AnatomyIconName, className?: string) => n('button', part, text, undefined, { icon, className });
const iconButton = (part: string, icon: AnatomyIconName, detail?: string) => n('icon-button', part, undefined, undefined, { icon, detail });
const input = (part: string, text: string, detail?: string, className?: string) => n('input', part || undefined, text, undefined, { detail, className });
const item = (
  part: string,
  text: string,
  detail?: string,
  children?: readonly AnatomyPreviewNode[],
  value?: string,
) => n('item', part || undefined, text, children, { detail, value });

const popupParts = ['trigger', 'overlay', 'content', 'title', 'description', 'close'] as const;
const fieldParts = ['input'] as const;
const rangePickerParts = [
  'start-input', 'end-input', 'trigger', 'content', 'week-view-trigger',
  'month-view-trigger', 'year-view-trigger', 'previous-week', 'next-week',
  'previous-month', 'next-month', 'previous-year', 'next-year', 'grid', 'cell', 'month-cell',
] as const;
const pickerParts = [
  'input', 'trigger', 'content', 'week-view-trigger', 'month-view-trigger',
  'year-view-trigger', 'previous-week', 'next-week', 'previous-month', 'next-month',
  'previous-year', 'next-year', 'grid', 'cell', 'month-cell',
] as const;

function checkboxPreview(group = false): AnatomyPreviewNode {
  if (group) {
    return root([
      n('label', undefined, 'Choose channels'),
      n('item', 'item', undefined, [
        n('indicator', 'indicator', undefined, undefined, { icon: 'check', value: 'stable' }),
        stack([n('text', undefined, 'Stable releases'), n('muted', undefined, 'Always receive production updates')]),
      ], { className: 'choice', value: 'stable' }),
      n('item', 'item', undefined, [
        n('indicator', 'indicator', undefined, undefined, { icon: 'check', value: 'preview' }),
        stack([n('text', undefined, 'Preview releases'), n('muted', undefined, 'Try features before release')]),
      ], { className: 'choice', value: 'preview' }),
    ], 'form-stack checkbox-group-root');
  }

  return root([
    n('indicator', 'indicator', undefined, undefined, { icon: 'check' }),
    stack([
      n('text', undefined, 'Include analytics'),
      n('muted', undefined, 'Share anonymous usage data'),
    ]),
  ], 'choice');
}

function fieldPreview(kind: string): AnatomyPreviewNode {
  const values: Record<string, readonly [string, string]> = {
    text: ['Project name', 'Sectile docs'],
    'number-field': ['Opacity', '0.75'],
    'date-field': ['Release date', '2026 / 08 / 23'],
    'date-time-field': ['Starts at', '2026 / 08 / 23   09 : 30'],
    'time-field': ['Start time', '09 : 30'],
  };
  const [label, value] = values[kind] ?? ['Value', 'Example'];
  return stack([n('label', undefined, label), input('input', value)], 'field-preview');
}

function rangeFieldPreview(kind: string): AnatomyPreviewNode {
  const time = kind === 'time-range-field';
  return root([
    n('label', undefined, time ? 'Office hours' : 'Deployment window'),
    row([
      input('start-input', time ? '09 : 00' : '2026 / 08 / 23'),
      n('muted', undefined, 'to'),
      input('end-input', time ? '17 : 30' : '2026 / 08 / 29'),
    ], 'field-row'),
  ], 'form-stack');
}

function datePickerPreview(kind: string): AnatomyPreviewNode {
  const isRange = kind.includes('range');
  const inputNodes: AnatomyPreviewNode[] = [];

  if (kind === 'date-time-picker') {
    inputNodes.push(input('date-time-input', '2026-08-23T09:30', 'Date and time'));
    inputNodes.push(input('date-input', '2026-08-23', 'Date'));
    inputNodes.push(input('time-input', '09:30', 'Time'));
  } else if (kind === 'date-time-range-picker') {
    inputNodes.push(input('start-date-time-input', '2026-08-23T09:30', 'Start'));
    inputNodes.push(input('end-date-time-input', '2026-08-29T17:30', 'End'));
    inputNodes.push(input('start-date-input', '2026-08-23', 'Start date'));
    inputNodes.push(input('end-date-input', '2026-08-29', 'End date'));
    inputNodes.push(input('start-time-input', '09:30', 'Start time'));
    inputNodes.push(input('end-time-input', '17:30', 'End time'));
  } else if (isRange) {
    inputNodes.push(input('start-input', '2026-08-23', 'Start'));
    inputNodes.push(input('end-input', '2026-08-29', 'End'));
  } else if (kind !== 'calendar') {
    inputNodes.push(input('input', '2026-08-23', 'Selected date'));
  }

  const days = ['27', '28', '29', '30', '31', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30'];
  const cells = days.map((day, index) => n('cell', 'cell', day, undefined, {
    className: index === 26 ? 'selected' : index < 5 ? 'outside' : undefined,
  }));

  const calendarChildren: AnatomyPreviewNode[] = [];
  if (kind !== 'calendar') {
    calendarChildren.push(
      row([button('week-view-trigger', 'Week'), button('month-view-trigger', 'Month'), button('year-view-trigger', 'Year')], 'view-switch'),
      row([
        iconButton('previous-year', 'chevrons-left', 'Previous year'), iconButton('previous-month', 'chevron-left', 'Previous month'),
        n('text', undefined, 'August 2026', undefined, { className: 'calendar-title' }),
        iconButton('next-month', 'chevron-right', 'Next month'), iconButton('next-year', 'chevrons-right', 'Next year'),
      ], 'calendar-header'),
      row([iconButton('previous-week', 'arrow-left', 'Previous week'), n('muted', undefined, 'Move one week'), iconButton('next-week', 'arrow-right', 'Next week')], 'week-controls'),
    );
  } else {
    calendarChildren.push(row([
      n('icon-button', undefined, undefined, undefined, { icon: 'chevron-left' }),
      n('text', undefined, 'August 2026', undefined, { className: 'calendar-title' }),
      n('icon-button', undefined, undefined, undefined, { icon: 'chevron-right' }),
    ], 'calendar-header'));
  }
  calendarChildren.push(n('grid', kind === 'calendar' ? undefined : 'grid', undefined, [
    ...['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => n('weekday', undefined, day)),
    ...cells,
  ], { className: 'calendar-grid' }));
  if (kind !== 'calendar') {
    calendarChildren.push(n('row', undefined, undefined, [
      n('cell', 'month-cell', 'Aug', undefined, { className: 'month-cell' }),
      n('cell', 'month-cell', 'Sep', undefined, { className: 'month-cell' }),
      n('cell', 'month-cell', 'Oct', undefined, { className: 'month-cell' }),
    ], { className: 'month-row' }));
  }

  const main = [
    ...(inputNodes.length > 0 ? [row(inputNodes, 'picker-inputs')] : []),
    ...(kind !== 'calendar' ? [iconButton('trigger', 'calendar', 'Open calendar')] : []),
    n('calendar', kind === 'calendar' ? 'root' : 'content', undefined, calendarChildren),
  ];
  return kind === 'calendar' ? main[main.length - 1]! : n('root', undefined, undefined, main, { className: 'picker-root' });
}

function periodPickerPreview(kind: string): AnatomyPreviewNode {
  const isRange = kind.includes('range');
  const isCalendar = kind === 'range-calendar';
  const isYear = kind.startsWith('year');
  const cellPart = 'cell';
  const previousPart = isYear ? 'previous-page' : isCalendar ? 'previous-month' : 'previous-year';
  const nextPart = isYear ? 'next-page' : isCalendar ? 'next-month' : 'next-year';
  const heading = isYear ? '2020–2031' : '2026';
  const values = isYear
    ? ['2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030', '2031']
    : isCalendar
      ? ['27', '28', '29', '30', '31', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fields = isCalendar
    ? []
    : isRange
      ? [input('start-input', isYear ? '2026' : '2026-03', 'From'), input('end-input', isYear ? '2030' : '2026-08', 'To')]
      : [input('input', isYear ? '2028' : '2026-08', isYear ? 'Year' : 'Month')];
  const cells = values.map((value, index) => n('cell', cellPart, value, undefined, {
    className: index === (isYear ? 4 : isCalendar ? 26 : 7)
      ? 'selected'
      : isRange && index > (isYear ? 1 : 2) && index < (isYear ? 7 : 8)
        ? 'in-range'
        : isCalendar && index < 5
          ? 'outside'
          : undefined,
  }));
  const navigation = isCalendar
    ? [
        iconButton('previous-year', 'chevrons-left', 'Previous year'),
        iconButton(previousPart, 'chevron-left', 'Previous month'),
        n('text', undefined, 'August 2026', undefined, { className: 'calendar-title' }),
        iconButton(nextPart, 'chevron-right', 'Next month'),
        iconButton('next-year', 'chevrons-right', 'Next year'),
      ]
    : [
        iconButton(previousPart, 'chevron-left', isYear ? 'Previous years' : 'Previous year'),
        n('text', undefined, heading, undefined, { className: 'calendar-title' }),
        iconButton(nextPart, 'chevron-right', isYear ? 'Next years' : 'Next year'),
      ];
  const contentChildren: AnatomyPreviewNode[] = [row(navigation, 'calendar-header')];
  if (isCalendar) {
    contentChildren.push(n(
      'grid',
      undefined,
      undefined,
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => n('weekday', undefined, day)),
      { className: 'calendar-grid calendar-weekdays' },
    ));
  }
  contentChildren.push(n('grid', 'grid', undefined, cells, { className: isCalendar ? 'calendar-grid' : 'period-grid' }));

  return n('root', undefined, undefined, [
    ...(fields.length > 0 ? [row([...fields, button('trigger', isYear ? 'Choose year' : 'Choose month', 'calendar')], 'picker-inputs')] : []),
    n('calendar', 'content', undefined, contentChildren, { className: isCalendar ? 'calendar' : 'period-picker' }),
  ], { className: 'picker-root' });
}

function sliderPreview(multiple = false): AnatomyPreviewNode {
  return root([
    row([n('label', undefined, multiple ? 'Price range' : 'Deployment traffic'), n('text', undefined, multiple ? '$30 – $72' : '40%')], 'split-label'),
    n('track', 'track', undefined, [
      n('range', 'range'), n('thumb', 'thumb', multiple ? '$30' : '40'),
      ...(multiple ? [n('thumb', undefined, '$72', undefined, { className: 'second-thumb' })] : []),
    ]),
  ], 'slider-root');
}

function popupPreview(kind: string): AnatomyPreviewNode {
  if (kind === 'popover') {
    return n('root', undefined, undefined, [
      n('row', 'anchor', undefined, [button('trigger', 'Edit profile')], { className: 'popover-anchor' }),
      n('panel', 'content', undefined, [
        n('text', 'title', 'Profile details'), n('muted', 'description', 'Change the public display name.'), input('', 'Sectile'),
        iconButton('close', 'x', 'Close'), n('indicator', 'arrow', undefined, undefined, { className: 'arrow' }),
      ], { className: 'floating-panel' }),
    ], { className: 'popover-root' });
  }
  if (kind === 'tooltip') {
    return n('root', undefined, undefined, [
      n('stack', undefined, undefined, [
        button('trigger', 'Save changes'),
        n('panel', 'content', 'Saves the current settings', [
          n('indicator', 'arrow', undefined, undefined, { className: 'arrow tooltip-arrow' }),
        ], { className: 'tooltip-panel' }),
      ], { className: 'tooltip-anchor' }),
    ], { className: 'tooltip-root' });
  }
  const alert = kind === 'alert-dialog';
  return n('root', undefined, undefined, [
    button('trigger', alert ? 'Delete project' : 'Open settings'),
    n('overlay', 'overlay', undefined, [
      n('panel', 'content', undefined, [
        n('text', 'title', alert ? 'Delete this project?' : 'Project settings'),
        n('muted', 'description', alert ? 'This action cannot be undone.' : 'Update the project details below.'),
        alert ? n('spacer') : input('', 'Sectile'),
        row([button('close', alert ? 'Cancel' : 'Done'), alert ? n('button', undefined, 'Delete', undefined, { className: 'danger' }) : n('spacer')], 'dialog-actions'),
      ], { className: 'dialog-panel' }),
    ]),
  ], { className: 'dialog-root' });
}

function listChoicePreview(kind: string): AnatomyPreviewNode {
  const isSelect = kind === 'select';
  const isCombobox = kind === 'combobox';
  const isCascade = kind === 'cascade-select';
  if (isCascade) {
    return root([
      button('trigger', 'Choose workspace', 'chevron-down'),
      n('text', 'value', 'Engineering / Web platform'),
      n('list', 'content', undefined, [
        n('panel', 'column', undefined, [
          item('item', 'Engineering', undefined, [n('indicator', 'item-chevron', undefined, undefined, { icon: 'chevron-right' })], 'engineering'),
          item('item', 'Design', undefined, [n('indicator', 'item-chevron', undefined, undefined, { icon: 'chevron-right' })], 'design'),
          item('item', 'Operations', undefined, [n('indicator', 'item-chevron', undefined, undefined, { icon: 'chevron-right' })], 'operations'),
        ]),
        n('panel', 'column', undefined, [
          item('item', 'Web platform', undefined, [n('indicator', 'item-indicator', undefined, undefined, { icon: 'check', value: 'web' })], 'web'),
          item('item', 'Mobile apps', undefined, undefined, 'mobile'),
          item('item', 'Infrastructure', undefined, undefined, 'infrastructure'),
        ]),
      ]),
    ], 'cascade-root');
  }
  const items = ['Alpha release', 'Beta release', 'Nightly build'];
  const itemValues = ['alpha', 'beta', 'nightly'];
  const listItems = items.map((label, index) => item('item', label, index === 0 ? 'Stable channel' : index === 1 ? 'Preview channel' : 'Latest changes', [
    ...(kind === 'listbox' ? [n('text', 'item-text', label)] : []),
    ...(['listbox', 'select'].includes(kind) ? [n('indicator', 'item-indicator', undefined, undefined, { icon: 'check', value: itemValues[index] })] : []),
  ], itemValues[index]));
  if (isCombobox) return root([input('input', 'alp', 'Search releases'), n('list', 'content', undefined, [listItems[0]!, n('muted', 'empty', 'No results')])], 'combobox-root');
  if (isSelect) {
    return root([
      button('trigger', 'Alpha release', 'chevron-down'), n('text', 'value', 'Alpha release'),
      n('list', 'content', undefined, listItems),
    ], 'select-root');
  }
  return root([n('label', undefined, 'Release channel'), n('list', undefined, undefined, listItems)], 'listbox-root');
}

function menuPreview(kind: string): AnatomyPreviewNode {
  if (kind === 'navigation-menu') {
    return root([
      n('list', 'list', undefined, [
        n('item', 'item-container', undefined, [
          item('item', 'Products', undefined, [n('indicator', undefined, undefined, undefined, { icon: 'chevron-down' })], 'products'),
        ]),
        n('item', 'item-container', undefined, [
          item('item', 'Docs', undefined, undefined, 'docs'),
        ]),
        n('indicator', 'indicator'),
      ]),
      n('viewport', 'viewport', undefined, [
        n('panel', 'sub-content', undefined, [
          item('item', 'New releases', 'What shipped in the latest version', undefined, 'new'),
          item('item', 'Open source', 'Packages and contribution guides', undefined, 'open'),
        ], { className: 'navigation-panel' }),
      ], { className: 'navigation-viewport' }),
    ], 'navigation-root');
  }
  const items = [
    item('item', 'New file', '⌘N', undefined, 'new'),
    item('item', 'Open…', '⌘O', undefined, 'open'),
    n('separator', 'separator'),
    item('item', 'Export', undefined, [n('indicator', undefined, undefined, undefined, { icon: 'chevron-right' })], 'export'),
  ];
  const popup = n('panel', kind === 'navigation-menu' || kind === 'menu-button' ? 'content' : undefined, undefined, [
    ...items, n('panel', 'sub-content', undefined, [item('item', 'PDF', undefined, undefined, 'pdf'), item('item', 'Markdown', undefined, undefined, 'markdown')], { className: 'submenu' }),
  ], { className: 'menu-panel' });
  if (kind === 'menu') return root([popup], 'menu-root');
  if (kind === 'menubar') return root([row([item('item', 'File', undefined, undefined, 'file'), item('item', 'Edit', undefined, undefined, 'edit'), item('item', 'View', undefined, undefined, 'view')], 'menubar'), popup], 'menu-root');
  return n('root', undefined, undefined, [button('trigger', 'Create', 'chevron-down'), popup], { className: 'menu-button-root' });
}

function collectionPreview(kind: string): AnatomyPreviewNode {
  if (kind === 'feed') {
    return root([
      row([
        stack([n('text', undefined, 'Release activity'), n('muted', undefined, 'production · release-2026.08')]),
        n('badge', undefined, 'Live'),
      ], 'feed-anatomy-header'),
      button('load-newer', '2 new updates', undefined, 'feed-anatomy-load feed-anatomy-load-newer'),
      n('list', undefined, undefined, [
        n('item', 'item', undefined, [
          n('indicator', undefined, undefined, undefined, { icon: 'check' }),
          stack([n('text', undefined, 'Production deployment completed'), n('muted', undefined, 'Release 2026.08 is healthy in all regions.'), n('muted', undefined, 'Deploy bot · Just now')]),
          n('badge', undefined, 'Healthy'),
        ], { className: 'feed-anatomy-event', value: 'deployed' }),
        n('item', 'item', undefined, [
          n('indicator', undefined, undefined, undefined, { icon: 'check' }),
          stack([n('text', undefined, 'Release approved'), n('muted', undefined, 'Mina approved the production promotion.'), n('muted', undefined, 'Mina Kim · 18 min ago')]),
        ], { className: 'feed-anatomy-event', value: 'approved' }),
        n('item', 'item', undefined, [
          n('indicator', undefined, undefined, undefined, { icon: 'check' }),
          stack([n('text', undefined, 'Required checks passed'), n('muted', undefined, 'All 12 release checks completed.'), n('muted', undefined, 'CI · 24 min ago')]),
          n('badge', undefined, '12/12'),
        ], { className: 'feed-anatomy-event', value: 'checks' }),
      ], { className: 'feed-anatomy-list' }),
      button('load-earlier', 'Load earlier events', undefined, 'feed-anatomy-load feed-anatomy-load-earlier'),
      n('muted', undefined, 'Showing the current release window', undefined, { className: 'feed-anatomy-note' }),
    ], 'feed-root');
  }
  if (kind === 'tree-view') {
    const disclosure = (value: string) => n('indicator', 'disclosure', undefined, undefined, { icon: 'chevron-down', value });
    const treeItem = (value: string, label: string, detail: string, level: 1 | 2 | 3, expandable = false) => n('item', 'item', undefined, [
      ...(expandable ? [disclosure(value)] : [n('spacer')]),
      n('indicator', undefined, undefined, undefined, { icon: expandable ? 'folder-open' : 'file-code-2' }),
      n('text', undefined, label),
      n('muted', undefined, detail),
    ], { className: `tree-view-row tree-view-level-${level}`, value });
    return root([
      treeItem('atlas', 'Atlas workspace', 'Workspace', 1, true),
      n('list', 'group', undefined, [
        treeItem('apps', 'Applications', '2 apps', 2, true),
        n('list', 'group', undefined, [
          treeItem('dashboard', 'Dashboard', '2 files', 3, true),
          n('list', 'group', undefined, [
            treeItem('overview', 'Overview.vue', '4.2 KB', 3),
            treeItem('settings', 'Settings.vue', '3.8 KB', 3),
          ], { className: 'tree-view-children tree-view-children-of-dashboard' }),
        ], { className: 'tree-view-children tree-view-children-of-apps' }),
        treeItem('tokens', 'tokens.ts', '6.1 KB', 2),
      ], { className: 'tree-view-children tree-view-children-of-atlas' }),
    ], 'tree-root');
  }
  if (kind === 'tree-grid') {
    const resource = (
      label: string,
      detail: string,
      level: 1 | 2 | 3,
      icon: AnatomyIconName,
      expandable = false,
    ): AnatomyPreviewNode => n('cell', 'cell', undefined, [
      ...(expandable ? [n('indicator', 'disclosure', undefined, undefined, { icon: 'chevron-down' })] : [n('spacer')]),
      n('indicator', undefined, undefined, undefined, { icon }),
      stack([n('text', undefined, label), n('muted', undefined, detail)]),
    ], { className: `tree-grid-resource tree-grid-level-${level}`, value: `${label.toLowerCase().replaceAll(' ', '-')}-name` });

    const status = (text: string, tone: string): AnatomyPreviewNode => n('cell', 'cell', undefined, [
      n('badge', undefined, text, undefined, { className: `tree-grid-status tree-grid-status-${tone}` }),
    ], { value: `${text.toLowerCase().replaceAll(' ', '-')}-status` });

    return root([
      row([
        n('cell', undefined, 'Resource'),
        n('cell', undefined, 'Owner'),
        n('cell', undefined, 'Status'),
      ], 'grid-header tree-grid-header'),
      n('grid', undefined, undefined, [
        n('row', 'row', undefined, [
          resource('Commerce platform', 'Workspace', 1, 'folder-open', true),
          n('cell', 'cell', 'Platform team', undefined, { value: 'platform-owner' }),
          status('Healthy', 'success'),
        ], { className: 'data-row tree-grid-row tree-grid-parent', value: 'platform' }),
        n('row', 'row', undefined, [
          resource('Storefront', 'Application', 2, 'folder-open', true),
          n('cell', 'cell', undefined, [input('editor', 'Mina Kim', 'Storefront owner', 'tree-grid-editor')], { value: 'storefront-owner' }),
          status('Modified', 'neutral'),
        ], { className: 'data-row tree-grid-row tree-grid-child tree-child', value: 'storefront' }),
        n('row', 'row', undefined, [
          resource('Checkout flow', 'Feature', 3, 'file-code-2'),
          n('cell', 'cell', 'Alex Chen', undefined, { value: 'checkout-owner' }),
          status('In review', 'review'),
        ], { className: 'data-row tree-grid-row tree-grid-grandchild tree-child', value: 'checkout' }),
        n('row', 'row', undefined, [
          resource('Documentation', 'Content', 2, 'book-open'),
          n('cell', 'cell', 'Technical writing', undefined, { value: 'docs-owner' }),
          status('Published', 'success'),
        ], { className: 'data-row tree-grid-row tree-grid-child tree-child', value: 'docs' }),
      ], { className: 'grid-body tree-grid-body' }),
    ], 'data-grid tree-grid-root');
  }
  return root([
    row([n('cell', undefined, 'Name'), n('cell', undefined, 'Status')], 'grid-header'),
    n('grid', undefined, undefined, [
      n('row', 'row', undefined, [
        n('cell', 'cell', 'Alpha'),
        n('cell', 'cell', 'Stable'),
      ]),
      n('row', 'row', undefined, [n('cell', 'cell', 'Beta'), n('cell', 'cell', 'Preview')], { className: 'data-row' }),
    ], { className: 'grid-body' }),
  ], 'data-grid');
}

function feedbackPreview(kind: string): AnatomyPreviewNode {
  if (kind === 'rating') {
    return root([
      n('text', undefined, '4 out of 5', undefined, { className: 'rating-value' }),
      row(['1', '2', '3', '4', '5'].map((rating) => n('item', 'item', undefined, [
        n('indicator', 'indicator', undefined, undefined, { value: rating }),
      ], { icon: 'star', value: rating })), 'rating-row'),
      button('clear', 'Clear rating', undefined, 'rating-clear'),
    ], 'rating-root');
  }
  if (kind === 'radio-group') return root([
    ['Email', 'email'], ['Push', 'push'], ['SMS', 'sms'],
  ].map(([label, value]) => item('item', label!, undefined, [n('indicator', 'indicator', undefined, undefined, { value })], value)), 'radio-root');
  if (kind === 'switch') return root([n('thumb', 'thumb'), stack([n('text', undefined, 'Notifications'), n('muted', undefined, 'Send deployment alerts')])], 'switch-root');
  if (kind === 'toggle-group') return root(['B', 'I', 'U'].map((label, index) => n('item', 'item', label, undefined, { className: index === 0 ? 'pressed' : undefined, value: label })), 'toggle-group');
  if (kind === 'toggle-button') return n('button', 'root', 'Bold', undefined, { icon: 'bold', className: 'toggle-button' });
  return checkboxPreview();
}

function inputCollectionPreview(kind: string): AnatomyPreviewNode {
  if (kind === 'tags-input') {
    return root([
      n('item', 'item', undefined, [
        n('text', 'item-text', 'Vue'),
        n('icon-button', 'item-delete', undefined, undefined, { icon: 'x', value: 'Vue' }),
      ], { value: 'Vue' }),
      n('item', 'item', undefined, [
        n('text', 'item-text', 'DOM'),
        n('icon-button', 'item-delete', undefined, undefined, { icon: 'x', value: 'DOM' }),
      ], { value: 'DOM' }),
      n('item', 'item', undefined, [
        n('text', 'item-text', 'Accessibility'),
        n('icon-button', 'item-delete', undefined, undefined, { icon: 'x', value: 'Accessibility' }),
      ], { value: 'Accessibility' }),
      input('input', 'Add a skill…'),
      button('clear', 'Clear all', 'x', 'tags-clear'),
    ], 'tags-root');
  }
  if (kind === 'pin-input') return root(['4', '2', '7', '9'].map((value, index) => input('input', value, `Digit ${index + 1}`, 'pin-cell')), 'pin-root');
  return root([
    n('textarea', 'area', undefined, [n('text', 'preview', 'Release title'), input('input', 'Release title')]),
    row([button('edit-trigger', 'Edit'), button('submit-trigger', 'Save'), button('cancel-trigger', 'Cancel')], 'editor-actions'),
  ], 'editable-root');
}

function numberControlPreview(kind: string): AnatomyPreviewNode {
  if (kind === 'spin-button') return root([n('label', undefined, 'Quantity'), row([iconButton('decrement', 'minus', 'Decrease'), input('input', '3'), iconButton('increment', 'plus', 'Increase')], 'number-stepper')], 'form-stack');
  return root([n('label', undefined, 'Distance'), row([input('input', '12.5'), button('unit-select', 'km')], 'field-row'), n('text', 'value', '12.5 km')], 'form-stack');
}

function colorPreview(): AnatomyPreviewNode {
  return root([
    n('label', 'label', 'Accent color'),
    n('panel', 'control', undefined, [
      n('swatch', 'swatch', undefined, [n('input', 'native-input', '#5e6ff2', undefined, { className: 'native-color-input' })], { className: 'accent-swatch' }),
      input('text-input', '#5e6ff2'),
    ]),
    n('panel', 'area', undefined, [n('thumb', 'area-thumb')], { className: 'color-area' }),
    n('track', 'hue-slider', undefined, [n('thumb', undefined)], { className: 'hue-track' }),
    n('track', 'alpha-slider', undefined, [n('thumb', undefined)], { className: 'alpha-track' }),
    row([input('channel-input', '238', 'Blue'), input('coordinate-input', '66%', 'Lightness'), n('track', 'coordinate-slider', undefined, [n('thumb', undefined)], { className: 'coordinate-track' })], 'color-channels'),
    row([button('format-trigger', 'HEX'), n('text', 'value-text', '#5e6ff2')], 'split-label'),
  ], 'color-root');
}

function carouselPreview(): AnatomyPreviewNode {
  return root([
    n('viewport', 'viewport', undefined, [n('track', 'track', undefined, [
      n('slide', 'slide', 'Foundation', [n('muted', undefined, 'Primitive state and laws')], { value: '0' }),
      n('slide', 'slide', 'Adapters', [n('muted', undefined, 'DOM and terminal ownership')], { value: '1' }),
      n('slide', 'slide', 'Frameworks', [n('muted', undefined, 'Vue composition and styling')], { value: '2' }),
    ])]),
    row([iconButton('previous', 'chevron-left', 'Previous slide'), iconButton('next', 'chevron-right', 'Next slide'), button('pause', 'Pause', 'pause')], 'carousel-actions'),
    n('row', 'indicator-group', undefined, ['1', '2', '3'].map((text, index) => n('indicator', 'indicator', text, undefined, { value: String(index) })), { className: 'carousel-dots' }),
  ], 'carousel-root');
}

function navigationPreview(kind: string): AnatomyPreviewNode {
  if (kind === 'pagination') return root([iconButton('first', 'chevrons-left', 'First page'), iconButton('previous', 'chevron-left', 'Previous page'), ...['1', '2', '3'].map((text) => n('item', 'item', text, undefined, { value: text })), n('indicator', undefined, undefined, undefined, { icon: 'ellipsis', className: 'pagination-ellipsis' }), n('item', 'item', '12', undefined, { value: '12' }), iconButton('next', 'chevron-right', 'Next page'), iconButton('last', 'chevrons-right', 'Last page')], 'pagination-root');
  if (kind === 'tabs') return root([n('tab-list', 'list', undefined, [n('button', 'trigger', 'Overview', undefined, { value: 'overview' }), n('button', 'trigger', 'Activity', undefined, { value: 'activity' }), n('indicator', 'indicator')]), n('panel', 'content', 'Project overview', [n('muted', undefined, 'Usage and deployment details')])], 'tabs-root');
  const steps = [['Account', 'account'], ['Workspace', 'workspace'], ['Review', 'review']] as const;
  return root([
    n('list', 'list', undefined, steps.map(([label, value], index) => n('item', 'step', label, [
      n('indicator', 'indicator', String(index + 1), undefined, { value }),
    ], { className: 'stepper-step', value }))),
    n('panel', 'content', 'Account details'),
  ], 'stepper-root');
}

function expansionPreview(kind: string): AnatomyPreviewNode {
  if (kind === 'disclosure') return root([button('trigger', 'Deployment details', 'chevron-down'), n('panel', 'content', 'Build target, rollout window, and release protection.')], 'disclosure-root');
  return root([
    n('item', 'item', undefined, [n('row', 'header', undefined, [n('button', 'trigger', 'General', undefined, { icon: 'chevron-down', value: 'general' })]), n('panel', 'content', 'Workspace name, ownership, and visibility.', undefined, { value: 'general' })], { value: 'general' }),
    n('item', 'item', undefined, [n('row', 'header', undefined, [n('button', 'trigger', 'Deployments', undefined, { icon: 'chevron-down', value: 'deployments' })]), n('panel', 'content', 'Build targets and release protection.', undefined, { value: 'deployments' })], { value: 'deployments' }),
    n('item', 'item', undefined, [n('row', 'header', undefined, [n('button', 'trigger', 'Danger zone', undefined, { icon: 'chevron-down', value: 'danger' })]), n('panel', 'content', 'Delete and archive settings.', undefined, { value: 'danger' })], { value: 'danger' }),
  ], 'accordion-root');
}

function utilityPreview(kind: string): AnatomyPreviewNode {
  if (kind === 'toolbar') return root([n('button', 'item', 'Bold', undefined, { icon: 'bold', value: 'Bold' }), n('button', 'item', 'Italic', undefined, { icon: 'italic', value: 'Italic' }), n('separator', 'separator'), n('button', 'item', 'Align left', undefined, { icon: 'align-left', value: 'Align left' })], 'toolbar-root');
  if (kind === 'timer') return root([
    row([
      stack([n('text', undefined, 'Elapsed time'), n('muted', undefined, 'Session timer')]),
      n('badge', undefined, 'Paused', undefined, { className: 'timer-anatomy-status' }),
    ], 'timer-anatomy-heading'),
    n('panel', 'area', undefined, [
      n('item', 'item', '00', undefined, { value: 'minutes' }),
      n('separator', 'separator', ':'),
      n('item', 'item', '18', undefined, { value: 'seconds' }),
    ], { className: 'timer-anatomy-area' }),
    n('toolbar', 'control', undefined, [
      n('button', 'action-trigger', 'Pause', undefined, { icon: 'pause', value: 'pause' }),
      n('button', 'action-trigger', 'Reset', undefined, { icon: 'rotate-ccw', value: 'reset' }),
    ], { className: 'timer-anatomy-actions' }),
  ], 'timer-root');
  if (kind === 'toast') return n('viewport', 'viewport', undefined, [n('root', 'root', undefined, [n('text', 'title', 'Changes saved'), n('muted', 'description', 'Your project settings were updated.'), iconButton('close', 'x', 'Dismiss')], { className: 'toast-card' })], { className: 'toast-viewport' });
  return root([
    n('pane', 'pane', undefined, [
      n('text', undefined, 'Project files'),
      n('muted', undefined, 'src / components'),
    ], { className: 'splitter-pane splitter-pane-navigation' }),
    n('handle', 'handle'),
    n('pane', 'pane', undefined, [
      n('text', undefined, 'Editor'),
      n('muted', undefined, 'SplitPane.vue'),
    ], { className: 'splitter-pane splitter-pane-editor' }),
  ], 'splitter-root');
}

function previewFor(component: string): AnatomyPreviewNode {
  if (component === 'checkbox') return checkboxPreview();
  if (component === 'checkbox-group') return checkboxPreview(true);
  if (['text', 'number-field', 'date-field', 'date-time-field', 'time-field'].includes(component)) return fieldPreview(component);
  if (['date-range-field', 'time-range-field'].includes(component)) return rangeFieldPreview(component);
  if (['calendar', 'date-picker', 'date-range-picker', 'date-time-picker', 'date-time-range-picker'].includes(component)) return datePickerPreview(component);
  if (['range-calendar', 'month-picker', 'month-range-picker', 'year-picker', 'year-range-picker'].includes(component)) return periodPickerPreview(component);
  if (component === 'slider') return sliderPreview();
  if (component === 'multi-thumb-slider') return sliderPreview(true);
  if (['dialog', 'alert-dialog', 'popover', 'tooltip'].includes(component)) return popupPreview(component);
  if (['listbox', 'select', 'combobox', 'cascade-select'].includes(component)) return listChoicePreview(component);
  if (['menu', 'menu-button', 'menubar', 'navigation-menu'].includes(component)) return menuPreview(component);
  if (['grid', 'tree-grid', 'tree-view', 'feed'].includes(component)) return collectionPreview(component);
  if (['rating', 'radio-group', 'switch', 'toggle-button', 'toggle-group'].includes(component)) return feedbackPreview(component);
  if (['tags-input', 'pin-input', 'editable'].includes(component)) return inputCollectionPreview(component);
  if (['spin-button', 'quantity-field'].includes(component)) return numberControlPreview(component);
  if (component === 'color-picker') return colorPreview();
  if (component === 'carousel') return carouselPreview();
  if (['pagination', 'tabs', 'stepper'].includes(component)) return navigationPreview(component);
  if (['accordion', 'disclosure'].includes(component)) return expansionPreview(component);
  if (['toolbar', 'timer', 'toast', 'window-splitter'].includes(component)) return utilityPreview(component);
  throw new Error(`Missing anatomy preview for ${component}`);
}

export const componentAnatomy = Object.freeze<Record<string, ComponentAnatomyDefinition>>({
  accordion: anatomy('accordion', ['root', 'item', 'header', 'trigger', 'content']),
  'alert-dialog': anatomy('alert-dialog', popupParts),
  calendar: anatomy('calendar', ['root', 'cell']),
  carousel: anatomy('carousel', ['root', 'viewport', 'track', 'slide', 'previous', 'next', 'pause', 'indicator-group', 'indicator']),
  'cascade-select': anatomy('cascade-select', ['root', 'trigger', 'value', 'content', 'column', 'item', 'item-indicator', 'item-chevron']),
  'checkbox-group': anatomy('checkbox-group', ['root', 'item', 'indicator']),
  checkbox: anatomy('checkbox', ['root', 'indicator']),
  'color-picker': anatomy('color-picker', ['root', 'label', 'control', 'native-input', 'text-input', 'channel-input', 'coordinate-input', 'coordinate-slider', 'area', 'area-thumb', 'hue-slider', 'alpha-slider', 'swatch', 'value-text', 'format-trigger']),
  combobox: anatomy('combobox', ['root', 'input', 'content', 'item', 'empty']),
  'date-field': anatomy('date-field', fieldParts),
  'date-range-field': anatomy('date-range-field', ['root', 'start-input', 'end-input']),
  'date-range-picker': anatomy('date-range-picker', rangePickerParts),
  'date-time-field': anatomy('date-time-field', fieldParts),
  'date-time-picker': anatomy('date-time-picker', ['date-time-input', 'date-input', 'time-input', 'trigger', 'content', 'week-view-trigger', 'month-view-trigger', 'year-view-trigger', 'previous-week', 'next-week', 'previous-month', 'next-month', 'previous-year', 'next-year', 'grid', 'cell', 'month-cell']),
  'date-time-range-picker': anatomy('date-time-range-picker', ['start-date-time-input', 'end-date-time-input', 'start-date-input', 'end-date-input', 'start-time-input', 'end-time-input', 'trigger', 'content', 'week-view-trigger', 'month-view-trigger', 'year-view-trigger', 'previous-week', 'next-week', 'previous-month', 'next-month', 'previous-year', 'next-year', 'grid', 'cell', 'month-cell']),
  'date-picker': anatomy('date-picker', pickerParts),
  dialog: anatomy('dialog', popupParts),
  disclosure: anatomy('disclosure', ['root', 'trigger', 'content']),
  editable: anatomy('editable', ['root', 'area', 'preview', 'input', 'edit-trigger', 'submit-trigger', 'cancel-trigger']),
  feed: anatomy('feed', ['root', 'item', 'load-earlier', 'load-newer']),
  grid: anatomy('grid', ['root', 'row', 'cell']),
  listbox: anatomy('listbox', ['root', 'item', 'item-text', 'item-indicator']),
  menu: anatomy('menu', ['root', 'item', 'sub-content', 'separator'], menuPartDetails()),
  'menu-button': anatomy('menu-button', ['trigger', 'content', 'item', 'sub-content', 'separator'], menuPartDetails('menu-button')),
  menubar: anatomy('menubar', ['root', 'item', 'sub-content', 'separator'], menuPartDetails('menubar')),
  'month-picker': anatomy('month-picker', ['input', 'trigger', 'content', 'grid', 'cell', 'previous-year', 'next-year']),
  'month-range-picker': anatomy('month-range-picker', ['start-input', 'end-input', 'trigger', 'content', 'grid', 'cell', 'previous-year', 'next-year']),
  'multi-thumb-slider': anatomy('multi-thumb-slider', ['root', 'track', 'range', 'thumb']),
  'navigation-menu': anatomy('navigation-menu', ['root', 'list', 'item-container', 'item', 'sub-content', 'viewport', 'indicator'], menuPartDetails('navigation-menu')),
  'number-field': anatomy('number-field', fieldParts),
  pagination: anatomy('pagination', ['root', 'first', 'previous', 'item', 'next', 'last']),
  'pin-input': anatomy('pin-input', ['root', 'input']),
  popover: anatomy('popover', ['trigger', 'anchor', 'content', 'title', 'description', 'close', 'arrow']),
  'quantity-field': anatomy('quantity-field', ['root', 'input', 'unit-select', 'value']),
  'radio-group': anatomy('radio-group', ['root', 'item', 'indicator']),
  'range-calendar': anatomy('range-calendar', ['content', 'grid', 'cell', 'previous-month', 'next-month', 'previous-year', 'next-year']),
  rating: anatomy('rating', ['root', 'item', 'indicator', 'clear']),
  select: anatomy('select', ['root', 'trigger', 'value', 'content', 'item', 'item-indicator']),
  slider: anatomy('slider', ['root', 'track', 'range', 'thumb']),
  'spin-button': anatomy('spin-button', ['root', 'input', 'increment', 'decrement']),
  stepper: anatomy('stepper', ['root', 'list', 'step', 'indicator', 'content']),
  switch: anatomy('switch', ['root', 'thumb']),
  tabs: anatomy('tabs', ['root', 'list', 'trigger', 'indicator', 'content']),
  'tags-input': anatomy('tags-input', ['root', 'item', 'item-text', 'item-delete', 'input', 'clear']),
  text: anatomy('text', fieldParts),
  'time-field': anatomy('time-field', fieldParts),
  'time-range-field': anatomy('time-range-field', ['root', 'start-input', 'end-input']),
  timer: anatomy('timer', ['root', 'area', 'item', 'separator', 'control', 'action-trigger']),
  toast: anatomy('toast', ['viewport', 'root', 'title', 'description', 'close']),
  'toggle-button': anatomy('toggle-button', ['root']),
  'toggle-group': anatomy('toggle-group', ['root', 'item']),
  toolbar: anatomy('toolbar', ['root', 'item', 'separator']),
  tooltip: anatomy('tooltip', ['trigger', 'content', 'arrow']),
  'tree-grid': anatomy('tree-grid', ['root', 'row', 'cell', 'disclosure', 'editor']),
  'tree-view': anatomy('tree-view', ['root', 'group', 'item', 'disclosure']),
  'window-splitter': anatomy('window-splitter', ['root', 'pane', 'handle']),
  'year-picker': anatomy('year-picker', ['input', 'trigger', 'content', 'grid', 'cell', 'previous-page', 'next-page']),
  'year-range-picker': anatomy('year-range-picker', ['start-input', 'end-input', 'trigger', 'content', 'grid', 'cell', 'previous-page', 'next-page']),
});

function menuPartDetails(rootScope = 'menu'): Readonly<Record<string, AnatomyPartDetail>> {
  const nestedScope = rootScope === 'navigation-menu' ? 'navigation-menu' : 'menu';
  return Object.freeze({
    item: Object.freeze({
      scope: rootScope === 'menu-button' ? 'menu' : rootScope,
      attributes: Object.freeze([['data-level', '<depth>'] as const]),
      purpose: Object.freeze({
        en: 'Menu item at any hierarchy depth; use data-level to distinguish top-level and nested items',
        ko: '모든 계층의 메뉴 항목. data-level로 최상위 항목과 중첩 항목을 구분',
      }),
    }),
    'sub-content': Object.freeze({
      scope: nestedScope,
      attributes: Object.freeze([['data-level', '<depth>'] as const]),
      purpose: Object.freeze({
        en: 'Popup content owned by a parent menu item',
        ko: '상위 메뉴 항목이 소유하는 팝업 콘텐츠',
      }),
    }),
    separator: Object.freeze({ scope: 'menu' }),
  });
}

function anatomy(
  scope: string,
  parts: readonly string[],
  partDetails: Readonly<Record<string, AnatomyPartDetail>> = Object.freeze({}),
): ComponentAnatomyDefinition {
  const preview = previewFor(scope);
  const visibleParts = collectPreviewParts(preview);
  const declaredParts = new Set(parts);
  const missingParts = parts.filter((part) => !visibleParts.has(part));
  if (missingParts.length > 0) {
    throw new Error(`Missing anatomy regions for ${scope}: ${missingParts.join(', ')}`);
  }
  const unexpectedParts = [...visibleParts].filter((part) => !declaredParts.has(part));
  if (unexpectedParts.length > 0) {
    throw new Error(`Undeclared anatomy regions for ${scope}: ${unexpectedParts.join(', ')}`);
  }
  return Object.freeze({ scope, parts: Object.freeze([...parts]), preview, partDetails });
}

function collectPreviewParts(node: AnatomyPreviewNode, parts = new Set<string>()): Set<string> {
  if (node.part) parts.add(node.part);
  for (const child of node.children ?? []) collectPreviewParts(child, parts);
  return parts;
}
