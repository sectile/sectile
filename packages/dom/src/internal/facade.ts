import type { Result } from '@sectile/core';

interface SnapshotConnection {
  getSnapshot(): { readonly state: unknown };
}

interface FacadeOptions {
  readonly onUpdate?: () => void;
}

type SnapshotOf<Connection extends SnapshotConnection> = ReturnType<Connection['getSnapshot']>;
type StateOf<Connection extends SnapshotConnection> = SnapshotOf<Connection>['state'];
type SendInput<Connection> = Connection extends { handleEvent(input: infer Input): boolean }
  ? Input
  : Connection extends { handleKeyboardInput(input: infer Input): boolean }
    ? Input
    : Connection extends { handleKeyboardEvent(input: infer Input): boolean }
      ? Input
      : Connection extends { handleBeforeInput(input: infer Input): boolean }
        ? Input
        : never;
type UpdateInput<Connection> = Connection extends { syncControlledValues(input: infer Input): unknown }
  ? Input
  : Connection extends { syncControlledValue(input: infer Input): unknown }
    ? Input
    : Connection extends { syncWindow(input: infer Input): unknown }
      ? Input
      : never;
type UpdateResult<Connection> = Connection extends { syncControlledValues(input: infer _Input): infer Output }
  ? Output
  : Connection extends { syncControlledValue(input: infer _Input): infer Output }
    ? Output
    : Connection extends { syncWindow(input: infer _Input): infer Output }
      ? Output
      : never;

export type FacadeConnection<Connection extends SnapshotConnection> = Connection & {
  readonly state: StateOf<Connection>;
  send(input: SendInput<Connection>): boolean;
  update(input: UpdateInput<Connection>): UpdateResult<Connection>;
  subscribe(listener: (snapshot: SnapshotOf<Connection>) => void): () => void;
  destroy(): void;
};

export function createFacadeConnection<
  Options extends FacadeOptions,
  Connection extends SnapshotConnection,
>(
  options: Options,
  construct: (options: Options) => Result<Connection>,
): Result<FacadeConnection<Connection>> {
  const subscribers = new Set<(snapshot: SnapshotOf<Connection>) => void>();
  let connection: Connection | undefined;
  let active = true;
  const onUpdate = (): void => {
    options.onUpdate?.();
    if (connection === undefined) return;
    const snapshot = connection.getSnapshot() as SnapshotOf<Connection>;
    for (const subscriber of subscribers) subscriber(snapshot);
  };
  const constructed = construct({ ...options, onUpdate } as Options);
  if (!constructed.ok) return constructed;
  connection = constructed.value;
  const target = connection as Connection & Record<PropertyKey, unknown>;
  const facade = new Proxy(target, {
    get: (_target, property) => {
      if (property === 'state') return connection?.getSnapshot().state;
      if (property === 'send') return (input: unknown): boolean => active && Boolean(callFirst(target, ['handleEvent', 'handleKeyboardInput', 'handleKeyboardEvent', 'handleBeforeInput'], input));
      if (property === 'update') return (input: unknown): unknown => callFirst(target, ['syncControlledValues', 'syncControlledValue', 'syncWindow'], input);
      if (property === 'subscribe') return (listener: (snapshot: SnapshotOf<Connection>) => void): (() => void) => {
        subscribers.add(listener);
        return (): void => { subscribers.delete(listener); };
      };
      if (property === 'destroy') return (): void => {
        if (!active) return;
        active = false;
        const disconnect = target['disconnect'];
        if (typeof disconnect === 'function') Reflect.apply(disconnect, target, []);
        subscribers.clear();
      };
      const value = Reflect.get(target, property, target);
      const ownDescriptor = Reflect.getOwnPropertyDescriptor(target, property);
      if (ownDescriptor !== undefined && ownDescriptor.configurable === false) return value;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  return { ok: true, value: facade as unknown as FacadeConnection<Connection> };
}

function callFirst(
  target: Record<PropertyKey, unknown>,
  names: readonly string[],
  input: unknown,
): unknown {
  for (const name of names) {
    const method = target[name];
    if (typeof method === 'function') return Reflect.apply(method, target, [input]);
  }
  throw new TypeError(`The connection does not implement ${names.join(' or ')}.`);
}
