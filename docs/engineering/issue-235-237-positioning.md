# Position policy and adopted Element ownership

Work ID: `issues-235-237`. Run ID: `overlay-contracts-2026-10-30`.
Policy and template revision: `59fc65de1829c5eb69792195a733bbde382b88d0`.
The maintainer explicitly authorized implementation, unit commits and integration
verification on `main`, without a pull request. This overrides the pilot's draft
PR saving procedure for this work. No independent review approval is claimed.

## Accepted scope and assessment

The inspected source was `59fc65de1829c5eb69792195a733bbde382b88d0`.
Issue #235 is an adapter contract gap: Core already accepts independent flip and
cross-axis shift policies, but DOM mapped both to `avoidCollisions`. Issue #236
is a native projection error: side-only areas and self alignment do not express
Core's physical anchor-edge alignment. The original Chromium probe disagreed
for all 16 start/end cases among 24 side/alignment/direction combinations.
Issue #237 is an Element ownership error: Vue `$el` can be a Fragment marker
when a trigger delegates through another component. Direct Fragment adoption
already worked; nested trigger adoption exposed the missing component channel.

The accepted criteria are independent policy inheritance and transport; native
and JavaScript geometry agreement; one live Element across composed triggers;
bounded allocation and retirement; public type compatibility; and accurate
consumer guidance. Existing defaults and Core's four-candidate layout algorithm
remain the semantic baseline. Menu submenu policy and Vue TreeSelect's existing
placement surface are outside this API extension.

## Ownership and bounds

DOM normalizes `flip ?? avoidCollisions ?? true` and the corresponding shift
policy once per engine configuration. Core owns all collision decisions. Vue's
shared declaration/transport module preserves `undefined` Boolean overrides and
allocates narrow watch sources once per setup. Connection snapshots are fixed
size; no item-domain traversal is added.

Native CSS projects physical anchor coordinates and offsets directly. Explicit
unsafe physical alignment prevents Chromium 148 from silently shifting overflow
when `shift=false`; Chromium 153's `normal` behavior had concealed that failure.
Native admission requires exact CSS expressions, an unscaled viewport and a
viewport containing block with horizontal writing mode. Unsupported contexts,
arrows, measured callbacks, clipping owners and active collision policies use
the existing JavaScript engine. Admission performs O(a) style reads for a root
ancestor chain of length a. The admitted CSS route retains no layout listeners,
observers or animation frames. Percentage size limits belong on the positioned
Content, whose position area supplies their containing block.

Primitive follows one rendered component-root chain, preferring an exposed
`Element | null`, without searching DOM descendants or replaying slots. Work is
O(d) for delegation depth d. Each mounted Primitive owns one shallow Element
reference and at most one explicit watch; native children need no watch.
Replacement stops the old watch, and unmount clears the reference. The raw
exposed payload captures only that reference, not the setup scope. A saved Vue
public proxy separately retains its framework instance; this is outside the
payload GC claim. A 32-level counter witness, exposed/native replacement, null
availability and a saved public proxy exercise channel retirement. The GC
witness retains raw exposed payloads to isolate Sectile-owned retention.

Per-family policy copies would perpetuate transport drift. Descendant DOM
search would introduce ambiguous ownership and subtree-sized work. Forcing all
positioning through JavaScript would discard the resource-free native route.
These alternatives were rejected in favor of the existing semantic owners.

## Bundle baseline decision

The existing two-bundler budget permits `ceil(baseline * 1.05) + 16` bytes for
each raw/gzip/brotli result. The previous DOM Popover baseline was
69,444 / 20,551 / 18,268 bytes in esbuild and 70,046 / 20,607 / 18,343 in Vite.
The measured candidate is 73,365 / 21,761 / 19,373 and
74,035 / 21,826 / 19,462 respectively. For esbuild, the former raw ceiling of
72,933 becomes 77,050 after recording the measured 73,365-byte baseline; the
5% + 16-byte policy itself is unchanged.

