export interface AccessibilityReference {
  readonly keyboard: readonly (readonly [keys: string, action: string])[];
  readonly semantics: readonly string[];
  readonly focus: string;
  readonly authoring: readonly string[];
}

const nativeButtons = [['Tab / Shift+Tab', 'Move between enabled controls.'], ['Enter / Space on buttons', 'Activate the focused native button.']] as const;
const linearNavigation = [
  ['Arrow Left / Arrow Right', 'Move in a horizontal group. Previous and next reverse in RTL.'],
  ['Arrow Up / Arrow Down', 'Move in a vertical group.'],
  ['Home / End', 'Move to the first or last eligible item.'],
] as const;
const tabKeys = [...linearNavigation, ['Enter / Space', 'Activate the focused tab. In automatic activation mode, movement also selects the tab.']] as const;
const choiceKeys = [...linearNavigation, ['Space', 'Toggle the current option according to the selection mode.'], ['Enter', 'Select and activate the current option; activationMode="toggle" instead toggles it.'], ['Escape', 'Clear selection when clearOnEscape is enabled.']] as const;
const rangeKeys = [['Arrow Right / Arrow Up', 'Increase by one step.'], ['Arrow Left / Arrow Down', 'Decrease by one step.'], ['Home / End', 'Set the minimum or maximum permitted value.']] as const;
const gridKeys = [['Arrow keys', 'Move between eligible cells.'], ['Space', 'Select the current cell.'], ['Enter / F2', 'Start editing when a cell editor is available.'], ['Enter', 'Commit while editing.'], ['Escape', 'Cancel while editing.']] as const;
const cascadeKeys = [['Arrow Up / Arrow Down', 'Move within the current column.'], ['Arrow Right', 'Open a branch and move into its child column.'], ['Arrow Left', 'Return to the parent column.'], ['Home / End', 'Move to the first or last eligible item in the column.'], ['Enter / Space', 'Open a branch or commit a leaf.']] as const;
const menuKeys = [['Arrow Up / Arrow Down', 'Move at the current menu level.'], ['Arrow Right / Arrow Left', 'Open a submenu or return to its parent; directions reverse in RTL.'], ['Home / End', 'Move to the first or last eligible item at this level.'], ['Enter / Space', 'Invoke a leaf or open its submenu.'], ['Escape', 'Close the current level and return to its owner.'], ['Printable characters', 'Find an eligible item by its text value.']] as const;
const menuAuthoring = ['Name the root and each item. Supply textValue for typeahead when visible content is not plain text.', 'Use menu items for actions. Ordinary page links generally belong in native navigation, not an application menu.'];
const modalFocus = 'With the default autoFocus, trapFocus and restoreFocus settings, opening moves focus inside, Tab stays in the modal, and closing restores the opening control. Changing these policies makes your application responsible for a replacement focus path.';
const popupAuthoring = ['Render Title and Description parts, or supply a label for the title. Keep every generated name and description reference connected to an existing element.', 'Provide a visible close or cancel button. Choose initialFocus deliberately for long content or destructive actions; keep the return target mounted.'];
const inputAuthoring = ['Give the visible input a persistent label; a placeholder is not its name.', 'Connect help and validation text with aria-describedby. Explain invalid input in text rather than only changing its color.'];
const roving = 'Tab enters the current eligible item; arrow movement changes DOM focus inside the group. Tab then leaves the group. Disabled items are skipped.';

