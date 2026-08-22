from __future__ import annotations

from dataclasses import dataclass
from fractions import Fraction
from itertools import combinations, permutations, product
from collections import defaultdict, deque
from typing import Callable, Iterable, Optional, Sequence as TypingSequence
import json
import unicodedata
import random


# -----------------------------
# Shared helpers
# -----------------------------

def powerset(items):
    items = tuple(items)
    for mask in range(1 << len(items)):
        yield frozenset(items[i] for i in range(len(items)) if mask & (1 << i))


def sign(value: int) -> int:
    return (value > 0) - (value < 0)


# -----------------------------
# Sequence theory
# -----------------------------

@dataclass(frozen=True)
class SequenceModel:
    ids: tuple[int, ...]

    def __post_init__(self):
        assert len(set(self.ids)) == len(self.ids)

    @property
    def size(self) -> int:
        return len(self.ids)

    def at(self, index: int) -> Optional[int]:
        return self.ids[index] if 0 <= index < self.size else None

    def index_of(self, identity: int) -> Optional[int]:
        try:
            return self.ids.index(identity)
        except ValueError:
            return None

    def compare(self, left: int, right: int) -> Optional[int]:
        li = self.index_of(left)
        ri = self.index_of(right)
        if li is None or ri is None:
            return None
        return sign(li - ri)

    def projection(self, predicate: Callable[[int], bool]) -> "SequenceModel":
        return SequenceModel(tuple(identity for identity in self.ids if predicate(identity)))


def sequence_move(
    model: SequenceModel,
    current: int,
    direction: int,
    eligible: frozenset[int],
    boundary: str,
) -> Optional[int]:
    assert direction in (-1, 1)
    assert boundary in ("stop", "wrap")
    index = model.index_of(current)
    if index is None:
        return None

    n = model.size
    offsets = list(range(index + direction, n if direction > 0 else -1, direction))
    if boundary == "wrap":
        offsets += list(range(0 if direction > 0 else n - 1, index, direction))

    for candidate_index in offsets:
        candidate = model.ids[candidate_index]
        if candidate in eligible:
            return candidate
    return None


def verify_sequence():
    inverse_models = 0
    embedding_models = 0
    movement_cases = 0
    projection_cases = 0

    # Identity-renaming and inverse laws across all permutations up to n=7.
    for n in range(8):
        for ids in permutations(range(n)):
            model = SequenceModel(ids)
            inverse_models += 1
            assert model.size == n
            for index, identity in enumerate(ids):
                assert model.at(index) == identity
                assert model.index_of(identity) == index
                assert model.compare(identity, identity) == 0
            assert model.at(-1) is None
            assert model.at(n) is None
            assert model.index_of(n + 100) is None

            # One-row grid and flat-tree embeddings preserve the sequence exactly.
            grid = {(0, i): identity for i, identity in enumerate(ids)}
            roundtrip_grid = tuple(grid[(0, i)] for i in range(n))
            roots = ids
            roundtrip_tree = tuple(roots)
            assert roundtrip_grid == ids
            assert roundtrip_tree == ids
            embedding_models += 1

    # Movement, policy separation, and projection laws under symmetry-reduced IDs.
    for n in range(9):
        model = SequenceModel(tuple(range(n)))
        universe = tuple(range(n))
        for eligible in powerset(universe):
            projected = model.projection(lambda identity: identity in eligible)
            assert projected.ids == tuple(identity for identity in universe if identity in eligible)
            assert projected.projection(lambda _: True) == projected
            projection_cases += 1

            for current in universe:
                for direction in (-1, 1):
                    for boundary in ("stop", "wrap"):
                        result = sequence_move(model, current, direction, eligible, boundary)
                        movement_cases += 1
                        if result is not None:
                            assert result in eligible
                            assert result != current
                            # Independent oracle: enumerate candidate positions in semantic order.
                            i = current
                            candidates = []
                            if direction > 0:
                                candidates.extend(universe[i + 1 :])
                                if boundary == "wrap":
                                    candidates.extend(universe[:i])
                            else:
                                candidates.extend(reversed(universe[:i]))
                                if boundary == "wrap":
                                    candidates.extend(reversed(universe[i + 1 :]))
                            expected = next((x for x in candidates if x in eligible), None)
                            assert result == expected
                        else:
                            candidates = [x for x in universe if x != current and x in eligible]
                            if boundary == "wrap":
                                assert not candidates

                        if boundary == "stop" and current in eligible and result is not None:
                            inverse = sequence_move(model, result, -direction, eligible, "stop")
                            assert inverse == current

    return {
        "inverseModels": inverse_models,
        "embeddingModels": embedding_models,
        "movementCases": movement_cases,
        "projectionCases": projection_cases,
    }


# -----------------------------
# Range theory
# -----------------------------

@dataclass(frozen=True)
class RangeModel:
    origin: Fraction
    step: Fraction
    count: int  # highest tick; cardinality is count + 1

    def __post_init__(self):
        assert self.step > 0
        assert self.count >= 0

    @property
    def lower(self) -> Fraction:
        return self.origin

    @property
    def upper(self) -> Fraction:
        return self.origin + self.step * self.count

    def value_at(self, tick: int) -> Optional[Fraction]:
        if 0 <= tick <= self.count:
            return self.origin + self.step * tick
        return None

    def tick_of(self, value: Fraction) -> Optional[int]:
        q = (value - self.origin) / self.step
        if q.denominator == 1 and 0 <= q.numerator <= self.count:
            return q.numerator
        return None

    def clamp(self, value: Fraction) -> Fraction:
        return min(max(value, self.lower), self.upper)

    def snap(self, value: Fraction, tie: str = "lower") -> Fraction:
        assert tie in ("lower", "upper", "even")
        clamped = self.clamp(value)
        q = (clamped - self.origin) / self.step
        floor_tick = q.numerator // q.denominator
        ceil_tick = min(self.count, floor_tick + (q.denominator != 1))
        floor_tick = max(0, floor_tick)
        lower_value = self.value_at(floor_tick)
        upper_value = self.value_at(ceil_tick)
        assert lower_value is not None and upper_value is not None
        dl = clamped - lower_value
        du = upper_value - clamped
        if dl < du:
            return lower_value
        if du < dl:
            return upper_value
        if tie == "lower":
            return lower_value
        if tie == "upper":
            return upper_value
        return self.value_at(floor_tick if floor_tick % 2 == 0 else ceil_tick)  # type: ignore[return-value]

    def ratio_of_tick(self, tick: int) -> Fraction:
        assert 0 <= tick <= self.count
        return Fraction(0) if self.count == 0 else Fraction(tick, self.count)

    def tick_from_ratio(self, ratio: Fraction, tie: str = "lower") -> int:
        ratio = min(max(ratio, Fraction(0)), Fraction(1))
        if self.count == 0:
            return 0
        q = ratio * self.count
        floor_tick = q.numerator // q.denominator
        ceil_tick = min(self.count, floor_tick + (q.denominator != 1))
        dl = q - floor_tick
        du = ceil_tick - q
        if dl < du:
            return floor_tick
        if du < dl:
            return ceil_tick
        if tie == "lower":
            return floor_tick
        if tie == "upper":
            return ceil_tick
        return floor_tick if floor_tick % 2 == 0 else ceil_tick


