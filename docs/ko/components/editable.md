<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 인라인 편집

인라인 내용을 미리 보기와 검증 가능한 편집 상태로 전환합니다.

## 예시

### 기본 사용

필요한 구성만 사용하고 초깃값은 컴포넌트가 직접 관리합니다.

<ComponentExample component="editable" scenario="basic" title="기본 사용" description="필요한 구성만 사용하고 초깃값은 컴포넌트가 직접 관리합니다." :index="0" />

### 입력 검증

잘못된 편집은 거부하고 마지막으로 확정된 값을 유지합니다.

<ComponentExample component="editable" scenario="validated" title="입력 검증" description="잘못된 편집은 거부하고 마지막으로 확정된 값을 유지합니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="editable" />

## 공개 API

Vue 패키지: `@sectile/vue/editable`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">EditableRoot</code></li>
  <li><code class="component-api-token">EditableArea</code></li>
  <li><code class="component-api-token">EditablePreview</code></li>
  <li><code class="component-api-token">EditableInput</code></li>
  <li><code class="component-api-token">EditableEditTrigger</code></li>
  <li><code class="component-api-token">EditableSubmitTrigger</code></li>
  <li><code class="component-api-token">EditableCancelTrigger</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">EditableRootProps</code></li>
  <li><code class="component-api-token">EditableRootSlotProps</code></li>
  <li><code class="component-api-token">EditablePartProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="editable"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">area</code></li>
  <li><code class="component-part-token">preview</code></li>
  <li><code class="component-part-token">input</code></li>
  <li><code class="component-part-token">edit-trigger</code></li>
  <li><code class="component-part-token">submit-trigger</code></li>
  <li><code class="component-part-token">cancel-trigger</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Enter</kbd> | 미리보기에서 편집을 시작하거나 한 줄 입력을 확정합니다. |
| <kbd>Escape</kbd> | 편집을 취소하고 확정된 값을 복원합니다. |
| <kbd>Tab</kbd> | 미리보기, 입력, 작업 컨트롤 사이를 이동합니다. |

## 접근성

미리보기와 입력 상태를 구분하고 잘못된 입력은 실제 입력 요소에서 전달합니다.
