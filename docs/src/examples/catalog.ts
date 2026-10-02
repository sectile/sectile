export const hosts = [
  { id: 'vue', label: 'Vue', description: 'Headless Vue components and Vue-first package integrations.' },
  { id: 'dom', label: 'DOM', description: 'Direct DOM connections for application-owned markup.' },
] as const;

export type ExampleHost = (typeof hosts)[number]['id'];

export const areas = [
  { id: 'components', label: 'Components', description: 'Focused interaction patterns such as checkboxes, dialogs, selects, menus, and overlays.' },
  { id: 'form', label: 'Form', description: 'Validation, submission, field coordination, reset, and server-driven form workflows.' },
  { id: 'temporal', label: 'Temporal', description: 'Dates, time, ranges, calendars, constraints, and scheduling workflows.' },
  { id: 'virtual', label: 'Virtual', description: 'Large collections, measurement, anchoring, scrollports, grids, masonry, and spatial layouts.' },
  { id: 'tabular', label: 'Tabular', description: 'Tables, grids, trees, data sources, selection, editing, and virtualization.' },
  { id: 'chart', label: 'Chart', description: 'Chart data, scales, interaction, visible ranges, rendering, and large-data policies.' },
] as const;

export type ExampleArea = (typeof areas)[number]['id'];
export type ExampleKind = 'behavior' | 'styling';
export type PreviewFixture = 'control' | 'form' | 'surface' | 'viewport' | 'table' | 'chart';

export interface ComponentDefinition {
  readonly subject: string;
  readonly slug: string;
  readonly description: string;
  readonly module: string;
  readonly parts: readonly string[];
  readonly composition: readonly string[];
  readonly interaction: readonly string[];
}