def verify_range():
    configurations = 0
    exact_law_cases = 0
    snap_cases = 0
    monotonic_cases = 0

    origins = sorted({Fraction(n, d) for n in range(-4, 5) for d in range(1, 5)})
    steps = sorted({Fraction(n, d) for n in range(1, 7) for d in range(1, 5)})

    for origin in origins:
        for step in steps:
            for count in range(0, 13):
                model = RangeModel(origin, step, count)
                configurations += 1
                values = [model.value_at(i) for i in range(count + 1)]
                assert all(v is not None for v in values)
                values = [v for v in values if v is not None]

                for tick, value in enumerate(values):
                    assert model.tick_of(value) == tick
                    assert model.value_at(model.tick_of(value)) == value
                    ratio = model.ratio_of_tick(tick)
                    assert model.tick_from_ratio(ratio, "lower") == tick
                    assert model.tick_from_ratio(ratio, "upper") == tick
                    assert model.tick_from_ratio(ratio, "even") == tick
                    exact_law_cases += 1

                samples = {
                    model.lower - 2 * step,
                    model.lower - step / 2,
                    model.lower,
                    model.upper,
                    model.upper + step / 2,
                    model.upper + 2 * step,
                }
                for i in range(count + 1):
                    v = model.value_at(i)
                    assert v is not None
                    samples.add(v)
                    samples.add(v + step / 2)
                    samples.add(v - step / 2)

                ordered_samples = sorted(samples)
                for sample in ordered_samples:
                    clamped = model.clamp(sample)
                    assert model.clamp(clamped) == clamped
                    assert model.lower <= clamped <= model.upper
                    for tie in ("lower", "upper", "even"):
                        snapped = model.snap(sample, tie)
                        assert model.tick_of(snapped) is not None
                        assert model.snap(snapped, tie) == snapped
                        snap_cases += 1

                for left, right in zip(ordered_samples, ordered_samples[1:]):
                    assert left <= right
                    assert model.clamp(left) <= model.clamp(right)
                    for tie in ("lower", "upper", "even"):
                        assert model.snap(left, tie) <= model.snap(right, tie)
                    monotonic_cases += 1

    # Explicit affine reduction witness: no materialization is required.
    model = RangeModel(Fraction(10), Fraction(1, 2), 1_000_000)
    assert model.value_at(999_999) == Fraction(1_000_019, 2)
    assert model.tick_of(Fraction(1_000_019, 2)) == 999_999

    return {
        "configurations": configurations,
        "exactLawCases": exact_law_cases,
        "snapCases": snap_cases,
        "monotonicCases": monotonic_cases,
    }


# -----------------------------
# Grid theory
# -----------------------------

@dataclass(frozen=True)
class GridModel:
    rows: int
    columns: int
    cell_to_id: tuple[Optional[int], ...]

    def __post_init__(self):
        assert self.rows >= 0 and self.columns >= 0
        assert len(self.cell_to_id) == self.rows * self.columns
        ids = [x for x in self.cell_to_id if x is not None]
        assert len(ids) == len(set(ids))

    def cell_at(self, row: int, column: int) -> Optional[int]:
        if not (0 <= row < self.rows and 0 <= column < self.columns):
            return None
        return self.cell_to_id[row * self.columns + column]

    def position_of(self, identity: int) -> Optional[tuple[int, int]]:
        try:
            index = self.cell_to_id.index(identity)
        except ValueError:
            return None
        return divmod(index, self.columns)

    def row_ids(self, row: int) -> tuple[int, ...]:
        if not 0 <= row < self.rows:
            return ()
        return tuple(
            identity
            for column in range(self.columns)
            if (identity := self.cell_at(row, column)) is not None
        )

    def column_ids(self, column: int) -> tuple[int, ...]:
        if not 0 <= column < self.columns:
            return ()
        return tuple(
            identity
            for row in range(self.rows)
            if (identity := self.cell_at(row, column)) is not None
        )


def grid_move(
    model: GridModel,
    current: int,
    direction: str,
    eligible: frozenset[int],
    boundary: str,
) -> Optional[int]:
    assert direction in ("left", "right", "up", "down")
    assert boundary in ("stop", "wrap-axis")
    position = model.position_of(current)
    if position is None:
        return None
    row, column = position

    if direction in ("left", "right"):
        candidates = [
            (c, model.cell_at(row, c))
            for c in range(model.columns)
            if model.cell_at(row, c) is not None
        ]
        current_axis = column
        positive = direction == "right"
    else:
        candidates = [
            (r, model.cell_at(r, column))
            for r in range(model.rows)
            if model.cell_at(r, column) is not None
        ]
        current_axis = row
        positive = direction == "down"

    forward = [pair for pair in candidates if (pair[0] > current_axis if positive else pair[0] < current_axis)]
    forward.sort(key=lambda pair: pair[0], reverse=not positive)
    ordered = forward
    if boundary == "wrap-axis":
        wrapped = [pair for pair in candidates if pair[0] != current_axis and pair not in forward]
        wrapped.sort(key=lambda pair: pair[0], reverse=not positive)
        ordered += wrapped

    for _, identity in ordered:
        assert identity is not None
        if identity in eligible:
            return identity
    return None


def verify_grid():
    models = 0
    inverse_cases = 0
    projection_cases = 0
    movement_cases = 0

    # All occupancy subsets in 0..3 by 0..3 bounding boxes, canonical ID assignment.
    for rows in range(4):
        for columns in range(4):
            cell_count = rows * columns
            for mask in range(1 << cell_count):
                next_id = 0
                cells = []
                for index in range(cell_count):
                    if mask & (1 << index):
                        cells.append(next_id)
                        next_id += 1
                    else:
                        cells.append(None)
                model = GridModel(rows, columns, tuple(cells))
                models += 1
                ids = tuple(range(next_id))

                for row in range(rows):
                    expected = tuple(
                        x for column in range(columns) if (x := model.cell_at(row, column)) is not None
                    )
                    assert model.row_ids(row) == expected
                    projection_cases += 1
                for column in range(columns):
                    expected = tuple(
                        x for row in range(rows) if (x := model.cell_at(row, column)) is not None
                    )
                    assert model.column_ids(column) == expected
                    projection_cases += 1

                for row in range(rows):
                    for column in range(columns):
                        identity = model.cell_at(row, column)
                        if identity is not None:
                            assert model.position_of(identity) == (row, column)
                            assert model.cell_at(*model.position_of(identity)) == identity
                            inverse_cases += 1

                # Exhaustive eligibility and movement is expensive for full 3x3;
                # it is exhaustive for all models with <= 6 occupied IDs and all-eligible for larger models.
                eligibilities = list(powerset(ids)) if len(ids) <= 6 else [frozenset(ids)]
                for eligible in eligibilities:
                    for current in ids:
                        for direction in ("left", "right", "up", "down"):
                            for boundary in ("stop", "wrap-axis"):
                                result = grid_move(model, current, direction, eligible, boundary)
                                movement_cases += 1
                                if result is not None:
                                    assert result in eligible
                                    assert result != current
                                if boundary == "stop" and current in eligible and result is not None:
                                    opposite = {"left": "right", "right": "left", "up": "down", "down": "up"}[direction]
                                    assert grid_move(model, result, opposite, eligible, "stop") == current

    # Countermodel: nearest directional relations do not determine absolute coordinates.
    grid_a = GridModel(1, 2, (0, 1))
    grid_b = GridModel(1, 3, (0, None, 1))
    all_ids = frozenset({0, 1})
    assert grid_move(grid_a, 0, "right", all_ids, "stop") == 1
    assert grid_move(grid_b, 0, "right", all_ids, "stop") == 1
    assert grid_a.cell_at(0, 1) == 1
    assert grid_b.cell_at(0, 1) is None
    assert grid_b.cell_at(0, 2) == 1

    return {
        "models": models,
        "inverseCases": inverse_cases,
        "projectionCases": projection_cases,
        "movementCases": movement_cases,
        "coordinateCountermodel": True,
    }


