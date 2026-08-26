const row = (keys, behavior, behaviorKo) => Object.freeze({ keys, behavior, behaviorKo });

const profiles = Object.freeze({
  toggle: [
    row('Space', 'Toggle the current value.', '현재 값을 전환합니다.'),
    row('Tab', 'Move through the normal document focus order.', '문서의 기본 포커스 순서로 이동합니다.'),
  ],
  disclosure: [
    row('Enter / Space', 'Toggle the associated content.', '연결된 내용을 펼치거나 접습니다.'),
    row('Tab', 'Move between the trigger and surrounding controls.', '실행 요소와 주변 컨트롤 사이를 이동합니다.'),
  ],
  accordion: [
    row('Enter / Space', 'Toggle the focused section.', '포커스된 절을 펼치거나 접습니다.'),
    row('Arrow Up / Arrow Down', 'Move focus between section triggers.', '절 실행 요소 사이에서 포커스를 이동합니다.'),
    row('Home / End', 'Move focus to the first or last section trigger.', '첫 번째 또는 마지막 절 실행 요소로 이동합니다.'),
  ],
  segmentedInput: [
    row('Arrow Up / Arrow Down', 'Increment or decrement the active value segment.', '현재 값 구간을 증가시키거나 감소시킵니다.'),
    row('Enter', 'Commit the draft value.', '입력 중인 값을 확정합니다.'),
    row('Escape', 'Cancel the draft and restore the accepted value.', '입력을 취소하고 확정된 값을 복원합니다.'),
  ],
  textInput: [
    row('Standard editing keys', 'Edit and select text with the host input conventions.', '호스트 입력 관례에 따라 텍스트를 편집하고 선택합니다.'),
    row('Tab', 'Commit focus movement without replacing native text behavior.', '기본 텍스트 동작을 유지하며 포커스를 이동합니다.'),
  ],
  editable: [
    row('Enter', 'Start editing from the preview, or commit a single-line draft.', '미리보기에서 편집을 시작하거나 한 줄 입력을 확정합니다.'),
    row('Escape', 'Cancel editing and restore the accepted value.', '편집을 취소하고 확정된 값을 복원합니다.'),
    row('Tab', 'Move through the preview, input, and explicit action controls.', '미리보기, 입력, 작업 컨트롤 사이를 이동합니다.'),
  ],
  form: [
    row('Tab / Shift+Tab', 'Move through native form controls in document order.', '네이티브 폼 컨트롤을 문서 순서대로 이동합니다.'),
    row('Enter', 'Submit from an eligible native control and validate registered fields.', '제출 가능한 네이티브 컨트롤에서 폼을 제출하고 등록된 필드를 검증합니다.'),
  ],
  listChoice: [
    row('Arrow keys', 'Move the active option in the visible orientation.', '보이는 방향에 따라 현재 선택 항목을 이동합니다.'),
    row('Home / End', 'Move to the first or last eligible option.', '선택 가능한 첫 번째 또는 마지막 항목으로 이동합니다.'),
    row('Enter / Space', 'Select or activate the current option.', '현재 항목을 선택하거나 실행합니다.'),
    row('Printable text', 'Move to the next matching option when typeahead is available.', '글자 검색을 지원하면 다음 일치 항목으로 이동합니다.'),
  ],
  checkboxGroup: [
    row('Tab', 'Move focus into and out of the group.', '묶음 안팎으로 포커스를 이동합니다.'),
    row('Space', 'Toggle the focused checkbox item.', '포커스된 체크박스 항목을 전환합니다.'),
  ],
  tabs: [
    row('Arrow Left / Arrow Right', 'Move between tabs in a horizontal list.', '가로 탭 목록에서 탭 사이를 이동합니다.'),
    row('Arrow Up / Arrow Down', 'Move between tabs in a vertical list.', '세로 탭 목록에서 탭 사이를 이동합니다.'),
    row('Home / End', 'Move to the first or last tab.', '첫 번째 또는 마지막 탭으로 이동합니다.'),
    row('Enter / Space', 'Activate the focused tab in manual activation mode.', '직접 실행 모드에서 포커스된 탭을 엽니다.'),
  ],
  range: [
    row('Arrow Right / Arrow Up', 'Increase the value by one step.', '값을 한 단계 증가시킵니다.'),
    row('Arrow Left / Arrow Down', 'Decrease the value by one step.', '값을 한 단계 감소시킵니다.'),
    row('Home / End', 'Move to the minimum or maximum value.', '최솟값 또는 최댓값으로 이동합니다.'),
    row('Page Up / Page Down', 'Change the value by the configured page step when supported.', '지원되는 경우 설정된 큰 단계만큼 값을 바꿉니다.'),
  ],
  calendar: [
    row('Arrow Left / Arrow Right', 'Move by one day.', '하루 전 또는 다음 날로 이동합니다.'),
    row('Arrow Up / Arrow Down', 'Move by one week.', '일주일 전 또는 다음 주로 이동합니다.'),
    row('Home / End', 'Move to the start or end of the week.', '한 주의 시작 또는 끝으로 이동합니다.'),
    row('Page Up / Page Down', 'Move by one month; hold Shift to move by one year.', '한 달 단위로 이동하고, Shift와 함께 누르면 일 년 단위로 이동합니다.'),
    row('Enter / Space', 'Select the highlighted date.', '현재 강조된 날짜를 선택합니다.'),
  ],
  datePicker: [
    row('Arrow keys', 'Move the highlighted date by one day or one week.', '강조된 날짜를 하루 또는 일주일 단위로 이동합니다.'),
    row('Home / End', 'Move to the start or end of the week.', '한 주의 시작 또는 끝으로 이동합니다.'),
    row('Page Up / Page Down', 'Move by one month; hold Shift to move by one year.', '한 달 단위로 이동하고, Shift와 함께 누르면 일 년 단위로 이동합니다.'),
    row('Enter / Space', 'Select the highlighted date.', '강조된 날짜를 선택합니다.'),
    row('Escape', 'Close the calendar without selecting another date.', '다른 날짜를 선택하지 않고 달력을 닫습니다.'),
  ],
  monthPicker: [
    row('Arrow keys', 'Move between months in the year grid.', '연도 격자에서 달 사이를 이동합니다.'),
    row('Page Up / Page Down', 'Move to the previous or next year.', '이전 또는 다음 연도로 이동합니다.'),
    row('Enter / Space', 'Select the highlighted month.', '강조된 달을 선택합니다.'),
    row('Escape', 'Close the month grid without changing the value.', '값을 바꾸지 않고 월 격자를 닫습니다.'),
  ],
  yearPicker: [
    row('Arrow keys', 'Move between years in the active page.', '현재 페이지의 연도 사이를 이동합니다.'),
    row('Page Up / Page Down', 'Move to the previous or next page of years.', '이전 또는 다음 연도 페이지로 이동합니다.'),
    row('Enter / Space', 'Select the highlighted year.', '강조된 연도를 선택합니다.'),
    row('Escape', 'Close the year grid without changing the value.', '값을 바꾸지 않고 연도 격자를 닫습니다.'),
  ],
  popup: [
    row('Enter / Space', 'Activate the trigger or focused action.', '실행 요소나 포커스된 작업을 실행합니다.'),
    row('Tab / Shift+Tab', 'Move through available controls; modal content keeps focus inside.', '사용 가능한 컨트롤 사이를 이동하며 모달 내용은 포커스를 내부에 유지합니다.'),
    row('Escape', 'Close the popup and restore focus when configured.', '팝업을 닫고 설정된 경우 포커스를 복원합니다.'),
  ],
  drawer: [
    row('Enter / Space', 'Activate the trigger or focused action.', '실행 요소나 포커스된 작업을 실행합니다.'),
    row('Tab / Shift+Tab', 'Move through controls while modal focus remains inside.', '모달 포커스를 내부에 유지하며 컨트롤 사이를 이동합니다.'),
    row('Escape', 'Close the drawer and restore focus when configured.', '드로어를 닫고 설정된 경우 포커스를 복원합니다.'),
    row('Pointer swipe', 'Drag the handle outward past the distance or velocity threshold to dismiss.', '핸들을 바깥 방향으로 거리 또는 속도 기준 이상 밀어 닫습니다.'),
  ],
  tooltip: [
    row('Tab', 'Reveal the tooltip when its trigger receives keyboard focus.', '실행 요소가 키보드 포커스를 받으면 도움말을 표시합니다.'),
    row('Escape', 'Dismiss the visible tooltip.', '표시된 도움말을 닫습니다.'),
  ],
  menu: [
    row('Arrow Up / Arrow Down', 'Move between items at the current menu level.', '현재 메뉴 단계의 항목 사이를 이동합니다.'),
    row('Arrow Right / Arrow Left', 'Open a submenu or return to its parent.', '하위 메뉴를 열거나 상위 메뉴로 돌아갑니다.'),
    row('Home / End', 'Move to the first or last item at the current level.', '현재 단계의 첫 번째 또는 마지막 항목으로 이동합니다.'),
    row('Enter / Space', 'Open a submenu or invoke the current item.', '하위 메뉴를 열거나 현재 항목을 실행합니다.'),
    row('Escape', 'Close the current menu level.', '현재 메뉴 단계를 닫습니다.'),
  ],
  menubar: [
    row('Arrow Left / Arrow Right', 'Move between root menu items.', '최상위 메뉴 항목 사이를 이동합니다.'),
    row('Arrow Down / Arrow Up', 'Open a branch or move inside its vertical item list.', '하위 메뉴를 열거나 세로 항목 목록 안에서 이동합니다.'),
    row('Home / End', 'Move to the first or last item at the current level.', '현재 단계의 첫 번째 또는 마지막 항목으로 이동합니다.'),
    row('Enter / Space', 'Open a branch or invoke the current item.', '하위 메뉴를 열거나 현재 항목을 실행합니다.'),
    row('Escape', 'Close the branch and return to its owner.', '하위 메뉴를 닫고 이를 연 항목으로 돌아갑니다.'),
  ],
  combobox: [
    row('Arrow Down / Arrow Up', 'Open the popup and move the active option.', '팝업을 열고 현재 선택 항목을 이동합니다.'),
    row('Enter', 'Accept the active option.', '현재 선택 항목을 확정합니다.'),
    row('Escape', 'Close the popup without replacing the accepted value.', '확정된 값을 바꾸지 않고 팝업을 닫습니다.'),
    row('Text input', 'Filter options without breaking IME composition.', 'IME 조합 입력을 방해하지 않고 항목을 검색합니다.'),
  ],
  grid: [
    row('Arrow keys', 'Move between grid cells.', '격자 칸 사이를 이동합니다.'),
    row('Space', 'Select the current cell or row.', '현재 칸이나 행을 선택합니다.'),
    row('Enter / F2', 'Enter edit mode when the current cell supports editing.', '현재 칸이 편집을 지원하면 편집 모드로 들어갑니다.'),
    row('Escape', 'Cancel the active edit.', '현재 편집을 취소합니다.'),
  ],
  tree: [
    row('Arrow Up / Arrow Down', 'Move between visible tree items.', '보이는 트리 항목 사이를 이동합니다.'),
    row('Arrow Right', 'Expand a branch or move into its first child.', '가지를 펼치거나 첫 번째 자식으로 이동합니다.'),
    row('Arrow Left', 'Collapse a branch or move to its parent.', '가지를 접거나 부모로 이동합니다.'),
    row('Enter / Space', 'Select or activate the current item.', '현재 항목을 선택하거나 실행합니다.'),
  ],
  feed: [
    row('Arrow Down / Page Down', 'Move to the next article.', '다음 글로 이동합니다.'),
    row('Arrow Up / Page Up', 'Move to the previous article.', '이전 글로 이동합니다.'),
    row('Tab', 'Move into interactive controls inside the current article.', '현재 글 안의 상호작용 컨트롤로 이동합니다.'),
  ],
  tags: [
    row('Enter / Comma', 'Commit the current input as a tag.', '현재 입력을 태그로 확정합니다.'),
    row('Arrow Left / Arrow Right', 'Move between the input and existing tags.', '입력란과 기존 태그 사이를 이동합니다.'),
    row('Backspace / Delete', 'Move to or remove the current tag according to cursor state.', '커서 상태에 따라 현재 태그로 이동하거나 삭제합니다.'),
  ],
  pin: [
    row('Arrow Left / Arrow Right', 'Move between digit inputs.', '숫자 입력란 사이를 이동합니다.'),
    row('Backspace / Delete', 'Clear a digit and preserve the expected cursor movement.', '숫자를 지우고 기대되는 커서 이동을 유지합니다.'),
    row('Text input', 'Accept valid characters and advance when the field is complete.', '올바른 문자를 받고 입력이 끝나면 다음 칸으로 이동합니다.'),
  ],
  color: [
    row('Arrow keys', 'Adjust the active color coordinate or slider.', '현재 색상 좌표나 슬라이더 값을 조절합니다.'),
    row('Enter', 'Commit a typed color value.', '입력한 색상 값을 확정합니다.'),
    row('Escape', 'Cancel the typed draft and restore the accepted color.', '입력을 취소하고 확정된 색상을 복원합니다.'),
  ],
  pagination: [
    row('Tab', 'Move between pagination controls exposed as native buttons or links.', '버튼이나 링크로 제공되는 페이지 이동 컨트롤 사이를 이동합니다.'),
    row('Enter / Space', 'Activate the focused page or boundary control.', '포커스된 페이지나 경계 이동 컨트롤을 실행합니다.'),
    row('Home / End', 'The terminal projection moves to the first or last page.', '터미널에서는 첫 번째 또는 마지막 페이지로 이동합니다.'),
  ],
  toolbar: [
    row('Arrow keys', 'Move between toolbar items in the configured orientation.', '설정된 방향에 따라 도구 항목 사이를 이동합니다.'),
    row('Home / End', 'Move to the first or last enabled item.', '활성화된 첫 번째 또는 마지막 항목으로 이동합니다.'),
    row('Enter / Space', 'Invoke the focused tool.', '포커스된 도구를 실행합니다.'),
  ],
  carousel: [
    row('Arrow Left / Arrow Right', 'Move to the previous or next slide.', '이전 또는 다음 슬라이드로 이동합니다.'),
    row('Home / End', 'Move to the first or last slide.', '첫 번째 또는 마지막 슬라이드로 이동합니다.'),
    row('Enter / Space', 'Activate native previous, next, pause, or indicator controls.', '기본 이전·다음·일시 정지·표시 컨트롤을 실행합니다.'),
  ],
  actions: [
    row('Tab', 'Move between the component\'s native action controls.', '컴포넌트의 기본 작업 컨트롤 사이를 이동합니다.'),
    row('Enter / Space', 'Invoke the focused action.', '포커스된 작업을 실행합니다.'),
  ],
  toast: [
    row('F8', 'Move focus to the notification viewport.', '알림 표시 영역으로 포커스를 옮깁니다.'),
    row('Tab / Shift+Tab', 'Move between notification action controls.', '알림 작업 컨트롤 사이에서 포커스를 이동합니다.'),
    row('Escape', 'Dismiss the focused notification.', '포커스된 알림을 닫습니다.'),
    row('Pointer swipe', 'Dismiss a notification after moving it past the configured threshold.', '설정한 거리보다 멀리 알림을 밀면 닫습니다.'),
  ],
});

