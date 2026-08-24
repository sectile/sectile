<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 태그 입력

하나의 입력 필드에서 자유 형식 태그를 만들고 이동하고 지웁니다.

## 예시

### 기술 태그

입력 포커스를 잃지 않고 기술 태그를 만들거나 지웁니다.

<ComponentExample component="tags-input" scenario="skills" title="기술 태그" description="입력 포커스를 잃지 않고 기술 태그를 만들거나 지웁니다." :index="0" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="tags-input" />

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

렌더링되는 파트는 기본적으로 `data-scope="tags-input"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">item</code></li>
  <li><code class="component-part-token">item-text</code></li>
  <li><code class="component-part-token">item-delete</code></li>
  <li><code class="component-part-token">input</code></li>
  <li><code class="component-part-token">clear</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Enter</kbd> / <kbd>Comma</kbd> | 현재 입력을 태그로 확정합니다. |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 입력란과 기존 태그 사이를 이동합니다. |
| <kbd>Backspace</kbd> / <kbd>Delete</kbd> | 커서 상태에 따라 현재 태그로 이동하거나 삭제합니다. |

## 접근성

이름이 있는 묶음이 텍스트 입력을 기본 요소로 유지하고 각 태그 삭제 작업에 이름을 제공합니다.