// Public Vue behavior, not a generic APG key map. CheckboxGroup intentionally
// differs from its DOM connection; Stepper always uses manual activation.
export const componentAccessibility: Readonly<Record<string, AccessibilityReference>> = {
  Primitive: {
    keyboard: [], semantics: ['Primitive adds no widget role or state. The rendered tag, adopted child and surrounding component determine its semantics.'],
    focus: 'Native focus behavior is retained. Primitive does not create a keyboard interaction by itself.',
    authoring: ['Choose a button for an action, a link with href for navigation, and an input for editing. A div with role="button" still needs keyboard activation and focus handling.', 'With asChild, preserve the child element, forwarded attributes, events and element ref. Do not nest interactive elements.'],
  },
  HostProvider: {
    keyboard: [], semantics: ['The provider renders no wrapper and adds no ARIA role. Direction is inherited by components that support directional navigation.'],
    focus: 'It does not move focus. A portal destination must remain part of a usable focus and reading order.',
    authoring: ['Apply matching visual dir to application markup as well as the provider direction.', 'Generate unique, stable IDs across SSR and hydration. Keep portal destinations available while their content is open.'],
  },
  CascadeList: {
    keyboard: cascadeKeys, semantics: ['The root is a group; each column is a vertical listbox and each item is an option. Selection, disabled state and branch expansion are exposed separately.'],
    focus: 'The highlighted eligible item has the tab stop. Moving into a branch transfers focus to its child column.',
    authoring: ['Name the overall choice and distinguish each column, such as Country and City. Use readable item text and stable IDs.', 'These branch columns are not a standard single-listbox layout. Test the complete hierarchy with your target screen readers.'],
  },
  CascadeSelect: {
    keyboard: [...nativeButtons, ...cascadeKeys, ['Escape', 'Close the popup.']],
    semantics: ['The trigger exposes a listbox popup and expanded state. Content contains a group of listbox columns, with options and branch states.'],
    focus: 'Opening navigates into the current eligible choice; closing returns to the trigger. Column movement follows CascadeList.',
    authoring: ['Give the trigger a persistent field name separate from the selected path. Name the individual columns.', 'Render complete selected-path text so the result is understandable without seeing the columns. Verify this multi-column popup with assistive technology.'],
  },
  ColorPicker: {
    keyboard: [...nativeButtons, ['Enter / Escape', 'Commit or cancel the text draft.'], ['Arrow keys on ColorPickerArea', 'Change saturation horizontally and brightness vertically by 1%.'], ['Native range / number input keys', 'Adjust a channel, hue, alpha or coordinate using the browser control.']],
    semantics: ['The root is a group. Color editors use native color, text, range and number inputs. Invalid text drafts expose aria-invalid; coordinates have names and value text.'],
    focus: 'Each native editor is separately reachable. The color area is focusable but is not a complete replacement for named native editors.',
    authoring: ['Name the group and both native/text editors. Retain channel names and expose a textual color value.', 'Keep the text or coordinate inputs available as alternatives to the two-dimensional area. Never communicate the chosen color only through a swatch.'],
  },
  Reorder: {
    keyboard: [['Alt+Arrow Up / Alt+Arrow Left', 'Move a sequence item one position earlier.'], ['Alt+Arrow Down / Alt+Arrow Right', 'Move a sequence item one position later.'], ['Alt+Home / Alt+End', 'Move to the start or end of the sequence, or the current sibling set in TreeReorder.'], ['Alt+Arrow Right / Alt+Arrow Left in TreeReorder', 'Indent under the preceding sibling or move out to the parent level.'], ['Alt+Arrow Up / Alt+Arrow Down in TreeReorder', 'Move among siblings.']],
    semantics: ['Items report position and set size. Tree items also report level. The shared item shortcut description names the sequence Up/Down/Home/End commands.'],
    focus: 'A successful move keeps focus on the same stable item rather than its former index.',
    authoring: ['Give sortable items readable names and display the available keyboard commands, including tree-specific commands.', 'Announce the accepted new position in an application-owned status region. Offer move buttons when platform or assistive-technology shortcuts conflict with Alt keys.'],
  },
  TreeGrid: {
    keyboard: [...gridKeys, ['Alt+Arrow Right / Alt+Arrow Left', 'Expand or collapse the current row while navigating.']],
    semantics: ['The treegrid exposes row and column counts. Rows expose hierarchy and expansion; cells expose column position and selection. Editors have their own accessible name.'],
    focus: 'Navigation focuses the current cell. Entering editing focuses its editor; committing or canceling returns to cell navigation. Composition input is not an edit command.',
    authoring: ['Name the grid, headers, disclosure controls and editors. Keep cell IDs stable when rows expand.', 'Keep hierarchy visible in text or indentation as well as expansion state. Do not remove the focused row without choosing a new focus target.'],
  },
  MeterGroup: {
    keyboard: [], semantics: ['The root is a named group and each segment exposes meter bounds, current value and value text. The visual track and legend parts are hidden from assistive technology.'],
    focus: 'Meters are read-only information, not keyboard controls; they add no navigation shortcut.',
    authoring: ['Give each segment an accessible name and a meaningful unit through value text. Do not rely on the aria-hidden legend as the only accessible label.', 'Provide an accessible textual summary when total or remaining capacity is important.'],
  },
  QuantityField: {
    keyboard: [['Enter', 'Commit the input expression.'], ['Escape', 'Cancel the draft.'], ['Native select keys', 'Choose the display unit in QuantityFieldUnitSelect.']],
    semantics: ['The expression is a native text input; the unit is a native select. Invalid committed expressions expose aria-invalid.'],
    focus: 'Expression and unit are distinct native tab stops. Unit conversion does not replace the canonical quantity.',
    authoring: [...inputAuthoring, 'Name the unit selector separately. Explain compatible units, dimensions and expected expression syntax before the user encounters an error.'],
  },
  WindowSplitter: {
    keyboard: [['Arrow Left / Arrow Right', 'Decrease or increase the leading pane in a horizontal layout.'], ['Arrow Up / Arrow Down', 'Decrease or increase the leading pane in a vertical layout.'], ['Page Up / Page Down', 'Increase or decrease by pageStep.'], ['Home / End', 'Set the minimum or maximum allowed pane percentage.']],
    semantics: ['The resize surface exposes separator semantics, orientation, minimum, maximum, current value and formatted value text.'],
    focus: 'The resize surface is keyboard focusable; resizing does not move focus into either pane.',
    authoring: ['Name which panels are being resized and format the value as a useful percentage or size.', 'Keep the handle visible and large enough to operate. Keep both pane contents reachable at their minimum sizes.'],
  },
  Grid: {
    keyboard: gridKeys, semantics: ['The root is a grid with row and column counts; rows and cells expose their positions, selected state and disabled state.'],
    focus: 'One eligible cell is the navigation entry. Editing uses the supplied editor; normal editor keys are not cell-navigation keys.',
    authoring: ['Name the grid and its headers. Supply labeled editors and actual getCellValue/setCellValue behavior before offering editing.', 'Style focus and selection differently. Keep ordinary input editing intact inside editors.'],
  },
  TreeView: {
    keyboard: [['Arrow Up / Arrow Down', 'Move through visible eligible nodes.'], ['Arrow Right', 'Expand a closed branch or move to its child.'], ['Arrow Left', 'Collapse a branch or move to its parent.'], ['Space', 'Toggle selection according to selectionMode.']],
    semantics: ['The root is a tree; treeitems expose level, selection, branch expansion and disabled state. Multiple selection exposes aria-multiselectable.'],
    focus: roving,
    authoring: ['Name the tree and each node. Leaf items must not appear to have expandable children.', 'Preserve the focused node when data changes, or move focus to a visible ancestor. Home, End and printable typeahead are not implemented by this tree keyboard mapping.'],
  },
  Feed: {
    keyboard: [['Arrow Down / Page Down', 'Focus the next article.'], ['Arrow Up / Page Up', 'Focus the previous article.']],
    semantics: ['The root is a feed; articles expose position and known set size. Pending requests expose aria-busy on the Vue root.'],
    focus: 'Navigation focuses articles. Application controls inside an article still need a predictable native tab order.',
    authoring: ['Name the feed and articles, usually with visible headings and aria-labelledby. Supply positions and set size that reflect loaded data.', 'Provide a keyboard-operable way to load more items and communicate loading, failure and completion. Avoid embedding editors whose arrow keys conflict with article navigation.'],
  },
  Menu: {
    keyboard: menuKeys, semantics: ['The root and submenus use menu semantics; items expose menuitem roles, unavailable state and branch ownership.'],
    focus: roving, authoring: menuAuthoring,
  },
  Menubar: {
    keyboard: [['Arrow Left / Arrow Right', 'Move across the bar; previous/next reverse in RTL.'], ['Arrow Down', 'Open the current branch.'], ['Arrow Up', 'Move to the previous eligible item.'], ...menuKeys.slice(2)],
    semantics: ['The root is a menubar, with menuitem entries and menu submenus. Branches expose expanded state and popup ownership.'],
    focus: 'One current item enters the tab sequence. Branch navigation moves within the menu hierarchy rather than creating a tab stop for every item.',
    authoring: menuAuthoring,
  },
  NavigationMenu: {
    keyboard: [['Arrow Left / Arrow Right', 'Move between root entries; previous/next reverse in RTL.'], ['Arrow Down', 'Open the current branch.'], ['Arrow Up', 'Move to the previous eligible entry.'], ...menuKeys.slice(2)],
    semantics: ['The root is a navigation landmark. Its managed items and submenus use the shared menu interaction and branch states.'],
    focus: 'Managed entries use a current-item tab stop. Native links need href and remain responsible for navigation.',
    authoring: ['Name the navigation landmark, particularly when the page has more than one.', 'Use meaningful link text and native href values. Keep submenu state visible and test the complete landmark/menu composition with your screen readers.'],
  },
  Tooltip: {
    keyboard: [['Tab / Shift+Tab', 'Focus or leave the trigger, opening or closing its description.'], ['Escape', 'Dismiss the open tooltip.']],
    semantics: ['Content has the tooltip role and is connected to its trigger through aria-describedby. It describes the trigger; it does not supply its accessible name.'],
    focus: 'Focus stays on the trigger. A tooltip is not a modal or an interactive popup.',
    authoring: ['Keep tooltip content non-interactive. Use Popover for links, inputs or other controls.', 'Give the trigger its own name and provide essential instructions outside the tooltip. Pointer hover must not be the only way to discover information.'],
  },
  AlertDialog: {
    keyboard: [...nativeButtons, ['Escape', 'Dismiss the active alert dialog.']],
    semantics: ['Content exposes alertdialog semantics and modal state, with title and description references. Outside interaction does not dismiss by default.'],
    focus: modalFocus, authoring: [...popupAuthoring, 'Put a safe cancel choice before a destructive action in the focus sequence. The alert role does not make an action safe or supply a confirmation policy.'],
  },
  Drawer: {
    keyboard: [...nativeButtons, ['Escape', 'Dismiss the active drawer.']],
    semantics: ['A drawer is a dialog with modal state, not a separate ARIA role. Title and Description name and explain it. Decorative overlay and handle parts are hidden.'],
    focus: modalFocus, authoring: [...popupAuthoring, 'Supply a close button as an alternative to dragging the handle. A drawer animation must not delay access to the focused content.'],
  },
  Toast: {
    keyboard: [['F8', 'Focus ToastViewport with the default hotkey. The provider can replace or disable it.'], ['Tab / Shift+Tab', 'Move through notification actions and dismiss controls.'], ['Escape', 'Dismiss the focused notification, or the latest notification from the viewport, unless dismissOnEscape is disabled.'], ['Enter / Space', 'Activate a native action or dismiss button.']],
    semantics: ['The named viewport is a polite live region. Vue items use status for ordinary notifications and alert for errors. Exiting items are hidden and inert.'],
    focus: 'New notifications do not automatically steal focus. F8 offers an explicit route to the viewport. Hover/focus and the configured window-blur policy pause expiry.',
    authoring: ['Keep important instructions available after expiry. Use persistent feedback instead of a timed toast for information that requires action.', 'Localize the viewport and dismiss labels. Explain custom hotkeys and check conflicts with browser and assistive-technology commands.'],
  },
  MenuButton: {
    keyboard: [['Enter / Space on the trigger', 'Open or close the menu through native button activation.'], ...menuKeys],
    semantics: ['The trigger exposes a menu popup, expanded state and content ownership. Content and items use menu semantics.'],
    focus: 'Opening focuses the current menu item. Closing the popup restores the trigger; submenu closure returns to its parent item.',
    authoring: [...menuAuthoring, 'Keep the trigger mounted for focus restoration. Arrow Down on the closed trigger is not a separate opener in this implementation.'],
  },
  Toolbar: {
    keyboard: [...linearNavigation, ['Enter / Space', 'Invoke the focused control.']],
    semantics: ['The root is a named toolbar with orientation. Separators are distinct from controls; unavailable items expose aria-disabled.'],
    focus: roving,
    authoring: ['Name every icon-only control and the toolbar. Preserve the child button or link semantics.', 'Do not give separators a tab stop. Avoid placing text editors in a toolbar that consumes their arrow keys.'],
  },
  Pagination: {
    keyboard: nativeButtons, semantics: ['The root is a named navigation landmark. The current page exposes aria-current="page"; ellipses are decorative and unavailable controls are disabled.'],
    focus: 'Pages and navigation controls use their native tab stops, not roving arrow navigation.',
    authoring: ['Name each page and previous/next control, and localize page labels when needed.', 'After loading a page, preserve the triggering control or intentionally focus the new content. Communicate loading and failure separately from the current-page marker.'],
  },
  Stepper: {
    keyboard: [...linearNavigation, ['Enter / Space', 'Activate the focused step; Vue Stepper always uses manual activation.']],
    semantics: ['Stepper uses tablist, tab and tabpanel semantics with a stepper role description. Selection and panel ownership are linked.'],
    focus: 'Moving focus does not advance the active step. Tab enters the current eligible step and can then reach the active panel.',
    authoring: ['Name the step list and provide linked panel IDs. Explain progress and unmet prerequisites in text.', 'Do not treat a selected step as proof that its form is valid. The application decides whether a requested step change is accepted.'],
  },
  CheckboxGroup: {
    keyboard: nativeButtons, semantics: ['Vue renders a named group of CheckboxRoot controls. Each item exposes checkbox semantics and checked state; it is not a listbox.'],
    focus: 'Each enabled Vue checkbox is its own native tab stop. The Vue group does not implement roving arrow-key navigation.',
    authoring: ['Name the group and every choice. Explain minimum/maximum selection rules in visible help text.', 'Keep group-level validation attached to the visible group, not hidden submission inputs.'],
  },
  MultiThumbSlider: {
    keyboard: [...rangeKeys, ['Tab / Shift+Tab', 'Move between individual thumbs and surrounding controls.']],
    semantics: ['Every thumb is a slider with its own value, orientation and bounds. Collision and minimum-gap policies affect each thumb’s permitted range.'],
    focus: 'Thumb identity and tab order should stay stable even when values approach or cross one another.',
    authoring: ['Name thumbs individually, such as Minimum price and Maximum price, and format values with units.', 'Provide numeric-input alternatives where precision matters. Unlike Slider, this keyboard mapping does not include Page Up or Page Down.'],
  },
  Carousel: {
    keyboard: [...linearNavigation.slice(0, 2), ['Home / End', 'Show the first or last eligible slide.'], ['Space on the carousel root', 'Toggle automatic rotation pause.'], ['Enter / Space on controls', 'Activate native previous, next, indicator or pause buttons.']],
    semantics: ['The root has a carousel role description; slides expose their position and indicators expose selected state and controlled-slide references. Retained inactive Vue slides are inert and hidden from assistive technology.'],
    focus: 'Changing a slide does not require moving focus into it. Focus/hover pause behavior follows the autoplay configuration.',
    authoring: ['Name the carousel, slides and all controls. Include a visible pause/resume control whenever rotation is automatic.', 'Respect reduced motion and keep inactive slide controls out of the tab order. Do not rely only on swipe gestures.'],
  },
  Select: {
    keyboard: [['Enter / Space on the closed trigger', 'Open the popup.'], ['Arrow Up / Arrow Down', 'Move to the previous or next eligible option, opening the popup when needed.'], ['Home / End', 'Highlight the first or last eligible option.'], ['Enter / Space in the popup', 'Select the highlighted option.'], ['Escape', 'Close the popup.'], ['Printable characters', 'Find an option by its text value.']],
    semantics: ['The trigger exposes expanded state and a listbox popup. Options expose selection and disabled state.'],
    focus: 'Opening moves DOM focus to the current option; closing returns to the trigger. Portal placement does not change that relationship.',
    authoring: ['Name the field independently of its current value or placeholder. Supply readable textValue values for typeahead.', 'Keep option content non-interactive and provide an understandable empty/unavailable state.'],
  },
  Combobox: {
    keyboard: [['Arrow Up / Arrow Down', 'Navigate eligible matches.'], ['Enter', 'Accept the highlighted result outside IME composition.'], ['Escape', 'Close the popup.'], ['Typing / native editing keys', 'Edit the query with normal input behavior.']],
    semantics: ['The input exposes combobox role, list autocomplete, expanded state, popup ownership and the active descendant. Popup options expose selection and disabled state.'],
    focus: 'DOM focus stays in the text input while aria-activedescendant identifies the active result. Query editing must remain available.',
    authoring: [...inputAuthoring, 'Keep stable option IDs and keep the active option mounted. Explain loading, no matches and errors without repeatedly announcing every keystroke.', 'Do not replace the composing text or use composition Enter to submit or select a result.'],
  },
  Listbox: {
    keyboard: [...choiceKeys, ['Printable characters', 'Find matching options when a typeahead policy is supplied.']],
    semantics: ['The root is a listbox and options expose selected/disabled state. Multiple selection adds aria-multiselectable.'],
    focus: 'DOM focus stays on the root. Options have tabindex="-1"; aria-activedescendant points at the current option. Arrow movement may also select when selectionFollowsFocus is configured.',
    authoring: ['Name the listbox and each option. Distinguish the active option from selected options visually.', 'Keep the active option’s stable ID in the DOM. Use selectionMode and deselectable policies deliberately; do not assume Ctrl+A or Shift+Arrow range shortcuts are provided.'],
  },
  TagsInput: {
    keyboard: [['Enter / comma in the input', 'Add the draft as a tag after composition settles.'], ['Arrow Left / Arrow Right', 'Move between tag positions and the input; previous/next reverse in RTL.'], ['Backspace in an empty input', 'Move to the preceding tag.'], ['Backspace / Delete with a current tag', 'Remove that tag.']],
    semantics: ['The root is a group. Tags expose button semantics and removal names; the editor remains a native text input.'],
    focus: 'Tag navigation and text input are coordinated; removing a tag must leave a usable current position.',
    authoring: ['Name the input and group. Give each delete button a specific removal label and expose duplicate/invalid tag feedback.', 'Keep a visible removal control as an alternative to deletion keys. Avoid adding a second screen-reader announcement for the same removal.'],
  },
  PinInput: {
    keyboard: [['Arrow Left / Arrow Right', 'Move to the previous or next digit input.'], ['Backspace / Delete', 'Delete through the coordinated input behavior.'], ['Typing / paste', 'Fill accepted characters and advance through the inputs.']],
    semantics: ['The root is a group and inputs are named by digit position and total length. Each input remains a native input.'],
    focus: 'The current digit input is the tab entry. Input advances according to accepted characters. Composition is handled before interpreting navigation or deletion keys.',
    authoring: ['Give the group a useful label and explain the code length and character restrictions. Use the appropriate autocomplete policy for one-time codes.', 'Do not auto-submit merely because all positions are filled unless the user is told what will happen. Masking is presentation, not protection of the stored value.'],
  },
  Editable: {
    keyboard: [...nativeButtons, ['Enter in a single-line editor', 'Commit the draft. A textarea retains Enter for line breaks.'], ['Escape in the editor', 'Cancel the draft.']],
    semantics: ['Preview and edit controls surround a native input or textarea. Rejected commits expose aria-invalid.'],
    focus: 'Entering edit mode focuses the editor; commit and cancel leave editing. Keep a usable preview or edit control available afterward.',
    authoring: [...inputAuthoring, 'Make edit, commit and cancel actions discoverable. Do not make pointer double-click the only editing path.'],
  },
  NumberField: {
    keyboard: [['Enter / Escape', 'Commit or cancel the numeric draft.'], ...nativeButtons],
    semantics: ['The editor is a native text input with parsing/formatting and invalid state, not a spinbutton. Optional increment/decrement controls are buttons.'],
    focus: 'The editor and optional buttons use native tab order. Arrow keys are not numeric stepping shortcuts for this component.',
    authoring: [...inputAuthoring, 'Explain the decimal/unit format and locale policy. Name increment/decrement buttons if present; use SpinButton when arrow-key stepping is required.'],
  },
  SpinButton: {
    keyboard: [['Arrow Up / Arrow Down', 'Increase or decrease by one step.'], ['Page Up / Page Down', 'Increase or decrease by the configured page step.'], ['Home / End', 'Set the minimum or maximum.'], ['Enter / Escape', 'Commit or cancel the text draft.']],
    semantics: ['The input exposes spinbutton role, value, bounds, value text, invalid state and availability.'],
    focus: 'The native input retains text editing and composition; stepping keys apply outside composition.',
    authoring: [...inputAuthoring, 'Format value text when a raw number lacks units or meaning. Provide discoverable increment/decrement controls as an alternative.'],
  },
  Slider: {
    keyboard: [...rangeKeys, ['Page Up / Page Down', 'Increase or decrease by pageStep.']],
    semantics: ['The interactive surface exposes slider role, orientation, current value, bounds and formatted value text. Decorative track/range parts do not replace that control.'],
    focus: 'The slider’s interactive surface is the keyboard entry; pointer dragging is not required to change the value.',
    authoring: ['Give the slider a persistent name and format units through formatValue.', 'Provide an input alternative for precise values. These increment/decrement keys are fixed and do not automatically reverse for RTL.'],
  },
  Progress: {
    keyboard: [], semantics: ['The root is a progressbar with bounds and a current value for determinate progress. Indeterminate progress omits the current value.'],
    focus: 'Progress is read-only and adds no keyboard navigation.',
    authoring: ['Name the operation being reported. Provide text for indeterminate work and a useful completion message.', 'Do not repeatedly move focus or announce every small update. Progress is task completion, not a measurement of a fixed capacity.'],
  },
  Meter: {
    keyboard: [], semantics: ['The root is a meter with bounds, current value and value text. It represents a measurement, not task completion.'],
    focus: 'A meter adds no keyboard interaction.',
    authoring: ['Name the measured quantity and supply units in formatValue. Explain thresholds in text if color indicates a warning.', 'Use Progress for loading or completion rather than assigning meter semantics to it.'],
  },
  Rating: {
    keyboard: [['Arrow Right / Arrow Down', 'Increase the rating; horizontal previous/next reverse in RTL.'], ['Arrow Left / Arrow Up', 'Decrease the rating.'], ['Home / End', 'Choose the minimum or maximum eligible rating.'], ['Enter / Space', 'Set the current rating.']],
    semantics: ['The control uses radiogroup/radio semantics and checked state, with names for individual rating choices.'],
    focus: roving,
    authoring: ['Name what is being rated and every level meaningfully, such as 3 out of 5 stars. Do not rely on a star icon alone.', 'Readonly display must still expose its numeric/textual value. Clearable policy does not introduce a Delete shortcut; provide a clear action when needed.'],
  },
  Timer: {
    keyboard: nativeButtons, semantics: ['The timer has role="timer" and aria-live="off". Its accessible text describes elapsed/remaining time; action parts are native buttons.'],
    focus: 'Start, pause, resume and reset are separate tab stops. Time updates do not move focus.',
    authoring: ['Name the timer’s purpose in surrounding text and label its action buttons.', 'Announce important milestones or completion through a separate status region, rather than making every tick live. Provide a way to pause or extend an application deadline when appropriate.'],
  },
  Accordion: {
    keyboard: [['Arrow Up / Arrow Down', 'Focus the previous or next eligible trigger.'], ['Home / End', 'Focus the first or last eligible trigger.'], ['Enter / Space', 'Toggle the focused section when its open policy permits.']],
    semantics: ['Triggers expose expanded state and content ownership. Content uses a region named by its trigger. A required-open trigger may be unavailable for closing.'],
    focus: 'Trigger navigation moves DOM focus; opening a section does not automatically enter its contents. Native Tab order reaches available controls.',
    authoring: ['Place triggers inside headings at the correct level. Give each section meaningful visible text.', 'Keep closed content out of the tab order, including during retained exit motion. Avoid redundant nested region landmarks in a long accordion.'],
  },
  Text: {
    keyboard: [['Native input / textarea keys', 'Move the caret, select, edit, copy/paste and undo through the browser’s text control.'], ['Enter in a textarea', 'Insert a line break; form submission policy belongs to the application.']],
    semantics: ['TextField renders a native input or textarea, with native type, required, readonly, disabled and autocomplete attributes.'],
    focus: 'Native text-control focus and selection are retained, including IME composition.',
    authoring: [...inputAuthoring, 'Choose type, input mode and autocomplete for the task. Do not intercept editing or composition Enter as a global application shortcut.'],
  },
  Switch: {
    keyboard: nativeButtons, semantics: ['The default button root exposes switch role and boolean aria-checked. The thumb is decorative.'],
    focus: 'The root is one native tab stop. Readonly prevents changes while leaving the value understandable.',
    authoring: ['Give the switch a stable name such as Email notifications; do not rename it On or Off when toggled.', 'Expose the on/off state through checked semantics and visible text or shape, not color alone. Preserve native activation when changing as/asChild.'],
  },
  ToggleButton: {
    keyboard: nativeButtons, semantics: ['The default native button exposes aria-pressed rather than checkbox state.'],
    focus: 'The button is a single native tab stop.',
    authoring: ['Keep the button’s accessible name stable across pressed states, such as Bold. Name icon-only buttons.', 'Use it for a pressed command, not an unnamed boolean field. Preserve button behavior with asChild.'],
  },
  ToggleGroup: {
    keyboard: [...linearNavigation, ['Enter / Space', 'Toggle the current pressed item.']],
    semantics: ['The root is a group and its items are buttons with aria-pressed, not options with aria-selected.'],
    focus: roving,
    authoring: ['Name the group and every button. Explain whether one or multiple choices may remain pressed.', 'Use stable names rather than changing the command name when pressed. Respect disabled, readonly and deselectable policies. Vue ToggleGroup does not clear selection on Escape.'],
  },
  RadioGroup: {
    keyboard: [...linearNavigation, ['Enter / Space', 'Check the current radio.']],
    semantics: ['The root is a radiogroup; radios expose aria-checked and disabled state. Exactly one checked choice is represented by the selection policy.'],
    focus: 'One eligible radio is the tab entry. Arrow movement changes the current radio and selection according to the radio policy.',
    authoring: ['Name the group and every choice. Explain required selection when relevant.', 'Match orientation and direction to the visual layout. Do not present unrelated toggle buttons as radio choices.'],
  },
  Tabs: {
    keyboard: tabKeys, semantics: ['TabList, TabTrigger and TabContent expose tablist, tab and tabpanel semantics, selected state and reciprocal ID references.'],
    focus: 'Tab enters the current eligible trigger. Automatic activation selects on movement; manual mode waits for Enter or Space. Tab then reaches active panel content.',
    authoring: ['Name the tab list and provide clear trigger text. Keep trigger/panel IDs unique and stable.', 'Use manual activation for expensive panels. Give an otherwise non-focusable panel an appropriate focus target, and keep inactive panels unavailable.'],
  },
  Popover: {
    keyboard: [...nativeButtons, ['Escape', 'Dismiss the active popover.']],
    semantics: ['Content has dialog semantics with aria-modal="false" by default and title/description references. The trigger exposes expanded state and ownership.'],
    focus: 'Default autofocus and restoration move focus into the popup and back to its trigger. Default non-modal behavior does not trap Tab; trapFocus is a separate policy.',
    authoring: [...popupAuthoring, 'Do not style a non-modal popover as if the rest of the application were unavailable. Choose Dialog for a modal workflow.'],
  },
  Checkbox: {
    keyboard: nativeButtons, semantics: ['The default button root exposes checkbox role and aria-checked="true", "false" or "mixed". Indicator is decorative, not the checkbox name.'],
    focus: 'The root is one native tab stop. Disabled and readonly have different focus/interaction consequences.',
    authoring: ['Give the root visible label text or an accessible name. Explain mixed state when it summarizes child choices.', 'Keep an unchecked visual box visible when the conditional indicator is absent. Changing as/asChild must preserve focus and keyboard activation.'],
  },
  Dialog: {
    keyboard: [...nativeButtons, ['Escape', 'Dismiss the active dialog.']],
    semantics: ['Content has dialog semantics and modal state. Title and Description connect its accessible name and explanation; portal and overlay do not supply a second name.'],
    focus: modalFocus, authoring: popupAuthoring,
  },
  Disclosure: {
    keyboard: nativeButtons, semantics: ['The trigger exposes expanded state and its controlled content ID. Disclosure does not impose a dialog role or trap focus.'],
    focus: 'Toggling keeps focus on the trigger. Tab reaches content controls only while they are available.',
    authoring: ['Use meaningful trigger text. Keep the trigger and content relationship intact.', 'Retained exit content must not remain keyboard interactive. Give any non-native trigger a complete native-equivalent activation path.'],
  },
};

