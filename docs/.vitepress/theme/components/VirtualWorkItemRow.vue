<script setup lang="ts">
import { computed } from 'vue';
import { Check, ChevronDown, Clock3, MapPin, Users } from '@lucide/vue';
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox';
import { DisclosureContent, DisclosureRoot, DisclosureTrigger } from '@sectile/vue/disclosure';
import { useDocsLocale } from '../locale.js';
import { workItemRecord } from '../../../examples/virtual/work-item-data.js';

const props = defineProps<{
  readonly id: string;
  readonly visible: boolean;
  readonly selected: boolean;
  readonly expanded: boolean;
  readonly density: 'compact' | 'comfortable';
}>();

const emit = defineEmits<{
  select: [value: boolean];
  expand: [value: boolean];
}>();

const { isKorean } = useDocsLocale();
const workItem = computed(() => workItemRecord(props.id, isKorean.value));
const priorityLabel = computed(() => isKorean.value
  ? ({ critical: '긴급', high: '높음', medium: '보통', low: '낮음' })[workItem.value.priority]
  : ({ critical: 'Urgent', high: 'High', medium: 'Normal', low: 'Low' })[workItem.value.priority]);
const stateLabel = computed(() => isKorean.value
  ? ({ investigating: '확인 중', monitoring: '답변 대기', resolved: '완료' })[workItem.value.state]
  : ({ investigating: 'Reviewing', monitoring: 'Waiting', resolved: 'Done' })[workItem.value.state]);
const copy = computed(() => isKorean.value ? {
  select: `${workItem.value.number} 선택`, openDetails: '처리 내역', closeDetails: '접기', affected: '관련 고객', age: '대기 시간', minutes: '분',
  timeline: '처리 내역', owner: '담당 팀', region: '접수 경로',
} : {
  select: `Select ${workItem.value.number}`, openDetails: 'Activity', closeDetails: 'Collapse', affected: 'Related customers', age: 'Waiting', minutes: ' min',
  timeline: 'Activity history', owner: 'Owner', region: 'Channel',
});
</script>

<template>
  <article
    class="work-item-row"
    :class="[`work-item-row--${density}`, { 'work-item-row--visible': visible, 'work-item-row--selected': selected }]"
    :data-priority="workItem.priority"
  >
    <DisclosureRoot class="work-item-row__disclosure" :model-value="expanded" @update:model-value="emit('expand', $event)">
      <div class="work-item-row__primary">
        <CheckboxRoot class="ds-check" :model-value="selected" :aria-label="copy.select" @update:model-value="emit('select', $event === true)">
          <CheckboxIndicator><Check :size="13" :stroke-width="3" aria-hidden="true" /></CheckboxIndicator>
        </CheckboxRoot>

        <div class="work-item-row__identity">
          <div class="work-item-row__eyebrow">
            <span class="ds-status" :data-intent="workItem.priority">{{ priorityLabel }}</span>
            <code>{{ workItem.number }}</code>
            <span>{{ workItem.service }}</span>
          </div>
          <strong>{{ workItem.title }}</strong>
          <p v-if="density === 'comfortable'">{{ workItem.summary }}</p>
          <div class="work-item-row__tags" aria-label="Tags">
            <span v-for="tag in workItem.tags" :key="tag">{{ tag }}</span>
          </div>
        </div>

        <dl class="work-item-row__metrics">
          <div><dt><Users :size="13" aria-hidden="true" />{{ copy.affected }}</dt><dd>{{ workItem.affected.toLocaleString() }}</dd></div>
          <div><dt><Clock3 :size="13" aria-hidden="true" />{{ copy.age }}</dt><dd>{{ workItem.ageMinutes }}{{ copy.minutes }}</dd></div>
          <div><dt><MapPin :size="13" aria-hidden="true" />{{ copy.region }}</dt><dd>{{ workItem.region }}</dd></div>
        </dl>

        <div class="work-item-row__state">
          <span class="ds-status" :data-intent="workItem.state">{{ stateLabel }}</span>
          <DisclosureTrigger class="ds-icon-action work-item-row__details-button">
            {{ expanded ? copy.closeDetails : copy.openDetails }}<ChevronDown :size="16" aria-hidden="true" />
          </DisclosureTrigger>
        </div>
      </div>

      <DisclosureContent class="work-item-row__details">
        <strong>{{ copy.timeline }}</strong>
        <ol>
          <li v-for="(activity, index) in workItem.activity" :key="activity"><span>{{ index + 1 }}</span>{{ activity }}</li>
        </ol>
        <dl>
          <div><dt>{{ copy.owner }}</dt><dd>{{ workItem.owner }}</dd></div>
          <div><dt>{{ copy.region }}</dt><dd>{{ workItem.region }}</dd></div>
        </dl>
      </DisclosureContent>
    </DisclosureRoot>
  </article>
</template>
