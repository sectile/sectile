const secondaryStateScenarios = Object.freeze([
  /^controlled(?:-|$)/u,
  /^readonly$/u,
  /(?:^|-)disabled(?:-|$)/u,
]);

const curatedScenarios = Object.freeze({
  calendar: ['month', 'week', 'disabled-weekends'],
  disclosure: ['closed'],
  switch: ['off'],
  'toggle-button': ['formatting'],
  'tree-grid': ['expanded', 'unavailable-cells'],
  'tree-view': ['expanded', 'multiple', 'unavailable'],
});

function isSecondaryStateScenario(scenario) {
  return secondaryStateScenarios.some((pattern) => pattern.test(scenario));
}

/**
 * Visual examples teach behavior that can be seen or exercised in the DOM.
 * State ownership, readonly, and disabled behavior remain documented by the
 * public API and accessibility contract. They are not promoted to standalone
 * visual sections at the expense of representative component workflows.
 */
export function documentedScenarios(component) {
  const declared = component.scenarios?.dom;
  if (!Array.isArray(declared)) return Object.freeze([]);

  const selected = curatedScenarios[component.id] ?? declared;

  return Object.freeze(selected.filter((scenario) => !isSecondaryStateScenario(scenario)));
}

export function isStandaloneDocumentationScenario(scenario) {
  return !isSecondaryStateScenario(scenario);
}
