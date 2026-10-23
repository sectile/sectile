import { connectScrollSpy, type ScrollSpyHeadingLevel, type ScrollSpySnapshot, type ScrollSpyConnection } from '@sectile/dom/scroll-spy';
const content = document.createElement('article'), root = document.createElement('div'); root.append(content);
const result = connectScrollSpy({ id: 'guide-outline', content, scrollRoot: root, exclude: document.createElement('nav'), levels: [2, 3, 4], offset: 32,
  onChange(snapshot) {
    const value: ScrollSpySnapshot = snapshot, level: ScrollSpyHeadingLevel | undefined = value.headings[0]?.level;
    const start: number = value.start; void start; void level;
    // @ts-expect-error Observed headings are readonly native metadata.
    value.headings.push({ id: 'x', label: 'X', level: 2, depth: 0 });
  }, onError(error) { const code: string = error.code; void code; },
});
if (result.ok) { const connection: ScrollSpyConnection = result.value; connection.getSnapshot(); connection.refresh(); connection.disconnect(); }
// @ts-expect-error Identity ownership is explicit for generated native heading IDs.
connectScrollSpy({ content, onChange() {} });
// @ts-expect-error Native heading levels are a closed set.
connectScrollSpy({ id: 'guide-outline', content, levels: [7], onChange() {} });
// @ts-expect-error The scroll root is a native document or element, not a selector.
connectScrollSpy({ id: 'guide-outline', content, scrollRoot: '#article', onChange() {} });
// @ts-expect-error Exclusion is one native subtree, not a selector or observer policy.
connectScrollSpy({ id: 'guide-outline', content, exclude: 'nav', onChange() {} });
