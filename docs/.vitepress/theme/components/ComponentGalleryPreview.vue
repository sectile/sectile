<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  readonly component: string;
  readonly family: string;
}>();

const preview = computed(() => {
  const id = props.component;
  if (id === 'color-picker') return 'color';
  if (id === 'form') return 'form';
  if (id === 'pin-input') return 'pin';
  if (id === 'tags-input') return 'tags';
  if (id === 'checkbox') return 'check';
  if (id === 'checkbox-group' || id === 'radio-group' || id === 'rating') return 'choices';
  if (id === 'switch') return 'switch';
  if (id === 'toggle-button' || id === 'toggle-group') return 'segments';
  if (id === 'select' || id === 'combobox' || id === 'listbox') return 'select';
  if (id === 'cascade-select') return 'columns';
  if (id === 'calendar' || id.includes('picker') || id === 'range-calendar') return 'calendar';
  if (id === 'timer') return 'timer';
  if (id === 'multi-thumb-slider' || id === 'slider') return 'slider';
  if (id === 'window-splitter') return 'splitter';
  if (id === 'feed') return 'feed';
  if (id === 'grid') return 'grid';
  if (id === 'tree-grid' || id === 'tree-view') return 'tree';
  if (id === 'menu' || id === 'menu-button') return 'menu';
  if (id === 'menubar' || id === 'toolbar') return 'toolbar';
  if (id === 'toast') return 'toast';
  if (props.family === 'popup') return 'popup';
  if (id === 'pagination') return 'pagination';
  if (id === 'tabs') return 'tabs';
  if (id === 'stepper') return 'steps';
  if (id === 'carousel') return 'carousel';
  if (id === 'accordion' || id === 'disclosure') return 'disclosure';
  return 'field';
});
</script>

<template>
  <div class="gallery-preview" :data-preview="preview" aria-hidden="true">
    <template v-if="preview === 'color'">
      <span class="color-swatch" />
      <span class="preview-line preview-line--long" />
      <span class="color-track"><i /></span>
      <span class="color-track color-track--short"><i /></span>
    </template>

    <template v-else-if="preview === 'form'">
      <span class="preview-label" />
      <span class="preview-input" />
      <span class="preview-label preview-label--short" />
      <span class="preview-input" />
      <span class="preview-action" />
    </template>

    <template v-else-if="preview === 'pin'">
      <span v-for="index in 4" :key="index" class="pin-cell">{{ index === 2 ? '•' : '' }}</span>
    </template>

    <template v-else-if="preview === 'tags'">
      <span class="tag-chip">Vue</span>
      <span class="tag-chip">ARIA</span>
      <span class="tag-caret" />
    </template>

    <template v-else-if="preview === 'check'">
      <span class="check-box"><i /></span>
      <span class="preview-line preview-line--medium" />
    </template>

    <template v-else-if="preview === 'choices'">
      <span v-for="index in 3" :key="index" class="choice-row">
        <i :class="{ 'is-selected': index === 1 }" />
        <b :class="`choice-line choice-line--${index}`" />
      </span>
    </template>

    <template v-else-if="preview === 'switch'">
      <span class="preview-line preview-line--medium" />
      <span class="switch-track"><i /></span>
    </template>

    <template v-else-if="preview === 'segments'">
      <span v-for="index in 3" :key="index" class="segment" :class="{ 'is-selected': index === 2 }" />
    </template>

    <template v-else-if="preview === 'select'">
      <span class="select-trigger"><i /><b /></span>
      <span class="select-list">
        <i v-for="index in 3" :key="index" :class="{ 'is-selected': index === 2 }" />
      </span>
    </template>

    <template v-else-if="preview === 'columns'">
      <span v-for="column in 3" :key="column" class="column-list">
        <i v-for="row in 3" :key="row" :class="{ 'is-selected': row === column }" />
      </span>
    </template>

    <template v-else-if="preview === 'calendar'">
      <span class="calendar-head"><i /><b /><i /></span>
      <span class="calendar-grid">
        <i v-for="day in 14" :key="day" :class="{ 'is-selected': day === 10 }">{{ day }}</i>
      </span>
    </template>

    <template v-else-if="preview === 'timer'">
      <span class="timer-value">08:42</span>
      <span class="timer-actions"><i /><i /><i /></span>
    </template>

    <template v-else-if="preview === 'slider'">
      <span class="slider-value">64</span>
      <span class="slider-track"><i /><i v-if="component === 'multi-thumb-slider'" /></span>
    </template>

    <template v-else-if="preview === 'splitter'">
      <span class="split-pane split-pane--primary" />
      <span class="split-handle" />
      <span class="split-pane" />
    </template>

    <template v-else-if="preview === 'feed'">
      <span v-for="index in 3" :key="index" class="feed-row"><i /><b /></span>
    </template>

    <template v-else-if="preview === 'grid'">
      <span class="data-grid">
        <i v-for="index in 12" :key="index" :class="{ 'is-selected': index === 6 }" />
      </span>
    </template>

    <template v-else-if="preview === 'tree'">
      <span v-for="index in 4" :key="index" class="tree-row" :class="`tree-row--${index}`"><i /><b /></span>
    </template>

    <template v-else-if="preview === 'menu'">
      <span class="menu-trigger" />
      <span class="menu-list"><i v-for="index in 3" :key="index" /></span>
    </template>

    <template v-else-if="preview === 'toolbar'">
      <span v-for="index in 5" :key="index" class="tool" :class="{ 'is-selected': index === 2 }" />
    </template>

    <template v-else-if="preview === 'popup'">
      <span class="popup-trigger" />
      <span class="popup-surface"><i /><b /><em /></span>
    </template>

    <template v-else-if="preview === 'toast'">
      <span class="toast-mark" />
      <span class="toast-copy"><i /><b /></span>
      <span class="toast-close" />
    </template>

    <template v-else-if="preview === 'pagination'">
      <span v-for="index in 5" :key="index" class="page" :class="{ 'is-selected': index === 3 }">{{ index }}</span>
    </template>

    <template v-else-if="preview === 'tabs'">
      <span class="tab-list"><i v-for="index in 3" :key="index" :class="{ 'is-selected': index === 1 }" /></span>
      <span class="tab-panel"><i /><b /></span>
    </template>

    <template v-else-if="preview === 'steps'">
      <span v-for="index in 3" :key="index" class="step" :class="{ 'is-selected': index === 2 }"><i>{{ index }}</i><b /></span>
    </template>

    <template v-else-if="preview === 'carousel'">
      <span class="carousel-slide"><i /><b /></span>
      <span class="carousel-dots"><i /><i class="is-selected" /><i /></span>
    </template>

    <template v-else-if="preview === 'disclosure'">
      <span class="disclosure-row"><i /><b /></span>
      <span class="disclosure-copy"><i /><b /></span>
      <span class="disclosure-row"><i /><b /></span>
    </template>

    <template v-else>
      <span class="preview-label" />
      <span class="field-control"><i /><b /></span>
    </template>
  </div>
