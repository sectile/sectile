import { createRenderer } from 'vue';

export function createTestRenderer(options = {}) {
  return createRenderer({
    patchProp: (element, key, _previous, next) => {
      if (next === null || next === undefined) delete element.props[key];
      else element.props[key] = next;
    },
    insert: (child, parent, anchor) => {
      child.parent = parent;
      if (anchor === null || anchor === undefined) parent.children.push(child);
      else parent.children.splice(parent.children.indexOf(anchor), 0, child);
    },
    remove: (child) => {
      if (child.parent === null) return;
      const index = child.parent.children.indexOf(child);
      if (index >= 0) child.parent.children.splice(index, 1);
      child.parent = null;
    },
    createElement: options.createElement ?? ((type) => createHostNode(type)),
    createText: (text) => ({ type: '#text', text, props: {}, children: [], parent: null }),
    createComment: (text) => ({ type: '#comment', text, props: {}, children: [], parent: null }),
    setText: (node, text) => { node.text = text; },
    setElementText: (node, text) => {
      node.children = [{ type: '#text', text, props: {}, children: [], parent: node }];
    },
    parentNode: (node) => node.parent,
    nextSibling: (node) => {
      if (node.parent === null) return null;
      const index = node.parent.children.indexOf(node);
      return node.parent.children[index + 1] ?? null;
    },
    querySelector: () => null,
    setScopeId: () => undefined,
    cloneNode: (node) => ({ ...node, props: { ...node.props }, children: [...node.children], parent: null }),
    insertStaticContent: () => {
      const node = createHostNode('#static');
      return [node, node];
    },
  });
}

export function createHostNode(type) {
  return { type, text: '', props: {}, children: [], parent: null };
}
