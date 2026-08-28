import { performance } from 'node:perf_hooks';

let sink = 0;
const metrics = [];
const ids = Array.from({ length: 100_000 }, (_, index) => index);

function measure(family, candidate, input, operation, metadata) {
  for (let warmup = 0; warmup < 2; warmup += 1) sink ^= operation();
  const calibrationStarted = performance.now();
  sink ^= operation();
  const calibrationNanos = Math.max(1, (performance.now() - calibrationStarted) * 1_000_000);
  const repetitions = Math.max(1, Math.min(512, Math.ceil(2_000_000 / calibrationNanos)));
  const samples = [];
  for (let sample = 0; sample < 5; sample += 1) {
    globalThis.gc?.();
    const started = performance.now();
    for (let repetition = 0; repetition < repetitions; repetition += 1) sink ^= operation();
    samples.push((performance.now() - started) * 1_000_000 / repetitions);
  }
  samples.sort((left, right) => left - right);
  globalThis.gc?.();
  const heapBefore = process.memoryUsage().heapUsed;
  sink ^= operation();
  const heapDeltaBytes = Math.max(0, process.memoryUsage().heapUsed - heapBefore);
  metrics.push({
    id: `${family}:${candidate}:${Object.values(input).join('-')}`,
    family,
    candidate,
    input,
    nanos: samples[2],
    work: metadata.work,
    allocationUnits: metadata.allocationUnits,
    retainedBytes: metadata.retainedBytes,
    heapDeltaBytes,
    sourceBytes: operation.toString().length,
  });
}

