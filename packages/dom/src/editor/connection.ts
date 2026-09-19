import {
  failResult,
  okResult,
  unwrap,
  type Result,
  type SectileError,
} from '@sectile/core/result';
import type {
  InlineNode,
} from '@sectile/content/document';
import {
  createInlineFragment,
  inlineFragmentText,
  inlineSurfaceLength,
} from '@sectile/content/fragment';
import {
  isInlineContentBoundary,
  type InlineSurface,
} from '@sectile/content/position';
import {
  measureInlineContent,
  type ContentOperation,
} from '@sectile/content/transform';
import {
  collectAuthoringSurfaces,
} from '@sectile/editor/authoring';
import {
  sameEditorSelection,
  type EditorSelection,
} from '@sectile/editor/selection';
import type {
  EditorSessionSnapshot,
} from '@sectile/editor/session';
import { setInteractionAttributes } from '../interaction/attributes.js';
import type {
  DOMEditorErrorCode,
  DOMEditorFailureCode,
  EditorConnection,
  EditorOptions,
} from './contracts.js';
import {
  readEditorDOMSelection,
  setEditorDOMSelection,
} from './selection.js';
import {
  editorHardBreakSelector,
  editorInlineAtomSelector,
  editorInlineSurfaceSelector,
  readEditorInlineSurface,
} from './markers.js';

export const EDITOR_FRAGMENT_MIME = 'application/x-sectile-content+json';

interface ActiveComposition {
  readonly selection: EditorSelection;
  data: string;
}

interface AttributeBaseline {
  readonly name: string;
  readonly value: string | null;
  owned: string | null;
}

export function createEditor(
  options: EditorOptions,
): EditorConnection {
  return unwrap(tryCreateEditor(options));
}

export function tryCreateEditor(
  options: EditorOptions,
): Result<EditorConnection, DOMEditorFailureCode> {
  const connection = new DOMEditorConnection(options);
  const initialized = connection.initialize();
  if (!initialized.ok) {
    connection.disconnect();
    return initialized;
  }
  return okResult(connection);
}

class DOMEditorConnection implements EditorConnection {
  readonly #options: EditorOptions;
  readonly #root: HTMLElement;
  readonly #attributes: AttributeBaseline[];
  #active = true;
  #programmaticSelection = false;
  #composition: ActiveComposition | null = null;
  #unsubscribe: (() => void) | null = null;

  readonly #beforeInput = (nativeEvent: Event): void => {
    if (!this.#active || this.#composition !== null) return;
    const event = nativeEvent as InputEvent;
    if (event.isComposing) return;

    if (event.inputType === 'insertText') {
      event.preventDefault();
      const selection = this.#syncSelection();
      if (selection === null) return;
      this.#replaceTextSelection(
        selection,
        event.data ?? '',
        'typing',
      );
      return;
    }

    if (event.inputType === 'deleteContentBackward') {
      event.preventDefault();
      const selection = this.#syncSelection();
      if (selection === null) return;
      this.#deleteBackward(selection);
      return;
    }

    if (event.inputType === 'deleteContentForward') {
      event.preventDefault();
      const selection = this.#syncSelection();
      if (selection === null) return;
      this.#deleteForward(selection);
      return;
    }

