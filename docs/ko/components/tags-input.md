<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 태그 입력

하나의 입력 필드에서 자유 형식 태그를 만들고 이동하고 지웁니다.

## 예시

### 기술 태그

입력 포커스를 잃지 않고 기술 태그를 만들거나 지웁니다.

<ComponentExample component="tags-input" scenario="skills" title="기술 태그" description="입력 포커스를 잃지 않고 기술 태그를 만들거나 지웁니다." :index="0" />

## 공개 API

Vue 패키지: `@sectile/vue/tags-input`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TagsInputRoot</code></li>
  <li><code class="component-api-token">TagsInputItem</code></li>
  <li><code class="component-api-token">TagsInputItemText</code></li>
  <li><code class="component-api-token">TagsInputItemDelete</code></li>
  <li><code class="component-api-token">TagsInputInput</code></li>
  <li><code class="component-api-token">TagsInputClear</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TagsInputRootProps</code></li>
  <li><code class="component-api-token">TagsInputRootSlotProps</code></li>
  <li><code class="component-api-token">TagsInputItemProps</code></li>
  <li><code class="component-api-token">TagsInputItemSlotProps</code></li>
  <li><code class="component-api-token">TagsInputPartProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="tags-input"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">item</code></td>
  <td><code>[data-part="item"]</code></td>
  <td>선택하거나 실행할 수 있는 항목 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item-text</code></td>
  <td><code>[data-part="item-text"]</code></td>
  <td>항목 레이블을 조작부와 분리해 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item-delete</code></td>
  <td><code>[data-part="item-delete"]</code></td>
  <td>해당 항목을 제거합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">input</code></td>
  <td><code>[data-part="input"]</code></td>
  <td>편집 값이나 초안을 입력받습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">clear</code></td>
  <td><code>[data-part="clear"]</code></td>
  <td>현재 값이나 항목 모음을 비웁니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Enter</kbd> / <kbd>Comma</kbd> | 현재 입력을 태그로 확정합니다. |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 입력란과 기존 태그 사이를 이동합니다. |
| <kbd>Backspace</kbd> / <kbd>Delete</kbd> | 커서 상태에 따라 현재 태그로 이동하거나 삭제합니다. |

## 접근성

이름이 있는 묶음이 텍스트 입력을 기본 요소로 유지하고 각 태그 삭제 작업에 이름을 제공합니다.
