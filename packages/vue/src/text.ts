import {
  defineComponent,
  getCurrentInstance,
  h,
  mergeProps,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  shallowRef,
  watch,
  type PropType,
  type VNodeChild,
} from 'vue';
import {
  connectText,
  createTextController,
  createTextState,
  type TextConnection,
  type TextController,
  type TextState,
} from '@sectile/dom/text';
import { useNativeInputFormControl } from './form/control.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';
import { captureNativeTextState } from './input/native-text-state.js';
import { cancelTextComposition, findTextQuery, type TextSnapshot, type TextQuery, type TextQueryOptions } from '@sectile/core/text';
import { okResult, type Result } from '@sectile/core/result';

export interface TextFieldProps {
  readonly modelValue?: string | number;
  readonly defaultValue?: string | number;
  readonly modelModifiers?: TextFieldModelModifiers;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly multiline?: boolean;
  readonly type?: string;
  readonly name?: string;
  readonly form?: string;
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly autocomplete?: string;
}

export interface TextFieldModelModifiers {
  readonly lazy?: boolean;
  readonly number?: boolean;
  readonly trim?: boolean;
}

export interface TextFieldExpose {
  /** Request an explicit empty-text commit; controlled parents retain acceptance. */
  clear(): boolean;
  /** Read the current native draft; null while unavailable, unsettled or composing. */
  getTextSnapshot(): TextFieldSnapshot | null;
  /** Project a bounded trigger query against the current issued native snapshot. */
  getTextQuery(options: TextFieldQueryOptions): Result<TextFieldQuery | null>;
  /** Commit one plain-text replacement against this field's current issued snapshot. */
  replaceText(request: TextFieldReplacement): Promise<TextFieldEditResult>;
}
declare const textFieldSnapshotBrand: unique symbol;
export interface TextFieldSnapshot extends TextSnapshot { readonly [textFieldSnapshotBrand]: true }
export type TextFieldQueryOptions = TextQueryOptions;
export interface TextFieldQuery extends TextQuery { readonly snapshot: TextFieldSnapshot }
export interface TextFieldReplacement {
  readonly snapshot: TextFieldSnapshot;
  readonly startCodeUnitOffset: number;
  readonly endCodeUnitOffset: number;
  readonly text: string;
}
export type TextFieldEditRejection = 'unavailable' | 'disabled' | 'readonly' | 'composing' | 'busy' | 'stale' | 'invalid' | 'refused';
export type TextFieldEditResult =
  | { readonly status: 'accepted'; readonly snapshot: TextFieldSnapshot }
  | { readonly status: 'rejected'; readonly reason: TextFieldEditRejection };
interface TextFieldActionPort {
  request: (() => boolean) | null;
  read: (() => TextFieldSnapshot | null) | null;
  query: ((options: TextFieldQueryOptions) => Result<TextFieldQuery | null>) | null;
  replace: ((request: TextFieldReplacement) => Promise<TextFieldEditResult>) | null;
}
interface TextEditOperation {
  readonly restore: TextState | null;
  proposal: TextState | null;
  settlement: { readonly accepted: boolean; readonly connection: TextConnection; readonly revision: number } | null;
}
interface TextFrame { readonly snapshot: TextFieldSnapshot; readonly connection: TextConnection; readonly revision: number }
function rejectedTextEdit(reason: TextFieldEditRejection): TextFieldEditResult { return Object.freeze({ status: 'rejected', reason }); }
// A held action must not retain the setup scope, props or native connection.
function textFieldClear(port: TextFieldActionPort): () => boolean { return () => port.request?.() ?? false; }
function textFieldRead(port: TextFieldActionPort): () => TextFieldSnapshot | null { return () => port.read?.() ?? null; }
function textFieldQuery(port: TextFieldActionPort): (options: TextFieldQueryOptions) => Result<TextFieldQuery | null> {
  return options => port.query?.(options) ?? okResult(null);
}
function textFieldReplace(port: TextFieldActionPort): (request: TextFieldReplacement) => Promise<TextFieldEditResult> {
  return request => port.replace?.(request) ?? Promise.resolve(rejectedTextEdit('unavailable'));
}

