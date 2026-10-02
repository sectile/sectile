<script setup lang="ts">
import { ref } from 'vue';
import { RatingClear, RatingItem, RatingRoot } from '@sectile/vue/rating';
const scores = ['1', '2', '3', '4', '5'];
const score = ref('3');
</script>

<template>
  <div><RatingRoot v-model="score" :items="scores" clearable aria-label="Delivery rating"><div data-example-control-row><RatingItem v-for="item in scores" :key="item" :value="item" :aria-label="`${item} out of 5`">{{ item }}</RatingItem><RatingClear>Clear rating</RatingClear></div></RatingRoot><output aria-live="polite">Rating: {{ score || 'none' }}</output><p>Choose a score with a pointer or arrow keys. Clearing leaves the rating unanswered.</p></div>
</template>
