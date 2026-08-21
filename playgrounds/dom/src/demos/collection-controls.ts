import { createCarousel, type CarouselConnection } from '@sectile/dom/carousel';
import { createFeed, type FeedConnection } from '@sectile/dom/feed';
import { createGridControl, type GridConnection } from '@sectile/dom/grid';
import { unwrap } from '@sectile/primitives/result';
import { ChevronLeft, ChevronRight, Pause, Play, createElement } from 'lucide';
import type { DemoContext, DemoDefinition, DemoSession } from '../playground.js';

const gridRows = [
  ['plan', 'owner', 'status'],
  ['build', 'review', 'release'],
] as const;
type GridID = Exclude<typeof gridRows[number][number], null>;

export const gridDemo: DemoDefinition = {
  id: 'grid', label: 'Grid', title: 'Grid',
  description: 'Coordinate navigation, selection, disabled cells, edit mode, axis boundaries, and controlled ownership.',
  shortcuts: [
    { keys: ['Arrows'], label: 'move by cell' },
    { keys: ['Space'], label: 'select' },
    { keys: ['Enter', 'F2'], label: 'start / commit edit' },
    { keys: ['Esc'], label: 'cancel edit' },
  ],
  cases: [
    { id: 'selectable', title: 'Selectable release matrix', mount: (context) => mountGrid(context, { boundary: 'stop', disabled: [], controlled: false }) },
    { id: 'disabled-wrap', title: 'Wrapping grid with unavailable cells', mount: (context) => mountGrid(context, { boundary: 'wrap-axis', disabled: ['review'], controlled: false }) },
    { id: 'editable', title: 'Editable ownership matrix', mount: (context) => mountGrid(context, { boundary: 'stop', disabled: [], controlled: false, editable: true }) },
    { id: 'controlled', title: 'Controlled grid state', mount: (context) => mountGrid(context, { boundary: 'stop', disabled: [], controlled: true }) },
  ],
};

const slides = [
  { id: 'overview', eyebrow: 'Release 1', title: 'Foundation', detail: 'Primitive state and laws.' },
  { id: 'adapters', eyebrow: 'Release 2', title: 'Adapters', detail: 'DOM and terminal ownership.' },
  { id: 'verification', eyebrow: 'Release 3', title: 'Verification', detail: 'Cross-host parity and examples.' },
] as const;
type SlideID = typeof slides[number]['id'];

export const carouselDemo: DemoDefinition = {
  id: 'carousel', label: 'Carousel', title: 'Carousel',
  description: 'Slide movement, wrapping boundaries, pause state, announcements, controls, and controlled ownership.',
  shortcuts: [{ keys: ['←', '→'], label: 'move' }, { keys: ['Home', 'End'], label: 'edges' }, { keys: ['Space'], label: 'pause / resume' }],
  cases: [
    { id: 'wrapping', title: 'Wrapping release tour', mount: (context) => mountCarousel(context, { wrap: true, paused: false, controlled: false }) },
    { id: 'bounded', title: 'Bounded onboarding', mount: (context) => mountCarousel(context, { wrap: false, paused: false, controlled: false }) },
    { id: 'paused', title: 'Initially paused rotation', mount: (context) => mountCarousel(context, { wrap: true, paused: true, controlled: false }) },
    { id: 'controlled', title: 'Controlled carousel', mount: (context) => mountCarousel(context, { wrap: true, paused: false, controlled: true }) },
  ],
};

const feedItems = [
  { id: 'r1', title: 'Primitive laws verified', detail: 'Sequence and selection checks passed.' },
  { id: 'r2', title: 'DOM adapter published', detail: 'ARIA and focus projection ready.' },
  { id: 'r3', title: 'Terminal adapter published', detail: 'Normalized input and rendering ready.' },
  { id: 'r4', title: 'Playground refreshed', detail: 'Scenario coverage expanded.' },
  { id: 'r5', title: 'Cross-host checks passed', detail: 'Semantic traces match.' },
] as const;
type FeedID = typeof feedItems[number]['id'];

export const feedDemo: DemoDefinition = {
  id: 'feed', label: 'Feed', title: 'Feed',
  description: 'Window-local navigation, revisioned loading requests, position metadata, and synchronized replacement.',
  shortcuts: [{ keys: ['↑', '↓'], label: 'move article' }, { keys: ['Page Up', 'Page Down'], label: 'move article' }],
  cases: [
    { id: 'finite', title: 'Finite activity feed', mount: (context) => mountFeed(context, { start: 0, size: 5, load: false }) },
    { id: 'load-after', title: 'Load newer window', mount: (context) => mountFeed(context, { start: 0, size: 3, load: true }) },
    { id: 'load-before', title: 'Load earlier window', mount: (context) => mountFeed(context, { start: 2, size: 3, load: true }) },
  ],
};

