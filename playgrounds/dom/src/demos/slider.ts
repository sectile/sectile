import { createMultiThumbSlider } from '@sectile/dom/multi-thumb-slider';
import { createSlider } from '@sectile/dom/slider';
import type { StableID } from '@sectile/primitives';
import { unwrap } from '@sectile/primitives/result';
import { effectLabels, eventLabel, type DemoContext, type DemoDefinition, type DemoSession } from '../playground.js';

export const sliderDemo: DemoDefinition = {
  id: 'slider',
  label: 'Slider',
  title: 'Slider',
  description: 'Single-value and multi-thumb cases, each with its own state and event trace.',
  shortcuts: [
    { keys: ['←', '→'], label: 'adjust focused handle' },
    { keys: ['Home', 'End'], label: 'range edge' },
    { keys: ['Tab'], label: 'move between handles' },
  ],
  cases: [
    {
      id: 'single-value',
      title: 'Deployment traffic',
      mount: (context) => mountSingleSlider(context, {
        description: 'One horizontal handle chooses a deployment percentage.',
        min: '0', max: '100', step: '5', defaultValue: 8,
        scale: ['0%', '50%', '100%'], label: 'Deployment traffic percentage',
        format: (value) => `${value}%`,
      }),
    },
    {
      id: 'vertical-value',
      title: 'Vertical temperature',
      mount: (context) => mountSingleSlider(context, {
        description: 'The same range semantics projected on a vertical axis.',
        min: '-10', max: '30', step: '5', defaultValue: 4, orientation: 'vertical',
        scale: ['30°', '10°', '−10°'], label: 'Temperature',
        format: (value) => `${value}°`,
      }),
    },
    {
      id: 'controlled-value',
      title: 'Controlled volume',
      mount: (context) => mountSingleSlider(context, {
        description: 'The application accepts each proposed value and synchronizes it back.',
        min: '0', max: '10', step: '1', defaultValue: 6, controlled: true,
        scale: ['Mute', 'Half', 'Full'], label: 'Volume',
        format: (value) => `${Number(value) * 10}%`,
      }),
    },
  ],
};

export const multiThumbSliderDemo: DemoDefinition = {
  id: 'multi-thumb-slider',
  label: 'Multi-thumb slider',
  title: 'Multi-thumb slider',
  description: 'Bounded, multi-threshold, crossing, and controlled ranges.',
  shortcuts: [
    { keys: ['←', '→'], label: 'adjust focused handle' },
    { keys: ['Home', 'End'], label: 'constrained edge' },
    { keys: ['Tab'], label: 'move between handles' },
  ],
  cases: [
    {
      id: 'two-thumb-range',
      title: 'Price range',
      mount: (context) => mountMultiThumbSlider(context, {
        description: 'Two handles select a bounded interval with at least $10 between them.',
        ids: ['minimum', 'maximum'],
        labels: ['Minimum price', 'Maximum price'],
        defaultValues: [20, 80],
        minGap: 10,
        scale: ['$0', '$50', '$100'],
        format: (values) => `$${values[0]} – $${values[1]}`,
      }),
    },
    {
      id: 'three-thumb-thresholds',
      title: 'Alert thresholds',
      mount: (context) => mountMultiThumbSlider(context, {
        description: 'Three handles define warning bands while preserving their order.',
        ids: ['low', 'medium', 'high'],
        labels: ['Low threshold', 'Medium threshold', 'High threshold'],
        defaultValues: [20, 50, 80],
        minGap: 10,
        scale: ['Quiet', 'Watch', 'Critical'],
        format: (values) => values.join(' / '),
      }),
    },
    {
      id: 'crossing-thumbs',
      title: 'Crossing markers',
      mount: (context) => mountMultiThumbSlider(context, {
        description: 'Independent markers may cross when ordering is not meaningful.',
        ids: ['forecast', 'actual'], labels: ['Forecast', 'Actual'],
        defaultValues: [35, 65], minGap: 0, allowCross: true,
        scale: ['0', '50', '100'], format: (values) => `Forecast ${values[0]} · Actual ${values[1]}`,
      }),
    },
    {
      id: 'controlled-range',
      title: 'Controlled budget',
      mount: (context) => mountMultiThumbSlider(context, {
        description: 'The application accepts and synchronizes each proposed interval.',
        ids: ['minimum', 'maximum'], labels: ['Minimum budget', 'Maximum budget'],
        defaultValues: [25, 75], minGap: 5, controlled: true,
        scale: ['$0', '$50k', '$100k'], format: (values) => `$${values[0]}k – $${values[1]}k`,
      }),
    },
  ],
};

function mountSingleSlider(context: DemoContext, options: {
  readonly description: string;
  readonly min: string;
  readonly max: string;
  readonly step: string;
  readonly defaultValue: number;
  readonly scale: readonly string[];
  readonly label: string;
  readonly format: (value: string) => string;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly controlled?: boolean;
}): DemoSession {
  const elements = createSliderSurface(
    options.description,
    options.scale,
  );
  if (options.orientation === 'vertical') elements.root.classList.add('vertical-slider');
  const thumb = createThumb();
  elements.track.append(elements.fill, thumb);
  context.surface.append(elements.root);

  let externalValue = options.defaultValue;
  const connection = unwrap(createSlider({
    min: options.min,
    max: options.max,
    step: options.step,
    page: 4,
    ...(options.controlled ? {
      value: externalValue,
      onValueChange: ({ value }) => {
        externalValue = value;
        queueMicrotask(() => connection.syncControlledValues({ value: externalValue }));
      },
    } : { defaultValue: options.defaultValue }),
    root: thumb,
    track: elements.track,
    label: options.label,
    ...(options.orientation === undefined ? {} : { orientation: options.orientation }),
    formatValue: options.format,
    onTransition: ({ event, result }) => context.record({
      revision: result.snapshot.revision,
      event: eventLabel(event),
      accepted: result.ok,
      effects: effectLabels(result.commands),
    }),
    onUpdate: render,
  }));

  function render(): void {
    const { revision, state } = connection.getSnapshot();
    const percentage = connection.range.count === 0 ? 0 : state.tick / connection.range.count * 100;
    const value = connection.getValue();
    elements.output.textContent = options.format(value);
    if (options.orientation === 'vertical') {
      elements.fill.style.height = `${percentage}%`;
      thumb.style.bottom = `${percentage}%`;
    } else {
      elements.fill.style.left = '0%';
      elements.fill.style.width = `${percentage}%`;
      thumb.style.left = `${percentage}%`;
    }
    context.showState(revision, { tick: state.tick, value, orientation: options.orientation ?? 'horizontal', ownership: options.controlled ? 'controlled' : 'uncontrolled' });
  }

  render();
  return { focus: () => thumb.focus(), disconnect: () => connection.disconnect() };
}

