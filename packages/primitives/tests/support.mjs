import assert from 'node:assert/strict';

export function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? undefined : JSON.stringify(result.error));
  return result.value;
}

export function* powerset(values) {
  const items = [...values];
  const total = 2 ** items.length;
  for (let mask = 0; mask < total; mask += 1) {
    const result = [];
    for (let index = 0; index < items.length; index += 1) {
      if ((mask & 2 ** index) !== 0) result.push(items[index]);
    }
    yield result;
  }
}

export function* permutations(values) {
  const items = [...values];
  if (items.length === 0) {
    yield [];
    return;
  }
  function* visit(prefix, remaining) {
    if (remaining.length === 0) {
      yield prefix;
      return;
    }
    for (let index = 0; index < remaining.length; index += 1) {
      yield* visit(
        [...prefix, remaining[index]],
        [...remaining.slice(0, index), ...remaining.slice(index + 1)],
      );
    }
  }
  yield* visit([], items);
}

export function canonicalIDs(count, prefix = 'i') {
  return Array.from({ length: count }, (_, index) => `${prefix}${index}`);
}

export function deepNormalize(value) {
  return JSON.parse(
    JSON.stringify(value, (_, item) => (typeof item === 'bigint' ? `${item}n` : item)),
  );
}

export function createRng(seed = 0x5ec71e) {
  let state = seed >>> 0;
  return {
    next() {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
    int(min, maxExclusive) {
      return min + Math.floor(this.next() * (maxExclusive - min));
    },
    bool() {
      return this.next() < 0.5;
    },
    pick(values) {
      return values[this.int(0, values.length)];
    },
    shuffle(values) {
      const result = [...values];
      for (let index = result.length - 1; index > 0; index -= 1) {
        const target = this.int(0, index + 1);
        [result[index], result[target]] = [result[target], result[index]];
      }
      return result;
    },
  };
}

export function enumerateOrderedForests(count) {
  if (count === 0) return [[]];
  const parentChoices = Array.from({ length: count }, (_, node) => [null, ...Array.from({ length: node }, (_, index) => index)]);
  const parentAssignments = cartesian(parentChoices);
  const result = [];
  for (const parents of parentAssignments) {
    const groups = new Map([[null, []]]);
    for (let node = 0; node < count; node += 1) groups.set(node, []);
    for (let node = 0; node < count; node += 1) groups.get(parents[node]).push(node);
    const owners = [null, ...Array.from({ length: count }, (_, index) => index)];
    const orderChoices = owners.map((owner) => [...permutations(groups.get(owner))]);
    for (const selected of cartesian(orderChoices)) {
      const rank = new Map();
      for (let ownerIndex = 0; ownerIndex < owners.length; ownerIndex += 1) {
        const owner = owners[ownerIndex];
        selected[ownerIndex].forEach((node, index) => rank.set(`${owner}:${node}`, index));
      }
      const nodes = Array.from({ length: count }, (_, id) => ({ id, parentID: parents[id] }));
      nodes.sort((left, right) => {
        const leftParent = left.parentID;
        const rightParent = right.parentID;
        if (leftParent === rightParent) {
          return rank.get(`${leftParent}:${left.id}`) - rank.get(`${rightParent}:${right.id}`);
        }
        // Construction source order only needs to preserve sibling/root order;
        // this canonical topological order keeps parents available conceptually.
        return left.id - right.id;
      });
      // Source order cannot independently encode sibling order if globally sorted by ID.
      // Produce preorder according to selected sibling orders instead.
      const children = new Map(owners.map((owner, index) => [owner, selected[index]]));
      const ordered = [];
      const visit = (id) => {
        ordered.push({ id, parentID: parents[id] });
        for (const child of children.get(id)) visit(child);
      };
      for (const root of children.get(null)) visit(root);
      result.push(ordered);
    }
  }
  return result;
}

function cartesian(groups) {
  let result = [[]];
  for (const group of groups) {
    const next = [];
    for (const prefix of result) {
      for (const value of group) next.push([...prefix, value]);
    }
    result = next;
  }
  return result;
}