The historical-baseline comparison is not an attribution of the entire increase
to this task: its module delta also contains existing modal isolation and surface
movement owners. The new work adds native geometry/admission and live Element
retirement, plus one framework-only options owner. No external dependency was
added. The shared bridge reduces the passive Vue Calendar fixture by 218 raw /
30 gzip / 35 brotli bytes in esbuild and 216 / 27 / 27 in Vite. Vue DateRangePicker
measures 96,151 / 29,117 / 25,733 against the historical
91,891 / 27,630 / 24,400 esbuild baseline; its module delta also contains existing
interaction and native-input owners. Reverting lifetime tracking or exact native
geometry would invalidate the accepted correctness criteria. A complete fixture
record is therefore justified after the two-bundler closure, unused-import
erasure and granular-family checks succeed. Install and source-map verification
remain separate gates. No dependency or fixture-coverage budget is relaxed.
The existing collector measured 500 fixtures in both bundlers (1,000 results),
including new direct/root Primitive and Popover witnesses. Unchanged Core,
Tabular and Terminal measurements remained within their existing ceilings;
their historical baseline entries were preserved to avoid an unrelated reset.
The DOM/Vue entries retain the same 5% + 16-byte admission rule. Isolated npm
and pnpm installation checks passed without changing their install baseline.

## Integration review checkpoint

- Record ID: `overlay-contracts-review-1`.
- Actor / role: Codex / Implementer performing a self-review and fix loop.
- Source: `a57b291ff99202633ab4b7922a7666df07a13eaf`.
- Base and approved policy: `59fc65de1829c5eb69792195a733bbde382b88d0`.
- Coverage: DOM normalization, every changed option caller, native projection and
  fallback, Vue declarations and narrow updates, Primitive publication and
  retirement, public declarations, current live guide and retained EN/KR guides.
- Corrected findings: implicit browser overflow alignment; MenuButton-owned ID
  assumptions; Escape targeting the tooltip instead of the popup; a CSS-capable
  DOM mock used for measured-coordinate assertions; and broad/duplicate public
  type fixture declarations. A T3 TS2430 build failure was corrected in
  `f3b5020f6619927be8a1e7fc4d95e0afa6f2f59c`; the preceding commit's claimed build
  success was incorrect and is superseded by that correction.
- Passed locally: DOM and Vue deterministic package units; Core anchored layout;
  Primitive's 8 checks including GC and hydration; all 49 presence checks; 96
  packed native/JavaScript browser comparisons, size and 80px scroll limits;
  both composed trigger keyboard/Teleport scenarios; complexity and source
  responsibility checks. Local integration probes included an uncommitted
  correction patch before `a57b291ff99202633ab4b7922a7666df07a13eaf` was saved.
- Passed locally at close: the 1,000-result consumer record and its complete
  closure/erasure checks; unchanged install baseline with isolated npm and pnpm
  consumers; source maps; breaking mappings; and the documentation unit. Stale
  or duplicate breaking rows were reconciled with their existing surface owner;
  `./position` is an added subpath relative to the protected historical baseline.
