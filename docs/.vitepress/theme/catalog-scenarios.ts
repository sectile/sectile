export interface CatalogScenario {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly variant: 'default' | 'alternate' | 'constrained';
}

const scenarios = (
  component: string,
  alternate: readonly [string, string],
  constrained: readonly [string, string],
): readonly CatalogScenario[] => Object.freeze([
  { id: `${component}-default`, title: alternate[0], description: alternate[1], variant: 'default' },
  { id: `${component}-alternate`, title: constrained[0], description: constrained[1], variant: 'alternate' },
  { id: `${component}-constrained`, title: `Constrained ${component.replaceAll('-', ' ')}`, description: 'A stricter configuration exposes limits, unavailable values, or a smaller interaction surface.', variant: 'constrained' },
]);

export const catalogScenarios: Readonly<Record<string, readonly CatalogScenario[]>> = Object.freeze({
  'checkbox-group': scenarios('checkbox-group', ['Package selection', 'Choose one or more independent packages.'], ['Multiple defaults', 'Several values can start selected without changing group semantics.']),
  select: scenarios('select', ['Release channel', 'Choose one value from a popup collection.'], ['Preselected value', 'The trigger reflects an initial stable choice.']),
  combobox: scenarios('combobox', ['Command search', 'Filter a collection with editable text and keyboard navigation.'], ['Prefix matching', 'A starting query narrows the visible results.']),
  pagination: scenarios('pagination', ['Result pages', 'Move through a bounded result set with compact page controls.'], ['Dense result set', 'A smaller page size creates more pages while preserving the same controller.']),
  stepper: scenarios('stepper', ['Account setup', 'Progress through an ordered set of setup steps.'], ['Review step', 'Start from a later step without rebuilding the step list.']),
  rating: scenarios('rating', ['Clearable rating', 'Choose a score and clear it again.'], ['Existing review', 'An initial score demonstrates the selected range.']),
  'pin-input': scenarios('pin-input', ['Verification code', 'Enter a short numeric one-time code.'], ['Long recovery code', 'The same primitive supports a longer segmented value.']),
  'tags-input': scenarios('tags-input', ['Project skills', 'Create and remove free-form tags without losing input focus.'], ['Prefilled labels', 'Multiple existing tags remain individually editable.']),
  grid: scenarios('grid', ['Release matrix', 'Navigate a small row and column collection.'], ['Environment matrix', 'A wider data set uses the same two-dimensional navigation model.']),
  toolbar: scenarios('toolbar', ['Formatting tools', 'Move among related command buttons as one toolbar.'], ['Compact editor tools', 'Separators preserve command grouping in a shorter toolbar.']),
  'window-splitter': scenarios('window-splitter', ['Workspace panes', 'Resize navigator and editor panes with one handle.'], ['Console split', 'A different initial ratio emphasizes the secondary pane.']),
  'date-picker': scenarios('date-picker', ['Release date', 'Edit a civil date or choose it from the calendar.'], ['Later release', 'A different initial month keeps date selection timezone-free.']),
  'date-range-picker': scenarios('date-range-picker', ['Deployment window', 'Choose an inclusive civil-date interval.'], ['Short maintenance window', 'A compact initial range demonstrates both endpoints.']),
  'range-calendar': scenarios('range-calendar', ['Booking dates', 'Choose an arrival and departure date without opening a popup.'], ['Release window', 'An inline calendar keeps the selected interval visible.']),
  'month-picker': scenarios('month-picker', ['Billing month', 'Choose the month used for the next billing cycle.'], ['Fiscal month', 'Move by year while selecting exactly one month.']),
  'month-range-picker': scenarios('month-range-picker', ['Reporting period', 'Choose the first and last month of a report.'], ['Budget window', 'Select a bounded span of calendar months.']),
  'year-picker': scenarios('year-picker', ['Graduation year', 'Choose one year from a paged year grid.'], ['Planning year', 'Move between year pages without exposing dates or months.']),
  'year-range-picker': scenarios('year-range-picker', ['Roadmap horizon', 'Choose the first and last year of a roadmap.'], ['Archive range', 'Select an inclusive span of calendar years.']),
  'date-time-picker': scenarios('date-time-picker', ['Scheduled deployment', 'Commit a civil date and wall-clock time together.'], ['Evening deployment', 'The same field starts from a different local time.']),
  'date-time-range-picker': scenarios('date-time-range-picker', ['Maintenance window', 'Choose start and end dates with wall-clock times.'], ['Same-day window', 'A shorter range keeps date and time endpoints atomic.']),
  'quantity-field': scenarios('quantity-field', ['Metric length', 'Edit an exact quantity and choose a compatible display unit.'], ['Converted length', 'A different display unit preserves the canonical quantity.']),
  dialog: scenarios('dialog', ['Deployment details', 'Open a non-destructive dialog without moving surrounding layout.'], ['Initially open dialog', 'Controlled visibility can begin open while content remains overlaid.']),
  'alert-dialog': scenarios('alert-dialog', ['Delete project', 'Confirm a destructive action with explicit cancellation.'], ['Open confirmation', 'The confirmation surface can begin open for review.']),
  tooltip: scenarios('tooltip', ['Keyboard hint', 'Reveal supporting text on hover or keyboard focus.'], ['Visible hint', 'An initially visible tooltip demonstrates non-layout overlay placement.']),
  'multi-thumb-slider': scenarios('multi-thumb-slider', ['Price range', 'Two thumbs select a bounded numeric interval.'], ['Three-point range', 'Additional thumbs compose without creating another primitive.']),
  menu: scenarios('menu', ['Nested commands', 'Open child commands only from their parent item.'], ['Flat commands', 'A shallower command set uses the same menu navigation.']),
  menubar: scenarios('menubar', ['Application menu', 'Top-level menus open below their owning menubar item.'], ['Compact menubar', 'A reduced command set preserves horizontal menu navigation.']),
  'menu-button': scenarios('menu-button', ['Quick actions', 'A button owns a transient command popup.'], ['Open actions', 'An initially open popup demonstrates anchored overlay placement.']),
  'navigation-menu': scenarios('navigation-menu', ['Product navigation', 'Native links and disclosure triggers share a horizontal navigation surface.'], ['Compact navigation', 'A smaller navigation surface preserves native link semantics and keyboard movement.']),
  carousel: scenarios('carousel', ['Release tour', 'Previous and next controls move through one visible slide.'], ['Direct selection', 'Indicators provide direct slide selection alongside arrows.']),
  feed: scenarios('feed', ['Activity timeline', 'Navigate a finite ordered stream of activity entries.'], ['Recent activity', 'A smaller window demonstrates newer and earlier boundaries.']),
  calendar: scenarios('calendar', ['Monthly calendar', 'Navigate and select dates in a complete six-week month grid.'], ['Compact week', 'A single visible week uses the same calendar state model.']),
  'tree-view': scenarios('tree-view', ['Workspace tree', 'Expand hierarchical items and navigate their visible projection.'], ['Collapsed tree', 'A collapsed root hides descendants without deleting tree data.']),
  'tree-grid': scenarios('tree-grid', ['Workspace status', 'Combine hierarchy with editable row and column cells.'], ['Collapsed status grid', 'Collapsing a parent removes descendant rows from the visible grid.']),
});
