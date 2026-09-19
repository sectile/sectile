import { failResult, okResult, type Result } from '@sectile/core/result';
import { isWellFormedPlainText } from '@sectile/core/text';
import type {
  BaseBlockKind,
  BaseContentKind,
  BaseInlineKind,
  ComponentID,
  ContentRole,
  SchemaID,
  SlotName,
} from './document.js';
import type { ContentErrorCode } from './error.js';
import {
  contentCeilingExceeded,
  normalizeContentLimits,
  type ContentLimits,
} from './limits.js';

export type ConcreteContentTypeRef =
  | { readonly type: 'base'; readonly kind: BaseContentKind }
  | { readonly type: 'component'; readonly id: ComponentID };

export type ContentTypeRef =
  | ConcreteContentTypeRef
  | { readonly type: 'group'; readonly id: string };

export interface ContentRuleDescriptor {
  readonly kind: ContentRole;
  readonly allowed: readonly ContentTypeRef[];
  readonly min?: number;
  readonly max?: number;
}

export interface ComponentSlotDescriptor extends ContentRuleDescriptor {
  readonly name: SlotName;
}

export type DataSchema =
  | { readonly type: 'string' }
  | { readonly type: 'boolean' }
  | { readonly type: 'number' }
  | {
      readonly type: 'enum';
      readonly values: readonly (string | number | boolean | null)[];
    }
  | {
      readonly type: 'array';
      readonly items: DataSchema;
      readonly maxItems?: number;
    }
  | {
      readonly type: 'object';
      readonly properties: Readonly<Record<string, DataPropertyDescriptor>>;
    }
  | {
      readonly type: 'nodeRef';
      readonly allowed?: readonly ContentTypeRef[];
    }
  | {
      readonly type: 'oneOf';
      readonly variants: readonly DataSchema[];
    };

export interface DataPropertyDescriptor {
  readonly schema: DataSchema;
  readonly optional?: boolean;
}

export interface ContentComponentDescriptor {
  readonly id: ComponentID;
  readonly kind: ContentRole;
  readonly componentVersion: number;
  readonly data: DataSchema;
  readonly slots: readonly ComponentSlotDescriptor[];
}

export interface ContentGroupDescriptor {
  readonly id: string;
  readonly kind: ContentRole;
  readonly members: readonly ContentTypeRef[];
}

export interface ContentSchemaDescriptor {
  readonly id: SchemaID;
  readonly version: number;
  readonly blockContent: ContentRuleDescriptor;
  readonly inlineContent: ContentRuleDescriptor;
  readonly rootContent?: ContentRuleDescriptor;
  readonly headingLevels?: readonly number[];
  readonly groups?: readonly ContentGroupDescriptor[];
  readonly components?: readonly ContentComponentDescriptor[];
}

export interface CompiledContentRule {
  readonly kind: ContentRole;
  readonly min: number;
  readonly max: number | null;
  readonly allowed: readonly ConcreteContentTypeRef[];
  allows(ref: ConcreteContentTypeRef): boolean;
}

export interface CompiledComponentSlot {
  readonly descriptor: ComponentSlotDescriptor;
  readonly rule: CompiledContentRule;
}

export interface CompiledComponentDescriptor {
  readonly descriptor: ContentComponentDescriptor;
  readonly slots: readonly CompiledComponentSlot[];
  slot(name: SlotName): CompiledComponentSlot | null;
}

export interface CompiledContentSchema {
  readonly id: SchemaID;
  readonly version: number;
  readonly descriptor: ContentSchemaDescriptor;
  readonly rootContent: CompiledContentRule;
  readonly blockContent: CompiledContentRule;
  readonly inlineContent: CompiledContentRule;
  readonly headingLevels: readonly number[];
  component(id: ComponentID): CompiledComponentDescriptor | null;
  group(id: string): readonly ConcreteContentTypeRef[] | null;
}

interface CompiledOwner {
  readonly components: ReadonlyMap<ComponentID, CompiledComponentDescriptor>;
  readonly groups: ReadonlyMap<string, readonly ConcreteContentTypeRef[]>;
}

const owners = new WeakMap<CompiledContentSchema, CompiledOwner>();
const qualifiedID = /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/u;
const groupID = /^[a-z0-9][a-z0-9._-]*$/u;
const slotName = /^[a-z0-9][a-z0-9-]*$/u;

export interface CompileContentSchemaOptions {
  readonly limits?: Partial<ContentLimits>;
}

