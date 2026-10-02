import type { DataTableSourceResolver } from '@sectile/vue/data-table';

const members = [
  { id: 'ada', name: 'Ada', role: 'Engineer' },
  { id: 'grace', name: 'Grace', role: 'Designer' },
  { id: 'linus', name: 'Linus', role: 'Engineer' },
];

export const resolveMembers: DataTableSourceResolver<{ name: string; role: string }> = (request, { signal }) => {
  signal.throwIfAborted();
  return {
    ...request,
    viewRevision: 1,
    matchingLeafCount: { kind: 'known', value: members.length },
    visibleRowCount: { kind: 'known', value: members.length },
    rows: members.map(({ id, name, role }) => ({ kind: 'leaf', id, cells: { name, role } })),
    columnSchema: { revision: request.columnSchemaRevision, columns: [{ id: 'name' }, { id: 'role' }], headers: [] },
    removedRowIDs: [],
  };
};