# -----------------------------
# Tree and expansion theory
# -----------------------------

@dataclass(frozen=True)
class TreeModel:
    roots: tuple[int, ...]
    children_items: tuple[tuple[int, tuple[int, ...]], ...]

    @property
    def children_map(self) -> dict[int, tuple[int, ...]]:
        return dict(self.children_items)

    @property
    def ids(self) -> tuple[int, ...]:
        result = []
        children = self.children_map

        def visit(node: int):
            result.append(node)
            for child in children.get(node, ()):
                visit(child)

        for root in self.roots:
            visit(root)
        return tuple(result)

    def parent_map(self) -> dict[int, Optional[int]]:
        result = {root: None for root in self.roots}
        for parent, children in self.children_items:
            for child in children:
                assert child not in result
                result[child] = parent
        return result

    def children_of(self, identity: int) -> tuple[int, ...]:
        return self.children_map.get(identity, ())

    def parent_of(self, identity: int) -> Optional[int]:
        return self.parent_map().get(identity)

    def depth_of(self, identity: int) -> Optional[int]:
        parent = self.parent_map()
        if identity not in parent:
            return None
        depth = 0
        current = identity
        while parent[current] is not None:
            depth += 1
            current = parent[current]  # type: ignore[assignment]
        return depth

    def preorder(self) -> tuple[int, ...]:
        return self.ids

    def visible(self, expanded: frozenset[int]) -> tuple[int, ...]:
        children = self.children_map
        output = []

        def visit(node: int):
            output.append(node)
            if node in expanded:
                for child in children.get(node, ()):
                    visit(child)

        for root in self.roots:
            visit(root)
        return tuple(output)


def enumerate_ordered_forests(n: int):
    nodes = tuple(range(n))
    if n == 0:
        yield TreeModel((), ())
        return

    # Canonical topological numbering: every non-root parent has a lower index.
    parent_choices = [(None,) + tuple(range(node)) for node in nodes]
    for parent_values in product(*parent_choices):
        groups = defaultdict(list)
        for node, parent in zip(nodes, parent_values):
            groups[parent].append(node)
        owners = [None] + list(nodes)
        orders = [list(permutations(groups[owner])) if groups[owner] else [()] for owner in owners]
        for selected in product(*orders):
            selected_map = {owner: tuple(order) for owner, order in zip(owners, selected)}
            roots = selected_map[None]
            children_items = tuple((node, selected_map[node]) for node in nodes)
            yield TreeModel(roots, children_items)


def encode_preorder_depth(tree: TreeModel) -> tuple[tuple[int, int], ...]:
    return tuple((identity, tree.depth_of(identity)) for identity in tree.preorder())  # type: ignore[arg-type]


def decode_preorder_depth(records: tuple[tuple[int, int], ...]) -> TreeModel:
    roots = []
    children = defaultdict(list)
    stack: list[int] = []
    for identity, depth in records:
        assert depth >= 0
        if depth == 0:
            roots.append(identity)
        else:
            assert depth <= len(stack)
            children[stack[depth - 1]].append(identity)
        stack = stack[:depth]
        stack.append(identity)
    all_ids = [identity for identity, _ in records]
    return TreeModel(tuple(roots), tuple((identity, tuple(children[identity])) for identity in all_ids))


def verify_tree():
    models = 0
    node_cases = 0
    expansion_cases = 0
    visibility_cases = 0

    for n in range(7):
        for tree in enumerate_ordered_forests(n):
            models += 1
            ids = tree.ids
            assert len(ids) == n
            assert len(set(ids)) == n
            parent = tree.parent_map()
            assert set(parent) == set(ids)

            for identity in ids:
                seen = set()
                current: Optional[int] = identity
                while current is not None:
                    assert current not in seen
                    seen.add(current)
                    current = parent[current]
                node_cases += 1

            records = encode_preorder_depth(tree)
            decoded = decode_preorder_depth(records)
            assert decoded.roots == tree.roots
            assert decoded.children_map == tree.children_map

            # Expansion is exhaustively checked through n=5; larger models use all/none.
            branches = tuple(identity for identity in ids if tree.children_of(identity))
            expansion_sets = list(powerset(branches)) if n <= 5 else [frozenset(), frozenset(branches)]
            preorder = tree.preorder()
            preorder_index = {identity: i for i, identity in enumerate(preorder)}

            for expanded in expansion_sets:
                visible = tree.visible(expanded)
                expansion_cases += 1
                assert len(visible) == len(set(visible))
                assert all(identity in preorder_index for identity in visible)
                assert [preorder_index[x] for x in visible] == sorted(preorder_index[x] for x in visible)

                for identity in ids:
                    ancestors = []
                    current = parent[identity]
                    while current is not None:
                        ancestors.append(current)
                        current = parent[current]
                    expected_visible = all(ancestor in expanded for ancestor in ancestors)
                    assert (identity in visible) == expected_visible
                    visibility_cases += 1

                # Visible projection is a lawful Sequence.
                visible_sequence = SequenceModel(visible)
                for i, identity in enumerate(visible):
                    assert visible_sequence.at(i) == identity
                    assert visible_sequence.index_of(identity) == i

    # Parent relation alone does not determine sibling order.
    tree_a = TreeModel((0,), ((0, (1, 2)), (1, ()), (2, ())))
    tree_b = TreeModel((0,), ((0, (2, 1)), (1, ()), (2, ())))
    assert tree_a.parent_map() == tree_b.parent_map()
    assert tree_a.preorder() != tree_b.preorder()

    return {
        "models": models,
        "nodeCases": node_cases,
        "expansionCases": expansion_cases,
        "visibilityCases": visibility_cases,
        "siblingOrderCountermodel": True,
    }


# -----------------------------
# Cursor and selection theory
# -----------------------------

@dataclass(frozen=True)
class CursorState:
    current: Optional[int]


def reconcile_cursor(cursor: CursorState, domain: SequenceModel, fallback: str) -> CursorState:
    assert fallback in ("none", "first", "last")
    if cursor.current is not None and domain.index_of(cursor.current) is not None:
        return cursor
    if fallback == "none" or domain.size == 0:
        return CursorState(None)
    return CursorState(domain.ids[0] if fallback == "first" else domain.ids[-1])


@dataclass(frozen=True)
class SelectionState:
    selected: frozenset[int]
    anchor: Optional[int] = None


def selection_is_valid(state: SelectionState, domain: SequenceModel, mode: str) -> bool:
    assert mode in ("single", "multiple")
    if mode == "single" and len(state.selected) > 1:
        return False
    if not state.selected <= set(domain.ids):
        return False
    if state.anchor is not None and domain.index_of(state.anchor) is None:
        return False
    return True


def reconcile_selection(state: SelectionState, domain: SequenceModel, mode: str) -> SelectionState:
    """Reconcile a previously valid state after the domain changes.

    Invalid controlled snapshots are rejected by validation; they are never
    silently coerced from multiple selection into single selection.
    """
    assert mode in ("single", "multiple")
    assert mode == "multiple" or len(state.selected) <= 1
    selected = frozenset(identity for identity in state.selected if domain.index_of(identity) is not None)
    anchor = state.anchor if state.anchor is not None and domain.index_of(state.anchor) is not None else None
    result = SelectionState(selected, anchor)
    assert selection_is_valid(result, domain, mode)
    return result


