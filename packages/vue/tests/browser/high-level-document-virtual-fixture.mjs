import { masonryRectAt } from '@sectile/virtual/masonry-layout';
import { createApp, h, nextTick, ref } from 'vue';
import { VirtualMasonry } from '../../.verification-dist/virtual-masonry.js';

export async function runHighLevelDocumentVirtualScenarios() {
  const previousBehavior = document.documentElement.style.scrollBehavior;
  const nativeScrollTo = window.scrollTo.bind(window);
  const writes = [];
  const host = document.createElement('div');
  const before = document.createElement('div');
  const mount = document.createElement('div');
  const after = document.createElement('div');
  const occluder = document.createElement('div');
  before.style.height = '720px';
  after.style.height = '900px';
  occluder.style.position = 'fixed';
  occluder.style.inset = '0 0 auto 0';
  occluder.style.height = '48px';
  occluder.style.pointerEvents = 'none';
  host.append(before, mount, after);
  document.body.append(host, occluder);

  const items = ref(Array.from({ length: 80 }, (_, id) => Object.freeze({ id })));
  const heights = ref(Array.from({ length: 80 }, () => 120));
  const masonry = ref();
  const app = createApp({
    render: () => h(VirtualMasonry, {
      ref: masonry,
      scrollport: 'document',
      items: items.value,
      getID: (value) => value.id,
      sizePolicy: { kind: 'measured' },
      lanePolicy: { kind: 'responsive', minExtent: 160, maxCount: 4, gap: 12 },
      placementPolicy: 'round-robin',
      itemGap: 12,
      overscan: 360,
      viewportInsets: { top: 48 },
      initialViewport: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
      itemAttributes: (value) => ({ 'data-browser-masonry-item': String(value.id) }),
    }, {
      item: ({ id }) => h('article', {
        style: {
          boxSizing: 'border-box',
          height: `${heights.value[id]}px`,
          border: '1px solid transparent',
        },
      }, String(id)),
    }),
  });

  window.scrollTo = (optionsOrX, y) => {
    const options = typeof optionsOrX === 'number'
      ? { left: optionsOrX, top: y ?? window.scrollY }
      : optionsOrX;
    writes.push(Object.freeze({
      left: options.left ?? window.scrollX,
      top: options.top ?? window.scrollY,
      behavior: options.behavior ?? 'auto',
    }));
    return typeof optionsOrX === 'number'
      ? nativeScrollTo(optionsOrX, y ?? window.scrollY)
      : nativeScrollTo(optionsOrX);
  };
  document.documentElement.style.scrollBehavior = 'smooth';

  try {
    nativeScrollTo({ left: 0, top: 360.5, behavior: 'instant' });
    await nextFrame();
    app.mount(mount);
    await settleVueAndFrames(6);

    const root = mount.querySelector('[data-virtual-layout="virtual-masonry"][data-part="root"]');
    const surface = root?.querySelector('[data-part="surface"]');
    if (!(root instanceof HTMLElement) || !(surface instanceof HTMLElement) || masonry.value === undefined) {
      return Object.freeze({ ok: false, mounted: false });
    }
    const surfacePageY = surface.getBoundingClientRect().top + window.scrollY;
    const initialViewportY = window.scrollY - surfacePageY + 48;
    const restoredInitialScroll = window.scrollY > 0
      && closeTo(masonry.value.plan.viewport.y, initialViewportY);
    const belowOrdinaryFlow = surfacePageY >= 700;
    const noNestedScrollport = root.style.overflow !== 'auto' && root.scrollTop === 0;
    const resolvedDocument = masonry.value.scrollport.value === document;

    nativeScrollTo({ left: 0, top: surfacePageY + 180, behavior: 'instant' });
    await settleVueAndFrames(4);
    const firstViewportY = masonry.value.plan.viewport.y;
    const firstIDs = masonry.value.plan.placements.map(({ id }) => id).join(',');
    nativeScrollTo({ left: 0, top: window.scrollY + 520.25, behavior: 'instant' });
    await settleVueAndFrames(4);
    const secondIDs = masonry.value.plan.placements.map(({ id }) => id).join(',');
    const documentWindowing = masonry.value.plan.viewport.y > firstViewportY + 500
      && secondIDs !== firstIDs;
    const insetProjection = closeTo(
      masonry.value.plan.viewport.y,
      window.scrollY - surfacePageY + 48,
    );

    writes.length = 0;
    const target = masonry.value.scrollToID(40, 'start');
    const targetSettledY = window.scrollY;
    const scrollToSettlesImmediately = target.ok
      && closeTo(target.value.y, targetSettledY)
      && writes.length === 1
      && writes[0]?.behavior === 'instant';
    const scrollToTrace = [];
    const scrollToQuiesced = await settleMasonry(masonry, scrollToTrace);
    writes.length = 0;
    await settleVueAndFrames(2);
    const scrollToHasNoFeedback = scrollToQuiesced && writes.length === 0;

    const anchor = masonry.value.plan.anchor;
    const anchorPlacement = anchor === null
      ? undefined
      : masonry.value.plan.placements.find(({ id }) => id === anchor.id);
    const above = anchorPlacement === undefined
      ? undefined
      : masonry.value.plan.placements
          .filter((placement) => placement.lane === anchorPlacement.lane
            && placement.rect.y < anchorPlacement.rect.y)
          .sort((left, right) => right.rect.y - left.rect.y)[0];
    let measuredAnchorPreserved = false;
    let measuredAnchorNoFeedback = false;
    let anchorEvidence = {};
    if (anchor !== null && anchorPlacement !== undefined && above !== undefined) {
      const anchorID = anchor.id;
      const beforeOffset = anchorPlacement.rect.y - masonry.value.plan.viewport.y;
      const beforeStateRect = masonryRectAt(masonry.value.state, anchorID);
      const growthScrollBefore = window.scrollY;
      writes.length = 0;
      const grown = [...heights.value];
      grown[above.id] += 48;
      heights.value = grown;
      const growthQuiesced = await settleMasonry(masonry);
      const afterGrowthPlacement = masonry.value.plan.placements.find(({ id }) => id === anchorID);
      const afterGrowthOffset = afterGrowthPlacement === undefined
        ? null
        : afterGrowthPlacement.rect.y - masonry.value.plan.viewport.y;
      const afterGrowthStateRect = masonryRectAt(masonry.value.state, anchorID);
      const growthPortableDelta = beforeStateRect === null || afterGrowthStateRect === null
        ? null
        : afterGrowthStateRect.y - beforeStateRect.y;
      const growthPreserved = growthQuiesced
        && afterGrowthOffset !== null
        && closeTo(afterGrowthOffset, beforeOffset)
        && writes.length <= 1
        && writes.every(({ behavior }) => behavior === 'instant');
      const growthWrites = writes.length;
      const growthWrite = writes[0] ?? null;
      const growthScrollAfter = window.scrollY;
      await settleVueAndFrames(2);
      const growthNoFeedback = writes.length === growthWrites;

      const shrinkAnchor = masonry.value.plan.anchor;
      const shrinkAnchorPlacement = shrinkAnchor === null
        ? undefined
        : masonry.value.plan.placements.find(({ id }) => id === shrinkAnchor.id);
      const shrinkAbove = shrinkAnchorPlacement === undefined
        ? undefined
        : masonry.value.plan.placements
            .filter((placement) => placement.lane === shrinkAnchorPlacement.lane
              && placement.rect.y < shrinkAnchorPlacement.rect.y)
            .sort((left, right) => right.rect.y - left.rect.y)[0];
      let shrinkPreserved = false;
      let shrinkNoFeedback = false;
      let shrinkBeforeOffset = null;
      let afterShrinkOffset = null;
      let shrinkWrites = 0;
      if (shrinkAnchor !== null && shrinkAnchorPlacement !== undefined && shrinkAbove !== undefined) {
        shrinkBeforeOffset = shrinkAnchorPlacement.rect.y - masonry.value.plan.viewport.y;
        writes.length = 0;
        const shrunk = [...heights.value];
        shrunk[shrinkAbove.id] = Math.max(24, shrunk[shrinkAbove.id] - 32);
        heights.value = shrunk;
        const shrinkQuiesced = await settleMasonry(masonry);
        const afterShrinkPlacement = masonry.value.plan.placements.find(({ id }) => id === shrinkAnchor.id);
        afterShrinkOffset = afterShrinkPlacement === undefined
          ? null
          : afterShrinkPlacement.rect.y - masonry.value.plan.viewport.y;
        shrinkPreserved = shrinkQuiesced
          && afterShrinkOffset !== null
          && closeTo(afterShrinkOffset, shrinkBeforeOffset)
          && writes.length <= 1
          && writes.every(({ behavior }) => behavior === 'instant');
        shrinkWrites = writes.length;
        await settleVueAndFrames(2);
        shrinkNoFeedback = writes.length === shrinkWrites;
      }
      measuredAnchorPreserved = growthPreserved && shrinkPreserved;
      measuredAnchorNoFeedback = growthNoFeedback && shrinkNoFeedback;
      anchorEvidence = {
        anchorID,
        aboveID: above.id,
        beforeOffset,
        afterGrowthOffset,
        growthPortableDelta,
        growthScrollBefore,
        growthScrollAfter,
        growthWrite,
        growthWrites,
        shrinkAnchorID: shrinkAnchor?.id ?? null,
        shrinkAboveID: shrinkAbove?.id ?? null,
        shrinkBeforeOffset,
        afterShrinkOffset,
        shrinkWrites,
      };
    }

    const concurrentAnchor = masonry.value.plan.anchor;
    let concurrentScrollMeasurement = false;
    if (concurrentAnchor !== null) {
      const concurrent = [...heights.value];
      concurrent[concurrentAnchor.id] += 16;
      heights.value = concurrent;
      nativeScrollTo({ left: 0, top: window.scrollY + 37.5, behavior: 'instant' });
      const concurrentQuiesced = await settleMasonry(masonry);
      concurrentScrollMeasurement = concurrentQuiesced && closeTo(
        masonry.value.plan.viewport.y,
        window.scrollY - surfacePageY + 48,
      );
    }

    nativeScrollTo({ left: 0, top: 1_000_000, behavior: 'instant' });
    await settleMasonry(masonry);
    const beforeShrinkScroll = window.scrollY;
    items.value = items.value.slice(0, 40);
    const bottomShrinkQuiesced = await settleMasonry(masonry);
    const physicalMaximum = Math.max(
      0,
      document.documentElement.scrollHeight - document.documentElement.clientHeight,
    );
    const nearBottomClamp = bottomShrinkQuiesced
      && window.scrollY <= beforeShrinkScroll
      && window.scrollY <= physicalMaximum + 1
      && closeTo(
        masonry.value.plan.viewport.y,
        window.scrollY - surfacePageY + 48,
      );

    return Object.freeze({
      ok: restoredInitialScroll
        && belowOrdinaryFlow
        && noNestedScrollport
        && resolvedDocument
        && documentWindowing
        && insetProjection
        && scrollToSettlesImmediately
        && scrollToHasNoFeedback
        && measuredAnchorPreserved
        && measuredAnchorNoFeedback
        && concurrentScrollMeasurement
        && nearBottomClamp,
      mounted: true,
      restoredInitialScroll,
      belowOrdinaryFlow,
      noNestedScrollport,
      resolvedDocument,
      documentWindowing,
      insetProjection,
      scrollToSettlesImmediately,
      scrollToHasNoFeedback,
      scrollToTrace: Object.freeze(scrollToTrace),
      measuredAnchorPreserved,
      measuredAnchorNoFeedback,
      anchorEvidence: Object.freeze(anchorEvidence),
      concurrentScrollMeasurement,
      nearBottomClamp,
      surfacePageY,
      targetSettledY,
      finalScrollY: window.scrollY,
      finalMaximum: physicalMaximum,
    });
  } finally {
    app.unmount();
    window.scrollTo = nativeScrollTo;
    document.documentElement.style.scrollBehavior = previousBehavior;
    host.remove();
    occluder.remove();
    nativeScrollTo({ left: 0, top: 0, behavior: 'instant' });
  }
}

async function settleMasonry(masonry, trace) {
  let previous = '';
  let stableFrames = 0;
  for (let index = 0; index < 30; index += 1) {
    await nextTick();
    await nextFrame();
    await nextTick();
    const exposed = masonry.value;
    if (exposed === undefined) return false;
    const plan = exposed.plan;
    const values = [
      exposed.state.generation,
      plan.generation,
      plan.viewport.x,
      plan.viewport.y,
      plan.contentSize.width,
      plan.contentSize.height,
      plan.placements.length,
      window.scrollX,
      window.scrollY,
    ];
    trace?.push(values);
    const snapshot = values.join('|');
    if (snapshot === previous) stableFrames += 1;
    else {
      previous = snapshot;
      stableFrames = 0;
    }
    if (stableFrames >= 2) return true;
  }
  return false;
}

async function settleVueAndFrames(count) {
  await nextTick();
  for (let index = 0; index < count; index += 1) await nextFrame();
  await nextTick();
}

function nextFrame() {
  return new Promise((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
}

function closeTo(left, right) {
  return Math.abs(left - right) < 0.5;
}