    if (event.cancelable && isMutationInputType(event.inputType)) {
      event.preventDefault();
      this.#report(domEditorError(
        'dom-editor-input-unsupported',
        'This native editing input type is not supported by the DOM Editor connection.',
        { inputType: event.inputType },
      ));
      this.#recover();
    }
  };

  readonly #input = (nativeEvent: Event): void => {
    if (!this.#active || this.#composition !== null) return;
    const target = nativeEvent.target;
    if (!(target instanceof this.#root.ownerDocument.defaultView!.Node)) {
      return;
    }

    const surfaceElement = closestSurfaceElement(target);
    if (surfaceElement === null) return;
    const surface = readEditorInlineSurface(surfaceElement);
    if (surface === null) return;

    const projected = projectPlainDOMText(surfaceElement);
    if (projected === null) {
      this.#report(domEditorError(
        'dom-editor-input-unsupported',
        'The browser produced an inline DOM shape that cannot be reconciled without renderer-specific semantics.',
      ));
      this.#recover();
      return;
    }

    const snapshot = this.#options.editor.getSnapshot();
    const length = inlineSurfaceLength(snapshot.document, surface);
    if (!length.ok) {
      this.#report(length.error);
      this.#recover();
      return;
    }

    const selection = this.#syncSelection();
    if (selection === null) return;
    const nextSelection = collapsedSelection(
      surface,
      projected.length,
    );
    this.#commitTextSurface(
      surface,
      0,
      length.value,
      projected,
      'after',
      'typing',
      nextSelection,
    );
  };

  readonly #compositionStart = (nativeEvent: Event): void => {
    if (!this.#active) return;
    const event = nativeEvent as CompositionEvent;
    const selection = this.#syncSelection();
    if (selection === null || !sameInlineSurfaceSelection(selection)) {
      this.#report(domEditorError(
        'dom-editor-selection-invalid',
        'IME composition requires one inline editing surface.',
      ));
      this.#recover();
      return;
    }
    this.#composition = {
      selection,
      data: event.data,
    };
  };

  readonly #compositionUpdate = (nativeEvent: Event): void => {
    if (!this.#active || this.#composition === null) return;
    const event = nativeEvent as CompositionEvent;
    this.#composition.data = event.data;
  };

  readonly #compositionEnd = (nativeEvent: Event): void => {
    if (!this.#active || this.#composition === null) return;
    const event = nativeEvent as CompositionEvent;
    const composition = this.#composition;
    this.#composition = null;
    this.#replaceTextSelection(
      composition.selection,
      event.data || composition.data,
      'composition',
    );
  };

  readonly #copy = (nativeEvent: Event): void => {
    this.#copySelection(nativeEvent as ClipboardEvent, false);
  };

  readonly #cut = (nativeEvent: Event): void => {
    this.#copySelection(nativeEvent as ClipboardEvent, true);
  };

  readonly #paste = (nativeEvent: Event): void => {
    if (!this.#active) return;
    const event = nativeEvent as ClipboardEvent;
    const clipboard = event.clipboardData;
    if (clipboard === null) return;

    const selection = this.#syncSelection();
    if (selection === null || !sameInlineSurfaceSelection(selection)) {
      event.preventDefault();
      this.#report(domEditorError(
        'dom-editor-selection-invalid',
        'Paste requires one inline editing surface.',
      ));
      this.#recover();
      return;
    }

    const custom = clipboard.getData(EDITOR_FRAGMENT_MIME);
    if (custom.length > 0) {
      event.preventDefault();
      this.#pastePortableFragment(selection, custom);
      return;
    }

    event.preventDefault();
    this.#replaceTextSelection(
      selection,
      clipboard.getData('text/plain'),
      'paste',
    );
  };

  readonly #selectionChange = (): void => {
    if (!this.#active || this.#programmaticSelection) return;
    const value = readEditorDOMSelection(this.#root);
    if (value.status !== 'mapped') return;

    const snapshot = this.#options.editor.getSnapshot();
    if (sameEditorSelection(snapshot.selection, value.selection)) return;

    const updated = this.#options.editor.setSelection(value.selection, {
      expectedRevision: snapshot.revision,
      expectedConfigEpoch: snapshot.configEpoch,
      origin: 'human',
    });
    if (!updated.ok) this.#report(updated.error);
  };

  public constructor(options: EditorOptions) {
    this.#options = options;
    this.#root = options.root;
    this.#attributes = [
      baseline(this.#root, 'data-scope'),
      baseline(this.#root, 'data-part'),
      baseline(this.#root, 'contenteditable'),
      baseline(this.#root, 'aria-disabled'),
      baseline(this.#root, 'aria-readonly'),
      baseline(this.#root, 'spellcheck'),
    ];
  }

  public initialize(): Result<EditorSessionSnapshot, DOMEditorFailureCode> {
    this.#root.addEventListener('beforeinput', this.#beforeInput);
    this.#root.addEventListener('input', this.#input);
    this.#root.addEventListener(
      'compositionstart',
      this.#compositionStart,
      true,
    );
    this.#root.addEventListener(
      'compositionupdate',
      this.#compositionUpdate,
      true,
    );
    this.#root.addEventListener(
      'compositionend',
      this.#compositionEnd,
      true,
    );
    this.#root.addEventListener('copy', this.#copy);
    this.#root.addEventListener('cut', this.#cut);
    this.#root.addEventListener('paste', this.#paste);
    this.#root.ownerDocument.addEventListener(
      'selectionchange',
      this.#selectionChange,
    );

    this.#unsubscribe = this.#options.editor.subscribe((event) => {
      if (!this.#active) return;
      this.#syncRootState(event.current);

      if (
        event.documentChanged
        || event.kind === 'replace-document'
        || event.kind === 'replace-schema'
        || event.kind === 'reconfigure'
      ) {
        const refreshed = this.refresh();
        if (!refreshed.ok) this.#report(refreshed.error);
        return;
      }

      if (event.selectionChanged) {
        this.setSelection(event.current.selection);
      }
    });

    return this.refresh();
  }

  public getSnapshot(): EditorSessionSnapshot {
    return this.#options.editor.getSnapshot();
  }

  public refresh(): Result<EditorSessionSnapshot, DOMEditorFailureCode> {
    const snapshot = this.#options.editor.getSnapshot();
    this.#syncRootState(snapshot);

    const authoring = collectAuthoringSurfaces(snapshot.document, {
      schema: snapshot.schema,
      registry: this.#options.authoring,
      limits: snapshot.contentLimits,
    });
    if (!authoring.ok) return authoring;

    try {
      this.#options.render(Object.freeze({
        root: this.#root,
        snapshot,
        authoringSurfaces: authoring.value,
      }));
    } catch {
      return failResult(
        'transition-rejection',
        'dom-editor-render-fault',
        'The DOM Editor render callback failed.',
      );
    }

    this.setSelection(snapshot.selection);
    return okResult(snapshot);
  }

  public readSelection() {
    return readEditorDOMSelection(this.#root);
  }

  public setSelection(selection: EditorSelection | null): boolean {
    if (!this.#active) return false;
    this.#programmaticSelection = true;
    try {
      return setEditorDOMSelection(this.#root, selection);
    } finally {
      this.#programmaticSelection = false;
    }
  }

  public disconnect(): void {
    if (!this.#active) return;
    this.#active = false;
    this.#composition = null;
    this.#unsubscribe?.();
    this.#unsubscribe = null;

    this.#root.removeEventListener('beforeinput', this.#beforeInput);
    this.#root.removeEventListener('input', this.#input);
    this.#root.removeEventListener(
      'compositionstart',
      this.#compositionStart,
      true,
    );
    this.#root.removeEventListener(
      'compositionupdate',
      this.#compositionUpdate,
      true,
    );
    this.#root.removeEventListener(
      'compositionend',
      this.#compositionEnd,
      true,
    );
    this.#root.removeEventListener('copy', this.#copy);
    this.#root.removeEventListener('cut', this.#cut);
    this.#root.removeEventListener('paste', this.#paste);
    this.#root.ownerDocument.removeEventListener(
      'selectionchange',
      this.#selectionChange,
    );

    for (const attribute of this.#attributes) {
      restoreOwnedAttribute(this.#root, attribute);
    }
  }

  #syncRootState(snapshot: EditorSessionSnapshot): void {
    setOwnedAttribute(this.#root, this.#attributes, 'data-scope', 'editor');
    setOwnedAttribute(this.#root, this.#attributes, 'data-part', 'root');
    setOwnedAttribute(
      this.#root,
      this.#attributes,
      'contenteditable',
      snapshot.interaction.disabled || snapshot.interaction.readOnly
        ? 'false'
        : 'true',
    );
    if (this.#options.spellcheck !== undefined) {
      setOwnedAttribute(
        this.#root,
        this.#attributes,
        'spellcheck',
        String(this.#options.spellcheck),
      );
    }

    setInteractionAttributes(
      this.#root,
      snapshot.interaction,
      { readOnly: true },
    );
    rememberOwnedAttribute(
      this.#root,
      this.#attributes,
      'aria-disabled',
    );
    rememberOwnedAttribute(
      this.#root,
      this.#attributes,
      'aria-readonly',
    );
  }

  #syncSelection(): EditorSelection | null {
    const value = readEditorDOMSelection(this.#root);
    if (value.status !== 'mapped') {
      this.#report(domEditorError(
        'dom-editor-selection-invalid',
        value.status === 'isolated'
          ? 'Native selection cannot cross isolated Editor authoring frames.'
          : 'Native selection cannot be mapped to a logical Editor selection.',
      ));
      this.#recover();
      return null;
    }

    const snapshot = this.#options.editor.getSnapshot();
    if (sameEditorSelection(snapshot.selection, value.selection)) {
      return value.selection;
    }

    const updated = this.#options.editor.setSelection(value.selection, {
      expectedRevision: snapshot.revision,
      expectedConfigEpoch: snapshot.configEpoch,
      origin: 'human',
    });
    if (!updated.ok) {
      this.#report(updated.error);
      this.#recover();
      return null;
    }
    return value.selection;
  }

  #replaceTextSelection(
    selection: EditorSelection,
    text: string,
    historyIntent: 'typing' | 'composition' | 'paste',
  ): void {
    if (!sameInlineSurfaceSelection(selection)) {
      this.#report(domEditorError(
        'dom-editor-selection-invalid',
        'Text replacement requires one inline editing surface.',
      ));
      this.#recover();
      return;
    }

    const anchor = selection.anchor;
    const focus = selection.focus;
    if (anchor.type !== 'inline' || focus.type !== 'inline') return;
    const from = Math.min(anchor.offset, focus.offset);
    const to = Math.max(anchor.offset, focus.offset);
    const startPoint = anchor.offset <= focus.offset ? anchor : focus;
    const nextSelection = collapsedSelection(
      anchor.surface,
      from + text.length,
    );

    this.#commitTextSurface(
      anchor.surface,
      from,
      to,
      text,
      startPoint.affinity,
      historyIntent,
      nextSelection,
    );
  }

  #deleteBackward(selection: EditorSelection): void {
    if (!sameInlineSurfaceSelection(selection)) {
      this.#report(domEditorError(
        'dom-editor-selection-invalid',
        'Backward deletion requires one inline editing surface.',
      ));
      this.#recover();
      return;
    }

    const anchor = selection.anchor;
    const focus = selection.focus;
    if (anchor.type !== 'inline' || focus.type !== 'inline') return;
    let from = Math.min(anchor.offset, focus.offset);
    const to = Math.max(anchor.offset, focus.offset);

    if (from === to) {
      const nodes = inlineNodes(
        this.#options.editor.getSnapshot(),
        anchor.surface,
      );
      if (nodes === null) {
        this.#recover();
        return;
      }
      const previous = previousInlineBoundary(nodes, from);
      if (previous === null) return;
      from = previous;
    }

    this.#commitInlineReplacement(
      anchor.surface,
      from,
      to,
      Object.freeze([]),
      'delete-backward',
      collapsedSelection(anchor.surface, from),
    );
  }

  #deleteForward(selection: EditorSelection): void {
    if (!sameInlineSurfaceSelection(selection)) {
      this.#report(domEditorError(
        'dom-editor-selection-invalid',
        'Forward deletion requires one inline editing surface.',
      ));
      this.#recover();
      return;
    }

    const anchor = selection.anchor;
    const focus = selection.focus;
    if (anchor.type !== 'inline' || focus.type !== 'inline') return;
    const from = Math.min(anchor.offset, focus.offset);
    let to = Math.max(anchor.offset, focus.offset);

    if (from === to) {
      const nodes = inlineNodes(
        this.#options.editor.getSnapshot(),
        anchor.surface,
      );
      if (nodes === null) {
        this.#recover();
        return;
      }
      const next = nextInlineBoundary(nodes, to);
      if (next === null) return;
      to = next;
    }

    this.#commitInlineReplacement(
      anchor.surface,
      from,
      to,
      Object.freeze([]),
      'delete-forward',
      collapsedSelection(anchor.surface, from),
    );
  }

  #commitTextSurface(
    surface: InlineSurface,
    from: number,
    to: number,
    text: string,
    affinity: 'before' | 'after',
    historyIntent: 'typing' | 'composition' | 'paste',
    nextSelection: EditorSelection,
  ): void {
    const snapshot = this.#options.editor.getSnapshot();
    const result = this.#options.editor.replaceInlineText({
      surface,
      from,
      to,
      text,
      affinity,
      selection: nextSelection,
      expectedRevision: snapshot.revision,
      expectedConfigEpoch: snapshot.configEpoch,
      origin: 'human',
      historyIntent,
    });
    if (!result.ok) {
      this.#report(result.error);
      this.#recover();
    }
  }

  #commitInlineReplacement(
    surface: InlineSurface,
    from: number,
    to: number,
    replacement: readonly InlineNode[],
    historyIntent:
      | 'typing'
      | 'composition'
      | 'delete-backward'
      | 'delete-forward'
      | 'paste'
      | 'command',
    nextSelection: EditorSelection,
  ): void {
    const snapshot = this.#options.editor.getSnapshot();
    const operation: ContentOperation = Object.freeze({
      type: 'replace-inline',
      surface,
      from,
      to,
      replacement,
    });
    const result = this.#options.editor.transact({
      operations: Object.freeze([operation]),
      selection: nextSelection,
      expectedRevision: snapshot.revision,
      expectedConfigEpoch: snapshot.configEpoch,
      origin: 'human',
      historyIntent,
    });
    if (!result.ok) {
      this.#report(result.error);
      this.#recover();
    }
  }

  #copySelection(
    event: ClipboardEvent,
    cut: boolean,
  ): void {
    if (!this.#active) return;
    const clipboard = event.clipboardData;
    if (clipboard === null) return;

    const value = readEditorDOMSelection(this.#root);
    if (value.status !== 'mapped' || !sameInlineSurfaceSelection(value.selection)) {
      return;
    }

    const anchor = value.selection.anchor;
    const focus = value.selection.focus;
    if (anchor.type !== 'inline' || focus.type !== 'inline') return;
    const from = Math.min(anchor.offset, focus.offset);
    const to = Math.max(anchor.offset, focus.offset);
    if (from === to) return;

    const snapshot = this.#options.editor.getSnapshot();
    const fragment = createInlineFragment(snapshot.document, {
      surface: anchor.surface,
      from,
      to,
    });
    if (!fragment.ok) {
      this.#report(fragment.error);
      return;
    }

    clipboard.setData(
      EDITOR_FRAGMENT_MIME,
      JSON.stringify(fragment.value),
    );
    clipboard.setData('text/plain', inlineFragmentText(fragment.value));
    event.preventDefault();

    if (cut) {
      const selection = this.#syncSelection();
      if (selection === null) return;
      this.#commitInlineReplacement(
        anchor.surface,
        from,
        to,
        Object.freeze([]),
        'command',
        collapsedSelection(anchor.surface, from),
      );
    }
  }

  #pastePortableFragment(
    selection: EditorSelection,
    raw: string,
  ): void {
    const snapshot = this.#options.editor.getSnapshot();
    if (
      raw.length
      > snapshot.contentLimits.maxTotalStringCodeUnits
    ) {
      this.#report(domEditorError(
        'dom-editor-clipboard-invalid',
        'Portable Content clipboard data exceeds the active Content string ceiling.',
      ));
      this.#recover();
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.#report(domEditorError(
        'dom-editor-clipboard-invalid',
        'Portable Content clipboard data is not valid JSON.',
      ));
      this.#recover();
      return;
    }

    if (!isInlineFragment(parsed, snapshot)) {
      this.#report(domEditorError(
        'dom-editor-clipboard-invalid',
        'Portable Content clipboard data does not match the active inline fragment contract.',
      ));
      this.#recover();
      return;
    }

    const anchor = selection.anchor;
    const focus = selection.focus;
    if (anchor.type !== 'inline' || focus.type !== 'inline') return;
    const from = Math.min(anchor.offset, focus.offset);
    const to = Math.max(anchor.offset, focus.offset);
    const nextSelection = collapsedSelection(
      anchor.surface,
      from + measureInlineContent(parsed.content),
    );
    const inserted = this.#options.editor.insertInlineFragment({
      surface: anchor.surface,
      from,
      to,
      fragment: parsed,
      selection: nextSelection,
      expectedRevision: snapshot.revision,
      expectedConfigEpoch: snapshot.configEpoch,
      origin: 'human',
      historyIntent: 'paste',
    });
    if (!inserted.ok) {
      this.#report(inserted.error);
      this.#recover();
    }
  }

  #recover(): void {
    const refreshed = this.refresh();
    if (!refreshed.ok) this.#report(refreshed.error);
  }

  #report(error: SectileError<DOMEditorFailureCode>): void {
    try {
      this.#options.onError?.(error);
    } catch {
      // Error reporters are isolated from the DOM/Editor connection.
    }
  }
}

