<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Toast

현재 작업과 함께 짧은 피드백을 순서대로 알립니다.

## 용법

### 자동 닫힘

잠시 표시한 알림을 자동으로 닫되 사용자가 바로 닫을 수 있는 버튼도 함께 제공합니다.

<ComponentExample component="toast" scenario="automatic" title="자동 닫힘" description="잠시 표시한 알림을 자동으로 닫되 사용자가 바로 닫을 수 있는 버튼도 함께 제공합니다." :index="0" />

### 계속 유지되는 알림

사용자가 직접 닫을 때까지 알림을 계속 표시합니다.

<ComponentExample component="toast" scenario="persistent" title="계속 유지되는 알림" description="사용자가 직접 닫을 때까지 알림을 계속 표시합니다." :index="1" />

### 개수 제한

기존 값을 유지하면서 설정한 항목 수나 화면 표시 개수를 지킵니다.

<ComponentExample component="toast" scenario="limited" title="개수 제한" description="기존 값을 유지하면서 설정한 항목 수나 화면 표시 개수를 지킵니다." :index="2" />

### setup에서 호출

<code>useToast()</code>는 <code>ToastProvider</code>의 슬롯 하위 컴포넌트 setup에서 호출합니다. 반환된 state와 함수는 템플릿이나 이벤트·비동기 함수에서 사용할 수 있습니다. Context를 사용하는 컴포넌트를 Provider 슬롯 아래에 두면 같은 트리에서 toast 상태와 동작을 공유합니다.

~~~vue
<!-- AppShell.vue -->
<ToastProvider v-slot="{ toasts }">
  <RequestButton />
  <ToastViewport class="toast-viewport">
    <ToastRoot v-for="item in toasts" :key="item.id" :value="item.id" class="toast-item">
      <ToastTitle />
      <ToastDescription />
      <ToastClose>닫기</ToastClose>
    </ToastRoot>
  </ToastViewport>
</ToastProvider>
~~~

~~~ts
// RequestButton.vue <script setup>
const { toast, update } = useToast()

async function save() {
  const id = crypto.randomUUID()
  toast({ id, title: '저장 중', kind: 'deployment-pending', durationMs: null })
  try {
    const result = await saveRelease()
    update(id, { title: '저장 완료', kind: 'deployment-complete', durationMs: 3_000 })
    return result
  } catch (error) {
    update(id, { title: '저장 실패', description: '다시 시도해 주세요.', kind: 'error', durationMs: 5_000 })
    throw error
  }
}
~~~

애플리케이션이 요청을 실행하고 pending·성공·실패 문구, 시간, 오류 노출 정책을 결정합니다. markup, 아이콘, class, 위치, 모션도 Provider의 compound parts를 조립하는 애플리케이션이 소유합니다.

<code>kind</code>는 사용자 정의 문자열입니다. 생략하거나 빈 문자열이면 <code>info</code>가 되고, 그 외 값은 <code>data-kind</code>까지 그대로 전달됩니다. 기존 접근성 호환성을 위해 정확히 <code>error</code>인 항목만 <code>role="alert"</code>, 나머지는 <code>role="status"</code>를 사용합니다.

### CSS로 직접 스타일링

아이콘과 별도 설정을 생략하는 구성에서는 <code>data-kind</code> 선택자만 사용합니다.

~~~css
.toast-item[data-kind='deployment-pending'] {
  background: var(--toast-pending-background);
}

.toast-item[data-kind='deployment-complete'] {
  background: var(--toast-complete-background);
}
~~~

### class와 아이콘 등록

애플리케이션의 일반 객체에 kind 표시 정보를 등록합니다. 미등록 값은 명시적인 fallback으로 처리합니다.

~~~ts
// toast-kinds.ts
import type { Component } from 'vue'
import InfoIcon from './InfoIcon.vue'
import SpinnerIcon from './SpinnerIcon.vue'
import SuccessIcon from './SuccessIcon.vue'
import ErrorIcon from './ErrorIcon.vue'

interface ToastKindPresentation {
  readonly class: string
  readonly icon: Component
}

export const toastKinds = {
  info: { class: 'toast--info', icon: InfoIcon },
  'deployment-pending': { class: 'toast--pending', icon: SpinnerIcon },
  'deployment-complete': { class: 'toast--complete', icon: SuccessIcon },
  error: { class: 'toast--error', icon: ErrorIcon },
} as const satisfies Record<string, ToastKindPresentation>

export type AppToastKind = keyof typeof toastKinds

const fallbackKind: ToastKindPresentation = {
  class: 'toast--unknown',
  icon: InfoIcon,
}

export function resolveToastKind(kind: string): ToastKindPresentation {
  return kind in toastKinds
    ? toastKinds[kind as AppToastKind]
    : fallbackKind
}
~~~

~~~vue
<ToastRoot
  v-for="item in toasts"
  :key="item.id"
  :value="item.id"
  :class="resolveToastKind(item.kind).class"
>
  <component :is="resolveToastKind(item.kind).icon" />
  <ToastTitle />
  <ToastDescription />
</ToastRoot>
~~~

### 애플리케이션 내부에서 kind 제한

Sectile은 모든 문자열을 허용하지만 애플리케이션 wrapper에서는 등록된 kind만 받도록 좁힐 수 있습니다.

~~~ts
// use-app-toast.ts
import type { ToastInput } from '@sectile/vue/toast'
import { useToast } from '@sectile/vue/toast'
import type { AppToastKind } from './toast-kinds'

type AppToastInput = Omit<ToastInput<string>, 'kind'> & {
  readonly kind?: AppToastKind
}

export function useAppToast() {
  const api = useToast()
  return {
    ...api,
    toast(input: AppToastInput) {
      api.toast(input)
    },
  }
}
~~~

## API