def select_one(state: SelectionState, identity: int, domain: SequenceModel) -> SelectionState:
    if domain.index_of(identity) is None:
        return state
    return SelectionState(frozenset({identity}), identity)


def toggle_many(state: SelectionState, identity: int, domain: SequenceModel) -> SelectionState:
    if domain.index_of(identity) is None:
        return state
    selected = set(state.selected)
    if identity in selected:
        selected.remove(identity)
    else:
        selected.add(identity)
    return SelectionState(frozenset(selected), identity)


def select_interval(
    state: SelectionState,
    anchor: int,
    extent: int,
    domain: SequenceModel,
    additive: bool,
) -> SelectionState:
    ai = domain.index_of(anchor)
    ei = domain.index_of(extent)
    if ai is None or ei is None:
        return state
    start, end = sorted((ai, ei))
    interval = frozenset(domain.ids[start : end + 1])
    selected = state.selected | interval if additive else interval
    return SelectionState(selected, anchor)


def verify_cursor_selection():
    cursor_cases = 0
    selection_cases = 0
    invalid_snapshot_cases = 0
    interval_cases = 0
    renaming_cases = 0

    # Cursor and selection laws are invariant under identity renaming, so one
    # canonical sequence is exhaustive for each cardinality. Separate
    # permutation checks establish equivariance under renaming.
    for n in range(9):
        ids = tuple(range(n))
        domain = SequenceModel(ids)
        outside = n + 100
        candidates = (None,) + ids + (outside,)

        for current in candidates:
            for fallback in ("none", "first", "last"):
                result = reconcile_cursor(CursorState(current), domain, fallback)
                assert result.current is None or result.current in ids
                if current in ids:
                    assert result.current == current
                assert reconcile_cursor(result, domain, fallback) == result
                cursor_cases += 1

        # Multiple selection: every subset plus missing-domain members.
        multiple_inputs = list(powerset(ids))
        multiple_inputs += [subset | {outside} for subset in powerset(ids)]
        for selected in multiple_inputs:
            for anchor in candidates:
                # The pre-change domain may have contained `outside`; domain
                # reconciliation intersects membership and clears a lost anchor.
                raw = SelectionState(selected, anchor)
                reconciled = reconcile_selection(raw, domain, "multiple")
                assert selection_is_valid(reconciled, domain, "multiple")
                assert reconcile_selection(reconciled, domain, "multiple") == reconciled
                selection_cases += 1

                for identity in ids:
                    toggled = toggle_many(reconciled, identity, domain)
                    assert selection_is_valid(toggled, domain, "multiple")
                    assert toggle_many(toggled, identity, domain).selected == reconciled.selected

        # Single selection accepts only empty/singleton controlled snapshots;
        # multiple-item snapshots are typed invalid input, not normalized.
        single_valid = [frozenset()] + [frozenset({identity}) for identity in ids]
        for selected in single_valid:
            for anchor in candidates:
                raw = SelectionState(selected, anchor)
                reconciled = reconcile_selection(raw, domain, "single")
                assert selection_is_valid(reconciled, domain, "single")
                assert reconcile_selection(reconciled, domain, "single") == reconciled
                selection_cases += 1
                for identity in ids:
                    one = select_one(reconciled, identity, domain)
                    assert one.selected == frozenset({identity})
                    assert selection_is_valid(one, domain, "single")
                    assert select_one(one, identity, domain) == one

        for selected in powerset(ids):
            if len(selected) > 1:
                invalid = SelectionState(selected, None)
                assert not selection_is_valid(invalid, domain, "single")
                invalid_snapshot_cases += 1

        for anchor in ids:
            for extent in ids:
                result = select_interval(SelectionState(frozenset()), anchor, extent, domain, False)
                start_index, end_index = sorted((anchor, extent))
                assert result.selected == frozenset(ids[start_index : end_index + 1])
                assert result.anchor == anchor
                interval_cases += 1

    # Equivariance under all renamings up to cardinality 7.
    for n in range(8):
        canonical = SequenceModel(tuple(range(n)))
        for perm in permutations(range(n)):
            renamed = SequenceModel(perm)
            rename = dict(zip(canonical.ids, renamed.ids))
            for subset in powerset(canonical.ids):
                source = SelectionState(subset, canonical.ids[0] if canonical.ids else None)
                target = SelectionState(
                    frozenset(rename[x] for x in subset),
                    rename[source.anchor] if source.anchor is not None else None,
                )
                reconciled_source = reconcile_selection(source, canonical, "multiple")
                reconciled_target = reconcile_selection(target, renamed, "multiple")
                assert reconciled_target.selected == frozenset(rename[x] for x in reconciled_source.selected)
                renaming_cases += 1

    return {
        "cursorCases": cursor_cases,
        "selectionCases": selection_cases,
        "invalidSnapshotCases": invalid_snapshot_cases,
        "intervalCases": interval_cases,
        "renamingCases": renaming_cases,
    }


# -----------------------------
# Text and composition theory
# -----------------------------


def is_well_formed(text: str) -> bool:
    try:
        text.encode("utf-16-le")
        return True
    except UnicodeEncodeError:
        return False


def utf16_length(text: str) -> int:
    assert is_well_formed(text)
    return len(text.encode("utf-16-le")) // 2


def utf16_boundaries(text: str) -> tuple[int, ...]:
    assert is_well_formed(text)
    result = [0]
    total = 0
    for ch in text:
        total += 2 if ord(ch) > 0xFFFF else 1
        result.append(total)
    return tuple(result)


def python_index_at_utf16(text: str, offset: int) -> Optional[int]:
    boundaries = utf16_boundaries(text)
    try:
        return boundaries.index(offset)
    except ValueError:
        return None


def text_slice(text: str, start: int, end: int) -> str:
    assert start <= end
    si = python_index_at_utf16(text, start)
    ei = python_index_at_utf16(text, end)
    assert si is not None and ei is not None
    return text[si:ei]


def text_replace(text: str, start: int, end: int, replacement: str) -> str:
    assert is_well_formed(text) and is_well_formed(replacement)
    si = python_index_at_utf16(text, start)
    ei = python_index_at_utf16(text, end)
    assert si is not None and ei is not None and start <= end
    result = text[:si] + replacement + text[ei:]
    assert is_well_formed(result)
    return result


@dataclass(frozen=True)
class TextSelection:
    anchor: int
    focus: int

    @property
    def start(self) -> int:
        return min(self.anchor, self.focus)

    @property
    def end(self) -> int:
        return max(self.anchor, self.focus)

    @property
    def direction(self) -> str:
        if self.anchor == self.focus:
            return "none"
        return "forward" if self.anchor < self.focus else "backward"


@dataclass(frozen=True)
class TextSnapshot:
    text: str
    selection: TextSelection

    def __post_init__(self):
        assert is_well_formed(self.text)
        boundaries = set(utf16_boundaries(self.text))
        assert self.selection.anchor in boundaries
        assert self.selection.focus in boundaries


@dataclass(frozen=True)
class Composition:
    baseline: TextSnapshot
    start: int
    end: int
    composing: str

    def __post_init__(self):
        assert self.start <= self.end
        assert self.start in utf16_boundaries(self.baseline.text)
        assert self.end in utf16_boundaries(self.baseline.text)
        assert is_well_formed(self.composing)


@dataclass(frozen=True)
class TextEditingState:
    snapshot: TextSnapshot
    composition: Optional[Composition] = None

    def projected_text(self) -> str:
        if self.composition is None:
            return self.snapshot.text
        c = self.composition
        return text_replace(c.baseline.text, c.start, c.end, c.composing)