function mountMultiThumbSlider<ID extends StableID>(context: DemoContext, options: {
  readonly description: string;
  readonly ids: readonly ID[];
  readonly labels: readonly string[];
  readonly defaultValues: readonly number[];
  readonly minGap: number;
  readonly allowCross?: boolean;
  readonly controlled?: boolean;
  readonly scale: readonly string[];
  readonly format: (values: readonly number[]) => string;
}): DemoSession {
  const elements = createSliderSurface(options.description, options.scale);
  elements.root.classList.add('multi-thumb-slider');
  elements.track.append(elements.fill);
  const thumbs = new Map<ID, HTMLElement>();
  for (const [index, id] of options.ids.entries()) {
    const thumb = createThumb();
    thumb.setAttribute('aria-label', options.labels[index] ?? String(id));
    elements.track.append(thumb);
    thumbs.set(id, thumb);
  }
  context.surface.append(elements.root);

  let previousTicks = [...options.defaultValues];
  let previousCursor: ID | null = options.ids[0] ?? null;
  let externalValues = [...options.defaultValues];
  const connection = unwrap(createMultiThumbSlider({
    root: elements.root,
    track: elements.track,
    thumbs: options.ids,
    min: '0',
    max: '100',
    step: '1',
    ...(options.controlled ? {
      values: externalValues,
      onValuesChange: (values) => {
        externalValues = [...values];
        queueMicrotask(() => connection.syncControlledValues({ values: externalValues }));
      },
    } : { defaultValues: options.defaultValues }),
    policies: {
      minGap: options.minGap,
      ...(options.allowCross === undefined ? {} : { allowCross: options.allowCross }),
    },
    label: options.description,
    getThumbLabel: (id) => options.labels[options.ids.indexOf(id)] ?? String(id),
    onUpdate: () => {
      const snapshot = connection.getSnapshot();
      const changedIndex = snapshot.state.ticks.findIndex((tick, index) => tick !== previousTicks[index]);
      const focused = snapshot.state.cursor.current;
      const changedID = changedIndex < 0 ? null : options.ids[changedIndex] ?? null;
      context.record({
        revision: snapshot.revision,
        event: changedID === null ? 'focus-thumb' : 'set-thumb',
        accepted: true,
        effects: changedID === null
          ? focused === previousCursor ? [] : [`focus id=${String(focused)}`]
          : [`set-range-value id=${String(changedID)} value=${String(snapshot.state.ticks[changedIndex])}`],
      });
      previousTicks = [...snapshot.state.ticks];
      previousCursor = focused;
      render();
    },
  }));
  for (const [id, thumb] of thumbs) connection.setThumbAttributes(thumb, id);

  function render(): void {
    const { revision, state } = connection.getSnapshot();
    elements.output.textContent = options.format(state.ticks);
    const first = Math.min(...state.ticks);
    const last = Math.max(...state.ticks);
    elements.fill.style.left = `${first}%`;
    elements.fill.style.width = `${last - first}%`;
    for (const [index, [id, thumb]] of [...thumbs].entries()) {
      const value = state.ticks[index] ?? 0;
      thumb.style.left = `${value}%`;
      thumb.dataset['active'] = String(state.cursor.current === id);
      thumb.setAttribute('aria-valuetext', String(value));
    }
    context.showState(revision, { values: connection.getValues(), activeThumb: state.cursor.current, crossing: options.allowCross ?? false, ownership: options.controlled ? 'controlled' : 'uncontrolled' });
  }

  render();
  return {
    focus: () => thumbs.values().next().value?.focus(),
    disconnect: () => connection.disconnect(),
  };
}

function createSliderSurface(
  descriptionText: string,
  scaleLabels: readonly string[],
): {
  readonly root: HTMLElement;
  readonly output: HTMLOutputElement;
  readonly track: HTMLElement;
  readonly fill: HTMLElement;
} {
  const root = document.createElement('div');
  root.className = 'slider-control';
  const summary = document.createElement('div');
  summary.className = 'slider-summary';
  const description = document.createElement('p');
  description.textContent = descriptionText;
  const output = document.createElement('output');
  output.className = 'slider-value';
  summary.append(description, output);

  const track = document.createElement('div');
  track.className = 'slider-track';
  const fill = document.createElement('span');
  fill.className = 'slider-track-fill';
  const scale = document.createElement('div');
  scale.className = 'slider-scale';
  scale.append(...scaleLabels.map((label) => {
    const marker = document.createElement('span');
    marker.textContent = label;
    return marker;
  }));
  root.append(summary, track, scale);
  return { root, output, track, fill };
}

function createThumb(): HTMLElement {
  const thumb = document.createElement('span');
  thumb.className = 'slider-thumb';
  return thumb;
}
