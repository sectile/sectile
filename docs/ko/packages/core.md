# 코어

`@sectile/core`에는 실행 환경과 무관한 컴포넌트 규칙과 순서, 범위, 격자, 계층, 선택, 펼침, 현재 위치, 텍스트 편집의 기본 구조가 들어 있습니다.

<HostInstall />

컴포넌트별 공개 경로를 직접 가져옵니다.

```ts
import * as listbox from '@sectile/core/listbox'
```

코어는 브라우저, 터미널, Vue, 스타일에 의존하지 않습니다.

## 오류 처리

코어의 생성 함수와 상태 전이는 `Result`를 반환합니다. 실패를 복구할 수 있다면 성공 여부를 나눠 처리합니다. 실패를 예외로 바꾸는 것이 의도된 경계에서만 `unwrap`을 사용합니다.

```ts
const result = sequence.createSequence(['alpha', 'beta'])

if (!result.ok) {
  report(result.error)
} else {
  use(result.value)
}
```

`create*`와 `tryCreate*`를 나누는 방식은 브라우저·터미널 연결 함수에 적용됩니다. 코어의 `Result` 반환 규칙은 그대로 유지됩니다.