export function compileContentSchema(
  descriptor: ContentSchemaDescriptor,
  options: CompileContentSchemaOptions = {},
): Result<CompiledContentSchema, ContentErrorCode> {
  const normalizedLimits = normalizeContentLimits(options.limits);
  if (!normalizedLimits.ok) return normalizedLimits;
  const limits = normalizedLimits.value;
  if (!qualifiedID.test(descriptor.id) || descriptor.id.length > 255) {
    return failResult(
      'construction',
      'content-schema-id-invalid',
      'Content schema id must be a bounded qualified id.',
    );
  }
  if (!Number.isSafeInteger(descriptor.version) || descriptor.version < 1) {
    return failResult(
      'construction',
      'content-schema-version-invalid',
      'Content schema version must be a positive safe integer.',
    );
  }

  const componentInputs = descriptor.components ?? [];
  if (componentInputs.length > limits.maxComponents) {
    return contentCeilingExceeded(
      'content-component-ceiling-exceeded',
      componentInputs.length,
      limits.maxComponents,
    );
  }
  const componentsResult = captureComponents(componentInputs, limits);
  if (!componentsResult.ok) return componentsResult;
  const components = componentsResult.value;

  const groupInputs = descriptor.groups ?? [];
  if (groupInputs.length > limits.maxGroups) {
    return contentCeilingExceeded(
      'content-group-ceiling-exceeded',
      groupInputs.length,
      limits.maxGroups,
    );
  }
  const groupsResult = captureGroups(groupInputs, limits);
  if (!groupsResult.ok) return groupsResult;
  const groups = groupsResult.value;

  const expandedGroups = new Map<string, readonly ConcreteContentTypeRef[]>();
  const visiting = new Set<string>();

  const expandGroup = (
    id: string,
    depth: number = 1,
  ): Result<readonly ConcreteContentTypeRef[], ContentErrorCode> => {
    if (depth > limits.maxDepth) {
      return contentCeilingExceeded(
        'content-depth-ceiling-exceeded',
        depth,
        limits.maxDepth,
        { group: id },
      );
    }
    const cached = expandedGroups.get(id);
    if (cached !== undefined) return okResult(cached);
    const group = groups.get(id);
    if (group === undefined) {
      return failResult(
        'construction',
        'content-type-reference-invalid',
        'Referenced content group does not exist.',
        { id },
      );
    }
    if (visiting.has(id)) {
      return failResult(
        'construction',
        'content-group-cycle',
        'Content groups must not be cyclic.',
        { id },
      );
    }

    visiting.add(id);
    const values: ConcreteContentTypeRef[] = [];
    const seen = new Set<string>();
    for (const member of group.members) {
      if (member.type === 'group') {
        const nested = expandGroup(member.id, depth + 1);
        if (!nested.ok) return nested;
        for (const ref of nested.value) {
          const added = addConcrete(ref, group.kind, components, values, seen);
          if (!added.ok) return added;
        }
      } else {
        const added = addConcrete(member, group.kind, components, values, seen);
        if (!added.ok) return added;
      }
    }
    visiting.delete(id);

    const frozen = Object.freeze(values);
    expandedGroups.set(id, frozen);
    return okResult(frozen);
  };

  for (const id of groups.keys()) {
    const expanded = expandGroup(id);
    if (!expanded.ok) return expanded;
  }

  const compileRule = (
    rule: ContentRuleDescriptor,
  ): Result<CompiledContentRule, ContentErrorCode> => {
    if (rule.allowed.length > limits.maxValues) {
      return contentCeilingExceeded(
        'content-value-ceiling-exceeded',
        rule.allowed.length,
        limits.maxValues,
      );
    }
    const cardinality = validateCardinality(rule);
    if (!cardinality.ok) return cardinality;

    const allowed: ConcreteContentTypeRef[] = [];
    const seen = new Set<string>();
    for (const ref of rule.allowed) {
      if (ref.type === 'group') {
        const group = groups.get(ref.id);
        const members = expandedGroups.get(ref.id);
        if (group === undefined || members === undefined) {
          return failResult(
            'construction',
            'content-type-reference-invalid',
            'Referenced content group does not exist.',
            { id: ref.id },
          );
        }
        if (group.kind !== rule.kind) {
          return failResult(
            'construction',
            'content-role-mismatch',
            'Content group role does not match the rule role.',
            { id: ref.id },
          );
        }
        for (const member of members) {
          const key = typeKey(member);
          if (!seen.has(key)) {
            seen.add(key);
            allowed.push(member);
          }
        }
      } else {
        const added = addConcrete(ref, rule.kind, components, allowed, seen);
        if (!added.ok) return added;
      }
    }

    const frozenAllowed = Object.freeze(allowed);
    const allowedKeys = new Set(frozenAllowed.map(typeKey));
    const compiled: CompiledContentRule = Object.freeze({
      kind: rule.kind,
      min: rule.min ?? 0,
      max: rule.max ?? null,
      allowed: frozenAllowed,
      allows: (ref: ConcreteContentTypeRef): boolean =>
        allowedKeys.has(typeKey(ref)),
    });
    return okResult(compiled);
  };

  const blockContent = compileRule(descriptor.blockContent);
  if (!blockContent.ok) return blockContent;
  if (blockContent.value.kind !== 'block') {
    return roleFailure('blockContent');
  }

  const inlineContent = compileRule(descriptor.inlineContent);
  if (!inlineContent.ok) return inlineContent;
  if (inlineContent.value.kind !== 'inline') {
    return roleFailure('inlineContent');
  }

  const rootContent = compileRule(descriptor.rootContent ?? descriptor.blockContent);
  if (!rootContent.ok) return rootContent;
  if (rootContent.value.kind !== 'block') {
    return roleFailure('rootContent');
  }

  const compiledComponents = new Map<ComponentID, CompiledComponentDescriptor>();
  for (const component of components.values()) {
    const slots: CompiledComponentSlot[] = [];
    for (const slot of component.slots) {
      const rule = compileRule(slot);
      if (!rule.ok) return rule;
      slots.push(Object.freeze({ descriptor: slot, rule: rule.value }));
    }

    const bySlot = new Map(
      slots.map((slot) => [slot.descriptor.name, slot] as const),
    );
    const compiled: CompiledComponentDescriptor = Object.freeze({
      descriptor: component,
      slots: Object.freeze(slots),
      slot: (name: SlotName): CompiledComponentSlot | null =>
        bySlot.get(name) ?? null,
    });
    compiledComponents.set(component.id, compiled);
  }

  const headingLevels = Object.freeze([
    ...(descriptor.headingLevels ?? [1, 2, 3, 4, 5, 6]),
  ]);
  for (const level of headingLevels) {
    if (!Number.isSafeInteger(level) || level < 1 || level > 6) {
      return failResult(
        'construction',
        'content-heading-level-invalid',
        'Heading levels must be integers from 1 through 6.',
        { level },
      );
    }
  }

  let schema: CompiledContentSchema;
  schema = Object.freeze({
    id: descriptor.id,
    version: descriptor.version,
    descriptor,
    rootContent: rootContent.value,
    blockContent: blockContent.value,
    inlineContent: inlineContent.value,
    headingLevels,
    component: (id: ComponentID): CompiledComponentDescriptor | null =>
      owners.get(schema)?.components.get(id) ?? null,
    group: (id: string): readonly ConcreteContentTypeRef[] | null =>
      owners.get(schema)?.groups.get(id) ?? null,
  });

  owners.set(
    schema,
    Object.freeze({
      components: compiledComponents,
      groups: expandedGroups,
    }),
  );
  return okResult(schema);
}

