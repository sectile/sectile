import { createAccordion, type AccordionConnection } from '@sectile/dom/accordion';
import { createDisclosure, type DisclosureConnection } from '@sectile/dom/disclosure';
import { ChevronDown, createElement, Rocket, Settings2, TriangleAlert } from 'lucide';
import type { DemoContext, DemoDefinition, DemoSession } from '../playground.js';

const accordionItems = [
  { id: 'general', label: 'General', panel: 'Project name, visibility, and ownership.' },
  { id: 'deployments', label: 'Deployments', panel: 'Build targets and release protection.' },
  { id: 'danger', label: 'Danger zone', panel: 'Destructive project operations.' },
] as const;
type AccordionID = typeof accordionItems[number]['id'];

export const accordionDemo: DemoDefinition = {
  id: 'accordion', label: 'Accordion', title: 'Accordion',
  description: 'Single or multiple expansion, collapsibility, disabled headers, and controlled ownership.',
  shortcuts: [{ keys: ['↑', '↓'], label: 'move' }, { keys: ['Home', 'End'], label: 'edges' }, { keys: ['Enter', 'Space'], label: 'toggle' }],
  cases: [
    { id: 'single', title: 'Single collapsible', mount: (context) => mountAccordion(context, { expansion: 'single', collapsible: true }) },
    { id: 'multiple', title: 'Multiple sections', mount: (context) => mountAccordion(context, { expansion: 'multiple', collapsible: true }) },
    { id: 'required', title: 'One section required', mount: (context) => mountAccordion(context, { expansion: 'single', collapsible: false, disabledItems: ['danger'] }) },
    { id: 'controlled', title: 'Controlled expansion', mount: (context) => mountAccordion(context, { expansion: 'multiple', collapsible: true, controlled: true }) },
  ],
};

export const disclosureDemo: DemoDefinition = {
  id: 'disclosure', label: 'Disclosure', title: 'Disclosure',
  description: 'A single trigger and panel with uncontrolled or controlled open state.',
  shortcuts: [{ keys: ['Click'], label: 'toggle' }],
  cases: [
    { id: 'closed', title: 'Initially closed', mount: (context) => mountDisclosure(context, false, false) },
    { id: 'open', title: 'Initially open', mount: (context) => mountDisclosure(context, true, false) },
    { id: 'controlled', title: 'Controlled details', mount: (context) => mountDisclosure(context, false, true) },
  ],
};

function mountAccordion(context: DemoContext, options: {
  readonly expansion: 'single' | 'multiple';
  readonly collapsible: boolean;
  readonly disabledItems?: readonly AccordionID[];
  readonly controlled?: boolean;
}): DemoSession {
  const root = document.createElement('div');
  root.className = 'accordion-demo';
  context.surface.append(root);
  let external: AccordionID[] = options.collapsible ? ['general'] : ['general'];
  let connection!: AccordionConnection<AccordionID>;
  connection = createAccordion({
    root,
    ...context.interaction,
    items: accordionItems.map((item) => item.id),
    policies: { expansion: options.expansion, collapsible: options.collapsible },
    ...(options.disabledItems === undefined ? {} : { disabledItems: options.disabledItems }),
    ...(options.controlled ? {
      openIDs: external,
      onOpenChange: (openIDs) => {
        external = [...openIDs];
        queueMicrotask(() => connection.syncControlledValues({ openIDs: external }));
      },
    } : { defaultOpenIDs: external }),
    defaultHighlightedValue: 'general',
    label: 'Project settings',
    onUpdate: render,
  });
  function render(): void {
    const { revision, state } = connection.getSnapshot();
    root.replaceChildren();
    for (const item of accordionItems) {
      const section = document.createElement('section');
      const header = document.createElement('button');
      header.type = 'button';
      header.id = `accordion-header-${context.instanceID}-${options.expansion}-${item.id}`;
      header.className = 'accordion-header';
      const label = document.createElement('span');
      label.className = 'accordion-label';
      const icon = createElement(
        item.id === 'general' ? Settings2 : item.id === 'deployments' ? Rocket : TriangleAlert,
        { 'aria-hidden': 'true', height: 17, width: 17 },
      );
      const labelText = document.createElement('span');
      labelText.textContent = item.label;
      label.append(icon, labelText);
      const chevron = createElement(ChevronDown, { 'aria-hidden': 'true', height: 17, width: 17 });
      chevron.classList.add('expansion-chevron');
      header.append(label, chevron);
      const panel = document.createElement('div');
      panel.id = `accordion-panel-${context.instanceID}-${options.expansion}-${item.id}`;
      panel.className = 'accordion-panel';
      const panelCopy = document.createElement('p');
      panelCopy.textContent = item.panel;
      panel.append(panelCopy);
      connection.setHeaderAttributes(header, item.id, panel.id);
      connection.setPanelAttributes(panel, item.id, header.id);
      section.append(header, panel);
      root.append(section);
    }
    context.showState(revision, {
      expansion: options.expansion,
      collapsible: options.collapsible,
      ownership: options.controlled ? 'controlled' : 'uncontrolled',
      current: state.cursor.current,
      open: state.openIDs,
      disabled: options.disabledItems ?? [],
    });
  }
  render();
  return { focus: () => root.querySelector<HTMLElement>('[tabindex="0"]')?.focus(), disconnect: () => connection.disconnect() };
}

function mountDisclosure(context: DemoContext, initial: boolean, controlled: boolean): DemoSession {
  const root = document.createElement('div');
  root.className = 'disclosure-demo';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'disclosure-trigger secondary';
  const triggerLabel = document.createElement('span');
  triggerLabel.className = 'disclosure-label';
  const triggerTitle = document.createElement('strong');
  triggerTitle.textContent = 'Advanced deployment options';
  const triggerDescription = document.createElement('small');
  triggerDescription.textContent = 'Retries, rollout windows, and health checks';
  triggerLabel.append(triggerTitle, triggerDescription);
  const chevron = createElement(ChevronDown, { 'aria-hidden': 'true', height: 18, width: 18 });
  chevron.classList.add('expansion-chevron');
  trigger.append(triggerLabel, chevron);
  const panel = document.createElement('div');
  panel.className = 'disclosure-panel';
  const details = document.createElement('dl');
  details.className = 'disclosure-details';
  for (const [label, value] of [['Retry limit', '3 attempts'], ['Rollout window', '15 minutes'], ['Health threshold', '95%']] as const) {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = value;
    row.append(term, description);
    details.append(row);
  }
  panel.append(details);
  root.append(trigger, panel);
  context.surface.append(root);
  let external = initial;
  let connection!: DisclosureConnection;
  connection = createDisclosure({
    trigger,
    panel,
    ...context.interaction,
    panelID: `disclosure-panel-${context.instanceID}-${controlled ? 'controlled' : initial ? 'open' : 'closed'}`,
    ...(controlled ? {
      open: external,
      onOpenChange: (open) => {
        external = open;
        queueMicrotask(() => connection.syncControlledValue(external));
      },
    } : { defaultOpen: initial }),
    onUpdate: render,
  });
  function render(): void {
    const { revision, state } = connection.getSnapshot();
    root.dataset['open'] = String(state.open);
    context.showState(revision, { open: state.open, ownership: controlled ? 'controlled' : 'uncontrolled' });
  }
  render();
  return { focus: () => trigger.focus(), disconnect: () => connection.disconnect() };
}
