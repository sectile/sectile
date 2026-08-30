# 브라우저

`@sectile/dom`은 Sectile의 상호작용 규칙을 실제 브라우저 요소에 연결합니다. 키보드와 포인터 입력, 포커스, 조합 입력, 폼, ARIA 속성, 요소 수명 주기를 처리합니다. 마크업과 시각 스타일은 응용 프로그램이 정합니다.

```sh
pnpm add @sectile/dom
```

어떤 컴포넌트에 의존하는지 분명하도록 컴포넌트별 공개 경로에서 가져옵니다.

```ts
import { createCheckbox } from '@sectile/dom/checkbox'
```

## 기존 요소에 연결하기

응용 프로그램에 필요한 마크업을 만든 다음 상호작용할 요소를 DOM 생성 함수에 전달합니다.

```html
<button id="newsletter" type="button">
  제품 소식 받기: <span id="newsletter-state"></span>
</button>
```

```ts
import { createCheckbox } from '@sectile/dom/checkbox'

const element = document.querySelector<HTMLElement>('#newsletter')
const stateLabel = document.querySelector<HTMLElement>('#newsletter-state')

if (element === null || stateLabel === null) {
  throw new Error('체크박스 마크업이 필요합니다.')
}

const checkbox = createCheckbox({
  element,
  defaultValue: false,
  onValueChange(value) {
    console.log('newsletter', value)
  },
})

const render = () => {
  stateLabel.textContent = checkbox.state.checked ? '켬' : '끔'
}

const unsubscribe = checkbox.subscribe(render)
render()

window.addEventListener('pagehide', () => {
  unsubscribe()
  checkbox.destroy()
}, { once: true })
```

생성 함수는 필요한 이벤트 리스너를 등록하고 의미 상태를 요소에 즉시 반영합니다. 위 체크박스의 상태가 바뀌면 `role`, `aria-checked`, `data-state`, 비활성 상태, 읽기 전용 상태도 함께 갱신됩니다.

## 연결 객체 규약

모든 직접 `create*` 생성 함수는 같은 수명 주기 API를 가진 연결 객체를 반환합니다.

| 항목 | 역할 |
| --- | --- |
| `state` | 현재 의미 상태를 읽습니다. |
| `send(input)` | 컴포넌트에 정규화된 상호작용 입력을 보냅니다. |
| `update(value)` | 외부에서 소유하는 제어 상태를 동기화합니다. |
| `subscribe(listener)` | 적용된 변경을 구독하고 구독 해제 함수를 받습니다. |
| `destroy()` | DOM 리스너와 연결 객체가 소유한 자원을 해제합니다. |

같은 객체에서 컴포넌트별 메서드도 사용할 수 있습니다. 포커스 이동, 컬렉션 변경, 팝업 배치처럼 더 복잡한 동작이 필요할 때 사용합니다.

## 상태 소유권

연결 객체가 현재 값을 소유해야 하면 `defaultValue`를 전달합니다. 응용 프로그램 상태가 값을 소유하면 `value`와 `onValueChange`를 함께 전달합니다.

```ts
const checkbox = createCheckbox({
  element,
  value: settings.newsletter,
  onValueChange(nextValue) {
    settings.newsletter = nextValue
    checkbox.update(nextValue)
  },
})
```

제어 상태의 상호작용은 제안된 값을 알립니다. 소유자가 값을 수락한 뒤 `update`를 호출해 응용 프로그램 상태와 연결 객체를 동기화합니다. 공통 규칙은 [상태 소유권](/ko/guide/state-ownership)에서 확인할 수 있습니다.

## 컨트롤러와 속성 반영

상태와 렌더링의 수명 주기를 따로 관리해야 하면 `create*Controller`를 사용합니다. 컨트롤러는 상태만으로 동작하며, `get*Attributes`가 스냅숏을 원하는 DOM 구조에 반영합니다.

