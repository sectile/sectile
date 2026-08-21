---
title: "Sectile Theory"
subtitle: "Renderer-neutral interaction structure, state, text, transition의 결정 폐쇄 명세"
status: "Decision-closed / implementation-ready foundation"
version: "1.0"
date: "2026-08-21"
language: "ko"
scope: "finite 또는 명시적으로 resource-bounded인 deterministic logical interaction과 plain-text editing"
---

# Sectile Theory

> Status: Accepted

**Renderer-neutral interaction structure, state, text, transition의 결정 폐쇄 명세**

이 문서는 기존 package와 구현을 출발점으로 삼지 않는다. 기존 코드는 이후에 이 명세를 만족하는 candidate model, 회귀 corpus, 성능 비교 대상으로만 사용한다. 이 문서의 목적은 구현 전에 남아 있던 구조적·이론적 의사결정을 모두 닫고, 이후 작업을 **연구가 아니라 구현과 refinement 검증**으로 전환하는 것이다.

---

## 초록

Sectile은 renderer와 host platform에 종속되지 않는 interaction primitive를 제공하려 한다. 초기 후보였던 `sequence`, `range`, `grid`, `tree`가 수학적으로 가장 작은 기저인지, 더 일반적인 `space`나 `graph`로 줄일 수 있는지, selection·text·IME composition·상태 전이가 같은 층의 primitive인지가 핵심 문제였다.

조사와 검증 결과, package 수로 표현되는 전역적·유일한 최소 기저는 적절한 목표가 아니라는 결론을 얻었다. 같은 semantic theory는 서로 다른 signature와 sort로 나타낼 수 있고, 모든 유한 구조는 bytes, graph, relation, universal machine으로 encode할 수 있다. 이때 target-specific coordinate, sibling order, numeric metric, text offset law를 parameter나 callback으로 다시 주입하면 package 수만 줄었을 뿐 의미는 제거되지 않는다. 따라서 **encoding 가능성은 public semantic derivation의 증거가 아니다**.[R1][R2][R3][R4]

`sequence`, `range`, `grid`, `tree`는 환원 불가능한 수학적 원자가 아니다. `sequence`는 one-row `grid`, flat `tree`, 또는 indexable ordinal로 표현할 수 있고, finite quantized `range`는 finite ordinal과 affine interpretation의 조합과 동형이다. `grid`는 nested sequence와 occupancy로, `tree`는 preorder-depth sequence로 encode할 수 있다. 그럼에도 이 네 구조는 현재 target domain에서 반복적으로 나타나는 canonical observation, law, error, complexity를 가장 직접적으로 드러낸다. 따라서 이들을 **canonical public structures**로 확정한다.

상태와 데이터는 구조에서 분리한다. `cursor`, `selection`, `expansion`은 state theory이고, `text`는 well-formed UTF-16 plain-text data와 editing transition의 독립 theory다. Eligibility, wrapping, activation, filtering, parsing은 policy다. Focus, scroll, announce, data request는 host command다. 상태 동작은 다음 결정적이고 순수한 transition으로 명세한다.

```text
State × SemanticInput
  → Result<State × OrderedCommand*>
```

현재 선언된 범위에서 구현 경계를 바꿀 수 있는 조사 항목은 모두 닫혔다. 추가 연구는 geometry, arbitrary DAG, rich text, CRDT, genuinely unbounded stream처럼 **범위를 확장할 때**, 또는 이 문서에 명시된 반증 조건이 실제로 관찰될 때만 필요하다.

---

## 0. 결정 요약

### 0.1 완료 판정

다음 문장을 본 연구의 최종 판정으로 채택한다.

> Sectile은 최소 package 목록을 주장하지 않는다. Sectile은 형식 명세 계산 위에 `sequence`, `range`, `grid`, `tree`를 canonical public structures로 제공하고, 독립적인 state·text theory를 결정적이고 원자적인 transition으로 조합한다.

이 문서가 말하는 **완료**는 다음 뜻이다.

```text
완료:
  현재 선언된 scope에서 public boundary와 theory를 결정하는 데
  더 필요한 조사·문헌 검토·countermodel 탐색이 없음

미완료가 아님:
  TypeScript production 구현
  실제 benchmark
  repository migration
  consumer integration
  implementation differential test
```

구현이 존재하기 전에는 production implementation의 정확성이나 성능을 검증할 수 없다. 그러나 그것은 foundational research의 잔여가 아니라, 이 문서가 정의한 proof obligation을 수행하는 구현 단계다.

### 0.2 최종 이름

```text
@sectile/primitives/sequence
@sectile/primitives/range
@sectile/primitives/grid
@sectile/primitives/tree
```

다음 이름은 사용하지 않는다.

```text
collection          너무 넓음
matrix-navigation   대상과 operation을 혼합함
tree-collection     불필요하게 복합적임
matrix              완전한 직사각형과 행렬 연산을 암시함
hierarchy           DAG와 multiple parent까지 암시함
space               target semantics를 숨기는 universal container가 되기 쉬움
graph               현재 scope보다 넓고 canonical operation이 부족함
machine             public data primitive가 아니라 transition 계산임
```

### 0.3 최종 층위

```text
Specification calculus
  sorts · operations · observations · laws · errors · costs
  product · sum · refinement · projection · parameterization
  deterministic transition · revision · transaction

Canonical public structures
  sequence · range · grid · tree

Independent state/data theories
  cursor · selection · expansion · text

Policies
  eligibility · boundary · activation · filtering · parsing · validation

Commands
  focus · scroll · announce · request · clipboard · host popup

Composite behaviors
  listbox · slider · calendar · tree view · combobox · treegrid

Adapters
  DOM · terminal · native · framework binding
```

### 0.4 구현 전 동결 결정

다음은 더 이상 open question이 아니다.

1. `sequence`, `range`, `grid`, `tree`는 canonical public structures다.
2. 이 네 개를 수학적 최소 기저라고 부르지 않는다.
3. Eligibility와 wrapping은 structure의 state가 아니라 policy다.
4. Cursor와 selection은 별도 authority다. Focus와 selection도 동일하지 않다.[R13]
5. Tree expansion은 tree structure가 아니라 tree에 parameterized된 state다.
6. Text는 sequence나 collection의 특수화가 아니라 독립 data/editing theory다.
7. Text offset은 명시적인 UTF-16 code-unit offset이며 surrogate pair를 분리하지 않는다.
8. Plain-text editing 중 implicit Unicode normalization을 수행하지 않는다.
9. Grapheme 이동·삭제는 versioned segmentation capability가 준비되기 전 public core operation으로 만들지 않는다.[R19]
10. Raw DOM, native, terminal event는 adapter에서 semantic input으로 변환한다.
11. 첫 구현은 stateful service가 아니라 immutable model과 pure transition이다.
12. Accepted input은 revision을 정확히 한 번 전진시키고, stale·invalid input은 state와 command를 모두 변경하지 않는다.
13. 구조 construction error, query absence, transition rejection, resource rejection, internal bug를 서로 다른 failure class로 구분한다.
14. Canonical ID는 opaque equality를 갖는 stable identity다. TypeScript v1은 non-empty well-formed string을 사용하며 normalization하지 않는다.
15. Geometry, arbitrary graph/DAG, rich text, CRDT, distributed consensus는 현재 scope 밖이다.

---

## 1. 연구 완료 기준

“더 조사할 것이 없다”는 문장은 무한한 문헌 탐색을 의미할 수 없다. 이 연구는 다음 **decision-closure criterion**을 사용한다.

| 기준 | 완료 조건 | 상태 |
|---|---|---|
| Scope | 포함·제외 범위와 확장 trigger가 명시됨 | 완료 |
| Signature | sort, carrier, kernel observation이 명시됨 | 완료 |
| Laws | identity, order, projection, transition law가 명시됨 | 완료 |
| Authority | structure/state/policy/command의 소유권이 중복되지 않음 | 완료 |
| Failure | construction/query/transition/resource/bug가 구분됨 | 완료 |
| Cost | 시간·공간 상한과 scan ceiling이 명시됨 | 완료 |
| Reduction | 더 작은 후보와의 구성적 환원 검토 | 완료 |
| Countermodel | `space`, relation-only grid, parent-only tree 가설 반증 | 완료 |
| Reference model | 독립적인 실행 가능 model 존재 | 완료 |
| Bounded check | 작은 model과 trace를 전수 검사 | 완료 |
| Stress check | 고정 seed의 deterministic differential stress 수행 | 완료 |
| Corpus | APG 30 pattern과 적대적 사례 분해 | 완료 |
| Standards | focus, composition, Unicode, geometry 경계 확인 | 완료 |
| Falsifier | 결론을 수정해야 하는 관찰 조건이 명시됨 | 완료 |
| Public decision | 이름과 승격 조건이 고정됨 | 완료 |

