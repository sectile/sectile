<script setup lang="ts">
import {
  BookOpen, Check, ChevronDown, Command, Copy, FilePlus2, FolderOpen,
  Keyboard, PanelLeft, Redo2, Save, Undo2,
} from '@lucide/vue';
import { computed, ref, type Component } from 'vue';

const props = defineProps<{
  readonly activePart: string;
  readonly korean: boolean;
}>();
const emit = defineEmits<{
  select: [part: string, attributes?: readonly (readonly [name: string, value: string])[]];
  hover: [part: string | null, attributes?: readonly (readonly [name: string, value: string])[]];
}>();

interface MenuCommand {
  readonly id: string;
  readonly en: string;
  readonly ko: string;
  readonly shortcut: string;
  readonly icon: Component;
  readonly separated?: boolean;
}

interface MenuDefinition {
  readonly id: 'file' | 'edit' | 'view' | 'help';
  readonly en: string;
  readonly ko: string;
  readonly commands: readonly MenuCommand[];
}

const menus: readonly MenuDefinition[] = [
  {
    id: 'file', en: 'File', ko: '파일', commands: [
      { id: 'new-project', en: 'New project', ko: '새 프로젝트', shortcut: 'Ctrl+N', icon: FilePlus2 },
      { id: 'open-project', en: 'Open project', ko: '프로젝트 열기', shortcut: 'Ctrl+O', icon: FolderOpen },
      { id: 'save-project', en: 'Save project', ko: '프로젝트 저장', shortcut: 'Ctrl+S', icon: Save, separated: true },
    ],
  },
  {
    id: 'edit', en: 'Edit', ko: '편집', commands: [
      { id: 'undo', en: 'Undo', ko: '실행 취소', shortcut: 'Ctrl+Z', icon: Undo2 },
      { id: 'redo', en: 'Redo', ko: '다시 실행', shortcut: 'Ctrl+Y', icon: Redo2 },
      { id: 'duplicate', en: 'Duplicate', ko: '복제', shortcut: 'Ctrl+D', icon: Copy, separated: true },
    ],
  },
  {
    id: 'view', en: 'View', ko: '보기', commands: [
      { id: 'command-palette', en: 'Command palette', ko: '명령 팔레트', shortcut: 'Ctrl+K', icon: Command },
      { id: 'toggle-sidebar', en: 'Toggle sidebar', ko: '사이드바 전환', shortcut: 'Ctrl+B', icon: PanelLeft },
    ],
  },
  {
    id: 'help', en: 'Help', ko: '도움말', commands: [
      { id: 'keyboard-shortcuts', en: 'Keyboard shortcuts', ko: '키보드 단축키', shortcut: '', icon: Keyboard },
      { id: 'documentation', en: 'Documentation', ko: '문서', shortcut: '', icon: BookOpen },
    ],
  },
] as const;

type MenuID = MenuDefinition['id'];

const openMenu = ref<MenuID>('file');
const selectedInstance = ref<string | null>(null);
const hoveredInstance = ref<string | null>(null);
const activeInstance = computed(() => hoveredInstance.value ?? selectedInstance.value);
const currentMenu = computed<MenuDefinition>(() => menus.find((menu) => menu.id === openMenu.value) ?? menus[0]!);
const status = ref('');

function label(item: { readonly en: string; readonly ko: string }): string {
  return props.korean ? item.ko : item.en;
}

function isActive(part: string, instance?: string): boolean {
  return props.activePart === part && (instance === undefined || activeInstance.value === instance);
}

function partClass(part: string, instance?: string): Record<string, boolean> {
  return { 'anatomy-part-active': isActive(part, instance) };
}

function attributes(part: string, level?: number): readonly (readonly [string, string])[] {
  const scope = part === 'sub-content' || part === 'separator' ? 'menu' : 'menubar';
  return [
    ['data-scope', scope],
    ['data-part', part],
    ...(level === undefined ? [] : [['data-level', String(level)] as const]),
  ];
}

function select(part: string, instance: string | null = null, level?: number): void {
  selectedInstance.value = instance;
  emit('select', part, attributes(part, level));
}

function hover(part: string | null, instance: string | null = null, level?: number): void {
  hoveredInstance.value = instance;
  emit('hover', part, part === null ? undefined : attributes(part, level));
}

function open(id: MenuID): void {
  openMenu.value = id;
  select('item', id, 0);
}

function invoke(command: MenuCommand): void {
  select('item', command.id, 1);
  status.value = props.korean ? `${command.ko} 명령 선택됨` : `${command.en} selected`;
}
</script>