Vue 패키지: `@sectile/vue/toast`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">ToastProvider</code></li>
  <li><code class="component-api-token">ToastPortal</code></li>
  <li><code class="component-api-token">ToastViewport</code></li>
  <li><code class="component-api-token">ToastRoot</code></li>
  <li><code class="component-api-token">ToastTitle</code></li>
  <li><code class="component-api-token">ToastDescription</code></li>
  <li><code class="component-api-token">ToastClose</code></li>
</ul>
</div>

### 함수

#### `useToast`

```ts
function useToast(): UseToastReturn
```

### Props

#### `ToastProviderProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>closeLabel</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>'Dismiss notification'</code></span></div>
<p>각 알림 닫기 작업에 제공할 접근 가능한 이름입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>defaultDurationMs</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number | null</code></span><span><span class="component-api-definition__label">기본값</span><code>5_000</code></span></div>
<p>밀리초 단위의 초기 타이머 길이입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>dismissOnEscape</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>true</code></span></div>
<p>Escape 키로 포커스된 알림을 닫을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>hotkey</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly string[] | false</code></span><span><span class="component-api-definition__label">기본값</span><code>['F8']</code></span></div>
<p>알림 표시 영역으로 포커스를 옮길 문서 단축키입니다. false는 단축키를 해제합니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>initialToasts</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly ToastInput&lt;string&gt;[]</code></span><span><span class="component-api-definition__label">기본값</span><code>[]</code></span></div>
<p>Provider가 처음 마운트될 때 존재할 알림입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>maxVisible</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span><span><span class="component-api-definition__label">기본값</span><code>3</code></span></div>
<p>한 번에 표시할 수 있는 최대 알림 수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>pauseOnWindowBlur</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>true</code></span></div>
<p>브라우저 창이 비활성 상태일 때 자동 닫기 시간을 멈출지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>swipeDirection</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>'up' | 'right' | 'down' | 'left'</code></span><span><span class="component-api-definition__label">기본값</span><code>'right'</code></span></div>
<p>포인터로 알림을 밀어 닫을 방향입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>swipeThreshold</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span><span><span class="component-api-definition__label">기본값</span><code>50</code></span></div>
<p>밀어서 닫을 때 필요한 포인터 이동 거리(픽셀)입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>toasts</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly ToastInput&lt;string&gt;[]</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>부모가 Provider를 제어할 때 사용할 현재 알림 목록입니다.</p>
</dd>
</div>
</dl>

#### `ToastPartProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span>파트별로 다름</span></div>
<p>이 파트가 렌더링할 요소 또는 컴포넌트입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>asChild</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>하나뿐인 자식 요소에 파트 속성을 직접 합칠지 여부입니다.</p>
</dd>
</div>
</dl>

#### `ToastPortalProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>defer</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>Teleport 대상을 현재 mount 또는 update tick이 끝날 때 찾을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>to</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | HTMLElement</code></span><span><span class="component-api-definition__label">기본값</span><code>'body'</code></span></div>
<p>포털 콘텐츠를 옮길 대상입니다.</p>
</dd>
</div>
</dl>

#### `ToastRootProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span><code>'li'</code></span></div>
<p>이 파트가 렌더링할 요소 또는 컴포넌트입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>asChild</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>하나뿐인 자식 요소에 파트 속성을 직접 합칠지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>value</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>이 계약이 노출하는 현재 값입니다.</p>
</dd>
</div>
</dl>

### 슬롯

#### `ToastProviderSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>dismiss</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>void</code></span></div>
<p>알림 하나를 닫는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>dismissAll</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>void</code></span></div>
<p>모든 알림을 닫는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>paused</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>자동 갱신이 멈춘 상태인지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>toast</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>void</code></span></div>
<p>이 항목이 나타내는 알림입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>toasts</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly ToastItem&lt;string&gt;[]</code></span></div>
<p>현재 알림 컬렉션입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>update</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>void</code></span></div>
<p>식별자를 유지하면서 알림 하나를 갱신하는 함수입니다.</p>
</dd>
</div>
</dl>

#### `ToastRootSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>open</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>연결된 팝업이나 펼침 영역이 열려 있는지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>toast</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>ToastItem&lt;string&gt; | null</code></span></div>
<p>이 항목이 나타내는 알림입니다.</p>
</dd>
</div>
</dl>

### 이벤트

#### `ToastProvider`

<dl class="component-api-definitions component-api-definitions--events">
<div class="component-api-definition">
<dt><code>update:toasts</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>readonly ToastInput&lt;string&gt;[]</code></span></div>
<p>Provider가 새 외부 제어 알림 목록을 요청할 때 발생합니다.</p>
</dd>
</div>
</dl>

### 기타 타입

#### `UseToastReturn`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `toasts` | `ComputedRef<readonly ToastItem<string>[]>` | 필수 |
| `paused` | `ComputedRef<boolean>` | 필수 |
| `toast` | `void` | 필수 |
| `update` | `void` | 필수 |
| `dismiss` | `void` | 필수 |
| `dismissAll` | `void` | 필수 |

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
| <kbd>F8</kbd> | 알림 표시 영역으로 포커스를 옮깁니다. |
| <kbd>Tab</kbd> / <kbd>Shift+Tab</kbd> | 알림 작업 컨트롤 사이에서 포커스를 이동합니다. |
| <kbd>Escape</kbd> | 포커스된 알림을 닫습니다. |
| <kbd>Pointer swipe</kbd> | 설정한 거리보다 멀리 알림을 밀면 닫습니다. |

## 접근성

표시 영역이 알림 순서와 키보드 접근을 유지하며 각 알림에 지역화된 닫기 작업을 제공하고 사용자 조작이나 창 상태에 따라 자동 닫기를 멈춥니다.
