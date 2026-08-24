<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 날짜 범위 입력

완성되지 않았거나 잘못된 입력을 유지하면서 두 날짜를 편집합니다.

## 예시

### 기본 사용

필요한 구성만 사용하고 초깃값은 컴포넌트가 직접 관리합니다.

<ComponentExample component="date-range-field" scenario="basic" title="기본 사용" description="필요한 구성만 사용하고 초깃값은 컴포넌트가 직접 관리합니다." :index="0" />

### 범위 제한

설정한 최솟값과 최댓값을 벗어난 값은 받지 않습니다.

<ComponentExample component="date-range-field" scenario="bounded" title="범위 제한" description="설정한 최솟값과 최댓값을 벗어난 값은 받지 않습니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="date-range-field" />

## 공개 API

Vue 패키지: `@sectile/vue/date-range-field`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DateRangeFieldRoot</code></li>
  <li><code class="component-api-token">DateRangeFieldStartInput</code></li>
  <li><code class="component-api-token">DateRangeFieldEndInput</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DateRangeFieldRootProps</code></li>
  <li><code class="component-api-token">DateRangeFieldRootSlotProps</code></li>
  <li><code class="component-api-token">DateRange</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="date-range-field"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">start-input</code></li>
  <li><code class="component-part-token">end-input</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd> | 현재 값 구간을 증가시키거나 감소시킵니다. |
| <kbd>Enter</kbd> | 입력 중인 값을 확정합니다. |
| <kbd>Escape</kbd> | 입력을 취소하고 확정된 값을 복원합니다. |

## 접근성

시작과 종료 입력에 각각 이름을 제공하고 양 끝의 오류를 숨기지 않은 하나의 순서 있는 범위로 노출합니다.
