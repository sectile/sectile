/**
 * Usage owns ordinary props, states, orientations, and controlled ownership.
 * Examples are opt-in and reserved for edge conditions or compositions that
 * combine several ordinary capabilities into a distinct application pattern.
 */
const exampleScenarios = Object.freeze({
  combobox: ['ime'],
  'date-time-field': ['cross-midnight'],
  feed: ['load-after', 'load-before'],
  pagination: ['long-range'],
  popover: ['collision'],
  'quantity-field': ['calculator', 'compound'],
  'spin-button': ['invalid-draft'],
  stepper: ['gated-step'],
  text: ['ime-mixed'],
  'window-splitter': ['nested-layout'],
});

/**
 * Every declared DOM scenario documents a distinct option, state, ownership
 * mode, edge condition, or composition.
 */
export function documentedScenarios(component) {
  const declared = component.scenarios?.dom;
  if (!Array.isArray(declared)) return Object.freeze([]);
  return Object.freeze([...declared]);
}

export function documentedSections(component) {
  const scenarios = documentedScenarios(component);
  const requestedExamples = exampleScenarios[component.id] ?? [];
  const scenarioSet = new Set(scenarios);
  const examples = requestedExamples.filter((scenario) => scenarioSet.has(scenario));
  const exampleSet = new Set(examples);
  const usage = scenarios.filter((scenario) => !exampleSet.has(scenario));

  return Object.freeze({
    usage: Object.freeze(usage),
    examples: Object.freeze(examples),
  });
}

export function isStandaloneDocumentationScenario(scenario) {
  return typeof scenario === 'string' && scenario.length > 0;
}