export const components: readonly ComponentDefinition[] = [
  {
    subject: 'Primitive', slug: 'primitive', module: '@sectile/vue/primitive', description: 'Render an element or adopt one application-owned child without a wrapper.',
    parts: ['Primitive'], composition: ['Use as to choose a tag or asChild to adopt exactly one element. Attributes and handlers merge onto that child.'],
    interaction: ['Primitive does not implement a control state machine. Native elements or the component composed above it own their interaction behavior.'],
  },
  {
    subject: 'HostProvider', slug: 'host-provider', module: '@sectile/vue/host-provider', description: 'Supply shared host direction, portal target and ID generation context.',
    parts: ['HostProvider'], composition: ['Place the provider around controls that consume host context. It renders no wrapper; use application markup to apply visual dir. Nested providers inherit unspecified values.'],
    interaction: ['The example changes directional tab navigation and visual direction together. Portal targets and custom ID generators are separate optional host policies.'],
  },
  {
    "subject": "CascadeList",
    "slug": "cascade-list",
    "module": "@sectile/vue/cascade-list",
    "description": "Choose a leaf from visible country and city columns.",
    "parts": [
      "CascadeListRoot",
      "CascadeListColumn",
      "CascadeListItem"
    ],
    "composition": [
      "Declare flat nodes with stable IDs and parentID. Render one column per root slot columns entry, then its matching item IDs."
    ],
    "interaction": [
      "Branches open another column; leaf selection commits the city. Disabled items remain unavailable to pointer and keyboard input."
    ]
  },
  {
    "subject": "CascadeSelect",
    "slug": "cascade-select",
    "module": "@sectile/vue/cascade-select",
    "description": "Choose a hierarchical leaf from a trigger-controlled panel.",
    "parts": [
      "CascadeSelectRoot",
      "CascadeSelectTrigger",
      "CascadeSelectContent",
      "CascadeSelectColumn",
      "CascadeSelectItem",
      "CascadeSelectValue"
    ],
    "composition": [
      "Declare nodes and render columns inside Content. Value formats the selected path with textValue; the trigger controls panel visibility."
    ],
    "interaction": [
      "Open the panel, navigate country and city columns, then choose a leaf. This in-flow example disables floating positioning explicitly."
    ]
  },
  {
    "subject": "ColorPicker",
    "slug": "color-picker",
    "module": "@sectile/vue/color-picker",
    "description": "Edit one committed color through native and text inputs.",
    "parts": [
      "ColorPickerRoot",
      "ColorPickerNativeInput",
      "ColorPickerTextInput",
      "ColorPickerValueText"
    ],
    "composition": [
      "Bind the committed CSS color string. Compose the native and text inputs inside one root; draft text and formatting are distinct optional controls."
    ],
    "interaction": [
      "Commit a valid color through either editor. This example disables alpha and leaves the native picker appearance to the operating system."
    ]
  },
  {
    "subject": "Reorder",
    "slug": "reorder",
    "module": "@sectile/vue/reorder",
    "description": "Reorder a bounded sequence with pointer or keyboard input.",
    "parts": [
      "SequenceReorderRoot",
      "SequenceReorderItem"
    ],
    "composition": [
      "Bind items as stable IDs and render the root slot sequence, keyed by ID. Labels are application-owned and separate from identity."
    ],
    "interaction": [
      "Drag an item or use Alt+ArrowUp/Down, Alt+Home and Alt+End while it is focused. The root emits a new order; the application retains it."
    ]
  },
  {
    "subject": "TreeGrid",
    "slug": "tree-grid",
    "module": "@sectile/vue/tree-grid",
    "description": "Expand a row group and edit its cells.",
    "parts": [
      "TreeGridRoot",
      "TreeGridRow",
      "TreeGridCell",
      "TreeGridDisclosure",
      "TreeGridEditor"
    ],
    "composition": [
      "Supply rows with ID, parentID and stable cell IDs. Keep expansion and selected cell separate. Provide getCellValue/setCellValue; render row visibility from expanded IDs."
    ],
    "interaction": [
      "Arrow keys navigate cells; Enter edits or commits and Escape cancels. Expansion controls visible descendants independently of cell selection."
    ]
  },
  {
    subject: 'MeterGroup', slug: 'meter-group', module: '@sectile/vue/meter-group',
    description: 'Show a shared storage budget as labeled segments.',
    parts: ['MeterGroupRoot', 'MeterGroupTrack', 'MeterGroupSegment', 'MeterGroupIndicator', 'MeterGroupList', 'MeterGroupItem'],
    composition: ['Supply stable segment IDs, labels and values. Each segment and legend item references the same ID. A single max defines the shared budget.'],
    interaction: ['This is a read-only measurement, not a slider. Updating the application-owned items recomputes the total, remaining budget and segment percentages.'],
  },
  {
    subject: 'QuantityField', slug: 'quantity-field', module: '@sectile/vue/quantity-field',
    description: 'Edit a length while keeping canonical and display units separate.',
    parts: ['QuantityFieldRoot', 'QuantityFieldInput', 'QuantityFieldUnitSelect'],
    composition: ['Create compatible unit policies once. Bind the canonical quantity and displayUnit separately; compose the native input and unit select inside the root.'],
    interaction: ['Commit a compatible expression or change its display unit. Invalid expressions retain an invalid state instead of silently changing dimension.'],
  },
  {
    subject: 'WindowSplitter', slug: 'window-splitter', module: '@sectile/vue/window-splitter',
    description: 'Resize two adjacent panels within explicit percentage bounds.',
    parts: ['WindowSplitterRoot', 'WindowSplitterPane', 'WindowSplitterHandle'],
    composition: ['Render before and after panes around the handle. The root supplies percentage geometry; application CSS owns pane presentation.'],
    interaction: ['Drag or use keyboard navigation on the separator. min and max constrain the first pane; the second receives the remaining percentage.'],
  },
  {
    "subject": "Grid",
    "slug": "grid",
    "module": "@sectile/vue/grid",
    "description": "Select a delivery slot in a two-row grid with coordinated cell navigation.",
    "parts": [
      "GridRoot",
      "GridRow",
      "GridCell"
    ],
    "composition": [
      "Supply rows of stable cell IDs and render matching cells. Bind v-model to the selected ID; highlightedValue is a separate focus-navigation value."
    ],
    "interaction": [
      "Arrow keys move through the grid. Selection and editing are separate capabilities; this example does not use cell editors."
    ]
  },
  {
    "subject": "TreeView",
    "slug": "tree-view",
    "module": "@sectile/vue/tree-view",
    "description": "Select a delivery service while controlling branch expansion separately.",
    "parts": [
      "TreeViewRoot",
      "TreeViewItem",
      "TreeViewGroup",
      "TreeViewDisclosure"
    ],
    "composition": [
      "Nodes declare stable IDs and parentID relationships. Compose child groups under their branch item and associate each disclosure with that branch."
    ],
    "interaction": [
      "Tree navigation follows the visible hierarchy. Expansion and selected values are separate arrays."
    ]
  },
  {
    "subject": "Feed",
    "slug": "feed",
    "module": "@sectile/vue/feed",
    "description": "Append a small local batch in response to a feed window request.",
    "parts": [
      "FeedRoot",
      "FeedItem",
      "FeedLoadNewer"
    ],
    "composition": [
      "Supply items, revision and requestGeneration. Answer requestWindow with a newer revision and the matching generation so stale requests are distinguishable."
    ],
    "interaction": [
      "The load control requests more items. The application supplies data; this example is local, bounded to 15 items and synchronous."
    ]
  },
  {
    "subject": "Menu",
    "slug": "menu",
    "module": "@sectile/vue/menu",
    "description": "Expose a persistently visible action menu with a nested sharing group.",
    "parts": [
      "MenuRoot",
      "MenuItem",
      "MenuSubContent"
    ],
    "composition": [
      "Items declare ID and parentID; null identifies top-level actions. Match item values and associate each submenu with its parent ID."
    ],
    "interaction": [
      "Arrow keys navigate the menu hierarchy. Activating a leaf emits invoke; the application performs the action."
    ]
  },
  {
    "subject": "Menubar",
    "slug": "menubar",
    "module": "@sectile/vue/menubar",
    "description": "Expose top-level application menus with nested actions.",
    "parts": [
      "MenubarRoot",
      "MenubarItem",
      "MenubarContent"
    ],
    "composition": [
      "Declare flat ID/parentID nodes. Keep top-level items in one horizontal row and connect each submenu to its parent with for."
    ],
    "interaction": [
      "Keyboard navigation moves through top-level menus and their children. Leaf activation emits an application action ID."
    ]
  },
  {
    "subject": "NavigationMenu",
    "slug": "navigation-menu",
    "module": "@sectile/vue/navigation-menu",
    "description": "Compose navigation links while keeping their destinations and routing in the application.",
    "parts": [
      "NavigationMenuRoot",
      "NavigationMenuList",
      "NavigationMenuItem",
      "NavigationMenuLink"
    ],
    "composition": [
      "Declare stable nodes and render link values that match them. Use as=a and an application-owned href for each link."
    ],
    "interaction": [
      "NavigationMenu coordinates keyboard navigation. The native link and application router determine the destination."
    ]
  },
  {
    "subject": "Tooltip",
    "slug": "tooltip",
    "module": "@sectile/vue/tooltip",
    "description": "Add supplementary help that is available from keyboard focus as well as pointer hover.",
    "parts": [
      "TooltipRoot",
      "TooltipTrigger",
      "TooltipPortal",
      "TooltipContent"
    ],
    "composition": [
      "Keep the trigger and portaled content under the same root. Use a visible trigger label; the tooltip supplies a supplementary description."
    ],
    "interaction": [
      "Focus or hover opens the tooltip. Do not place actions or inputs in tooltip content."
    ]
  },
  {
    "subject": "AlertDialog",
    "slug": "alert-dialog",
    "module": "@sectile/vue/alert-dialog",
    "description": "Ask for confirmation before changing the preview request state.",
    "parts": [
      "AlertDialogRoot",
      "AlertDialogTrigger",
      "AlertDialogPortal",
      "AlertDialogOverlay",
      "AlertDialogContent",
      "AlertDialogTitle",
      "AlertDialogDescription",
      "AlertDialogClose"
    ],
    "composition": [
      "Provide a title, description and explicit cancel/confirm actions. Application code decides what a confirmation does."
    ],
    "interaction": [
      "The alert dialog protects focus during the decision. A close control dismisses it; this example does not perform a server mutation."
    ]
  },
  {
    "subject": "Drawer",
    "slug": "drawer",
    "module": "@sectile/vue/drawer",
    "description": "Present delivery details in a modal panel attached to the right edge.",
    "parts": [
      "DrawerRoot",
      "DrawerTrigger",
      "DrawerPortal",
      "DrawerOverlay",
      "DrawerContent",
      "DrawerTitle",
      "DrawerDescription",
      "DrawerClose"
    ],
    "composition": [
      "Choose side on the root and place labeled content in its portal. Bind v-model:open when the application owns visibility."
    ],
    "interaction": [
      "Close the panel with its control or Escape. Modal focus handling keeps interaction within the open panel."
    ]
  },
  {
    "subject": "Toast",
    "slug": "toast",
    "module": "@sectile/vue/toast",
    "description": "Show bounded, dismissible feedback without interrupting the current task.",
    "parts": [
      "ToastProvider",
      "ToastPortal",
      "ToastViewport",
      "ToastRoot",
      "ToastTitle",
      "ToastDescription",
      "ToastClose"
    ],
    "composition": [
      "The provider owns notifications; the slot exposes toast and dismissal actions. Give every pushed notification a unique ID and each root its matching value."
    ],
    "interaction": [
      "Notifications can expire or be dismissed. maxVisible bounds the visible collection; this example disables the global hotkey."
    ]
  },
  {
    "subject": "MenuButton",
    "slug": "menu-button",
    "module": "@sectile/vue/menu-button",
    "description": "Open message actions from one trigger while retaining explicit unavailable items.",
    "parts": [
      "MenuButtonRoot",
      "MenuButtonTrigger",
      "MenuButtonContent",
      "MenuItem"
    ],
    "composition": [
      "Supply action nodes with stable IDs and matching MenuItem values. Handle invoke to run an application action."
    ],
    "interaction": [
      "The trigger opens the menu; arrow keys move through enabled actions. Activation emits the action ID. Escape dismisses the menu."
    ]
  },
  {
    "subject": "Toolbar",
    "slug": "toolbar",
    "module": "@sectile/vue/toolbar",
    "description": "Coordinate keyboard focus among message actions without treating them as selected values.",
    "parts": [
      "ToolbarRoot",
      "ToolbarItem"
    ],
    "composition": [
      "Provide item values and matching action buttons. The invoke event identifies the action; v-model represents the highlighted item rather than a pressed selection."
    ],
    "interaction": [
      "Arrow keys move between enabled actions. Enter or Space invokes the focused action."
    ]
  },
  {
    "subject": "Pagination",
    "slug": "pagination",
    "module": "@sectile/vue/pagination",
    "description": "Navigate six delivery pages while the application owns both the page number and page size.",
    "parts": [
      "PaginationRoot",
      "PaginationItem",
      "PaginationPrevious",
      "PaginationNext"
    ],
    "composition": [
      "Bind page and itemsPerPage together when using controlled state. Render page items from the root slot and leave fetching to the application."
    ],
    "interaction": [
      "Controls and page buttons update the selected page. The slot exposes page count and the current item range."
    ]
  },
  {
    "subject": "Stepper",
    "slug": "stepper",
    "module": "@sectile/vue/stepper",
    "description": "Navigate a three-step workflow without advancing merely because focus changes.",
    "parts": [
      "StepperRoot",
      "StepperList",
      "StepperStep",
      "StepperContent",
      "StepperPrevious",
      "StepperNext"
    ],
    "composition": [
      "Supply ordered step values and matching content. Bind v-model to the current step."
    ],
    "interaction": [
      "Steps use manual activation. Previous and Next choose an available adjacent step; workflow validation remains application-owned."
    ]
  },
  {
    "subject": "CheckboxGroup",
    "slug": "checkbox-group",
    "module": "@sectile/vue/checkbox-group",
    "description": "Coordinate several independently checked notification channels in one application array.",
    "parts": [
      "CheckboxGroupRoot",
      "CheckboxGroupItem",
      "CheckboxGroupIndicator"
    ],
    "composition": [
      "Provide ordered items and matching values. Keep each checkbox outline outside its conditional indicator."
    ],
    "interaction": [
      "Activate each checkbox to add or remove its value. The root emits the selected string collection."
    ]
  },
  {
    "subject": "MultiThumbSlider",
    "slug": "multi-thumb-slider",
    "module": "@sectile/vue/multi-thumb-slider",
    "description": "Choose a price interval with two separately named and focusable thumbs.",
    "parts": [
      "MultiThumbSliderRoot",
      "MultiThumbSliderTrack",
      "MultiThumbSliderRange",
      "MultiThumbSliderThumb"
    ],
    "composition": [
      "Supply stable thumb IDs and values in the same order. Each value must lie on the configured exact step."
    ],
    "interaction": [
      "Pointer or keyboard input moves the active thumb. Supply a distinct accessible label for each endpoint."
    ]
  },
  {
    "subject": "Carousel",
    "slug": "carousel",
    "module": "@sectile/vue/carousel",
    "description": "Switch delivery services while the outgoing slide remains present for its exit transition.",
    "parts": [
      "CarouselRoot",
      "CarouselViewport",
      "CarouselTrack",
      "CarouselSlide",
      "CarouselIndicatorGroup",
      "CarouselIndicator",
      "CarouselPrevious",
      "CarouselNext"
    ],
    "composition": [
      "Supply slide IDs and matching slide values. Place overlapping slides in one grid cell and style active/inactive data-state attributes."
    ],
    "interaction": [
      "The outgoing slide becomes inert while its transition finishes. Reduced motion removes the transition; autoplay is disabled in this example."
    ]
  },
  {
    "subject": "Select",
    "slug": "select",
    "module": "@sectile/vue/select",
    "description": "Select one delivery method while an unavailable option remains visible but cannot be chosen.",
    "parts": [
      "SelectRoot",
      "SelectTrigger",
      "SelectValue",
      "SelectContent",
      "SelectViewport",
      "SelectItem",
      "SelectItemText"
    ],
    "composition": [
      "Provide ordered item values, matching items and a visible trigger. Bind v-model to the selected string or null."
    ],
    "interaction": [
      "The trigger opens the list. Arrow keys navigate enabled choices; Enter accepts a choice and Escape dismisses the list."
    ]
  },
  {
    "subject": "Combobox",
    "slug": "combobox",
    "module": "@sectile/vue/combobox",
    "description": "Search a small member collection while keeping the query separate from the selected member ID.",
    "parts": [
      "ComboboxRoot",
      "ComboboxInput",
      "ComboboxContent",
      "ComboboxItem",
      "ComboboxEmpty"
    ],
    "composition": [
      "Each item has a stable id and label. v-model owns the accepted ID; v-model:inputValue owns the editable search text."
    ],
    "interaction": [
      "Typing filters matches. Arrow keys highlight an available result and Enter accepts it. ComboboxEmpty describes a query with no results."
    ]
  },
  {
    "subject": "Listbox",
    "slug": "listbox",
    "module": "@sectile/vue/listbox",
    "description": "Choose several notification destinations from a persistently visible list.",
    "parts": [
      "ListboxRoot",
      "ListboxItem",
      "ListboxItemIndicator"
    ],
    "composition": [
      "Supply item values and selectionMode. In multiple mode, bind v-model to an array of selected strings."
    ],
    "interaction": [
      "Arrow keys navigate items. Each item exposes aria-selected so selection can be styled without relying on its text."
    ]
  },
  {
    "subject": "TagsInput",
    "slug": "tags-input",
    "module": "@sectile/vue/tags-input",
    "description": "Edit a collection of delivery tags with a native text input and explicit removal controls.",
    "parts": [
      "TagsInputRoot",
      "TagsInputInput",
      "TagsInputItem",
      "TagsInputItemText",
      "TagsInputItemDelete",
      "TagsInputClear"
    ],
    "composition": [
      "Bind v-model to an array of strings. Give each item its current index and put its text and removal control inside that item."
    ],
    "interaction": [
      "Enter commits a typed tag. A removal control deletes one tag; Clear removes the whole collection."
    ]
  },
  {
    "subject": "PinInput",
    "slug": "pin-input",
    "module": "@sectile/vue/pin-input",
    "description": "Collect a four-character verification code in coordinated input segments.",
    "parts": [
      "PinInputRoot",
      "PinInputInput"
    ],
    "composition": [
      "Set length and use zero-based input indexes. Bind v-model to the complete string. otp requests one-time-code input semantics; it does not verify a code."
    ],
    "interaction": [
      "Typing advances between segments. The root slot exposes complete when all segments are filled."
    ]
  },
  {
    "subject": "Editable",
    "slug": "editable",
    "module": "@sectile/vue/editable",
    "description": "Edit a delivery name while keeping the saved value separate from its active draft.",
    "parts": [
      "EditableRoot",
      "EditableArea",
      "EditablePreview",
      "EditableInput",
      "EditableEditTrigger",
      "EditableSubmitTrigger",
      "EditableCancelTrigger"
    ],
    "composition": [
      "Keep the preview, input and action triggers under the same root. Bind v-model to the committed string; submitOnBlur=false keeps saving explicit."
    ],
    "interaction": [
      "Edit starts a draft. Save commits that draft; Cancel restores the committed value."
    ]
  },
  {
    "subject": "NumberField",
    "slug": "number-field",
    "module": "@sectile/vue/number-field",
    "description": "Enter a parcel weight while keeping its committed decimal value as a string.",
    "parts": [
      "NumberField"
    ],
    "composition": [
      "Bind v-model to a string or null and provide a visible label. A draft can differ from the committed value while the user is editing."
    ],
    "interaction": [
      "Native editing and composition are retained. A null value represents an empty field."
    ]
  },
  {
    "subject": "SpinButton",
    "slug": "spin-button",
    "module": "@sectile/vue/spin-button",
    "description": "Edit a parcel quantity directly or advance through an exact range with increment and decrement controls.",
    "parts": [
      "SpinButtonRoot",
      "SpinButtonInput",
      "SpinButtonIncrement",
      "SpinButtonDecrement"
    ],
    "composition": [
      "Provide min and max on the root. Place the input and stepping triggers under that root; v-model receives decimal strings."
    ],
    "interaction": [
      "Arrow keys and the step controls change the quantity. Text editing and committed values are coordinated by the input."
    ]
  },
  {
    "subject": "Slider",
    "slug": "slider",
    "module": "@sectile/vue/slider",
    "description": "Choose notification volume from an exact range with pointer and keyboard input.",
    "parts": [
      "SliderRoot",
      "SliderTrack",
      "SliderRange",
      "SliderThumb",
      "SliderInput"
    ],
    "composition": [
      "Place the range and thumb inside the track. Bind v-model to a value that lies exactly on the configured step."
    ],
    "interaction": [
      "Arrow keys advance one step. Home and End move to the range endpoints. Supply an accessible label for the thumb."
    ]
  },
  {
    "subject": "Progress",
    "slug": "progress",
    "module": "@sectile/vue/progress",
    "description": "Report completed work against a maximum without making the indicator itself editable.",
    "parts": [
      "ProgressRoot",
      "ProgressTrack",
      "ProgressIndicator",
      "ProgressValueText"
    ],
    "composition": [
      "Supply value and max on the root. A null value represents indeterminate progress; known progress exposes its percentage as a CSS variable."
    ],
    "interaction": [
      "Progress communicates status rather than accepting input. This example uses separate application buttons to advance its simulated upload."
    ]
  },
  {
    "subject": "Meter",
    "slug": "meter",
    "module": "@sectile/vue/meter",
    "description": "Describe a measured value within a range and show whether its configured thresholds are preferable.",
    "parts": [
      "MeterRoot",
      "MeterTrack",
      "MeterIndicator",
      "MeterValueText"
    ],
    "composition": [
      "Provide value, min and max. low, high and optimum describe the preferred part of the range. Keep a visible explanation of the measurement."
    ],
    "interaction": [
      "A meter reports a measurement, not task completion. The slot exposes zone so the application can show equivalent text alongside color."
    ]
  },
  {
    "subject": "Rating",
    "slug": "rating",
    "module": "@sectile/vue/rating",
    "description": "Select a delivery score or leave the question unanswered by clearing the selection.",
    "parts": [
      "RatingRoot",
      "RatingItem",
      "RatingIndicator",
      "RatingClear"
    ],
    "composition": [
      "Provide ordered string values and matching RatingItem values. Bind v-model to the selected string; an empty string represents no answer."
    ],
    "interaction": [
      "Arrow keys move through available scores. clearable permits RatingClear to remove the selected score."
    ]
  },
  {
    "subject": "Timer",
    "slug": "timer",
    "module": "@sectile/vue/timer",
    "description": "Start, pause, resume and reset a ten-second countdown without starting it on page load.",
    "parts": [
      "TimerRoot",
      "TimerControl",
      "TimerItem",
      "TimerActionTrigger"
    ],
    "composition": [
      "Configure startMs, targetMs and countdown on the root. TimerItem renders a named time part; action triggers control the same timer."
    ],
    "interaction": [
      "The timer starts only when requested here. It owns its scheduled updates and disconnects when the root unmounts."
    ]
  },
  {
    subject: 'Accordion', slug: 'accordion', module: '@sectile/vue/accordion',
    description: 'Organize related sections into expandable panels with one or several panels open at a time.',
    parts: ['AccordionRoot', 'AccordionItem', 'AccordionHeader', 'AccordionTrigger', 'AccordionContent'],
    composition: ['Provide panel values in the root items array. Each item wraps its heading, trigger, and content.', 'Single mode uses a string value; multiple mode uses an array. Set collapsible to false when the selected panel should remain open.'],
    interaction: ['Activate a heading button to toggle its panel. Arrow keys move between heading buttons; Home and End move to the first and last available heading.'],
  },
  {
    subject: 'Text', slug: 'text', module: '@sectile/vue/text',
    description: 'Connect application text to a native input or textarea while retaining native editing and composition.',
    parts: ['TextField'],
    composition: ['Wrap TextField in a visible label, or associate it with a label using an id. Bind v-model to your application value.', 'multiline renders a textarea. v-model.lazy commits on the native change event rather than on each edit.'],
    interaction: ['Native selection, clipboard editing, and text composition remain available. readonly permits reading and selection without editing; disabled prevents interaction.'],
  },
  {
    subject: 'Switch', slug: 'switch', module: '@sectile/vue/switch',
    description: 'A boolean setting with a persistent thumb. Application state can own the checked value.',
    parts: ['SwitchRoot', 'SwitchThumb'],
    composition: ['Place SwitchThumb inside SwitchRoot and provide a visible label. Bind v-model to a boolean value, or use defaultValue for component-owned state.'],
    interaction: ['Tab focuses the switch. Space toggles its checked state. disabled prevents interaction; readonly preserves the value without disabling focus.'],
  },
  {
    subject: 'ToggleButton', slug: 'toggle-button', module: '@sectile/vue/toggle-button',
    description: 'A button that keeps a pressed state, such as pinning a conversation or enabling a text format.',
    parts: ['ToggleButton'],
    composition: ['Bind v-model to a boolean pressed value. The visible label names the action; aria-pressed communicates its current state.'],
    interaction: ['Activate the button with Space, Enter, or a pointer. disabled prevents activation; readonly keeps the pressed value fixed.'],
  },
  {
    subject: 'ToggleGroup', slug: 'toggle-group', module: '@sectile/vue/toggle-group',
    description: 'Coordinate several pressed choices with shared keyboard navigation and single or multiple selection.',
    parts: ['ToggleGroupRoot', 'ToggleGroupItem'],
    composition: ['Give the root an items array and each ToggleGroupItem a matching value. v-model is an array even when only one choice is allowed.', 'Enable multiple for independent choices. disabledItems identifies choices that cannot be activated.'],
    interaction: ['Arrow keys move focus through enabled items. Space or Enter toggles the focused choice. Provide a label for the group.'],
  },
  {
    subject: 'RadioGroup', slug: 'radio-group', module: '@sectile/vue/radio-group',
    description: 'Choose one option from a labeled group, with selection and keyboard focus coordinated across its items.',
    parts: ['RadioGroupRoot', 'RadioGroupItem', 'RadioGroupIndicator'],
    composition: ['Give the root an items array and each RadioGroupItem a matching value. Bind v-model to the selected string and give the group an accessible label.', 'Keep the visible radio box outside RadioGroupIndicator so its outline persists when the item is unchecked.'],
    interaction: ['Arrow keys move through enabled options. disabledItems excludes unavailable choices from activation.'],
  },
  {
    subject: 'Tabs', slug: 'tabs', module: '@sectile/vue/tabs',
    description: 'Switch between related sections with coordinated tab selection, focus, and panel visibility.',
    parts: ['TabsRoot', 'TabsList', 'TabsTrigger', 'TabsContent'],
    composition: ['Provide item values on TabsRoot, then use matching values on TabsTrigger and TabsContent. Give TabsList a label.', 'Bind v-model to the selected string. activationMode can be automatic or manual; disabledItems identifies unavailable sections.'],
    interaction: ['Arrow keys move focus through enabled tabs. In manual mode, Enter or Space activates the focused tab without selecting it merely because focus moved.'],
  },
  {
    subject: 'Popover', slug: 'popover', module: '@sectile/vue/popover',
    description: 'Show a positioned, non-modal surface beside its trigger without blocking the rest of the page.',
    parts: ['PopoverRoot', 'PopoverTrigger', 'PopoverPortal', 'PopoverContent', 'PopoverTitle', 'PopoverDescription', 'PopoverClose'],
    composition: ['Keep the trigger and portal under PopoverRoot. Place labeled content and a close control inside the portal. Bind v-model:open when your application owns open state.'],
    interaction: ['Activate the trigger to toggle the surface. Escape, the close control, or an outside interaction dismisses it by default. The surface is non-modal; it does not require a page-wide overlay.'],
  },
  {
    subject: 'Checkbox', slug: 'checkbox', module: '@sectile/vue/checkbox',
    description: 'A two-state or indeterminate selection control. Compose its interactive root and conditional indicator, with state owned by the component or your application.',
    parts: ['CheckboxRoot', 'CheckboxIndicator'],
    composition: ['The root renders the interactive element; the indicator appears for checked or indeterminate state. Give the root a visible label or an aria-label.', 'Bind v-model when the application owns the value. Use defaultValue for an initial component-owned value.'],
    interaction: ['Tab focuses the control. Space changes its checked state. disabled prevents interaction; readonly keeps the value fixed without making the control disabled.'],
  },
  {
    subject: 'Dialog', slug: 'dialog', module: '@sectile/vue/dialog',
    description: 'A modal surface for a task that needs protected focus. Compose a trigger, portal, overlay, and labeled content while Sectile coordinates dismissal and focus.',
    parts: ['DialogRoot', 'DialogTrigger', 'DialogPortal', 'DialogOverlay', 'DialogContent', 'DialogTitle', 'DialogDescription', 'DialogClose'],
    composition: ['Keep the trigger and portal under the same DialogRoot. Place the overlay, content, title, description, and close control inside the portal.', 'DialogTitle and DialogDescription supply the accessible name and description. Bind v-model:open when the application owns open state.'],
    interaction: ['The default modal dialog moves focus into its content and keeps keyboard focus inside while open. Escape dismisses it; focus returns to the trigger on close. A visible close control gives pointer and keyboard users an explicit way to dismiss it.'],
  },
  {
    subject: 'Disclosure', slug: 'disclosure', module: '@sectile/vue/disclosure',
    description: 'Show or hide a section of content. Its presence handling retains the section during an exit transition and makes the exiting content inert.',
    parts: ['DisclosureRoot', 'DisclosureTrigger', 'DisclosureContent'],
    composition: ['Place the trigger and content inside DisclosureRoot. Bind v-model when your application owns the open state.'],
    interaction: ['Style the content’s data-state attribute with CSS transitions. During an exit, content remains present but inert; once the transition ends it becomes hidden. Reopening during an exit keeps the content available. A reduced-motion rule can disable the transition.'],
  },
];

