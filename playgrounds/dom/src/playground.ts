export interface Shortcut {
  readonly keys: readonly string[];
  readonly label: string;
}

export interface LogEntry {
  readonly revision: number;
  readonly event: string;
  readonly accepted: boolean;
  readonly effects: readonly string[];
}

export interface DemoContext {
  readonly surface: HTMLElement;
  readonly showState: (revision: number, state: unknown) => void;
  readonly record: (entry: LogEntry) => void;
}

export interface DemoSession {
  readonly focus: () => void;
  readonly disconnect: () => void;
}

export interface DemoDefinition {
  readonly id: string;
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly shortcuts: readonly Shortcut[];
  readonly mount: (context: DemoContext) => DemoSession;
}

export function effectLabels(effects: readonly object[]): readonly string[] {
  return effects.map((effect) => Object.entries(effect)
    .map(([key, value]) => key === 'type' ? String(value) : `${key}=${String(value)}`)
    .join(' '));
}

export function eventLabel(event: unknown): string {
  if (typeof event === 'string') return event;
  if (typeof event !== 'object' || event === null || !('type' in event)) return 'unknown';
  const type = String(event.type);
  if (type !== 'text' || !('event' in event)) return type;
  const nested = event.event;
  return typeof nested === 'object' && nested !== null && 'type' in nested
    ? `text:${String(nested.type)}`
    : type;
}