def start_composition(state: TextEditingState, start: int, end: int, composing: str, selection: TextSelection) -> TextEditingState:
    assert state.composition is None
    baseline = state.snapshot
    composition = Composition(baseline, start, end, composing)
    projected = text_replace(baseline.text, start, end, composing)
    result_snapshot = TextSnapshot(projected, selection)
    return TextEditingState(result_snapshot, composition)


def update_composition(state: TextEditingState, composing: str, selection: TextSelection) -> TextEditingState:
    assert state.composition is not None
    old = state.composition
    composition = Composition(old.baseline, old.start, old.end, composing)
    projected = text_replace(old.baseline.text, old.start, old.end, composing)
    return TextEditingState(TextSnapshot(projected, selection), composition)


def commit_composition(state: TextEditingState) -> TextEditingState:
    assert state.composition is not None
    return TextEditingState(state.snapshot, None)


def cancel_composition(state: TextEditingState) -> TextEditingState:
    assert state.composition is not None
    return TextEditingState(state.composition.baseline, None)


def replace_stable(state: TextEditingState, start: int, end: int, replacement: str, selection: TextSelection) -> TextEditingState:
    assert state.composition is None
    text = text_replace(state.snapshot.text, start, end, replacement)
    return TextEditingState(TextSnapshot(text, selection), None)


def verify_text():
    replace_cases = 0
    selection_cases = 0
    composition_cases = 0
    normalization_cases = 0

    atoms = ("a", "가", "😀", "\u0301")
    strings = {""}
    for length in range(1, 3):
        for parts in product(atoms, repeat=length):
            strings.add("".join(parts))
    strings.update({"가", "a\u0301", "🇰🇷", "👨\u200d👩\u200d👧\u200d👦"})
    strings = tuple(sorted(strings, key=lambda s: (utf16_length(s), s)))
    replacements = tuple(s for s in strings if utf16_length(s) <= 2)

    # Ill-formed surrogate halves are rejected.
    assert not is_well_formed("\ud800")
    assert not is_well_formed("\udc00")

    for text in strings:
        boundaries = utf16_boundaries(text)
        assert boundaries[0] == 0 and boundaries[-1] == utf16_length(text)
        assert len(boundaries) == len(text) + 1

        for anchor in boundaries:
            for focus in boundaries:
                selection = TextSelection(anchor, focus)
                snapshot = TextSnapshot(text, selection)
                assert snapshot.selection.start <= snapshot.selection.end
                if anchor == focus:
                    assert snapshot.selection.direction == "none"
                elif anchor < focus:
                    assert snapshot.selection.direction == "forward"
                else:
                    assert snapshot.selection.direction == "backward"
                selection_cases += 1

        for start in boundaries:
            for end in boundaries:
                if start > end:
                    continue
                removed = text_slice(text, start, end)
                for replacement in replacements:
                    result = text_replace(text, start, end, replacement)
                    expected_length = utf16_length(text) - (end - start) + utf16_length(replacement)
                    assert utf16_length(result) == expected_length
                    restored_end = start + utf16_length(replacement)
                    restored = text_replace(result, start, restored_end, removed)
                    assert restored == text
                    if replacement == removed:
                        assert result == text
                    replace_cases += 1

        # Composition tests from every selected range with small composing strings.
        for anchor in boundaries:
            for focus in boundaries:
                baseline = TextSnapshot(text, TextSelection(anchor, focus))
                base_state = TextEditingState(baseline)
                start, end = sorted((anchor, focus))
                for composing in replacements:
                    projected = text_replace(text, start, end, composing)
                    projected_boundaries = utf16_boundaries(projected)
                    projected_selection = TextSelection(projected_boundaries[-1], projected_boundaries[-1])
                    started = start_composition(base_state, start, end, composing, projected_selection)
                    assert started.composition is not None
                    assert started.composition.baseline == baseline
                    assert started.snapshot.text == projected
                    assert cancel_composition(started) == base_state
                    committed = commit_composition(started)
                    assert committed.composition is None
                    assert committed.snapshot.text == projected

                    # Every second update replaces the active passage; none append to the previous update.
                    for second in replacements:
                        projected2 = text_replace(text, start, end, second)
                        sel2 = TextSelection(utf16_length(projected2), utf16_length(projected2))
                        updated = update_composition(started, second, sel2)
                        assert updated.snapshot.text == projected2
                        assert updated.composition is not None
                        assert updated.composition.baseline == baseline
                        assert cancel_composition(updated) == base_state
                        assert commit_composition(updated).snapshot.text == projected2
                        composition_cases += 1

    # No implicit normalization: canonically equivalent spellings remain distinct data.
    canonical_pairs = [("가", "가"), ("á", "a\u0301")]
    for left, right in canonical_pairs:
        assert left != right
        assert unicodedata.normalize("NFC", left) == unicodedata.normalize("NFC", right)
        assert TextSnapshot(left, TextSelection(0, 0)).text == left
        assert TextSnapshot(right, TextSelection(0, 0)).text == right
        normalization_cases += 1

    return {
        "strings": len(strings),
        "replaceCases": replace_cases,
        "selectionCases": selection_cases,
        "compositionCases": composition_cases,
        "normalizationCases": normalization_cases,
    }


# -----------------------------
# Deterministic machine and representative composition
# -----------------------------

@dataclass(frozen=True)
class ListboxState:
    cursor: CursorState
    selection: SelectionState


@dataclass(frozen=True)
class MachineResult:
    state: ListboxState
    commands: tuple[tuple[str, Optional[int]], ...]
    error: Optional[str] = None


@dataclass(frozen=True)
class RevisionedListbox:
    revision: int
    state: ListboxState


@dataclass(frozen=True)
class RevisionResult:
    snapshot: RevisionedListbox
    commands: tuple[tuple[str, Optional[int]], ...]
    error: Optional[str] = None


def revisioned_listbox_step(
    domain: SequenceModel,
    eligible: frozenset[int],
    snapshot: RevisionedListbox,
    expected_revision: int,
    event: str,
    selection_follows_focus: bool,
    boundary: str,
) -> RevisionResult:
    if expected_revision != snapshot.revision:
        return RevisionResult(snapshot, (), "stale-revision")
    result = listbox_step(
        domain,
        eligible,
        snapshot.state,
        event,
        selection_follows_focus,
        boundary,
    )
    if result.error is not None:
        return RevisionResult(snapshot, (), result.error)
    # Every accepted semantic input advances the revision, including lawful
    # no-ops at a boundary. This gives adapters a total order for stale-input
    # rejection without leaking host event ordering into the core.
    return RevisionResult(
        RevisionedListbox(snapshot.revision + 1, result.state),
        result.commands,
        None,
    )


def listbox_step(
    domain: SequenceModel,
    eligible: frozenset[int],
    state: ListboxState,
    event: str,
    selection_follows_focus: bool,
    boundary: str,
) -> MachineResult:
    assert event in ("next", "previous", "toggle", "activate", "clear")
    assert boundary in ("stop", "wrap")

    if event in ("next", "previous"):
        if state.cursor.current is None:
            target = next((identity for identity in (domain.ids if event == "next" else tuple(reversed(domain.ids))) if identity in eligible), None)
        else:
            target = sequence_move(domain, state.cursor.current, 1 if event == "next" else -1, eligible, boundary)
        if target is None:
            return MachineResult(state, ())
        next_cursor = CursorState(target)
        next_selection = select_one(state.selection, target, domain) if selection_follows_focus else state.selection
        return MachineResult(ListboxState(next_cursor, next_selection), (("focus", target),))

    if event == "toggle":
        if state.cursor.current is None:
            return MachineResult(state, (), "no-cursor")
        next_selection = toggle_many(state.selection, state.cursor.current, domain)
        return MachineResult(ListboxState(state.cursor, next_selection), ())

    if event == "activate":
        if state.cursor.current is None:
            return MachineResult(state, (), "no-cursor")
        next_selection = select_one(state.selection, state.cursor.current, domain)
        return MachineResult(ListboxState(state.cursor, next_selection), (("activate", state.cursor.current),))

    return MachineResult(ListboxState(state.cursor, SelectionState(frozenset(), None)), ())


