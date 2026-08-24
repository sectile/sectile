<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 날짜·시간 입력

시간대 변환 없이 날짜와 현지 시각을 함께 편집합니다.

## 예시

### 현지 일정 일정 선택

시간대 변환 없이 날짜와 현지 시각을 하나의 일정으로 확정합니다.

<ComponentExample component="date-time-field" scenario="local-schedule" title="현지 일정 일정 선택" description="시간대 변환 없이 날짜와 현지 시각을 하나의 일정으로 확정합니다." :index="0" />

### 넘나드는 자정 넘김

종료 시각이 다음 날로 넘어가는 일정도 올바르게 유지합니다.

<ComponentExample component="date-time-field" scenario="cross-midnight" title="넘나드는 자정 넘김" description="종료 시각이 다음 날로 넘어가는 일정도 올바르게 유지합니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="date-time-field" />

## 공개 API

Vue 패키지: `@sectile/vue/date-time-field`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DateTimeField</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DateTimeValue</code></li>
  <li><code class="component-api-token">DateTimeFieldProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="date-time-field"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">input</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd> | 현재 값 구간을 증가시키거나 감소시킵니다. |
| <kbd>Enter</kbd> | 입력 중인 값을 확정합니다. |
| <kbd>Escape</kbd> | 입력을 취소하고 확정된 값을 복원합니다. |

## 접근성

이름이 있는 입력란은 기본 텍스트 입력을 유지하며 날짜와 시간 검증을 하나의 값으로 노출합니다.