function mountGrid(context: DemoContext, scenario: {
  readonly boundary: 'stop' | 'wrap-axis'; readonly disabled: readonly GridID[];
  readonly controlled: boolean; readonly editable?: boolean;
}): DemoSession {
  const frame = document.createElement('div'); frame.className = 'grid-demo';
  const root = document.createElement('div'); root.className = 'data-grid';
  const note = document.createElement('p'); note.className = 'demo-copy';
  frame.append(root, note); context.surface.append(frame);
  let externalValue: GridID | null = null; let externalHighlight: GridID | null = 'plan'; let externalEdit: 'navigation' | 'editing' = 'navigation';
  let editNotice = scenario.editable ? 'Enter or F2 starts editing the current cell.' : 'Space selects the current cell.';
  let connection!: GridConnection<GridID>;
  connection = unwrap(createGridControl({
    root, rows: gridRows, label: 'Release ownership matrix', disabledItems: scenario.disabled,
    policies: { boundary: scenario.boundary },
    ...(scenario.controlled ? {
      value: externalValue, highlightedValue: externalHighlight, editMode: externalEdit,
      onValueChange: (value) => { externalValue = value; queueMicrotask(sync); },
      onHighlightedValueChange: (value) => { externalHighlight = value; queueMicrotask(sync); },
      onEditModeChange: (value) => { externalEdit = value; queueMicrotask(sync); },
    } : { defaultHighlightedValue: externalHighlight }),
    onEditStart: (id) => { editNotice = `Editing ${id}`; },
    onEditCommit: (id) => { editNotice = `Committed ${id}`; },
    onEditCancel: (id) => { editNotice = `Cancelled ${id}`; },
    onUpdate: render,
  }));
  function sync(): void { connection.syncControlledValues({ value: externalValue, highlightedValue: externalHighlight, editMode: externalEdit }); }
  function render(): void {
    const { revision, state } = connection.getSnapshot(); root.replaceChildren();
    for (const rowIDs of gridRows) {
      const row = document.createElement('div'); row.className = 'data-grid-row'; row.setAttribute('role', 'row');
      for (const id of rowIDs) {
        const cell = document.createElement('button'); cell.type = 'button'; cell.className = 'data-grid-cell';
        cell.textContent = id; connection.setCellAttributes(cell, id); row.append(cell);
      }
      root.append(row);
    }
    note.textContent = editNotice;
    context.showState(revision, { current: state.cursor.current, selected: state.selection.selected, editMode: state.editMode, boundary: scenario.boundary, disabled: scenario.disabled, ownership: scenario.controlled ? 'controlled' : 'uncontrolled' });
  }
  render();
  return { focus: () => root.querySelector<HTMLElement>('[tabindex="0"]')?.focus(), disconnect: () => connection.disconnect() };
}

function mountCarousel(context: DemoContext, scenario: { readonly wrap: boolean; readonly paused: boolean; readonly controlled: boolean }): DemoSession {
  const root = document.createElement('section'); root.className = 'carousel-demo'; root.tabIndex = 0;
  const viewport = document.createElement('div'); viewport.className = 'carousel-viewport';
  const controls = document.createElement('div'); controls.className = 'carousel-controls';
  const previous = iconButton(ChevronLeft, 'Previous slide'); const pause = iconButton(scenario.paused ? Play : Pause, 'Pause automatic rotation'); const next = iconButton(ChevronRight, 'Next slide');
  const announcement = document.createElement('p'); announcement.className = 'demo-copy'; announcement.setAttribute('aria-live', 'polite');
  controls.append(previous, pause, next); root.append(viewport, controls, announcement); context.surface.append(root);
  let externalValue: SlideID | null = 'overview'; let externalPaused = scenario.paused; let announced: SlideID | null = null;
  let connection!: CarouselConnection<SlideID>;
  connection = unwrap(createCarousel({
    root, previousButton: previous, nextButton: next, pauseButton: pause,
    slides: slides.map((slide) => slide.id), policies: { wrap: scenario.wrap }, label: 'Sectile release tour',
    ...(scenario.controlled ? {
      value: externalValue, paused: externalPaused,
      onValueChange: (value) => { externalValue = value; queueMicrotask(sync); },
      onPausedChange: (value) => { externalPaused = value; queueMicrotask(sync); },
    } : { defaultValue: externalValue, defaultPaused: externalPaused }),
    getSlideLabel: (_id, index, count) => `Release slide ${index + 1} of ${count}`,
    onAnnounce: (id) => { announced = id; }, onUpdate: render,
  }));
  function sync(): void { connection.syncControlledValues({ value: externalValue, paused: externalPaused }); }
  function render(): void {
    const { revision, state } = connection.getSnapshot(); viewport.replaceChildren();
    for (const slide of slides) {
      const article = document.createElement('article'); article.className = 'carousel-slide';
      const eyebrow = document.createElement('span'); eyebrow.className = 'eyebrow'; eyebrow.textContent = slide.eyebrow;
      const title = document.createElement('strong'); title.textContent = slide.title;
      const detail = document.createElement('p'); detail.textContent = slide.detail;
      article.append(eyebrow, title, detail); connection.setSlideAttributes(article, slide.id); viewport.append(article);
    }
    pause.replaceChildren(createElement(state.paused ? Play : Pause, { 'aria-hidden': 'true', height: 17, width: 17 }));
    announcement.textContent = announced === null ? 'Use the controls or arrow keys.' : `Showing ${announced}.`;
    context.showState(revision, { current: state.cursor.current, paused: state.paused, wrap: scenario.wrap, ownership: scenario.controlled ? 'controlled' : 'uncontrolled', announced });
  }
  render(); return { focus: () => root.focus(), disconnect: () => connection.disconnect() };
}

