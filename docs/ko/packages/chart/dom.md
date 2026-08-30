---
title: DOM Chart 렌더링
description: 제한된 브라우저 자원으로 chart projection과 input을 WebGL2 또는 Canvas2D에 연결합니다.
---

# DOM Chart 렌더링

`@sectile/dom/chart`는 기존 root와 canvas를 Chart controller에 연결합니다. Resize 관찰, pointer와 keyboard input, animation frame scheduling, 접근성 projection, renderer 자원과 cleanup을 소유합니다.

```sh
pnpm add @sectile/chart @sectile/dom
```

```ts
import { createDOMChart } from '@sectile/dom/chart'

const chart = createDOMChart({
  root,
  canvas,
  controller,
  renderer: 'auto',
  renderPolicy: {
    type: 'adaptive',
    minimumRenderScale: 0.5,
    maximumRenderScale: 1,
    frameBudgetMs: 12,
    maximumRepresentatives: 100_000,
  },
  getAccessibleDatumLabel: id => `Datum ${id}`,
})
```

`auto`는 WebGL2를 우선하고 Canvas2D로 fallback합니다. WebGL2는 typed array upload와 rectangle·cell·analytic arc instancing을 사용합니다. Canvas2D는 호환성과 진단용 backend입니다. Renderer는 data mark만 그리며 axis, label, legend, 색상, layout과 animation은 응용 프로그램이 맡습니다.

Fixed policy는 하나의 render scale을 유지합니다. Adaptive policy는 frame 비용에 따라 명시된 범위 안에서 backing resolution을 바꿉니다. 두 policy 모두 GPU upload 전 representative 수를 제한할 수 있습니다.

Connection은 render를 animation frame으로 모으고 pointer 좌표를 현재 projection에 연결하며 keyboard cursor 이동과 view reset을 지원합니다. 접근 가능한 datum 목록에도 별도 상한이 있습니다. `flush()`는 대기 중인 작업을 동기 실행합니다. `disconnect()`는 listener와 observer를 제거하고 frame을 취소하며 내부에서 만든 renderer를 해제합니다. 응용 프로그램이 전달한 renderer의 수명은 응용 프로그램이 소유합니다.

