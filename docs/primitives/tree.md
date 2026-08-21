# Tree

`tree` is an ordered rooted forest. Input order determines root and sibling order. Every node has one parent or is a root; all identities are unique; cycles, self-parenting, missing parents, and excessive depth are rejected.

Kernel observations are roots, parent, and ordered children. A missing child query returns `null`, while a valid leaf returns an empty sequence. Preorder, postorder, depth, and ancestors are indexed derived observations.

Expansion is normalized separately: missing IDs and leaves are removed. Visible projection emits a unique preorder subsequence and descends only through expanded branches.
