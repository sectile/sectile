import type { StandardSchemaV1 } from '@standard-schema/spec';

export type { StandardSchemaV1 } from '@standard-schema/spec';
export type FormSchema<Input = unknown, Output = Input> = StandardSchemaV1<Input, Output>;
export type FormSchemaInput<Schema extends StandardSchemaV1> = StandardSchemaV1.InferInput<Schema>;
export type FormSchemaOutput<Schema extends StandardSchemaV1> = StandardSchemaV1.InferOutput<Schema>;