위 조건을 모두 만족한 이후의 추가 문헌은 다음 중 하나를 하지 못하면 구현 결정을 바꾸지 않는다.

```text
새로운 canonical observation 제시
현재 law의 counterexample 제시
현재 cost contract 불가능성 제시
현재 authority 분리가 atomic composition을 방해함을 제시
현재 scope 안의 pattern이 분해되지 않음을 제시
```

현재까지 그러한 반례는 발견되지 않았다. 따라서 이 문서는 **현재 scope에 대한 연구 종료점**이다.

---

## 2. 범위

### 2.1 포함 범위

```text
renderer-neutral
host-platform-neutral
deterministic
finite 또는 명시적으로 resource-bounded
stable semantic identity
immutable observable snapshot
explicit semantic input
ordered semantic command
atomic transition
explicit failure semantics
explicit complexity and resource ceiling
logical discrete navigation
finite quantized scalar
plain-text replacement, selection, IME composition
```

대표 target은 다음과 같다.

```text
ordered option navigation
numeric adjustment
logical row/column navigation
ordered hierarchy
single/multiple/range selection
plain-text editing
popup/open state
focus intent
filter/typeahead
controlled-state reconciliation
```

### 2.2 제외 범위

```text
continuous layout geometry
visual nearest-neighbor navigation
physics and animation
arbitrary graph editor
multiple-parent DAG hierarchy
merged-cell region algebra
rich-text document model
collaborative editing and CRDT
unbounded temporal stream semantics
distributed consensus
renderer-owned caret/focus geometry
raw DOM/native/terminal input event order
```

제외는 영구 금지가 아니다. 현재 theory를 불필요하게 일반화하지 않기 위한 scope boundary다.

### 2.3 Geometry가 별도인 이유

CSS Spatial Navigation은 후보의 bounding geometry, 방향, 거리, scroll container를 사용한다. 이는 logical row/column coordinate에서 같은 축의 다음 occupied cell을 찾는 `grid`와 다른 계산이다.[R22] 따라서 geometry는 `grid`의 숨은 callback으로 넣지 않고 adapter capability 또는 향후 독립 theory로 다룬다.

### 2.4 Raw host event가 별도인 이유

현재 UI Events와 Input Events Level 2는 composition 처리 중 `compositionupdate`와 `beforeinput`의 상대 순서를 서로 다르게 서술한다. 또한 실제 IME 동작은 OS와 장치에 의해 제어되며 취소 가능성도 일정하지 않다.[R20][R21] 그러므로 core가 특정 browser event 순서를 semantic contract로 채택하면 안 된다. Adapter가 host trace를 다음 semantic input으로 정규화한다.

```text
text.replace
selection.set
composition.start
composition.update
composition.commit
composition.cancel
```

---

## 3. 왜 유일한 최소 package 기저를 찾지 않는가

### 3.1 Signature 크기는 semantic invariant가 아니다

Abstract data type은 representation이 아니라 observable operation과 law로 정의된다.[R1] Structured specification은 작은 theory를 결합해 큰 theory를 만들 수 있지만, 같은 의미도 서로 다른 sort와 operation presentation으로 나타낼 수 있다.[R2][R3] Definitional·Morita equivalence는 signature 모양이나 sort 수가 달라도 theory의 의미가 대응할 수 있음을 보여 준다.[R4]

따라서 다음 값은 semantic minimality의 안정적인 척도가 아니다.

```text
package 수
파일 수
public 함수 수
sort 수
relation label 수
```

### 3.2 Universal encoding은 답이 아니다

모든 finite structure를 다음으로 encode할 수 있다.

```text
bytes
JSON tree
labelled graph
relation table
universal state machine
```

그러나 `grid` coordinate, `tree` sibling order, `range` metric, `text` offset law를 attribute나 arbitrary callback으로 되돌려 넣으면 제거한 의미를 다른 통로에 숨긴 것이다. 이것은 public derivation이 아니라 serialization 또는 interpretation이다.

### 3.3 환원 가능성과 public 제거 가능성은 다르다

다음 환원은 모두 가능하다.

```text
sequence → one-row grid
sequence → virtual-root flat tree
grid     → sequence<sequence<optional ID>>
tree     → sequence<(ID, depth)>
range    → finite ordinal + affine interpretation
```

따라서 네 구조는 형식적 원자가 아니다. 하지만 이 환원 형태를 public API로 강제하면 일반적인 선형 목록에 dummy row, 일반 tree에 depth codec, numeric range에 affine metadata가 노출된다. Public vocabulary의 목적은 encoding 최소화가 아니라 **canonical semantic observation을 직접 표현하는 것**이다.

### 3.4 최종 용어

```text
formal foundation     specification calculus
proof vocabulary      ordinal, relation, partial map, affine map
public structure      sequence, range, grid, tree
state theory          cursor, selection, expansion
text theory           plain text and editing transitions
composite behavior    여러 theory의 atomic coordination
```

`basis`라는 단어를 쓰더라도 package 목록이 아니라 specification calculus를 뜻한다.

---

## 4. 형식 명세 계산

### 4.1 정적 theory

정적 structure/data theory는 다음 튜플로 본다.

```text
T = <Sorts, Models, Operations, Observations, Laws, Errors, Costs>
```

- **Sorts**: identity, index, coordinate, tick, text offset 같은 domain
- **Models**: valid carrier와 invariant
- **Operations**: construction과 transformation
- **Observations**: public에서 구분 가능한 결과
- **Laws**: 모든 valid model에 성립해야 하는 식
- **Errors**: invalid input과 absence의 의미
- **Costs**: 시간·공간·resource ceiling

두 representation은 모든 lawful public experiment가 같을 때 관찰상 동등하다.

```text
A ≃ B
iff
모든 public observation trace에서 result와 error가 동일함
```

### 4.2 상태 theory

Stateful behavior는 internal representation보다 input trace와 observation을 기준으로 비교한다. 이는 transition system과 coalgebra의 behavioral 관점에 대응한다.[R5] 다음으로 명세한다.

```text
step : State × SemanticInput
    → Result<State × OrderedCommand*>
```

필수 law:

```text
determinism
purity
atomicity
failure atomicity
ordered commands
explicit revision
bounded transition work
```

### 4.3 Revision wrapper

Revision은 각 structure snapshot의 intrinsic field가 아니라 machine에 선택적으로 합성하는 standard wrapper다. Controlled 또는 asynchronous adapter는 다음 envelope를 사용한다.

```text
Envelope<State> = {
  revision: Natural
  state: State
}
```

Input은 `expectedRevision`을 포함한다.

```text
expectedRevision != currentRevision
  → stale rejection
  → unchanged state
  → no commands

valid accepted input
  → exactly revision + 1

invalid semantic input
  → unchanged revision and state
  → no commands
```

Accepted boundary no-op도 revision을 증가시킨다. Adapter가 “처리되지 않은 입력”과 “처리되었으나 semantic state가 동일한 입력”을 구분하고 total order를 유지할 수 있기 때문이다.

### 4.4 허용 합성

```text
product
  독립 authority를 가진 state/structure의 직교 결합

sum
  상호 배타적 mode 결합

refinement
  law를 추가하여 valid model class 제한

projection
  lawful observation으로 다른 canonical view 생성

parameterization
  명시된 law와 cost를 가진 policy/capability 주입

transaction
  여러 child transition을 compute-then-commit 방식으로 원자 실행

revision
  stale input을 거절하는 순서 wrapper
```

금지:

```text
target semantics를 숨기는 arbitrary callback
ambient mutable global state
subscription feedback loop
core transition 안의 host side effect
unbounded implicit search
child theory끼리 중복 authority 소유
```

