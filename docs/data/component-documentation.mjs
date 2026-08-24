const ownershipOnlyScenarios = Object.freeze([
  /^controlled(?:-|$)/u,
  /^readonly$/u,
]);

const curatedScenarios = Object.freeze({
  calendar: ['month', 'week', 'disabled-weekends'],
  disclosure: ['closed'],
  switch: ['off'],
  'toggle-button': ['formatting'],
  'tree-grid': ['expanded', 'unavailable-cells'],
  'tree-view': ['expanded', 'multiple', 'unavailable'],
});

function isOwnershipOnlyScenario(scenario) {
  return ownershipOnlyScenarios.some((pattern) => pattern.test(scenario));
}

/**
 * Visual examples teach behavior that can be seen or exercised in the DOM.
 * State ownership remains documented by the public API and source examples;
 * it is not promoted to a full visual section on every component page.
 */
export function documentedScenarios(component) {
  const declared = component.scenarios?.dom;
  if (!Array.isArray(declared)) return Object.freeze([]);

  const selected = curatedScenarios[component.id]
    ?? declared.filter((scenario) => !isOwnershipOnlyScenario(scenario));

  return Object.freeze([...selected]);
}

export function isStandaloneDocumentationScenario(scenario) {
  return !isOwnershipOnlyScenario(scenario);
}
