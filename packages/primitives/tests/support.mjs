export { unwrap } from '../.verification-dist/result.js';

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

export function selectionObservation(state) {
  return { selected: state.selected, anchor: state.anchor };
}

export function listboxResultObservation(result) {
  return result.ok
    ? {
        ok: true,
        current: result.value.state.cursor.current,
        selected: result.value.state.selection.selected,
        anchor: result.value.state.selection.anchor,
        commands: result.value.commands,
      }
    : resultObservationError(result);
}

export function referenceListboxResultObservation(result) {
  return result.ok
    ? {
        ok: true,
        current: result.value.state.cursor.current,
        selected: result.value.state.selection.selected,
        anchor: result.value.state.selection.anchor,
        commands: result.value.commands,
      }
    : referenceResultObservationError(result);
}

export function sliderResultObservation(result) {
  return result.ok
    ? { ok: true, tick: result.value.state.tick, commands: result.value.commands }
    : resultObservationError(result);
}

export function referenceSliderResultObservation(result) {
  return result.ok
    ? { ok: true, tick: result.value.state.tick, commands: result.value.commands }
    : referenceResultObservationError(result);
}

export function calendarResultObservation(result) {
  return result.ok
    ? selectionUpdateObservation(result.value)
    : resultObservationError(result);
}

export function referenceCalendarResultObservation(result) {
  return result.ok
    ? selectionUpdateObservation(result.value)
    : referenceResultObservationError(result);
}

export function treeViewResultObservation(result) {
  return result.ok
    ? {
        ok: true,
        expanded: result.value.state.expansion.ids,
        current: result.value.state.cursor.current,
        selected: result.value.state.selection.selected,
        anchor: result.value.state.selection.anchor,
        commands: result.value.commands,
      }
    : resultObservationError(result);
}

export function referenceTreeViewResultObservation(result) {
  return result.ok
    ? {
        ok: true,
        expanded: result.value.state.expansion.ids,
        current: result.value.state.cursor.current,
        selected: result.value.state.selection.selected,
        anchor: result.value.state.selection.anchor,
        commands: result.value.commands,
      }
    : referenceResultObservationError(result);
}

export function comboboxResultObservation(result) {
  return result.ok
    ? { ok: true, ...comboboxStateObservation(result.value.state), commands: result.value.commands }
    : resultObservationError(result);
}

export function referenceComboboxResultObservation(result) {
  return result.ok
    ? { ok: true, ...comboboxStateObservation(result.value.state), commands: result.value.commands }
    : referenceResultObservationError(result);
}

export function comboboxStateObservation(state) {
  return {
    text: textObservation(state.text),
    popupOpen: state.popupOpen,
    current: state.cursor.current,
    selected: state.selection.selected,
    anchor: state.selection.anchor,
  };
}

export function textObservation(state) {
  return {
    text: state.snapshot.text,
    anchor: state.snapshot.selection.anchorCodeUnitOffset,
    focus: state.snapshot.selection.focusCodeUnitOffset,
    composition: state.composition === null
      ? null
      : {
          baselineText: state.composition.baseline.text,
          baselineAnchor: state.composition.baseline.selection.anchorCodeUnitOffset,
          baselineFocus: state.composition.baseline.selection.focusCodeUnitOffset,
          start: state.composition.startCodeUnitOffset,
          end: state.composition.endCodeUnitOffset,
          composingText: state.composition.composingText,
        },
  };
}

export function randomText(rng, maxLength) {
  const scalars = ['a', '가', '😀', '\u0301', '\u200d', '🇰', '🇷'];
  return Array.from({ length: rng.int(0, maxLength + 1) }, () => rng.pick(scalars)).join('');
}

export function decimal(integer, scale) {
  const negative = integer < 0;
  const digits = Math.abs(integer).toString().padStart(scale + 1, '0');
  if (scale === 0) return `${negative ? '-' : ''}${digits}`;
  const split = digits.length - scale;
  return `${negative ? '-' : ''}${digits.slice(0, split)}.${digits.slice(split)}`;
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

function selectionUpdateObservation(update) {
  return {
    ok: true,
    current: update.state.cursor.current,
    selected: update.state.selection.selected,
    anchor: update.state.selection.anchor,
    commands: update.commands,
  };
}

function resultObservationError(result) {
  return { ok: false, errorClass: result.error.class, errorCode: result.error.code };
}

function referenceResultObservationError(result) {
  return { ok: false, errorClass: result.errorClass, errorCode: result.errorCode };
}