### 4.5 합성 결정성 정리

두 child reducer `A`, `B`가 각각 결정적이며 disjoint state authority를 소유한다고 하자.

```text
stepA : SA × IA → Result<SA × CA*>
stepB : SB × IB → Result<SB × CB*>
```

Composite가 동일 input을 deterministic하게 두 input으로 분해하고, child 결과를 고정된 순서로 계산한 뒤 둘 다 성공할 때만 commit한다면:

```text
stepAB : (SA × SB) × I
      → Result<(SA × SB) × (CA* ++ CB*)>
```

도 결정적이고 failure-atomic이다.

증명은 직접적이다. 동일 `(SA, SB, I)`는 동일 `(IA, IB)`를 만들고, child 결정성으로 동일 result를 만든다. 한 child라도 실패하면 original product state를 반환하므로 partial snapshot이 관찰되지 않는다. 둘 다 성공하면 고정된 command concatenation 순서가 하나뿐이다.

이 정리는 child가 동일 fact의 authority를 공유할 때는 적용되지 않는다. 그런 경우 composite가 그 fact의 유일한 owner가 되어야 한다.

---

## 5. Canonical identity와 공통 failure

### 5.1 Identity

Theory 수준의 `ID`는 opaque equality sort다. TypeScript v1은 다음 contract를 사용한다.

```text
non-empty string
well-formed UTF-16
exact equality
no implicit normalization
explicit maximum code-unit length
```

Canonically equivalent Unicode spelling도 ID로서는 서로 다르다. ID normalization은 identity collision과 state authority 변경을 만들 수 있으므로 금지한다.

### 5.2 Failure class

| 종류 | 예 | 의미 |
|---|---|---|
| Construction error | duplicate ID, cycle, invalid step | model을 만들지 않음 |
| Query absence | missing ID, out-of-bounds cell | 정상적인 `none` observation |
| Transition rejection | stale revision, composition mismatch | state와 command가 모두 불변 |
| Resource rejection | item/row/depth/text ceiling 초과 | typed error, partial allocation 없음 |
| Internal invariant breach | impossible state | library bug; assertion/fail-fast |

이 구분을 하나의 generic `undefined`나 throw에 섞지 않는다.

### 5.3 Resource ceiling

모든 constructor와 transition은 caller-visible ceiling을 가진다.

```text
maxItems
maxRows
maxColumns
maxDepth
maxTextCodeUnits
maxScan
maxCommandsPerTransition
```

Ceiling은 성능 튜닝 값이 아니라 denial-of-service와 accidental unbounded work를 막는 contract다.

---

## 6. `sequence`

### 6.1 의미

`sequence`는 stable identity의 finite strict total order다.

```text
Sequence<ID> = <n, at, indexOf>

at      : Fin(n) → ID
indexOf : ID ⇀ Fin(n)
```

`at`과 `indexOf`는 존재하는 identity에 대해 서로 inverse다.

### 6.2 Kernel observation

```text
size
at(index)
indexOf(id)
```

다음은 derived다.

```text
contains
compare
first
last
next
previous
slice
filter projection
bounded/wrapping movement
```

### 6.3 Laws

```text
indexOf(at(i)) = i
at(indexOf(x)) = x                       if x exists
at is injective
compare(x, x) = 0
filter(filter(S, p), q) = filter(S, p ∧ q)
filter(S, true) = S
```

Navigation은 structure와 policy의 합성이다.

```text
move(S, current, direction, eligible, boundary)
```

- `eligible`은 membership과 별개다.
- `boundary`는 `stop | wrap`이다.
- current 자신은 wrap candidate가 아니다.
- result는 해당 방향에서 첫 eligible identity다.
- candidate가 없으면 `none`이다.

### 6.4 Non-goals

```text
selection
cursor ownership
focus
disabled state authority
reconciliation fallback
virtual loading protocol
```

### 6.5 Error와 cost

```text
construction:
  duplicate ID        error
  invalid ID          error
  maxItems 초과       resource error

query:
  at out of bounds    none
  missing ID          none
```

권장 v1 complexity:

```text
build             O(n)
memory            O(n)
at                O(1)
indexOf           expected O(1) with hash index; O(n) worst-case bounded by maxItems
compare           O(1)
movement          O(k), 0 ≤ k < n
```

`maxScan`이 별도 ceiling보다 작으면 scan이 ceiling에 도달했음을 typed result로 반환해야 한다. 조용히 wrong target을 선택하지 않는다.

### 6.6 Public 유지 증거

Sequence는 one-row grid나 flat tree로 encode할 수 있으므로 formal atom은 아니다. 그러나 sequence를 제거하면 toolbar, tabs, listbox, menu 같은 가장 일반적인 linear domain에 dummy row 또는 virtual hierarchy를 노출한다. 이는 semantic transparency를 악화시킨다. 따라서 `sequence`를 canonical public structure로 유지한다.

---

## 7. `range`

### 7.1 의미

V1 `range`는 **finite quantized affine numeric domain**이다.

```text
Range = <origin, step, count>

step  > 0
count ≥ 0
value(tick) = origin + tick × step
0 ≤ tick ≤ count
```

Authoritative state는 외부 floating value가 아니라 integer `tick`이다.

### 7.2 Kernel observation

```text
count
cardinality = count + 1
lower = value(0)
upper = value(count)
valueAt(tick)
tickOf(onLatticeValue)
```

Derived:

```text
clamp
snap
increment/decrement
page increment/decrement
toRatio
fromRatio
```

### 7.3 Laws

```text
tickOf(valueAt(i)) = i
valueAt(tickOf(v)) = v                    for on-lattice v
clamp(clamp(x)) = clamp(x)
snap(snap(x)) = snap(x)
snap(x) is on lattice
x ≤ y ⇒ clamp(x) ≤ clamp(y)
x ≤ y ⇒ snap(x) ≤ snap(y)                fixed tie policy
toRatio(valueAt(0)) = 0
toRatio(valueAt(count)) = 1              count > 0
fromRatio(toRatio(valueAt(i))) = i
```

Tie policy는 암묵적이어서는 안 된다.

```text
lower
upper
even-tick
```

### 7.4 Exact semantic model과 TypeScript refinement

Proof model은 rational arithmetic을 사용한다. TypeScript implementation은 다음 중 동등한 exact refinement를 사용해야 한다.

```text
scaled safe integers
arbitrary-precision integer rational
검증된 decimal representation
```

V1에서 `number` convenience input을 허용하더라도 constructor는 canonical decimal spelling을 scaled integer로 변환하거나, 동일한 exact contract를 만족하는 방법을 사용해야 한다. 안전한 integer scale을 만들 수 없거나 endpoint가 lattice에 정렬되지 않으면 typed construction error다.

Theory의 canonical constructor는 `origin, step, count`다. `min, max, step` convenience constructor는 다음을 검증한다.

```text
max >= min
step > 0
(max - min) / step is a non-negative integer
all normalized integers remain within declared safe ceiling
```

### 7.5 Cost

```text
storage            O(1)
valueAt/tickOf     O(1)
clamp/snap         O(1)
ratio              O(1)
```

Range를 explicit item array로 materialize하지 않는다.

### 7.6 Public 유지 증거

Finite range는 ordinal과 affine map으로 환원 가능하다. 그러나 public `sequence`만으로 표현하면 numeric metric, quantization, ratio, tie, numeric error가 별도 metadata로 재주입된다. `range`는 독립적인 numeric law density 때문에 canonical public domain으로 유지한다.

---

## 8. `grid`

### 8.1 의미

V1 logical grid는 rectangular finite ordinal product 위의 partial injective occupancy다.

```text
Row    = Fin(rowCount)
Column = Fin(columnCount)
cell   : Row × Column ⇀ ID
```

한 coordinate에는 최대 한 ID, 한 ID에는 최대 한 coordinate가 있다.

Ragged input은 `columnCount = max row width`인 rectangle으로 정규화하고 trailing absence를 empty cell로 표현한다. V1 public observation은 row-local width를 별도 semantic fact로 노출하지 않는다.

### 8.2 Kernel observation

```text
rowCount
columnCount
cellAt(row, column)
positionOf(id)
```

