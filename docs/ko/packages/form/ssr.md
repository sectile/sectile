---
title: SSR과 hydration
description: 서버에서 렌더링한 Form 마크업, 값, 오류, ID, 외부 컨트롤을 hydration 뒤에도 안정적으로 유지합니다.
---

# SSR과 hydration

SSR은 별도의 Form 모델이 아니라 host가 맡는 문제입니다. 서버와 클라이언트는 같은 필드 소유권, 네이티브 속성, 초기값, 오류, ID 관계를 렌더링해야 합니다. 브라우저 검증, 포커스 이동, 상호작용 중 검증, 제출은 hydration 뒤에 시작합니다.

Vue 애플리케이션에서는 다음을 지키세요.

- 제어 초기값을 서버와 클라이언트에서 같게 유지합니다.
- 서버가 이미 아는 오류는 초기 Form 상태로 전달합니다.
- 안정적인 Teleport target을 서버 HTML에 렌더링합니다.
- 네이티브 `name`, `form`, `required`, `disabled`, `readonly` 속성을 유지합니다.
- 서버 트리를 만드는 동안 브라우저 전용 global을 읽지 않습니다.

DOM 연결은 HTML이 만들어진 뒤 연결되며 별도 서버 renderer를 제공하지 않습니다. 실제 패턴과 검증된 hydration 범위는 [Vue SSR과 hydration](./vue/ssr)에서 확인하세요.