function mountFeed(context: DemoContext, scenario: { readonly start: number; readonly size: number; readonly load: boolean }): DemoSession {
  const frame = document.createElement('div'); frame.className = 'feed-demo';
  const before = document.createElement('button'); before.type = 'button'; before.className = 'secondary'; before.textContent = 'Load earlier';
  const root = document.createElement('div'); root.className = 'activity-feed';
  const after = document.createElement('button'); after.type = 'button'; after.className = 'secondary'; after.textContent = 'Load newer';
  frame.append(before, root, after); context.surface.append(frame);
  let windowStart = scenario.start; let revision = 1; let windowIDs = currentWindow(); let lastRequest: string | null = null;
  let connection!: FeedConnection<FeedID>;
  connection = unwrap(createFeed({ root, items: windowIDs, revision, label: 'Release activity', setSize: feedItems.length, getPosition: (id) => feedItems.findIndex((item) => item.id === id) + 1, onRequestWindow: (direction, anchor) => { lastRequest = `${direction} from ${anchor ?? 'none'}`; if (!scenario.load) { connection.handleEvent('clear-request'); return; } windowStart = Math.max(0, Math.min(feedItems.length - scenario.size, windowStart + (direction === 'after' ? 1 : -1))); windowIDs = currentWindow(); revision += 1; queueMicrotask(() => connection.syncWindow({ items: windowIDs, revision, highlightedValue: (direction === 'after' ? windowIDs.at(-1) : windowIDs[0]) ?? null })); }, onUpdate: render }));
  const requestBefore = (): void => { connection.handleEvent('request-before'); };
  const requestAfter = (): void => { connection.handleEvent('request-after'); };
  before.addEventListener('click', requestBefore); after.addEventListener('click', requestAfter);
  function currentWindow(): FeedID[] { return feedItems.slice(windowStart, windowStart + scenario.size).map((item) => item.id); }
  function render(): void {
    const { revision: stateRevision, state } = connection.getSnapshot(); root.replaceChildren();
    for (const id of windowIDs) {
      const item = feedItems.find((candidate) => candidate.id === id); if (item === undefined) continue;
      const article = document.createElement('article'); article.className = 'feed-item';
      const title = document.createElement('strong'); title.textContent = item.title;
      const detail = document.createElement('p'); detail.textContent = item.detail;
      article.append(title, detail); connection.setItemAttributes(article, id); root.append(article);
    }
    before.disabled = !scenario.load || windowStart === 0; after.disabled = !scenario.load || windowStart + scenario.size >= feedItems.length;
    context.showState(stateRevision, { window: windowIDs, current: state.cursor.current, revision: state.revision, pending: state.pending, lastRequest });
  }
  render(); return { focus: () => root.querySelector<HTMLElement>('[tabindex="0"]')?.focus(), disconnect: () => { before.removeEventListener('click', requestBefore); after.removeEventListener('click', requestAfter); connection.disconnect(); } };
}

function iconButton(icon: Parameters<typeof createElement>[0], label: string): HTMLButtonElement {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'icon-control secondary'; button.setAttribute('aria-label', label);
  button.append(createElement(icon, { 'aria-hidden': 'true', height: 17, width: 17 })); return button;
}