Derived:

```text
row projection      → sequence
column projection   → sequence
left/right/up/down
row start/end
column start/end
```

### 8.3 Laws

```text
positionOf(cellAt(p)) = p                occupied p
cellAt(positionOf(x)) = x                existing x
cell is injective
row projection follows increasing column
column projection follows increasing row
```

Axis navigation은 다음 규칙을 사용한다.

```text
same row or same column only
empty and ineligible cells are skipped
nearest coordinate in requested direction
boundary = stop | wrap-axis
no Euclidean distance
no diagonal candidate
no self result
```

Row-major cross-row movement은 별도 policy다. `right`의 정의에 암묵적으로 섞지 않는다.

### 8.4 Countermodel

다음 두 grid는 nearest directional relation이 같다.

```text
A: a@(0,0), b@(0,1)
B: a@(0,0), b@(0,2)

right(a) = b
left(b)  = a
```

그러나 `cellAt(0,1)`은 다르다. 따라서 relation-only `space`는 absolute coordinate와 gap을 정의하지 못한다. Coordinate를 attribute로 다시 넣으면 이미 grid semantics를 재주입한 것이다.

### 8.5 Non-goals

```text
layout geometry
merged cells
spanning region
visual nearest neighbor
scroll container
focus/selection/edit mode
```

Merged cell이 두 독립 consumer에서 필요하고 region intersection·navigation law가 반복되면 `region-grid` refinement를 연구한다. Base `grid`를 처음부터 일반 region algebra로 만들지 않는다.

### 8.6 Cost

Dense input 기준:

```text
build             O(rows × columns)
memory            O(occupied + rows × columns) 또는 equivalent bounded index
cellAt            O(1)
positionOf        O(1)
axis movement     O(axis length) without neighbor index
```

Sparse input을 받는 구현은 build/memory를 `O(occupied + index)`로 줄일 수 있으나 public observation과 scan ceiling은 동일해야 한다.

---

## 9. `tree`

### 9.1 의미

Public `tree`는 ordered rooted forest다. 여러 root는 internal virtual root의 ordered children으로 본다.

```text
parent   : ID → ID | virtualRoot
children : ID | virtualRoot → Sequence<ID>
```

### 9.2 Laws

```text
one parent per node
no self-parent
acyclic
all nodes reachable from virtual root
roots ordered
siblings ordered
identity appears exactly once
parent/children are mutually consistent
```

### 9.3 Kernel observation

```text
roots
parentOf
childrenOf
```

Derived:

```text
isLeaf
depth
ancestors
descendants
preorder
postorder
```

### 9.4 Expansion과 visible projection

Expansion은 tree 구조가 아니다.

```text
Expansion<Tree> = finite set of branch IDs
```

Normalization:

```text
missing ID 제거
leaf ID 제거
```

Visible preorder는 다음 projection이다.

```text
visible : Tree × Expansion → Sequence<ID>
```

Node는 모든 proper ancestor가 expanded일 때만 visible하다. Root는 항상 visible하다.

### 9.5 Visible projection 정리

모든 valid ordered forest와 normalized expansion에 대해:

1. Visible identity는 중복되지 않는다.
2. Visible sequence는 full preorder의 subsequence다.
3. Visible child보다 parent가 먼저 나타난다.
4. `x`의 visibility는 `x`의 ancestor expansion에만 의존한다.
5. Expanded leaf를 제거해도 projection이 변하지 않는다.

증명은 forest에 대한 구조적 귀납으로 얻는다. 각 node를 한 번 emit하고, expanded branch일 때만 ordered children에 같은 절차를 적용하므로 uniqueness와 preorder가 보존된다. Descendant 재귀 진입 조건이 해당 ancestor의 expansion뿐이므로 4가 성립한다.

### 9.6 Countermodel

다음 두 model은 parent relation이 같다.

```text
parent(b) = a
parent(c) = a
```

그러나 sibling order가 다르다.

```text
[a: b, c]
[a: c, b]
```

Preorder와 visible next/previous가 달라진다. 따라서 parent-only relation은 ordered tree를 정의하지 못한다.

### 9.7 Non-goals

```text
expansion authority
visible cache authority
cursor
selection
focus
multiple parent
cycle
```

### 9.8 Cost

```text
build/validate      O(n)
memory              O(n)
parentOf            O(1)
childrenOf          O(1) + output
isLeaf              O(1)
depth               O(h) unless cached
preorder            O(n)
visible projection  O(v + pruned branch checks), bounded by O(n)
```

Depth ceiling을 constructor에서 검증한다.

---

## 10. `cursor`

### 10.1 의미

Cursor는 logical current identity다.

```text
Cursor<ID> = ID | none
```

Valid state는 current가 현재 domain에 있거나 `none`인 상태다. Cursor는 selection과 focus를 소유하지 않는다.

### 10.2 Reconciliation

Domain 교체 시 fallback은 policy다.

```text
preserve-or-none
preserve-or-first
preserve-or-last
explicit caller policy
```

`nearest`는 이전/새 domain의 의미를 요구하므로 generic default가 아니다.

### 10.3 Public 지위

Cursor theory는 구현에 필요하지만 V1에서 별도 public subpath로 승격하지 않는다. `sequence`, `grid`, `tree` composite가 동일 contract를 반복하고 두 독립 consumer가 직접 cursor reducer를 요구할 때 승격한다.

---

## 11. `selection`

### 11.1 Focus와 selection 분리

APG keyboard guidance는 focus와 selection이 구별되는 상태라고 명시한다.[R13] 따라서 cursor 이동과 selection 변경을 하나의 primitive fact로 합치지 않는다. `selection-follows-focus`는 policy다.

### 11.2 State

```text
Selection<ID> = {
  selected: finite set<ID>
  anchor: ID | none
}

mode = single | multiple
```

- `single`은 cardinality `0..1`이다.
- `multiple`은 finite subset이다.
- `anchor`는 ordered range extension의 origin이다.
- active/focus edge는 cursor가 소유한다.

### 11.3 Laws

```text
selected ⊆ domain
single ⇒ |selected| ≤ 1
set(x) is idempotent
toggle(toggle(S, x), x) = S             multiple mode
clear(clear(S)) = clear(S)
range(anchor, extent) is contiguous      sequence domain
reconcile(reconcile(S, D), D) = reconcile(S, D)
identity renaming commutes with every operation
```

### 11.4 Controlled snapshot

Invalid single-selection snapshot에 여러 ID가 들어오면 first item으로 조용히 줄이지 않는다. Typed invalid-state error다. Domain 변경으로 사라진 identity는 intersection으로 제거하고, 사라진 anchor는 clear한다.

### 11.5 Public 지위

Selection은 독립 theory로 확정한다. Public subpath 이름은 승격 시 `selection`이다. 실제 export는 두 독립 consumer가 같은 reducer를 요구하고 operation surface가 안정된 뒤 수행한다. 이 사용 증거 조건은 이론적 미완료가 아니라 public surface 관리 정책이다.

---

## 12. `expansion`

Expansion은 tree node의 open state다.

```text
Expansion<Tree> = subset(branchIDs(Tree))
```

Laws:

```text
toggle is involutive
setOpen is idempotent
reconcile is intersection with branch IDs
visible(Tree, reconcile(E)) = visible(Tree, E)
  when E differs only by missing/leaf IDs
```

별도 public subpath로 만들지 않는다. Tree view, disclosure tree, treegrid에서 동일 reducer가 직접 재사용된다는 증거가 생기면 `expansion` 승격을 검토한다.

---

## 13. `text`

### 13.1 지위

Text는 `sequence<character>`의 편의 wrapper가 아니다. 다음 독립 law를 갖는다.

```text
UTF-16 well-formedness
explicit offset unit
surrogate safety
replace algebra
selection direction
composition baseline
normalization boundary
grapheme segmentation version
```

따라서 독립 data/editing theory로 확정한다. Public 승격 시 이름은 단순히 `text`다.

### 13.2 Plain-text carrier

```text
PlainText = well-formed UTF-16 string
```

ECMAScript String은 UTF-16 code-unit sequence이며 lone surrogate를 포함할 수 있으므로, core carrier는 별도로 well-formedness를 검증해야 한다.[R23]