export interface DomainAccessibilityReference extends AccessibilityReference {
  readonly id: string;
  readonly title: string;
}

const dateKeys = [['Arrow Left / Arrow Right', 'Move to the previous or next eligible day.'], ['Arrow Up / Arrow Down', 'Move by one week.'], ['Home / End', 'Move to the start or end of the configured week.'], ['Page Up / Page Down', 'Move by one month.'], ['Shift+Page Up / Shift+Page Down', 'Move by one year.'], ['Enter / Space', 'Select the highlighted date.']] as const;
const periodKeys = [['Arrow Left / Arrow Right', 'Move to the previous or next month/year cell.'], ['Arrow Up / Arrow Down', 'Move one row in the period grid.'], ['Home / End', 'Move to the start or end of the period page.'], ['Page Up / Page Down', 'Move to the previous or next period page.'], ['Enter / Space', 'Select the highlighted month/year.'], ['Escape', 'Close the popup.']] as const;
const dateSemantics = ['The date surface is a grid and its cells expose selection and disabled state. Highlighted navigation is separate from the committed date or range.'];
const dateAuthoring = ['Name the calendar/grid, navigation buttons and full dates, not only the day number. Supply row structure and meaningful weekday headers in the rendered grid.', 'Explain locale, week start, timezone and unavailable dates. Keep focusable dates mounted and make selected, current and disabled dates distinguishable without relying only on color.', 'When using the shared year view, Left/Right moves one month and Up/Down moves one three-column row; Page Up/Down changes year and Home/End reaches January/December.'];
const fieldKeys = [['Arrow Up / Arrow Down', 'Increase or decrease the segment at the input selection in text mode.'], ['Enter / Escape', 'Commit or cancel the draft outside composition.'], ['Native input keys', 'Edit and select text normally. Native date/time mode delegates arrows, Home and End to the browser.']] as const;