const TextFieldImplementation = defineComponent({
  name: 'SectileTextField',
  inheritAttrs: false,
  props: {
    modelValue: { type: [String, Number], default: undefined },
    defaultValue: { type: [String, Number], default: '' },
    modelModifiers: {
      type: Object as PropType<TextFieldModelModifiers>,
      default: (): TextFieldModelModifiers => ({}),
    },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    multiline: { type: Boolean, default: false },
    type: { type: String, default: 'text' },
    name: { type: String, default: undefined },
    form: { type: String, default: undefined },
    required: { type: Boolean, default: false },
    placeholder: { type: String, default: undefined },
    autocomplete: { type: String as PropType<string>, default: undefined },
  },
  emits: {
    'update:modelValue': (_value: string | number): boolean => true,
    snapshotChange: (): boolean => true,
  },
  setup(props, { attrs, emit }) {
    const instance = getCurrentInstance()!;
    const element = shallowRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const controlled = useControlledStateInvariant('TextField', 'modelValue', () => props.modelValue);
    const initialValue = String(controlled ? props.modelValue : props.defaultValue);
    const renderServerValue = typeof window === 'undefined';
    let controller: TextController | null = null;
    let connection: TextConnection | null = null;
    let connectedElement: HTMLInputElement | HTMLTextAreaElement | null = null;
    let proposedState: TextState | null = null;
    let inputComposing = false;
    let reconnectPending = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let mounted = false;
    let snapshotNotificationPending = false;
    const clearPort: TextFieldActionPort = { request: null, read: null, query: null, replace: null };
    let clearing: TextEditOperation | null = null;
    let frame: TextFrame | null = null;
    let synchronizedModelValue = props.modelValue;
    // Preserve existing public instance props while adding revocable text actions.
    Object.defineProperty(instance.proxy!, 'clear', { configurable: true, value: textFieldClear(clearPort) });
    Object.defineProperty(instance.proxy!, 'getTextSnapshot', { configurable: true, value: textFieldRead(clearPort) });
    Object.defineProperty(instance.proxy!, 'getTextQuery', { configurable: true, value: textFieldQuery(clearPort) });
    Object.defineProperty(instance.proxy!, 'replaceText', { configurable: true, value: textFieldReplace(clearPort) });

    function notifySnapshotChange(): void {
      if (!mounted || snapshotNotificationPending || !instance.vnode.props?.['onSnapshotChange']) return;
      snapshotNotificationPending = true;
      void nextTick(() => {
        snapshotNotificationPending = false;
        if (mounted) emit('snapshotChange');
      });
    }

    const createController = (state: TextState): TextController => {
      const result = createTextController({
        ...(controlled && !props.modelModifiers.lazy
          ? { value: state }
          : { defaultValue: state }),
        disabled: props.disabled,
        readOnly: props.readonly,
        onValueChange: (change) => {
          frame = null;
          if (clearing !== null && clearing.proposal === null) clearing.proposal = change.value;
          const wasComposing = proposedState !== null && proposedState.composition !== null;
          const selectionOnly = change.value.snapshot.text === change.previousValue.snapshot.text
            && change.value.composition === change.previousValue.composition;
          proposedState = change.value;
          if (change.value.composition !== null) { notifySnapshotChange(); return; }
          if (selectionOnly) {
            if (!props.modelModifiers.lazy) settleControlledProposal(change.value);
            notifySnapshotChange();
            return;
          }
          if (props.modelModifiers.lazy) {
            if (wasComposing) settleControlledProposal(change.value);
            notifySnapshotChange();
            return;
          }
          emit('update:modelValue', change.value.snapshot.text);
          settleControlledProposal(change.value, clearing?.restore ?? null);
          notifySnapshotChange();
        },
      });
      if (!result.ok) throw new TypeError(result.error.message);
      return result.value;
    };
    const mountConnection = (state: TextState): void => {
      if (!mounted || element.value === null) return;
      frame = null;
      synchronizedModelValue = props.modelValue;
      connection?.disconnect();
      connection = null;
      connectedElement = element.value;
      controller = createController(state);
      connection = connectText({
        controller,
        element: element.value,
        disabled: props.disabled,
        readOnly: props.readonly,
        onTransition: ({ input }) => {
          if (!controlled || props.modelModifiers.lazy || input.type !== 'composition-commit') return;
          const proposal = proposedState;
          if (proposal === null || proposal.composition !== null || connection === null) return;
          const result = connection.syncControlledValues({ value: proposal });
          if (!result.ok) throw new TypeError(result.error.message);
        },
      });
      connection.render();
      notifySnapshotChange();
    };
    const requestReconnect = (): void => {
      if (inputComposing) {
        reconnectPending = true;
        return;
      }
      const state = proposedState
        ?? controller?.getSnapshot().state
        ?? createTextState(String(controlled ? props.modelValue : props.defaultValue));
      mountConnection(state);
    };
    const setInputComposing = (composing: boolean): void => {
      inputComposing = composing;
      if (composing) frame = null;
      notifySnapshotChange();
      if (composing || !reconnectPending || reconnectTimer !== null) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!mounted || inputComposing) return;
        reconnectPending = false;
        requestReconnect();
      }, 0);
    };
    function synchronizeControlledState(state: TextState, proposal: TextState | null): void {
      if (connection === null) return;
      frame = null;
      synchronizedModelValue = props.modelValue;
      if (props.modelModifiers.lazy) mountConnection(state);
      else {
        const result = connection.syncControlledValues({ value: state });
        if (!result.ok) throw new TypeError(result.error.message);
      }
      if (clearing !== null && proposal !== null && clearing.proposal === proposal && connection !== null) {
        clearing.settlement = { accepted: state === proposal, connection, revision: connection.getSnapshot().revision };
      }
      notifySnapshotChange();
    }
    function settleControlledProposal(proposal: TextState, restore: TextState | null = null): void {
      if (!controlled) return;
      void nextTick(() => {
        if (connection === null || proposedState !== proposal || props.modelValue === undefined) return;
        proposedState = null;
        const text = String(props.modelValue);
        const state = proposal.snapshot.text === text ? proposal
          : restore?.snapshot.text === text ? restore : createTextState(text);
        synchronizeControlledState(state, proposal);
      });
    }
    const participation = useNativeInputFormControl(element, {
      reset: () => {
        queueMicrotask(() => {
          if (!mounted) return;
          inputComposing = false;
          proposedState = null;
          reconnectPending = false;
          if (reconnectTimer !== null) clearTimeout(reconnectTimer);
          reconnectTimer = null;
          mountConnection(createTextState(controlled ? String(props.modelValue) : initialValue));
        });
      },
    });

    onMounted(() => {
      mounted = true;
      mountConnection(createTextState(initialValue));
    });
    onUpdated(() => {
      if (!mounted || element.value === null || connectedElement === element.value) return;
      let state = proposedState ?? controller?.getSnapshot().state ?? createTextState(initialValue);
      // Replacing the native editor ends its IME session, not a text commit.
      if (state.composition !== null) {
        const cancelled = cancelTextComposition(state);
        if (!cancelled.ok) throw new TypeError(cancelled.error.message);
        state = cancelled.value;
      }
      inputComposing = false;
      reconnectPending = false;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      proposedState = null;
      mountConnection(state);
    });
    onBeforeUnmount(() => {
      clearPort.request = null;
      clearPort.read = null;
      clearPort.query = null;
      clearPort.replace = null;
      frame = null;
      clearing = null;
      mounted = false;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      reconnectPending = false;
      connection?.disconnect();
      connection = null;
      connectedElement = null;
      controller = null;
      proposedState = null;
    });

    watch(() => props.modelValue, (value) => {
      if (!controlled || value === undefined || connection === null) return;
      if (proposedState !== null && proposedState.composition !== null) return;
      const text = String(value);
      const proposal = proposedState;
      const state = proposal?.snapshot.text === text ? proposal : createTextState(text);
      proposedState = null;
      synchronizeControlledState(state, proposal);
    });
    watch([() => props.disabled, () => props.readonly], requestReconnect);

    const commitLazyValue = (): void => {
      if (!props.modelModifiers.lazy || controller === null) return;
      emit('update:modelValue', controller.getSnapshot().state.snapshot.text);
    };

    clearPort.request = (): boolean => {
      let target = connection;
      const input = element.value;
      if (!mounted || !target || !input || clearing || props.disabled || props.readonly || inputComposing) return false;
      const state = proposedState ?? target.getSnapshot().state;
      if (state.composition !== null || state.snapshot.text.length === 0) return false;
      if (connectedElement !== input) {
        mountConnection(state);
        target = connection;
        if (!mounted || !target || connectedElement !== input) {
          connection?.disconnect(); connection = null; connectedElement = null; controller = null;
          return false;
        }
      }
      const operation: TextEditOperation = { restore: controlled ? captureNativeTextState(input, state.snapshot.text) : null, proposal: null, settlement: null };
      clearing = operation;
      try {
        const accepted = target.handleEvent({ type: 'input', inputType: 'deleteByCut', text: '',
          startCodeUnitOffset: 0, endCodeUnitOffset: state.snapshot.text.length,
          selection: { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 0 } });
        if (accepted && mounted && connection === target && props.modelModifiers.lazy) {
          const proposal = proposedState;
          commitLazyValue();
          if (mounted && connection === target && proposal) settleControlledProposal(proposal, operation.restore);
        }
        return accepted;
      } finally { clearing = null; }
    };

    clearPort.read = (): TextFieldSnapshot | null => {
      const target = connection, input = element.value;
      if (!mounted || !target || !input || connectedElement !== input || inputComposing
        || controlled && props.modelValue !== synchronizedModelValue) return null;
      const current = target.getSnapshot(), state = current.state;
      if (state.composition !== null || input.value !== state.snapshot.text) return null;
      const start = input.selectionStart, end = input.selectionEnd;
      if (start === null || end === null) return null;
      const backward = input.selectionDirection === 'backward', selection = state.snapshot.selection;
      if (selection.anchorCodeUnitOffset !== (backward ? end : start)
        || selection.focusCodeUnitOffset !== (backward ? start : end)) return null;
      if (frame?.connection === target && frame.revision === current.revision) return frame.snapshot;
      const snapshot = Object.freeze({ text: state.snapshot.text, selection }) as TextFieldSnapshot;
      frame = { snapshot, connection: target, revision: current.revision };
      return snapshot;
    };
    clearPort.query = (options): Result<TextFieldQuery | null> => {
      const snapshot = clearPort.read?.(), target = connection;
      if (!snapshot || !target) return okResult(null);
      const query = findTextQuery(target.getSnapshot().state, options);
      if (!query.ok) return query;
      if (query.value === null) return okResult(null);
      return okResult(Object.freeze({ ...query.value, snapshot }));
    };
    clearPort.replace = async (request): Promise<TextFieldEditResult> => {
      if (typeof request !== 'object' || request === null) return rejectedTextEdit('invalid');
      const { snapshot, startCodeUnitOffset, endCodeUnitOffset, text } = request;
      if (typeof text !== 'string' || typeof startCodeUnitOffset !== 'number' || typeof endCodeUnitOffset !== 'number') return rejectedTextEdit('invalid');
      const target = connection, input = element.value;
      if (!mounted || !target || !input || connectedElement !== input) return rejectedTextEdit('unavailable');
      if (props.disabled) return rejectedTextEdit('disabled');
      if (props.readonly) return rejectedTextEdit('readonly');
      if (inputComposing || target.getSnapshot().state.composition !== null) return rejectedTextEdit('composing');
      if (clearing !== null) return rejectedTextEdit('busy');
      const issued = clearPort.read?.();
      if (!issued || issued !== snapshot) return rejectedTextEdit('stale');
      const operation: TextEditOperation = { restore: target.getSnapshot().state, proposal: null, settlement: null };
      clearing = operation;
      try {
        const caret = startCodeUnitOffset + text.length;
        const dispatched = target.handleEvent({ type: 'input', inputType: 'insertReplacementText', text,
          startCodeUnitOffset, endCodeUnitOffset, selection: { anchorCodeUnitOffset: caret, focusCodeUnitOffset: caret } });
        if (!mounted || connection === null) return rejectedTextEdit('unavailable');
        if (!dispatched) return rejectedTextEdit('invalid');
        const proposal = operation.proposal;
        if (proposal !== null && props.modelModifiers.lazy) {
          if (proposal.snapshot.text !== operation.restore?.snapshot.text) commitLazyValue();
          if (mounted && connection === target && controlled) settleControlledProposal(proposal, operation.restore);
        }
        if (!mounted || connection === null) return rejectedTextEdit('unavailable');
        if (connection !== target) return rejectedTextEdit('stale');
        if (!controlled && proposal !== null && target.getSnapshot().state !== proposal) return rejectedTextEdit('stale');
        if (proposal === null || !controlled) operation.settlement = { accepted: true, connection: target, revision: target.getSnapshot().revision };
        await nextTick();
        if (!mounted || connection === null) return rejectedTextEdit('unavailable');
        const settled = operation.settlement;
        if (settled === null || settled.connection !== connection || settled.revision !== connection.getSnapshot().revision
          || connectedElement !== input || props.disabled || props.readonly) return rejectedTextEdit('stale');
        if (!settled.accepted) return rejectedTextEdit('refused');
        const committed = clearPort.read?.();
        return committed ? Object.freeze({ status: 'accepted', snapshot: committed }) : rejectedTextEdit('stale');
      } finally { if (clearing === operation) clearing = null; }
    };

    return (): VNodeChild => h(props.multiline ? 'textarea' : 'input', mergeProps(
      attrs,
      {
        ref: element,
        ...(!props.multiline ? { type: props.type } : {}),
        ...(renderServerValue ? { value: initialValue } : { defaultValue: controlled ? String(props.modelValue) : initialValue }),
        disabled: props.disabled,
        readonly: props.readonly,
        required: props.required,
        name: props.name,
        form: props.form,
        placeholder: props.placeholder,
        autocomplete: props.autocomplete,
        onCompositionstart: () => setInputComposing(true),
        onCompositionend: () => setInputComposing(false),
        onChange: commitLazyValue,
        'data-scope': 'text',
        'data-part': 'input',
        'data-disabled': props.disabled ? '' : undefined,
        'data-readonly': props.readonly ? '' : undefined,
      },
      participation.controlProps.value,
    ));
  },
});

type TextFieldComponent = typeof TextFieldImplementation & {
  new(): InstanceType<typeof TextFieldImplementation> & TextFieldExpose;
};
export const TextField: TextFieldComponent = TextFieldImplementation as TextFieldComponent;

export type TextFieldValueChangeHandler = (value: string | number) => void;
export type TextFieldSnapshotChangeHandler = () => void;
