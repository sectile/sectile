// Browser-driven keyboard/IME witnesses. The runner supplies native input.
import { createApp, h, nextTick, ref } from 'vue';
import { DialogRoot, DialogTrigger, DialogContent, DialogClose, DialogPortal } from '../../.verification-dist/overlay/dialog.js';
import { DrawerRoot, DrawerTrigger, DrawerContent, DrawerPortal } from '../../.verification-dist/overlay/drawer.js';
import { TextField } from '../../.verification-dist/text.js';
import { ComboboxRoot, ComboboxInput } from '../../.verification-dist/combobox.js';
import { NumberField } from '../../.verification-dist/number-field.js';
import { SpinButtonRoot, SpinButtonInput } from '../../.verification-dist/spin-button.js';
import { createPopover } from '@sectile/dom/popover';
import { createCarousel } from '@sectile/dom/carousel';
import { connectMediaGesture } from '@sectile/dom/media-gesture';
import { SequenceReorderRoot, SequenceReorderItem } from '../../.verification-dist/reorder.js';
import { TagsInputRoot, TagsInputInput } from '../../.verification-dist/tags-input.js';
import { PinInputRoot, PinInputInput } from '../../.verification-dist/pin-input.js';
import { EditableRoot, EditableInput, EditablePreview, EditableEditTrigger } from '../../.verification-dist/editable.js';
import { ColorPickerRoot, ColorPickerTextInput } from '../../.verification-dist/color-picker.js';
import { QuantityFieldRoot, QuantityFieldInput, createStandardQuantityPolicies } from '../../.verification-dist/quantity-field.js';
import { DateField } from '../../.verification-dist/temporal/date-field.js';
import { TimeField } from '../../.verification-dist/temporal/time-field.js';
import { DateTimeField } from '../../.verification-dist/temporal/date-time-field.js';
import { DateRangeFieldRoot, DateRangeFieldStartInput, DateRangeFieldEndInput } from '../../.verification-dist/temporal/date-range-field.js';
import { TimeRangeFieldRoot, TimeRangeFieldStartInput, TimeRangeFieldEndInput } from '../../.verification-dist/temporal/time-range-field.js';
import { DatePickerRoot, DatePickerInput } from '../../.verification-dist/temporal/date-picker.js';
import { TreeGridRoot, TreeGridRow, TreeGridCell, TreeGridEditor } from '../../.verification-dist/tree-grid.js';
import { useDataGrid, createDataGridComponents } from '../../.verification-dist/tabular/data-grid.js';

const host = document.querySelector('#probe');
const style = document.createElement('style');
style.textContent = '[data-probe-panel]{opacity:1;transition:opacity 600ms linear}[data-probe-panel][data-state=closed]{opacity:0}';
document.head.append(style);
let app, media;
const settle = async () => { await nextTick(); await nextTick(); };
const reset = () => { media?.disconnect(); media = undefined; app?.unmount(); app = undefined; host.replaceChildren(); composing.clear(); };
const events = [], writes = [], valueWrites = [];
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
prototype.setSelectionRange=function(...args){if(valueWrites.length<1000)valueWrites.push({id:this.id,selection:args});return selection.apply(this,args);};
Object.defineProperty(prototype, 'value', { ...value, set(next) {
  if(valueWrites.length<1000)valueWrites.push({id:this.id,before:value.get.call(this),value:next,composing:composing.has(this)});
  if (composing.has(this)) writes.push({ id: this.id, value: next });
  value.set.call(this, next);
} });
}

window.sectileProbe = {
  events, writes, valueWrites,
  inputFamilies: ['native','native-textarea','text','combo','text-uncontrolled','textarea','text-representation','combo-uncontrolled','number','quantity',
    'date','time','datetime','date-start','date-end','time-start','time-end','picker','tags','spin','editable','pin','color','treegrid','tabular-editor','tabular-filter'],
  async reference(id) {
    await this.field(id);
    const source=document.getElementById(id),reference=source.cloneNode(false);reference.id='native-reference';
    reset();document.body.append(reference);
  },
  async field(id) {
    if (['native','text','combo'].includes(id)) { await this.native(); this.reconfigure=this.changeItems; return; }
    reset();events.length=0;writes.length=0;
    const value=ref(''), config=ref({label:'Input'}), multiline=ref(false), tags=ref([]);let render, grid;
    const update=next=>{value.value=next;}, input=part=>h(part,{id});
    const compound=(Root,Input,props={})=>()=>h(Root,{...props,...config.value},{default:()=>input(Input)});
    if(id==='native-textarea')render=()=>h('textarea',{id});
    else if(id.startsWith('text')||id==='textarea') render=()=>h(TextField,{id,...config.value,
      ...(id==='text-uncontrolled'?{defaultValue:''}:{modelValue:value.value,'onUpdate:modelValue':update}),
      multiline:id==='textarea'||multiline.value});
    else if(id==='combo-uncontrolled') render=compound(ComboboxRoot,ComboboxInput,{items:[]});
    else if(id==='number') render=()=>h(NumberField,{id,...config.value,modelValue:value.value||null,'onUpdate:modelValue':update});
    else if(id==='quantity') render=compound(QuantityFieldRoot,QuantityFieldInput,{policies:createStandardQuantityPolicies('metre')});
    else if(['date','time','datetime'].includes(id)) render=()=>h({date:DateField,time:TimeField,datetime:DateTimeField}[id],{id,...config.value});
    else if(id.startsWith('date-')) render=compound(DateRangeFieldRoot,id==='date-start'?DateRangeFieldStartInput:DateRangeFieldEndInput);
    else if(id.startsWith('time-')) render=compound(TimeRangeFieldRoot,id==='time-start'?TimeRangeFieldStartInput:TimeRangeFieldEndInput);
    else if(id==='picker') render=compound(DatePickerRoot,DatePickerInput,{position:false});
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
    const target=host.querySelector('input:not([type=hidden]),textarea');if(target)target.id=id;
    this.reconfigure=()=>{config.value={label:'Changed label'};if(id==='text-representation')multiline.value=true;};
    this.nativeState=()=>({value:value.value,tags:tags.value});
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