export const domainAccessibility: Readonly<Record<'form' | 'temporal' | 'virtual' | 'tabular' | 'chart', readonly DomainAccessibilityReference[]>> = {
  form: [{
    id: 'form-fields', title: 'Form, Field and validation feedback', keyboard: [...nativeButtons, ['Native form submission', 'Submit through an enabled submit button or applicable browser implicit-submit behavior.']],
    semantics: ['Form uses native form behavior. FieldLabel, FieldDescription and FieldIssue connect names, help and invalid state to participating visible controls. Active issue parts expose alert/live feedback; retained inactive feedback stops announcing.'],
    focus: 'Invalid submission targets the first eligible invalid visible control. Hidden submission inputs carry values but are not keyboard or validation targets. Reset and controlled updates still require an application-owned focus plan.',
    authoring: ['Compose Field around its actual visible control with a meaningful label and persistent help. Keep issue references connected and avoid competing live regions.', 'Use explicit submit/reset button types. Explain required fields, formats and validation errors in text; preserve entered data after rejection.', 'Expose async pending state without removing the focused control. Explain readonly/disabled fields and account for their native submission behavior.'],
  }],
  temporal: [
    { id: 'calendar', title: 'Calendar and RangeCalendar', keyboard: dateKeys, semantics: dateSemantics,
      focus: 'The current eligible cell is the grid’s tab entry. Arrows change the highlighted date. RangeCalendar uses a first selection as the range anchor and a second to complete the range.',
      authoring: [...dateAuthoring, 'Calendar is inline and does not introduce a modal trap. Announce the displayed month and explain range endpoints.'],
    },
    { id: 'date-picker', title: 'DatePicker and DateRangePicker', keyboard: [...nativeButtons, ...dateKeys, ['Escape', 'Close the date popup.']],
      semantics: [...dateSemantics, 'The trigger exposes a dialog popup and expanded state. Content is a non-modal dialog. DateRangePicker represents start/end values.'],
      focus: 'Opening navigates into the highlighted date; closing restores the trigger. A range has an anchor phase before a complete range can be accepted.',
      authoring: [...dateAuthoring, 'Name both popup and trigger. Link popup ownership with application IDs when needed. Provide selected-date/range text and a clear closing path.'],
    },
    { id: 'period-picker', title: 'MonthPicker, YearPicker, MonthRangePicker and YearRangePicker', keyboard: [...nativeButtons, ...periodKeys],
      semantics: ['Period cells use gridcell semantics, selection and disabled state. The trigger exposes a non-modal dialog popup; range variants represent an anchor and completed range.'],
      focus: 'The highlighted eligible period is the tab entry. Navigation uses period rows/pages, not day/week strides. Closing restores the trigger.',
      authoring: ['Name the grid and periods with complete month/year labels. Explain page boundaries and range endpoints.', 'Supply matching period values and row structure rather than reusing day cells with shortened labels. Keep current, selected and focused styling distinct.'],
    },
    { id: 'temporal-fields', title: 'DateField, TimeField and DateTimeField', keyboard: fieldKeys,
      semantics: ['Inputs are native text controls, or native date/time/datetime-local controls when supported and requested. Required, readonly, disabled and invalid state apply to the visible editor.'],
      focus: 'Input selection identifies the active text-mode segment. Native modes keep platform editing behavior; composition settles before commit commands.',
      authoring: [...inputAuthoring, 'Explain format, locale and timezone. A native datetime-local input does not include a timezone selector.', 'Native picker appearance and keys vary across operating systems. Keep a text-entry path and clear error explanation available.'],
    },
    { id: 'temporal-range-fields', title: 'DateRangeField and TimeRangeField', keyboard: fieldKeys,
      semantics: ['Start and end are separately named native text inputs. Range ordering is more than two independently valid endpoints. These editors use text mode.'],
      focus: 'Both endpoints use normal tab order. Segment stepping applies to the active endpoint. Escape cancels the range draft.',
      authoring: [...inputAuthoring, 'Use distinct startLabel and endLabel values. Explain ordering and incomplete ranges, and attach range errors where both endpoints can discover them.'],
    },
    { id: 'date-time-picker', title: 'DateTimePicker and DateTimeRangePicker', keyboard: [...nativeButtons, ...dateKeys, ['Enter / Escape in text editors', 'Commit or cancel the applicable draft.'], ['Escape in the popup', 'Close the date/time popup.']],
      semantics: ['A non-modal dialog combines a date grid with date/time or datetime editors. DateTimeRangePicker represents separate start/end date-time values and selected-range cells.'],
      focus: 'Grid and editors must both remain reachable. The grid uses date navigation; editors retain text/segment behavior. Closing restores the trigger.',
      authoring: [...dateAuthoring, ...inputAuthoring, 'Name every endpoint and explain timezone and ordering. Date selection alone may not complete the date-time value.'],
    },
    { id: 'temporal-provider', title: 'TemporalProvider', keyboard: [], semantics: ['The provider supplies temporal context and renders no interactive control or ARIA role.'],
      focus: 'It does not move or trap focus.', authoring: ['Keep locale, reference date and policies consistent between SSR and client. Explain date/time interpretation in the fields that consume this context.'],
    },
  ],
  virtual: [
    { id: 'virtual-list', title: 'VirtualList and measurement parts', keyboard: [],
      semantics: ['Windowing controls which items are mounted; it does not create listbox semantics, accessible names or selection behavior.'],
      focus: 'Native scrolling remains available. Retain/reveal the focused or active item rather than allowing windowing to remove it.',
      authoring: ['Choose native list/article markup or compose a matching interaction component. Preserve stable IDs and positions in the full collection.', 'Keep an aria-activedescendant target mounted. Supply a keyboard-operable scroll/load path and loading/error feedback.', 'For document scroll, keep headings and landmarks in reading order. Avoid unnecessary nested scroll traps.'],
    },
    { id: 'virtual-grid', title: 'VirtualGrid, VirtualMasonry and VirtualSpatial', keyboard: [],
      semantics: ['Placement and measurement do not provide grid, treegrid or selection semantics. Spatial layout is not automatically a two-dimensional keyboard widget.'],
      focus: 'Reading/tab order follow DOM order, not absolute placement. Arrow navigation requires an explicitly composed interaction owner.',
      authoring: ['Match DOM order to reading order. Use Grid or DataGrid for cell navigation and preserve active cells while windowing.', 'Offer a linear textual view when position carries information that reading order alone cannot convey.'],
    },
  ],
  tabular: [
    { id: 'data-table', title: 'DataTable', keyboard: [...nativeButtons, ['Space on a bound selection control', 'Toggle configured row or aggregate selection.'], ['Arrow Left / Arrow Right on a resize handle', 'Decrease or increase column width.'], ['Enter / Escape in an editor', 'Commit or cancel; applicable multiline editors retain Shift+Enter for a line break.']],
      semantics: ['Native table mode preserves table/row/header/cell structure. Bound sort controls expose direction; resize handles expose separator values. Selection and editing are optional.'],
      focus: 'A table does not automatically become a roving cell grid. Header, row and editor controls have their own focus entries.',
      authoring: ['Name the table with a caption or label, and label header actions, selection controls and resize handles.', 'Choose DataGrid for arrow-key navigation. When windowing, preserve table structure and logical row positions; do not wrap tr elements in arbitrary div elements.', 'Announce page/loading/failure changes, retain accepted data on errors and keep focused actions reachable.'],
    },
    { id: 'data-grid', title: 'DataGrid and DataTreeGrid', keyboard: [['Arrow keys', 'Move between eligible projected cells.'], ['Space', 'Toggle selection of the current leaf row.'], ['Enter / F2', 'Begin editing an editable cell.'], ['Enter / Escape in an editor', 'Commit or cancel; applicable textarea editors allow Shift+Enter for a line break.'], ['Arrow Left / Arrow Right on a resize handle', 'Change column width.'], ['Enter / Space on a disclosure button', 'Expand or collapse a DataTreeGrid row.']],
      semantics: ['The root exposes grid/treegrid semantics with logical counts and indexes. Tree rows expose level/expansion; selection, sort and editor state belong to their respective parts.'],
      focus: 'The current cell is the focus entry. Editors receive focus while editing. Virtual reveal must retain cursor/editor targets, including pinned rows or columns.',
      authoring: ['Name grid, headers, disclosures and editors. Preserve row/column identities through sorting, grouping and paging.', 'Standalone TreeGrid Alt+Arrow shortcuts do not apply to DataTreeGrid; use its disclosure controls or expansion API.', 'Preserve editors and selection across accepted updates. Provide loading, empty and error text and a keyboard-operable retry action.'],
    },
  ],
  chart: [
    { id: 'chart-navigation', title: 'ChartNavigation and axis-view controls', keyboard: [...nativeButtons, ['+ / = and - / _', 'Zoom enabled axes in/out when keyboard navigation is enabled.'], ['Shift+Arrow keys', 'Pan matching enabled axes by 10% of the visible span.'], ['0', 'Reset enabled axis views.']],
      semantics: ['Navigation buttons have action names. Keyboard navigation is opt-in and applies to a focused surface; the canvas renderer is decorative, not a readable data table.'],
      focus: 'Named pan/zoom/reset buttons provide a native keyboard path. A custom surface needs an intentional focus entry before canvas commands are usable.',
      authoring: ['Name chart and axis actions. Keep non-drag alternatives and explain shortcut scope.', 'Do not capture shortcuts while editing a field. Expose the visible range as text and make reset discoverable.'],
    },
    { id: 'chart-data', title: 'Chart data, series, annotations and renderers', keyboard: [],
      semantics: ['Drawn series do not expose every point as an accessible item. Custom SVG and textual summaries determine what a screen reader can read.'],
      focus: 'Marks do not automatically become keyboard targets. Interactive points need explicit accessible controls and predictable navigation.',
      authoring: ['Provide a title, units, trend summary and accessible table or equivalent view of values.', 'Distinguish series by names, patterns or shapes as well as color. Expose tooltip/annotation information through focus or persistent text, not hover alone.', 'Explain clipping, aggregation and missing data so the textual alternative describes the same information.'],
    },
  ],
};
