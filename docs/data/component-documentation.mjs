const secondaryStateScenarios = Object.freeze([
  /^controlled(?:-|$)/u,
  /^readonly$/u,
  /(?:^|-)disabled(?:-|$)/u,
]);

const standaloneStateScenarios = new Set([
  'disabled-weekends',
]);

const curatedScenarios = Object.freeze({
  calendar: ['month', 'week', 'disabled-weekends'],
  'range-calendar': ['booking'],
  'month-picker': ['billing-month'],
  'month-range-picker': ['reporting-period'],
  'year-picker': ['graduation-year'],
  'year-range-picker': ['roadmap-horizon'],
  disclosure: ['closed'],
  switch: ['off'],
  'tags-input': ['skills'],
  toolbar: ['formatting', 'vertical'],
  'toggle-button': ['formatting'],
  'tree-grid': ['expanded', 'editable'],
  'tree-view': ['expanded', 'multiple'],
});

function isSecondaryStateScenario(scenario) {
  return secondaryStateScenarios.some((pattern) => pattern.test(scenario));
}

/**
 * Visual examples teach behavior that can be seen or exercised in the DOM.
 * State ownership, readonly, and disabled behavior remain documented by the
 * public API and accessibility contract unless a curated scenario demonstrates
 * an essential state that users need to recognize, such as unavailable dates.
 */
export function documentedScenarios(component) {
  const declared = component.scenarios?.dom;
  if (!Array.isArray(declared)) return Object.freeze([]);

  const curated = curatedScenarios[component.id];
  const selected = curated ?? declared;

  return Object.freeze(curated === undefined
    ? selected.filter((scenario) => !isSecondaryStateScenario(scenario))
    : [...selected]);
}

export function isStandaloneDocumentationScenario(scenario) {
  return standaloneStateScenarios.has(scenario) || !isSecondaryStateScenario(scenario);
}