</template>

<style scoped>
.gallery-preview {
  --preview-ink: color-mix(in srgb, var(--vp-c-text-2) 42%, transparent);
  --preview-soft: color-mix(in srgb, var(--vp-c-text-3) 18%, transparent);
  --preview-accent: var(--vp-c-brand-1);
  display: flex;
  width: 100%;
  height: 128px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  overflow: hidden;
  padding: 20px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  pointer-events: none;
  user-select: none;
}

.gallery-preview span,
.gallery-preview i,
.gallery-preview b,
.gallery-preview em { box-sizing: border-box; }

.preview-line,
.preview-label,
.choice-line { display: block; height: 7px; border-radius: 4px; background: var(--preview-ink); }
.preview-line--long { width: 88px; }
.preview-line--medium { width: 72px; }
.preview-label { width: 54px; height: 5px; }
.preview-label--short { width: 38px; }
.preview-input,
.field-control { display: flex; width: 100%; height: 27px; align-items: center; border: 1px solid var(--preview-ink); border-radius: 7px; }
.preview-action { width: 50px; height: 21px; align-self: flex-end; border-radius: 6px; background: var(--preview-accent); opacity: .9; }

[data-preview='form'] { flex-direction: column; align-items: flex-start; gap: 6px; padding-inline: 34px; }
[data-preview='color'] { display: grid; grid-template-columns: 54px 1fr; grid-template-rows: repeat(3, auto); gap: 8px 14px; padding-inline: 32px; }
.color-swatch { grid-row: 1 / 4; width: 54px; height: 54px; border-radius: 12px; background: var(--preview-accent); box-shadow: inset 0 0 0 8px color-mix(in srgb, white 16%, transparent); }
.color-track { position: relative; width: 98px; height: 6px; border-radius: 4px; background: linear-gradient(90deg, var(--vp-c-brand-3), var(--vp-c-tip-1)); }
.color-track--short { width: 76px; opacity: .65; }
.color-track i { position: absolute; top: 50%; left: 62%; width: 12px; height: 12px; border: 2px solid var(--vp-c-bg); border-radius: 50%; background: var(--vp-c-text-1); transform: translate(-50%, -50%); }