<template>
  <div class="menubar-anatomy" @pointerleave="hover(null)">
    <div class="menubar-anatomy__part-map" role="toolbar" :aria-label="korean ? '공개 파트 선택' : 'Select a public part'">
      <span>{{ korean ? '공개 경계' : 'Public boundaries' }}</span>
      <div>
        <button type="button" :aria-pressed="activePart === 'root'" @click="select('root')">root</button>
        <button type="button" :aria-pressed="isActive('item', 'file')" @click="open('file')">item · 0</button>
        <button type="button" :aria-pressed="isActive('sub-content', 'file')" @click="openMenu = 'file'; select('sub-content', 'file', 1)">sub-content · 1</button>
        <button type="button" :aria-pressed="isActive('item', 'new-project')" @click="openMenu = 'file'; select('item', 'new-project', 1)">item · 1</button>
        <button type="button" :aria-pressed="isActive('separator', 'file-separator')" @click="openMenu = 'file'; select('separator', 'file-separator')">separator</button>
      </div>
    </div>

    <div class="menubar-anatomy__topline">
      <span class="menubar-anatomy__brand"><Command :size="16" aria-hidden="true" /> Sectile Studio</span>
      <span class="menubar-anatomy__saved"><Check :size="14" aria-hidden="true" />{{ korean ? '모든 변경사항 저장됨' : 'All changes saved' }}</span>
    </div>

    <div class="menubar-anatomy__workspace">
      <span class="menubar-anatomy__document">{{ korean ? '제목 없는 프로젝트' : 'Untitled project' }}</span>
      <div
        role="menubar"
        aria-label="Application commands"
        data-scope="menubar"
        data-part="root"
        class="menubar-anatomy__root"
        :class="partClass('root')"
        @click.self="select('root')"
        @pointerenter.self="hover('root')"
      >
        <span class="menubar-anatomy__boundary-label anatomy-part-label" :data-active="isActive('root') || undefined">root</span>
        <button
          v-for="menu in menus"
          :key="menu.id"
          type="button"
          role="menuitem"
          data-scope="menubar"
          data-part="item"
          data-level="0"
          :aria-expanded="openMenu === menu.id"
          class="menubar-anatomy__trigger"
          :class="partClass('item', menu.id)"
          @click.stop="open(menu.id)"
          @pointerenter="hover('item', menu.id, 0)"
        >
          <span v-if="isActive('item', menu.id)" class="anatomy-part-label">item · level 0</span>
          {{ label(menu) }} <ChevronDown :size="14" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div class="menubar-anatomy__popup-row">
      <div
        role="menu"
        data-scope="menu"
        data-part="sub-content"
        data-level="1"
        :aria-label="`${label(currentMenu)} menu`"
        class="menubar-anatomy__popup"
        :class="partClass('sub-content', openMenu)"
        @click.self="select('sub-content', openMenu, 1)"
        @pointerenter.self="hover('sub-content', openMenu, 1)"
      >
        <span class="menubar-anatomy__boundary-label anatomy-part-label" :data-active="isActive('sub-content', openMenu) || undefined">sub-content · level 1</span>
        <template v-for="command in currentMenu.commands" :key="command.id">
          <div
            v-if="command.separated"
            data-scope="menu"
            data-part="separator"
            class="menubar-anatomy__separator"
            :class="partClass('separator', `${openMenu}-separator`)"
            @click.stop="select('separator', `${openMenu}-separator`)"
            @pointerenter="hover('separator', `${openMenu}-separator`)"
          >
            <span v-if="isActive('separator', `${openMenu}-separator`)" class="menubar-anatomy__boundary-label menubar-anatomy__separator-label anatomy-part-label" data-active>separator</span>
          </div>
          <button
            type="button"
            role="menuitem"
            data-scope="menubar"
            data-part="item"
            data-level="1"
            class="menubar-anatomy__command"
            :class="partClass('item', command.id)"
            @click.stop="invoke(command)"
            @pointerenter="hover('item', command.id, 1)"
          >
            <span v-if="isActive('item', command.id)" class="anatomy-part-label">item · level 1</span>
            <component :is="command.icon" :size="17" aria-hidden="true" />
            <span>{{ label(command) }}</span>
            <kbd v-if="command.shortcut">{{ command.shortcut }}</kbd>
          </button>
        </template>
      </div>
    </div>

    <p class="menubar-anatomy__status" role="status">
      <span aria-hidden="true" />{{ status || (korean ? '메뉴를 선택해 공개 파트를 확인하세요' : 'Choose a menu to inspect its public parts') }}
    </p>
  </div>
</template>

