import type { Ref } from 'vue';
import type { TabularCellRecord, TabularWireValue } from '@sectile/tabular';
import type { SourceResolver } from './source.js';

type DataTablePathDepth = readonly unknown[];

type DataTableNextDepth<Depth extends DataTablePathDepth> = readonly [...Depth, unknown];

type DataTableNestedPath<Value, Depth extends DataTablePathDepth> =
  Value extends readonly unknown[] ? DataTableArrayPath<Value, Depth>
    : Value extends object ? `.${DataTableObjectPath<Value, Depth>}`
      : never;

type DataTableTupleIndexes<Value extends readonly unknown[]> = Exclude<keyof Value, keyof readonly unknown[]> & `${number}`;

type DataTableArrayPath<Value extends readonly unknown[], Depth extends DataTablePathDepth> =
  Depth['length'] extends 8 ? never
    : number extends Value['length']
      ? `[${number}]` | `[${number}]${DataTableNestedPath<Value[number], DataTableNextDepth<Depth>>}`
      : { [Index in DataTableTupleIndexes<Value>]: `[${Index}]` | `[${Index}]${DataTableNestedPath<Value[Index & keyof Value], DataTableNextDepth<Depth>>}` }[DataTableTupleIndexes<Value>];

type DataTableObjectPath<Value extends object, Depth extends DataTablePathDepth> =
  Depth['length'] extends 8 ? never
    : string extends keyof Value ? string
      : { [Key in Extract<keyof Value, string>]: Key | `${Key}${DataTableNestedPath<Value[Key], DataTableNextDepth<Depth>>}` }[Extract<keyof Value, string>];

type DataTableResolveArrayRest<Value, Rest extends string> =
  Rest extends `[${number}]${infer Tail}`
    ? Value extends readonly (infer Item)[]
      ? Tail extends '' ? Item : DataTableResolveArrayRest<Item, Tail>
      : never
    : never;

type DataTableResolveSegment<Value, Segment extends string> =
  Segment extends `${infer Key}[${infer Index}]${infer Rest}`
    ? Key extends keyof Value
      ? Index extends `${number}` ? DataTableResolveArrayRest<Value[Key], `[${Index}]${Rest}`> : never
      : never
    : Segment extends keyof Value ? Value[Segment] : never;

type DataTableResolvePath<Value, Path extends string> =
  Path extends keyof Value ? Value[Path]
    : Path extends `${infer Segment}.${infer Rest}`
      ? DataTableResolvePath<DataTableResolveSegment<Value, Segment>, Rest>
      : DataTableResolveSegment<Value, Path>;

export type DataTableFieldPath<Cells extends object> = DataTableObjectPath<Cells, readonly []>;

export type DataTableColumnID<LeafCells extends object, GroupCells extends object = LeafCells> = DataTableFieldPath<LeafCells> | DataTableFieldPath<GroupCells>;

export type DataTableCellValue<Cells extends object, Column extends string> = Extract<DataTableResolvePath<Cells, Column>, TabularWireValue> extends never ? TabularWireValue : Extract<DataTableResolvePath<Cells, Column>, TabularWireValue>;

export type DataTableReactiveInput<T> = T | Ref<T> | (() => T);

export interface DataTableWritableRef<T> { value: T }

export type DataTableSourceResponse<Source extends SourceResolver> = Awaited<ReturnType<Source>>;

type DataTableSourceRows<Source extends SourceResolver> = DataTableSourceResponse<Source> extends { readonly rows: readonly (infer Row)[] } ? Row : never;

type DataTableSourceCells<Source extends SourceResolver, Kind extends 'leaf' | 'group'> = Extract<DataTableSourceRows<Source>, { readonly kind: Kind }> extends infer Row
  ? Row extends { readonly cells: infer Cells extends object } ? Cells : never
  : never;

export type DataTableLeafCellsFromSource<Source extends SourceResolver> = [DataTableSourceCells<Source, 'leaf'>] extends [never] ? TabularCellRecord : DataTableSourceCells<Source, 'leaf'>;

export type DataTableGroupCellsFromSource<Source extends SourceResolver> = [DataTableSourceCells<Source, 'group'>] extends [never] ? DataTableLeafCellsFromSource<Source> : DataTableSourceCells<Source, 'group'>;
