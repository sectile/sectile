import { demos } from './demos/index.js';
import type { DemoContext, DemoSession, LogEntry, Shortcut } from './playground.js';
import './styles.css';

const nav = requiredElement<HTMLElement>('#demo-nav');
const title = requiredElement<HTMLElement>('#demo-title');
const description = requiredElement<HTMLElement>('#demo-description');
const shortcuts = requiredElement<HTMLElement>('#shortcuts');
const surface = requiredElement<HTMLElement>('#demo-surface');
const stateOutput = requiredElement<HTMLElement>('#state-output');
const eventLog = requiredElement<HTMLOListElement>('#event-log');
const revisionBadge = requiredElement<HTMLElement>('#revision-badge');
const focusButton = requiredElement<HTMLButtonElement>('#focus-button');
const resetButton = requiredElement<HTMLButtonElement>('#reset-button');

let activeID = demoIDFromHash();
let session: DemoSession | null = null;
let logEntries: LogEntry[] = [];

renderNavigation();
mountActiveDemo();

focusButton.addEventListener('click', () => session?.focus());
resetButton.addEventListener('click', () => {
  mountActiveDemo();
  session?.focus();
});
window.addEventListener('hashchange', () => {
  const nextID = demoIDFromHash();
  if (nextID === activeID) return;
  activeID = nextID;
  renderNavigation();
  mountActiveDemo();
});

function renderNavigation(): void {
  nav.replaceChildren(...demos.map((demo) => {
    const link = document.createElement('a');
    link.href = `#${demo.id}`;
    link.textContent = demo.label;
    if (demo.id === activeID) link.setAttribute('aria-current', 'page');
    return link;
  }));
}

function mountActiveDemo(): void {
  session?.disconnect();
  logEntries = [];
  surface.replaceChildren();

  const demo = demos.find((candidate) => candidate.id === activeID) ?? demos[0];
  if (demo === undefined) throw new Error('The DOM playground needs at least one demo.');
  activeID = demo.id;
  title.textContent = demo.title;
  description.textContent = demo.description;
  renderShortcuts(demo.shortcuts);

  const context: DemoContext = {
    surface,
    showState: (revision, state) => {
      revisionBadge.textContent = `revision ${revision}`;
      stateOutput.textContent = JSON.stringify(state, null, 2);
    },
    record: (entry) => {
      logEntries = [entry, ...logEntries].slice(0, 12);
      renderLog();
    },
  };
  session = demo.mount(context);
  renderLog();
}

function renderShortcuts(items: readonly Shortcut[]): void {
  shortcuts.replaceChildren(...items.map((shortcut) => {
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

function renderLog(): void {
  eventLog.replaceChildren();
  if (logEntries.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-log';
    empty.textContent = 'Keyboard input will appear here.';
    eventLog.append(empty);
    return;
  }
  for (const entry of logEntries) {
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
