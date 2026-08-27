export interface ComponentSection {
  readonly text: string;
  readonly koText: string;
  readonly componentIds: readonly string[];
}

export const componentSections = [
  {
    text: 'Input & Editing',
    koText: '입력과 편집',
    componentIds: [
      'color-picker',
      'editable',
      'form',
      'number-field',
      'pin-input',
      'quantity-field',
      'tags-input',
      'text',
    ],
  },
  {
    text: 'Selection & Choice',
    koText: '선택과 토글',
    componentIds: [
      'checkbox',
      'checkbox-group',
      'radio-group',
      'select',
      'combobox',
      'listbox',
      'cascade-select',
      'rating',
      'switch',
      'toggle-button',
      'toggle-group',
    ],
  },
  {
    text: 'Date & Time',
    koText: '날짜와 시간',
    componentIds: [
      'calendar',
      'date-field',
      'date-picker',
      'date-range-field',
      'date-range-picker',
      'range-calendar',
      'time-field',
      'time-range-field',
      'month-picker',
      'month-range-picker',
      'year-picker',
      'year-range-picker',
      'date-time-field',
      'date-time-picker',
      'date-time-range-picker',
      'timer',
    ],
  },
  {
    text: 'Range & Layout',
    koText: '범위와 배치',
    componentIds: [
      'multi-thumb-slider',
      'slider',
      'spin-button',
      'window-splitter',
    ],
  },
  {
    text: 'Collections & Data',
    koText: '데이터와 모음',
    componentIds: [
      'feed',
      'grid',
      'tree-grid',
      'tree-view',
    ],
  },
  {
    text: 'Menus & Actions',
    koText: '메뉴와 작업',
    componentIds: [
      'menu',
      'menu-button',
      'menubar',
      'toolbar',
    ],
  },
  {
    text: 'Overlays & Feedback',
    koText: '오버레이와 피드백',
    componentIds: [
      'alert-dialog',
      'dialog',
      'drawer',
      'popover',
      'tooltip',
      'toast',
    ],
  },
  {
    text: 'Navigation & Disclosure',
    koText: '이동과 펼침',
    componentIds: [
      'navigation-menu',
      'pagination',
      'tabs',
      'stepper',
      'carousel',
      'accordion',
      'disclosure',
    ],
  },
] as const satisfies readonly ComponentSection[];
