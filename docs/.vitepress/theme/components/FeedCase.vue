<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import {
  CheckCircle2,
  CircleDotDashed,
  GitPullRequest,
  MessageSquare,
  Rocket,
  ShieldCheck,
  Tag,
} from '@lucide/vue';
import { FeedItem, FeedLoadEarlier, FeedLoadNewer, FeedRoot } from '@sectile/vue/feed';
import DemoCard from './DemoCard.vue';

type ActivityKind = 'deployment' | 'approval' | 'check' | 'comment' | 'release';

interface ReleaseActivity {
  readonly id: string;
  readonly kind: ActivityKind;
  readonly title: string;
  readonly description: string;
  readonly actor: string;
  readonly time: string;
  readonly status?: string;
}

const props = defineProps<{
  readonly scenario: string;
  readonly title: string;
  readonly description: string;
}>();

const activity = Object.freeze<readonly ReleaseActivity[]>([
  { id: 'healthy', kind: 'deployment', title: 'Production deployment completed', description: 'Release 2026.08 is healthy in all regions.', actor: 'Deploy bot', time: 'Just now', status: 'Healthy' },
  { id: 'started', kind: 'deployment', title: 'Production deployment started', description: 'Rolling out web@2.8.0 to 12 instances.', actor: 'Deploy bot', time: '2 min ago', status: 'Running' },
  { id: 'approved', kind: 'approval', title: 'Release approved', description: 'Mina approved the production promotion.', actor: 'Mina Kim', time: '18 min ago' },
  { id: 'checks', kind: 'check', title: 'Required checks passed', description: 'Unit, integration, accessibility, and bundle checks completed.', actor: 'CI', time: '24 min ago', status: '12/12' },
  { id: 'note', kind: 'comment', title: 'Release note updated', description: 'Added migration guidance for the Vue adapter.', actor: 'Alex Chen', time: '41 min ago' },
  { id: 'tagged', kind: 'release', title: 'Version 2.8.0 tagged', description: 'Created tag v2.8.0 from commit 9e41c2a.', actor: 'Release bot', time: '56 min ago' },
  { id: 'audit', kind: 'check', title: 'Security review completed', description: 'No blocking findings detected for this release.', actor: 'Security bot', time: '1 hr ago', status: 'Passed' },
]);

function initialWindow(): readonly string[] {
  if (props.scenario === 'load-after') return Object.freeze(activity.slice(2, 6).map(({ id }) => id));
  if (props.scenario === 'load-before') return Object.freeze(activity.slice(0, 4).map(({ id }) => id));
  return Object.freeze(activity.map(({ id }) => id));
}

const windowIDs = ref<readonly string[]>(initialWindow());
const revision = ref(0);
const statusMessage = ref('');
const visibleActivity = computed(() => activity.filter(({ id }) => windowIDs.value.includes(id)));
const canLoadNewer = computed(() => props.scenario === 'load-after' && !windowIDs.value.includes(activity[0]!.id));
const canLoadEarlier = computed(() => props.scenario === 'load-before' && !windowIDs.value.includes(activity.at(-1)!.id));
const newerCount = computed(() => activity.findIndex(({ id }) => id === windowIDs.value[0]));
const oldestVisibleIndex = computed(() => activity.findIndex(({ id }) => id === windowIDs.value.at(-1)));
const earlierCount = computed(() => Math.max(0, activity.length - oldestVisibleIndex.value - 1));
const getPosition = (id: string): number => activity.findIndex((event) => event.id === id) + 1;
const state = computed(() => ({
  revision: revision.value,
  visible: windowIDs.value.length,
  total: activity.length,
  canLoadNewer: canLoadNewer.value,
  canLoadEarlier: canLoadEarlier.value,
}));

let loadingTimer: ReturnType<typeof setTimeout> | undefined;

function loadWindow(direction: 'before' | 'after'): void {
  if (loadingTimer !== undefined) return;
  statusMessage.value = '';
  loadingTimer = setTimeout(() => {
    if (direction === 'after' && canLoadNewer.value) {
      windowIDs.value = Object.freeze(activity.slice(0, 6).map(({ id }) => id));
      statusMessage.value = '2 new deployment updates loaded.';
    } else if (direction === 'before' && canLoadEarlier.value) {
      windowIDs.value = Object.freeze(activity.map(({ id }) => id));
      statusMessage.value = '3 earlier release events loaded.';
    }
    revision.value += 1;
    loadingTimer = undefined;
  }, 450);
}

onBeforeUnmount(() => {
  if (loadingTimer !== undefined) clearTimeout(loadingTimer);
});
</script>

<template>
  <DemoCard :title="title" :revision="revision" :state="state" :entries="[]" interaction="enabled" code="">
    <FeedRoot
      :items="windowIDs"
      :revision="revision"
      :set-size="activity.length"
      :get-position="getPosition"
      label="Release 2026.08 activity"
      class="feed-demo"
      @request-window="loadWindow"
      v-slot="{ pending }"
    >
      <header class="feed-demo__header">
        <div>
          <strong>Release activity</strong>
          <span>production · release-2026.08</span>
        </div>
        <span class="feed-demo__live"><span aria-hidden="true" /> Live</span>
      </header>

      <FeedLoadNewer v-if="canLoadNewer" class="feed-demo__load feed-demo__load--newer">
        <CircleDotDashed :size="16" :class="{ 'is-loading': pending === 'after' }" aria-hidden="true" />
        {{ pending === 'after' ? 'Checking for updates…' : `${newerCount} new updates` }}
      </FeedLoadNewer>

      <div class="feed-demo__list">
        <FeedItem
          v-for="event in visibleActivity"
          :key="event.id"
          :value="event.id"
          class="feed-demo__item"
        >
          <span class="feed-demo__marker" :data-kind="event.kind">
            <Rocket v-if="event.kind === 'deployment'" :size="17" aria-hidden="true" />
            <GitPullRequest v-else-if="event.kind === 'approval'" :size="17" aria-hidden="true" />
            <ShieldCheck v-else-if="event.kind === 'check'" :size="17" aria-hidden="true" />
            <MessageSquare v-else-if="event.kind === 'comment'" :size="17" aria-hidden="true" />
            <Tag v-else :size="17" aria-hidden="true" />
          </span>
          <span class="feed-demo__copy">
            <span class="feed-demo__title-row">
              <strong>{{ event.title }}</strong>
              <span v-if="event.status" class="feed-demo__status">{{ event.status }}</span>
            </span>
            <span>{{ event.description }}</span>
            <small>{{ event.actor }} · {{ event.time }}</small>
          </span>
        </FeedItem>
      </div>

      <FeedLoadEarlier v-if="canLoadEarlier" class="feed-demo__load feed-demo__load--earlier">
        <CircleDotDashed :size="16" :class="{ 'is-loading': pending === 'before' }" aria-hidden="true" />
        {{ pending === 'before' ? 'Loading release history…' : `Load ${earlierCount} earlier events` }}
      </FeedLoadEarlier>

      <footer class="feed-demo__footer">
        <p v-if="statusMessage" role="status" aria-live="polite">
          <CheckCircle2 :size="15" aria-hidden="true" /> {{ statusMessage }}
        </p>
        <p v-else-if="scenario === 'finite'">
          <CheckCircle2 :size="15" aria-hidden="true" /> Complete history · {{ activity.length }} events
        </p>
        <span>Release 2026.08</span>
      </footer>
    </FeedRoot>
  </DemoCard>
</template>
