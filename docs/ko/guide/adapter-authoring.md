# Adapter 작성

새 host를 연결할 때는 Core 내부 파일을 가져오지 않고 `@sectile/core/adapter-runtime`을 안정된 경계로 사용합니다.

```text
host input
  → decode
semantic event
  → reduce
semantic command
  → project
host effect
  → host에서 실행
```

Core는 revision 순서, 의미 상태 전이, controlled state 조정, command 변환을 담당합니다. Adapter는 host input 해석과 effect 실행을 담당합니다. 의미 영역 밖의 입력은 decoder에서 `null`을 반환합니다. 이는 무시한 host input이며 실패한 의미 상태 전이가 아닙니다.

## 최소 Adapter

```ts
import { createHostAdapter } from '@sectile/core/adapter-runtime'

type KeyInput = { readonly key: string }
type Event = { readonly type: 'next' }
type Command = { readonly type: 'announce'; readonly index: number }
type Effect = { readonly type: 'speak'; readonly text: string }

const result = createHostAdapter({
  initial: { ok: true, value: { index: 0 } },
  decode: (input: KeyInput): Event | null =>
    input.key === 'ArrowDown' ? { type: 'next' } : null,
  reducer: (state, event): {
    readonly ok: true
    readonly value: {
      readonly state: { readonly index: number }
      readonly commands: readonly Command[]
    }
  } => {
    const index = event.type === 'next' ? state.index + 1 : state.index
    return {
      ok: true,
      value: {
        state: { index },
        commands: [{ type: 'announce', index }],
      },
    }
  },
  project: (command: Command): Effect => ({
    type: 'speak',
    text: `Item ${command.index + 1}`,
  }),
})

if (result.ok) {
  const transition = result.value.handleInput({ key: 'ArrowDown' })
  if (transition?.ok) {
    for (const effect of transition.commands) executeHostEffect(effect)
  }
}
```

반환된 revision result의 `commands`에는 변환된 host effect가 들어갑니다. Core는 effect를 직접 실행하지 않습니다.

## 계약

- `decode`는 정규화된 host input이 같으면 항상 같은 결과를 내야 합니다.
- `reducer`, `reconcile`, `project`는 순수 함수로 유지합니다.
- `notify`는 제안된 의미 상태를 알릴 뿐 controlled state 소유권을 넘기지 않습니다.
- `replace`는 외부 소유 상태를 동기화하고 revision을 증가시킵니다.
- 입력과 외부 상태 변경이 경합할 수 있으면 관찰한 revision을 `handleInput`에 전달합니다. 오래된 입력은 snapshot을 바꾸지 않고 거절됩니다.
- 성공한 결과의 effect만 배열 순서대로 실행합니다.
- host listener와 resource는 host package가 정리합니다. Core는 platform lifecycle을 소유하지 않습니다.

Host input 해석이 이미 다른 경계에서 끝났을 때만 `createSemanticController`를 직접 사용합니다.