const profileByComponent = Object.freeze({
  accordion: 'accordion', 'alert-dialog': 'popup', calendar: 'calendar', carousel: 'carousel',
  'cascade-select': 'listChoice', 'color-picker': 'color', checkbox: 'toggle', 'checkbox-group': 'checkboxGroup',
  combobox: 'combobox', 'date-field': 'segmentedInput', 'date-range-field': 'segmentedInput',
  'date-time-field': 'segmentedInput', 'date-time-picker': 'datePicker', 'date-time-range-picker': 'datePicker',
  'date-picker': 'datePicker', 'date-range-picker': 'datePicker', dialog: 'popup', drawer: 'drawer', disclosure: 'disclosure',
  'range-calendar': 'datePicker', 'month-picker': 'monthPicker', 'month-range-picker': 'monthPicker',
  'year-picker': 'yearPicker', 'year-range-picker': 'yearPicker',
  editable: 'editable', form: 'form', feed: 'feed', grid: 'grid', listbox: 'listChoice', menu: 'menu',
  'menu-button': 'menu', menubar: 'menubar', 'multi-thumb-slider': 'range', 'navigation-menu': 'menubar',
  'number-field': 'textInput', pagination: 'pagination', 'pin-input': 'pin', popover: 'popup',
  'quantity-field': 'textInput', 'radio-group': 'listChoice', rating: 'listChoice', select: 'listChoice',
  slider: 'range', 'spin-button': 'range', stepper: 'tabs', switch: 'toggle', tabs: 'tabs',
  'tags-input': 'tags', text: 'textInput', 'time-field': 'segmentedInput', 'time-range-field': 'segmentedInput',
  timer: 'actions', toast: 'toast', 'toggle-button': 'toggle', 'toggle-group': 'listChoice',
  toolbar: 'toolbar', tooltip: 'tooltip', 'tree-grid': 'grid', 'tree-view': 'tree', 'window-splitter': 'range',
});

