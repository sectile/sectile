<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import HostSelector from './components/HostSelector.vue';

const Layout = DefaultTheme.Layout;
</script>

<template>
  <Layout>
    <template #nav-bar-content-after>
      <div class="docs-preferences">
        <HostSelector />
      </div>
    </template>
    <template #nav-screen-content-after>
      <HostSelector mobile />
    </template>
  </Layout>
</template>