### 13.3 Offset와 selection

```text
TextOffset = UTF-16 code-unit offset
```

모든 public field 이름은 단위를 드러낸다.

```text
anchorCodeUnitOffset
focusCodeUnitOffset
startCodeUnitOffset
endCodeUnitOffset
```

Valid offset:

```text
0 ≤ offset ≤ codeUnitLength
code-point boundary
surrogate pair 내부가 아님
```

Selection은 anchor와 focus를 보존한다. `start`, `end`, `direction`은 derived observation이다. Selection API도 anchor/focus와 direction을 별도 개념으로 다룬다.[R17]

### 13.4 Replace algebra

```text
replace(text, start, end, inserted)
```

Laws:

```text
replace(t, a, b, slice(t, a, b)) = t
length(result)
  = length(t) - (b-a) + length(inserted)

removed = slice(t, a, b)
r = replace(t, a, b, inserted)
replace(r, a, a+length(inserted), removed) = t
```

모든 길이는 UTF-16 code units다.

### 13.5 Composition model

Active composition은 다음 정보를 보존한다.

```text
baseline snapshot
replacement range in baseline coordinates
full current composing text
selection in projected text coordinates
```

Projected text:

```text
baseline[0:start]
+ composing
+ baseline[end:]
```

Operations:

```text
composition.start
composition.update
composition.commit
composition.cancel
```

Laws:

```text
update는 previous composing text에 append하지 않음
update는 baseline replacement를 새 full composing text로 다시 계산함
cancel(start(baseline, ...), any updates) = baseline
commit(update(..., final))
  = replace(baseline, range, final composing text)
commit/cancel 후 active composition 없음
active composition 없는 update/commit/cancel은 rejection
stale revision은 rejection
```

Composition start 시 선택 영역의 원문을 baseline에 보존하므로 cancel이 정확히 복원된다. `prefix/suffix/composing` 세 문자열만 저장하는 model은 교체된 선택 원문을 잃어 cancel을 구현할 수 없다.

### 13.6 Normalization

Core editing은 implicit NFC/NFD normalization을 수행하지 않는다.

이유:

1. Unicode normalization은 canonical equivalence를 다루지만 concatenation에 대해 단순 폐쇄적이지 않다.[R18]
2. Normalization은 code-unit length와 offset을 바꿀 수 있다.
3. Composition 중 normalize하면 host selection과 active passage mapping이 달라질 수 있다.
4. ID, user text, search key는 서로 다른 normalization policy가 필요하다.

Normalization은 explicit operation 또는 search/index boundary policy다. Typeahead index는 committed text를 별도 normalized key로 만들 수 있지만 editing state의 원문 authority를 바꾸지 않는다.

### 13.7 Grapheme

Caret movement와 user-perceived deletion은 extended grapheme cluster가 필요하다. Unicode Text Segmentation은 versioned algorithm이며 새 Unicode version에서 property와 rule이 달라질 수 있다.[R19]

따라서 V1 core는 다음을 직접 약속하지 않는다.

```text
movePreviousGrapheme
deleteBackwardGrapheme
word navigation
visual line navigation
```

이 operation은 다음 capability가 준비된 후 추가한다.

```text
SegmenterCapability = {
  unicodeVersion
  localePolicy
  boundaries(text) -> ordered code-unit offsets
  complexity/resource contract
}
```

Host `Intl.Segmenter`를 사용할 수 있지만 core semantics가 engine의 숨은 Unicode data version에 의존하지 않도록 capability version을 명시한다.

### 13.8 Field semantics와 host I/O 분리

Text theory가 소유하지 않는 것:

```text
DOM input/textarea
native IME
CLI stdin/stdout
clipboard
spellcheck/autocorrect
parse/format
email/number/domain validation
submit/blur commit
visual caret geometry
```

IME composition commit은 field submit/commit과 다른 의미다.

### 13.9 Cost

```text
selection observation       O(1)
replace                     O(result code units)
composition update          O(projected code units)
commit                      O(1) if snapshot reused, otherwise implementation-dependent
cancel                      O(1) if baseline persistent
normalization               explicit operation, O(text length)
segmentation                capability contract
```

Persistent rope/gap-buffer는 representation 선택이며 public `text` theory가 아니다. 첫 reference model은 immutable string으로 충분하다.

---

## 14. Composite behavior 검증

### 14.1 Listbox

```text
sequence
× cursor
× selection
× eligibility policy
× selection-follows-focus policy
× focus command
```

Cursor와 selection은 별도 authority다. 이동 후 selection 변경 여부는 policy다.

### 14.2 Slider

```text
range
× tick state
× increment/page policy
× announce/focus command
```

Text draft와 parse/format은 spinbutton composite에서만 추가한다.

### 14.3 Calendar

```text
grid
× cursor
× selection
× date projection/arithmetic policy
× eligibility policy
× focus command
```

Date arithmetic은 `grid`가 소유하지 않는다.

### 14.4 Tree view

```text
tree
× expansion
× visible projection
× cursor
× selection
× focus command
```

Up/down은 visible sequence navigation, right/left는 expansion/parent policy다.

### 14.5 Combobox

```text
text
× popup state
× one choice structure(sequence | grid | tree)
× cursor
× selection
× filter/typeahead policy
× focus/accept command
```

Active composition 중 candidate accept는 rejection하거나 adapter가 composition을 먼저 명시적으로 commit/cancel해야 한다. Composing text를 committed filter query로 암묵적으로 사용하지 않는다.

### 14.6 Treegrid

```text
tree row hierarchy
× grid column/cell structure
× expansion
× cursor
× selection
× edit mode
```

Tree와 grid를 하나의 hybrid primitive로 합치지 않는다. Composite가 row identity와 cell coordinate 사이의 authoritative mapping을 소유한다.

---

## 15. Pattern coverage

WAI-ARIA APG의 현재 pattern index에는 30개 pattern이 있다.[R12] 이 corpus는 formal completeness proof가 아니라, 실제 accessible interaction vocabulary에 대한 external coverage check다.

검증에서는 각 pattern을 다음 category로 분해했다.

```text
canonical structure
state/data theory
policy/capability
machine
command
static semantics
```

결과:

```text
unclassified pattern = 0
```

`Combobox`는 sequence, grid, tree를 동시에 요구한다는 뜻이 아니다. Popup choice surface가 listbox(sequence), grid, tree 중 하나인 variant다.

Structural occurrence count는 corpus 분류의 단순 빈도이며 수학적 중요도 순위가 아니다.

```text
sequence  11
grid       3
tree       2
range      5
```

APG는 focus와 selection, tree expansion, grid navigation, range state, combobox text/popup이 별도 interaction fact임을 확인하는 데 유용하다.[R13][R14][R15][R16]

---

## 16. 적대적 corpus와 최종 처리

| 사례 | 결과 | 현재 처리 |
|---|---|---|
| Geometry-based spatial navigation | grid axis law로 환원 불가 | adapter capability; scope 밖 |
| Arbitrary graph | canonical direction/order 없음 | scope 밖; 조건부 future theory |
| Multiple-parent DAG | tree single-parent law 위반 | scope 밖 |
| Merged cell | one-coordinate occupancy 위반 | future `region-grid` refinement trigger |
| Multi-thumb slider | 새 structure 불필요 | sequence of thumbs + range + constraint |
| Cyclic order | 새 structure 불필요 | sequence + wrap policy |
| Virtualized finite list | 새 structure 불필요 | conceptual sequence + access/revision/request capability |
| Genuinely unbounded stream | finite sequence law 밖 | future stream theory trigger |
| Rich text | plain-text carrier로 환원 불가 | separate document theory |
| Async stale update | structure 문제 아님 | revisioned machine |
| Concurrent multi-writer | single-authority reducer 밖 | future synchronization protocol |
| CRDT editing | sequential text theory 밖 | separate scope |

이 corpus에서 현재 scope 안에 있으면서 새로운 canonical public structure를 요구하는 반례는 발견되지 않았다.

---

## 17. 증명 결과

### 17.1 Sequence embedding

모든 finite sequence `S = [x0, …, xn-1]`에 대해:

