<script setup lang="ts">
import {
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTitle,
  PopoverTrigger,
} from '@sectile/vue/popover';
import { FormRoot, FormSubmit, FormSummary, type FormSubmitHandler } from '@sectile/vue/form';
import DocsButton from './DocsButton.vue';

const props = withDefaults(defineProps<{
  readonly modelValue: boolean;
  readonly title: string;
  readonly align?: 'start' | 'center' | 'end';
  readonly side?: 'top' | 'right' | 'bottom' | 'left';
  readonly submit: FormSubmitHandler;
  readonly cancelLabel: string;
  readonly submitLabel: string;
}>(), { align: 'start', side: 'bottom' });

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

function close(): void {
  emit('update:modelValue', false);
}
</script>

<template>
  <PopoverRoot
    :open="props.modelValue"
    :side="props.side"
    :align="props.align"
    :collision-padding="12"
    @update:open="emit('update:modelValue', $event)"
  >
    <PopoverTrigger as-child><slot name="trigger" /></PopoverTrigger>
    <PopoverPortal>
      <PopoverContent class="demo-popover__content">
        <FormRoot :on-submit="props.submit" class="demo-popover__form">
          <header class="demo-popover__header">
            <PopoverTitle class="demo-popover__title">{{ title }}</PopoverTitle>
            <div class="demo-popover__actions">
              <DocsButton compact appearance="ghost" @click="close">{{ props.cancelLabel }}</DocsButton>
              <FormSubmit as-child>
                <DocsButton compact appearance="primary" type="submit">
                  <slot name="submit-icon" />{{ props.submitLabel }}
                </DocsButton>
              </FormSubmit>
            </div>
          </header>
          <FormSummary class="demo-popover__summary"><slot name="summary" /></FormSummary>
          <slot :close="close" />
        </FormRoot>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style scoped>
.demo-popover__content {
  z-index: 24;
  box-sizing: border-box;
  width: min(58rem, var(--sectile-position-available-width, calc(100vw - 1.5rem)));
  max-width: calc(100vw - 1.5rem);
  max-height: var(--sectile-position-available-height, calc(100vh - 1.5rem));
  overflow-y: auto;
  border: 1px solid var(--sectile-border-control);
  border-radius: .75rem;
  padding: 1rem;
  color: var(--sectile-content-primary);
  background: var(--sectile-surface);
  box-shadow: var(--sectile-shadow-floating);
}

.demo-popover__form {
  display: grid;
  min-width: 0;
}

.demo-popover__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.demo-popover__title {
  display: block;
  margin: 0;
  font-size: .92rem;
  font-weight: 750;
  line-height: 1.35;
}

.demo-popover__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: .65rem;
}

.demo-popover__summary {
  margin: 0 0 1rem;
  color: var(--sectile-feedback-critical);
  font-size: .74rem;
  font-weight: 680;
  line-height: 1.45;
}

.demo-popover__summary[hidden] { display: none; }
</style>
