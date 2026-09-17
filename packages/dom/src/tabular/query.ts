import type {
  TabularQuery,
  TabularColumnID,
} from '@sectile/tabular';

export function queryWithSort(
  query: TabularQuery,
  columnID: TabularColumnID,
  comparator: string,
  direction: 'ascending' | 'descending' | null,
): TabularQuery {
  const retained = query.sort.filter((sort) => sort.columnID !== columnID);
  const sort = direction === null ? retained : [...retained, { id: `sort:${columnID}`, columnID, comparator, direction }];
  return Object.freeze({ ...query, sort: Object.freeze(sort) });
}

export function queryWithFilter(
  query: TabularQuery,
  id: string,
  scope: 'global' | 'column',
  predicate: string,
  value: string,
  columnID?: TabularColumnID,
): TabularQuery {
  const retained = query.filters.filter((filter) => filter.id !== id);
  const filters = value.length === 0
    ? retained
    : [...retained, { id, scope, predicate, value, enabled: true, ...(columnID === undefined ? {} : { columnID }) }];
  return Object.freeze({ ...query, filters: Object.freeze(filters) });
}