```text
Grid(S): cell(0, i) = xi
Tree(S): virtualRoot children = S, every xi is leaf
```

각각 row projection과 root children projection으로 `S`를 정확히 복원한다. 따라서 sequence는 형식적 원자가 아니다.

### 17.2 Range affine isomorphism

`origin`, positive `step`, non-negative `count`에 대해:

```text
f(i) = origin + i × step
```

은 `Fin(count+1)`과 lattice value set 사이의 bijection이다. Inverse는:

```text
g(v) = (v-origin)/step
```

이다. 따라서 finite quantized range는 ordinal과 affine interpretation으로 환원된다.

### 17.3 Grid coordinate non-definability

앞의 A/B countermodel은 directional reduct가 동일하지만 `cellAt(0,1)` observation이 다르다. 따라서 absolute coordinate는 directional relation에서 definable하지 않다.

### 17.4 Tree sibling-order non-definability

Parent reduct가 같은 두 ordered tree가 다른 preorder를 갖는다. 따라서 sibling order는 parent relation에서 definable하지 않다.

### 17.5 Selection normalization

Valid selection `S`와 domain `D`에 대해 reconciliation을 set intersection과 anchor membership으로 정의하면:

```text
reconcile(reconcile(S,D),D) = reconcile(S,D)
```

은 set intersection idempotence로 바로 따른다. Single mode에서 invalid multi-item controlled snapshot은 reconciliation 대상이 아니라 validation error다.

### 17.6 Text composition theorem

Baseline을 `(P + X + Q)`로, replacement range가 `X`, current composition이 `C`라고 하자.

```text
projected = P + C + Q
```

Update가 항상 같은 baseline/range에서 `C`만 교체하므로 마지막 update `Cf` 뒤 commit 결과는 정확히 `P + Cf + Q`다. Cancel은 저장된 baseline snapshot을 반환하므로 update 횟수와 무관하게 original text와 selection을 복원한다.

### 17.7 Revision theorem

Revision `r`의 state에서 expected revision이 `r`이 아닌 input은 state를 계산하지 않고 reject한다. Accepted input만 `r+1`을 만든다. 따라서 동일 old revision으로 재전송된 input은 첫 accepted input 이후 stale이 되며 중복 적용되지 않는다.

---

## 18. 실행 검증

### 18.1 검증 성격

증거를 다음처럼 구분한다.

```text
Constructive proof/countermodel
  일반 명제를 직접 지지하거나 가설을 즉시 반증

Bounded exhaustive verification
  명시된 finite scope 안에서는 모든 model/trace 검사

Deterministic random differential stress
  더 큰 model에서 independent oracle과 비교

Corpus coverage
  실제 pattern vocabulary에 대한 경험적 검증
```

Bounded checker에서 반례가 없다는 사실은 모든 크기의 수학적 증명이 아니다. Alloy의 small-scope 분석도 동일한 한계를 가진다.[R9] 반대로 하나의 concrete countermodel은 보편 명제를 폐기하는 데 충분하다.

### 18.2 실행 환경과 재현성

```text
language             Python 3.13 standard library only
seed                 0x5EC71E
run 1 SHA-256        774d1f79119a212b0798245d7ce4e59542954a67f37f7bb15f927d240cf0b7ec
run 2 SHA-256        774d1f79119a212b0798245d7ce4e59542954a67f37f7bb15f927d240cf0b7ec
result               byte-for-byte identical
wall time            approximately 28 seconds
peak RSS             approximately 117 MB
verifier SHA-256     83ffb6798c61a295d409dd5327512d8fff691ac89c857bb8aa0fa775fd3fb584
```

### 18.3 결과 요약

Grid와 tree 검사는 identity-renaming equivariance를 이용해 canonical labeling으로 대칭을 제거했다. 따라서 아래 model 수는 임의 label permutation을 중복 집계하지 않는다.

```text
Sequence
  all permutations through cardinality 7              5,914 models
  movement cases                                      14,344
  projection cases                                       511

Range
  unique exact rational configurations                  4,784
  tick/value/ratio exact laws                          33,488
  snap cases                                          243,984
  monotonic cases                                      76,544

Grid
  all occupancy subsets for 0..3 × 0..3 boxes            689 models
  inverse cases                                         2,753
  row/column projection cases                           3,880
  movement cases                                      554,536
  coordinate countermodel                              found

Tree
  canonical topologically numbered forests, n ≤ 6       11,465
  node/acyclic cases                                    67,567
  expansion cases                                       23,810
  visibility cases                                     139,531
  sibling-order countermodel                            found

Cursor and selection
  cursor cases                                             162
  selection/reconciliation cases                         9,546
  invalid single snapshots                                 466
  interval cases                                           204
  identity-renaming equivariance cases                  695,483

Text
  representative Unicode strings                            24
  replace roundtrips                                      2,355
  selection direction cases                                243
  composition start/update/commit/cancel cases           54,675
  canonical-equivalence/no-normalization witnesses             2

Composite machines
  listbox transitions                                    30,885
  slider transitions                                      8,220
  tree-view transitions                                 169,835
  revision wrapper cases                                    124
  combobox authority cases                                   15

Deterministic stress
  sequence                                                2,000
  range                                                   2,000
  grid                                                    2,000
  tree                                                    2,000
  text                                                    2,000
  listbox transitions                                    50,000

Coverage
  APG patterns                                               30
  unclassified                                                0
```

### 18.4 검증한 핵심 property

```text
bijection and inverse observation
identity-renaming equivariance
projection order preservation
bounded/wrap navigation oracle equivalence
exact range lattice and ratio roundtrip
snap idempotence and monotonicity
grid position/cell inverse
axis navigation
ordered forest acyclicity and codec roundtrip
visible ancestor predicate
selection mode/cardinality/domain invariant
text well-formedness and surrogate boundary
replace length and inverse law
composition baseline, update replacement, commit, cancel
machine determinism
failure atomicity
stale revision rejection
command ordering
representative composite state invariant
```

### 18.5 남은 검증의 지위

다음은 theory 연구가 아니라 production implementation이 생긴 뒤 수행할 refinement gate다.

```text
TypeScript reference implementation ↔ mathematical model differential
optimized implementation ↔ reference implementation differential
actual complexity instrumentation
mutation testing
public signature stability
consumer integration
cross-runtime adapter conformance
```

---

## 19. Public promotion rule

새 public primitive 또는 subpath는 다음을 모두 제출한다.

```text
scope and non-goals
carrier and valid model
kernel observations
laws and countermodels
error semantics
resource ceiling
complexity contract
reference model
bounded/property/differential tests
composition points
two independent consumer or adapter witnesses
```

반려:

```text
함수 묶음일 뿐 독립 law가 없음
하나의 consumer만 필요함
기존 theory에 target callback을 추가한 wrapper임
host event 이름을 core event로 그대로 노출함
다른 primitive와 동일 authority를 소유함
resource/cost contract가 없음
```

현재 판정:

| Theory | 형식 지위 | Public 지위 |
|---|---|---|
| `sequence` | 완료 | 즉시 구현·rename 가능 |
| `range` | 완료 | 즉시 구현 가능 |
| `grid` | 완료 | 즉시 구현·rename 가능 |
| `tree` | 완료 | 즉시 구현·rename 가능 |
| `cursor` | 완료 | internal first |
| `selection` | 완료 | implementation 가능, export는 usage evidence 후 |
| `expansion` | 완료 | tree composite internal first |
| `text` | 완료 | reference implementation 가능, export는 adapter/consumer evidence 후 |
| `machine` | 완료 | formal/runtime protocol, public data subpath 아님 |

---

## 20. 구현 순서

### Phase 1 — 공통 foundation

```text
typed Result/error
well-formed stable string ID
resource ceiling helpers
revision envelope
law registry
```

### Phase 2 — canonical structures

```text
1. sequence reference model
2. sequence indexed implementation
3. range exact tick model
4. grid reference model
5. grid indexed implementation
6. tree reference model
7. tree indexes and visible projection
```

각 단계는 reference/optimized differential test를 통과한 뒤 다음으로 간다.

### Phase 3 — state/data

```text
cursor
selection
expansion
text carrier and replace
text composition reducer
```

### Phase 4 — executable composites

```text
listbox
slider
calendar
tree view
combobox
```

