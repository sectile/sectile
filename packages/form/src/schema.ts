export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}

export namespace StandardSchemaV1 {
  export interface Props<Input = unknown, Output = Input> {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown,
      options?: Options,
    ) => Result<Output> | Promise<Result<Output>>;
    readonly types?: Types<Input, Output>;
  }

  export interface Types<Input = unknown, Output = Input> {
    readonly input: Input;
    readonly output: Output;
  }

  export interface Options {
    readonly libraryOptions?: Readonly<Record<string, unknown>>;
  }

  export type Result<Output> = SuccessResult<Output> | FailureResult;

  export interface SuccessResult<Output> {
    readonly value: Output;
    readonly issues?: undefined;
  }

  export interface FailureResult {
    readonly issues: readonly Issue[];
  }

  export interface Issue {
    readonly message: string;
    readonly path?: readonly (PropertyKey | PathSegment)[];
  }

  export interface PathSegment {
    readonly key: PropertyKey;
  }

  export type InferInput<Schema extends StandardSchemaV1> =
    NonNullable<Schema['~standard']['types']>['input'];

  export type InferOutput<Schema extends StandardSchemaV1> =
    NonNullable<Schema['~standard']['types']>['output'];
}

export type FormSchema<Input = unknown, Output = Input> = StandardSchemaV1<Input, Output>;
export type FormSchemaInput<Schema extends StandardSchemaV1> = StandardSchemaV1.InferInput<Schema>;
export type FormSchemaOutput<Schema extends StandardSchemaV1> = StandardSchemaV1.InferOutput<Schema>;
