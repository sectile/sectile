import {
  defineComponent,
  h,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  watch,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import type { SectileError } from '@sectile/core/result';
import type { InlineSurface } from '@sectile/content/position';
import {
  collectAuthoringSurfaces,
  type AuthoringMount,
  type CompiledAuthoringRegistry,
  type ComponentAuthoringSurface,
} from '@sectile/editor/authoring';
import type {
  EditorSession,
  EditorSessionSnapshot,
} from '@sectile/editor/session';
import {
  editorAuthoringMountAttributes,
  editorHardBreakAttributes,
  editorInlineAtomAttributes,
  editorInlineSurfaceAttributes,
  editorIsolatedFrameAttributes,
  editorRootAttributes,
  tryCreateEditor,
  type DOMEditorFailureCode,
  type EditorConnection,
} from '@sectile/dom/editor';
import {
  Primitive,
  type PrimitiveAs,
} from './primitive.js';
import { useNextTickTask } from './internal/scheduled-task.js';

export interface EditorRootProps {
  readonly editor: EditorSession;
  readonly authoring: CompiledAuthoringRegistry;
  readonly spellcheck?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface EditorRootSlotProps {
  readonly snapshot: EditorSessionSnapshot;
  readonly authoringSurfaces: readonly ComponentAuthoringSurface[];
}

export interface EditorRootExpose {
  readonly element: HTMLElement | null;
  getConnection(): EditorConnection | null;
  refresh(): void;
}

export type EditorRootErrorHandler = (
  error: SectileError<DOMEditorFailureCode>,
) => void;

export interface EditorInlineSurfaceProps {
  readonly surface: InlineSurface;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface EditorInlineAtomProps {
  readonly id: string;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface EditorIsolatedFrameProps {
  readonly frame: string;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface EditorAuthoringMountProps {
  readonly ownerID: string;
  readonly mount: AuthoringMount;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

const primitiveProps = {
  as: {
    type: [String, Object, Function] as PropType<PrimitiveAs>,
    default: 'div',
  },
  asChild: { type: Boolean, default: false },
};

export const EditorRoot = defineComponent({
  name: 'SectileEditorRoot',
  inheritAttrs: false,
  props: {
    editor: {
      type: Object as PropType<EditorSession>,
      required: true,
    },
    authoring: {
      type: Object as PropType<CompiledAuthoringRegistry>,
      required: true,
    },
    spellcheck: {
      type: Boolean,
      default: undefined,
    },
    ...primitiveProps,
  },
  emits: {
    error: (_error: SectileError<DOMEditorFailureCode>): boolean => true,
  },
  slots: Object as SlotsType<{
    default: (props: EditorRootSlotProps) => VNodeChild;
  }>,
  setup(props, { attrs, emit, expose, slots }) {
    const initial = initialRenderState(props.editor, props.authoring);
    const snapshot = shallowRef(initial.snapshot);
    const authoringSurfaces = shallowRef(initial.authoringSurfaces);
    const root = shallowRef<HTMLElement | null>(null);
    let connection: EditorConnection | null = null;
    let mounted = false;

    const restoreSelection = useNextTickTask(() => {
      if (connection === null) return;
      connection.setSelection(connection.getSnapshot().selection);
    });

    const connect = (): void => {
      if (!mounted || root.value === null) return;
      connection?.disconnect();
      connection = null;

      const created = tryCreateEditor({
        root: root.value,
        editor: props.editor,
        authoring: props.authoring,
        selectionRestoration: 'deferred',
        ...(props.spellcheck === undefined
          ? {}
          : { spellcheck: props.spellcheck }),
        render: (context) => {
          snapshot.value = context.snapshot;
          authoringSurfaces.value = context.authoringSurfaces;
          restoreSelection.schedule();
        },
        onError: (error) => emit('error', error),
      });
      if (!created.ok) {
        emit('error', created.error);
        return;
      }
      connection = created.value;
      restoreSelection.schedule();
    };

    const connectTask = useNextTickTask(connect);
    const setRoot = (element: unknown): void => {
      const next = element as HTMLElement | null;
      if (root.value === next) return;
      root.value = next;
      if (mounted) connectTask.schedule();
    };

    onMounted(() => {
      mounted = true;
      connect();
    });
    onBeforeUnmount(() => {
      mounted = false;
      connectTask.cancel();
      restoreSelection.cancel();
      connection?.disconnect();
      connection = null;
    });
    watch(
      [() => props.editor, () => props.authoring],
      () => {
        const next = initialRenderState(props.editor, props.authoring);
        snapshot.value = next.snapshot;
        authoringSurfaces.value = next.authoringSurfaces;
        if (mounted) connectTask.schedule();
      },
    );
    watch(
      () => props.spellcheck,
      () => {
        if (mounted) connectTask.schedule();
      },
    );

    expose({
      element: root,
      getConnection: (): EditorConnection | null => connection,
      refresh: (): void => {
        const refreshed = connection?.refresh();
        if (refreshed !== undefined && !refreshed.ok) {
          emit('error', refreshed.error);
        }
      },
    } satisfies {
      readonly element: typeof root;
      getConnection(): EditorConnection | null;
      refresh(): void;
    });

    return (): VNodeChild => {
      const rootAttributes = editorRootAttributes(snapshot.value, {
        ...(props.spellcheck === undefined
          ? {}
          : { spellcheck: props.spellcheck }),
      });
      const slotProps: EditorRootSlotProps = Object.freeze({
        snapshot: snapshot.value,
        authoringSurfaces: authoringSurfaces.value,
      });

      return h(
        Primitive,
        mergeProps(attrs, rootAttributes, {
          as: props.as,
          asChild: props.asChild,
          elementRef: setRoot,
        }),
        {
          default: () => slots['default']?.(slotProps),
        },
      );
    };
  },
});

export const EditorInlineSurface = defineComponent({
  name: 'SectileEditorInlineSurface',
  inheritAttrs: false,
  props: {
    surface: {
      type: Object as PropType<InlineSurface>,
      required: true,
    },
    ...primitiveProps,
  },
  slots: Object as SlotsType<{
    default: () => VNodeChild;
  }>,
  setup(props, { attrs, slots }) {
    return (): VNodeChild => h(
      Primitive,
      mergeProps(
        attrs,
        editorInlineSurfaceAttributes(props.surface),
        {
          as: props.as,
          asChild: props.asChild,
        },
      ),
      slots,
    );
  },
});

export const EditorInlineAtom = defineComponent({
  name: 'SectileEditorInlineAtom',
  inheritAttrs: false,
  props: {
    id: { type: String, required: true },
    ...primitiveProps,
    as: {
      ...primitiveProps.as,
      default: 'span',
    },
  },
  slots: Object as SlotsType<{
    default: () => VNodeChild;
  }>,
  setup(props, { attrs, slots }) {
    return (): VNodeChild => h(
      Primitive,
      mergeProps(
        attrs,
        editorInlineAtomAttributes(props.id),
        {
          as: props.as,
          asChild: props.asChild,
        },
      ),
      slots,
    );
  },
});

export const EditorHardBreak = defineComponent({
  name: 'SectileEditorHardBreak',
  inheritAttrs: false,
  props: {
    ...primitiveProps,
    as: {
      ...primitiveProps.as,
      default: 'br',
    },
  },
  setup(props, { attrs }) {
    return (): VNodeChild => h(
      Primitive,
      mergeProps(
        attrs,
        editorHardBreakAttributes(),
        {
          as: props.as,
          asChild: props.asChild,
        },
      ),
    );
  },
});

export const EditorIsolatedFrame = defineComponent({
  name: 'SectileEditorIsolatedFrame',
  inheritAttrs: false,
  props: {
    frame: { type: String, required: true },
    ...primitiveProps,
  },
  slots: Object as SlotsType<{
    default: () => VNodeChild;
  }>,
  setup(props, { attrs, slots }) {
    return (): VNodeChild => h(
      Primitive,
      mergeProps(
        attrs,
        editorIsolatedFrameAttributes(props.frame),
        {
          as: props.as,
          asChild: props.asChild,
        },
      ),
      slots,
    );
  },
});

export const EditorAuthoringMount = defineComponent({
  name: 'SectileEditorAuthoringMount',
  inheritAttrs: false,
  props: {
    ownerID: { type: String, required: true },
    mount: {
      type: Object as PropType<AuthoringMount>,
      required: true,
    },
    ...primitiveProps,
  },
  slots: Object as SlotsType<{
    default: () => VNodeChild;
  }>,
  setup(props, { attrs, slots }) {
    return (): VNodeChild => h(
      Primitive,
      mergeProps(
        attrs,
        editorAuthoringMountAttributes(
          props.ownerID,
          props.mount,
        ),
        {
          as: props.as,
          asChild: props.asChild,
        },
      ),
      slots,
    );
  },
});

function initialRenderState(
  editor: EditorSession,
  authoring: CompiledAuthoringRegistry,
): EditorRootSlotProps {
  const snapshot = editor.getSnapshot();
  const surfaces = collectAuthoringSurfaces(snapshot.document, {
    schema: snapshot.schema,
    registry: authoring,
    limits: snapshot.contentLimits,
  });
  if (!surfaces.ok) {
    throw new TypeError(surfaces.error.message);
  }
  return Object.freeze({
    snapshot,
    authoringSurfaces: surfaces.value,
  });
}
