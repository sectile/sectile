<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 영역 크기 조절

키보드로도 조작할 수 있는 구분선으로 인접 영역의 크기를 바꿉니다.

## 용법

### 가로 방향

같은 값과 경계 규칙을 유지하면서 가로 방향으로 조작합니다.

<ComponentExample component="window-splitter" scenario="horizontal" title="가로 방향" description="같은 값과 경계 규칙을 유지하면서 가로 방향으로 조작합니다." :index="0" />

### 세로 방향

같은 크기 규칙을 유지하면서 세로 방향으로 영역을 조절합니다.

<ComponentExample component="window-splitter" scenario="vertical" title="세로 방향" description="같은 크기 규칙을 유지하면서 세로 방향으로 영역을 조절합니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="window-splitter" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## 예시

### 방향 혼합

크기를 조절할 수 있는 사이드바 안쪽에 편집기와 미리보기 영역을 다시 나눕니다.

<ComponentExample component="window-splitter" scenario="nested-layout" title="방향 혼합" description="크기를 조절할 수 있는 사이드바 안쪽에 편집기와 미리보기 영역을 다시 나눕니다." :index="3" />

## API

Vue 패키지: `@sectile/vue/window-splitter`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">WindowSplitterRoot</code></li>
  <li><code class="component-api-token">WindowSplitterPane</code></li>
  <li><code class="component-api-token">WindowSplitterHandle</code></li>
</ul>
</div>

### Props

#### `WindowSplitterRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `modelValue` | `number \| string` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `number \| string` | `50` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `min` | `number \| string` | `0` | 컴포넌트가 받을 수 있는 최솟값입니다. |
| `max` | `number \| string` | `100` | 컴포넌트가 받을 수 있는 최댓값입니다. |
| `step` | `number \| string` | `1` | 컴포넌트가 받을 수 있는 최소 증감 간격입니다. |
| `pageStep` | `number` | `10` | Page Up과 Page Down이 사용할 큰 증감 간격입니다. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | 배치와 키보드 이동에 사용할 축입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `required` | `boolean` | `undefined` | 제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다. |
| `name` | `string` | `undefined` | 네이티브 폼 제출에 사용할 이름입니다. |
| `form` | `string` | `undefined` | 컨트롤을 연결할 네이티브 form 요소의 ID입니다. |
| `label` | `string` | `'Resize panels'` | 보조 기술이 읽는 컨트롤 이름입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |
| `formatValue` | `(value: string) => string` | `undefined` | 값을 화면에 표시할 문자열로 바꾸는 함수입니다. |

#### `WindowSplitterPaneProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `side` | `'before' \| 'after'` | 필수 | 기준 요소를 중심으로 팝업을 우선 배치할 방향입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 이벤트

#### `WindowSplitterRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `string` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |

### 기타 타입

#### `WindowSplitterValueFormatter`

```ts
type WindowSplitterValueFormatter = NonNullable<WindowSplitterRootProps['formatValue']>
```

#### `WindowSplitterValueChangeHandler`

```ts
type WindowSplitterValueChangeHandler = (value: string) => void
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="window-splitter"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
<tr>
  <td><code class="component-part-token">root</code></td>
  <td><code>[data-part="root"]</code></td>
  <td>컴포넌트 경계와 내부 파트를 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">pane</code></td>
  <td><code>[data-part="pane"]</code></td>
  <td>크기를 조절할 수 있는 영역 하나를 담습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">handle</code></td>
  <td><code>[data-part="handle"]</code></td>
  <td>인접한 영역의 크기를 조절합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 좌우 배치에서 앞쪽 영역을 한 단계 줄이거나 늘립니다. |
| <kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd> | 상하 배치에서 앞쪽 영역을 한 단계 줄이거나 늘립니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 구분선을 허용된 최소 또는 최대 경계로 이동합니다. |
| <kbd>Page Up</kbd> / <kbd>Page Down</kbd> | 설정된 큰 단계만큼 영역 크기를 바꿉니다. |

## 접근성

핸들이 구분선 방향과 현재·최소·최대 영역 크기를 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