@dataclass(frozen=True)
class SliderState:
    tick: int


@dataclass(frozen=True)
class SliderResult:
    state: SliderState
    commands: tuple[tuple[str, int], ...]


def slider_step(model: RangeModel, state: SliderState, event: str, page: int = 2) -> SliderResult:
    assert 0 <= state.tick <= model.count
    assert event in ("increment", "decrement", "page-up", "page-down", "home", "end")
    if event == "increment":
        tick = min(model.count, state.tick + 1)
    elif event == "decrement":
        tick = max(0, state.tick - 1)
    elif event == "page-up":
        tick = min(model.count, state.tick + page)
    elif event == "page-down":
        tick = max(0, state.tick - page)
    elif event == "home":
        tick = 0
    else:
        tick = model.count
    next_state = SliderState(tick)
    command = () if next_state == state else (("announce-tick", tick),)
    return SliderResult(next_state, command)


@dataclass(frozen=True)
class TreeViewState:
    expanded: frozenset[int]
    cursor: CursorState
    selection: SelectionState


@dataclass(frozen=True)
class TreeViewResult:
    state: TreeViewState
    commands: tuple[tuple[str, Optional[int]], ...]
    error: Optional[str] = None


def tree_view_step(tree: TreeModel, state: TreeViewState, event: str) -> TreeViewResult:
    assert event in ("next", "previous", "right", "left", "toggle-select")
    branches = frozenset(identity for identity in tree.ids if tree.children_of(identity))
    expanded = state.expanded & branches
    visible = SequenceModel(tree.visible(expanded))
    current = state.cursor.current

    if current is not None and visible.index_of(current) is None:
        return TreeViewResult(state, (), "hidden-cursor")

    if event in ("next", "previous"):
        if current is None:
            target = visible.at(0 if event == "next" else visible.size - 1)
        else:
            target = sequence_move(
                visible,
                current,
                1 if event == "next" else -1,
                frozenset(visible.ids),
                "stop",
            )
        if target is None:
            return TreeViewResult(state, ())
        next_state = TreeViewState(expanded, CursorState(target), state.selection)
        return TreeViewResult(next_state, (("focus", target),))

    if event == "right":
        if current is None:
            return TreeViewResult(state, ())
        children = tree.children_of(current)
        if children and current not in expanded:
            return TreeViewResult(TreeViewState(expanded | {current}, state.cursor, state.selection), ())
        if children:
            target = children[0]
            assert target in tree.visible(expanded)
            return TreeViewResult(
                TreeViewState(expanded, CursorState(target), state.selection),
                (("focus", target),),
            )
        return TreeViewResult(state, ())

    if event == "left":
        if current is None:
            return TreeViewResult(state, ())
        if current in expanded:
            return TreeViewResult(TreeViewState(expanded - {current}, state.cursor, state.selection), ())
        parent = tree.parent_of(current)
        if parent is not None:
            return TreeViewResult(
                TreeViewState(expanded, CursorState(parent), state.selection),
                (("focus", parent),),
            )
        return TreeViewResult(state, ())

    if current is None:
        return TreeViewResult(state, (), "no-cursor")
    next_selection = toggle_many(state.selection, current, SequenceModel(tree.preorder()))
    return TreeViewResult(TreeViewState(expanded, state.cursor, next_selection), ())


@dataclass(frozen=True)
class ComboboxState:
    text: TextEditingState
    popup_open: bool
    cursor: CursorState
    selection: SelectionState


@dataclass(frozen=True)
class ComboboxResult:
    state: ComboboxState
    commands: tuple[tuple[str, Optional[int]], ...]
    error: Optional[str] = None


def combobox_accept(domain: SequenceModel, labels: dict[int, str], state: ComboboxState) -> ComboboxResult:
    current = state.cursor.current
    if current is None or domain.index_of(current) is None:
        return ComboboxResult(state, (), "no-candidate")
    if state.text.composition is not None:
        # Host must resolve composition explicitly before candidate acceptance.
        return ComboboxResult(state, (), "composition-active")
    label = labels[current]
    new_snapshot = TextSnapshot(label, TextSelection(utf16_length(label), utf16_length(label)))
    next_state = ComboboxState(
        TextEditingState(new_snapshot),
        False,
        CursorState(current),
        SelectionState(frozenset({current}), current),
    )
    return ComboboxResult(next_state, (("accept", current),))


