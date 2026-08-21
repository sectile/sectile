import { createSlider } from '@sectile/dom/slider';
import { unwrap } from '@sectile/primitives/result';
import { effectLabels, eventLabel, type DemoDefinition } from '../playground.js';

export const sliderDemo: DemoDefinition = {
  id: 'slider',
  label: 'Slider',
  title: 'Deployment traffic',
  description: 'Adjust a quantized range with step, page, and edge navigation.',
  shortcuts: [
    { keys: ['←', '→'], label: 'step' },
    { keys: ['Page Up', 'Page Down'], label: 'page' },
    { keys: ['Home', 'End'], label: 'edge' },
  ],
  mount(context) {
    const root = document.createElement('div');
    root.className = 'slider-control';
    const value = document.createElement('strong');
    value.className = 'slider-value';
    const track = document.createElement('div');
    track.className = 'slider-track';
    const fill = document.createElement('span');
    const thumb = document.createElement('span');
    thumb.className = 'slider-thumb';
    track.append(fill, thumb);
    const scale = document.createElement('div');
    scale.className = 'slider-scale';
    scale.innerHTML = '<span>0%</span><span>50%</span><span>100%</span>';
    root.append(value, track, scale);
    context.surface.append(root);

    const connection = unwrap(createSlider({
      min: '0',
      max: '100',
      step: '5',
      page: 4,
      defaultValue: 8,
      root,
      track,
      label: 'Deployment traffic percentage',
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
      const percentage = Number(connection.getValue());
      value.textContent = `${percentage}%`;
      fill.style.width = `${percentage}%`;
      thumb.style.left = `${percentage}%`;
      context.showState(revision, { tick: state.tick, value: connection.getValue() });
    }

    render();
    return { focus: () => root.focus(), disconnect: () => connection.disconnect() };
  },
};