.pin-cell { display: grid; width: 34px; height: 40px; place-items: center; border: 1px solid var(--preview-ink); border-radius: 8px; color: var(--preview-accent); font-size: 20px; }
.tag-chip { padding: 5px 9px; border-radius: 7px; background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); font-size: 11px; font-weight: 650; }
.tag-caret { width: 1px; height: 24px; background: var(--preview-accent); }
.check-box { display: grid; width: 24px; height: 24px; place-items: center; border-radius: 6px; background: var(--preview-accent); }
.check-box i { width: 9px; height: 5px; border-bottom: 2px solid white; border-left: 2px solid white; transform: translateY(-1px) rotate(-45deg); }

[data-preview='choices'] { flex-direction: column; align-items: stretch; padding-inline: 42px; }
.choice-row { display: flex; align-items: center; gap: 9px; }
.choice-row i { width: 14px; height: 14px; flex: none; border: 1px solid var(--preview-ink); border-radius: 50%; }
.choice-row i.is-selected { border: 4px solid var(--preview-accent); }
.choice-line--1 { width: 82%; }
.choice-line--2 { width: 65%; }
.choice-line--3 { width: 74%; }

.switch-track { width: 44px; height: 24px; padding: 3px; border-radius: 12px; background: var(--preview-accent); }
.switch-track i { display: block; width: 18px; height: 18px; margin-left: auto; border-radius: 50%; background: white; }
[data-preview='segments'] { gap: 0; }
.segment { width: 52px; height: 32px; border: 1px solid var(--preview-ink); }
.segment:first-child { border-radius: 8px 0 0 8px; }
.segment:last-child { border-radius: 0 8px 8px 0; }
.segment + .segment { border-left: 0; }
.segment.is-selected { background: var(--vp-c-brand-soft); box-shadow: inset 0 -2px var(--preview-accent); }

[data-preview='select'] { position: relative; align-items: flex-start; padding-top: 24px; }
.select-trigger { display: flex; width: 142px; height: 30px; align-items: center; justify-content: space-between; padding: 0 10px; border: 1px solid var(--preview-ink); border-radius: 7px; }
.select-trigger i { width: 64px; height: 6px; border-radius: 3px; background: var(--preview-ink); }
.select-trigger b { width: 7px; height: 7px; border-right: 1px solid var(--vp-c-text-2); border-bottom: 1px solid var(--vp-c-text-2); transform: translateY(-2px) rotate(45deg); }
.select-list { position: absolute; top: 60px; width: 142px; padding: 5px; border: 1px solid var(--vp-c-border); border-radius: 8px; background: var(--vp-c-bg); box-shadow: 0 8px 20px rgba(9, 14, 24, .14); }
.select-list i { display: block; width: 80%; height: 6px; margin: 6px; border-radius: 3px; background: var(--preview-ink); }
.select-list i.is-selected { width: calc(100% - 12px); height: 14px; margin-block: 2px; background: var(--vp-c-brand-soft); }

[data-preview='columns'] { gap: 5px; }
.column-list { width: 54px; padding: 6px; border: 1px solid var(--preview-ink); border-radius: 7px; }
.column-list i { display: block; height: 7px; margin: 5px 0; border-radius: 3px; background: var(--preview-ink); }
.column-list i.is-selected { background: var(--preview-accent); }

[data-preview='calendar'] { flex-direction: column; gap: 7px; padding-inline: 34px; }
.calendar-head { display: flex; width: 100%; align-items: center; justify-content: space-between; }
.calendar-head i { width: 9px; height: 9px; border-top: 1px solid var(--vp-c-text-2); border-left: 1px solid var(--vp-c-text-2); transform: rotate(-45deg); }
.calendar-head i:last-child { transform: rotate(135deg); }
.calendar-head b { width: 52px; height: 6px; border-radius: 3px; background: var(--preview-ink); }
.calendar-grid { display: grid; width: 100%; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.calendar-grid i { display: grid; height: 21px; place-items: center; border-radius: 5px; color: var(--vp-c-text-3); font-size: 8px; font-style: normal; }
.calendar-grid i.is-selected { background: var(--preview-accent); color: white; }

[data-preview='timer'] { flex-direction: column; }
.timer-value { color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); font-size: 25px; font-variant-numeric: tabular-nums; letter-spacing: .02em; }
.timer-actions,
.carousel-dots { display: flex; gap: 7px; }
.timer-actions i { width: 24px; height: 18px; border-radius: 6px; background: var(--preview-soft); }
.timer-actions i:nth-child(2) { background: var(--preview-accent); }

