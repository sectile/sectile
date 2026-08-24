<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 계층 격자

계층형 리소스를 정리하고 편집하면서 2차원 격자 이동을 유지합니다.

## 예시

### 프로젝트 구조

하위 응용 프로그램과 기능이 부모 리소스에 어떻게 연결되는지 프로젝트 목록에서 확인합니다.

<ComponentExample component="tree-grid" scenario="expanded" title="프로젝트 구조" description="하위 응용 프로그램과 기능이 부모 리소스에 어떻게 연결되는지 프로젝트 목록에서 확인합니다." :index="0" />

### 담당자 편집

행과 열의 키보드 이동을 유지하면서 하위 리소스 담당자를 편집합니다.

<ComponentExample component="tree-grid" scenario="editable" title="담당자 편집" description="행과 열의 키보드 이동을 유지하면서 하위 리소스 담당자를 편집합니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="tree-grid" />

## 공개 API

Vue 패키지: `@sectile/vue/tree-grid`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TreeGridRoot</code></li>
  <li><code class="component-api-token">TreeGridRow</code></li>
  <li><code class="component-api-token">TreeGridCell</code></li>
  <li><code class="component-api-token">TreeGridDisclosure</code></li>
  <li><code class="component-api-token">TreeGridEditor</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TreeGridRootProps</code></li>
  <li><code class="component-api-token">TreeGridRootSlotProps</code></li>
  <li><code class="component-api-token">TreeGridRowSlotProps</code></li>
  <li><code class="component-api-token">TreeGridCellSlotProps</code></li>
  <li><code class="component-api-token">TreeGridPartProps</code></li>
  <li><code class="component-api-token">TreeGridEditMode</code></li>
  <li><code class="component-api-token">TreeGridPolicies</code></li>
  <li><code class="component-api-token">TreeGridRowInput</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="tree-grid"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">row</code></li>
  <li><code class="component-part-token">cell</code></li>
  <li><code class="component-part-token">disclosure</code></li>
  <li><code class="component-part-token">editor</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 격자 칸 사이를 이동합니다. |
| <kbd>Space</kbd> | 현재 칸이나 행을 선택합니다. |
| <kbd>Enter</kbd> / <kbd>F2</kbd> | 현재 칸이 편집을 지원하면 편집 모드로 들어갑니다. |
| <kbd>Escape</kbd> | 현재 편집을 취소합니다. |

## 접근성

이름이 있는 격자 안에서 행과 칸이 계층·위치·펼침·선택·편집 상태를 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