def verify_machine():
    listbox_states = 0
    listbox_transitions = 0
    listbox_traces = 0
    slider_states = 0
    slider_transitions = 0
    tree_states = 0
    tree_transitions = 0
    combobox_cases = 0
    revision_cases = 0

    events = ("next", "previous", "toggle", "activate", "clear")
    for n in range(0, 5):
        domain = SequenceModel(tuple(range(n)))
        for eligible in powerset(domain.ids):
            for follows in (False, True):
                for boundary in ("stop", "wrap"):
                    starts = [ListboxState(CursorState(None), SelectionState(frozenset(), None))]
                    if n:
                        starts.append(ListboxState(CursorState(0), SelectionState(frozenset(), None)))
                    for start in starts:
                        queue = deque([(start, 0)])
                        seen = {(start, 0)}
                        while queue:
                            state, depth = queue.popleft()
                            listbox_states += 1
                            assert state.cursor.current is None or state.cursor.current in domain.ids
                            assert state.selection.selected <= set(domain.ids)
                            if depth == 5:
                                continue
                            for event in events:
                                left = listbox_step(domain, eligible, state, event, follows, boundary)
                                right = listbox_step(domain, eligible, state, event, follows, boundary)
                                assert left == right
                                listbox_transitions += 1
                                assert left.state.cursor.current is None or left.state.cursor.current in domain.ids
                                assert left.state.selection.selected <= set(domain.ids)
                                if left.error is not None:
                                    assert left.state == state
                                    assert left.commands == ()
                                key = (left.state, depth + 1)
                                if key not in seen:
                                    seen.add(key)
                                    queue.append(key)
                                listbox_traces += 1

    # Revision wrapper: stale inputs and failed transitions are failure-atomic;
    # accepted inputs advance exactly once, even when the semantic state is a no-op.
    for n in range(5):
        domain = SequenceModel(tuple(range(n)))
        for eligible in powerset(domain.ids):
            base = RevisionedListbox(
                7,
                ListboxState(CursorState(None), SelectionState(frozenset(), None)),
            )
            stale = revisioned_listbox_step(domain, eligible, base, 6, "next", False, "stop")
            assert stale.error == "stale-revision"
            assert stale.snapshot == base and stale.commands == ()
            revision_cases += 1

            failed = revisioned_listbox_step(domain, eligible, base, 7, "toggle", False, "stop")
            assert failed.error == "no-cursor"
            assert failed.snapshot == base and failed.commands == ()
            revision_cases += 1

            accepted = revisioned_listbox_step(domain, eligible, base, 7, "next", False, "stop")
            assert accepted.error is None
            assert accepted.snapshot.revision == 8
            repeated_old = revisioned_listbox_step(
                domain,
                eligible,
                accepted.snapshot,
                7,
                "next",
                False,
                "stop",
            )
            assert repeated_old.error == "stale-revision"
            assert repeated_old.snapshot == accepted.snapshot and repeated_old.commands == ()
            revision_cases += 2

    # Slider traces over every small quantized domain.
    slider_events = ("increment", "decrement", "page-up", "page-down", "home", "end")
    for count in range(9):
        model = RangeModel(Fraction(-2), Fraction(1, 2), count)
        for initial in range(count + 1):
            queue = deque([(SliderState(initial), 0)])
            seen = {(SliderState(initial), 0)}
            while queue:
                state, depth = queue.popleft()
                slider_states += 1
                assert 0 <= state.tick <= count
                if depth == 6:
                    continue
                for event in slider_events:
                    left = slider_step(model, state, event)
                    right = slider_step(model, state, event)
                    assert left == right
                    assert 0 <= left.state.tick <= count
                    slider_transitions += 1
                    key = (left.state, depth + 1)
                    if key not in seen:
                        seen.add(key)
                        queue.append(key)

    # Tree-view traces over every ordered forest through n=4 and all expansion states.
    tree_events = ("next", "previous", "right", "left", "toggle-select")
    for n in range(5):
        for tree in enumerate_ordered_forests(n):
            branches = tuple(identity for identity in tree.ids if tree.children_of(identity))
            for expanded in powerset(branches):
                visible = tree.visible(expanded)
                starts = [TreeViewState(expanded, CursorState(None), SelectionState(frozenset(), None))]
                starts += [TreeViewState(expanded, CursorState(identity), SelectionState(frozenset(), None)) for identity in visible]
                for start in starts:
                    queue = deque([(start, 0)])
                    seen = {(start, 0)}
                    while queue:
                        state, depth = queue.popleft()
                        tree_states += 1
                        current_visible = tree.visible(state.expanded)
                        assert state.cursor.current is None or state.cursor.current in current_visible
                        assert state.selection.selected <= set(tree.ids)
                        if depth == 4:
                            continue
                        for event in tree_events:
                            left = tree_view_step(tree, state, event)
                            right = tree_view_step(tree, state, event)
                            assert left == right
                            tree_transitions += 1
                            if left.error is not None:
                                assert left.state == state
                                assert left.commands == ()
                            else:
                                next_visible = tree.visible(left.state.expanded)
                                assert left.state.cursor.current is None or left.state.cursor.current in next_visible
                                assert left.state.selection.selected <= set(tree.ids)
                            key = (left.state, depth + 1)
                            if key not in seen:
                                seen.add(key)
                                queue.append(key)

    # Combobox authority and failure-atomicity checks.
    for n in range(5):
        domain = SequenceModel(tuple(range(n)))
        labels = {identity: f"item-{identity}" for identity in domain.ids}
        empty = TextEditingState(TextSnapshot("", TextSelection(0, 0)))
        for current in (None,) + domain.ids:
            base = ComboboxState(empty, True, CursorState(current), SelectionState(frozenset(), None))
            result = combobox_accept(domain, labels, base)
            if current is None:
                assert result.error == "no-candidate" and result.state == base and result.commands == ()
            else:
                assert result.error is None
                assert result.state.text.snapshot.text == labels[current]
                assert result.state.selection.selected == frozenset({current})
                assert not result.state.popup_open

            if current is not None:
                composing = start_composition(
                    empty,
                    0,
                    0,
                    "가",
                    TextSelection(1, 1),
                )
                active = ComboboxState(composing, True, CursorState(current), SelectionState(frozenset(), None))
                rejected = combobox_accept(domain, labels, active)
                assert rejected.error == "composition-active"
                assert rejected.state == active and rejected.commands == ()
            combobox_cases += 1

    return {
        "listboxStatesExplored": listbox_states,
        "listboxTransitions": listbox_transitions,
        "listboxTracePrefixes": listbox_traces,
        "sliderStatesExplored": slider_states,
        "sliderTransitions": slider_transitions,
        "treeViewStatesExplored": tree_states,
        "treeViewTransitions": tree_transitions,
        "comboboxCases": combobox_cases,
        "revisionCases": revision_cases,
    }


# -----------------------------
# Coverage corpus
# -----------------------------

APG_PATTERNS = {
    "Accordion": {"sequence", "expansion", "cursor", "machine", "command"},
    "Alert": {"command"},
    "Alert and Message Dialogs": {"popup", "machine", "command"},
    "Breadcrumb": {"sequence", "command"},
    "Button": {"machine", "command"},
    "Carousel": {"sequence", "cursor", "machine", "command"},
    "Checkbox": {"checked", "machine"},
    "Combobox": {"text", "popup", "cursor", "selection", "machine", "command", "choice-structure"},
    "Dialog": {"popup", "machine", "command"},
    "Disclosure": {"expansion", "machine"},
    "Feed": {"sequence", "cursor", "revision", "machine", "command"},
    "Grid": {"grid", "cursor", "selection", "machine", "command"},
    "Landmarks": {"static"},
    "Link": {"command"},
    "Listbox": {"sequence", "cursor", "selection", "typeahead", "machine", "command"},
    "Menu and Menubar": {"sequence", "cursor", "popup", "machine", "command"},
    "Menu Button": {"sequence", "popup", "machine", "command"},
    "Meter": {"range", "static"},
    "Radio Group": {"sequence", "cursor", "selection", "machine", "command"},
    "Slider": {"range", "value", "machine", "command"},
    "Slider (Multi-Thumb)": {"sequence", "range", "constraint", "value", "cursor", "machine", "command"},
    "Spinbutton": {"range", "text", "validation", "machine", "command"},
    "Switch": {"checked", "machine"},
    "Table": {"grid", "static"},
    "Tabs": {"sequence", "cursor", "selection", "activation-policy", "machine", "command"},
    "Toolbar": {"sequence", "cursor", "machine", "command"},
    "Tooltip": {"popup", "machine", "command"},
    "Tree View": {"tree", "expansion", "cursor", "selection", "machine", "command"},
    "Treegrid": {"tree", "grid", "expansion", "cursor", "selection", "machine", "command"},
    "Window Splitter": {"range", "value", "machine", "command"},
}


def verify_coverage():
    assert len(APG_PATTERNS) == 30
    canonical = {"sequence", "range", "grid", "tree"}
    independent = {
        "selection", "cursor", "expansion", "text", "popup", "machine", "command",
        "typeahead", "revision", "constraint", "validation", "activation-policy", "static",
        "choice-structure", "checked", "value",
    }
    unknown = set().union(*APG_PATTERNS.values()) - canonical - independent
    assert not unknown

    structural_usage = defaultdict(int)
    for tags in APG_PATTERNS.values():
        for tag in canonical:
            if tag in tags:
                structural_usage[tag] += 1

    # Combobox has one choice-structure variant: listbox(sequence), grid, or tree.
    assert "choice-structure" in APG_PATTERNS["Combobox"]
    assert structural_usage == {
        "sequence": 11,
        "range": 5,
        "grid": 3,
        "tree": 2,
    }

    return {
        "patterns": len(APG_PATTERNS),
        "structuralUsage": dict(structural_usage),
        "unclassified": [],
    }