[data-preview='slider'] { flex-direction: column; align-items: stretch; padding-inline: 38px; }
.slider-value { align-self: flex-end; color: var(--vp-c-text-1); font-size: 12px; font-variant-numeric: tabular-nums; }
.slider-track { position: relative; height: 5px; border-radius: 3px; background: var(--preview-ink); }
.slider-track::before { position: absolute; width: 64%; height: 100%; border-radius: inherit; background: var(--preview-accent); content: ''; }
.slider-track i { position: absolute; top: 50%; left: 64%; width: 17px; height: 17px; border: 3px solid var(--preview-accent); border-radius: 50%; background: var(--vp-c-bg); transform: translate(-50%, -50%); }
.slider-track i + i { left: 30%; }

[data-preview='splitter'] { gap: 0; padding-inline: 28px; }
.split-pane { height: 76px; flex: 1; border: 1px solid var(--preview-ink); border-radius: 0 8px 8px 0; }
.split-pane--primary { flex: 1.5; border-radius: 8px 0 0 8px; background: var(--preview-soft); }
.split-handle { width: 6px; height: 84px; border-radius: 3px; background: var(--preview-accent); }

[data-preview='feed'] { flex-direction: column; align-items: stretch; padding-inline: 36px; }
.feed-row { display: grid; grid-template-columns: 24px 1fr; grid-template-rows: repeat(2, 6px); gap: 5px 9px; }
.feed-row i { grid-row: 1 / 3; border-radius: 50%; background: var(--preview-soft); }
.feed-row b { border-radius: 3px; background: var(--preview-ink); }
.feed-row b::after { display: block; width: 62%; height: 6px; margin-top: 11px; border-radius: 3px; background: var(--preview-soft); content: ''; }

.data-grid { display: grid; width: 164px; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--preview-ink); border-radius: 8px; overflow: hidden; }
.data-grid i { height: 22px; border-right: 1px solid var(--preview-ink); border-bottom: 1px solid var(--preview-ink); }
.data-grid i:nth-child(4n) { border-right: 0; }
.data-grid i:nth-last-child(-n + 4) { border-bottom: 0; }
.data-grid i.is-selected { background: var(--vp-c-brand-soft); }

[data-preview='tree'] { flex-direction: column; align-items: flex-start; gap: 7px; padding-inline: 42px; }
.tree-row { display: flex; width: 78%; align-items: center; gap: 7px; }
.tree-row--1,
.tree-row--2 { margin-left: 18px; }
.tree-row--3 { width: 62%; }
.tree-row i { width: 7px; height: 7px; border-right: 1px solid var(--vp-c-text-2); border-bottom: 1px solid var(--vp-c-text-2); transform: rotate(-45deg); }
.tree-row b { height: 7px; flex: 1; border-radius: 3px; background: var(--preview-ink); }

[data-preview='menu'] { position: relative; align-items: flex-start; padding-top: 23px; }
.menu-trigger { width: 70px; height: 26px; border: 1px solid var(--preview-ink); border-radius: 7px; }
.menu-list { position: absolute; top: 58px; width: 116px; padding: 7px; border: 1px solid var(--vp-c-border); border-radius: 8px; background: var(--vp-c-bg); box-shadow: 0 8px 20px rgba(9, 14, 24, .14); }
.menu-list i { display: block; width: 88%; height: 6px; margin: 6px 3px; border-radius: 3px; background: var(--preview-ink); }

[data-preview='toolbar'] { gap: 5px; }
.tool { width: 30px; height: 30px; border: 1px solid var(--preview-ink); }
.tool:first-child { border-radius: 8px 0 0 8px; }
.tool:last-child { border-radius: 0 8px 8px 0; }
.tool.is-selected { border-color: var(--preview-accent); background: var(--vp-c-brand-soft); }

