<script setup lang="ts">
import { ref } from 'vue';
import { PaginationItem, PaginationNext, PaginationPrevious, PaginationRoot } from '@sectile/vue/pagination';
const page = ref(1);
const pageSize = ref(10);
</script>

<template>
  <div><PaginationRoot v-slot="pagination" v-model="page" v-model:items-per-page="pageSize" :total="60" label="Delivery pages"><div data-example-control-row><PaginationPrevious>Previous</PaginationPrevious><template v-for="(item, index) in pagination.items" :key="index"><PaginationItem v-if="item.type === 'page'" :item="item">{{ item.page }}</PaginationItem><span v-else-if="item.type === 'ellipsis'" aria-hidden="true">…</span></template><PaginationNext>Next</PaginationNext></div><output aria-live="polite">Page {{ pagination.page }} of {{ pagination.pageCount }} · Items {{ pagination.range.start }}–{{ pagination.range.end }}</output></PaginationRoot><p>The page and page size are both application-owned. Fetching page data remains an application task.</p></div>
</template>