<style scoped>
.menubar-anatomy {
  width: min(100%, 640px);
  overflow: visible;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}
.menubar-anatomy, .menubar-anatomy * { box-sizing: border-box; }
.menubar-anatomy button { color: inherit; font: inherit; cursor: pointer; }
.menubar-anatomy__part-map {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 10px;
  border-bottom: 1px solid var(--vp-c-divider);
  border-radius: 14px 14px 0 0;
  background: var(--vp-c-bg);
}
.menubar-anatomy__part-map > span { flex: none; color: var(--vp-c-text-3); font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.menubar-anatomy__part-map > div { display: flex; min-width: 0; flex-wrap: wrap; justify-content: flex-end; gap: 4px; }
.menubar-anatomy__part-map button {
  min-height: 28px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 7px;
  color: var(--vp-c-text-2);
  background: transparent;
  font: 600 10px/1 var(--vp-font-family-mono);
}
.menubar-anatomy__part-map button:hover { background: var(--vp-c-bg-soft); }
.menubar-anatomy__part-map button[aria-pressed='true'] { border-color: color-mix(in srgb, var(--vp-c-brand-1) 30%, transparent); color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.menubar-anatomy__topline {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}
.menubar-anatomy__brand,
.menubar-anatomy__saved { display: inline-flex; align-items: center; gap: 7px; }
.menubar-anatomy__brand { font-size: 13px; font-weight: 750; }
.menubar-anatomy__brand svg { color: var(--vp-c-brand-1); }
.menubar-anatomy__saved { color: var(--vp-c-text-3); font-size: 11px; }
.menubar-anatomy__saved svg { color: #28786f; }
.menubar-anatomy__workspace {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 12px;
}
.menubar-anatomy__document { overflow: hidden; font-size: 13px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.menubar-anatomy__root {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 11px;
  background: var(--vp-c-bg-soft);
}
.menubar-anatomy__trigger {
  position: relative;
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--vp-c-text-2) !important;
  font-size: 12px !important;
}
.menubar-anatomy__trigger:hover,
.menubar-anatomy__trigger[aria-expanded='true'] { color: var(--vp-c-brand-1) !important; background: var(--vp-c-brand-soft); }
.menubar-anatomy__trigger[aria-expanded='true'] svg { transform: rotate(180deg); }
.menubar-anatomy__popup-row { display: flex; min-height: 184px; justify-content: flex-end; padding: 0 12px 12px; }
.menubar-anatomy__popup {
  position: relative;
  display: grid;
  width: 248px;
  align-self: start;
  gap: 3px;
  padding: 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
  box-shadow: 0 14px 32px rgb(32 32 38 / 0.12);
}
.menubar-anatomy__command {
  position: relative;
  display: grid;
  width: 100%;
  min-height: 42px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--vp-c-text-2) !important;
  font-size: 12px !important;
  text-align: left;
}
.menubar-anatomy__command:hover { color: var(--vp-c-brand-1) !important; background: var(--vp-c-brand-soft); }
.menubar-anatomy__command svg,
.menubar-anatomy__command kbd { color: var(--vp-c-text-3); }
.menubar-anatomy__command kbd { border: 0; padding: 0; background: transparent; font-size: 10px; }
.menubar-anatomy__separator { position: relative; height: 1px; margin: 4px 6px; background: var(--vp-c-divider); }
.menubar-anatomy__boundary-label:not([data-active]) {
  border-color: var(--vp-c-divider);
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg);
}
.menubar-anatomy__root > .menubar-anatomy__boundary-label,
.menubar-anatomy__popup > .menubar-anatomy__boundary-label { right: 10px; left: auto; }
.menubar-anatomy__separator-label { top: 50%; right: 6px; left: auto; transform: translateY(-50%); }
.menubar-anatomy__status {
  display: flex;
  min-height: 42px;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 9px 13px;
  border-top: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
  font-size: 11px;
  line-height: 1.4;
}
.menubar-anatomy__status > span { width: 7px; height: 7px; flex: none; border-radius: 50%; background: var(--vp-c-brand-1); }
.menubar-anatomy :is(button, [role='menu']):focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }

@media (max-width: 640px) {
  .menubar-anatomy__part-map { align-items: flex-start; flex-direction: column; }
  .menubar-anatomy__part-map > div { justify-content: flex-start; }
  .menubar-anatomy__saved { display: none; }
  .menubar-anatomy__workspace { grid-template-columns: 1fr; }
  .menubar-anatomy__root { width: 100%; }
  .menubar-anatomy__trigger { flex: 1 1 0; justify-content: center; min-width: 0; padding-inline: 4px; }
}
</style>
