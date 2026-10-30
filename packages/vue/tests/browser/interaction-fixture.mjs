// Browser-driven keyboard/IME witnesses. The runner supplies native input.
import { createApp, h, nextTick, ref } from 'vue';
import { DialogRoot, DialogTrigger, DialogContent, DialogClose, DialogPortal } from '@sectile/vue/dialog';
import { DrawerRoot, DrawerTrigger, DrawerContent, DrawerPortal } from '@sectile/vue/drawer';
import { TextField } from '@sectile/vue/text';
import { ComboboxRoot, ComboboxInput } from '@sectile/vue/combobox';
import { NumberField } from '@sectile/vue/number-field';
import { SpinButtonRoot, SpinButtonInput } from '@sectile/vue/spin-button';
import { createPopover } from '@sectile/dom/popover';
import { createCarousel } from '@sectile/dom/carousel';
import { connectMediaGesture } from '@sectile/dom/media-gesture';
import { SequenceReorderRoot, SequenceReorderItem } from '@sectile/vue/reorder';
import { TagsInputRoot, TagsInputInput } from '@sectile/vue/tags-input';
import { PinInputRoot, PinInputInput } from '@sectile/vue/pin-input';
import { ToastProvider, ToastViewport } from '@sectile/vue/toast';
import { EditableRoot, EditableInput, EditablePreview, EditableEditTrigger } from '@sectile/vue/editable';
import { ColorPickerRoot, ColorPickerTextInput } from '@sectile/vue/color-picker';
import { QuantityFieldRoot, QuantityFieldInput, createStandardQuantityPolicies } from '@sectile/vue/quantity-field';
import { DateField } from '@sectile/vue/temporal/date-field';
import { TimeField } from '@sectile/vue/temporal/time-field';
import { DateTimeField } from '@sectile/vue/temporal/date-time-field';
import { DateRangeFieldRoot, DateRangeFieldStartInput, DateRangeFieldEndInput } from '@sectile/vue/temporal/date-range-field';
import { TimeRangeFieldRoot, TimeRangeFieldStartInput, TimeRangeFieldEndInput } from '@sectile/vue/temporal/time-range-field';
import { DatePickerRoot, DatePickerInput, DatePickerTrigger, DatePickerContent, DatePickerGrid } from '@sectile/vue/temporal/date-picker';
import { TreeGridRoot, TreeGridRow, TreeGridCell, TreeGridEditor } from '@sectile/vue/tree-grid';
import { useDataGrid, createDataGridComponents } from '@sectile/vue/data-grid';
import { TreeSelectRoot, TreeSelectInput, TreeSelectContent } from '@sectile/vue/tree-select';
import { DateTimeRangeFieldRoot, DateTimeRangeFieldStartInput, DateTimeRangeFieldEndInput } from '@sectile/vue/temporal/date-time-range-field';

