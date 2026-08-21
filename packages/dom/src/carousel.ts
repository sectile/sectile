import type { Result, StableID } from '@sectile/primitives';
import { createSequence, type Sequence } from '@sectile/primitives/sequence';
import { applyCarouselEvent, createCarouselState, type CarouselCommand, type CarouselEvent, type CarouselPolicies, type CarouselState } from '@sectile/primitives/carousel';
import type { RevisionSnapshot } from '@sectile/primitives/revision';
import { createSemanticController, type SemanticController } from './internal/semantic-controller.js';

export interface CarouselOptions<ID extends StableID = StableID> {
  readonly root: HTMLElement; readonly slides: readonly ID[];
  readonly value?: ID | null; readonly defaultValue?: ID | null;
  readonly paused?: boolean; readonly defaultPaused?: boolean;
  readonly policies?: CarouselPolicies; readonly label?: string;
  readonly previousButton?: HTMLElement; readonly nextButton?: HTMLElement; readonly pauseButton?: HTMLElement;
  readonly getSlideLabel?: (id: ID, index: number, count: number) => string;
  readonly onValueChange?: (value: ID | null) => void; readonly onPausedChange?: (paused: boolean) => void; readonly onAnnounce?: (id: ID) => void; readonly onUpdate?: () => void;
}
export interface CarouselControlledValues<ID extends StableID = StableID> { readonly value?: ID | null; readonly paused?: boolean }
export interface CarouselConnection<ID extends StableID = StableID> { getSnapshot(): RevisionSnapshot<CarouselState<ID>>; syncControlledValues(values: CarouselControlledValues<ID>): Result<RevisionSnapshot<CarouselState<ID>>>; setSlideAttributes(element: HTMLElement, id: ID): void; handleEvent(event: CarouselEvent<ID>): boolean; disconnect(): void }

export function createCarousel<ID extends StableID>(options: CarouselOptions<ID>): Result<CarouselConnection<ID>> {
  const slides = createSequence(options.slides); if (!slides.ok) return slides;
  const valueControlled = options.value !== undefined; const pausedControlled = options.paused !== undefined;
  const runtime = createSemanticController<CarouselState<ID>, CarouselEvent<ID>, CarouselCommand<ID>, CarouselCommand<ID>>({
    initial: createCarouselState(slides.value, options.value !== undefined ? options.value : options.defaultValue ?? options.slides[0] ?? null, options.paused ?? options.defaultPaused ?? false),
    reducer: (state, event) => applyCarouselEvent(slides.value, state, event, options.policies),
    reconcile: (previous, proposed) => createCarouselState(slides.value, valueControlled ? previous.cursor.current : proposed.cursor.current, pausedControlled ? previous.paused : proposed.paused),
    notify: (previous, proposed) => { if (previous.cursor.current !== proposed.cursor.current) options.onValueChange?.(proposed.cursor.current); if (previous.paused !== proposed.paused) options.onPausedChange?.(proposed.paused); },
    toEffect: (command) => command,
  });
  return runtime.ok ? { ok: true, value: new DOMCarousel(options, slides.value, runtime.value, valueControlled, pausedControlled) } : runtime;
}

class DOMCarousel<ID extends StableID> implements CarouselConnection<ID> {
  readonly #options: CarouselOptions<ID>; readonly #slides: Sequence<ID>; readonly #runtime: SemanticController<CarouselState<ID>, CarouselEvent<ID>, CarouselCommand<ID>>; readonly #valueControlled: boolean; readonly #pausedControlled: boolean; readonly #elements = new Map<ID, HTMLElement>();
  readonly #keydown: (event: KeyboardEvent) => void; readonly #previous: () => void; readonly #next: () => void; readonly #pause: () => void;
  public constructor(options: CarouselOptions<ID>, slides: Sequence<ID>, runtime: SemanticController<CarouselState<ID>, CarouselEvent<ID>, CarouselCommand<ID>>, valueControlled: boolean, pausedControlled: boolean) {
    this.#options=options;this.#slides=slides;this.#runtime=runtime;this.#valueControlled=valueControlled;this.#pausedControlled=pausedControlled;
    this.#keydown=(event)=>{const semantic=event.key==='ArrowRight'?'next':event.key==='ArrowLeft'?'previous':event.key==='Home'?'first':event.key==='End'?'last':event.key===' '?'toggle-pause':null;if(semantic!==null){this.handleEvent(semantic);event.preventDefault();}};
    this.#previous=()=>{this.handleEvent('previous')};this.#next=()=>{this.handleEvent('next')};this.#pause=()=>{this.handleEvent('toggle-pause')};
    options.root.addEventListener('keydown',this.#keydown);options.previousButton?.addEventListener('click',this.#previous);options.nextButton?.addEventListener('click',this.#next);options.pauseButton?.addEventListener('click',this.#pause);
    options.root.setAttribute('role','region');options.root.setAttribute('aria-roledescription','carousel');if(options.label!==undefined)options.root.setAttribute('aria-label',options.label);this.#refresh();
  }
  public getSnapshot():RevisionSnapshot<CarouselState<ID>>{return this.#runtime.getSnapshot()}
  public syncControlledValues(values:CarouselControlledValues<ID>):Result<RevisionSnapshot<CarouselState<ID>>>{if(this.#valueControlled!==(values.value!==undefined)||this.#pausedControlled!==(values.paused!==undefined))return{ok:false,error:{class:'construction',code:'controlled-shape-mismatch',message:'Controlled carousel values must preserve their construction-time shape.'}};const state=this.getSnapshot().state;const result=this.#runtime.replace(createCarouselState(this.#slides,this.#valueControlled?values.value as ID|null:state.cursor.current,this.#pausedControlled?values.paused as boolean:state.paused));if(result.ok){this.#refresh();this.#options.onUpdate?.()}return result}
  public setSlideAttributes(element:HTMLElement,id:ID):void{if(this.#slides.contains(id)){this.#elements.set(id,element);this.#refresh()}}
  public handleEvent(event:CarouselEvent<ID>):boolean{const result=this.#runtime.handle(event);if(result.ok){for(const command of result.commands)this.#options.onAnnounce?.(command.id);this.#refresh()}this.#options.onUpdate?.();return true}
  public disconnect():void{this.#options.root.removeEventListener('keydown',this.#keydown);this.#options.previousButton?.removeEventListener('click',this.#previous);this.#options.nextButton?.removeEventListener('click',this.#next);this.#options.pauseButton?.removeEventListener('click',this.#pause);this.#elements.clear()}
  #refresh():void{const state=this.getSnapshot().state;for(const[id,element]of this.#elements){const index=this.#slides.indexOf(id);element.setAttribute('role','group');element.setAttribute('aria-roledescription','slide');if(index!==null)element.setAttribute('aria-label',this.#options.getSlideLabel?.(id,index,this.#slides.size)??`${index+1} of ${this.#slides.size}`);element.hidden=id!==state.cursor.current}if(this.#options.pauseButton!==undefined){this.#options.pauseButton.setAttribute('aria-pressed',String(state.paused));this.#options.pauseButton.setAttribute('aria-label',state.paused?'Resume automatic rotation':'Pause automatic rotation')}}
}
