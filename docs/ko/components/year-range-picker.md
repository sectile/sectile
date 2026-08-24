<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Year Range Picker

페이지로 나뉜 연도 격자에서 양 끝을 포함하는 연도 범위를 고릅니다.

## 예시

### roadmap horizon

로드맵에 포함할 첫 해와 마지막 해를 고릅니다.

<ComponentExample component="year-range-picker" scenario="roadmap-horizon" title="roadmap horizon" description="로드맵에 포함할 첫 해와 마지막 해를 고릅니다." :index="0" />

## 공개 API

Vue 패키지: `@sectile/vue/year-range-picker`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">YearRangePickerRoot</code></li>
  <li><code class="component-api-token">YearRangePickerTrigger</code></li>
  <li><code class="component-api-token">YearRangePickerContent</code></li>
  <li><code class="component-api-token">YearRangePickerGrid</code></li>
  <li><code class="component-api-token">YearRangePickerCell</code></li>
  <li><code class="component-api-token">YearRangePickerStartInput</code></li>
  <li><code class="component-api-token">YearRangePickerEndInput</code></li>
  <li><code class="component-api-token">YearRangePickerPreviousPage</code></li>
  <li><code class="component-api-token">YearRangePickerNextPage</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">YearRangePickerRootProps</code></li>
  <li><code class="component-api-token">YearRangePickerValue</code></li>
  <li><code class="component-api-token">YearPickerValue</code></li>
  <li><code class="component-api-token">YearRangePickerPartProps</code></li>
  <li><code class="component-api-token">YearRangePickerRootSlotProps</code></li>
  <li><code class="component-api-token">YearRangePickerCellSlotProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="year-range-picker"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
<tr>
  <td><code class="component-part-token">start-input</code></td>
  <td><code>[data-part="start-input"]</code></td>
  <td>시작 값을 편집합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">end-input</code></td>
  <td><code>[data-part="end-input"]</code></td>
  <td>종료 값을 편집합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">trigger</code></td>
  <td><code>[data-part="trigger"]</code></td>
  <td>연결된 콘텐츠를 열고 닫거나 활성화합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">content</code></td>
  <td><code>[data-part="content"]</code></td>
  <td>현재 상태에 맞는 컴포넌트 콘텐츠를 담습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">grid</code></td>
  <td><code>[data-part="grid"]</code></td>
  <td>셀을 탐색 가능한 2차원 구조로 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">cell</code></td>
  <td><code>[data-part="cell"]</code></td>
  <td>탐색하거나 선택할 수 있는 그리드 값 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">previous-page</code></td>
  <td><code>[data-part="previous-page"]</code></td>
  <td>이전 페이지(으)로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">next-page</code></td>
  <td><code>[data-part="next-page"]</code></td>
  <td>다음 페이지(으)로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 현재 페이지의 연도 사이를 이동합니다. |
| <kbd>Page Up</kbd> / <kbd>Page Down</kbd> | 이전 또는 다음 연도 페이지로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 강조된 연도를 선택합니다. |
| <kbd>Escape</kbd> | 값을 바꾸지 않고 연도 격자를 닫습니다. |

## 접근성

시작·종료 연도 입력이 페이지형 격자를 공유하고 양 끝을 포함하는 연도 범위를 노출합니다.
