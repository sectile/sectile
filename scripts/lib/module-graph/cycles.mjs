/** Existing Core cycle witnesses, shared without changing their report shape. */
export function detectCycles(modulePaths, edges) {
  const adjacency = new Map(modulePaths.map((path) => [path, []]));
  for (const edge of edges) adjacency.get(edge.source)?.push(edge.target);
  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  const cycles = [];
  const recorded = new Set();
  const visit = (path) => {
    if (visited.has(path)) return;
    if (visiting.has(path)) {
      const start = stack.indexOf(path);
      const cycle = [...stack.slice(start), path];
      const open = cycle.slice(0, -1);
      const key = open.map((_, index) => [...open.slice(index), ...open.slice(0, index)].join('\0')).sort()[0] ?? '';
      if (!recorded.has(key)) { recorded.add(key); cycles.push(cycle); }
      return;
    }
    visiting.add(path);
    stack.push(path);
    for (const target of adjacency.get(path) ?? []) visit(target);
    stack.pop();
    visiting.delete(path);
    visited.add(path);
  };
  for (const path of modulePaths) visit(path);
  return cycles.sort((left, right) => left.join('\0').localeCompare(right.join('\0')));
}

/** Exact cyclic SCC edge sets prevent an old exception from hiding a new cycle. */
export function cyclicComponents(paths, edges) {
  const forward = new Map(paths.map((path) => [path, []]));
  const reverse = new Map(paths.map((path) => [path, []]));
  for (const { source, target } of edges) {
    if (!forward.has(source) || !forward.has(target)) throw new Error(`Unknown graph endpoint: ${source} -> ${target}`);
    forward.get(source).push(target);
    reverse.get(target).push(source);
  }
  const visited = new Set();
  const order = [];
  for (const root of paths) {
    if (visited.has(root)) continue;
    visited.add(root);
    const stack = [[root, 0]];
    while (stack.length) {
      const current = stack[stack.length - 1];
      const targets = forward.get(current[0]);
      if (current[1] === targets.length) { order.push(current[0]); stack.pop(); continue; }
      const target = targets[current[1]++];
      if (!visited.has(target)) { visited.add(target); stack.push([target, 0]); }
    }
  }
  visited.clear();
  const components = [];
  const owner = new Map();
  for (const root of order.reverse()) {
    if (visited.has(root)) continue;
    const members = [];
    const pending = [root];
    visited.add(root);
    while (pending.length) {
      const current = pending.pop();
      members.push(current);
      for (const target of reverse.get(current)) {
        if (!visited.has(target)) { visited.add(target); pending.push(target); }
      }
    }
    const component = { modules: members.sort(), edges: [] };
    components.push(component);
    for (const member of members) owner.set(member, component);
  }
  for (const { source, target } of edges) {
    if (owner.get(source) === owner.get(target)) owner.get(source).edges.push([source, target]);
  }
  return components.filter((entry) => entry.modules.length > 1 || entry.edges.length > 0)
    .map((entry) => ({ ...entry, edges: [...new Set(entry.edges.map((edge) => JSON.stringify(edge)))].sort().map((edge) => JSON.parse(edge)) }))
    .sort((left, right) => left.modules[0].localeCompare(right.modules[0]));
}
