import { failResult, okResult, type Result } from '@sectile/core/result';
import type {
  BlockNode,
  ComponentID,
  InlineNode,
  PortableContentDocument,
} from '@sectile/content/document';
import type { ContentErrorCode } from '@sectile/content/error';
import type { ContentLimits } from '@sectile/content/limits';
import type { ContentContainerTarget } from '@sectile/content/query';
import type { CompiledContentSchema } from '@sectile/content/schema';
import { validateDocument } from '@sectile/content/validate';

export type AuthoringContentMode = 'atom' | 'flow' | 'slots';

export type EditorAuthoringErrorCode =
  | 'editor-authoring-component-duplicate'
  | 'editor-authoring-component-unknown'
  | 'editor-authoring-mode-invalid';

export interface ComponentAuthoringDefinition {
  readonly component: ComponentID;
  readonly mode?: AuthoringContentMode;
  readonly label?: string;
  readonly description?: string;
  readonly keywords?: readonly string[];
  readonly initializerAction?: string;
  readonly actionIDs?: readonly string[];
  readonly agentDescription?: string;
}

export interface ResolvedComponentAuthoringDefinition {
  readonly component: ComponentID;
  readonly mode: AuthoringContentMode;
  readonly label: string;
  readonly description: string | null;
  readonly keywords: readonly string[];
  readonly initializerAction: string | null;
  readonly actionIDs: readonly string[];
  readonly agentDescription: string | null;
}

export interface CompiledAuthoringRegistry {
  definition(
    component: ComponentID,
  ): ResolvedComponentAuthoringDefinition | null;
  all(): readonly ResolvedComponentAuthoringDefinition[];
}

export interface AuthoringMount {
  readonly name: string;
  readonly kind: 'block' | 'inline';
  readonly frame: 'flow' | 'slot';
  readonly target: ContentContainerTarget;
}

export interface ComponentAuthoringSurface {
  readonly id: string;
  readonly component: ComponentID;
  readonly role: 'block' | 'inline';
  readonly mode: AuthoringContentMode;
  readonly selection: 'atomic' | 'flow' | 'isolated-slots';
  readonly mounts: readonly AuthoringMount[];
}

export function compileAuthoringRegistry(
  schema: CompiledContentSchema,
  definitions: readonly ComponentAuthoringDefinition[] = [],
): Result<CompiledAuthoringRegistry, EditorAuthoringErrorCode> {
  const overrides = new Map<ComponentID, ComponentAuthoringDefinition>();

  for (const definition of definitions) {
    if (overrides.has(definition.component)) {
      return failResult(
        'construction',
        'editor-authoring-component-duplicate',
        'Authoring definitions must identify each component at most once.',
        { component: definition.component },
      );
    }
    if (schema.component(definition.component) === null) {
      return failResult(
        'construction',
        'editor-authoring-component-unknown',
        'Authoring definition references a component outside the active schema.',
        { component: definition.component },
      );
    }
    overrides.set(definition.component, definition);
  }

  const resolved: ResolvedComponentAuthoringDefinition[] = [];
  const byComponent = new Map<
    ComponentID,
    ResolvedComponentAuthoringDefinition
  >();

  for (const descriptor of schema.descriptor.components ?? []) {
    const override = overrides.get(descriptor.id);
    const mode = override?.mode ?? defaultMode(
      descriptor.kind,
      descriptor.slots.length,
    );
    if (!modeCompatible(descriptor.kind, descriptor.slots.length, mode)) {
      return failResult(
        'construction',
        'editor-authoring-mode-invalid',
        'Authoring content mode is incompatible with the component slot contract.',
        {
          component: descriptor.id,
          kind: descriptor.kind,
          slots: descriptor.slots.length,
          mode,
        },
      );
    }

    const value: ResolvedComponentAuthoringDefinition = Object.freeze({
      component: descriptor.id,
      mode,
      label: override?.label ?? descriptor.id,
      description: override?.description ?? null,
      keywords: Object.freeze([...(override?.keywords ?? [])]),
      initializerAction: override?.initializerAction ?? null,
      actionIDs: Object.freeze([...(override?.actionIDs ?? [])]),
      agentDescription: override?.agentDescription ?? null,
    });
    resolved.push(value);
    byComponent.set(value.component, value);
  }

  const all = Object.freeze(resolved);
  return okResult(Object.freeze({
    definition: (
      component: ComponentID,
    ): ResolvedComponentAuthoringDefinition | null =>
      byComponent.get(component) ?? null,
    all: (): readonly ResolvedComponentAuthoringDefinition[] => all,
  }));
}

