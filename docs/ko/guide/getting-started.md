# 시작하기

Vue 화면을 만든다면 아래의 기본 선택인 **Vue**를 그대로 사용하세요. 기존 브라우저 마크업은 DOM, 터미널 애플리케이션은 Terminal을 고릅니다. 직접 renderer를 만들거나 host 없이 상호작용 규칙을 테스트할 때만 Core부터 시작하면 됩니다.

## 패키지 설치

<HostInstall />

개발, SSR, Node 터미널 연동에는 Node.js 24 이상이 필요합니다. 브라우저 전용 번들의 지원 범위는 이를 배포하는 응용 프로그램의 브라우저 지원 정책을 따릅니다.

## 컴포넌트 하나 불러오기

모든 컴포넌트에는 공개 하위 경로가 있습니다. 기본 예제는 Vue Checkbox 파트를 가져오며, 위에서 패키지를 바꾸면 해당 host의 import를 보여줍니다.

<PackageImport component="checkbox" />

## 다음 단계

- [체크박스](/ko/components/checkbox)에서 실행되는 전체 예제와 API를 복사하세요.
- 제품 CSS를 적용하려면 [스타일 적용](/ko/guide/styling)을 확인하세요.
- 값을 애플리케이션 상태가 직접 관리해야 할 때 [상태 관리 방식](/ko/guide/state-ownership)을 읽으세요.
