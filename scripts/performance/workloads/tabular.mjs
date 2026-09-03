import { iterations, selectedSizes, timed, unwrap, wants, wantsMetric, workloadGroup } from './shared.mjs';

export function* createTabularWorkloadGroups({ quick, selection }) {
  const sizes = selectedSizes('tabular', [1_000, 10_000, 100_000], selection);
  for (const size of sizes) {
    if (
      wants(selection, 'tabular', 'query', 'resolution', size)
      || wantsMetric(selection, `tabular:resolve:warm:${size}`, 'tabular-resolution', { size, stage: 'warm' })
      || wantsMetric(selection, `tabular:resolve:invalidate:${size}`, 'tabular-resolution', { size, stage: 'invalidation' })
    ) {
      yield workloadGroup(() => resolutionWorkloads(size, quick));
    }
    if (
      wants(selection, 'tabular', 'transition', 'grid-profile', size)
      || wantsMetric(selection, `tabular:grid-profile:move:${size}`, 'tabular-profile', { size, operation: 'move-cell' })
    ) {
      yield workloadGroup(() => gridProfileWorkloads(size, quick));
    }
  }
}

async function resolutionWorkloads(size, quick) {
  const { createClientTabularSource, resolveClientTabularRequest } = await import('../../../packages/tabular/dist/source.js');
  const records = recordsFor(size);
  const createSource = () => createClientTabularSource({
    records,
    columnSchema: { revision: 0, columns: [{ id: 'score' }, { id: 'active' }], headers: [] },
    getRowID: (record) => record.id,
    getValue: (record, columnID) => record[columnID],
    policies: {
      predicates: { equals: (record, descriptor, getValue) => getValue(record, descriptor.columnID) === descriptor.value },
      comparators: { value: (left, right, descriptor, getValue) => getValue(left, descriptor.columnID) - getValue(right, descriptor.columnID) },
    },
  });
  const source = createSource();
  const request = tabularRequest(1, 'descending');
  const invalidated = Object.freeze([tabularRequest(2, 'ascending'), tabularRequest(3, 'descending')]);
  unwrap(resolveClientTabularRequest(source, request));
  const repetitions = iterations(size, quick);
  return [
    timed(`tabular:resolve:cold:${size}`, 'tabular-resolution', { size, stage: 'cold' }, repetitions, () =>
      unwrap(resolveClientTabularRequest(createSource(), request)).rows.length),
    timed(`tabular:resolve:warm:${size}`, 'tabular-resolution', { size, stage: 'warm' }, repetitions, () =>
      unwrap(resolveClientTabularRequest(source, request)).rows.length),
    timed(`tabular:resolve:invalidate:${size}`, 'tabular-resolution', { size, stage: 'invalidation' }, repetitions, (iteration) =>
      unwrap(resolveClientTabularRequest(source, invalidated[iteration & 1])).rows.length),
  ];
}

async function gridProfileWorkloads(size, quick) {
  const [{ createClientTabularSource, resolveClientTabularRequest }, { createDataGrid }] = await Promise.all([
    import('../../../packages/tabular/dist/source.js'),
    import('../../../packages/tabular/dist/data-grid.js'),
  ]);
  const records = recordsFor(size);
  const source = createClientTabularSource({
    records,
    columnSchema: { revision: 0, columns: [{ id: 'score' }, { id: 'active' }], headers: [] },
    getRowID: (record) => record.id,
    getValue: (record, columnID) => record[columnID],
    policies: {
      predicates: { equals: (record, descriptor, getValue) => getValue(record, descriptor.columnID) === descriptor.value },
      comparators: { value: (left, right, descriptor, getValue) => getValue(left, descriptor.columnID) - getValue(right, descriptor.columnID) },
    },
  });
  const grid = createDataGrid({
    columns: [{ id: 'score' }, { id: 'active' }],
    initialValues: { accessState: { kind: 'page', page: 1, itemsPerPage: size, visibleRowCount: null, pagination: null } },
  });
  const pending = grid.getSnapshot().tabular.state.requestState.pendingRequest;
  if (pending === null) throw new Error('Tabular grid benchmark requires an initial request.');
  const response = unwrap(resolveClientTabularRequest(source, pending));
  unwrap(grid.synchronizeView(response));
  const firstCell = grid.getProjection().rows[0]?.cells[0];
  if (firstCell === undefined) throw new Error('Tabular grid benchmark requires one projected cell.');
  unwrap(grid.dispatch({ type: 'focus-cell', cell: firstCell }));
  return [timed(`tabular:grid-profile:move:${size}`, 'tabular-profile', { size, operation: 'move-cell' }, quick ? 10 : 100, () =>
    unwrap(grid.dispatch({ type: 'move-cell', direction: 'right', boundary: 'wrap-axis' })).snapshot.revision)];
}

function recordsFor(size) {
  return Object.freeze(Array.from({ length: size }, (_, index) => Object.freeze({
    id: `row-${size}-${index}`,
    score: (index * 48_271) % 100_003,
    active: index % 3 !== 0,
  })));
}

function tabularRequest(queryRevision, direction) {
  return Object.freeze({
    protocolVersion: 1,
    requestID: queryRevision,
    sourceGeneration: 0,
    queryRevision,
    expansionRevision: 0,
    query: Object.freeze({
      filters: Object.freeze([{ id: 'active', scope: 'column', columnID: 'active', predicate: 'equals', value: true }]),
      sort: Object.freeze([{ id: 'score', columnID: 'score', direction, comparator: 'value' }]),
      groups: Object.freeze([]),
      aggregates: Object.freeze([]),
      pivots: Object.freeze([]),
    }),
    expansion: Object.freeze([]),
    access: Object.freeze({ kind: 'window', start: 0, count: 100 }),
    columnSchemaRevision: 0,
  });
}