function inlineNodes(
  snapshot: EditorSessionSnapshot,
  surface: InlineSurface,
): readonly InlineNode[] | null {
  const node = snapshot.index.getNode(surface.id);
  if (node === null) return null;

  if (surface.type === 'node') {
    return node.type === 'paragraph' || node.type === 'heading'
      ? node.children
      : null;
  }

  if (node.type !== 'component' || node.kind !== 'block') return null;
  const slot = node.slots.find(
    (candidate) => candidate.name === surface.slot,
  );
  return slot?.kind === 'inline' ? slot.content : null;
}

function previousInlineBoundary(
  nodes: readonly InlineNode[],
  offset: number,
): number | null {
  for (let candidate = offset - 1; candidate >= 0; candidate -= 1) {
    if (isInlineContentBoundary(nodes, candidate)) return candidate;
  }
  return null;
}

function nextInlineBoundary(
  nodes: readonly InlineNode[],
  offset: number,
): number | null {
  const length = measureInlineContent(nodes);
  for (let candidate = offset + 1; candidate <= length; candidate += 1) {
    if (isInlineContentBoundary(nodes, candidate)) return candidate;
  }
  return null;
}

function collapsedSelection(
  surface: InlineSurface,
  offset: number,
): EditorSelection {
  const point = Object.freeze({
    type: 'inline' as const,
    surface,
    offset,
    affinity: 'after' as const,
  });
  return Object.freeze({
    anchor: point,
    focus: point,
    direction: 'forward',
  });
}

