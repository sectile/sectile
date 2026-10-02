import type { DataTableSourceResolver } from '@sectile/vue/data-table';
import { createClientTabularSource } from '@sectile/tabular/source';
import type { DataGridSourceResolver, DataGridViewResponse } from '@sectile/vue/data-grid';
import { createDataTreeGrid } from '@sectile/tabular/data-tree-grid';
import { createTabularQuery } from '@sectile/tabular/query';

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
    columnSchema: { revision: 1, columns: [{ id: 'name' }, { id: 'role' }], headers: [] },
    removedRowIDs: [],
  };
};

// Each mounted grid owns a source instance and its request revisions.
export function createMemberSource() {
  const source = createClientTabularSource({
    records: members,
    columnSchema: { revision: 1, columns: [{ id: 'name' }, { id: 'role' }], headers: [] },
    getRowID: member => member.id,
    getValue: (member, column) => column === 'name' ? member.name : member.role,
    policies: {
      comparators: { text: (left, right, descriptor, getValue) => String(getValue(left, descriptor.columnID)).localeCompare(String(getValue(right, descriptor.columnID)), 'en') },
      predicates: { contains: (member, descriptor) => `${member.name} ${member.role}`.toLowerCase().includes(String(descriptor.value).toLowerCase()) },
      grouping: { role: member => ({ groupID: `role-${member.role.toLowerCase()}`, label: member.role }) },
    },
  });
  return (request: Parameters<DataGridSourceResolver>[0], { signal }: Parameters<DataGridSourceResolver>[1]): DataGridViewResponse<{ name: string; role: string }> => {
    signal.throwIfAborted();
    const result = source.resolve(request);
    if (!result.ok) throw new Error(result.error.message);
    return {
      ...result.value,
      rows: result.value.rows.map(row => ({
        ...row,
        cells: { name: String(row.cells['name'] ?? ''), role: String(row.cells['role'] ?? '') },
      })),
    };
  };
}

// Preload this small, local data set through the public request contract. This
// supplies the schema before sort/group descriptors are constructed and gives
// SSR and hydration the same initial view. No network work runs during SSR.
export function createMemberInitialView(source: ReturnType<typeof createMemberSource>, query = createTabularQuery()) {
  const controller = createDataTreeGrid({ columns: [{ id: 'name' }, { id: 'role' }], initialValues: { query } });
  try {
    let request = controller.getSnapshot().tabular.state.requestState.pendingRequest;
    if (request === null) {
      const requested = controller.requestView();
      if (!requested.ok) throw new Error(requested.error.message);
      request = controller.getSnapshot().tabular.state.requestState.pendingRequest;
    }
    if (request === null) throw new Error('A member source request is required.');
    return source(request, { signal: new AbortController().signal });
  } finally {
    controller.dispose();
  }
}