export function componentPath(subject: string): string {
  const component = components.find((entry) => entry.subject === subject);
  if (!component) throw new TypeError(`Unknown documented component: ${subject}`);
  return `/vue/components/${component.slug}`;
}

export interface ExampleDefinition {
  readonly id: string;
  readonly host: ExampleHost;
  readonly area: ExampleArea;
  readonly subject: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly focus: string;
  readonly kind: ExampleKind;
  readonly fixture: PreviewFixture;
  readonly tags: readonly string[];
  readonly sourceOwner: ExampleHost;
  readonly previewPath: string;
  readonly code: readonly {
    readonly label: string;
    readonly language: 'vue' | 'ts';
    readonly path: string;
  }[];
  readonly related: readonly string[];
}

export const examples: readonly ExampleDefinition[] = [
  {
    id: 'vue-tabular-sortable-data-grid', host: 'vue', area: 'tabular', subject: 'DataGrid', slug: 'sortable-data-grid', title: 'Sort and search a data grid',
    description: 'Evaluate sort and search requests with a bounded client source.', focus: 'Query-driven sort and filtering', kind: 'behavior', fixture: 'table', tags: ['query', 'source', 'grid'], sourceOwner: 'vue', previewPath: './vue/tabular/sortable-data-grid/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/tabular/sortable-data-grid/Preview.vue' }, { label: 'Source', language: 'ts', path: './vue/tabular/local-source/example.ts' }], related: [],
  },
  {
    id: 'vue-tabular-grouped-data-tree-grid', host: 'vue', area: 'tabular', subject: 'DataTreeGrid', slug: 'grouped-data-tree-grid', title: 'Grouped member tree grid',
    description: 'Request grouped rows and expand their matching source view.', focus: 'Grouping and expansion requests', kind: 'behavior', fixture: 'table', tags: ['groups', 'expansion', 'source'], sourceOwner: 'vue', previewPath: './vue/tabular/grouped-data-tree-grid/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/tabular/grouped-data-tree-grid/Preview.vue' }, { label: 'Source', language: 'ts', path: './vue/tabular/local-source/example.ts' }], related: [],
  },
  {
    id: 'vue-form-validation-and-server-issues', host: 'vue', area: 'form', subject: 'Form', slug: 'validation-and-server-issues',
    title: 'Validation and submission issues', description: 'Combine native constraints, cross-field validation, returned field issues and reset.', focus: 'Field validation and failed submissions',
    kind: 'behavior', fixture: 'form', tags: ['validation', 'server issues', 'reset'], sourceOwner: 'vue', previewPath: './vue/form/validation-and-server-issues/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/form/validation-and-server-issues/Preview.vue' }, { label: 'Handlers', language: 'ts', path: './vue/form/validation-and-server-issues/example.ts' }], related: [],
  },
  {
    id: 'vue-components-primitive-element-adoption', host: 'vue', area: 'components', subject: 'Primitive', slug: 'primitive/element-adoption',
    title: 'Adopt an application element', description: 'Merge handlers and attributes without adding a wrapper.', focus: 'Single-element adoption', kind: 'behavior', fixture: 'control', tags: ['composition'], sourceOwner: 'vue', previewPath: './vue/components/primitive/element-adoption/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/primitive/element-adoption/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-host-provider-rtl-tabs', host: 'vue', area: 'components', subject: 'HostProvider', slug: 'host-provider/rtl-tabs',
    title: 'Shared direction context', description: 'Change host interaction direction and application visual direction together.', focus: 'LTR and RTL tabs', kind: 'behavior', fixture: 'surface', tags: ['direction', 'context'], sourceOwner: 'vue', previewPath: './vue/components/host-provider/rtl-tabs/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/host-provider/rtl-tabs/Preview.vue' }], related: [],
  },
  {
    "id": "vue-components-cascade-list-visible-columns",
    "host": "vue",
    "area": "components",
    "subject": "CascadeList",
    "slug": "cascade-list/visible-columns",
    "title": "Hierarchical delivery cities",
    "description": "Choose a leaf from visible country and city columns.",
    "focus": "Hierarchical delivery cities",
    "kind": "behavior",
    "fixture": "surface",
    "tags": [
      "CascadeList"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/cascade-list/visible-columns/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/cascade-list/visible-columns/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-cascade-select-hierarchical-choice",
    "host": "vue",
    "area": "components",
    "subject": "CascadeSelect",
    "slug": "cascade-select/hierarchical-choice",
    "title": "Collapsible city selection",
    "description": "Choose a hierarchical leaf from a trigger-controlled panel.",
    "focus": "Collapsible city selection",
    "kind": "behavior",
    "fixture": "surface",
    "tags": [
      "CascadeSelect"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/cascade-select/hierarchical-choice/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/cascade-select/hierarchical-choice/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-color-picker-native-and-text",
    "host": "vue",
    "area": "components",
    "subject": "ColorPicker",
    "slug": "color-picker/native-and-text",
    "title": "Native and text color input",
    "description": "Edit one committed color through native and text inputs.",
    "focus": "Native and text color input",
    "kind": "behavior",
    "fixture": "surface",
    "tags": [
      "ColorPicker"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/color-picker/native-and-text/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/color-picker/native-and-text/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-reorder-delivery-sequence",
    "host": "vue",
    "area": "components",
    "subject": "Reorder",
    "slug": "reorder/delivery-sequence",
    "title": "Delivery stop order",
    "description": "Reorder a bounded sequence with pointer or keyboard input.",
    "focus": "Delivery stop order",
    "kind": "behavior",
    "fixture": "surface",
    "tags": [
      "Reorder"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/reorder/delivery-sequence/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/reorder/delivery-sequence/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-tree-grid-editable-parcels",
    "host": "vue",
    "area": "components",
    "subject": "TreeGrid",
    "slug": "tree-grid/editable-parcels",
    "title": "Editable parcel hierarchy",
    "description": "Expand a row group and edit its cells.",
    "focus": "Editable parcel hierarchy",
    "kind": "behavior",
    "fixture": "surface",
    "tags": [
      "TreeGrid"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/tree-grid/editable-parcels/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/tree-grid/editable-parcels/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-temporal-date-popover",
    "host": "vue",
    "area": "temporal",
    "subject": "DatePicker",
    "slug": "date-popover",
    "title": "Choose a delivery date",
    "description": "Calendar selection and typed date input.",
    "focus": "Calendar selection and typed date input",
    "kind": "behavior",
    "fixture": "surface",
    "tags": [
      "day",
      "single selection"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/temporal/date-popover/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/temporal/date-popover/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-temporal-date-range-popover",
    "host": "vue",
    "area": "temporal",
    "subject": "DateRangePicker",
    "slug": "date-range-popover",
    "title": "Choose a delivery window",
    "description": "Range endpoints and calendar selection.",
    "focus": "Range endpoints and calendar selection",
    "kind": "behavior",
    "fixture": "surface",
    "tags": [
      "day",
      "range"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/temporal/date-range-popover/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/temporal/date-range-popover/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-temporal-inline-range-calendar",
    "host": "vue",
    "area": "temporal",
    "subject": "RangeCalendar",
    "slug": "inline-range-calendar",
    "title": "Inline date range",
    "description": "Visible range selection.",
    "focus": "Visible range selection",
    "kind": "behavior",
    "fixture": "surface",
    "tags": [
      "day",
      "range"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/temporal/inline-range-calendar/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/temporal/inline-range-calendar/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-temporal-month-selection",
    "host": "vue",
    "area": "temporal",
    "subject": "MonthPicker",
    "slug": "month-selection",
    "title": "Choose a billing month",
    "description": "Month-granularity selection.",
    "focus": "Month-granularity selection",
    "kind": "behavior",
    "fixture": "surface",
    "tags": [
      "month",
      "single selection"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/temporal/month-selection/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/temporal/month-selection/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-temporal-month-range-selection",
    "host": "vue",
    "area": "temporal",
    "subject": "MonthRangePicker",
    "slug": "month-range-selection",
    "title": "Choose a billing period",
    "description": "Month-granularity range selection.",
    "focus": "Month-granularity range selection",
    "kind": "behavior",
    "fixture": "surface",
    "tags": [
      "month",
      "range"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/temporal/month-range-selection/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/temporal/month-range-selection/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-temporal-year-selection",
    "host": "vue",
    "area": "temporal",
    "subject": "YearPicker",
    "slug": "year-selection",
    "title": "Choose a reporting year",
    "description": "Year-granularity selection.",
    "focus": "Year-granularity selection",
    "kind": "behavior",
    "fixture": "surface",
    "tags": [
      "year",
      "single selection"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/temporal/year-selection/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/temporal/year-selection/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-temporal-year-range-selection",
    "host": "vue",
    "area": "temporal",
    "subject": "YearRangePicker",
    "slug": "year-range-selection",
    "title": "Choose reporting years",
    "description": "Year-granularity range selection.",
    "focus": "Year-granularity range selection",
    "kind": "behavior",
    "fixture": "surface",
    "tags": [
      "year",
      "range"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/temporal/year-range-selection/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/temporal/year-range-selection/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-temporal-date-time-selection",
    "host": "vue",
    "area": "temporal",
    "subject": "DateTimePicker",
    "slug": "date-time-selection",
    "title": "Choose a dispatch date and time",
    "description": "Calendar date and typed local time.",
    "focus": "Calendar date and typed local time",
    "kind": "behavior",
    "fixture": "surface",
    "tags": [
      "day",
      "single selection"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/temporal/date-time-selection/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/temporal/date-time-selection/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-temporal-date-time-range-selection",
    "host": "vue",
    "area": "temporal",
    "subject": "DateTimeRangePicker",
    "slug": "date-time-range-selection",
    "title": "Choose a dispatch interval",
    "description": "Local date-time range endpoints.",
    "focus": "Local date-time range endpoints",
    "kind": "behavior",
    "fixture": "surface",
    "tags": [
      "day",
      "range"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/temporal/date-time-range-selection/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/temporal/date-time-range-selection/Preview.vue"
      }
    ],
    "related": []
  },
  {
    id: 'vue-components-meter-group-storage-budget', host: 'vue', area: 'components', subject: 'MeterGroup', slug: 'meter-group/storage-budget',
    title: 'Shared storage budget', description: 'Update two labeled segments within one measurement budget.', focus: 'Segment totals and remaining budget',
    kind: 'behavior', fixture: 'surface', tags: ['measurement', 'segments'], sourceOwner: 'vue',
    previewPath: './vue/components/meter-group/storage-budget/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/meter-group/storage-budget/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-quantity-field-unit-conversion', host: 'vue', area: 'components', subject: 'QuantityField', slug: 'quantity-field/unit-conversion',
    title: 'Canonical and display units', description: 'Edit a metric length without changing its canonical unit.', focus: 'Unit conversion and invalid expressions',
    kind: 'behavior', fixture: 'control', tags: ['units', 'canonical value'], sourceOwner: 'vue',
    previewPath: './vue/components/quantity-field/unit-conversion/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/quantity-field/unit-conversion/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-window-splitter-bounded-panes', host: 'vue', area: 'components', subject: 'WindowSplitter', slug: 'window-splitter/bounded-panes',
    title: 'Bounded resizable panels', description: 'Keep both panes usable with 25–75% bounds.', focus: 'Pointer and keyboard resizing',
    kind: 'behavior', fixture: 'surface', tags: ['separator', 'bounds'], sourceOwner: 'vue',
    previewPath: './vue/components/window-splitter/bounded-panes/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/window-splitter/bounded-panes/Preview.vue' }], related: [],
  },
  {
    "id": "vue-virtual-measured-list",
    "host": "vue",
    "area": "virtual",
    "subject": "VirtualList",
    "slug": "measured-list",
    "title": "Measured delivery notes",
    "description": "Virtualize different note lengths with mounted-content size ownership.",
    "focus": "Measured delivery notes",
    "kind": "behavior",
    "fixture": "viewport",
    "tags": [
      "VirtualList",
      "size ownership"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/virtual/measured-list/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/virtual/measured-list/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-virtual-responsive-grid",
    "host": "vue",
    "area": "virtual",
    "subject": "VirtualGrid",
    "slug": "responsive-grid",
    "title": "Responsive virtual lanes",
    "description": "Pack fixed-height parcels into one to three responsive lanes.",
    "focus": "Responsive virtual lanes",
    "kind": "behavior",
    "fixture": "viewport",
    "tags": [
      "VirtualGrid",
      "size ownership"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/virtual/responsive-grid/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/virtual/responsive-grid/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-virtual-masonry-notes",
    "host": "vue",
    "area": "virtual",
    "subject": "VirtualMasonry",
    "slug": "masonry-notes",
    "title": "Measured masonry cards",
    "description": "Start with an estimate and refine the heights of mounted delivery notes.",
    "focus": "Measured masonry cards",
    "kind": "behavior",
    "fixture": "viewport",
    "tags": [
      "VirtualMasonry",
      "size ownership"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/virtual/masonry-notes/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/virtual/masonry-notes/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-virtual-spatial-rectangles",
    "host": "vue",
    "area": "virtual",
    "subject": "VirtualSpatial",
    "slug": "spatial-rectangles",
    "title": "Declared spatial rectangles",
    "description": "Project application-owned rectangles into a two-dimensional scrollport.",
    "focus": "Declared spatial rectangles",
    "kind": "behavior",
    "fixture": "viewport",
    "tags": [
      "VirtualSpatial",
      "size ownership"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/virtual/spatial-rectangles/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/virtual/spatial-rectangles/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-grid-two-dimensional-selection",
    "host": "vue",
    "area": "components",
    "subject": "Grid",
    "slug": "grid/two-dimensional-selection",
    "title": "Two-dimensional selection",
    "description": "Select a delivery slot in a two-row grid with coordinated cell navigation.",
    "focus": "Two-dimensional selection",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Grid"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/grid/two-dimensional-selection/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/grid/two-dimensional-selection/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-tree-view-expanded-selection",
    "host": "vue",
    "area": "components",
    "subject": "TreeView",
    "slug": "tree-view/expanded-selection",
    "title": "Expansion and selection",
    "description": "Select a delivery service while controlling branch expansion separately.",
    "focus": "Expansion and selection",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "TreeView"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/tree-view/expanded-selection/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/tree-view/expanded-selection/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-feed-window-request",
    "host": "vue",
    "area": "components",
    "subject": "Feed",
    "slug": "feed/window-request",
    "title": "Accepting a window request",
    "description": "Append a small local batch in response to a feed window request.",
    "focus": "Accepting a window request",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Feed"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/feed/window-request/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/feed/window-request/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-menu-nested-actions",
    "host": "vue",
    "area": "components",
    "subject": "Menu",
    "slug": "menu/nested-actions",
    "title": "Nested action menus",
    "description": "Expose a persistently visible action menu with a nested sharing group.",
    "focus": "Nested action menus",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Menu"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/menu/nested-actions/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/menu/nested-actions/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-menubar-nested-actions",
    "host": "vue",
    "area": "components",
    "subject": "Menubar",
    "slug": "menubar/nested-actions",
    "title": "A menu bar with submenus",
    "description": "Expose top-level application menus with nested actions.",
    "focus": "A menu bar with submenus",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Menubar"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/menubar/nested-actions/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/menubar/nested-actions/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-navigation-menu-link-destinations",
    "host": "vue",
    "area": "components",
    "subject": "NavigationMenu",
    "slug": "navigation-menu/link-destinations",
    "title": "Application-owned destinations",
    "description": "Compose navigation links while keeping their destinations and routing in the application.",
    "focus": "Application-owned destinations",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "NavigationMenu"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/navigation-menu/link-destinations/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/navigation-menu/link-destinations/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-tooltip-focus-hover",
    "host": "vue",
    "area": "components",
    "subject": "Tooltip",
    "slug": "tooltip/focus-hover",
    "title": "A focus and hover tooltip",
    "description": "Add supplementary help that is available from keyboard focus as well as pointer hover.",
    "focus": "A focus and hover tooltip",
    "kind": "behavior",
    "fixture": "surface",
    "tags": [
      "Tooltip"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/tooltip/focus-hover/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/tooltip/focus-hover/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-alert-dialog-explicit-confirmation",
    "host": "vue",
    "area": "components",
    "subject": "AlertDialog",
    "slug": "alert-dialog/explicit-confirmation",
    "title": "Explicit confirmation",
    "description": "Ask for confirmation before changing the preview request state.",
    "focus": "Explicit confirmation",
    "kind": "behavior",
    "fixture": "surface",
    "tags": [
      "AlertDialog"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/alert-dialog/explicit-confirmation/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/alert-dialog/explicit-confirmation/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-drawer-side-panel",
    "host": "vue",
    "area": "components",
    "subject": "Drawer",
    "slug": "drawer/side-panel",
    "title": "A right-side drawer",
    "description": "Present delivery details in a modal panel attached to the right edge.",
    "focus": "A right-side drawer",
    "kind": "behavior",
    "fixture": "surface",
    "tags": [
      "Drawer"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/drawer/side-panel/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/drawer/side-panel/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-toast-transient-feedback",
    "host": "vue",
    "area": "components",
    "subject": "Toast",
    "slug": "toast/transient-feedback",
    "title": "Transient feedback",
    "description": "Show bounded, dismissible feedback without interrupting the current task.",
    "focus": "Transient feedback",
    "kind": "behavior",
    "fixture": "surface",
    "tags": [
      "Toast"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/toast/transient-feedback/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/toast/transient-feedback/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-menu-button-action-menu",
    "host": "vue",
    "area": "components",
    "subject": "MenuButton",
    "slug": "menu-button/action-menu",
    "title": "An action menu",
    "description": "Open message actions from one trigger while retaining explicit unavailable items.",
    "focus": "An action menu",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "MenuButton"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/menu-button/action-menu/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/menu-button/action-menu/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-dialog-exit-transition",
    "host": "vue",
    "area": "components",
    "subject": "Dialog",
    "slug": "dialog/exit-transition",
    "title": "Retained dialog reopening",
    "description": "Close and reopen a modal during its CSS exit transition without replacing its state owner.",
    "focus": "Retained dialog reopening",
    "kind": "styling",
    "fixture": "surface",
    "tags": [
      "Dialog"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/dialog/exit-transition/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/dialog/exit-transition/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-toolbar-action-navigation",
    "host": "vue",
    "area": "components",
    "subject": "Toolbar",
    "slug": "toolbar/action-navigation",
    "title": "Keyboard action navigation",
    "description": "Coordinate keyboard focus among message actions without treating them as selected values.",
    "focus": "Keyboard action navigation",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Toolbar"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/toolbar/action-navigation/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/toolbar/action-navigation/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-pagination-page-selection",
    "host": "vue",
    "area": "components",
    "subject": "Pagination",
    "slug": "pagination/page-selection",
    "title": "Application-owned pagination",
    "description": "Navigate six delivery pages while the application owns both the page number and page size.",
    "focus": "Application-owned pagination",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Pagination"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/pagination/page-selection/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/pagination/page-selection/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-stepper-manual-steps",
    "host": "vue",
    "area": "components",
    "subject": "Stepper",
    "slug": "stepper/manual-steps",
    "title": "Manual workflow steps",
    "description": "Navigate a three-step workflow without advancing merely because focus changes.",
    "focus": "Manual workflow steps",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Stepper"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/stepper/manual-steps/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/stepper/manual-steps/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-checkbox-group-selected-values",
    "host": "vue",
    "area": "components",
    "subject": "CheckboxGroup",
    "slug": "checkbox-group/selected-values",
    "title": "A selected-value collection",
    "description": "Coordinate several independently checked notification channels in one application array.",
    "focus": "A selected-value collection",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "CheckboxGroup"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/checkbox-group/selected-values/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/checkbox-group/selected-values/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-multi-thumb-slider-interval-selection",
    "host": "vue",
    "area": "components",
    "subject": "MultiThumbSlider",
    "slug": "multi-thumb-slider/interval-selection",
    "title": "An interval with two thumbs",
    "description": "Choose a price interval with two separately named and focusable thumbs.",
    "focus": "An interval with two thumbs",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "MultiThumbSlider"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/multi-thumb-slider/interval-selection/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/multi-thumb-slider/interval-selection/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-carousel-presence-crossfade",
    "host": "vue",
    "area": "components",
    "subject": "Carousel",
    "slug": "carousel/presence-crossfade",
    "title": "Crossfading with retained Presence",
    "description": "Switch delivery services while the outgoing slide remains present for its exit transition.",
    "focus": "Crossfading with retained Presence",
    "kind": "styling",
    "fixture": "control",
    "tags": [
      "Carousel"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/carousel/presence-crossfade/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/carousel/presence-crossfade/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-temporal-date-field-bounded-date",
    "host": "vue",
    "area": "temporal",
    "subject": "DateField",
    "slug": "date-field/bounded-date",
    "title": "A bounded date field",
    "description": "Edit a date restricted to October 2026 with a string draft and a structured committed value.",
    "focus": "A bounded date field",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "DateField",
      "structured value"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/temporal/date-field/bounded-date/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/temporal/date-field/bounded-date/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-temporal-time-field-native-time",
    "host": "vue",
    "area": "temporal",
    "subject": "TimeField",
    "slug": "time-field/native-time",
    "title": "A native time input",
    "description": "Edit a time of day using the browser’s native input and inspect the structured application value.",
    "focus": "A native time input",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "TimeField",
      "structured value"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/temporal/time-field/native-time/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/temporal/time-field/native-time/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-temporal-date-time-field-local-date-time",
    "host": "vue",
    "area": "temporal",
    "subject": "DateTimeField",
    "slug": "date-time-field/local-date-time",
    "title": "A local appointment",
    "description": "Combine a date and time without implying a time zone or an absolute instant.",
    "focus": "A local appointment",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "DateTimeField",
      "structured value"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/temporal/date-time-field/local-date-time/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/temporal/date-time-field/local-date-time/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-temporal-date-range-field-travel-dates",
    "host": "vue",
    "area": "temporal",
    "subject": "DateRangeField",
    "slug": "date-range-field/travel-dates",
    "title": "Coordinated arrival and departure",
    "description": "Edit two endpoints as a single ordered date range.",
    "focus": "Coordinated arrival and departure",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "DateRangeField",
      "structured value"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/temporal/date-range-field/travel-dates/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/temporal/date-range-field/travel-dates/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-temporal-time-range-field-collection-window",
    "host": "vue",
    "area": "temporal",
    "subject": "TimeRangeField",
    "slug": "time-range-field/collection-window",
    "title": "A collection time window",
    "description": "Edit the beginning and end of a same-day collection window.",
    "focus": "A collection time window",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "TimeRangeField",
      "structured value"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/temporal/time-range-field/collection-window/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/temporal/time-range-field/collection-window/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-select-disabled-options",
    "host": "vue",
    "area": "components",
    "subject": "Select",
    "slug": "select/disabled-options",
    "title": "Unavailable delivery methods",
    "description": "Select one delivery method while an unavailable option remains visible but cannot be chosen.",
    "focus": "Unavailable delivery methods",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Select"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/select/disabled-options/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/select/disabled-options/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-combobox-search-results",
    "host": "vue",
    "area": "components",
    "subject": "Combobox",
    "slug": "combobox/search-results",
    "title": "Searchable members",
    "description": "Search a small member collection while keeping the query separate from the selected member ID.",
    "focus": "Searchable members",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Combobox"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/combobox/search-results/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/combobox/search-results/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-listbox-multiple-selection",
    "host": "vue",
    "area": "components",
    "subject": "Listbox",
    "slug": "listbox/multiple-selection",
    "title": "Multiple destinations",
    "description": "Choose several notification destinations from a persistently visible list.",
    "focus": "Multiple destinations",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Listbox"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/listbox/multiple-selection/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/listbox/multiple-selection/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-tags-input-edit-tags",
    "host": "vue",
    "area": "components",
    "subject": "TagsInput",
    "slug": "tags-input/edit-tags",
    "title": "Adding and removing tags",
    "description": "Edit a collection of delivery tags with a native text input and explicit removal controls.",
    "focus": "Adding and removing tags",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "TagsInput"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/tags-input/edit-tags/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/tags-input/edit-tags/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-pin-input-verification-code",
    "host": "vue",
    "area": "components",
    "subject": "PinInput",
    "slug": "pin-input/verification-code",
    "title": "A verification code",
    "description": "Collect a four-character verification code in coordinated input segments.",
    "focus": "A verification code",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "PinInput"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/pin-input/verification-code/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/pin-input/verification-code/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-editable-commit-cancel",
    "host": "vue",
    "area": "components",
    "subject": "Editable",
    "slug": "editable/commit-cancel",
    "title": "Saving or cancelling a draft",
    "description": "Edit a delivery name while keeping the saved value separate from its active draft.",
    "focus": "Saving or cancelling a draft",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Editable"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/editable/commit-cancel/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/editable/commit-cancel/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-number-field-decimal-value",
    "host": "vue",
    "area": "components",
    "subject": "NumberField",
    "slug": "number-field/decimal-value",
    "title": "Exact decimal input",
    "description": "Enter a parcel weight while keeping its committed decimal value as a string.",
    "focus": "Exact decimal input",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "NumberField",
      "v-model"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/number-field/decimal-value/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/number-field/decimal-value/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-spin-button-bounded-quantity",
    "host": "vue",
    "area": "components",
    "subject": "SpinButton",
    "slug": "spin-button/bounded-quantity",
    "title": "A bounded quantity",
    "description": "Edit a parcel quantity directly or advance through an exact range with increment and decrement controls.",
    "focus": "A bounded quantity",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "SpinButton",
      "v-model"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/spin-button/bounded-quantity/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/spin-button/bounded-quantity/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-slider-stepped-value",
    "host": "vue",
    "area": "components",
    "subject": "Slider",
    "slug": "slider/stepped-value",
    "title": "A stepped slider",
    "description": "Choose notification volume from an exact range with pointer and keyboard input.",
    "focus": "A stepped slider",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Slider",
      "v-model"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/slider/stepped-value/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/slider/stepped-value/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-progress-determinate-value",
    "host": "vue",
    "area": "components",
    "subject": "Progress",
    "slug": "progress/determinate-value",
    "title": "Determinate upload progress",
    "description": "Report completed work against a maximum without making the indicator itself editable.",
    "focus": "Determinate upload progress",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Progress",
      "v-model"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/progress/determinate-value/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/progress/determinate-value/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-meter-threshold-zones",
    "host": "vue",
    "area": "components",
    "subject": "Meter",
    "slug": "meter/threshold-zones",
    "title": "Storage threshold zones",
    "description": "Describe a measured value within a range and show whether its configured thresholds are preferable.",
    "focus": "Storage threshold zones",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Meter",
      "v-model"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/meter/threshold-zones/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/meter/threshold-zones/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-rating-clearable-score",
    "host": "vue",
    "area": "components",
    "subject": "Rating",
    "slug": "rating/clearable-score",
    "title": "A clearable rating",
    "description": "Select a delivery score or leave the question unanswered by clearing the selection.",
    "focus": "A clearable rating",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Rating",
      "v-model"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/rating/clearable-score/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/rating/clearable-score/Preview.vue"
      }
    ],
    "related": []
  },
  {
    "id": "vue-components-timer-countdown-controls",
    "host": "vue",
    "area": "components",
    "subject": "Timer",
    "slug": "timer/countdown-controls",
    "title": "A controlled countdown",
    "description": "Start, pause, resume and reset a ten-second countdown without starting it on page load.",
    "focus": "A controlled countdown",
    "kind": "behavior",
    "fixture": "control",
    "tags": [
      "Timer",
      "v-model"
    ],
    "sourceOwner": "vue",
    "previewPath": "./vue/components/timer/countdown-controls/Preview.vue",
    "code": [
      {
        "label": "Vue",
        "language": "vue",
        "path": "./vue/components/timer/countdown-controls/Preview.vue"
      }
    ],
    "related": []
  },
  {
    id: 'vue-temporal-calendar-selection', host: 'vue', area: 'temporal', subject: 'Calendar',
    slug: 'calendar-selection', title: 'Selecting a calendar date',
    description: 'Choose a calendar day, move to the previous or next month, and inspect the application value. A fixed reference date keeps this example deterministic.', focus: 'Calendar selection with a reference date',
    kind: 'behavior', fixture: 'surface', tags: ["v-model","referenceDate","keyboard"], sourceOwner: 'vue',
    previewPath: './vue/temporal/calendar-selection/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/temporal/calendar-selection/Preview.vue' }], related: [],
  },
  {
    id: 'vue-virtual-fixed-list', host: 'vue', area: 'virtual', subject: 'VirtualList',
    slug: 'fixed-list', title: 'Fixed-height virtual list',
    description: 'Scroll through 500 deliveries while only nearby placements are mounted. Each row has an exact 44px extent and the root owns scrolling.', focus: 'Fixed sizing and bounded mounted rows',
    kind: 'behavior', fixture: 'viewport', tags: ["sizePolicy","getID","overscan"], sourceOwner: 'vue',
    previewPath: './vue/virtual/fixed-list/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/virtual/fixed-list/Preview.vue' }], related: [],
  },
  {
    id: 'vue-virtual-core-composition', host: 'vue', area: 'virtual', subject: 'Virtualizer',
    slug: 'core-composition', title: 'Composing a virtualizer',
    description: 'Supply a public linear strategy and exact extents, compose Header, Surface and Item, and reveal a delivery by stable ID.', focus: 'Low-level layout ownership and scrollTo',
    kind: 'behavior', fixture: 'viewport', tags: ['strategy', 'VirtualizerHeader', 'scrollTo'], sourceOwner: 'vue',
    previewPath: './vue/virtual/core-composition/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/virtual/core-composition/Preview.vue' }], related: [],
  },
  {
    id: 'vue-tabular-local-source', host: 'vue', area: 'tabular', subject: 'DataTable',
    slug: 'local-source', title: 'A native table from a source',
    description: 'Render project members from a local resolver with native table semantics. The source runs after mounting; loading and retry presentation belong to the application.', focus: 'Typed source response and native table composition',
    kind: 'behavior', fixture: 'table', tags: ["source","Provider","native table"], sourceOwner: 'vue',
    previewPath: './vue/tabular/local-source/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/tabular/local-source/Preview.vue' }, { label: 'TypeScript · source resolver', language: 'ts', path: './vue/tabular/local-source/example.ts' }], related: [],
  },
  {
    id: 'vue-chart-line-series', host: 'vue', area: 'chart', subject: 'Chart',
    slug: 'line-series', title: 'A labeled line series',
    description: 'Map delivery records to two numeric axes and a line layer. Drawing begins after mounting; keyboard navigation uses application-provided record labels.', focus: 'Declarative axes, stable IDs and accessible records',
    kind: 'behavior', fixture: 'chart', tags: ["ChartLine","keyboard","stable IDs"], sourceOwner: 'vue',
    previewPath: './vue/chart/line-series/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/chart/line-series/Preview.vue' }], related: [],
  },
  {
    id: 'vue-chart-projected-svg', host: 'vue', area: 'chart', subject: 'Chart',
    slug: 'projected-svg', title: 'Token-colored SVG drawing',
    description: 'Switch between line, scatter, bar, heatmap, pie and donut projections, update a record, and draw public projected geometry with application-owned SVG and documentation colors.', focus: 'useChart, reactive definitions and application rendering',
    kind: 'behavior', fixture: 'chart', tags: ['useChart', 'projection', 'SVG', 'reactive data'], sourceOwner: 'vue',
    previewPath: './vue/chart/projected-svg/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/chart/projected-svg/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-checkbox-default-state', host: 'vue', area: 'components',
    subject: 'Checkbox', slug: 'checkbox/default-state', title: 'Component-owned state',
    description: 'Start checked with defaultValue. The component owns later updates, and its slot exposes the current value without an application ref.', focus: 'Default value and state slot',
    kind: 'behavior', fixture: 'control', tags: ['defaultValue', 'slot'], sourceOwner: 'vue',
    previewPath: './vue/components/checkbox/default-state/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/checkbox/default-state/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-checkbox-indeterminate-state', host: 'vue', area: 'components',
    subject: 'Checkbox', slug: 'checkbox/indeterminate-state', title: 'Indeterminate state',
    description: 'Begin with a mixed value and a dash indicator. Activate the checkbox to change its value, or restore the mixed state from application data.', focus: 'Mixed value and indicator slot',
    kind: 'behavior', fixture: 'control', tags: ['indeterminate', 'slot', 'v-model'], sourceOwner: 'vue',
    previewPath: './vue/components/checkbox/indeterminate-state/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/checkbox/indeterminate-state/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-checkbox-readonly-disabled', host: 'vue', area: 'components',
    subject: 'Checkbox', slug: 'checkbox/readonly-disabled', title: 'Read-only and disabled',
    description: 'Compare two checked controls. Both keep their values fixed, but the read-only control remains focusable while the disabled control is unavailable.', focus: 'Fixed value with different focus behavior',
    kind: 'behavior', fixture: 'control', tags: ['readonly', 'disabled', 'focus'], sourceOwner: 'vue',
    previewPath: './vue/components/checkbox/readonly-disabled/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/checkbox/readonly-disabled/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-switch-readonly-disabled', host: 'vue', area: 'components',
    subject: 'Switch', slug: 'switch/readonly-disabled', title: 'Read-only and disabled',
    description: 'Compare enabled settings that cannot be changed. Tab can reach the read-only setting, while the disabled setting is unavailable.', focus: 'Read-only versus disabled settings',
    kind: 'behavior', fixture: 'control', tags: ['readonly', 'disabled', 'focus'], sourceOwner: 'vue',
    previewPath: './vue/components/switch/readonly-disabled/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/switch/readonly-disabled/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-toggle-group-single-selection', host: 'vue', area: 'components',
    subject: 'ToggleGroup', slug: 'toggle-group/single-selection', title: 'One persistent choice',
    description: 'Choose one text alignment. With deselectable set to false, activating the selected choice keeps it selected.', focus: 'Single selection without deselection',
    kind: 'behavior', fixture: 'control', tags: ['single', 'deselectable', 'v-model'], sourceOwner: 'vue',
    previewPath: './vue/components/toggle-group/single-selection/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/toggle-group/single-selection/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-tabs-automatic-activation', host: 'vue', area: 'components',
    subject: 'Tabs', slug: 'tabs/automatic-activation', title: 'Automatic keyboard activation',
    description: 'Move between tabs with arrow keys. Selection follows focus, so the matching panel changes without a separate Enter or Space activation.', focus: 'Selection follows keyboard focus',
    kind: 'behavior', fixture: 'surface', tags: ['activationMode', 'keyboard', 'v-model'], sourceOwner: 'vue',
    previewPath: './vue/components/tabs/automatic-activation/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/tabs/automatic-activation/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-accordion-single-panel', host: 'vue', area: 'components',
    subject: 'Accordion', slug: 'accordion/single-panel', title: 'One panel stays open',
    description: 'Open one section at a time. With collapsible set to false, activating the open heading keeps its panel visible.', focus: 'Single non-collapsible selection',
    kind: 'behavior', fixture: 'surface', tags: ['single', 'collapsible', 'v-model'], sourceOwner: 'vue',
    previewPath: './vue/components/accordion/single-panel/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/accordion/single-panel/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-accordion-multiple-panels', host: 'vue', area: 'components',
    subject: 'Accordion', slug: 'accordion/multiple-panels', title: 'Several panels open',
    description: 'Open Delivery and Returns independently. The application receives an array of the currently open panel values.', focus: 'Independent panels and array state',
    kind: 'behavior', fixture: 'surface', tags: ['multiple', 'v-model'], sourceOwner: 'vue',
    previewPath: './vue/components/accordion/multiple-panels/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/accordion/multiple-panels/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-text-multiline-value', host: 'vue', area: 'components',
    subject: 'Text', slug: 'text/multiline-value', title: 'Multiline editing',
    description: 'Edit delivery notes in a native textarea. Application state reflects the committed text while native selection and editing remain available.', focus: 'Native textarea with application-owned text',
    kind: 'behavior', fixture: 'control', tags: ['multiline', 'v-model', 'native editing'], sourceOwner: 'vue',
    previewPath: './vue/components/text/multiline-value/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/text/multiline-value/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-text-lazy-value', host: 'vue', area: 'components',
    subject: 'Text', slug: 'text/lazy-value', title: 'Commit on change',
    description: 'Edit the display name, then leave the field to commit the changed value. The output stays unchanged while you type.', focus: 'Lazy model commits on native change',
    kind: 'behavior', fixture: 'control', tags: ['v-model.lazy', 'change'], sourceOwner: 'vue',
    previewPath: './vue/components/text/lazy-value/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/text/lazy-value/Preview.vue' }], related: [],
  },
  {
    id: 'vue-components-switch-controlled-state', host: 'vue', area: 'components',
    subject: 'Switch', slug: 'switch/controlled-state', title: 'Controlled setting',
    description: 'Toggle a boolean setting and inspect the application-owned checked value.', focus: 'Controlled boolean setting',
    kind: 'behavior', fixture: 'control', tags: ['v-model', 'checked', 'SwitchThumb'], sourceOwner: 'vue',
    previewPath: './vue/components/switch/controlled-state/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/switch/controlled-state/Preview.vue' }],
    related: [],
  },
  {
    id: 'vue-components-toggle-button-pressed-state', host: 'vue', area: 'components',
    subject: 'ToggleButton', slug: 'toggle-button/pressed-state', title: 'Persistent pressed state',
    description: 'Pin or unpin a conversation while the button communicates its pressed state.', focus: 'Application-owned pressed value',
    kind: 'behavior', fixture: 'control', tags: ['v-model', 'aria-pressed'], sourceOwner: 'vue',
    previewPath: './vue/components/toggle-button/pressed-state/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/toggle-button/pressed-state/Preview.vue' }],
    related: [],
  },
  {
    id: 'vue-components-toggle-group-multiple-selection', host: 'vue', area: 'components',
    subject: 'ToggleGroup', slug: 'toggle-group/multiple-selection', title: 'Multiple pressed choices',
    description: 'Select independent text formats. The code option is disabled; inspect the selected array as formats are toggled.', focus: 'Multiple selection with a disabled item',
    kind: 'behavior', fixture: 'control', tags: ['multiple', 'disabledItems', 'keyboard'], sourceOwner: 'vue',
    previewPath: './vue/components/toggle-group/multiple-selection/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/toggle-group/multiple-selection/Preview.vue' }],
    related: [],
  },
  {
    id: 'vue-components-radio-group-disabled-options', host: 'vue', area: 'components',
    subject: 'RadioGroup', slug: 'radio-group/disabled-options', title: 'Selecting an available option',
    description: 'Choose a delivery speed. Overnight is unavailable, and the application displays the selected option.', focus: 'Single selection with disabled options',
    kind: 'behavior', fixture: 'control', tags: ['disabledItems', 'orientation', 'RadioGroupIndicator'], sourceOwner: 'vue',
    previewPath: './vue/components/radio-group/disabled-options/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/radio-group/disabled-options/Preview.vue' }],
    related: [],
  },
  {
    id: 'vue-components-tabs-manual-activation', host: 'vue', area: 'components',
    subject: 'Tabs', slug: 'tabs/manual-activation', title: 'Manual keyboard activation',
    description: 'Move focus between tabs with arrow keys, then press Enter or Space to activate the focused section. Billing is unavailable.', focus: 'Focus and selection as separate actions',
    kind: 'behavior', fixture: 'surface', tags: ['activationMode', 'disabledItems', 'keyboard'], sourceOwner: 'vue',
    previewPath: './vue/components/tabs/manual-activation/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/tabs/manual-activation/Preview.vue' }],
    related: [],
  },
  {
    id: 'vue-components-popover-positioned-dismissal', host: 'vue', area: 'components',
    subject: 'Popover', slug: 'popover/positioned-dismissal', title: 'Positioning and dismissal',
    description: 'Open a non-modal surface beside its trigger, then dismiss it with Escape, the close control, or an outside interaction.', focus: 'Positioned non-modal dismissal',
    kind: 'behavior', fixture: 'surface', tags: ['position', 'outside interaction', 'focus'], sourceOwner: 'vue',
    previewPath: './vue/components/popover/positioned-dismissal/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/popover/positioned-dismissal/Preview.vue' }],
    related: [],
  },
  {
    id: 'vue-components-disclosure-exit-transition',
    host: 'vue',
    area: 'components',
    subject: 'Disclosure',
    slug: 'disclosure/exit-transition',
    title: 'Presence during an exit transition',
    description: 'Close the panel to observe it remaining present and inert during its CSS transition. Reopen it before the fade finishes, or wait until its hidden state is reported.',
    focus: 'Retained exit and interrupted reopening',
    kind: 'styling',
    fixture: 'surface',
    tags: ['presence', 'transition', 'inert', 'reduced-motion'],
    sourceOwner: 'vue',
    previewPath: './vue/components/disclosure/exit-transition/Preview.vue',
    code: [{ label: 'Vue · presence and transition', language: 'vue', path: './vue/components/disclosure/exit-transition/Preview.vue' }],
    related: [],
  },
  {
    id: 'vue-components-checkbox-controlled-state',
    host: 'vue',
    area: 'components',
    subject: 'Checkbox',
    slug: 'checkbox/controlled-state',
    title: 'Controlled state',
    description: 'Keep checkbox state in application data while Sectile handles interaction and accessible state.',
    focus: 'Controlled value updates',
    kind: 'behavior',
    fixture: 'control',
    tags: ['modelValue', 'update:modelValue', 'state'],
    sourceOwner: 'vue',
    previewPath: './vue/components/checkbox/controlled-state/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/checkbox/controlled-state/Preview.vue' }],
    related: [],
  },
  {
    id: 'vue-components-checkbox-state-styling',
    host: 'vue',
    area: 'components',
    subject: 'Checkbox',
    slug: 'checkbox/state-styling',
    title: 'Styling checked state',
    description: 'Style a persistent checkbox box and respond to checked state without a separate presentation-state binding.',
    focus: 'State-based styling',
    kind: 'styling',
    fixture: 'control',
    tags: ['class', 'data-state', 'focus-visible'],
    sourceOwner: 'vue',
    previewPath: './vue/components/checkbox/state-styling/Preview.vue',
    code: [{ label: 'Vue · markup and styling', language: 'vue', path: './vue/components/checkbox/state-styling/Preview.vue' }],
    related: ['vue-components-checkbox-controlled-state'],
  },
  {
    id: 'vue-components-dialog-controlled-open',
    host: 'vue',
    area: 'components',
    subject: 'Dialog',
    slug: 'dialog/controlled-open',
    title: 'Controlled open state',
    description: 'Keep modal open state in your application. Open the dialog, dismiss it with Escape or the close button, and inspect focus returning to the trigger.',
    focus: 'Application-owned open state',
    kind: 'behavior',
    fixture: 'surface',
    tags: ['open', 'update:open', 'focus'],
    sourceOwner: 'vue',
    previewPath: './vue/components/dialog/controlled-open/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/components/dialog/controlled-open/Preview.vue' }],
    related: [],
  },
  {
    id: 'vue-form-native-submission',
    host: 'vue',
    area: 'form',
    subject: 'Form',
    slug: 'native-submission',
    title: 'Native field submission',
    description: 'Submit a required email field through FormRoot. A successful submission displays the collected value locally; no request is sent.',
    focus: 'Validated native submission',
    kind: 'behavior',
    fixture: 'form',
    tags: ['FormRoot', 'FormField', 'onSubmit'],
    sourceOwner: 'vue',
    previewPath: './vue/form/native-submission/Preview.vue',
    code: [{ label: 'Vue', language: 'vue', path: './vue/form/native-submission/Preview.vue' }],
    related: [],
  },
  {
    id: 'dom-components-checkbox-native-connection',
    host: 'dom',
    area: 'components',
    subject: 'Checkbox',
    slug: 'checkbox/native-connection',
    title: 'Native checkbox connection',
    description: 'Connect Sectile checkbox behavior to an application-owned native checkbox element and clean it up explicitly.',
    focus: 'DOM connection lifecycle',
    kind: 'behavior',
    fixture: 'control',
    tags: ['createCheckbox', 'input', 'cleanup'],
    sourceOwner: 'dom',
    previewPath: './dom/components/checkbox/native-connection/Preview.vue',
    code: [{ label: 'TypeScript', language: 'ts', path: './dom/components/checkbox/native-connection/example.ts' }],
    related: [],
  },
] as const;

