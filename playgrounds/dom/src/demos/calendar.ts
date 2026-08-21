import { createCalendar } from '@sectile/dom/calendar';
import { unwrap } from '@sectile/primitives/result';
import { effectLabels, eventLabel, type DemoDefinition } from '../playground.js';

const weeks = [
  ['18', '19', '20', '21', '22', '23', '24'],
  ['25', '26', '27', '28', '29', '30', '31'],
] as const;

export const calendarDemo: DemoDefinition = {
  id: 'calendar',
  label: 'Calendar',
  title: 'August 2026',
  description: 'Navigate a calendar grid, choose a date, and inspect page requests.',
  shortcuts: [
    { keys: ['←', '→', '↑', '↓'], label: 'move' },
    { keys: ['Enter'], label: 'select' },
    { keys: ['Page Up', 'Page Down'], label: 'request month' },
  ],
  mount(context) {
    const wrap = document.createElement('div');
    wrap.className = 'calendar-wrap';
    const weekdays = document.createElement('div');
    weekdays.className = 'weekdays';
    weekdays.innerHTML = '<span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>';
    const root = document.createElement('div');
    root.className = 'calendar-grid';
    wrap.append(weekdays, root);
    context.surface.append(wrap);
    let pageRequest: string | null = null;
    const connection = unwrap(createCalendar({
      rows: weeks,
      root,
      defaultHighlightedValue: '18',
      onPageRequest: ({ direction }) => { pageRequest = direction < 0 ? 'previous' : 'next'; },
      onTransition: ({ event, result }) => context.record({
        revision: result.snapshot.revision,
        event: eventLabel(event),
        accepted: result.ok,
        effects: effectLabels(result.commands),
      }),
      onUpdate: render,
    }));

    function render(): void {
      const { revision, state } = connection.getSnapshot();
      root.replaceChildren();
      connection.setCalendarAttributes('August 2026');
      weeks.forEach((week, rowIndex) => week.forEach((id, columnIndex) => {
        const cell = document.createElement('div');
        cell.className = [
          'calendar-cell',
          state.cursor.current === id ? 'current' : '',
          state.selection.has(id) ? 'selected' : '',
        ].filter(Boolean).join(' ');
        cell.textContent = id;
        connection.setCellAttributes(cell, { id, rowIndex: rowIndex + 1, columnIndex: columnIndex + 1 });
        root.append(cell);
      }));
      context.showState(revision, {
        current: state.cursor.current,
        selected: state.selection.selected,
        pageRequest,
      });
    }

    render();
    return { focus: () => connection.focusCurrent(), disconnect: () => connection.disconnect() };
  },
};