const host = document.querySelector('#probe');
const style = document.createElement('style');
style.textContent = '[data-probe-panel]{opacity:1;transition:opacity 600ms linear}[data-probe-panel][data-state=closed]{opacity:0}';
document.head.append(style);
let app, media;
const settle = async () => { await nextTick(); await nextTick(); };
const reset = () => { media?.disconnect(); media = undefined; app?.unmount(); app = undefined; host.replaceChildren(); composing.clear(); };
const events = [], writes = [], valueWrites = [], nativeMutations = [];
const mutation = record => { if (nativeMutations.length === 100) nativeMutations.shift(); nativeMutations.push(record); };
for (const prototype of [HTMLInputElement.prototype, HTMLTextAreaElement.prototype]) {
  for (const key of ['defaultValue','placeholder','type','readOnly','disabled']) {
    const property = Object.getOwnPropertyDescriptor(prototype,key); if (!property?.set) continue;
    Object.defineProperty(prototype,key,{...property,set(next){mutation({id:this.id,key,value:next,composing:composing.has(this)});property.set.call(this,next);}});
  }
}
for (const method of ['setAttribute','removeAttribute']) {
  const original=Element.prototype[method];
  Element.prototype[method]=function(...args){if(this instanceof HTMLInputElement||this instanceof HTMLTextAreaElement)mutation({id:this.id,method,args,composing:composing.has(this)});return original.apply(this,args);};
}
const composing = new Set();
for (const type of ['compositionstart', 'compositionupdate', 'compositionend', 'input', 'keydown', 'keyup']) document.addEventListener(type, event => {
  if (type === 'compositionstart') composing.add(event.target);
  if (type === 'compositionend') composing.delete(event.target);
  if (events.length < 1000) {
    const record = { id: event.target.id, type, data: event.data, value: event.target.value,
      ...(type.startsWith('key') ? { key: event.key, code: event.code, composing: event.isComposing,
        alt: event.altKey, ctrl: event.ctrlKey, meta: event.metaKey, shift: event.shiftKey } : {}) };
    events.push(record);
    queueMicrotask(() => { record.prevented = event.defaultPrevented; });
  }
}, true);
for (const prototype of [HTMLInputElement.prototype, HTMLTextAreaElement.prototype]) {
const value = Object.getOwnPropertyDescriptor(prototype, 'value');
const selection=prototype.setSelectionRange;
prototype.setSelectionRange=function(...args){const record={id:this.id,selection:args,composing:composing.has(this)};
  if(valueWrites.length<1000)valueWrites.push(record);if(record.composing)writes.push(record);return selection.apply(this,args);};
Object.defineProperty(prototype, 'value', { ...value, set(next) {
  if(valueWrites.length<1000)valueWrites.push({id:this.id,before:value.get.call(this),value:next,composing:composing.has(this)});
  if (composing.has(this)) writes.push({ id: this.id, value: next });
  value.set.call(this, next);
} });
}

