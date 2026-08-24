export interface ComponentAnatomyDefinition {
  readonly scope: string;
  readonly parts: readonly string[];
  readonly partDetails: Readonly<Record<string, AnatomyPartDetail>>;
}

export interface AnatomyPartDetail {
  readonly scope?: string;
  readonly attributes?: readonly (readonly [name: string, value: string])[];
  readonly purpose?: Readonly<{ en: string; ko: string }>;
}

export interface AnatomyPartContract {
  readonly attributes: readonly (readonly [name: string, value: string])[];
  readonly purpose: Readonly<{ en: string; ko: string }>;
}

export function anatomyPartContract(
  definition: ComponentAnatomyDefinition,
  part: string,
): AnatomyPartContract {
  if (!definition.parts.includes(part)) {
    throw new Error(`Unknown anatomy part for ${definition.scope}: ${part}`);
  }

  const detail = definition.partDetails[part];
  return Object.freeze({
    attributes: Object.freeze([
      ['data-scope', detail?.scope ?? definition.scope] as const,
      ['data-part', part] as const,
      ...(detail?.attributes ?? []),
    ]),
    purpose: detail?.purpose ?? anatomyPartPurpose(part),
  });
}

export function anatomyPartLabel(part: string): string {
  return part
    .split('-')
    .map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`)
    .join(' ');
}

export function anatomyPartPurpose(part: string): Readonly<{ en: string; ko: string }> {
  const direct = partPurposes[part];
  if (direct !== undefined) return direct;

  const endpoint = /^(start|end)-(date-time|date|time|input)$/u.exec(part);
  if (endpoint !== null) {
    const [, side, value] = endpoint;
    const sideEn = side === 'start' ? 'start' : 'end';
    const sideKo = side === 'start' ? '시작' : '종료';
    const valueEn = value === 'date-time' ? 'date and time' : value === 'input' ? 'value' : value;
    const valueKo = value === 'date-time' ? '날짜와 시간' : value === 'date' ? '날짜' : value === 'time' ? '시간' : '값';
    return copy(`Edits the ${sideEn} ${valueEn}.`, `${sideKo} ${valueKo}을 편집합니다.`);
  }

  const navigation = /^(previous|next)-(week|month|year|page)$/u.exec(part);
  if (navigation !== null) {
    const direction = navigation[1] as 'previous' | 'next';
    const unit = navigation[2] as 'week' | 'month' | 'year' | 'page';
    const directionEn = direction === 'previous' ? 'previous' : 'next';
    const directionKo = direction === 'previous' ? '이전' : '다음';
    const unitKo = { week: '주', month: '월', year: '년', page: '페이지' }[unit] ?? unit;
    return copy(`Moves to the ${directionEn} ${unit}.`, `${directionKo} ${unitKo}(으)로 이동합니다.`);
  }

  const view = /^(week|month|year)-view-trigger$/u.exec(part);
  if (view !== null) {
    const unit = view[1] as 'week' | 'month' | 'year';
    const unitKo = { week: '주', month: '월', year: '년' }[unit] ?? unit;
    return copy(`Switches the calendar to the ${unit} view.`, `달력을 ${unitKo} 보기로 전환합니다.`);
  }

  return copy(
    `Exposes the ${anatomyPartLabel(part).toLowerCase()} styling region.`,
    `${anatomyPartLabel(part)} 스타일 영역을 노출합니다.`,
  );
}

function copy(en: string, ko: string): Readonly<{ en: string; ko: string }> {
  return Object.freeze({ en, ko });
}

const partPurposes = Object.freeze<Record<string, Readonly<{ en: string; ko: string }>>>({
  root: copy('Defines the component boundary and owns its composed parts.', '컴포넌트 경계와 내부 파트를 묶습니다.'),
  list: copy('Groups the component items in navigation order.', '컴포넌트 항목을 탐색 순서대로 묶습니다.'),
  group: copy('Groups related child items.', '관련 하위 항목을 묶습니다.'),
  item: copy('Represents one selectable or actionable item.', '선택하거나 실행할 수 있는 항목 하나입니다.'),
  'item-container': copy('Positions one top-level item and its nested content.', '최상위 항목과 중첩 콘텐츠를 함께 배치합니다.'),
  'item-text': copy('Renders the item label independently from its controls.', '항목 레이블을 조작부와 분리해 표시합니다.'),
  'item-delete': copy('Removes its owning item.', '해당 항목을 제거합니다.'),
  'item-indicator': copy('Shows the item selection state.', '항목의 선택 상태를 표시합니다.'),
  'item-chevron': copy('Shows that an item opens a deeper level.', '항목에 하위 단계가 있음을 표시합니다.'),
  input: copy('Accepts the editable value or draft.', '편집 값이나 초안을 입력받습니다.'),
  'native-input': copy('Keeps the native form control available for submission and platform behavior.', '폼 제출과 플랫폼 동작을 위한 네이티브 입력을 유지합니다.'),
  'text-input': copy('Accepts a formatted text representation of the value.', '서식화된 텍스트 값 입력을 받습니다.'),
  'channel-input': copy('Edits one color channel numerically.', '색상 채널 하나를 숫자로 편집합니다.'),
  'coordinate-input': copy('Edits one coordinate of the current value.', '현재 값의 좌표 하나를 편집합니다.'),
  'coordinate-slider': copy('Adjusts one coordinate over a bounded range.', '한 좌표를 제한된 범위에서 조절합니다.'),
  'date-time-input': copy('Edits a combined date and time value.', '날짜와 시간을 하나의 값으로 편집합니다.'),
  'date-input': copy('Edits the date portion of a date-time value.', '날짜·시간 값의 날짜 부분을 편집합니다.'),
  'time-input': copy('Edits the time portion of a date-time value.', '날짜·시간 값의 시간 부분을 편집합니다.'),
  trigger: copy('Opens, closes, or activates the associated content.', '연결된 콘텐츠를 열고 닫거나 활성화합니다.'),
  'format-trigger': copy('Changes the active value format.', '현재 값의 표시 형식을 바꿉니다.'),
  'edit-trigger': copy('Enters editing mode.', '편집 모드로 전환합니다.'),
  'submit-trigger': copy('Commits the current draft.', '현재 초안을 확정합니다.'),
  'cancel-trigger': copy('Discards the current draft.', '현재 초안을 취소합니다.'),
  'action-trigger': copy('Invokes a timer action.', '타이머 동작을 실행합니다.'),
  content: copy('Contains the component content shown for the active state.', '현재 상태에 맞는 컴포넌트 콘텐츠를 담습니다.'),
  'sub-content': copy('Contains a nested level owned by a parent item.', '상위 항목이 소유하는 중첩 단계를 담습니다.'),
  overlay: copy('Covers surrounding content while a modal surface is open.', '모달이 열린 동안 주변 콘텐츠를 덮습니다.'),
  anchor: copy('Provides the positioning reference for floating content.', '떠 있는 콘텐츠의 배치 기준을 제공합니다.'),
  arrow: copy('Visually connects floating content to its anchor.', '떠 있는 콘텐츠와 기준점을 시각적으로 연결합니다.'),
  title: copy('Labels the associated content.', '연결된 콘텐츠의 제목을 표시합니다.'),
  description: copy('Describes the associated content or decision.', '연결된 콘텐츠나 결정 내용을 설명합니다.'),
  close: copy('Closes or dismisses the current surface.', '현재 화면을 닫거나 해제합니다.'),
  clear: copy('Clears the current value or collection.', '현재 값이나 항목 모음을 비웁니다.'),
  value: copy('Displays the current committed value.', '현재 확정 값을 표시합니다.'),
  'value-text': copy('Displays the formatted value as text.', '서식화된 값을 텍스트로 표시합니다.'),
  label: copy('Labels the component control.', '컴포넌트 조작부의 레이블입니다.'),
  preview: copy('Shows the committed value outside editing mode.', '편집 모드 밖에서 확정 값을 표시합니다.'),
  empty: copy('Shows feedback when no collection item matches.', '일치하는 항목이 없을 때 안내를 표시합니다.'),
  control: copy('Groups the primary interactive controls.', '주요 조작부를 묶습니다.'),
  area: copy('Provides the two-dimensional interaction surface.', '2차원 조작 영역을 제공합니다.'),
  'area-thumb': copy('Marks and controls the selected point in the area.', '2차원 영역의 선택 지점을 표시하고 조절합니다.'),
  'hue-slider': copy('Adjusts the color hue.', '색상 색조를 조절합니다.'),
  'alpha-slider': copy('Adjusts color opacity.', '색상 불투명도를 조절합니다.'),
  swatch: copy('Previews the selected color.', '선택한 색상을 미리 보여줍니다.'),
  track: copy('Defines the measurable path used by one or more thumbs.', '하나 이상의 핸들이 이동하는 측정 경로입니다.'),
  range: copy('Shows the active interval on the track.', '트랙 위의 활성 범위를 표시합니다.'),
  thumb: copy('Controls one value along the track.', '트랙 위의 값 하나를 조절합니다.'),
  viewport: copy('Clips and positions the currently visible content.', '현재 보이는 콘텐츠를 배치하고 경계를 정합니다.'),
  slide: copy('Represents one carousel page.', '캐러셀 페이지 하나를 나타냅니다.'),
  previous: copy('Moves to the previous item or page.', '이전 항목이나 페이지로 이동합니다.'),
  next: copy('Moves to the next item or page.', '다음 항목이나 페이지로 이동합니다.'),
  first: copy('Moves to the first page.', '첫 페이지로 이동합니다.'),
  last: copy('Moves to the last page.', '마지막 페이지로 이동합니다.'),
  pause: copy('Pauses or resumes automatic movement.', '자동 이동을 일시 정지하거나 다시 시작합니다.'),
  'indicator-group': copy('Groups direct position controls.', '직접 위치 이동 조작부를 묶습니다.'),
  indicator: copy('Shows state or position without replacing the primary content.', '주요 콘텐츠를 가리지 않고 상태나 위치를 표시합니다.'),
  grid: copy('Groups cells into a navigable two-dimensional structure.', '셀을 탐색 가능한 2차원 구조로 묶습니다.'),
  row: copy('Groups cells that belong to one grid row.', '같은 그리드 행에 속한 셀을 묶습니다.'),
  cell: copy('Represents one navigable or selectable grid value.', '탐색하거나 선택할 수 있는 그리드 값 하나입니다.'),
  'month-cell': copy('Represents one selectable month.', '선택할 수 있는 월 하나입니다.'),
  column: copy('Groups one level of hierarchical choices.', '계층형 선택 항목의 한 단계를 묶습니다.'),
  header: copy('Provides the semantic heading for an expandable item.', '펼칠 수 있는 항목의 의미론적 제목입니다.'),
  disclosure: copy('Expands or collapses child content.', '하위 콘텐츠를 펼치거나 접습니다.'),
  separator: copy('Separates related groups without becoming an action.', '동작을 추가하지 않고 관련 그룹을 구분합니다.'),
  editor: copy('Edits the active grid or tree-grid cell.', '활성 그리드 또는 트리 그리드 셀을 편집합니다.'),
  pane: copy('Contains one resizable region.', '크기를 조절할 수 있는 영역 하나를 담습니다.'),
  handle: copy('Resizes adjacent panes.', '인접한 영역의 크기를 조절합니다.'),
  step: copy('Represents one ordered workflow step.', '순서가 있는 작업 단계 하나입니다.'),
  'unit-select': copy('Chooses the unit applied to the numeric value.', '숫자 값에 적용할 단위를 선택합니다.'),
  increment: copy('Increases the value by one configured step.', '설정된 한 단계만큼 값을 늘립니다.'),
  decrement: copy('Decreases the value by one configured step.', '설정된 한 단계만큼 값을 줄입니다.'),
  'load-earlier': copy('Requests items before the visible feed window.', '현재 피드보다 이전 항목을 요청합니다.'),
  'load-newer': copy('Requests items after the visible feed window.', '현재 피드보다 이후 항목을 요청합니다.'),
});

const popupParts = ['trigger', 'overlay', 'content', 'title', 'description', 'close'] as const;
const fieldParts = ['input'] as const;
const rangePickerParts = [
  'start-input', 'end-input', 'trigger', 'content', 'week-view-trigger',
  'month-view-trigger', 'year-view-trigger', 'previous-week', 'next-week',
  'previous-month', 'next-month', 'previous-year', 'next-year', 'grid', 'cell',
  'month-cell',
] as const;
const pickerParts = [
  'input', 'trigger', 'content', 'week-view-trigger', 'month-view-trigger',
  'year-view-trigger', 'previous-week', 'next-week', 'previous-month', 'next-month',
  'previous-year', 'next-year', 'grid', 'cell', 'month-cell',
] as const;

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
  form: anatomy('form', ['root', 'field', 'label', 'description', 'message', 'summary', 'submit']),
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
    ...(rootScope === 'navigation-menu'
      ? {}
      : { separator: Object.freeze({ scope: 'menu' }) }),
  });
}

function anatomy(
  scope: string,
  parts: readonly string[],
  partDetails: Readonly<Record<string, AnatomyPartDetail>> = Object.freeze({}),
): ComponentAnatomyDefinition {
  if (parts.length === 0) throw new Error(`Anatomy requires public parts: ${scope}`);
  const duplicates = parts.filter((part, index) => parts.indexOf(part) !== index);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate anatomy parts for ${scope}: ${[...new Set(duplicates)].join(', ')}`);
  }
  const unknownDetails = Object.keys(partDetails).filter((part) => !parts.includes(part));
  if (unknownDetails.length > 0) {
    throw new Error(`Unknown anatomy part details for ${scope}: ${unknownDetails.join(', ')}`);
  }
  return Object.freeze({
    scope,
    parts: Object.freeze([...parts]),
    partDetails,
  });
}
