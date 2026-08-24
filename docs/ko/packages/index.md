# 패키지

| 패키지 | 역할 |
| --- | --- |
| [`@sectile/core`](/ko/packages/core) | 실행 환경과 무관한 상호작용 규칙 |
| [`@sectile/dom`](/ko/packages/dom) | 브라우저 입력과 화면 반영 |
| [`@sectile/terminal`](/ko/packages/terminal) | 터미널 입력과 화면 반영 |
| [`@sectile/vue`](/ko/packages/vue) | 스타일 없는 Vue 컴포넌트 |

각 패키지는 공개된 가져오기 경로로만 연결됩니다. 응용 프로그램에서도 패키지의 내부 파일이 아니라 공개 경로를 사용해야 합니다.
