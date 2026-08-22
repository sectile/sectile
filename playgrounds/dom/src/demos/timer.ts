import { createTimer, type TimerConnection } from '@sectile/dom/timer';
import type { DemoContext, DemoDefinition, DemoSession } from '../playground.js';

export const timerDemo: DemoDefinition = {
  id: 'timer', label: 'Timer', title: 'Timer', description: 'Elapsed and countdown clocks with exact host elapsed time, explicit controls, completion, and formatted parts.',
  shortcuts: [{ keys: ['Click'], label: 'start, pause, or reset' }],
  cases: [
    { id: 'stopwatch', title: 'Stopwatch', mount: (context) => mountTimer(context, { startMs: 0, autoStart: false }) },
    { id: 'countdown', title: 'Release countdown', mount: (context) => mountTimer(context, { countdown: true, startMs: 10_000, autoStart: true }) },
    { id: 'target', title: 'Bounded elapsed timer', mount: (context) => mountTimer(context, { startMs: 0, targetMs: 15_000, autoStart: false }) },
  ],
};
function mountTimer(context: DemoContext, options: { readonly countdown?: boolean; readonly startMs: number; readonly targetMs?: number; readonly autoStart: boolean }): DemoSession {
  const root = document.createElement('div'); root.className = 'timer-demo'; const area = document.createElement('div'); area.className = 'timer-area'; const minutes = document.createElement('span'); const separator = document.createElement('span'); separator.textContent = ':'; const seconds = document.createElement('span'); area.append(minutes, separator, seconds);
  const controls = document.createElement('div'); controls.className = 'timer-controls'; const start = button('Start'); const pause = button('Pause'); const reset = button('Reset'); const restart = button('Restart'); controls.append(start, pause, reset, restart); root.append(area, controls); context.surface.append(root);
  let connection!: TimerConnection; connection = createTimer({ root, ...options, intervalMs: 100, onUpdate: render }); connection.setItemAttributes(minutes, 'minutes'); connection.setItemAttributes(seconds, 'seconds'); connection.setActionAttributes(start, 'start'); connection.setActionAttributes(pause, 'pause'); connection.setActionAttributes(reset, 'reset'); connection.setActionAttributes(restart, 'restart');
  function render(): void { const snapshot = connection.getSnapshot(); context.showState(snapshot.revision, { valueMs: Math.floor(snapshot.state.valueMs), running: snapshot.state.running, completed: snapshot.state.completed, countdown: options.countdown ?? false }); }
  render(); return { focus: () => start.focus(), disconnect: () => connection.disconnect() };
}
function button(label: string): HTMLButtonElement { const element = document.createElement('button'); element.type = 'button'; element.className = 'secondary'; element.textContent = label; return element; }
