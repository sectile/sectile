# Published source maps

Sectile publishes one external `.js.map` beside every JavaScript artifact. Declaration maps, inline maps, and embedded `sourcesContent` are not published.

This keeps production stack traces debuggable without adding source-map bytes to executable consumer bundles or duplicating declaration metadata in tarballs. Verification builds stay map-free because they are disposable test artifacts.

The policy checker validates build configuration, built files, resolving `sourceMappingURL` references, and `npm pack --dry-run` contents for all eight packages. It also rejects unmapped JavaScript, dangling or inline maps, declaration maps, stale declaration references, and embedded source content.

- Check: `pnpm check:source-maps`
- Refresh the reviewed footprint baseline: `pnpm record:source-maps`
- Migration evidence: `migration.json`
- Current packed-footprint baseline: `baseline.json`

The declaration-map removal eliminated 404 files and 913,211 bytes. JavaScript maps remain complete for all 404 published JavaScript files.
