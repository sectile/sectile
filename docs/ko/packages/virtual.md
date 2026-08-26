# 가상화

`@sectile/virtual`은 실행 환경과 무관한 동적 크기 색인, viewport 상태, 측정 generation, anchor 보정, layout strategy를 소유합니다.

```sh
pnpm add @sectile/core @sectile/virtual
```

```ts
import { createExtentIndex } from '@sectile/virtual/extent-index'
import { createLinearLayout } from '@sectile/virtual/linear-layout'
```

ID와 순서는 `@sectile/core/sequence`, 데이터 적재는 `@sectile/core/collection-window`가 계속 소유합니다. 자세한 내용은 [가상화 계약](../theory/virtualization.md)을 참고합니다.