이들은 public widget package가 아니라 theory composition 검증용 reference behavior다.

### Phase 5 — runtime/service

Pure reducer와 revision wrapper가 실제 두 adapter에서 검증된 후에만 stateful service wrapper를 검토한다. Reducer semantics를 변경하지 않고 감싸야 한다.

### Phase 6 — migration

```text
collection          → sequence
matrix-navigation   → grid
tree-collection     → tree
range               → range
```

아직 stable public release 전이라면 compatibility alias를 남기지 않는다. Root export와 subpath export, 문서, tests, stability fingerprint를 한 transaction으로 변경한다.

---

## 21. 반증 조건과 scope extension trigger

현재 결론은 다음 관찰이 발생하면 수정한다.

### 21.1 `graph`

다음이 모두 충족될 때 연구한다.

```text
독립 consumer 2곳 이상
single-parent tree와 logical grid로 표현 불가
canonical neighbor/path observation 존재
arbitrary callback 없이 law 명세 가능
독립 cost/error contract 존재
```

### 21.2 `geometry`

```text
renderer 외 core consumer가 geometry snapshot을 직접 소유
서로 다른 host에서 동일 deterministic geometry law 반복
scroll/layout와 분리 가능한 canonical observation 존재
```

### 21.3 `region-grid`

```text
merged/spanning cell이 두 consumer에서 필수
region overlap, anchor, navigation law 반복
single-coordinate projection으로 정보 손실 발생
```

### 21.4 `stream`

```text
finite snapshot sequence로 환원 불가
끝 없음 또는 time-indexed observation이 본질적
backpressure/cancellation law가 독립적
```

### 21.5 `document`

```text
plain text replace로 표현 불가한 nested block/inline structure
format span과 content identity가 authoritative
selection이 tree/text product 이상을 요구
```

### 21.6 현재 structure 제거

해당 public structure를 제거하려면 모두 입증해야 한다.

```text
다른 public theory로 accidental data 없이 정의 가능
canonical observation과 error 완전 보존
asymptotic cost 보존
consumer API가 더 단순해짐
실제 사용처에 dummy row/root/codec이 노출되지 않음
```

현재 네 structure 중 이 조건을 만족하는 제거 후보는 없다.

---

## 22. 최종 결론

### 22.1 연구 질문의 답

```text
sequence / range / grid / tree가 절대 최소 기저인가?
  아니다.

더 작은 space/graph 하나가 정답인가?
  아니다. target semantics를 다시 주입하는 encoding이 된다.

네 structure는 유지해야 하는가?
  그렇다. 현재 scope의 canonical public vocabulary다.

전체 interaction은 네 structure만으로 충분한가?
  아니다. cursor, selection, expansion, text, policy, command가 독립적이다.

이론 정립은 구현을 시작할 수준으로 완료됐는가?
  그렇다. 현재 scope에서 public boundary를 바꿀 조사 blocker가 없다.

향후 연구가 완전히 영원히 불필요한가?
  아니다. scope가 확장되거나 명시된 counterexample이 나타날 때 재개한다.
```

### 22.2 최종 구조

```text
Specification calculus
        ↓
sequence · range · grid · tree
        +
cursor · selection · expansion · text
        +
explicit policies · ordered commands
        ↓
deterministic revisioned transaction
        ↓
composite behavior
        ↓
adapter / renderer / host
```

### 22.3 최종 한 문장

> Sectile은 유일한 최소 package 집합이 아니라, canonical semantic theory와 그 법칙을 보존하는 합성 체계를 제공한다.

이 문서 승인 이후의 다음 작업은 추가 foundational research가 아니라 **reference implementation 작성**이다.

---

## 부록 A. Normative law registry

### A.1 Sequence

```text
SEQ-01 indexOf(at(i)) = i
SEQ-02 at(indexOf(x)) = x for existing x
SEQ-03 at is injective
SEQ-04 filter identity
SEQ-05 filter composition
SEQ-06 movement returns first eligible directional candidate
SEQ-07 stop never crosses boundary
SEQ-08 wrap never returns current as its own successor
SEQ-09 identity renaming commutes with observations
```

### A.2 Range

```text
RNG-01 tick/value inverse
RNG-02 clamp idempotence
RNG-03 snap idempotence
RNG-04 snap closure
RNG-05 clamp monotonicity
RNG-06 snap monotonicity under fixed tie policy
RNG-07 endpoint ratio
RNG-08 ratio/tick roundtrip
RNG-09 O(1) intensional representation
```

### A.3 Grid

```text
GRD-01 cell/position inverse
GRD-02 coordinate injectivity
GRD-03 row projection order
GRD-04 column projection order
GRD-05 axis-only direction
GRD-06 nearest eligible coordinate
GRD-07 explicit boundary policy
GRD-08 no geometry dependence
GRD-09 identity renaming invariance
```

### A.4 Tree

```text
TRE-01 single parent
TRE-02 acyclic
TRE-03 total reachability from virtual root
TRE-04 ordered roots and siblings
TRE-05 identity uniqueness
TRE-06 parent/children consistency
TRE-07 visible uniqueness
TRE-08 visible preorder subsequence
TRE-09 ancestor-based visibility
TRE-10 expansion reconciliation
```

### A.5 Cursor

```text
CUR-01 current ∈ domain or none
CUR-02 preserve existing current
CUR-03 fallback explicit
CUR-04 reconciliation idempotent
```

### A.6 Selection

```text
SEL-01 selected subset of domain
SEL-02 single cardinality ≤ 1
SEL-03 set idempotent
SEL-04 multiple toggle involutive
SEL-05 clear idempotent
SEL-06 range contiguous in sequence order
SEL-07 reconciliation idempotent
SEL-08 identity renaming equivariant
SEL-09 focus/cursor authority separate
```

### A.7 Text

```text
TXT-01 well-formed UTF-16
TXT-02 explicit code-unit offsets
TXT-03 surrogate boundary safety
TXT-04 replace length law
TXT-05 replace inverse law
TXT-06 anchor/focus preservation
TXT-07 no implicit normalization
TXT-08 composition baseline invariant
TXT-09 update replaces full active passage
TXT-10 commit promotes projection
TXT-11 cancel restores baseline
TXT-12 stale/invalid composition rejection
TXT-13 grapheme operation requires versioned capability
```

### A.8 Machine

```text
MAC-01 determinism
MAC-02 purity
MAC-03 atomic commit
MAC-04 failure atomicity
MAC-05 ordered commands
MAC-06 accepted input increments revision exactly once
MAC-07 stale input leaves state/revision/commands unchanged
MAC-08 bounded work
MAC-09 disjoint authority for product composition
```

---

## 부록 B. APG decomposition corpus

| Pattern | Structure | State/data | Policy/capability | Command/static |
|---|---|---|---|---|
| Accordion | sequence | expansion, cursor | activation | focus |
| Alert | — | — | — | announce |
| Alert and Message Dialogs | — | popup | modality | focus, announce |
| Breadcrumb | sequence | — | — | navigate |
| Button | — | pressed/activation | activation | invoke |
| Carousel | sequence | cursor | rotation | focus, announce |
| Checkbox | — | selection/checked | tri-state optional | — |
| Combobox | sequence or grid or tree | text, popup, cursor, selection | filter, autocomplete | focus, accept |
| Dialog | — | popup | modality | focus |
| Disclosure | — | expansion | — | — |
| Feed | sequence | cursor, revision | access/loading | request, scroll |
| Grid | grid | cursor, selection, edit mode | eligibility | focus, scroll |
| Landmarks | — | — | — | static semantics |
| Link | — | — | — | navigate |
| Listbox | sequence | cursor, selection | eligibility, typeahead | focus |
| Menu and Menubar | sequence | cursor, popup | orientation | focus, invoke |
| Menu Button | sequence | popup, cursor | activation | focus, invoke |
| Meter | range | value | formatting | static semantics |
| Radio Group | sequence | cursor, selection | selection-follows-focus | focus |
| Slider | range | tick/cursor | increment | focus, announce |
| Slider Multi-Thumb | sequence, range | multiple ticks, cursor | cross-thumb constraint | focus, announce |
| Spinbutton | range | text, tick | parse, format, validation | focus, announce |
| Switch | — | selection/checked | — | — |
| Table | grid | — | — | static semantics |
| Tabs | sequence | cursor, selection | activation | focus |
| Toolbar | sequence | cursor | orientation | focus |
| Tooltip | — | popup | delay | announce |
| Tree View | tree | expansion, cursor, selection | eligibility, typeahead | focus |
| Treegrid | tree, grid | expansion, cursor, selection, edit mode | eligibility | focus, scroll |
| Window Splitter | range | tick/cursor | increment | focus, announce |

