---
title: Chart 성능 계약
description: Chart cardinality 상한, 비용, allocation과 renderer tradeoff를 설명합니다.
---

# 성능 계약

Chart에서 성능은 동작 계약의 일부입니다. Collection을 만드는 모든 공개 경로에는 명시적 상한이 있고, immutable generation은 숨은 부분 상태를 막으며, renderer는 packed typed array를 소비합니다.

| 작업 | 시간 | 추가 보관 공간 |
| --- | --- | --- |
| Model 생성·교체 | `O(n + l)` | packed value, ID, index에 `O(n + l)` |
| Patch 적용 | `O(n + p)` | 다음 immutable generation에 `O(n + p)` |
| Projection | `O(n + k)` | representative에 `O(k + l)` |
| 같은 controller projection 반복 | `O(1)` | projection 한 건 |
| Query index 생성 | `O(k log k)` | `O(k)` |
| Index 생성 후 hit test | 평균 `O(log k + h)`, 최악 `O(k)` | 제한된 결과, `h <= 256` |
| Render | `O(k)` upload/work, batch별 draw call | renderer 소유 GPU 또는 Canvas 자원 |

`n`은 원본 datum 수, `l`은 layer 수, `p`는 patch 크기, `k`는 방출 representative 수, `h`는 반환 hit 수입니다. Projection budget은 draw와 query cardinality를 제한하지만 model normalization을 sublinear하게 만들지는 않습니다.

반복되는 mark 수가 많으면 WebGL2를, 호환성·진단·작은 surface에는 Canvas2D를 사용합니다. Adaptive resolution은 pixel work를 줄여 frame time을 보호하고 representative limit은 CPU projection, upload, query index와 draw work를 보호합니다. 어느 policy도 semantic state를 바꾸지 않습니다.

직접 package evidence를 실행하려면 다음 명령을 사용합니다.

```sh
pnpm --filter @sectile/chart test
pnpm --filter @sectile/chart benchmark
```

Repository close 검증은 complexity witness, consumer bundle, optional peer install cost, source map, lifecycle retention과 public signature도 확인합니다.

실제 GPU 검증은 DOM 패키지를 build하고 저장소 root를 serve한 다음 `packages/dom/verification/chart-webgl2-browser.html`을 엽니다. Fixture는 software renderer를 거부하고 다섯 batch type의 shader compile·draw와 pixel readback, 10만 point upload, context loss·restore, disconnect 후 live renderer resource 0을 확인합니다. 최신 하드웨어 결과는 `packages/dom/verification/chart-webgl2-browser.json`에 기록하며, 명시된 browser와 GPU에만 해당합니다.
