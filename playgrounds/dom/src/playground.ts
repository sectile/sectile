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
  readonly instanceID: string;
  readonly interaction: DemoInteractionOptions;
  readonly showState: (revision: number, state: unknown) => void;
  readonly record: (entry: LogEntry) => void;
}

export interface DemoInteractionOptions {
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
}

export type DemoInteractionMode = 'enabled' | 'disabled' | 'readOnly';

export interface DemoSession {
  readonly focus: () => void;
  readonly disconnect: () => void;
}

interface DemoMetadata {
  readonly id: string;
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly shortcuts: readonly Shortcut[];
}

export interface DemoCaseDefinition {
  readonly id: string;
  readonly title: string;
  readonly interaction?: DemoInteractionMode;
  readonly mount: (context: DemoContext) => DemoSession;
}

export type DemoDefinition = DemoMetadata & (
  | { readonly mount: (context: DemoContext) => DemoSession; readonly cases?: never }
  | { readonly cases: readonly DemoCaseDefinition[]; readonly mount?: never }
);

export function withInteractionCases(
  demo: DemoDefinition,
  options: { readonly readOnly?: boolean; readonly readOnlyCaseID?: string } = {},
): DemoDefinition {
  const cases: readonly DemoCaseDefinition[] = demo.cases ?? [{
    id: demo.id,
    title: demo.title,
    mount: demo.mount,
  }];
  const base = cases[0];
  if (base === undefined) return demo;
  const readOnlyBase = options.readOnlyCaseID === undefined
    ? base
    : cases.find(({ id }) => id === options.readOnlyCaseID) ?? base;
  return {
    id: demo.id,
    label: demo.label,
    title: demo.title,
    description: demo.description,
    shortcuts: demo.shortcuts,
    cases: [
      ...cases,
      { id: 'disabled-state', title: 'Disabled state', interaction: 'disabled', mount: base.mount },
      ...(options.readOnly
        ? [{ id: 'read-only-state', title: 'Read-only state', interaction: 'readOnly' as const, mount: readOnlyBase.mount }]
        : []),
    ],
  };
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
