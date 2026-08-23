# Vue

`@sectile/vue`는 스타일 없는 조합형 컴포넌트, Vue의 일반적인 상태 연결 방식, HTML에 가까운 속성 이름, 안정적인 구성 요소와 자식 요소 합치기를 제공합니다.

::: warning 개발 중
Vue 패키지는 아직 공개 배포 전입니다. 현재 문서는 공개 API가 안정되기 전의 작업 공간 사용법을 설명합니다.
:::

```vue
<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox'
</script>
```

Vue 컴포넌트에는 시각 스타일이 들어 있지 않습니다. 응용 프로그램에서 클래스와 상태 선택자를 적용합니다.