[data-preview='popup'] { position: relative; align-items: flex-start; padding-top: 25px; }
.popup-trigger { width: 70px; height: 25px; border-radius: 7px; background: var(--preview-ink); }
.popup-surface { position: absolute; top: 57px; width: 140px; padding: 11px; border: 1px solid var(--vp-c-border); border-radius: 10px; background: var(--vp-c-bg); box-shadow: 0 10px 24px rgba(9, 14, 24, .16); }
.popup-surface i,
.popup-surface b { display: block; width: 70%; height: 6px; margin-bottom: 8px; border-radius: 3px; background: var(--preview-ink); }
.popup-surface b { width: 94%; background: var(--preview-soft); }
.popup-surface em { display: block; width: 38px; height: 16px; margin-left: auto; border-radius: 5px; background: var(--preview-accent); }

[data-preview='toast'] { justify-content: flex-start; margin: 0 auto; padding-inline: 34px; }
.toast-mark { width: 26px; height: 26px; flex: none; border-radius: 50%; background: var(--preview-accent); }
.toast-copy { display: flex; flex: 1; flex-direction: column; gap: 7px; }
.toast-copy i,
.toast-copy b { width: 72%; height: 7px; border-radius: 4px; background: var(--preview-ink); }
.toast-copy b { width: 94%; background: var(--preview-soft); }
.toast-close { width: 14px; height: 14px; border-radius: 4px; background: var(--preview-ink); }

.page { display: grid; width: 26px; height: 26px; place-items: center; border-radius: 7px; color: var(--vp-c-text-3); font-size: 10px; }
.page.is-selected { background: var(--preview-accent); color: white; }
[data-preview='tabs'] { flex-direction: column; align-items: stretch; padding-inline: 34px; }
.tab-list { display: flex; border-bottom: 1px solid var(--preview-ink); }
.tab-list i { width: 33.333%; height: 24px; border-bottom: 2px solid transparent; }
.tab-list i.is-selected { border-bottom-color: var(--preview-accent); background: var(--vp-c-brand-soft); }
.tab-panel { display: flex; flex-direction: column; gap: 8px; padding: 10px; }
.tab-panel i,
.tab-panel b { width: 90%; height: 6px; border-radius: 3px; background: var(--preview-ink); }
.tab-panel b { width: 62%; background: var(--preview-soft); }

[data-preview='steps'] { gap: 0; padding-inline: 32px; }
.step { display: flex; flex: 1; align-items: center; }
.step i { display: grid; width: 24px; height: 24px; flex: none; place-items: center; border: 1px solid var(--preview-ink); border-radius: 50%; color: var(--vp-c-text-3); font-size: 9px; font-style: normal; }
.step b { height: 1px; flex: 1; background: var(--preview-ink); }
.step:last-child b { display: none; }
.step.is-selected i { border-color: var(--preview-accent); background: var(--preview-accent); color: white; }

[data-preview='carousel'] { flex-direction: column; }
.carousel-slide { display: flex; width: 152px; height: 62px; flex-direction: column; justify-content: flex-end; gap: 7px; padding: 12px; border-radius: 9px; background: var(--preview-soft); }
.carousel-slide i,
.carousel-slide b { width: 52%; height: 7px; border-radius: 4px; background: var(--preview-ink); }
.carousel-slide b { width: 76%; height: 5px; }
.carousel-dots i { width: 5px; height: 5px; border-radius: 50%; background: var(--preview-ink); }
.carousel-dots i.is-selected { width: 16px; border-radius: 3px; background: var(--preview-accent); }

[data-preview='disclosure'] { flex-direction: column; align-items: stretch; gap: 0; padding-inline: 34px; }
.disclosure-row { display: flex; height: 29px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--preview-ink); }
.disclosure-row i { width: 66%; height: 6px; border-radius: 3px; background: var(--preview-ink); }
.disclosure-row b { width: 7px; height: 7px; border-right: 1px solid var(--vp-c-text-2); border-bottom: 1px solid var(--vp-c-text-2); transform: rotate(45deg); }
.disclosure-copy { display: flex; height: 36px; flex-direction: column; justify-content: center; gap: 6px; padding-inline: 6px; }
.disclosure-copy i,
.disclosure-copy b { width: 90%; height: 5px; border-radius: 3px; background: var(--preview-soft); }
.disclosure-copy b { width: 68%; }

[data-preview='field'] { flex-direction: column; align-items: flex-start; padding-inline: 34px; }
.field-control { justify-content: space-between; padding: 0 10px; }
.field-control i { width: 72px; height: 7px; border-radius: 4px; background: var(--preview-ink); }
.field-control b { width: 20px; height: 20px; border-radius: 6px; background: var(--vp-c-brand-soft); }
</style>