- Pending: final clean-SHA qualification and the existing hosted
  `deep-verification` workflow. The initial checkpoint run
  [41012595411](https://github.com/sectile/sectile/actions/runs/41012595411) failed
  and does not constitute successful integration evidence.
- Source versus release: package versions remain unchanged. Registry artifacts
  have not been published or qualified; issue closure is not implied.

## CI report ownership follow-up

Full run [41014804492](https://github.com/sectile/sectile/actions/runs/41014804492)
on `b9baca0b78ed535e06783cac0a6217cc47857a17` passed all six lanes after one
bounded retry, the packed Chromium browser probe and four native macOS IME
shards. Attempt 1 failed the unchanged Chart allocation fixture; the identical
test file passed locally with both Node 24.22.0 and 24.22.1. All 1,857 downloaded
production files matched local bytes. That first failure's cause remains
Unknown; the passing retry is not a claim that its cause was fixed.

The retry then exposed a separate, confirmed aggregation defect. The service
retained two `verification-lane-3` artifacts, IDs `12959111688` (failed report)
and `12958808419` (passing report). The final download selected the former and
rejected the already-passing retry. The existing lane upload now uses the
pinned action's `overwrite` input, so each lane owns one current report across
attempts. The upload action is pinned consistently to the verified latest stable
v7.0.2 commit `cf430e030ddbb5b0abf93d22962f4752f3646cd9`; its Node 24 runtime and
overwrite input match the existing supported runner. Triggers, permissions,
checks and runner images stay the same. Historical failure logs remain in the run and the devtools validation
record. The aggregate failure remains Failed until this correction is qualified
on a new clean main SHA.

## Final qualification and follow-up review

- Record ID / Work ID / Run ID: `overlay-contracts-final-review-2` /
  `issues-235-237` / `overlay-contracts-follow-up-2026-10-30`.
- Actor / role: Codex / Implementer performing the requested self-review loop.
- Reviewed at: `2026-10-30T07:15:15Z`.
- Reviewed source and tested target:
  `a3b541d1dcf3d61523ee4131d5f7dae4524e01d9`, clean `main`.
- Reviewed base / approved policy and template revision:
  `59fc65de1829c5eb69792195a733bbde382b88d0`.
- Scope snapshot: the accepted scope and ownership sections above, unchanged.
  The maintainer requested another review and confirmation that every required
  verification passes, retaining main-only execution and no pull request.

| Reviewed area | Contract and evidence | Review state |
| --- | --- | --- |
| DOM policy and callers | Independent normalization, every changed popup/choice/menu/picker caller, rejection before resource acquisition, and live reconfiguration; DOM policy cases and public type fixtures | Reviewed; no remaining eligible findings |
| Native projection and fallback | Physical edges and offsets, viewport admission, exact capabilities, available-size ownership, style restoration and resource retirement; 96 packed browser comparisons, size/scroll probes and DOM lifecycle cases | Reviewed; no remaining eligible findings |
| Vue options | Shared declarations, omitted Boolean inheritance, family defaults and narrow update sources; seven-family live forwarding and public SFC/type fixtures | Reviewed; no remaining eligible findings |
| Element ownership | Sole component-root traversal, exposed null/reference changes, replacement, stopped watches and unmount; 32-level work counter, raw payload GC, saved public proxy retirement, hydration and composed keyboard/Teleport probes | Reviewed; no remaining eligible findings |
| Public guidance and verification owners | Live guide plus retained English/Korean guidance, signature/breaking mappings, complexity and package ownership, measured bundle fixtures, and CI lane artifact replacement | Reviewed; no remaining eligible findings |

The existing [deep-verification run 41016095884](https://github.com/sectile/sectile/actions/runs/41016095884)
passed on the exact source SHA above. Both its initial attempt and the bounded
retry qualification passed. The latest attempt has all 13 jobs successful:
preparation, six deterministic lanes, packed Chromium verification, four native
macOS IME shards and final aggregation. The
[final aggregation job](https://github.com/sectile/sectile/actions/runs/41016095884/job/123935710330)
reported `status: passed` and `verifiedUnits: 85` at
`2026-10-30T06:57:03Z`. The retry replaced lane 3 artifact `12959691687` with
`12960251091`; one current lane report remained and aggregation passed. This
qualifies the report ownership correction rather than merely rerunning its test.

The tested source-built packages are `@sectile/dom@0.20.1`, SHA-256
`fe3f22203c18e45ec886747a074d82c2b8d2164d680197a538037954b69a616b`,
and `@sectile/vue@0.20.1`, SHA-256
`3eab3e69c70c62b4f6e0e123ac1e3e447d87a6608e138ba0c57ca4645ff41bcb`.
The full run includes public declarations, bundles, isolated installs, maps,
documentation, generated contracts and lifecycle evidence. No required check is
pending or failed for this tested source. The earlier Pending/Failed checkpoints
are historical and are superseded by this qualification; their original logs
and records are preserved. The earlier Chart failure's cause remains Unknown,
and no Chart implementation, assertion or budget was weakened to obtain a pass.

Conclusion: the accepted source implementation and requested self-review loop
are complete. This is not a separate independent code-review approval. Registry
publication and release certification remain outside the accepted source-only
scope. This follow-up record changes documentation only; runtime and consumer
evidence above remains applicable while its inputs are unchanged.
