export interface RegionOverlapEntry<ID> {
  readonly value: {
    readonly id: ID;
    readonly row: number;
    readonly column: number;
  };
  readonly index: number;
  readonly rowEnd: number;
  readonly columnEnd: number;
}

export interface RegionOverlapWork {
  binarySearchSteps: number;
  treeSteps: number;
  rowEvictions: number;
  candidateChecks: number;
  insertions: number;
}

export function createRegionOverlapWork(): RegionOverlapWork {
  return {
    binarySearchSteps: 0,
    treeSteps: 0,
    rowEvictions: 0,
    candidateChecks: 0,
    insertions: 0,
  };
}

export function findRegionOverlap<ID, Region extends RegionOverlapEntry<ID>>(
  sorted: readonly Region[],
  work?: RegionOverlapWork,
): readonly [Region, Region] | null {
  if (sorted.length < 2) return null;

  const columnStarts = sorted.map((region) => region.value.column).sort((left, right) => left - right);
  let uniqueCount = 0;
  for (const column of columnStarts) {
    if (uniqueCount === 0 || columnStarts[uniqueCount - 1] !== column) {
      columnStarts[uniqueCount] = column;
      uniqueCount += 1;
    }
  }
  columnStarts.length = uniqueCount;

  const ending = [...sorted].sort((left, right) => (
    left.rowEnd - right.rowEnd
    || left.value.row - right.value.row
    || left.value.column - right.value.column
    || left.index - right.index
  ));
  let treeBase = 1;
  while (treeBase < columnStarts.length) treeBase *= 2;
  const activeTree = new Float64Array(treeBase * 2);
  const activeOwners = new Array<Region | undefined>(columnStarts.length);
  let endingIndex = 0;

  for (const region of sorted) {
    while (endingIndex < ending.length && ending[endingIndex]!.rowEnd <= region.value.row) {
      const expired = ending[endingIndex]!;
      endingIndex += 1;
      const rank = lowerBound(columnStarts, expired.value.column, work);
      if (activeOwners[rank] !== expired) continue;
      activeOwners[rank] = undefined;
      setActive(activeTree, treeBase, rank, false, work);
      if (work !== undefined) work.rowEvictions += 1;
    }

    const beforeEnd = lowerBound(columnStarts, region.columnEnd, work);
    const candidateRank = maxActiveBefore(activeTree, treeBase, beforeEnd, work);
    if (candidateRank !== null) {
      const other = activeOwners[candidateRank];
      if (other !== undefined) {
        if (work !== undefined) work.candidateChecks += 1;
        if (other.columnEnd > region.value.column) return Object.freeze([other, region] as const);
      }
    }

    const startRank = lowerBound(columnStarts, region.value.column, work);
    activeOwners[startRank] = region;
    setActive(activeTree, treeBase, startRank, true, work);
    if (work !== undefined) work.insertions += 1;
  }
  return null;
}

function lowerBound(values: readonly number[], target: number, work?: RegionOverlapWork): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    if (work !== undefined) work.binarySearchSteps += 1;
    const middle = low + Math.floor((high - low) / 2);
    if (values[middle]! < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function setActive(
  tree: Float64Array,
  base: number,
  rank: number,
  active: boolean,
  work?: RegionOverlapWork,
): void {
  let index = base + rank;
  tree[index] = active ? rank + 1 : 0;
  while (index > 1) {
    if (work !== undefined) work.treeSteps += 1;
    index = Math.floor(index / 2);
    tree[index] = Math.max(tree[index * 2]!, tree[index * 2 + 1]!);
  }
}

function maxActiveBefore(
  tree: Float64Array,
  base: number,
  endExclusive: number,
  work?: RegionOverlapWork,
): number | null {
  let left = base;
  let right = base + endExclusive;
  let maximum = 0;
  while (left < right) {
    if (work !== undefined) work.treeSteps += 1;
    if (left % 2 === 1) {
      maximum = Math.max(maximum, tree[left]!);
      left += 1;
    }
    if (right % 2 === 1) {
      right -= 1;
      maximum = Math.max(maximum, tree[right]!);
    }
    left = Math.floor(left / 2);
    right = Math.floor(right / 2);
  }
  return maximum === 0 ? null : maximum - 1;
}
