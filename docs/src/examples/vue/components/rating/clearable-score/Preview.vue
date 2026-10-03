<script setup lang="ts">
import { ref } from 'vue';
import { RatingClear, RatingItem, RatingRoot } from '@sectile/vue/rating';
const scores = ['1', '2', '3', '4', '5'];
const score = ref('3');
</script>

<template>
  <div>
    <RatingRoot v-model="score" :items="scores" clearable aria-label="Delivery rating">
      <div data-example-control-row>
        <RatingItem
          v-for="item in scores"
          :key="item"
          :value="item"
          :aria-label="`${item} out of 5`"
          :data-rated="Number(item) <= Number(score) ? '' : undefined"
        >
          <svg data-example-rating-icon viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z" />
          </svg>
        </RatingItem>
        <RatingClear>Clear rating</RatingClear>
      </div>
    </RatingRoot>
    <output aria-live="polite">Rating: {{ score ? `${score} out of 5` : 'none' }}</output>
    <p>Choose a score with a pointer or arrow keys. Clearing leaves the rating unanswered.</p>
  </div>
</template>
