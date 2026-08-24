<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  BookOpen, Check, ChevronDown, Command, Copy, FilePlus2, FolderOpen,
  Keyboard, PanelLeft, Redo2, Save, Undo2,
} from '@lucide/vue';
import { MenubarContent, MenubarItem, MenubarRoot, MenubarSeparator } from '@sectile/vue/menubar';

const props = defineProps<{ readonly scenario: string }>();

const items = Object.freeze([
  { id: 'file', parentID: null },
  { id: 'new-project', parentID: 'file' },
  { id: 'open-project', parentID: 'file' },
  { id: 'save-project', parentID: 'file' },
  { id: 'edit', parentID: null },
  { id: 'undo', parentID: 'edit' },
  { id: 'redo', parentID: 'edit' },
  { id: 'duplicate', parentID: 'edit' },
  { id: 'view', parentID: null },
  { id: 'command-palette', parentID: 'view' },
  { id: 'toggle-sidebar', parentID: 'view' },
  { id: 'help', parentID: null },
  { id: 'keyboard-shortcuts', parentID: 'help' },
  { id: 'documentation', parentID: 'help' },
]);

const labels: Readonly<Record<string, string>> = Object.freeze({
  file: 'File',
  'new-project': 'New project',
  'open-project': 'Open project',
  'save-project': 'Save project',
  edit: 'Edit',
  undo: 'Undo',
  redo: 'Redo',
  duplicate: 'Duplicate',
  view: 'View',
  'command-palette': 'Command palette',
  'toggle-sidebar': 'Toggle sidebar',
  help: 'Help',
  'keyboard-shortcuts': 'Keyboard shortcuts',
  documentation: 'Documentation',
});

const disabledItems = computed(() => props.scenario === 'disabled-root' ? ['view'] : []);
const initialStatus = computed(() => {
  if (props.scenario === 'disabled-root') return 'View menu is unavailable in this workspace';
  if (props.scenario === 'typeahead') return 'Focus the menu bar and type a menu name';
  return 'Choose a command from the menu bar';
});
const invokedAction = ref('');
const status = computed(() => invokedAction.value || initialStatus.value);
const textValue = (id: string): string => labels[id] ?? id;
const recordAction = (id: string): void => {
  invokedAction.value = `${labels[id] ?? id} selected`;
};
</script>

<template>
  <div class="catalog-menubar-demo">
    <div class="catalog-menubar-app">
      <div class="catalog-menubar-topline">
        <span class="catalog-menubar-brand"><Command :size="16" aria-hidden="true" /> Sectile Studio</span>
        <span class="catalog-menubar-save-state"><Check :size="14" aria-hidden="true" /> All changes saved</span>
      </div>

      <div class="catalog-menubar-command-row">
        <span class="catalog-menubar-document">Untitled project</span>
        <MenubarRoot
          :items="items"
          :disabled-items="disabledItems"
          :text-value="textValue"
          default-highlighted-value="file"
          label="Application commands"
          class="catalog-menubar"
          @invoke="recordAction"
        >
          <MenubarItem value="file" as="button" type="button" class="catalog-menubar-trigger">
            File <ChevronDown :size="14" aria-hidden="true" />
          </MenubarItem>
          <MenubarContent for="file" class="catalog-menubar-popup">
            <MenubarItem value="new-project" as="button" type="button" class="catalog-menubar-command">
              <FilePlus2 :size="17" aria-hidden="true" /><span>New project</span><kbd>Ctrl+N</kbd>
            </MenubarItem>
            <MenubarItem value="open-project" as="button" type="button" class="catalog-menubar-command">
              <FolderOpen :size="17" aria-hidden="true" /><span>Open project</span><kbd>Ctrl+O</kbd>
            </MenubarItem>
            <MenubarSeparator class="catalog-menubar-separator" />
            <MenubarItem value="save-project" as="button" type="button" class="catalog-menubar-command">
              <Save :size="17" aria-hidden="true" /><span>Save project</span><kbd>Ctrl+S</kbd>
            </MenubarItem>
          </MenubarContent>

          <MenubarItem value="edit" as="button" type="button" class="catalog-menubar-trigger">
            Edit <ChevronDown :size="14" aria-hidden="true" />
          </MenubarItem>
          <MenubarContent for="edit" class="catalog-menubar-popup">
            <MenubarItem value="undo" as="button" type="button" class="catalog-menubar-command">
              <Undo2 :size="17" aria-hidden="true" /><span>Undo</span><kbd>Ctrl+Z</kbd>
            </MenubarItem>
            <MenubarItem value="redo" as="button" type="button" class="catalog-menubar-command">
              <Redo2 :size="17" aria-hidden="true" /><span>Redo</span><kbd>Ctrl+Y</kbd>
            </MenubarItem>
            <MenubarSeparator class="catalog-menubar-separator" />
            <MenubarItem value="duplicate" as="button" type="button" class="catalog-menubar-command">
              <Copy :size="17" aria-hidden="true" /><span>Duplicate</span><kbd>Ctrl+D</kbd>
            </MenubarItem>
          </MenubarContent>

          <MenubarItem value="view" as="button" type="button" class="catalog-menubar-trigger">
            View <ChevronDown :size="14" aria-hidden="true" />
          </MenubarItem>
          <MenubarContent for="view" class="catalog-menubar-popup">
            <MenubarItem value="command-palette" as="button" type="button" class="catalog-menubar-command">
              <Command :size="17" aria-hidden="true" /><span>Command palette</span><kbd>Ctrl+K</kbd>
            </MenubarItem>
            <MenubarItem value="toggle-sidebar" as="button" type="button" class="catalog-menubar-command">
              <PanelLeft :size="17" aria-hidden="true" /><span>Toggle sidebar</span><kbd>Ctrl+B</kbd>
            </MenubarItem>
          </MenubarContent>

          <MenubarItem value="help" as="button" type="button" class="catalog-menubar-trigger">
            Help <ChevronDown :size="14" aria-hidden="true" />
          </MenubarItem>
          <MenubarContent for="help" class="catalog-menubar-popup">
            <MenubarItem value="keyboard-shortcuts" as="button" type="button" class="catalog-menubar-command">
              <Keyboard :size="17" aria-hidden="true" /><span>Keyboard shortcuts</span>
            </MenubarItem>
            <MenubarItem value="documentation" as="button" type="button" class="catalog-menubar-command">
              <BookOpen :size="17" aria-hidden="true" /><span>Documentation</span>
            </MenubarItem>
          </MenubarContent>
        </MenubarRoot>
      </div>

      <p class="catalog-menubar-status" role="status" aria-live="polite">
        <span class="catalog-menubar-status-dot" aria-hidden="true" />{{ status }}
      </p>
    </div>
  </div>
</template>