function captureComponents(
  input: readonly ContentComponentDescriptor[],
  limits: ContentLimits,
): Result<
  ReadonlyMap<ComponentID, ContentComponentDescriptor>,
  ContentErrorCode
> {
  const components = new Map<ComponentID, ContentComponentDescriptor>();
  for (const component of input) {
    if (!qualifiedID.test(component.id) || component.id.length > 255) {
      return failResult(
        'construction',
        'content-component-id-invalid',
        'Component id must be a bounded qualified id.',
        { id: component.id },
      );
    }
    if (components.has(component.id)) {
      return failResult(
        'construction',
        'content-component-duplicate',
        'Component ids must be unique.',
        { id: component.id },
      );
    }
    if (
      !Number.isSafeInteger(component.componentVersion)
      || component.componentVersion < 1
    ) {
      return failResult(
        'construction',
        'content-component-version-invalid',
        'Component version must be a positive safe integer.',
        { id: component.id },
      );
    }
    if (component.slots.length > limits.maxSlotsPerComponent) {
      return contentCeilingExceeded(
        'content-slot-ceiling-exceeded',
        component.slots.length,
        limits.maxSlotsPerComponent,
        { component: component.id },
      );
    }
    if (component.kind === 'inline' && component.slots.length !== 0) {
      return failResult(
        'construction',
        'content-role-mismatch',
        'Inline components are atomic and cannot declare slots in v1.',
        { id: component.id },
      );
    }

    const dataSchema = validateDataSchemaDescriptor(component.data, limits);
    if (!dataSchema.ok) return dataSchema;

    const names = new Set<string>();
    for (const slot of component.slots) {
      if (!slotName.test(slot.name) || slot.name.length > 64) {
        return failResult(
          'construction',
          'content-slot-name-invalid',
          'Slot names must be bounded lowercase identifiers.',
          { component: component.id, slot: slot.name },
        );
      }
      if (names.has(slot.name)) {
        return failResult(
          'construction',
          'content-slot-duplicate',
          'Slot names must be unique within a component.',
          { component: component.id, slot: slot.name },
        );
      }
      names.add(slot.name);
      const cardinality = validateCardinality(slot);
      if (!cardinality.ok) return cardinality;
    }
    components.set(component.id, component);
  }
  return okResult(components);
}

