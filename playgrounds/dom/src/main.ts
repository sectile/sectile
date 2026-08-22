import { demoGroups, demos } from './demos/index.js';
import { Code2, createElement, Eye, RotateCcw } from 'lucide';
import type { DemoCaseDefinition, DemoContext, DemoSession, LogEntry, Shortcut } from './playground.js';
import { highlightJavaScript } from './highlight.js';
import './styles.css';

const nav = requiredElement<HTMLElement>('#demo-nav');
const description = requiredElement<HTMLElement>('#demo-description');
const shortcutList = requiredElement<HTMLElement>('#shortcut-list');
const workspace = requiredElement<HTMLElement>('#workspace');
const resetButton = requiredElement<HTMLButtonElement>('#reset-button');

let activeID = demoIDFromHash();
let sessions: DemoSession[] = [];

renderNavigation();
mountActiveDemo();
requestAnimationFrame(() => window.scrollTo(0, 0));

resetButton.append(
  createElement(RotateCcw, { 'aria-hidden': 'true', height: 13, width: 13 }),
  'Reset',
);
resetButton.addEventListener('click', mountActiveDemo);
window.addEventListener('hashchange', () => {
  const nextID = demoIDFromHash();
  if (nextID === activeID) return;
  activeID = nextID;
  updateNavigationSelection();
  mountActiveDemo();
});

function renderNavigation(): void {
  nav.replaceChildren(...demoGroups.map((group) => {
    const section = document.createElement('section');
    section.className = 'demo-nav-group';
    section.dataset['active'] = String(group.demos.some((demo) => demo.id === activeID));
    const headingID = `demo-nav-${group.id}`;
    const heading = document.createElement('h2');
    heading.id = headingID;
    heading.className = 'demo-nav-heading';
    const label = document.createElement('span');
    label.textContent = group.label;
    const count = document.createElement('span');
    count.className = 'demo-nav-count';
    count.textContent = String(group.demos.length);
    count.setAttribute('aria-label', `${group.demos.length} components`);
    heading.append(label, count);
    const links = document.createElement('div');
    links.className = 'demo-nav-links';
    links.setAttribute('aria-labelledby', headingID);
    links.append(...group.demos.map((demo) => {
      const link = document.createElement('a');
      link.href = `#${demo.id}`;
      link.textContent = demo.label;
      link.addEventListener('click', (event) => {
        event.preventDefault();
        if (demo.id !== activeID) {
          history.pushState(null, '', link.href);
          activeID = demo.id;
          updateNavigationSelection();
          mountActiveDemo();
        }
      });
      if (demo.id === activeID) {
        link.setAttribute('aria-current', 'page');
      }
      return link;
    }));
    section.append(heading, links);
    return section;
  }));
}

function updateNavigationSelection(): void {
  for (const group of nav.querySelectorAll<HTMLElement>('.demo-nav-group')) {
    let groupActive = false;
    for (const link of group.querySelectorAll<HTMLAnchorElement>('.demo-nav-links a')) {
      const current = link.getAttribute('href') === `#${activeID}`;
      if (current) {
        link.setAttribute('aria-current', 'page');
        groupActive = true;
      } else {
        link.removeAttribute('aria-current');
      }
    }
    group.dataset['active'] = String(groupActive);
  }
}

function mountActiveDemo(): void {
  const viewportX = window.scrollX;
  const viewportY = window.scrollY;
  for (const session of sessions) session.disconnect();
  sessions = [];

  const demo = demos.find((candidate) => candidate.id === activeID) ?? demos[0];
  if (demo === undefined) throw new Error('The DOM playground needs at least one demo.');
  activeID = demo.id;
  workspace.dataset['demo'] = demo.id;
  description.textContent = demo.description;
  resetButton.setAttribute('aria-label', `Reset ${demo.label}`);
  resetButton.title = `Reset ${demo.label}`;
  renderShortcuts(demo.shortcuts);

  const cases: readonly DemoCaseDefinition[] = demo.cases ?? [{
    id: demo.id,
    title: demo.title,
    mount: demo.mount,
  }];
  const nextWorkspace = document.createDocumentFragment();
  for (const demoCase of cases) mountDemoCase(demoCase, nextWorkspace);
  workspace.replaceChildren(nextWorkspace);
  window.scrollTo(viewportX, viewportY);
}