def verify_random_stress(seed: int = 0x5EC71E, iterations: int = 2000):
    rng = random.Random(seed)
    sequence_cases = 0
    range_cases = 0
    grid_cases = 0
    tree_cases = 0
    text_cases = 0
    machine_cases = 0

    # Sequence differential checks with arbitrary identity permutations.
    for _ in range(iterations):
        n = rng.randrange(0, 80)
        ids = list(range(n))
        rng.shuffle(ids)
        model = SequenceModel(tuple(ids))
        eligible = frozenset(identity for identity in ids if rng.randrange(2))
        if ids:
            current = rng.choice(ids)
            direction = rng.choice((-1, 1))
            boundary = rng.choice(("stop", "wrap"))
            got = sequence_move(model, current, direction, eligible, boundary)
            index = ids.index(current)
            candidate_indexes = list(range(index + direction, n if direction > 0 else -1, direction))
            if boundary == "wrap":
                candidate_indexes += list(range(0 if direction > 0 else n - 1, index, direction))
            expected = next((ids[i] for i in candidate_indexes if ids[i] in eligible), None)
            assert got == expected
        sequence_cases += 1

    # Range snap differential checks against explicit nearest-tick minimization.
    for _ in range(iterations):
        origin = Fraction(rng.randrange(-100, 101), rng.randrange(1, 13))
        step = Fraction(rng.randrange(1, 50), rng.randrange(1, 13))
        count = rng.randrange(0, 80)
        model = RangeModel(origin, step, count)
        sample = origin + Fraction(rng.randrange(-200, 201), rng.randrange(1, 17)) * step
        tie = rng.choice(("lower", "upper", "even"))
        got = model.snap(sample, tie)
        clamped = model.clamp(sample)
        distances = [(abs(model.value_at(tick) - clamped), tick) for tick in range(count + 1)]  # type: ignore[operator]
        minimum = min(distance for distance, _ in distances)
        tied = [tick for distance, tick in distances if distance == minimum]
        if tie == "lower":
            expected_tick = min(tied)
        elif tie == "upper":
            expected_tick = max(tied)
        else:
            even = [tick for tick in tied if tick % 2 == 0]
            expected_tick = even[0] if even else min(tied)
        assert got == model.value_at(expected_tick)
        range_cases += 1

    # Grid differential checks with arbitrary occupancy and identity assignment.
    for _ in range(iterations):
        rows = rng.randrange(0, 12)
        columns = rng.randrange(0, 12)
        slots = rows * columns
        occupied_positions = [i for i in range(slots) if rng.random() < 0.35]
        ids = list(range(len(occupied_positions)))
        rng.shuffle(ids)
        cells: list[Optional[int]] = [None] * slots
        for pos, identity in zip(occupied_positions, ids):
            cells[pos] = identity
        model = GridModel(rows, columns, tuple(cells))
        eligible = frozenset(identity for identity in ids if rng.randrange(2))
        if ids:
            current = rng.choice(ids)
            direction = rng.choice(("left", "right", "up", "down"))
            boundary = rng.choice(("stop", "wrap-axis"))
            got = grid_move(model, current, direction, eligible, boundary)
            row, column = model.position_of(current)  # type: ignore[misc]
            candidates = []
            for identity in ids:
                if identity == current or identity not in eligible:
                    continue
                r, c = model.position_of(identity)  # type: ignore[misc]
                if direction == "left" and r == row:
                    delta = column - c
                    axis = c
                elif direction == "right" and r == row:
                    delta = c - column
                    axis = c
                elif direction == "up" and c == column:
                    delta = row - r
                    axis = r
                elif direction == "down" and c == column:
                    delta = r - row
                    axis = r
                else:
                    continue
                forward = delta > 0
                candidates.append((forward, abs(delta), axis, identity))
            forward_candidates = [x for x in candidates if x[0]]
            if forward_candidates:
                expected = min(forward_candidates, key=lambda x: x[1])[3]
            elif boundary == "wrap-axis" and candidates:
                if direction in ("right", "down"):
                    expected = min(candidates, key=lambda x: x[2])[3]
                else:
                    expected = max(candidates, key=lambda x: x[2])[3]
            else:
                expected = None
            assert got == expected
        grid_cases += 1

    # Random ordered forests and visible-projection predicate equivalence.
    for _ in range(iterations):
        n = rng.randrange(0, 80)
        parents: dict[int, Optional[int]] = {}
        children = defaultdict(list)
        for node in range(n):
            parent = None if node == 0 or rng.random() < 0.25 else rng.randrange(node)
            parents[node] = parent
            children[parent].append(node)
        for owner in list(children):
            rng.shuffle(children[owner])
        tree = TreeModel(
            tuple(children[None]),
            tuple((node, tuple(children[node])) for node in range(n)),
        )
        branches = [identity for identity in tree.ids if tree.children_of(identity)]
        expanded = frozenset(identity for identity in branches if rng.randrange(2))
        visible = set(tree.visible(expanded))
        for identity in tree.ids:
            current = parents[identity]
            expected = True
            while current is not None:
                if current not in expanded:
                    expected = False
                    break
                current = parents[current]
            assert (identity in visible) == expected
        tree_cases += 1

    # UTF-16 replacement differential checks against a code-unit implementation.
    scalar_pool = ["a", "가", "😀", "\u0301", "\u200d", "🇰", "🇷"]
    for _ in range(iterations):
        text = "".join(rng.choice(scalar_pool) for _ in range(rng.randrange(0, 12)))
        replacement = "".join(rng.choice(scalar_pool) for _ in range(rng.randrange(0, 5)))
        boundaries = utf16_boundaries(text)
        start = rng.choice(boundaries)
        end = rng.choice([x for x in boundaries if x >= start])
        got = text_replace(text, start, end, replacement)
        source_units = [text.encode("utf-16-le")[i : i + 2] for i in range(0, len(text.encode("utf-16-le")), 2)]
        replacement_bytes = replacement.encode("utf-16-le")
        replacement_units = [replacement_bytes[i : i + 2] for i in range(0, len(replacement_bytes), 2)]
        expected_bytes = b"".join(source_units[:start] + replacement_units + source_units[end:])
        expected = expected_bytes.decode("utf-16-le")
        assert got == expected
        text_cases += 1

    # Long random listbox traces preserve all state invariants.
    event_pool = ("next", "previous", "toggle", "activate", "clear")
    for _ in range(500):
        n = rng.randrange(0, 30)
        domain = SequenceModel(tuple(range(n)))
        eligible = frozenset(identity for identity in domain.ids if rng.randrange(2))
        follows = bool(rng.randrange(2))
        boundary = rng.choice(("stop", "wrap"))
        state = ListboxState(CursorState(None), SelectionState(frozenset(), None))
        for _step in range(100):
            event = rng.choice(event_pool)
            result = listbox_step(domain, eligible, state, event, follows, boundary)
            if result.error is not None:
                assert result.state == state and result.commands == ()
            state = result.state
            assert state.cursor.current is None or state.cursor.current in domain.ids
            assert state.selection.selected <= set(domain.ids)
            machine_cases += 1

    return {
        "seed": seed,
        "sequenceCases": sequence_cases,
        "rangeCases": range_cases,
        "gridCases": grid_cases,
        "treeCases": tree_cases,
        "textCases": text_cases,
        "machineTransitions": machine_cases,
    }

def main():
    result = {
        "sequence": verify_sequence(),
        "range": verify_range(),
        "grid": verify_grid(),
        "tree": verify_tree(),
        "cursorSelection": verify_cursor_selection(),
        "text": verify_text(),
        "machine": verify_machine(),
        "coverage": verify_coverage(),
        "randomStress": verify_random_stress(),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
