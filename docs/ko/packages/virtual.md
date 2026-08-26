# 가상화

`@sectile/virtual`은 실행 환경과 무관한 동적 크기 색인, viewport 상태, 측정 generation, anchor 보정, layout strategy를 소유합니다.

```sh
pnpm add @sectile/core @sectile/virtual
```

```ts
import { createExtentIndex } from '@sectile/virtual/extent-index'
import { createLinearLayout } from '@sectile/virtual/linear-layout'
import { createMasonryLayout } from '@sectile/virtual/masonry-layout'
import { createSpatialLayout } from '@sectile/virtual/spatial-layout'
import { createTrackGridLayout } from '@sectile/virtual/track-grid-layout'
```

ID와 순서는 `@sectile/core/sequence`, 데이터 적재는 `@sectile/core/collection-window`가 계속 소유합니다. 자세한 내용은 [가상화 계약](../theory/virtualization.md)을 참고합니다.

이 패키지는 DOM geometry를 읽지 않습니다. 브라우저의 frame 단위 측정과 scroll anchor 보정은 `@sectile/dom/virtual`, Vue composable과 headless 렌더링 파트는 `@sectile/vue/virtual`을 사용합니다.

Layout state는 불투명한 runtime handle입니다. 객체 spread나
`structuredClone()`으로 state 자체를 복사하지 않습니다. 각 strategy가 제공하는
`snapshot*Layout()`과 `restore*Layout()`을 사용합니다. Snapshot에는 schema metadata,
ID, extent, geometry, policy, 현재 generation만 들어가므로 worker나 SSR 직렬화 경계를 건널 수
있습니다. 복원 과정은 snapshot을 검증하고 query 전에 strategy별 검색 index를 다시
만듭니다.

모든 snapshot에는 `schemaVersion: 1`과 해당 strategy `kind`가 들어갑니다. Linear와
masonry snapshot은 원본 Sequence의 item 및 ID ceiling도 보존하므로 JSON이나 worker
왕복 뒤에도 같은 resource contract로 복원합니다. 다른 strategy의 snapshot이나
지원하지 않는 schema version은 복원을 거부합니다.
