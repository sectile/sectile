<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 토스트 알림

현재 작업을 막지 않고 짧은 피드백을 순서대로 알립니다.

## 용법

### 자동 닫힘

잠시 표시한 알림을 자동으로 닫되 사용자가 바로 닫을 수 있는 버튼도 함께 제공합니다.

<ComponentExample component="toast" scenario="automatic" title="자동 닫힘" description="잠시 표시한 알림을 자동으로 닫되 사용자가 바로 닫을 수 있는 버튼도 함께 제공합니다." :index="0" />

### 자동으로 닫히지 않는 알림

사용자가 직접 닫을 때까지 알림을 계속 표시합니다.

<ComponentExample component="toast" scenario="persistent" title="자동으로 닫히지 않는 알림" description="사용자가 직접 닫을 때까지 알림을 계속 표시합니다." :index="1" />

### 개수 제한

기존 값을 잃지 않으면서 설정한 항목 수나 화면 표시 개수를 지킵니다.

<ComponentExample component="toast" scenario="limited" title="개수 제한" description="기존 값을 잃지 않으면서 설정한 항목 수나 화면 표시 개수를 지킵니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/toast`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">ToastProvider</code></li>
  <li><code class="component-api-token">ToastViewport</code></li>
  <li><code class="component-api-token">ToastRoot</code></li>
  <li><code class="component-api-token">ToastTitle</code></li>
  <li><code class="component-api-token">ToastDescription</code></li>
  <li><code class="component-api-token">ToastClose</code></li>
</ul>
</div>

### Props

#### `ToastProviderProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `defaultDurationMs` | `number \| null` | `5_000` | 밀리초 단위의 초기 타이머 길이입니다. |
| `maxVisible` | `number` | `3` | 한 번에 표시할 수 있는 최대 알림 수입니다. |
| `initialToasts` | `readonly ToastInput<string>[]` | `[]` | Provider가 처음 마운트될 때 존재할 알림입니다. |

#### `ToastPartProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | 파트별로 다름 | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `ToastRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `value` | `string` | 필수 | 이 계약이 노출하는 현재 값입니다. |
| `as` | `PrimitiveAs` | `'li'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `ToastProviderSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `dismiss` | `void` | 알림 하나를 닫는 함수입니다. |
| `toast` | `void` | 이 항목이 나타내는 알림입니다. |
| `toasts` | `readonly ToastItem<string>[]` | 현재 알림 컬렉션입니다. |
| `dismissAll` | `void` | 모든 알림을 닫는 함수입니다. |
| `paused` | `boolean` | 자동 갱신이 멈춘 상태인지 여부입니다. |

#### `ToastRootSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `open` | `boolean` | 연결된 팝업이나 펼침 영역이 열려 있는지 여부입니다. |
| `toast` | `ToastItem<string> \| null` | 이 항목이 나타내는 알림입니다. |

## 파트

공통 범위: <code class="component-scope-token">[data-scope="toast"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
<tr>
  <td><code class="component-part-token">viewport</code></td>
  <td><code>[data-part="viewport"]</code></td>
  <td>현재 보이는 콘텐츠를 배치하고 경계를 정합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">root</code></td>
  <td><code>[data-part="root"]</code></td>
  <td>컴포넌트 경계와 내부 파트를 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">title</code></td>
  <td><code>[data-part="title"]</code></td>
  <td>연결된 콘텐츠의 제목을 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">description</code></td>
  <td><code>[data-part="description"]</code></td>
  <td>연결된 콘텐츠나 결정 내용을 설명합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">close</code></td>
  <td><code>[data-part="close"]</code></td>
  <td>현재 화면을 닫거나 해제합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Tab</kbd> | 컴포넌트의 기본 작업 컨트롤 사이를 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 포커스된 작업을 실행합니다. |

## 접근성

표시 영역이 알림 순서를 유지하고 각 토스트에 제목·설명·닫기 작업의 이름을 제공합니다.