export function examplePath(example: ExampleDefinition): string {
  return `/${example.host}/${example.area}/${example.slug}`;
}

export function areaPath(host: ExampleHost, area: ExampleArea): string {
  return `/${host}/${area}`;
}

export function examplesFor(host: ExampleHost, area: ExampleArea): readonly ExampleDefinition[] {
  return examples.filter((example) => example.host === host && example.area === area);
}

export function findExample(id: string): ExampleDefinition | undefined {
  return examples.find((example) => example.id === id);
}

export interface ExampleCatalogIssue {
  readonly code: 'duplicate-id' | 'duplicate-path' | 'empty-focus' | 'host-source-mismatch' | 'unknown-related' | 'cross-host-related';
  readonly exampleId: string;
  readonly message: string;
}

export function validateExampleCatalog(catalog: readonly ExampleDefinition[]): readonly ExampleCatalogIssue[] {
  const issues: ExampleCatalogIssue[] = [];
  const ids = new Set<string>();
  const paths = new Set<string>();
  const byId = new Map(catalog.map((example) => [example.id, example]));

  for (const example of catalog) {
    if (ids.has(example.id)) {
      issues.push({ code: 'duplicate-id', exampleId: example.id, message: `Duplicate example id: ${example.id}` });
    }
    ids.add(example.id);

    const path = examplePath(example);
    if (paths.has(path)) {
      issues.push({ code: 'duplicate-path', exampleId: example.id, message: `Duplicate example path: ${path}` });
    }
    paths.add(path);

    if (example.focus.trim().length === 0) {
      issues.push({ code: 'empty-focus', exampleId: example.id, message: `Example ${example.id} must have one primary focus.` });
    }
    const sourcePrefix = `./${example.host}/`;
    if (
      example.sourceOwner !== example.host
      || !example.previewPath.startsWith(sourcePrefix)
      || example.code.some((section) => !section.path.startsWith(sourcePrefix))
    ) {
      issues.push({ code: 'host-source-mismatch', exampleId: example.id, message: `Example ${example.id} source must stay inside the ${example.host} tree.` });
    }
  }

  for (const example of catalog) {
    for (const relatedId of example.related) {
      const related = byId.get(relatedId);
      if (related === undefined) {
        issues.push({ code: 'unknown-related', exampleId: example.id, message: `Unknown related example: ${relatedId}` });
      } else if (related.host !== example.host) {
        issues.push({ code: 'cross-host-related', exampleId: example.id, message: `Related examples cannot cross from ${example.host} to ${related.host}.` });
      }
    }
  }

  return issues;
}

export function assertValidExampleCatalog(catalog: readonly ExampleDefinition[] = examples): void {
  const issues = validateExampleCatalog(catalog);
  if (issues.length > 0) throw new TypeError(issues.map((issue) => issue.message).join('\n'));
}

assertValidExampleCatalog();
