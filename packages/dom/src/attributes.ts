import { failResult, okResult, type Result } from '@sectile/core/result';

export type AnchorCurrent = 'page' | 'step' | 'location' | 'date' | 'time';
export interface AnchorOptions {
  readonly href?: string;
  readonly target?: string;
  readonly rel?: string;
  readonly download?: string | boolean;
  readonly disabled?: boolean;
  readonly current?: AnchorCurrent;
  readonly tabIndex?: number | string;
}
export interface AnchorAttributes {
  readonly href: string | undefined;
  readonly target: string | undefined;
  readonly rel: string | undefined;
  readonly download: string | undefined;
  readonly role: 'link' | undefined;
  readonly tabindex: number | string | undefined;
  readonly 'aria-disabled': 'true' | undefined;
  readonly 'aria-current': AnchorCurrent | undefined;
}
const anchorDestination = /\S/u;
const blankAnchorTarget = /^_blank$/iu;
const noopenerRelation = /(?:^|[\t\n\f\r ])noopener(?:[\t\n\f\r ]|$)/iu;

/** Native projection only: destinations are trusted application inputs, not sanitized URLs. */
export function getAnchorAttributes(options: AnchorOptions): AnchorAttributes {
  const { href, disabled: disabledInput, target, rel: originalRel, download, current, tabIndex } = options;
  const disabled = disabledInput === true;
  if (href !== undefined && typeof href !== 'string') throw new TypeError('Anchor href must be a string.');
  if (!disabled && (href === undefined || !anchorDestination.test(href))) throw new TypeError('An enabled anchor requires a nonempty href.');
  let rel = originalRel;
  if (target !== undefined && blankAnchorTarget.test(target) && (rel === undefined || !noopenerRelation.test(rel))) {
    rel = rel ? rel + ' noopener' : 'noopener';
  }
  return {
    href: disabled ? undefined : href, target, rel,
    download: download === true ? '' : typeof download === 'string' ? download : undefined,
    role: disabled ? 'link' : undefined, tabindex: disabled ? -1 : tabIndex,
    'aria-disabled': disabled ? 'true' : undefined, 'aria-current': current,
  };
}

/** Call before every navigation callback; native modifiers and router eligibility remain caller-owned. */
export function guardAnchorActivation(event: Pick<Event, 'defaultPrevented' | 'preventDefault'>, disabled = false): boolean {
  if (disabled) { event.preventDefault(); return false; }
  return !event.defaultPrevented;
}

export type DataAttributeName = `data-${string}`;
export type DataAttributesErrorCode = 'dom.attributes-invalid' | 'dom.attributes-unavailable'
  | 'dom.attributes-disposed' | 'dom.attributes-reentrant' | 'dom.attributes-resource-limit';
export interface DataAttributesOptions<K extends DataAttributeName = DataAttributeName> {
  readonly element: HTMLElement;
  readonly names: readonly K[];
  readonly maxValueCodeUnits?: number;
}
export interface DataAttributesConnection<K extends DataAttributeName = DataAttributeName> {
  /** Complete replacement of the declared names; omission removes an attribute. */
  apply(values: Readonly<Partial<Record<K, string>>>): Result<void, DataAttributesErrorCode>;
  disconnect(): void;
}
const failure = (code: DataAttributesErrorCode, message: string): Result<never, DataAttributesErrorCode> =>
  failResult(code === 'dom.attributes-resource-limit' ? 'resource-rejection' : 'construction', code, message);
type Entry = { readonly name: string; readonly original: string | null; accepted: string | null | undefined };

