<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 콤보박스

문자열로 항목을 걸러 내고 결과를 이동해 하나를 확정합니다.

## 예시

### 앞부분 검색

현재 검색어로 시작하는 항목만 찾습니다.

<ComponentExample component="combobox" scenario="prefix" title="앞부분 검색" description="현재 검색어로 시작하는 항목만 찾습니다." :index="0" />

### 포함 검색

앞부분뿐 아니라 검색어가 포함된 모든 항목을 찾습니다.

<ComponentExample component="combobox" scenario="contains" title="포함 검색" description="앞부분뿐 아니라 검색어가 포함된 모든 항목을 찾습니다." :index="1" />

### 한글 조합 입력

한글 조합이 끝날 때까지 조합 중인 문자열과 확정된 검색어를 나눠 관리합니다.

<ComponentExample component="combobox" scenario="ime" title="한글 조합 입력" description="한글 조합이 끝날 때까지 조합 중인 문자열과 확정된 검색어를 나눠 관리합니다." :index="2" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="combobox" />

## 공개 API

Vue 패키지: `@sectile/vue/combobox`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">ComboboxRoot</code></li>
  <li><code class="component-api-token">ComboboxInput</code></li>
  <li><code class="component-api-token">ComboboxContent</code></li>
  <li><code class="component-api-token">ComboboxItem</code></li>
  <li><code class="component-api-token">ComboboxEmpty</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">ComboboxRootProps</code></li>
  <li><code class="component-api-token">ComboboxRootSlotProps</code></li>
  <li><code class="component-api-token">ComboboxItemProps</code></li>
  <li><code class="component-api-token">ComboboxItemSlotProps</code></li>
  <li><code class="component-api-token">ComboboxPartProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="combobox"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">input</code></li>
  <li><code class="component-part-token">content</code></li>
  <li><code class="component-part-token">item</code></li>
  <li><code class="component-part-token">empty</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Down</kbd> / <kbd>Arrow Up</kbd> | 팝업을 열고 현재 선택 항목을 이동합니다. |
| <kbd>Enter</kbd> | 현재 선택 항목을 확정합니다. |
| <kbd>Escape</kbd> | 확정된 값을 바꾸지 않고 팝업을 닫습니다. |
| <kbd>Text input</kbd> | IME 조합 입력을 방해하지 않고 항목을 검색합니다. |

## 접근성

입력란은 자동 완성·열림·팝업 연결·현재 항목을 노출하고 각 항목은 선택 상태를 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