---

## 부록 C. Verification result

```json
{
  "coverage": {
    "patterns": 30,
    "structuralUsage": {
      "grid": 3,
      "range": 5,
      "sequence": 11,
      "tree": 2
    },
    "unclassified": []
  },
  "cursorSelection": {
    "cursorCases": 162,
    "intervalCases": 204,
    "invalidSnapshotCases": 466,
    "renamingCases": 695483,
    "selectionCases": 9546
  },
  "grid": {
    "coordinateCountermodel": true,
    "inverseCases": 2753,
    "models": 689,
    "movementCases": 554536,
    "projectionCases": 3880
  },
  "machine": {
    "comboboxCases": 15,
    "listboxStatesExplored": 9034,
    "listboxTracePrefixes": 30885,
    "listboxTransitions": 30885,
    "revisionCases": 124,
    "sliderStatesExplored": 1655,
    "sliderTransitions": 8220,
    "treeViewStatesExplored": 73649,
    "treeViewTransitions": 169835
  },
  "randomStress": {
    "gridCases": 2000,
    "machineTransitions": 50000,
    "rangeCases": 2000,
    "seed": 6211358,
    "sequenceCases": 2000,
    "textCases": 2000,
    "treeCases": 2000
  },
  "range": {
    "configurations": 4784,
    "exactLawCases": 33488,
    "monotonicCases": 76544,
    "snapCases": 243984
  },
  "sequence": {
    "embeddingModels": 5914,
    "inverseModels": 5914,
    "movementCases": 14344,
    "projectionCases": 511
  },
  "text": {
    "compositionCases": 54675,
    "normalizationCases": 2,
    "replaceCases": 2355,
    "selectionCases": 243,
    "strings": 24
  },
  "tree": {
    "expansionCases": 23810,
    "models": 11465,
    "nodeCases": 67567,
    "siblingOrderCountermodel": true,
    "visibilityCases": 139531
  }
}
```

---

## 부록 D. Reproducible verifier

아래 verifier는 Python 표준 라이브러리만 사용한다. Production implementation을 검증하는 코드가 아니라, 이 문서의 reference theory와 bounded/stress claims를 재현하는 독립 model checker다.

```python
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
class RevisionedResult:
    envelope: RevisionedListbox
    commands: tuple[tuple[str, Optional[int]], ...]
    error: Optional[str] = None


def revisioned_listbox_step(
    domain: SequenceModel,
    eligible: frozenset[int],
    envelope: RevisionedListbox,
    expected_revision: int,
    event: str,
    selection_follows_focus: bool,
    boundary: str,
) -> RevisionedResult:
    if expected_revision != envelope.revision:
        return RevisionedResult(envelope, (), "stale-revision")
    result = listbox_step(
        domain,
        eligible,
        envelope.state,
        event,
        selection_follows_focus,
        boundary,
    )
    if result.error is not None:
        return RevisionedResult(envelope, (), result.error)
    # Every accepted semantic input advances the revision, including lawful
    # no-ops at a boundary. This gives adapters a total order for stale-input
    # rejection without leaking host event ordering into the core.
    return RevisionedResult(
        RevisionedListbox(envelope.revision + 1, result.state),
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
            assert stale.envelope == base and stale.commands == ()
            revision_cases += 1

            failed = revisioned_listbox_step(domain, eligible, base, 7, "toggle", False, "stop")
            assert failed.error == "no-cursor"
            assert failed.envelope == base and failed.commands == ()
            revision_cases += 1

            accepted = revisioned_listbox_step(domain, eligible, base, 7, "next", False, "stop")
            assert accepted.error is None
            assert accepted.envelope.revision == 8
            repeated_old = revisioned_listbox_step(
                domain,
                eligible,
                accepted.envelope,
                7,
                "next",
                False,
                "stop",
            )
            assert repeated_old.error == "stale-revision"
            assert repeated_old.envelope == accepted.envelope and repeated_old.commands == ()
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
```

---

## 참고문헌

[R1] Barbara Liskov and Stephen Zilles. “Programming with Abstract Data Types.” SIGPLAN Symposium on Very High Level Languages, 1974. https://doi.org/10.1145/800233.807045

[R2] Rod Burstall and Joseph Goguen. “Putting Theories Together to Make Specifications.” IJCAI, 1977. https://www.ijcai.org/Proceedings/77-2/Papers/095.pdf

[R3] Joseph Goguen and Rod Burstall. “Institutions: Abstract Model Theory for Specification and Programming.” Journal of the ACM 39(1), 1992. https://doi.org/10.1145/147508.147524

[R4] Thomas William Barrett and Hans Halvorson. “Morita Equivalence.” The Review of Symbolic Logic 9(3), 2016. https://doi.org/10.1017/S1755020316000186

[R5] J. J. M. M. Rutten. “Universal Coalgebra: A Theory of Systems.” Theoretical Computer Science 249(1), 2000. https://doi.org/10.1016/S0304-3975(00)00056-6

[R6] Michael Abbott, Thorsten Altenkirch, and Neil Ghani. “Containers: Constructing Strictly Positive Types.” Theoretical Computer Science 342(1), 2005. https://doi.org/10.1016/j.tcs.2005.06.002

[R7] Andrey Mokhov. “Algebraic Graphs with Class.” Haskell Symposium, 2017. https://doi.org/10.1145/3122955.3122956

[R8] Koen Claessen and John Hughes. “QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs.” ICFP, 2000. https://doi.org/10.1145/357766.351266

[R9] Alloy Project. “Small Scope Analysis.” https://alloytools.org/tutorials/online/maintext-FS-1.html

[R10] Leslie Lamport. Specifying Systems: The TLA+ Language and Tools for Hardware and Software Engineers. 2002. https://lamport.azurewebsites.net/tla/book.html

[R11] Yuan Yu, Panagiotis Manolios, and Leslie Lamport. “Model Checking TLA+ Specifications.” CHARME, 1999. https://www.microsoft.com/en-us/research/publication/model-checking-tla-specifications/

[R12] W3C WAI. “ARIA Authoring Practices Guide — Patterns.” https://www.w3.org/WAI/ARIA/apg/patterns/

[R13] W3C WAI. “Developing a Keyboard Interface — Focus vs Selection.” https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/

[R14] W3C WAI. “Listbox Pattern.” https://www.w3.org/WAI/ARIA/apg/patterns/listbox/

[R15] W3C WAI. “Grid Pattern.” https://www.w3.org/WAI/ARIA/apg/patterns/grid/

[R16] W3C WAI. “Tree View Pattern.” https://www.w3.org/WAI/ARIA/apg/patterns/treeview/

[R17] W3C. “Selection API.” https://www.w3.org/TR/selection-api/

[R18] Unicode Consortium. “Unicode Standard Annex #15: Unicode Normalization Forms.” https://www.unicode.org/reports/tr15/

[R19] Unicode Consortium. “Unicode Standard Annex #29: Unicode Text Segmentation.” https://www.unicode.org/reports/tr29/

[R20] W3C. “UI Events.” https://www.w3.org/TR/uievents/

[R21] W3C. “Input Events Level 2.” https://www.w3.org/TR/input-events-2/

[R22] W3C. “CSS Spatial Navigation Level 1.” https://www.w3.org/TR/css-nav-1/

[R23] Ecma International. “ECMAScript Language Specification — String Values and Well-Formed Unicode Strings.” https://tc39.es/ecma262/

[R24] W3C WAI. “Combobox Pattern.” https://www.w3.org/WAI/ARIA/apg/patterns/combobox/

[R25] W3C WAI. “Slider Multi-Thumb Pattern.” https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/

[R26] W3C WAI. “Treegrid Pattern.” https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/