function captureGroups(
  input: readonly ContentGroupDescriptor[],
  limits: ContentLimits,
): Result<ReadonlyMap<string, ContentGroupDescriptor>, ContentErrorCode> {
  const groups = new Map<string, ContentGroupDescriptor>();
  for (const group of input) {
    if (!groupID.test(group.id) || group.id.length > 128) {
      return failResult(
        'construction',
        'content-group-id-invalid',
        'Group id must be a bounded lowercase identifier.',
        { id: group.id },
      );
    }
    if (group.members.length > limits.maxValues) {
      return contentCeilingExceeded(
        'content-value-ceiling-exceeded',
        group.members.length,
        limits.maxValues,
        { group: group.id },
      );
    }
    if (groups.has(group.id)) {
      return failResult(
        'construction',
        'content-group-duplicate',
        'Group ids must be unique.',
        { id: group.id },
      );
    }
    groups.set(group.id, group);
  }
  return okResult(groups);
}

function validateDataSchemaDescriptor(
  root: DataSchema,
  limits: ContentLimits,
): Result<true, ContentErrorCode> {
  const stack: {
    readonly schema: DataSchema;
    readonly depth: number;
  }[] = [{ schema: root, depth: 1 }];
  let visited = 0;

  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame === undefined) break;

    visited += 1;
    if (visited > limits.maxValues) {
      return contentCeilingExceeded(
        'content-value-ceiling-exceeded',
        visited,
        limits.maxValues,
        { owner: 'data-schema' },
      );
    }
    if (frame.depth > limits.maxDepth) {
      return contentCeilingExceeded(
        'content-depth-ceiling-exceeded',
        frame.depth,
        limits.maxDepth,
        { owner: 'data-schema' },
      );
    }

    const schema = frame.schema;
    if (
      schema.type === 'string'
      || schema.type === 'boolean'
      || schema.type === 'number'
    ) {
      continue;
    }

    if (schema.type === 'enum') {
      if (schema.values.length > limits.maxValues) {
        return contentCeilingExceeded(
          'content-value-ceiling-exceeded',
          schema.values.length,
          limits.maxValues,
          { owner: 'enum' },
        );
      }
      for (const value of schema.values) {
        if (
          typeof value === 'number'
          && (!Number.isFinite(value) || Object.is(value, -0))
        ) {
          return failResult(
            'construction',
            'content-component-data-invalid',
            'Enum numbers must be finite JSON numbers other than negative zero.',
          );
        }
        if (typeof value === 'string') {
          const checked = validateSchemaString(value, limits);
          if (!checked.ok) return checked;
        }
      }
      continue;
    }

    if (schema.type === 'array') {
      if (
        schema.maxItems !== undefined
        && (
          !Number.isSafeInteger(schema.maxItems)
          || schema.maxItems < 0
          || schema.maxItems > limits.maxValues
        )
      ) {
        return failResult(
          'construction',
          'content-component-data-invalid',
          'Array data schema maxItems must be a bounded non-negative safe integer.',
        );
      }
      stack.push({
        schema: schema.items,
        depth: frame.depth + 1,
      });
      continue;
    }

    if (schema.type === 'object') {
      const properties = Object.entries(schema.properties);
      if (properties.length > limits.maxValues) {
        return contentCeilingExceeded(
          'content-value-ceiling-exceeded',
          properties.length,
          limits.maxValues,
          { owner: 'object-properties' },
        );
      }
      for (const [key, property] of properties) {
        const keyResult = validateSchemaString(key, limits);
        if (!keyResult.ok) return keyResult;
        stack.push({
          schema: property.schema,
          depth: frame.depth + 1,
        });
      }
      continue;
    }

    if (schema.type === 'nodeRef') {
      if (
        schema.allowed !== undefined
        && schema.allowed.length > limits.maxValues
      ) {
        return contentCeilingExceeded(
          'content-value-ceiling-exceeded',
          schema.allowed.length,
          limits.maxValues,
          { owner: 'node-ref-allowed' },
        );
      }
      continue;
    }

    if (schema.variants.length === 0) {
      return failResult(
        'construction',
        'content-component-data-invalid',
        'oneOf data schemas require at least one variant.',
      );
    }
    if (schema.variants.length > limits.maxValues) {
      return contentCeilingExceeded(
        'content-value-ceiling-exceeded',
        schema.variants.length,
        limits.maxValues,
        { owner: 'one-of' },
      );
    }
    for (const variant of schema.variants) {
      stack.push({
        schema: variant,
        depth: frame.depth + 1,
      });
    }
  }

  return okResult(true);
}

