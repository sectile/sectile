# Tabular

`@sectile/tabular`는 렌더러와 무관한 표 형식 데이터 상호작용 계층입니다.
행·열·셀 ID, 질의와 소스 revision, 열 상태, 선택, 그룹화, 집계, pivot,
cursor, 편집 의도를 관리합니다. DOM 측정과 렌더링, 네트워크 전송,
loading·empty·error 화면은 관리하지 않습니다.

```sh
pnpm add @sectile/tabular
```

런타임 API는 용도별 subpath에서 가져옵니다. 패키지 root는 타입 전용입니다.

## 프로필

### DataTable

읽기 중심 표를 native table 또는 같은 의미 구조로 표현합니다. 안정된 행과 열,
정렬, 필터, 그룹, 행 선택, disclosure, 열 크기 변경 의도, native form 연결을
제공합니다. 편집 commit 의도는 보낼 수 있지만 spreadsheet식 셀 이동은 소유하지
않습니다. 런타임 API는 `applyDataTableEvent`, `createDataTable`,
`tryCreateDataTable`입니다.

### DataGrid

응용 프로그램형 grid입니다. 2차원 cursor, roving focus, 셀 선택,
navigation/edit 모드, 검증 가능한 commit/cancel, 행이나 열 제거 후 복구를
제공합니다. 계층 행은 다른 프로필로 몰래 바꾸지 않고 거부합니다. 런타임 API는
`applyDataGridEvent`, `createDataGrid`, `tryCreateDataGrid`입니다.

### DataTreeGrid

grid 이동과 편집에 정렬된 부모·자식 행, expansion, level/position 정보,
context-only ancestor를 결합합니다. collapse나 제거 뒤에도 cursor와 편집 상태를
결정적으로 복구합니다. 런타임 API는 `applyDataTreeGridEvent`,
`createDataTreeGrid`, `tryCreateDataTreeGrid`입니다.

## 공개 subpath

| 경로 | 책임 |
| --- | --- |
| `@sectile/tabular` | 공통 타입과 오류. 런타임 export 없음 |
| `/model` | ID와 codec, 불변 모델, 제어 상태, `TabularLimits` |
| `/query` | 제한된 filter, sort, group, aggregate, pivot descriptor와 revision |
| `/source` | request/response envelope, page/window access, generation, 삭제 delta, client source |
| `/data-table` | 읽기 중심 profile controller와 reducer |
| `/data-grid` | 평면 interactive grid controller와 reducer |
| `/data-tree-grid` | 계층형 interactive grid controller와 reducer |
| `/virtual` | 소비자가 설치한 Virtual 전략에 연결하는 선택적 adapter |

제어 필드는 변경 제안을 내보내며 응용 프로그램이 승인한 상태를 다시 전달할
때까지 바뀌지 않습니다. all-matching 선택은 source generation과 query revision에
묶이며 로드하지 않은 행을 열거하지 않고 제외 목록만 저장합니다.

loading, empty, error, retry, cache, suspense는 응용 프로그램 책임입니다.
DOM은 `@sectile/dom/data-*`, Vue는 `@sectile/vue/data-*`에서 제공합니다.
terminal 통합은 제공하지 않습니다. Vue 전체 구성은 [Vue 구성](./tabular/vue),
가상화는 [선택적 가상화](./tabular/virtual)를 참고하세요.
