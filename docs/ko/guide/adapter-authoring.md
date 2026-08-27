# Adapter 작성

새 host는 `@sectile/core/adapter-runtime`을 안정된 공개 경계로 사용합니다.

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

Core는 revision 순서, 의미 상태 전이, controlled state 조정, command 변환을 담당합니다. Adapter는 host input 해석과 effect 실행을 담당합니다. 의미 영역 밖의 입력은 decoder에서 `null`을 반환하며 host input 건너뛰기로 처리됩니다. 의미 상태 전이는 decoder가 반환한 사건에만 적용됩니다.

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

반환된 revision result의 `commands`에는 변환된 host effect가 들어갑니다. Adapter가 이 명령을 host effect로 실행합니다.

## 계약

- `decode`는 정규화된 host input이 같으면 항상 같은 결과를 내야 합니다.
- `reducer`, `reconcile`, `project`는 순수 함수로 유지합니다.
- `notify`는 제안된 의미 상태를 알리고 controlled state 소유권은 기존 소유자에게 유지합니다.
- `replace`는 외부 소유 상태를 동기화하고 revision을 증가시킵니다.
- 입력과 외부 상태 변경이 경합할 수 있으면 관찰한 revision을 `handleInput`에 전달합니다. 오래된 입력은 현재 snapshot을 유지한 채 거절됩니다.
- 성공한 결과의 effect만 배열 순서대로 실행합니다.
- Host listener, resource, platform lifecycle은 host package가 관리합니다.

Host input 해석이 이미 다른 경계에서 끝났을 때만 `createSemanticController`를 직접 사용합니다.