function validateSchemaString(
  value: string,
  limits: ContentLimits,
): Result<true, ContentErrorCode> {
  if (!isWellFormedPlainText(value)) {
    return failResult(
      'construction',
      'content-component-data-invalid',
      'Data schema strings must be well-formed UTF-16.',
    );
  }
  if (value.length > limits.maxStringCodeUnits) {
    return contentCeilingExceeded(
      'content-string-code-unit-ceiling-exceeded',
      value.length,
      limits.maxStringCodeUnits,
      { owner: 'data-schema' },
    );
  }
  return okResult(true);
}

function validateCardinality(
  rule: Pick<ContentRuleDescriptor, 'min' | 'max'>,
): Result<true, ContentErrorCode> {
  const min = rule.min ?? 0;
  const max = rule.max ?? null;
  if (
    !Number.isSafeInteger(min)
    || min < 0
    || (
      max !== null
      && (!Number.isSafeInteger(max) || max < min)
    )
  ) {
    return failResult(
      'construction',
      'content-cardinality-invalid',
      'Content cardinality must use safe non-negative bounds.',
    );
  }
  return okResult(true);
}

function addConcrete(
  ref: ConcreteContentTypeRef,
  expected: ContentRole,
  components: ReadonlyMap<ComponentID, ContentComponentDescriptor>,
  output: ConcreteContentTypeRef[],
  seen: Set<string>,
): Result<true, ContentErrorCode> {
  if (ref.type === 'base' && ref.kind === 'list-item') {
    return failResult(
      'construction',
      'content-type-reference-invalid',
      'List items are structural children of List and cannot appear in generic content rules.',
    );
  }

  const role = roleOfRef(ref, components);
  if (role === null) {
    return failResult(
      'construction',
      'content-type-reference-invalid',
      'Content type reference does not resolve.',
      { ref: typeKey(ref) },
    );
  }
  if (role !== expected) {
    return failResult(
      'construction',
      'content-role-mismatch',
      'Content type role does not match its container rule.',
      { ref: typeKey(ref), expected, actual: role },
    );
  }

  const key = typeKey(ref);
  if (!seen.has(key)) {
    seen.add(key);
    output.push(ref);
  }
  return okResult(true);
}

function roleOfRef(
  ref: ConcreteContentTypeRef,
  components: ReadonlyMap<ComponentID, ContentComponentDescriptor>,
): ContentRole | null {
  if (ref.type === 'component') {
    return components.get(ref.id)?.kind ?? null;
  }
  return roleOfBaseKind(ref.kind);
}

function roleFailure(
  name: string,
): Result<never, ContentErrorCode> {
  return failResult(
    'construction',
    'content-role-mismatch',
    `${name} has the wrong content role.`,
  );
}

export function roleOfBaseKind(kind: BaseContentKind): ContentRole {
  return kind === 'text' || kind === 'hard-break' ? 'inline' : 'block';
}

export function typeKey(ref: ConcreteContentTypeRef): string {
  return ref.type === 'component'
    ? `component:${ref.id}`
    : `base:${ref.kind}`;
}

export function baseRef(
  kind: BaseBlockKind | BaseInlineKind,
): ConcreteContentTypeRef {
  return Object.freeze({ type: 'base', kind });
}

export function componentRef(
  id: ComponentID,
): ConcreteContentTypeRef {
  return Object.freeze({ type: 'component', id });
}