window.sectileProbe = {
  async positioning() {
    reset();
    const rows = [];
    const previousDirection = document.documentElement.dir;
    const frames = async () => { for (let index = 0; index < 3; index++) await new Promise(requestAnimationFrame); };
    try {
      for (const direction of ['ltr', 'rtl']) for (const strategy of ['fixed', 'absolute']) {
        document.documentElement.dir = direction;
        for (const edge of [false, true]) for (const side of ['top', 'right', 'bottom', 'left']) for (const align of ['start', 'center', 'end']) {
          const anchor = document.createElement('button');
          anchor.style.cssText = `position:absolute;left:${edge ? innerWidth - 40 : 350}px;top:280px;width:60px;height:40px;padding:0;border:0;`;
          const roots = [document.createElement('div'), document.createElement('div')];
          for (const root of roots) root.style.cssText = 'width:180px;height:100px;';
          document.body.append(anchor, ...roots);
          const a = anchor.getBoundingClientRect();
          const options = { anchor, side, align, strategy, sideOffset: 8, flip: false, shift: false, defaultOpen: true, autoFocus: false, label: 'Placement probe' };
          const native = createPopover({ ...options, root: roots[0] });
          const javascript = createPopover({ ...options, root: roots[1], anchorRect: { x: a.x, y: a.y, width: a.width, height: a.height } });
          try {
            await frames();
            const n = roots[0].getBoundingClientRect(), j = roots[1].getBoundingClientRect();
            rows.push({ direction, strategy, edge, side, align, nativeRoute: roots[0].dataset.positionRoute,
              jsRoute: roots[1].dataset.positionRoute, native: { x: n.x, y: n.y }, js: { x: j.x, y: j.y } });
          } finally { native.disconnect(); javascript.disconnect(); anchor.remove(); for (const root of roots) root.remove(); }
        }
      }
      const anchor = document.createElement('button'), root = document.createElement('div');
      anchor.style.cssText = `position:absolute;left:250px;top:${innerHeight - 90}px;width:60px;height:40px;border:0;padding:0;`;
      root.style.cssText = 'width:180px;height:500px;max-height:var(--sectile-position-available-height);overflow:auto;';
      document.body.append(anchor, root);
      const popup = createPopover({ root, anchor, side: 'bottom', align: 'start', strategy: 'fixed', avoidCollisions: false,
        defaultOpen: true, autoFocus: false, label: 'Size probe' });
      let size;
      try { await frames(); size = { route: root.dataset.positionRoute, height: root.getBoundingClientRect().height,
        expected: Math.max(0, innerHeight - anchor.getBoundingClientRect().bottom - 16) }; }
      finally { popup.disconnect(); anchor.remove(); root.remove(); }
      const scroller = document.createElement('div'), track = document.createElement('div'), button = document.createElement('button');
      const panel = document.createElement('div');
      scroller.style.cssText = 'position:absolute;left:100px;top:100px;width:300px;overflow:auto;';
      track.style.cssText = 'width:800px;height:60px;'; button.style.cssText = 'margin-left:200px;width:60px;height:40px;';
      panel.style.cssText = 'width:180px;height:100px;'; track.append(button); scroller.append(track); document.body.append(scroller, panel);
      const portaled = createPopover({ root: panel, anchor: button, side: 'bottom', align: 'start', strategy: 'fixed', avoidCollisions: false,
        defaultOpen: true, autoFocus: false, label: 'Scroll probe' });
      let scroll;
      try { await frames(); scroller.scrollLeft = 80; await frames(); scroll = { anchorX: button.getBoundingClientRect().x, popupX: panel.getBoundingClientRect().x, route: panel.dataset.positionRoute }; }
      finally { portaled.disconnect(); scroller.remove(); panel.remove(); }
      return { rows, size, scroll };
    } finally { document.documentElement.dir = previousDirection; }
  },
  events, writes, valueWrites, nativeMutations,
  inputFamilies: ['native','native-textarea','text','combo','text-uncontrolled','textarea','text-representation','combo-uncontrolled','number','quantity',
    'date','time','datetime','date-start','date-end','time-start','time-end','picker','tags','spin','editable','pin','color','treegrid','tabular-editor','tabular-filter',
    'tree-select','tree-select-uncontrolled','datetime-start','datetime-end'],
  async reference(id) {
    await this.field(id);
    const source=document.getElementById(id),reference=source.cloneNode(false);reference.id='native-reference';
    reset();document.body.append(reference);
  },
  async field(id) {
    if (['native','text','combo'].includes(id)) { await this.native(); this.reconfigure=this.changeItems; return; }
    reset();events.length=0;writes.length=0;
    const value=ref(''), config=ref({label:'Input'}), multiline=ref(false), tags=ref([]), treeNodes=ref([{id:'root',parentID:null}]);let render, grid, rangeDraft;
    const update=next=>{value.value=next;}, input=part=>h(part,{id});
    const compound=(Root,Input,props={})=>()=>h(Root,{...props,...config.value},{default:()=>input(Input)});
    const range=(Root,Start,End)=>()=>h(Root,config.value,{default:state=>{
      const start=id.endsWith('start');rangeDraft=start?state.startText:state.endText;
      return [h(Start,{id:start?id:`${id}-start`}),h(End,{id:start?`${id}-end`:id})];
    }});
    if(id==='native-textarea')render=()=>h('textarea',{id});
    else if(id.startsWith('text')||id==='textarea') render=()=>h(TextField,{id,...config.value,
      ...(id==='text-uncontrolled'?{defaultValue:''}:{modelValue:value.value,'onUpdate:modelValue':update}),
      multiline:id==='textarea'||multiline.value});
    else if(id==='combo-uncontrolled') render=compound(ComboboxRoot,ComboboxInput,{items:[]});
    else if(id==='number') render=()=>h(NumberField,{id,...config.value,modelValue:value.value||null,'onUpdate:modelValue':update});
    else if(id==='quantity') render=compound(QuantityFieldRoot,QuantityFieldInput,{policies:createStandardQuantityPolicies('metre')});
    else if(['date','time','datetime'].includes(id)) render=()=>h({date:DateField,time:TimeField,datetime:DateTimeField}[id],{id,...config.value});
    else if(id.startsWith('datetime-')) render=range(DateTimeRangeFieldRoot,DateTimeRangeFieldStartInput,DateTimeRangeFieldEndInput);
    else if(id.startsWith('date-')) render=range(DateRangeFieldRoot,DateRangeFieldStartInput,DateRangeFieldEndInput);
    else if(id.startsWith('time-')) render=range(TimeRangeFieldRoot,TimeRangeFieldStartInput,TimeRangeFieldEndInput);
    else if(id==='picker') render=()=>h(DatePickerRoot,{position:false,referenceDate:{year:2026,month:10,day:25},...config.value},()=>[
      input(DatePickerInput),h(DatePickerTrigger),h(DatePickerContent,{},()=>h(DatePickerGrid)),
    ]);
    else if(id==='tags') render=()=>h(TagsInputRoot,{...config.value,inputValue:value.value,'onUpdate:inputValue':update,
      modelValue:tags.value,'onUpdate:modelValue':next=>{tags.value=next;}},{default:()=>input(TagsInputInput)});
    else if(id==='spin') render=compound(SpinButtonRoot,SpinButtonInput,{min:'-1000',max:'1000',defaultValue:'0',defaultDraft:''});
    else if(id==='color') render=compound(ColorPickerRoot,ColorPickerTextInput,{defaultDraft:''});
    else if(id==='pin') render=()=>h(PinInputRoot,{length:4,...config.value,modelValue:value.value,'onUpdate:modelValue':update},
      {default:()=>Array.from({length:4},(_,index)=>h(PinInputInput,{index,id:index===0?id:`pin-${index}`}))});
    else if(id==='editable') render=()=>h(EditableRoot,{...config.value,modelValue:value.value,'onUpdate:modelValue':update},
      {default:()=>[h(EditablePreview),input(EditableInput),h(EditableEditTrigger,{id:'activate-editor'},()=> 'Edit')]});
    else if(id==='treegrid') render=()=>h(TreeGridRoot,{...config.value,rows:[{id:'root',parentID:null,cells:['name']}],getCellValue:()=>value.value,
      setCellValue:(_id,next)=>update(next),defaultHighlightedValue:'name',defaultEditMode:'editing'},
      {default:()=>h(TreeGridRow,{value:'root',rowIndex:1},{default:()=>h(TreeGridCell,{value:'name',columnIndex:1},{default:()=>h(TreeGridEditor,{for:'name',id})})})});
    else if(id.startsWith('tree-select')) render=()=>h(TreeSelectRoot,{nodes:treeNodes.value,position:false,...config.value,
      ...(id==='tree-select'?{query:value.value}:{}),'onUpdate:query':update},()=>[input(TreeSelectInput),h(TreeSelectContent)]);
    else if(id.startsWith('tabular')) {
      app=createApp({setup(){
        const response=request=>({protocolVersion:1,requestID:request.requestID,sourceGeneration:request.sourceGeneration,queryRevision:request.queryRevision,
          expansionRevision:request.expansionRevision,viewRevision:1,access:request.access,matchingLeafCount:{kind:'known',value:1},visibleRowCount:{kind:'known',value:1},
          rows:[{kind:'leaf',id:'row',cells:{name:''}}],columnSchema:{revision:request.columnSchemaRevision,columns:[{id:'name',capabilities:['edit','filter']}],headers:[]},removedRowIDs:[]});
        grid=useDataGrid({source:async request=>response(request)});const request=grid.requestState.value.pendingRequest;
        const admitted=grid.synchronizeView(response(request));if(!admitted.ok)throw Error(admitted.error.message);
        const parts=createDataGridComponents(grid);
        return ()=>h(parts.Provider,{},()=>h(parts.Root,{},()=>id==='tabular-filter'
          ?h(parts.FilterControl,{id,scope:'column',column:'name',predicate:'contains'})
          :h(parts.Cell,{rowID:'row',column:'name'},{default:()=>h(parts.Editor,{id,rowID:'row',column:'name'})})));
      }});
    }
    if(!app) { if(!render)throw Error(`Unknown native field ${id}`);app=createApp({render}); }
    app.mount(host);await settle();
    if(id==='editable') { host.querySelector('#activate-editor').click();await settle(); }
    if(id==='tabular-editor') { const cell=host.querySelector('[data-part=cell]');cell.click();cell.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await settle(); }
    const target=host.querySelector(`#${id}`)??host.querySelector('input:not([type=hidden]),textarea');if(target)target.id=id;
    this.reconfigure=()=>{config.value={label:'Changed label'};if(id==='text-representation')multiline.value=true;
      if(id.startsWith('tree-select'))treeNodes.value=[...treeNodes.value,{id:'extra',parentID:null}];};
    this.nativeState=()=>({value:value.value,tags:tags.value,rangeDraft});
  },
  async reorder() {
    reset(); const changes=[], lifecycle=[];let state;
    app=createApp({render:()=>h(SequenceReorderRoot,{items:['a','b','c'],keyboardMode:'preview',
      'onUpdate:items':value=>changes.push(value),'onInteraction-change':value=>lifecycle.push(value)},
    {default:current=>{state=current;return current.items.map(value=>h(SequenceReorderItem,{value,key:value,id:`reorder-${value}`},()=>value));}})});
    app.mount(host);await settle();
    this.reorderState=()=>({items:state.items,interaction:state.interaction,preview:state.getPreviewState(),changes,lifecycle});
  },
  async native() {
    reset(); events.length = 0; writes.length = 0;
    const text = ref(''), combo = ref(''), items = ref([{ id: 'a', label: '한글' }]);
    app = createApp({ render: () => h('div', [
      h('input', { id: 'native' }),
      h(TextField, { id: 'text', modelValue: text.value, 'onUpdate:modelValue': next => { text.value = next; } }),
      h(ComboboxRoot, { items: items.value, inputValue: combo.value, 'onUpdate:inputValue': next => { combo.value = next; } }, { default: () => h(ComboboxInput, { id: 'combo' }) }),
    ]) });
    app.mount(host); await settle();
    this.models = () => ({ text: text.value, combo: combo.value });
    this.changeItems = () => { items.value = [...items.value, { id: 'b', label: '새 항목' }]; };
  },
  async popups(portal, controlled) {
    reset();
    const parent = ref(false), child = ref(false);
    const props = (open, label) => ({ label, ...(controlled ? { open: open.value, 'onUpdate:open': next => { open.value = next; } } : {}) });
    const panel = (name, children) => {
      const content = () => h(DialogContent, { 'data-probe-panel': name }, { default: children });
      return portal ? h(DialogPortal, {}, { default: content }) : content();
    };
    app = createApp({ render: () => h(DialogRoot, props(parent, 'Parent'), { default: () => [
      h(DialogTrigger, { id: 'parent-trigger' }, { default: () => 'Parent' }),
      panel('parent', () => [h(DialogClose, { id: 'parent-close' }, { default: () => 'Close parent' }),
        h(DialogRoot, props(child, 'Child'), { default: () => [
          h(DialogTrigger, { id: 'child-trigger' }, { default: () => 'Child' }),
          panel('child', () => h(DialogClose, { id: 'child-close' }, { default: () => 'Close child' })),
        ] }),
      ]),
    ] }) });
    app.mount(host); await settle();
  },
  async toast() {
    reset();
    let state;
    app = createApp({ render: () => h('div', [
      h('input', { id: 'toast-input', autocomplete: 'name' }),
      h(ToastProvider, null, { default: current => {
        state = current;
        return h(ToastViewport, { id: 'toast-viewport' });
      } }),
    ]) });
    app.mount(host); await settle();
    const input = document.getElementById('toast-input');
    input.focus(); await settle();
    const before = state.toasts;
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'key', { value: undefined });
    input.dispatchEvent(event); await settle();
    return { prevented: event.defaultPrevented, focused: document.activeElement.id,
      queueUnchanged: state.toasts === before, count: state.toasts.length };
  },
  async defects() {
    reset();
    const opener = document.createElement('button'), root = document.createElement('div');
    opener.id = 'opener'; host.append(opener, root); opener.focus();
    root.innerHTML = '<button disabled>Disabled</button><div hidden><button>Hidden</button></div><button id="visible">Visible</button>';
    const popup = createPopover({ root, defaultOpen: true, autoFocus: true, position: false });
    const initialFocus = document.activeElement.id;
    popup.destroy(); host.replaceChildren();
    app = createApp({ render: () => h(NumberField, { modelValue: null, placeholder: 'Enter a number' }) });
    app.mount(host); await settle();
    const placeholder = host.querySelector('input').getAttribute('placeholder'); reset();
    const min = ref('0.5'), model = ref('4'), errors = [];
    app = createApp({ render: () => h(SpinButtonRoot, { min: min.value, max: '1000', step: '0.01', modelValue: model.value }, { default: () => h(SpinButtonInput) }) });
    app.config.errorHandler = error => errors.push(error.message);
    app.mount(host); await settle();
    const input = host.querySelector('input'); input.focus(); input.setSelectionRange(1, 1);
    min.value = '0.16'; model.value = '0.16'; await settle();
    const spin = { errors: errors.slice(), text: input.value, focused: document.activeElement === input };
    // An invalid replacement keeps the prior connection usable.
    min.value = '2'; model.value = '0'; await settle();
    const rejected = { errors: errors.slice(), text: input.value }; reset();
    const keys = [];
    for (const scenario of ['input', 'range', 'alt', 'prevented', 'root']) {
      const root = document.createElement('div'), input = document.createElement('input');
      if (scenario === 'range') input.type = 'range'; root.append(input); host.append(root);
      const carousel = createCarousel({ root, slides: ['a', 'b', 'c'], defaultValue: 'a' });
      const event = new KeyboardEvent('keydown', { key: scenario === 'range' ? 'End' : 'ArrowRight', altKey: scenario === 'alt', bubbles: true, cancelable: true });
      if (scenario === 'prevented') event.preventDefault();
      (scenario === 'root' ? root : input).dispatchEvent(event);
      keys.push({ scenario, value: carousel.getSnapshot().state.cursor.current });
      carousel.destroy(); root.remove();
    }
    return { initialFocus, placeholder, spin, rejected, keys };
  },
  async retainedDrawer(compound) {
    reset();
    const open = ref(false), target = ref();
    const button = () => h('button', { id: 'retained-trigger', onClick: () => {
      target.value = document.activeElement; open.value = true;
    } }, 'Open retained drawer');
    app = createApp({ render: () => h(DrawerRoot, {
      presentation: open.value ? 'overlay' : 'inline', open: open.value, unmountOnExit: false,
      ...(!compound && target.value ? { restoreFocusTarget: target.value } : {}),
      'onUpdate:open': value => { open.value = value; },
    }, { default: () => h(DrawerPortal, { disabled: !open.value }, {
      default: () => h(DrawerContent, { 'data-retained-panel': '' }, { default: () => [
        compound ? h(DrawerTrigger, { asChild: true }, { default: button }) : button(),
        h('input', { id: 'retained-input' }),
      ] }),
    }) }) });
    app.mount(host); await settle();
  },
  mediaGesture() {
    reset();
    const root = document.createElement('div'); root.style.cssText = 'width:400px;height:160px;touch-action:none';
    root.innerHTML = '<button id="media-button" type="button"><img id="media-image" alt="Open image" style="display:block;width:120px;height:80px" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"></button><button id="media-ordinary" type="button">Ordinary action</button>';
    host.append(root);
    const stats = this.mediaStats = { activations: 0, ordinary: 0, starts: 0, moves: 0, ends: [] };
    root.querySelector('#media-button').onclick = () => { stats.activations++; };
    root.querySelector('#media-ordinary').onclick = () => { stats.ordinary++; };
    const result = connectMediaGesture({ element: root,
      admitPointer: input => !input.protectedOrigin || input.origin.closest('#media-button') !== null,
      onStart() { stats.starts++; return true; }, onMove() { stats.moves++; }, onEnd(reason) { stats.ends.push(reason); },
    });
    if (!result.ok) throw new Error(result.error.message);
    media = result.value;
  },
};
