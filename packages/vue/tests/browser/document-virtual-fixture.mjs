import { createVirtualizer } from '@sectile/dom/virtual';

export async function runDocumentVirtualScenarios() {
  const previousBehavior = document.documentElement.style.scrollBehavior;
  const nativeScrollTo = window.scrollTo.bind(window);
  const writes = [];
  let rectReads = 0;
  let queries = 0;
  let publications = 0;
  let targetY = 0;
  let placementY = 0;
  const host = document.createElement('div');
  const before = document.createElement('div');
  const surface = document.createElement('div');
  const after = document.createElement('div');
  before.style.height = '720px';
  surface.style.height = '2600px';
  surface.style.position = 'relative';
  after.style.height = '900px';
  host.style.minHeight = '5000px';
  host.append(before, surface, after);
  document.body.append(host);

  const nativeRect = surface.getBoundingClientRect.bind(surface);
  surface.getBoundingClientRect = () => {
    rectReads += 1;
    return nativeRect();
  };
  window.scrollTo = (optionsOrX, y) => {
    const options = typeof optionsOrX === 'number'
      ? { left: optionsOrX, top: y ?? window.scrollY }
      : optionsOrX;
    writes.push({
      left: options.left ?? window.scrollX,
      top: options.top ?? window.scrollY,
      behavior: options.behavior ?? 'auto',
    });
    return typeof optionsOrX === 'number'
      ? nativeScrollTo(optionsOrX, y ?? window.scrollY)
      : nativeScrollTo(optionsOrX);
  };
  document.documentElement.style.scrollBehavior = 'smooth';

  const state = Object.freeze({ generation: 0 });
  const strategy = Object.freeze({
    kind: 'browser-document-host',
    tryQuery: (current, input) => {
      queries += 1;
      return { ok: true, value: browserPlan(current, input.viewport, placementY) };
    },
    tryMeasure: (current, batch) => ({
      ok: true,
      value: Object.freeze({
        state: Object.freeze({ generation: current.generation + 1 }),
        scrollDelta: Object.freeze({ x: 0, y: Number(batch.measurements[0] ?? 0) }),
      }),
    }),
    tryMutate: (current) => ({
      ok: true,
      value: Object.freeze({ state: current, scrollDelta: Object.freeze({ x: 0, y: 0 }) }),
    }),
    tryScrollTarget: () => ({ ok: true, value: Object.freeze({ x: 0, y: targetY }) }),
  });

  try {
    nativeScrollTo({ left: 0, top: 360.5, behavior: 'instant' });
    await nextFrame();
    const surfacePageY = nativeRect().top + window.scrollY;
    const connection = createVirtualizer({
      scrollport: document,
      surface,
      state,
      strategy,
      viewportInsets: { top: 24 },
      onPlanChange: () => { publications += 1; },
    });
    const expectedInitialY = window.scrollY - surfacePageY + 24;
    const initialCorrect = closeTo(connection.getPlan().viewport.y, expectedInitialY);
    // Consume the initial ResizeObserver delivery before measuring ordinary-scroll work.
    await nextFrame();
    await nextFrame();

    rectReads = 0;
    queries = 0;
    publications = 0;
    writes.length = 0;
    nativeScrollTo({ left: 0, top: window.scrollY + 120.25, behavior: 'instant' });
    await nextFrame();
    await nextFrame();
    const ordinaryScroll = Object.freeze({
      zeroRectReads: rectReads === 0,
      oneQuery: queries === 1,
      onePublication: publications === 1,
      noSectileWrite: writes.length === 0,
    });

    const anchorProbe = document.createElement('div');
    anchorProbe.style.position = 'absolute';
    anchorProbe.style.width = '40px';
    anchorProbe.style.height = '40px';
    placementY = 1000;
    anchorProbe.style.transform = `translate3d(0, ${placementY}px, 0)`;
    surface.append(anchorProbe);
    nativeScrollTo({ left: 0, top: surfacePageY + 900, behavior: 'instant' });
    await nextFrame();
    await nextFrame();
    const beforeAnchorOffset = connection.getPlan().anchor?.viewportOffset.y ?? null;
    const beforeNativeAnchorScroll = window.scrollY;
    placementY += 24;
    anchorProbe.style.transform = `translate3d(0, ${placementY}px, 0)`;
    anchorProbe.getBoundingClientRect();
    await nextFrame();
    await nextFrame();
    const nativeAnchorDelta = window.scrollY - beforeNativeAnchorScroll;
    writes.length = 0;
    const anchorMeasure = connection.measure([24]);
    const afterAnchorOffset = connection.getPlan().anchor?.viewportOffset.y ?? null;
    const nativeAnchorInteraction = anchorMeasure.ok
      && beforeAnchorOffset !== null
      && afterAnchorOffset !== null
      && closeTo(afterAnchorOffset, beforeAnchorOffset)
      && writes.length === 1
      && writes[0]?.behavior === 'instant';
    const writesAfterAnchorCorrection = writes.length;
    await nextFrame();
    await nextFrame();
    const nativeAnchorNoFeedback = writes.length === writesAfterAnchorCorrection;
    anchorProbe.remove();

    targetY = 1_000_000;
    writes.length = 0;
    const targetResult = connection.scrollTo('item', 'start');
    const settledY = window.scrollY;
    const immediateSettlement = targetResult.ok
      && closeTo(targetResult.value.y, settledY)
      && writes.length === 1
      && writes[0]?.behavior === 'instant';
    const clampedByBrowser = targetResult.ok && settledY < surfacePageY + targetY;
    const writesAfterTarget = writes.length;
    await nextFrame();
    await nextFrame();
    const noFeedbackWrite = writes.length === writesAfterTarget;

    // Move away from the native maximum before testing a positive correction.
    nativeScrollTo({ left: 0, top: Math.min(200, settledY / 2), behavior: 'instant' });
    await nextFrame();
    await nextFrame();
    writes.length = 0;
    const beforeCorrection = window.scrollY;
    const measured = connection.measure([12.5]);
    const settledCorrectionY = window.scrollY;
    const expectedCorrectionViewportY = settledCorrectionY - surfacePageY + 24;
    const correctionSettled = measured.ok
      && settledCorrectionY >= beforeCorrection
      && closeTo(connection.getPlan().viewport.y, expectedCorrectionViewportY)
      && writes.length === 1
      && writes[0]?.behavior === 'instant';
    const writesAfterCorrection = writes.length;
    await nextFrame();
    await nextFrame();
    const correctionNoFeedback = writes.length === writesAfterCorrection;

    connection.disconnect();
    return Object.freeze({
      ok: initialCorrect
        && Object.values(ordinaryScroll).every(Boolean)
        && nativeAnchorInteraction
        && nativeAnchorNoFeedback
        && immediateSettlement
        && clampedByBrowser
        && noFeedbackWrite
        && correctionSettled
        && correctionNoFeedback,
      initialCorrect,
      ordinaryScroll,
      nativeAnchorInteraction,
      nativeAnchorNoFeedback,
      nativeAnchorDelta,
      beforeAnchorOffset,
      afterAnchorOffset,
      anchorMeasureOK: anchorMeasure.ok,
      anchorWrites: Object.freeze([...writes]),
      immediateSettlement,
      clampedByBrowser,
      noFeedbackWrite,
      correctionSettled,
      correctionNoFeedback,
      settledY,
    });
  } finally {
    window.scrollTo = nativeScrollTo;
    document.documentElement.style.scrollBehavior = previousBehavior;
    host.remove();
    nativeScrollTo({ left: 0, top: 0, behavior: 'instant' });
  }
}

function browserPlan(state, viewport, placementY) {
  const placement = Object.freeze({
    id: 'item',
    index: 0,
    rect: Object.freeze({ x: 0, y: placementY, width: 100, height: 40 }),
    visible: viewport.y < placementY + 40 && viewport.y + viewport.height > placementY,
  });
  return Object.freeze({
    generation: state.generation,
    contentSize: Object.freeze({ width: 100, height: 2600 }),
    viewport: Object.freeze({ ...viewport }),
    renderBounds: Object.freeze({ ...viewport }),
    placements: Object.freeze([placement]),
    anchor: placement.visible
      ? Object.freeze({
          id: placement.id,
          viewportOffset: Object.freeze({
            x: placement.rect.x - viewport.x,
            y: placement.rect.y - viewport.y,
          }),
        })
      : null,
  });
}

function closeTo(left, right) {
  return Math.abs(left - right) < 0.01;
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