function mountDemoCase(demoCase: DemoCaseDefinition, target: DocumentFragment): void {
  const card = document.createElement('article');
  card.className = 'example-card';
  card.dataset['case'] = demoCase.id;
  const interaction = demoCase.interaction ?? 'enabled';
  card.dataset['interaction'] = interaction;

  const main = document.createElement('section');
  main.className = 'example-main';
  const mainHeading = createPanelHeading(demoCase.title);
  const revisionBadge = document.createElement('span');
  revisionBadge.className = 'badge';
  revisionBadge.textContent = 'revision 0';
  const surface = document.createElement('div');
  surface.className = 'demo-surface';
  const codeOutput = document.createElement('div');
  codeOutput.className = 'demo-code';
  codeOutput.hidden = true;
  codeOutput.tabIndex = 0;
  const source = demoCase.source ?? sourceFromMount(demoCase);
  const fallback = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = source;
  fallback.append(code);
  codeOutput.append(fallback);
  let highlightingStarted = false;
  const renderHighlightedCode = (): void => {
    if (highlightingStarted) return;
    highlightingStarted = true;
    void highlightJavaScript(source).then((html) => {
      codeOutput.innerHTML = html;
    }).catch(() => {
      // The readable plain-text fallback remains when highlighting cannot load.
    });
  };
  const headingActions = document.createElement('div');
  headingActions.className = 'panel-heading-actions';
  headingActions.append(
    createViewModeControl(surface, codeOutput, demoCase.title, renderHighlightedCode),
    revisionBadge,
  );
  mainHeading.append(headingActions);
  if (interaction !== 'enabled') {
    const note = document.createElement('p');
    note.className = 'interaction-note';
    note.textContent = interaction === 'disabled'
      ? 'Disabled: focus, pointer, and keyboard interaction are unavailable.'
      : 'Read-only: focus and navigation remain available; value changes are rejected.';
    surface.append(note);
  }
  main.append(mainHeading, surface, codeOutput);

  const inspector = document.createElement('aside');
  inspector.className = 'example-inspector';
  const stateSection = document.createElement('section');
  stateSection.className = 'inspector-section';
  const stateOutput = document.createElement('pre');
  stateSection.append(createPanelHeading('State'), stateOutput);
  const logSection = document.createElement('section');
  logSection.className = 'inspector-section';
  const eventLog = document.createElement('ol');
  eventLog.className = 'event-log';
  logSection.append(createPanelHeading('Events & effects'), eventLog);
  inspector.append(stateSection, logSection);
  card.append(main, inspector);
  target.append(card);

  let logEntries: LogEntry[] = [];
  const context: DemoContext = {
    surface,
    instanceID: demoCase.id,
    interaction: interaction === 'disabled'
      ? { disabled: true }
      : interaction === 'readOnly' ? { readOnly: true } : {},
    showState: (revision, state) => {
      revisionBadge.textContent = `revision ${revision}`;
      stateOutput.textContent = JSON.stringify({
        ...(typeof state === 'object' && state !== null ? state : { value: state }),
        interaction,
      }, null, 2);
    },
    record: (entry) => {
      logEntries = [entry, ...logEntries].slice(0, 12);
      renderLog(eventLog, logEntries);
    },
  };
  sessions.push(demoCase.mount(context));
  renderLog(eventLog, logEntries);
}

function createViewModeControl(
  surface: HTMLElement,
  codeOutput: HTMLElement,
  title: string,
  renderHighlightedCode: () => void,
): HTMLElement {
  const group = document.createElement('div');
  group.className = 'view-mode-control';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', `${title} display mode`);

  const viewButton = createModeButton('View', Eye, true);
  const codeButton = createModeButton('Code', Code2, false);
  viewButton.addEventListener('click', () => setViewMode('view'));
  codeButton.addEventListener('click', () => setViewMode('code'));
  group.append(viewButton, codeButton);
  return group;

  function setViewMode(mode: 'view' | 'code'): void {
    const showingView = mode === 'view';
    if (!showingView) renderHighlightedCode();
    surface.hidden = !showingView;
    codeOutput.hidden = showingView;
    viewButton.setAttribute('aria-pressed', String(showingView));
    codeButton.setAttribute('aria-pressed', String(!showingView));
  }
}

function createModeButton(
  label: string,
  icon: Parameters<typeof createElement>[0],
  pressed: boolean,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'view-mode-button';
  button.setAttribute('aria-pressed', String(pressed));
  button.append(
    createElement(icon, { 'aria-hidden': 'true', height: 13, width: 13 }),
    label,
  );
  return button;
}

function sourceFromMount(demoCase: DemoCaseDefinition): string {
  const interaction = demoCase.interaction ?? 'enabled';
  return [
    `// ${demoCase.title}`,
    `// interaction: ${interaction}`,
    '',
    demoCase.mount.toString(),
  ].join('\n');
}

function createPanelHeading(titleText: string): HTMLElement {
  const heading = document.createElement('div');
  heading.className = 'panel-heading';
  const title = document.createElement('h2');
  title.textContent = titleText;
  heading.append(title);
  return heading;
}

function renderShortcuts(items: readonly Shortcut[]): void {
  shortcutList.replaceChildren(...items.map((shortcut) => {
    const item = document.createElement('span');
    for (const [index, key] of shortcut.keys.entries()) {
      if (index > 0) item.append(' + ');
      const keyElement = document.createElement('kbd');
      keyElement.textContent = key;
      item.append(keyElement);
    }
    item.append(` ${shortcut.label}`);
    return item;
  }));
}

function renderLog(eventLog: HTMLOListElement, entries: readonly LogEntry[]): void {
  eventLog.replaceChildren();
  if (entries.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-log';
    empty.textContent = 'Keyboard and pointer input will appear here.';
    eventLog.append(empty);
    return;
  }
  for (const entry of entries) {
    const item = document.createElement('li');
    item.className = 'event-entry';
    const revision = document.createElement('span');
    revision.className = 'event-revision';
    revision.textContent = `r${entry.revision}`;
    const detail = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'event-name';
    name.textContent = `${entry.event} · ${entry.accepted ? 'accepted' : 'rejected'}`;
    const effects = document.createElement('div');
    effects.className = 'event-effects';
    effects.textContent = entry.effects.length === 0 ? 'no effects' : entry.effects.join(', ');
    detail.append(name, effects);
    item.append(revision, detail);
    eventLog.append(item);
  }
}

function demoIDFromHash(): string {
  const requested = window.location.hash.slice(1);
  return demos.some((demo) => demo.id === requested) ? requested : demos[0]?.id ?? '';
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector(selector);
  if (element === null) throw new Error(`Missing playground element: ${selector}`);
  return element as T;
}