```ts
import {
  createCheckboxController,
  getCheckboxAttributes,
} from '@sectile/dom/checkbox'

const result = createCheckboxController({ defaultValue: 'mixed' })
if (!result.ok) throw new TypeError(result.error.message)

const snapshot = result.value.getSnapshot()
const attributes = getCheckboxAttributes(snapshot.state, { required: true })
```

복합 컴포넌트는 전용 이벤트 변환 함수와 효과 반영 함수도 제공합니다. 사용자 정의 렌더러, 이벤트 위임 시스템, 요소 소유권을 상위 계층에서 관리하는 실행 환경에서 이 하위 API를 사용합니다.

## 브라우저 기본 동작

HTML이 이미 올바른 의미를 제공하는 영역에서는 브라우저 기본 동작을 유지합니다.

- 텍스트 필드는 기본 편집, 선택 영역, 한글을 포함한 IME 조합 입력을 유지합니다.
- 폼 컨트롤은 지원 범위 안에서 `name`, `value`, `required`, `disabled`, 소속 폼을 반영합니다.
- 키보드 동작의 우선권은 포커스된 요소에 둡니다.
- 포커스 효과는 실제 요소를 직접 대상으로 합니다.

해당 컴포넌트에 맞는 HTML 기본 요소를 우선 사용합니다. 제품 구조가 다른 요소를 요구하면 반환된 ARIA와 데이터 속성을 모두 적용합니다.

## 떠 있는 화면

Popover와 Tooltip 연결 객체는 Floating UI를 사용합니다. 기본 오프셋, 충돌 시 뒤집기와 이동, 사용 가능한 크기, 화살표 배치, 분리된 앵커 숨김, 열린 동안의 자동 갱신을 지원합니다. 경계, 여백, 배치 전략, 관찰자, 미들웨어는 바꿀 수 있으며 관련 공개 경로에서 Floating UI 미들웨어도 다시 내보냅니다.

트리거가 있는 모든 팝업은 문서별 레이어 스택에도 참여합니다. Dialog, Popover, Select, Combobox, Menu, Cascade Select, Date Picker가 섞여 중첩돼도 최상위 Escape, 바깥 상호작용 닫기, 하위 레이어 전파, 포커스 복귀가 같은 규칙을 따릅니다.

## 순서 변경

`@sectile/dom/reorder`는 sequence와 tree 순서 변경을 Alt 조합 이동 키와 포인터 배치로 연결합니다. 포인터 캡처와 위치 판정은 DOM 어댑터가 담당하고 Core에는 안정 식별자와 before/after 또는 부모 배치만 전달합니다.

## 날짜와 시간 컨트롤

날짜 입력란, 시간 입력란, 달력, 선택기를 브라우저 요소에 연결할 때 `@sectile/temporal`을 설치합니다. 각 어댑터 제품군은 세분화된 선택 진입점을 사용하므로 필요한 제품군만 불러옵니다.

```sh
pnpm add @sectile/core @sectile/temporal @sectile/dom
```

```ts
import { createCalendar } from '@sectile/dom/temporal/calendar'
import { createDateField } from '@sectile/dom/temporal/date-field'
import { createDatePicker } from '@sectile/dom/temporal/date-picker'
```

## Form 조정

기존 HTML 폼에 접근 가능한 오류, 검증, 제출 처리, 일관된 초기화가 필요할 때 optional peer인 `@sectile/form`을 설치합니다. 일반 `@sectile/dom` 컴포넌트 import에는 필요하지 않습니다.

```sh
pnpm add @sectile/core @sectile/form @sectile/dom
```

```ts
import { createForm } from '@sectile/dom/form'
```

`createForm()`은 브라우저 폼 동작을 유지하면서 네이티브 입력, Sectile 컨트롤, 두 종류를 섞은 폼에서 사용할 수 있습니다. 전체 예제와 동적 필드, 네이티브 페이지 이동, 정리 방법은 [DOM 폼 안내](/ko/packages/form/dom/)를 참고하세요.