export function collectAuthoringSurfaces(
  document: PortableContentDocument,
  options: {
    readonly schema: CompiledContentSchema;
    readonly registry: CompiledAuthoringRegistry;
    readonly limits?: Partial<ContentLimits>;
  },
): Result<
  readonly ComponentAuthoringSurface[],
  ContentErrorCode | EditorAuthoringErrorCode
> {
  const valid = validateDocument(
    document,
    options.schema,
    options.limits === undefined
      ? {}
      : { limits: options.limits },
  );
  if (!valid.ok) return valid;

  const surfaces: ComponentAuthoringSurface[] = [];
  const stack: (BlockNode | InlineNode)[] = [...document.root.children].reverse();

  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) break;

    if (node.type === 'text' || node.type === 'hard-break') continue;

    if (node.type === 'paragraph' || node.type === 'heading') {
      pushReverse(stack, node.children);
      continue;
    }

    if (
      node.type === 'blockquote'
      || node.type === 'list'
      || node.type === 'list-item'
    ) {
      pushReverse(stack, node.children);
      continue;
    }

    if (node.type === 'code-block') continue;

    const added = addComponentSurface(
      node,
      options.schema,
      options.registry,
      surfaces,
    );
    if (!added.ok) return added;

    for (let slotIndex = node.slots.length - 1; slotIndex >= 0; slotIndex -= 1) {
      const slot = node.slots[slotIndex];
      if (slot !== undefined) pushReverse(stack, slot.content);
    }
  }

  return okResult(Object.freeze(surfaces));
}

function addComponentSurface(
  node: Extract<BlockNode | InlineNode, { readonly type: 'component' }>,
  schema: CompiledContentSchema,
  registry: CompiledAuthoringRegistry,
  surfaces: ComponentAuthoringSurface[],
): Result<true, EditorAuthoringErrorCode> {
  const descriptor = schema.component(node.component);
  const definition = registry.definition(node.component);
  if (descriptor === null || definition === null) {
    return failResult(
      'construction',
      'editor-authoring-component-unknown',
      'Component authoring surface requires active schema and authoring definitions.',
      { component: node.component },
    );
  }

  const mounts: AuthoringMount[] = [];
  if (definition.mode !== 'atom') {
    for (const slot of descriptor.slots) {
      mounts.push(Object.freeze({
        name: slot.descriptor.name,
        kind: slot.descriptor.kind,
        frame: definition.mode === 'flow' ? 'flow' : 'slot',
        target: Object.freeze({
          type: 'node',
          id: node.id,
          slot: slot.descriptor.name,
        }),
      }));
    }
  }

  surfaces.push(Object.freeze({
    id: node.id,
    component: node.component,
    role: node.kind,
    mode: definition.mode,
    selection: selectionMode(definition.mode),
    mounts: Object.freeze(mounts),
  }));
  return okResult(true);
}

function defaultMode(
  kind: 'block' | 'inline',
  slots: number,
): AuthoringContentMode {
  if (kind === 'inline' || slots === 0) return 'atom';
  return slots === 1 ? 'flow' : 'slots';
}

function modeCompatible(
  kind: 'block' | 'inline',
  slots: number,
  mode: AuthoringContentMode,
): boolean {
  if (kind === 'inline') return mode === 'atom' && slots === 0;
  if (slots === 0) return mode === 'atom';
  if (slots === 1) return mode === 'flow' || mode === 'slots';
  return mode === 'slots';
}

function selectionMode(
  mode: AuthoringContentMode,
): 'atomic' | 'flow' | 'isolated-slots' {
  if (mode === 'atom') return 'atomic';
  return mode === 'flow' ? 'flow' : 'isolated-slots';
}

function pushReverse(
  stack: (BlockNode | InlineNode)[],
  nodes: readonly (BlockNode | InlineNode)[],
): void {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index];
    if (node !== undefined) stack.push(node);
  }
}
