<script setup lang="ts">
import { useTemplateRef, type VNodeChild } from 'vue';
import { Anchor, type AnchorProps } from '@sectile/vue/primitive';
const props: AnchorProps = { href: '/docs', target: '_blank', current: 'page' };
const anchor = useTemplateRef<InstanceType<typeof Anchor>>('anchor');
function focus() { const element: HTMLAnchorElement | null = anchor.value?.element ?? null; element?.focus(); }
function contentKind(value: VNodeChild): string { return typeof value; }
</script>

<template>
  <Anchor ref="anchor" v-bind="props" @click="event => event.preventDefault()" @focus="focus">
    <template #default="{ disabled, current }">{{ disabled ? 'Unavailable' : current ?? 'Docs' }}</template>
    <template #content="{ children, disabled }"><span :aria-disabled="disabled">{{ contentKind(children) }}</span></template>
  </Anchor>
  <Anchor as-child disabled><a href="/account">Account</a></Anchor>
</template>