const accessibilityByComponent = Object.freeze({
  accordion: ['Section triggers expose expanded state and control their content regions.', '절 실행 요소가 펼침 상태와 연결된 내용 영역을 노출합니다.'],
  'alert-dialog': ['The alert dialog names its title and description, keeps modal focus inside, and restores focus on close.', '확인 대화상자는 제목과 설명을 연결하고 모달 포커스를 내부에 유지한 뒤 닫힐 때 복원합니다.'],
  calendar: ['The inline content owns a labeled grid whose cells expose selected, highlighted, unavailable, and outside-month state.', '인라인 콘텐츠가 이름 있는 격자를 소유하며 각 칸은 선택·강조·선택 불가·현재 달 외부 상태를 노출합니다.'],
  carousel: ['Slides, navigation controls, pause control, and indicators remain individually named and operable.', '슬라이드, 이동 버튼, 일시 정지 버튼, 표시 항목을 각각 이름이 있고 조작 가능한 요소로 유지합니다.'],
  'cascade-select': ['Each visible column is a labeled listbox; options expose selection, branch, and disabled state.', '각 열은 이름이 있는 목록 상자이며 항목은 선택·하위 가지·비활성 상태를 노출합니다.'],
  'color-picker': ['Text inputs and sliders expose labels, ranges, current values, and channel purpose without relying on color alone.', '텍스트 입력과 슬라이더가 이름, 범위, 현재 값, 색상 채널 역할을 노출해 색만으로 정보를 전달하지 않습니다.'],
  checkbox: ['The root exposes checkbox semantics, including the mixed value through `aria-checked="mixed"`.', '루트는 체크박스 의미를 제공하며 일부 선택 값은 `aria-checked="mixed"`로 노출합니다.'],
  'checkbox-group': ['The labeled group preserves each item as an independently focusable checkbox with checked and disabled state.', '이름이 있는 묶음 안에서 각 항목을 선택·비활성 상태가 있는 독립 체크박스로 유지합니다.'],
  combobox: ['The input exposes autocomplete, expanded state, popup ownership, and the active descendant while options expose selection.', '입력란은 자동 완성·열림·팝업 연결·현재 항목을 노출하고 각 항목은 선택 상태를 노출합니다.'],
  'date-field': ['The labeled input preserves native text entry while announcing invalid, disabled, and readonly state.', '이름이 있는 입력란은 기본 텍스트 입력을 유지하며 오류·비활성·읽기 전용 상태를 전달합니다.'],
  'date-range-field': ['Separate labeled start and end inputs expose a single ordered range without hiding endpoint errors.', '시작과 종료 입력에 각각 이름을 제공하고 양 끝의 오류를 숨기지 않은 하나의 순서 있는 범위로 노출합니다.'],
  'date-time-field': ['The labeled input preserves native text entry while exposing date and time validation as one value.', '이름이 있는 입력란은 기본 텍스트 입력을 유지하며 날짜와 시간 검증을 하나의 값으로 노출합니다.'],
  'date-time-picker': ['Date and time inputs remain labeled while the popup calendar uses grid semantics and an explicit trigger.', '날짜와 시간 입력에 이름을 유지하고 팝업 달력은 격자 의미와 명시적인 실행 요소를 사용합니다.'],
  'date-time-range-picker': ['Two labeled date-time fields and the calendar grid keep the start and end endpoints distinct.', '두 개의 날짜·시간 필드와 달력 격자가 시작·종료 지점을 명확히 구분합니다.'],
  'date-picker': ['The labeled input and trigger own a calendar grid whose cells expose selected, highlighted, and disabled state.', '이름이 있는 입력과 실행 요소가 달력 격자를 연결하며 각 칸은 선택·강조·비활성 상태를 노출합니다.'],
  'date-range-picker': ['Start and end inputs share a calendar grid while keeping each endpoint independently labeled.', '시작과 종료 입력이 달력 격자를 공유하되 각 양 끝의 이름을 독립적으로 유지합니다.'],
  'range-calendar': ['The always-visible grid exposes both range endpoints and every date between them without a popup trigger.', '항상 보이는 격자가 팝업 실행 요소 없이 범위의 양 끝과 그 사이 날짜를 모두 노출합니다.'],
  'month-picker': ['The labeled input and trigger own a year grid whose cells expose selected, highlighted, and disabled month state.', '이름이 있는 입력과 실행 요소가 연도 격자를 연결하며 각 칸은 달의 선택·강조·비활성 상태를 노출합니다.'],
  'month-range-picker': ['Start and end month inputs share one year grid while retaining independently named endpoints.', '시작·종료 월 입력이 하나의 연도 격자를 공유하면서 양 끝의 이름을 독립적으로 유지합니다.'],
  'year-picker': ['The labeled input and trigger own a paged year grid with selected, highlighted, and disabled cells.', '이름이 있는 입력과 실행 요소가 선택·강조·비활성 칸이 있는 연도 격자를 연결합니다.'],
  'year-range-picker': ['Start and end year inputs share a paged grid and expose one inclusive year interval.', '시작·종료 연도 입력이 페이지형 격자를 공유하고 양 끝을 포함하는 연도 범위를 노출합니다.'],
  dialog: ['The dialog connects title and description, isolates modal background content, traps focus, locks page scroll, and restores focus on close.', '대화상자는 제목과 설명을 연결하고 모달 배경을 격리하며 포커스를 가두고 페이지 스크롤을 잠근 뒤 닫힐 때 포커스를 복원합니다.'],
  drawer: ['The drawer follows modal dialog semantics, exposes its edge and swipe direction, and keeps its gesture handle hidden from assistive technology.', '드로어는 모달 대화상자 의미를 따르고 가장자리와 스와이프 방향을 노출하며 제스처 핸들은 보조 기술에서 숨깁니다.'],
  disclosure: ['The trigger exposes expanded state and its relationship to the controlled content.', '실행 요소가 펼침 상태와 연결된 내용의 관계를 노출합니다.'],
  editable: ['Preview and input states remain distinguishable; invalid drafts are announced on the real input.', '미리보기와 입력 상태를 구분하고 잘못된 입력은 실제 입력 요소에서 전달합니다.'],
  form: ['The native form and controls retain their semantics while labels, descriptions, messages, and the issue summary expose validation state; the first invalid control receives focus.', '네이티브 폼과 컨트롤의 의미를 유지하면서 레이블·설명·오류 메시지·오류 요약이 검증 상태를 전달하고 첫 번째 잘못된 컨트롤로 포커스를 옮깁니다.'],
  feed: ['The root uses feed semantics and each item is an article with optional position and set-size metadata.', '루트는 피드 의미를 사용하며 각 항목은 선택적인 위치와 전체 크기 정보가 있는 글로 노출됩니다.'],
  grid: ['The labeled grid reports row and column counts while each cell exposes position, selection, and disabled state.', '이름이 있는 격자가 행과 열 수를 전달하고 각 칸은 위치·선택·비활성 상태를 노출합니다.'],
  listbox: ['The labeled listbox exposes active, selected, and disabled option state without moving DOM focus to every item.', '이름이 있는 목록 상자가 모든 항목으로 DOM 포커스를 옮기지 않고 현재·선택·비활성 상태를 노출합니다.'],
  menu: ['Menu items, separators, and nested menu state use hierarchical menu semantics and roving focus.', '메뉴 항목, 구분선, 하위 메뉴 상태가 계층형 메뉴 의미와 이동 포커스를 사용합니다.'],
  'menu-button': ['The trigger exposes popup and expanded state; the opened content uses menu semantics and returns focus on close.', '실행 요소가 팝업과 열림 상태를 노출하고 열린 내용은 메뉴 의미를 사용한 뒤 닫힐 때 포커스를 돌려줍니다.'],
  menubar: ['The root exposes menubar semantics while opened branches use hierarchical menu items and roving focus.', '루트는 메뉴 막대 의미를 제공하고 열린 가지는 계층형 메뉴 항목과 이동 포커스를 사용합니다.'],
  'multi-thumb-slider': ['Every thumb is separately named and exposes its own minimum, maximum, current value, and orientation.', '각 핸들에 독립적인 이름을 제공하고 최솟값·최댓값·현재 값·방향을 노출합니다.'],
  'navigation-menu': ['Native links keep link semantics while disclosure triggers expose expanded state for compound panels.', '기본 링크 의미를 유지하고 펼침 실행 요소가 복합 패널의 열림 상태를 노출합니다.'],
  'number-field': ['The labeled input preserves native editing and exposes invalid, disabled, and readonly state.', '이름이 있는 입력은 기본 편집 동작을 유지하며 오류·비활성·읽기 전용 상태를 노출합니다.'],
  pagination: ['Page links or buttons keep native activation semantics and identify the current page without relying on position alone.', '페이지 링크나 버튼이 기본 실행 의미를 유지하고 위치에만 의존하지 않고 현재 페이지를 식별합니다.'],
  'pin-input': ['Each digit input has an independent accessible name and preserves a predictable focus order.', '각 숫자 입력에 독립적인 이름을 제공하고 예측 가능한 포커스 순서를 유지합니다.'],
  popover: ['The trigger exposes expanded state and popup ownership; optional title and description label the floating content.', '실행 요소가 열림 상태와 팝업 연결을 노출하고 선택적인 제목과 설명이 떠 있는 내용의 이름을 제공합니다.'],
  'quantity-field': ['The labeled input exposes the accepted quantity while unit selection and formatted output remain separately identifiable.', '이름이 있는 입력이 확정된 수량을 노출하고 단위 선택과 형식화된 출력을 별도로 식별할 수 있게 합니다.'],
  'radio-group': ['The group and each radio expose checked, highlighted, and disabled state with one roving tab stop.', '묶음과 각 라디오가 선택·강조·비활성 상태를 노출하고 하나의 이동 탭 위치를 사용합니다.'],
  rating: ['Rating choices use radio-group semantics, keep every score named, and provide an explicit clear action.', '평점 선택은 라디오 묶음 의미를 사용하고 각 점수에 이름을 제공하며 명시적인 지우기 작업을 제공합니다.'],
  select: ['The trigger owns a portalled listbox whose active descendant, selected options, and disabled options remain linked across DOM boundaries.', '실행 요소가 포털 목록 상자를 소유하며 DOM 경계를 넘어 현재 항목·선택 항목·비활성 항목 연결을 유지합니다.'],
  slider: ['The thumb exposes its accessible name, minimum, maximum, current value, orientation, and interaction state.', '핸들이 이름, 최솟값, 최댓값, 현재 값, 방향, 상호작용 상태를 노출합니다.'],
  'spin-button': ['The input exposes spinbutton value metadata while increment and decrement remain named native controls.', '입력란이 증감 입력 값 정보를 노출하고 증가·감소 요소는 이름이 있는 기본 컨트롤로 유지됩니다.'],
  stepper: ['The ordered step list exposes the current step and associates each step trigger with its content panel.', '순서 있는 단계 목록이 현재 단계를 노출하고 각 단계 실행 요소를 내용 패널과 연결합니다.'],
  switch: ['The root exposes switch semantics and keeps checked, disabled, and readonly states distinct.', '루트는 스위치 의미를 제공하며 선택·비활성·읽기 전용 상태를 구분합니다.'],
  tabs: ['The tab list connects every tab to one tab panel and preserves selected, disabled, and orientation state.', '탭 목록이 각 탭을 하나의 탭 패널과 연결하고 선택·비활성·방향 상태를 유지합니다.'],
  'tags-input': ['The labeled group keeps its text input native and names every removable tag action.', '이름이 있는 묶음이 텍스트 입력을 기본 요소로 유지하고 각 태그 삭제 작업에 이름을 제공합니다.'],
  text: ['The labeled input or textarea preserves native editing, selection, IME, disabled, and readonly semantics.', '이름이 있는 입력 또는 여러 줄 입력이 기본 편집·선택·IME·비활성·읽기 전용 의미를 유지합니다.'],
  'time-field': ['The labeled input preserves native text entry while exposing time validation as one value.', '이름이 있는 입력란은 기본 텍스트 입력을 유지하며 시간 검증을 하나의 값으로 노출합니다.'],
  'time-range-field': ['Separate labeled start and end inputs expose one ordered time range and keep endpoint errors visible.', '시작과 종료 입력에 각각 이름을 제공하고 양 끝의 오류가 보이는 하나의 순서 있는 시간 범위로 노출합니다.'],
  timer: ['Formatted time parts are grouped as one value while start, pause, reset, and restart remain named actions.', '형식화된 시간 조각을 하나의 값으로 묶고 시작·일시 정지·초기화·재시작을 이름이 있는 작업으로 유지합니다.'],
  toast: ['The viewport preserves announcement order and keyboard access; each visible toast has a localized dismiss action and pauses while interaction or window state requires it.', '표시 영역이 알림 순서와 키보드 접근을 유지하며 각 알림에 지역화된 닫기 작업을 제공하고 사용자 조작이나 창 상태에 따라 자동 닫기를 멈춥니다.'],
  'toggle-button': ['The button exposes pressed state and keeps disabled and readonly behavior distinct.', '버튼이 눌림 상태를 노출하고 비활성 동작과 읽기 전용 동작을 구분합니다.'],
  'toggle-group': ['The labeled group exposes each item as a pressed button and uses one roving tab stop.', '이름이 있는 묶음이 각 항목을 눌림 버튼으로 노출하고 하나의 이동 탭 위치를 사용합니다.'],
  toolbar: ['The labeled toolbar uses one roving tab stop and keeps separators out of the focus order.', '이름이 있는 도구 막대가 하나의 이동 탭 위치를 사용하고 구분선을 포커스 순서에서 제외합니다.'],
  tooltip: ['The tooltip is associated with its trigger as a description and never receives focus itself.', '도움말을 실행 요소의 설명으로 연결하고 도움말 자체에는 포커스를 두지 않습니다.'],
  'tree-grid': ['Rows and cells expose hierarchy, position, expansion, selection, and edit state inside a labeled grid.', '이름이 있는 격자 안에서 행과 칸이 계층·위치·펼침·선택·편집 상태를 노출합니다.'],
  'tree-view': ['Tree items expose level, expansion, selection, and disabled state with one roving tab stop.', '트리 항목이 단계·펼침·선택·비활성 상태를 노출하고 하나의 이동 탭 위치를 사용합니다.'],
  'window-splitter': ['The handle exposes separator orientation and current, minimum, and maximum pane size.', '핸들이 구분선 방향과 현재·최소·최대 영역 크기를 노출합니다.'],
});

export function keyboardContract(component) {
  const profile = profileByComponent[component];
  if (profile === undefined || profiles[profile] === undefined) throw new Error(`Missing keyboard contract for ${component}`);
  return profiles[profile];
}

export function accessibilityContract(component) {
  const contract = accessibilityByComponent[component];
  if (contract === undefined) throw new Error(`Missing accessibility contract for ${component}`);
  return Object.freeze({ english: contract[0], korean: contract[1] });
}
