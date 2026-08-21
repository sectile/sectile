# Grid

`grid` is a rectangular logical coordinate space with optional occupancy. Each identity occupies at most one coordinate and every coordinate contains at most one identity.

Ragged rows normalize to a rectangle; trailing positions are absent cells. Row and column projections preserve increasing coordinate order. Directional movement stays on one axis, skips empty or ineligible positions, and uses `stop` or `wrap-axis` explicitly.

Out-of-range row and column projections return `null`; an empty valid row or column returns an empty sequence. Dense allocation is bounded by `maxCells`.

No geometry, Euclidean distance, diagonal fallback, merged-cell region, focus, or selection authority is present.