function sameInlineSurfaceSelection(
  selection: EditorSelection,
): boolean {
  const { anchor, focus } = selection;
  if (anchor.type !== 'inline' || focus.type !== 'inline') return false;
  return sameSurface(anchor.surface, focus.surface);
}

function sameSurface(
  left: InlineSurface,
  right: InlineSurface,
): boolean {
  return (
    left.type === right.type
    && left.id === right.id
    && (
      left.type === 'node'
      || (
        right.type === 'slot'
        && left.slot === right.slot
      )
    )
  );
}

function isInlineFragment(
  value: unknown,
  snapshot: EditorSessionSnapshot,
): value is {
  readonly formatVersion: 1;
  readonly schema: EditorSessionSnapshot['document']['schema'];
  readonly kind: 'inline';
  readonly content: readonly InlineNode[];
} {
  if (
    typeof value !== 'object'
    || value === null
    || !('formatVersion' in value)
    || !('schema' in value)
    || !('kind' in value)
    || !('content' in value)
  ) {
    return false;
  }

  const candidate = value as {
    readonly formatVersion?: unknown;
    readonly schema?: {
      readonly id?: unknown;
      readonly version?: unknown;
    };
    readonly kind?: unknown;
    readonly content?: unknown;
  };
  if (
    candidate.formatVersion !== 1
    || candidate.kind !== 'inline'
    || candidate.schema?.id !== snapshot.document.schema.id
    || candidate.schema?.version !== snapshot.document.schema.version
    || !Array.isArray(candidate.content)
  ) {
    return false;
  }

  return candidate.content.every((node) => (
    typeof node === 'object'
    && node !== null
    && 'type' in node
    && (
      (node as { readonly type?: unknown }).type === 'text'
      || (node as { readonly type?: unknown }).type === 'hard-break'
      || (
        (node as { readonly type?: unknown }).type === 'component'
        && (node as { readonly kind?: unknown }).kind === 'inline'
      )
    )
  ));
}