/** Owns bounded data metadata only; no browser work occurs at module import. */
export function connectDataAttributes<const K extends DataAttributeName>(options: DataAttributesOptions<K>): Result<DataAttributesConnection<K>, DataAttributesErrorCode> {
  let element: HTMLElement | undefined, maximum = 4096;
  let entries: Entry[] = [];
  const indexes = new Map<string, number>();
  let disposed = false, applying = false;
  let pending: { readonly values: readonly (string | null)[]; attempted: number } | undefined;
  try {
    element = options.element; maximum = options.maxValueCodeUnits ?? maximum;
    const names = options.names;
    if (!Number.isSafeInteger(maximum) || maximum < 1 || !Array.isArray(names) || !names.length) return failure('dom.attributes-invalid', 'Invalid attribute connection options');
    if (names.length > 64) return failure('dom.attributes-resource-limit', 'Attribute names exceed their count limit');
    for (let index = 0; index < names.length; index++) {
      const field = Object.getOwnPropertyDescriptor(names, String(index));
      if (!field || !('value' in field) || typeof field.value !== 'string' || field.value.length > 128
        || !/^data-[a-z0-9_.:-]+$/u.test(field.value) || indexes.has(field.value)) return failure('dom.attributes-invalid', 'Attribute names must be unique data metadata');
      const original = element!.getAttribute(field.value);
      if (original !== null && original.length > maximum) return failure('dom.attributes-resource-limit', 'Original attribute exceeds its code-unit limit');
      indexes.set(field.value, index);
      entries.push({ name: field.value, original, accepted: undefined });
    }
  } catch { return failure('dom.attributes-unavailable', 'Attribute connection could not be prepared'); }
  const prior = (entry: Entry): string | null => entry.accepted === undefined ? entry.original : entry.accepted;
  const write = (target: HTMLElement, name: string, value: string | null): void => {
    if (value === null) target.removeAttribute(name);
    else target.setAttribute(name, value);
  };
  const disconnect = (): void => {
    if (disposed) return;
    disposed = true;
    const target = element, held = entries, work = pending;
    element = undefined; entries = []; indexes.clear(); pending = undefined;
    let error: unknown, failed = false;
    if (target) for (let index = 0; index < held.length; index++) {
      const entry = held[index]!;
      try {
        const current = target.getAttribute(entry.name);
        const inFlight = work && index < work.attempted && current === work.values[index];
        if ((inFlight || entry.accepted !== undefined && current === entry.accepted) && current !== entry.original) write(target, entry.name, entry.original);
      } catch (caught) { if (!failed) error = caught; failed = true; }
    }
    if (failed) throw error;
  };
  return okResult(Object.freeze({
    apply(values: Readonly<Partial<Record<K, string>>>): Result<void, DataAttributesErrorCode> {
      if (disposed) return failure('dom.attributes-disposed', 'Attribute connection is disconnected');
      if (applying) return failure('dom.attributes-reentrant', 'Attribute connection is applying another revision');
      applying = true;
      const target = element!, held = entries;
      let work: typeof pending;
      try {
        if (values === null || typeof values !== 'object' || Array.isArray(values)) return failure('dom.attributes-invalid', 'Attributes require a replacement record');
        const keys = Reflect.ownKeys(values), next: (string | null)[] = Array(held.length).fill(null);
        if (disposed) return failure('dom.attributes-disposed', 'Attributes disconnected during admission');
        if (keys.length > held.length) return failure('dom.attributes-resource-limit', 'Attribute replacement exceeds its declared count');
        for (const key of keys) {
          const index = typeof key === 'string' ? indexes.get(key) : undefined;
          if (index === undefined) return failure('dom.attributes-invalid', 'Attribute replacement contains an undeclared name');
          const field = Object.getOwnPropertyDescriptor(values, key);
          if (disposed) return failure('dom.attributes-disposed', 'Attributes disconnected during admission');
          if (!field || !('value' in field) || typeof field.value !== 'string') return failure('dom.attributes-invalid', 'Attribute values require own strings');
          if (field.value.length > maximum) return failure('dom.attributes-resource-limit', 'Attribute exceeds its code-unit limit');
          next[index] = field.value;
        }
        if (disposed) return failure('dom.attributes-disposed', 'Attributes disconnected during admission');
        for (const entry of held) {
          const current = target.getAttribute(entry.name);
          if (disposed) return failure('dom.attributes-disposed', 'Attributes disconnected during ownership check');
          if (current !== prior(entry)) return failure('dom.attributes-unavailable', 'Attribute changed outside its connection');
        }
        work = { values: next, attempted: 0 }; pending = work;
        for (let index = 0; index < held.length; index++) {
          const entry = held[index]!, value = next[index]!;
          if (target.getAttribute(entry.name) !== prior(entry)) throw Error('Attribute ownership changed during application');
          if (disposed) return failure('dom.attributes-disposed', 'Attributes disconnected during application');
          work.attempted = index + 1;
          if (value !== prior(entry)) write(target, entry.name, value);
          if (disposed) return failure('dom.attributes-disposed', 'Attributes disconnected during application');
          if (target.getAttribute(entry.name) !== value) throw Error('Attribute application did not retain its value');
          if (disposed) return failure('dom.attributes-disposed', 'Attributes disconnected during application');
        }
        for (let index = 0; index < held.length; index++) {
          if (target.getAttribute(held[index]!.name) !== next[index]) throw Error('Attribute ownership changed before acceptance');
          if (disposed) return failure('dom.attributes-disposed', 'Attributes disconnected before acceptance');
        }
        for (let index = 0; index < held.length; index++) held[index]!.accepted = next[index]!;
        return okResult(undefined);
      } catch {
        let rollbackFailed = false;
        if (!disposed && work) for (let index = work.attempted - 1; index >= 0 && !disposed; index--) {
          const entry = held[index]!;
          try {
            const current = target.getAttribute(entry.name);
            if (!disposed && current === work.values[index] && prior(entry) !== work.values[index]) write(target, entry.name, prior(entry));
          } catch { rollbackFailed = true; }
        }
        if (rollbackFailed) try { disconnect(); } catch { /* References are already released; application returns failure. */ }
        return failure(disposed ? 'dom.attributes-disposed' : 'dom.attributes-unavailable', 'Attribute application failed');
      } finally { pending = undefined; applying = false; }
    },
    disconnect,
  }));
}
