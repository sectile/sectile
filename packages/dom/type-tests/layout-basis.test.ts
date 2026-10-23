import { connectLayoutBasis, type LayoutBasisConnection, type LayoutBasisSnapshot } from '@sectile/dom/layout-basis';
const element = document.createElement('div'), marker = document.createElement('span'), allocation = document.createElement('div');
element.append(marker, allocation);
const parent = document.createElement('div'); parent.append(element);
const result = connectLayoutBasis({ element, marker, parent, box: 'content-box', allocations: [allocation], padding: true, fontFamilies: ['Inter Variable', 'sans-serif'], property: '--stage', onChange(snapshot) {
  const basis: LayoutBasisSnapshot = snapshot;
  const inline: number | undefined = basis.contentSize?.inlineSize;
  const projection: string | undefined = basis.projection;
  const outer: number | undefined = basis.borderSize?.blockSize;
  const cell: number | undefined = basis.allocations?.[0]?.inlineSize;
  const parentInline: number | undefined = basis.parentSize?.inlineSize; void parentInline;
  const padding: number | undefined = basis.padding?.blockStart; void padding;
  // @ts-expect-error Logical padding facts are readonly native output.
  basis.padding!.inlineEnd = 1;
  // @ts-expect-error Parent allocation facts are readonly native output.
  basis.parentSize!.blockSize = 1;
  void inline; void projection; void outer; void cell;
  // @ts-expect-error Native observations are readonly output.
  basis.contentSize!.inlineSize = 1;
  // @ts-expect-error Allocation observations are readonly native output.
  basis.allocations!.push({ inlineSize: 1, blockSize: 1 });
} });
connectLayoutBasis({ element, marker, box: 'border-box', property: '--stage', onChange() {} });
// @ts-expect-error The trigger box is a closed native CSS-box choice.
connectLayoutBasis({ element, marker, box: 'padding-box', property: '--stage', onChange() {} });
if (result.ok) {
  const connection: LayoutBasisConnection = result.value;
  connection.invalidate(); connection.disconnect();
}
// @ts-expect-error The actual descendant probe must be explicit.
connectLayoutBasis({ element, property: '--stage', onChange() {} });
// @ts-expect-error Only a custom-property projection is accepted.
connectLayoutBasis({ element, marker, property: 'width', onChange() {} });
// @ts-expect-error Family tracking requires semantic names rather than platform FontFace objects.
connectLayoutBasis({ element, marker, fontFamilies: [new FontFace('Custom', 'url(custom.woff2)')], property: '--stage', onChange() {} });
// @ts-expect-error Padding observation is an opt-in boolean rather than a CSS value.
connectLayoutBasis({ element, marker, padding: '20px', property: '--stage', onChange() {} });