function projectPlainDOMText(
  surface: HTMLElement,
): string | null {
  let output = '';
  const stack: Node[] = [...surface.childNodes].reverse();

  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) break;
    if (node.nodeType === 3) {
      output += node.nodeValue ?? '';
      continue;
    }

    const element = node.nodeType === 1 ? node as Element : null;
    if (element !== null) {
      if (
        element.matches(editorInlineAtomSelector())
        || element.matches(editorHardBreakSelector())
        || (
          readEditorInlineSurface(element) !== null
          && element !== surface
        )
      ) {
        return null;
      }
    }

    for (
      let index = node.childNodes.length - 1;
      index >= 0;
      index -= 1
    ) {
      const child = node.childNodes[index];
      if (child !== undefined) stack.push(child);
    }
  }

  return output;
}

function closestSurfaceElement(
  node: Node,
): HTMLElement | null {
  const element = node.nodeType === 1
    ? node as Element
    : node.parentElement;
  return element?.closest<HTMLElement>(
    editorInlineSurfaceSelector(),
  ) ?? null;
}

function isMutationInputType(inputType: string): boolean {
  return (
    inputType.startsWith('insert')
    || inputType.startsWith('delete')
    || inputType.startsWith('format')
    || inputType.startsWith('history')
  );
}

function domEditorError(
  code: DOMEditorErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): SectileError<DOMEditorErrorCode> {
  return Object.freeze({
    class: 'transition-rejection',
    code,
    message,
    ...(details === undefined ? {} : { details }),
  });
}

function baseline(
  element: HTMLElement,
  name: string,
): AttributeBaseline {
  return {
    name,
    value: element.getAttribute(name),
    owned: null,
  };
}

function setOwnedAttribute(
  element: HTMLElement,
  baselines: readonly AttributeBaseline[],
  name: string,
  value: string | null,
): void {
  const entry = baselines.find((candidate) => candidate.name === name);
  if (entry === undefined) return;

  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
  entry.owned = value;
}

function rememberOwnedAttribute(
  element: HTMLElement,
  baselines: readonly AttributeBaseline[],
  name: string,
): void {
  const entry = baselines.find((candidate) => candidate.name === name);
  if (entry !== undefined) entry.owned = element.getAttribute(name);
}

function restoreOwnedAttribute(
  element: HTMLElement,
  entry: AttributeBaseline,
): void {
  if (element.getAttribute(entry.name) !== entry.owned) return;
  if (entry.value === null) element.removeAttribute(entry.name);
  else element.setAttribute(entry.name, entry.value);
}
