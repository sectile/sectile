import {
  arrow as arrowMiddleware,
  autoUpdate,
  computePosition,
  flip as flipMiddleware,
  hide as hideMiddleware,
  limitShift as limitShiftMiddleware,
  offset as offsetMiddleware,
  shift as shiftMiddleware,
  size as sizeMiddleware,
  type AutoUpdateOptions,
  type Boundary,
  type ComputePositionConfig,
  type ComputePositionReturn,
  type Middleware,
  type Padding,
  type ReferenceElement,
  type Strategy,
} from '@floating-ui/dom';

export type FloatingSide = 'top' | 'right' | 'bottom' | 'left';
export type FloatingAlign = 'start' | 'center' | 'end';

export interface FloatingPositionOptions {
  readonly root: HTMLElement;
  readonly reference?: ReferenceElement | undefined;
  readonly arrow?: HTMLElement | undefined;
  readonly side?: FloatingSide | undefined;
  readonly align?: FloatingAlign | undefined;
  readonly sideOffset?: number | undefined;
  readonly collisionPadding?: Padding | undefined;
  readonly collisionBoundary?: Boundary | undefined;
  readonly avoidCollisions?: boolean | undefined;
  readonly arrowPadding?: Padding | undefined;
  readonly hideWhenDetached?: boolean | undefined;
  readonly strategy?: Strategy | undefined;
  readonly middleware?: ComputePositionConfig['middleware'] | undefined;
  readonly autoUpdate?: boolean | AutoUpdateOptions | undefined;
  readonly onPositionChange?: ((position: ComputePositionReturn) => void) | undefined;
}

export interface FloatingPositionConnection {
  update(): void;
  disconnect(): void;
}

export function createFloatingPosition(options: FloatingPositionOptions): FloatingPositionConnection {
  let cleanupAutoUpdate: (() => void) | undefined;
  let positionRequest = 0;

  const stopAutoUpdate = (): void => {
    cleanupAutoUpdate?.();
    cleanupAutoUpdate = undefined;
  };
  const compute = async (): Promise<void> => {
    const { reference, root } = options;
    if (root.hidden || reference === undefined || !canPosition(root)) return;
    const request = ++positionRequest;
    const strategy = options.strategy ?? 'fixed';
    root.style.position = strategy;
    let position: ComputePositionReturn;
    try {
      position = await computePosition(reference, root, {
        placement: toPlacement(options.side ?? 'bottom', options.align ?? 'center'),
        strategy,
        middleware: options.middleware ?? defaultMiddleware(options),
      });
    } catch {
      return;
    }
    if (request !== positionRequest || root.hidden) return;
    Object.assign(root.style, { left: `${position.x}px`, top: `${position.y}px` });
    applyPositionData(root, options.arrow, position);
    options.onPositionChange?.(position);
  };
  const update = (): void => {
    if (options.root.hidden || options.reference === undefined || !canPosition(options.root)) {
      stopAutoUpdate();
      return;
    }
    if (options.autoUpdate !== false && cleanupAutoUpdate === undefined) {
      const updateOptions = typeof options.autoUpdate === 'object' ? options.autoUpdate : undefined;
      cleanupAutoUpdate = autoUpdate(options.reference, options.root, () => { void compute(); }, updateOptions);
      return;
    }
    void compute();
  };

  return Object.freeze({
    update,
    disconnect: (): void => {
      stopAutoUpdate();
      positionRequest += 1;
    },
  });
}

function canPosition(root: HTMLElement): boolean {
  return typeof root.getBoundingClientRect === 'function'
    && typeof root.ownerDocument?.defaultView?.getComputedStyle === 'function';
}

function toPlacement(side: FloatingSide, align: FloatingAlign): ComputePositionConfig['placement'] {
  return align === 'center' ? side : `${side}-${align}`;
}

function defaultMiddleware(options: FloatingPositionOptions): Middleware[] {
  const overflow = {
    padding: options.collisionPadding ?? 8,
    ...(options.collisionBoundary === undefined ? {} : { boundary: options.collisionBoundary }),
  };
  const middleware: Middleware[] = [offsetMiddleware(options.sideOffset ?? 8)];
  if (options.avoidCollisions ?? true) {
    middleware.push(
      flipMiddleware({ ...overflow, crossAxis: 'alignment', fallbackAxisSideDirection: 'end' }),
      shiftMiddleware({ ...overflow, crossAxis: true, limiter: limitShiftMiddleware() }),
      sizeMiddleware({
        ...overflow,
        apply: ({ availableHeight, availableWidth, elements, rects }) => {
          elements.floating.style.setProperty('--sectile-floating-available-width', `${Math.max(0, availableWidth)}px`);
          elements.floating.style.setProperty('--sectile-floating-available-height', `${Math.max(0, availableHeight)}px`);
          elements.floating.style.setProperty('--sectile-floating-anchor-width', `${rects.reference.width}px`);
          elements.floating.style.setProperty('--sectile-floating-anchor-height', `${rects.reference.height}px`);
          elements.floating.style.setProperty('--sectile-popover-available-width', `${Math.max(0, availableWidth)}px`);
          elements.floating.style.setProperty('--sectile-popover-available-height', `${Math.max(0, availableHeight)}px`);
          elements.floating.style.setProperty('--sectile-popover-anchor-width', `${rects.reference.width}px`);
          elements.floating.style.setProperty('--sectile-popover-anchor-height', `${rects.reference.height}px`);
        },
      }),
    );
  }
  if (options.arrow !== undefined) middleware.push(arrowMiddleware({ element: options.arrow, padding: options.arrowPadding ?? 8 }));
  if (options.hideWhenDetached ?? true) middleware.push(hideMiddleware({ ...overflow, strategy: 'referenceHidden' }));
  return middleware;
}

function applyPositionData(root: HTMLElement, arrow: HTMLElement | undefined, position: ComputePositionReturn): void {
  const [side, placementAlign] = position.placement.split('-') as [FloatingSide, FloatingAlign | undefined];
  root.dataset['side'] = side;
  root.dataset['align'] = placementAlign ?? 'center';
  root.dataset['placement'] = position.placement;
  const referenceHidden = position.middlewareData['hide']?.['referenceHidden'] === true;
  root.dataset['referenceHidden'] = String(referenceHidden);
  root.style.visibility = referenceHidden ? 'hidden' : '';
  if (arrow === undefined) return;
  const arrowData = position.middlewareData['arrow'];
  arrow.dataset['side'] = side;
  arrow.style.left = typeof arrowData?.['x'] === 'number' ? `${arrowData['x']}px` : '';
  arrow.style.top = typeof arrowData?.['y'] === 'number' ? `${arrowData['y']}px` : '';
  arrow.dataset['centerOffset'] = String(arrowData?.['centerOffset'] ?? 0);
}
