# 코어

`@sectile/core`에는 실행 환경과 무관한 컴포넌트 규칙과 순서, 범위, 격자, 계층, 선택, 펼침, 현재 위치, 텍스트 편집의 기본 구조가 들어 있습니다.

<HostInstall />

컴포넌트별 공개 경로를 직접 가져옵니다.

```ts
import * as listbox from '@sectile/core/listbox'
```

날짜·시간 의미는 [`@sectile/temporal`](temporal.md), 동적 가상화는 [`@sectile/virtual`](virtual.md)에 있습니다.

코어는 브라우저, 터미널, Vue, 스타일에 의존하지 않습니다.

## ID와 revision

공개 컴포넌트 ID인 `StableID`는 문자열 계약입니다. 문자열 ID는 직렬화, DOM 속성, 터미널 효과, 프레임워크 key에 그대로 사용할 수 있습니다. 원본 ID가 숫자나 객체라면 Sectile domain을 만들기 전에 충돌하지 않는 안정적인 문자열로 바꾸고, 역방향 조회는 응용 프로그램 상태에 둡니다.

`RevisionSnapshot.revision`은 화면 상태가 바뀐 횟수가 아니라 수락된 이벤트의 순서 번호입니다. 경계에서 더 이동할 수 없어 상태가 같게 남는 no-op도 수락된 이벤트라면 정확히 한 번 증가합니다. 오래된 외부 관리 갱신을 거부하고 이벤트 순서를 지키는 용도로 사용하며 렌더링 횟수나 변경 여부를 판단하는 값으로 사용하지 않습니다.

## 오류 처리

코어의 생성 함수와 상태 전이는 `Result`를 반환합니다. 실패를 복구할 수 있다면 성공 여부를 나눠 처리합니다. 실패를 예외로 바꾸는 것이 의도된 경계에서만 `unwrap`을 사용합니다.

`SectileErrorCode`는 닫힌 union입니다. 알려진 코드를 빠짐없이 처리하고, 응용 프로그램 전용 오류 문자열을 Sectile 타입으로 강제 변환하지 말고 별도 오류 타입에 둡니다.

```ts
const result = sequence.createSequence(['alpha', 'beta'])

if (!result.ok) {
  report(result.error)
} else {
  use(result.value)
}
```

`create*`와 `tryCreate*`를 나누는 방식은 브라우저·터미널 연결 함수에 적용됩니다. 코어의 `Result` 반환 규칙은 그대로 유지됩니다.
