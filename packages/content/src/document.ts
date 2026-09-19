export type NodeID = string;
export type ComponentID = string;
export type SchemaID = string;
export type SlotName = string;

export type JSONPrimitive = null | boolean | number | string;
export type JSONValue =
  | JSONPrimitive
  | readonly JSONValue[]
  | { readonly [key: string]: JSONValue };

export type StrongMark = { readonly type: 'strong' };
export type EmphasisMark = { readonly type: 'emphasis' };
export type CodeMark = { readonly type: 'code' };
export interface LinkMark {
  readonly type: 'link';
  readonly href: string;
  readonly title?: string;
}
export type TextMark = StrongMark | EmphasisMark | CodeMark | LinkMark;

export interface TextNode {
  readonly type: 'text';
  readonly text: string;
  readonly marks: readonly TextMark[];
}

export interface HardBreakNode {
  readonly type: 'hard-break';
}

export interface ParagraphNode {
  readonly id: NodeID;
  readonly type: 'paragraph';
  readonly children: readonly InlineNode[];
}

export interface HeadingNode {
  readonly id: NodeID;
  readonly type: 'heading';
  readonly level: number;
  readonly children: readonly InlineNode[];
}

export interface BlockQuoteNode {
  readonly id: NodeID;
  readonly type: 'blockquote';
  readonly children: readonly BlockNode[];
}

export interface ListItemNode {
  readonly id: NodeID;
  readonly type: 'list-item';
  readonly children: readonly BlockNode[];
}

export interface ListNode {
  readonly id: NodeID;
  readonly type: 'list';
  readonly ordered: boolean;
  readonly children: readonly ListItemNode[];
}

export interface CodeBlockNode {
  readonly id: NodeID;
  readonly type: 'code-block';
  readonly text: string;
}

export interface BlockComponentSlot {
  readonly name: SlotName;
  readonly kind: 'block';
  readonly content: readonly BlockNode[];
}

export interface InlineComponentSlot {
  readonly name: SlotName;
  readonly kind: 'inline';
  readonly content: readonly InlineNode[];
}

export type ComponentSlot = BlockComponentSlot | InlineComponentSlot;

interface ComponentNodeBase {
  readonly id: NodeID;
  readonly type: 'component';
  readonly component: ComponentID;
  readonly componentVersion: number;
  readonly data: JSONValue;
  readonly slots: readonly ComponentSlot[];
}

export interface BlockComponentNode extends ComponentNodeBase {
  readonly kind: 'block';
}

export interface InlineComponentNode extends ComponentNodeBase {
  readonly kind: 'inline';
  readonly slots: readonly [];
}

export type BlockNode =
  | ParagraphNode
  | HeadingNode
  | BlockQuoteNode
  | ListNode
  | ListItemNode
  | CodeBlockNode
  | BlockComponentNode;

export type InlineNode = TextNode | HardBreakNode | InlineComponentNode;
export type ContentNode = BlockNode | InlineNode;
export type IDBearingNode = Exclude<ContentNode, TextNode | HardBreakNode>;

export interface DocumentRoot {
  readonly type: 'document';
  readonly children: readonly BlockNode[];
}

export interface PortableContentDocument {
  readonly formatVersion: 1;
  readonly schema: {
    readonly id: SchemaID;
    readonly version: number;
  };
  readonly root: DocumentRoot;
}

export interface BlockContentFragment {
  readonly formatVersion: 1;
  readonly schema: PortableContentDocument['schema'];
  readonly kind: 'block';
  readonly content: readonly BlockNode[];
}

export interface InlineContentFragment {
  readonly formatVersion: 1;
  readonly schema: PortableContentDocument['schema'];
  readonly kind: 'inline';
  readonly content: readonly InlineNode[];
}

export type PortableContentFragment = BlockContentFragment | InlineContentFragment;

export type BaseBlockKind = Exclude<BlockNode['type'], 'component'>;
export type BaseInlineKind = Exclude<InlineNode['type'], 'component'>;
export type BaseContentKind = BaseBlockKind | BaseInlineKind;
export type ContentRole = 'block' | 'inline';

export function roleOfNode(node: ContentNode): ContentRole {
  if (node.type === 'text' || node.type === 'hard-break') return 'inline';
  if (node.type === 'component') return node.kind;
  return 'block';
}

export function typeKeyOfNode(node: ContentNode): string {
  return node.type === 'component'
    ? `component:${node.component}`
    : `base:${node.type}`;
}

export function isIDBearingNode(
  node: ContentNode,
): node is IDBearingNode {
  return node.type !== 'text' && node.type !== 'hard-break';
}