## 가상화 host

`@sectile/dom/virtual`은 모든 `@sectile/virtual` layout strategy를 scroll element에 연결합니다. Connection은 브라우저 scheduling을 맡고, 논리 collection과 markup은 응용 프로그램이 관리합니다.

```sh
pnpm add @sectile/core @sectile/virtual @sectile/dom
```

```ts
import {
  createAxisMeasurementResolver,
  createVirtualizer,
  virtualContentStyle,
  virtualItemStyle,
} from '@sectile/dom/virtual'
import { linearLayoutStrategy } from '@sectile/virtual/linear-layout'

const virtualizer = createVirtualizer({
  root: scrollElement,
  state: linearState,
  strategy: linearLayoutStrategy,
  overscan: 240,
  measure: createAxisMeasurementResolver('vertical'),
  onStateChange(state) {
    linearState = state
  },
  onPlanChange(plan, connection) {
    Object.assign(contentElement.style, virtualContentStyle(plan))
    reconcileItems(plan.placements, (element, placement) => {
      Object.assign(element.style, virtualItemStyle(placement, { width: true }))
      return connection.registerItem(element, placement.id)
    })
  },
})
```

Scroll과 resize 알림은 한 animation frame으로 합칩니다. Item rect를 한꺼번에 읽고 strategy에 한 세대의 measurement batch로 적용한 뒤 anchor를 보정하고 다음 plan을 공개합니다. `measure()`는 여러 rect가 하나의 item을 구성하는 track grid 등에 명시적인 strategy measurement를 전달합니다. `mutate()`는 domain이나 geometry 변경에도 같은 anchor 보정 경로를 적용하며, `scrollTo()`는 현재 render window 밖에 있는 ID도 요청할 수 있습니다.

`createAxisMeasurementResolver()`는 layout plan의 물리 좌표와 일치하도록 `getBoundingClientRect()`로 물리 border-box rect를 읽습니다. Content-box, device-pixel, writing-mode 기반 측정이 필요하면 custom resolver에 전달되는 원래 `ResizeObserverEntry`를 사용합니다. 재활용한 element를 다른 identity에 할당하면 이전 identity에서 대기하던 observation은 폐기합니다.

기본 viewport는 0 이상의 물리 `scrollLeft`와 `scrollTop`을 사용합니다. RTL scroller나 사용자 정의 surface의 좌표 모델이 다르면 `readViewport`와 `writeScroll`을 전달합니다.

## 스타일 선택자

DOM 연결 객체는 동작을 제공합니다. 테마는 응용 프로그램 클래스와 반영된 상태 속성으로 구성합니다.

```css
#newsletter {
  border: 1px solid var(--control-border);
  border-radius: 0.5rem;
}

#newsletter[data-state='checked'] {
  background: var(--control-accent);
  color: var(--control-on-accent);
}

#newsletter[data-disabled] {
  cursor: not-allowed;
  opacity: 0.5;
}
```

복합 컴포넌트의 속성 도우미는 안정적인 `data-scope`와 `data-part` 경계도 제공합니다. 전체 규칙은 [스타일링](/ko/guide/styling)에서 확인할 수 있습니다.

## 생성 실패 처리

일반적인 설정에서는 `create*`를 사용합니다. 바로 사용할 수 있는 연결 객체를 반환하며 설정이 잘못되면 형식이 정해진 Sectile 오류를 던집니다. 생성 실패를 복구 가능한 `Result`로 다뤄야 할 때는 대응하는 `tryCreate*`를 사용합니다.

```ts
import { createCheckbox, tryCreateCheckbox } from '@sectile/dom/checkbox'

const connection = createCheckbox(options)
const recoverable = tryCreateCheckbox(options)
```

브라우저의 `create*`는 바로 사용할 수 있는 연결 객체를 반환합니다.