function lowerBound(values, target) {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (values[middle] < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

for (const density of [0.001, 0.01, 0.0625, 0.5]) {
  const selected = ids.slice(0, Math.floor(ids.length * density));
  measure('selection', 'sorted-sparse-vector', { n: ids.length, density }, () => {
    const next = selected.slice();
    const target = 75_001;
    const index = lowerBound(next, target);
    if (next[index] === target) next.splice(index, 1); else next.splice(index, 0, target);
    return next.length;
  }, { work: selected.length, allocationUnits: selected.length + 1, retainedBytes: selected.length * 8 });
  measure('selection', 'dense-bitset', { n: ids.length, density }, () => {
    const bits = new Uint32Array(Math.ceil(ids.length / 32));
    for (const id of selected) bits[id >>> 5] |= 1 << (id & 31);
    const next = bits.slice();
    next[75_001 >>> 5] ^= 1 << (75_001 & 31);
    return next[0] ^ next.at(-1);
  }, { work: selected.length + Math.ceil(ids.length / 32), allocationUnits: 2, retainedBytes: Math.ceil(ids.length / 8) });
  measure('selection', 'persistent-hash-set', { n: ids.length, density }, () => {
    const next = new Set(selected);
    if (next.has(75_001)) next.delete(75_001); else next.add(75_001);
    return next.size;
  }, { work: selected.length, allocationUnits: selected.length + 1, retainedBytes: selected.length * 32 });
}

for (const depth of [1, 8, 32, 64]) for (const reads of [4, 256]) {
  const base = ids;
  const blockSize = 256;
  const baseBlocks = Array.from({ length: Math.ceil(base.length / blockSize) }, (_, index) => base.slice(index * blockSize, (index + 1) * blockSize));
  const patches = Array.from({ length: depth }, (_, index) => [index * 997 % base.length, -index - 1]);
  measure('sequence', 'flat-rebuild', { n: base.length, depth, reads }, () => {
    let value = base;
    for (const [index, item] of patches) { value = value.slice(); value[index] = item; }
    let total = 0;
    for (let index = 0; index < reads; index += 1) total += value[index * 389 % value.length];
    return total;
  }, { work: base.length * depth + reads, allocationUnits: base.length * depth, retainedBytes: base.length * 8 });
  measure('sequence', 'adaptive-flat-overlay', { n: base.length, depth, reads }, () => {
    let total = 0;
    for (let read = 0; read < reads; read += 1) {
      const target = read * 389 % base.length;
      let value = base[target];
      for (let index = patches.length - 1; index >= 0; index -= 1) if (patches[index][0] === target) { value = patches[index][1]; break; }
      total += value;
    }
    return total;
  }, { work: depth + reads * depth, allocationUnits: depth * 2, retainedBytes: base.length * 8 + depth * 16 });
  measure('sequence', 'chunked-piece-table', { n: base.length, depth, reads }, () => {
    const blocks = baseBlocks.slice();
    const copied = new Set();
    for (const [index, item] of patches) { const block = index >>> 8; if (!copied.has(block)) { blocks[block] = blocks[block].slice(); copied.add(block); } blocks[block][index & 255] = item; }
    let total = 0;
    for (let index = 0; index < reads; index += 1) { const at = index * 389 % base.length; total += blocks[at >>> 8][at & 255]; }
    return total;
  }, { work: baseBlocks.length + Math.min(depth, baseBlocks.length) * 256 + reads, allocationUnits: baseBlocks.length + Math.min(depth, baseBlocks.length) * 256, retainedBytes: base.length * 8 + baseBlocks.length * 8 });
}

for (const occupancy of [0.01, 0.05, 0.5, 1]) {
  const rows = 316;
  const columns = 316;
  const occupied = Math.floor(rows * columns * occupancy);
  measure('grid', 'dense-flat', { cells: rows * columns, occupancy }, () => {
    const cells = new Int32Array(rows * columns); cells.fill(-1);
    for (let index = 0; index < occupied; index += 1) cells[(index * 97) % cells.length] = index;
    let total = 0; for (let index = 0; index < 1_024; index += 1) total += cells[(index * 193) % cells.length];
    return total;
  }, { work: rows * columns + occupied + 1_024, allocationUnits: 1, retainedBytes: rows * columns * 4 });
  measure('grid', 'csr-csc', { cells: rows * columns, occupancy }, () => {
    const byRow = Array.from({ length: rows }, () => []);
    for (let index = 0; index < occupied; index += 1) { const at = (index * 97) % (rows * columns); byRow[Math.floor(at / columns)].push([at % columns, index]); }
    for (const row of byRow) row.sort((left, right) => left[0] - right[0]);
    let total = 0; for (let index = 0; index < 1_024; index += 1) { const at = (index * 193) % (rows * columns); const row = byRow[Math.floor(at / columns)]; const column = at % columns; let low = 0; let high = row.length; while (low < high) { const middle = (low + high) >>> 1; if (row[middle][0] < column) low = middle + 1; else high = middle; } total += row[low]?.[0] === column ? row[low][1] : -1; }
    return total;
  }, { work: occupied * Math.log2(Math.max(2, occupied / rows)) + 1_024 * Math.log2(columns), allocationUnits: occupied * 2 + rows, retainedBytes: occupied * 24 + rows * 8 });
}

for (const shape of ['balanced', 'chain']) {
  const reads = 64;
  const treeParents = Int32Array.from({ length: 20_000 }, (_, index) => index === 0 ? -1 : shape === 'balanced' ? Math.floor((index - 1) / 2) : index - 1);
  measure('tree', 'repeated-dfs', { n: treeParents.length, reads, shape }, () => {
    let total = 0; for (let repeat = 0; repeat < reads; repeat += 1) { const preorder = new Int32Array(treeParents.length); for (let index = 0; index < treeParents.length; index += 1) preorder[index] = index; total += preorder[repeat]; } return total;
  }, { work: treeParents.length * reads, allocationUnits: treeParents.length * reads, retainedBytes: treeParents.byteLength });
  measure('tree', 'lazy-euler-cache', { n: treeParents.length, reads, shape }, () => {
    const preorder = new Int32Array(treeParents.length); for (let index = 0; index < preorder.length; index += 1) preorder[index] = index;
    let total = 0; for (let repeat = 0; repeat < reads; repeat += 1) total += preorder[repeat]; return total;
  }, { work: treeParents.length + reads, allocationUnits: 1, retainedBytes: treeParents.byteLength * 2 });
}

const text = `${'a'.repeat(99_998)}😀`;
measure('text', 'full-utf16-scan', { codeUnits: text.length }, () => { let valid = 1; for (let index = 0; index < text.length; index += 1) { const code = text.charCodeAt(index); if (code >= 0xd800 && code <= 0xdbff) index += 1; else if (code >= 0xdc00 && code <= 0xdfff) valid = 0; } return valid; }, { work: text.length, allocationUnits: 0, retainedBytes: 0 });
measure('text', 'local-boundary-proof', { codeUnits: text.length }, () => text.charCodeAt(49_999) ^ text.charCodeAt(50_000), { work: 2, allocationUnits: 0, retainedBytes: 0 });

measure('reorder', 'rebuild-and-reindex', { n: ids.length }, () => { const next = ids.slice(); const from = next.indexOf(75_000); const moved = next.splice(from, 1); next.splice(100, 0, moved[0]); const index = new Map(next.map((value, at) => [value, at])); return index.size; }, { work: ids.length * 3, allocationUnits: ids.length * 3, retainedBytes: ids.length * 40 });
measure('reorder', 'retained-index-one-materialization', { n: ids.length }, () => { const next = ids.slice(); const moved = next.splice(75_000, 1); next.splice(100, 0, moved[0]); return next[100]; }, { work: ids.length, allocationUnits: ids.length, retainedBytes: ids.length * 8 });

function gcd(left, right) { while (right !== 0n) [left, right] = [right, left % right]; return left < 0n ? -left : left; }
const ratios = Array.from({ length: 2_048 }, (_, index) => [BigInt(index * 97 + 2), BigInt(index * 31 + 3)]);
measure('exact-ratio', 'euclidean-reduce', { operands: ratios.length }, () => { let total = 0n; for (const [a, b] of ratios) total ^= gcd(a, b); return Number(total); }, { work: ratios.length * 12, allocationUnits: 0, retainedBytes: 0 });
measure('exact-ratio', 'memoized-gcd-and-powers', { operands: ratios.length }, () => { const cache = new Map(); let total = 0n; for (const [a, b] of ratios) { const key = `${a}/${b}`; let value = cache.get(key); if (value === undefined) { value = gcd(a, b); cache.set(key, value); } total ^= value; } return Number(total); }, { work: ratios.length * 13, allocationUnits: ratios.length, retainedBytes: ratios.length * 72 });

const spans = Array.from({ length: 10_000 }, (_, index) => [index * 3, index * 3 + 1]);
measure('index-span-set', 'flat-normalized-vector', { spans: spans.length }, () => { let total = 0; for (let query = 0; query < 1_024; query += 1) { const target = query * 29; let low = 0; let high = spans.length; while (low < high) { const middle = (low + high) >>> 1; if (spans[middle][1] <= target) low = middle + 1; else high = middle; } total += spans[low]?.[0] <= target ? 1 : 0; } return total; }, { work: 1_024 * Math.log2(spans.length), allocationUnits: spans.length, retainedBytes: spans.length * 16 });
measure('index-span-set', 'interval-tree', { spans: spans.length }, () => { const nodes = spans.map(([start, end]) => ({ start, end, max: end })); let total = 0; for (let query = 0; query < 1_024; query += 1) { const target = query * 29; let low = 0; let high = nodes.length; while (low < high) { const middle = (low + high) >>> 1; if (nodes[middle].end <= target) low = middle + 1; else high = middle; } total += nodes[low]?.start <= target ? 1 : 0; } return total; }, { work: spans.length + 1_024 * Math.log2(spans.length), allocationUnits: spans.length, retainedBytes: spans.length * 48 });

for (const exceptionCount of [4_096, 50_000]) {
  const exceptions = Array.from({ length: exceptionCount }, (_, index) => `id-${index.toString().padStart(6, '0')}`);
  const exceptionSet = new Set(exceptions);
  const lookups = exceptionCount * 8;
  measure('selection-expression', 'set-plus-vector', { exceptions: exceptions.length, lookups }, () => { let total = 0; for (let query = 0; query < lookups; query += 1) { const target = `id-${((query * 7) % 100_000).toString().padStart(6, '0')}`; total += exceptionSet.has(target) ? 1 : 0; } return total; }, { work: lookups, allocationUnits: exceptions.length + 1, retainedBytes: exceptions.length * 40 });
  measure('selection-expression', 'sorted-vector-only', { exceptions: exceptions.length, lookups }, () => { let total = 0; for (let query = 0; query < lookups; query += 1) { const target = `id-${((query * 7) % 100_000).toString().padStart(6, '0')}`; total += exceptions[lowerBound(exceptions, target)] === target ? 1 : 0; } return total; }, { work: lookups * Math.log2(exceptions.length), allocationUnits: exceptions.length, retainedBytes: exceptions.length * 8 });
}

function points(count, dimensions) { const result = new Float64Array(count * dimensions); let seed = 17; for (let index = 0; index < result.length; index += 1) { seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0; result[index] = seed / 0xffff_ffff; } return result; }
function buildKD(data, dimensions, order, depth = 0) {
  if (order.length === 0) return null;
  const axis = depth % dimensions;
  order.sort((left, right) => data[left * dimensions + axis] - data[right * dimensions + axis] || left - right);
  const middle = order.length >>> 1;
  return {
    id: order[middle],
    axis,
    left: buildKD(data, dimensions, order.slice(0, middle), depth + 1),
    right: buildKD(data, dimensions, order.slice(middle + 1), depth + 1),
  };
}
function nearestKD(node, data, dimensions, target, best) {
  if (node === null) return best;
  let distance = 0;
  for (let axis = 0; axis < dimensions; axis += 1) { const delta = data[node.id * dimensions + axis] - target[axis]; distance += delta * delta; }
  if (distance < best.distance || (distance === best.distance && node.id < best.id)) best = { id: node.id, distance };
  const delta = target[node.axis] - data[node.id * dimensions + node.axis];
  const near = delta < 0 ? node.left : node.right;
  const far = delta < 0 ? node.right : node.left;
  best = nearestKD(near, data, dimensions, target, best);
  return delta * delta <= best.distance ? nearestKD(far, data, dimensions, target, best) : best;
}
for (const count of [256, 4_096]) for (const dimensions of [2, 16]) for (const queries of [32, 512]) {
  const data = points(count, dimensions);
  measure('metric-index', 'packed-vector-scan', { count, dimensions, queries }, () => { let checksum = 0; for (let query = 0; query < queries; query += 1) { let best = Infinity; let bestID = 0; for (let item = 0; item < count; item += 1) { let distance = 0; for (let axis = 0; axis < dimensions; axis += 1) { const delta = data[item * dimensions + axis] - ((query + axis) % 31) / 31; distance += delta * delta; } if (distance < best) { best = distance; bestID = item; } } checksum ^= bestID; } return checksum; }, { work: count * dimensions * queries, allocationUnits: 1, retainedBytes: data.byteLength });
  measure('metric-index', 'balanced-kd', { count, dimensions, queries }, () => { const tree = buildKD(data, dimensions, ids.slice(0, count)); let checksum = 0; for (let query = 0; query < queries; query += 1) { const target = Array.from({ length: dimensions }, (_, axis) => ((query + axis) % 31) / 31); checksum ^= nearestKD(tree, data, dimensions, target, { id: Number.MAX_SAFE_INTEGER, distance: Infinity }).id; } return checksum; }, { work: count * Math.log2(count) * dimensions + queries * count * dimensions, allocationUnits: count * 3 + queries, retainedBytes: data.byteLength + count * 32 });
  measure('metric-index', 'spatial-hash', { count, dimensions, queries }, () => { const buckets = new Map(); for (let item = 0; item < count; item += 1) { const key = Math.floor(data[item * dimensions] * 32); const bucket = buckets.get(key); if (bucket === undefined) buckets.set(key, [item]); else bucket.push(item); } let checksum = buckets.size; for (let query = 0; query < queries; query += 1) { let best = Infinity; let bestID = 0; for (let item = 0; item < count; item += 1) { let distance = 0; for (let axis = 0; axis < dimensions; axis += 1) { const delta = data[item * dimensions + axis] - ((query + axis) % 31) / 31; distance += delta * delta; } if (distance < best) { best = distance; bestID = item; } } checksum ^= bestID; } return checksum; }, { work: count + count * dimensions * queries, allocationUnits: count + 32, retainedBytes: data.byteLength + count * 16 });
}

measure('geometry', 'immutable-object-candidates', { candidates: 12, iterations: 20_000 }, () => { let total = 0; for (let iteration = 0; iteration < 20_000; iteration += 1) { const candidates = Array.from({ length: 12 }, (_, index) => ({ x: index * 3, y: index * 5, overflow: Math.abs(6 - index) })); candidates.sort((left, right) => left.overflow - right.overflow); total += candidates[0].x; } return total; }, { work: 20_000 * 12, allocationUnits: 20_000 * 13, retainedBytes: 0 });
measure('geometry', 'scalar-bounded-scoring', { candidates: 12, iterations: 20_000 }, () => { let total = 0; for (let iteration = 0; iteration < 20_000; iteration += 1) { let best = Infinity; let bestX = 0; for (let index = 0; index < 12; index += 1) { const overflow = Math.abs(6 - index); if (overflow < best) { best = overflow; bestX = index * 3; } } total += bestX; } return total; }, { work: 20_000 * 12, allocationUnits: 0, retainedBytes: 0 });

const records = Array.from({ length: 20_000 }, (_, index) => ({ id: index, value: (index * 97) % 1_003 }));
const resolveTable = () => records.filter((record) => record.value % 3 === 0).sort((left, right) => left.value - right.value);
measure('tabular-cache', 'repeat-resolution', { records: records.length, reads: 8 }, () => { let total = 0; for (let index = 0; index < 8; index += 1) total += resolveTable().length; return total; }, { work: records.length * Math.log2(records.length) * 8, allocationUnits: records.length * 8, retainedBytes: 0 });
measure('tabular-cache', 'single-current', { records: records.length, reads: 8 }, () => { const current = resolveTable(); let total = 0; for (let index = 0; index < 8; index += 1) total += current.length; return total; }, { work: records.length * Math.log2(records.length) + 8, allocationUnits: records.length, retainedBytes: records.length * 8 });
measure('tabular-cache', 'multi-entry-lru', { records: records.length, reads: 8 }, () => { const cache = new Map(); let total = 0; for (let index = 0; index < 8; index += 1) { const key = index % 2; let value = cache.get(key); if (value === undefined) { value = resolveTable(); cache.set(key, value); } total += value.length; } return total; }, { work: records.length * Math.log2(records.length) * 2 + 8, allocationUnits: records.length * 2, retainedBytes: records.length * 16 });
measure('tabular-cache', 'repeat-resolution', { records: records.length, reads: 8, generations: 8 }, () => { let total = 0; for (let generation = 0; generation < 8; generation += 1) total += resolveTable().length + generation; return total; }, { work: records.length * Math.log2(records.length) * 8, allocationUnits: records.length * 8, retainedBytes: 0 });
measure('tabular-cache', 'single-current', { records: records.length, reads: 8, generations: 8 }, () => { let total = 0; let current; for (let generation = 0; generation < 8; generation += 1) { current = resolveTable(); total += current.length + generation; } return total; }, { work: records.length * Math.log2(records.length) * 8, allocationUnits: records.length * 8, retainedBytes: records.length * 8 });
measure('tabular-cache', 'multi-entry-lru', { records: records.length, reads: 8, generations: 8 }, () => { const cache = new Map(); let total = 0; for (let generation = 0; generation < 8; generation += 1) { const current = resolveTable(); cache.set(generation, current); total += current.length + generation; } return total + cache.size; }, { work: records.length * Math.log2(records.length) * 8, allocationUnits: records.length * 8, retainedBytes: records.length * 64 });

for (const family of ['virtual-spatial', 'virtual-track']) for (const changed of [1, 8, 64, 12_500]) {
  const n = 100_000; const values = Float64Array.from({ length: n }, (_, index) => index + 1);
  const queries = 64;
  const blockSize = 64;
  const baseBlocks = Array.from({ length: Math.ceil(n / blockSize) }, (_, index) => values.slice(index * blockSize, (index + 1) * blockSize));
  measure(family, 'packed-full-rebuild', { n, changed, queries }, () => { const next = values.slice(); for (let index = 0; index < changed; index += 1) next[index * 997 % n] += 1; for (let index = 1; index < next.length; index += 1) next[index] += next[index - 1]; let total = 0; for (let query = 0; query < queries; query += 1) total += next[query * 1543 % n]; return Math.floor(total); }, { work: n + changed + queries, allocationUnits: 1, retainedBytes: values.byteLength });
  measure(family, 'blocked-path-copy', { n, changed, queries }, () => { const patches = new Map(); for (let index = 0; index < changed; index += 1) { const at = index * 997 % n; const block = at >>> 6; let copy = patches.get(block); if (copy === undefined) { copy = baseBlocks[block].slice(); patches.set(block, copy); } copy[at & 63] += 1; } let total = 0; for (let query = 0; query < queries; query += 1) { const at = query * 1543 % n; total += (patches.get(at >>> 6) ?? baseBlocks[at >>> 6])[at & 63]; } return Math.floor(total); }, { work: Math.min(changed, Math.ceil(n / 64)) * 64 + changed + queries, allocationUnits: Math.min(changed, Math.ceil(n / 64)) * 2, retainedBytes: values.byteLength + Math.min(changed, Math.ceil(n / 64)) * 520 });
  measure(family, 'per-item-persistent-tree', { n, changed, queries }, () => { const nodes = values.slice(0, 10_000).map((value, index) => ({ value, left: index * 2 + 1, right: index * 2 + 2 })); for (let index = 0; index < changed; index += 1) { const at = index % nodes.length; nodes[at] = { ...nodes[at], value: nodes[at].value + 1 }; } let total = 0; for (let query = 0; query < queries; query += 1) total += nodes[query * 97 % nodes.length].value; return Math.floor(total); }, { work: 10_000 + changed * Math.log2(n) + queries * Math.log2(n), allocationUnits: 10_000 + changed * Math.log2(n), retainedBytes: n * 40 });
}

const colorCount = 50_000;
measure('color-value', 'immutable-boundary-scalar-internal', { colors: colorCount }, () => { let total = 0; for (let index = 0; index < colorCount; index += 1) { const red = (index % 255) / 255; const linear = red <= 0.04045 ? red / 12.92 : ((red + 0.055) / 1.055) ** 2.4; total += linear; } return Math.floor(total); }, { work: colorCount, allocationUnits: 0, retainedBytes: 0 });
measure('color-value', 'mutable-class-plugin', { colors: colorCount }, () => { class Color { constructor(red) { this.red = red; } linear() { return this.red <= 0.04045 ? this.red / 12.92 : ((this.red + 0.055) / 1.055) ** 2.4; } } let total = 0; for (let index = 0; index < colorCount; index += 1) total += new Color((index % 255) / 255).linear(); return Math.floor(total); }, { work: colorCount, allocationUnits: colorCount, retainedBytes: 0 });
measure('color-value', 'immutable-object-every-step', { colors: colorCount }, () => { let total = 0; for (let index = 0; index < colorCount; index += 1) { const input = Object.freeze({ red: (index % 255) / 255 }); const output = Object.freeze({ red: input.red <= 0.04045 ? input.red / 12.92 : ((input.red + 0.055) / 1.055) ** 2.4 }); total += output.red; } return Math.floor(total); }, { work: colorCount, allocationUnits: colorCount * 2, retainedBytes: 0 });

for (const [candidate, iterations] of [['reject', 1], ['clip', 1], ['fixed-12-chroma', 12]]) measure('color-gamut', candidate, { colors: 20_000, iterations }, () => { let total = 0; for (let color = 0; color < 20_000; color += 1) { let chroma = 0.4; for (let iteration = 0; iteration < iterations; iteration += 1) { const inGamut = chroma < 0.22; total += inGamut ? 1 : 0; if (!inGamut && candidate === 'fixed-12-chroma') chroma *= 0.75; else if (!inGamut && candidate === 'clip') chroma = 0.22; } } return total; }, { work: 20_000 * iterations, allocationUnits: 0, retainedBytes: 0 });

process.stdout.write(`${JSON.stringify({ metrics, sink })}\n`);
