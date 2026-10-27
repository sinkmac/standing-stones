# Standing Stones — "Before You Go" per-site copy brief

**Repo:** standing-stones (`~/projects/standing-stones`)
**Date:** 21 August 2026
**Status:** rewrite-brief, revision 2 (CR-gated). No build executed. No commit. No deploy without instruction.

---

## Preamble (Amendment 002)

**Audience:** For adults in Scotland, Ireland and the wider UK who already stand at — or plan to stand at — these seven ancient sites and want the practical truth of getting there and being there, in the property's existing plain register. Not for tourists seeking opening hours, prices, booking URLs, weather forecasts, transport schedules or curated visitor guidance — those are intentionally absent.

**Chance:** The "Before You Go" surface is given a fair chance when (a) all seven existing site pages render their verified canon practical and dark-sky content under a single "Before you go" heading, with content bound verbatim from `sites.ts`; (b) a browser pass over all seven live pages confirms the merged heading renders in the existing visual hierarchy, that no page shows a placeholder or absent-field text, and that register/access/rotation/solver logic is untouched; (c) `npm run verify:solver` passes. No conditional triggers.

---

## Scope — THIS IS A PRESENTATION CHANGE, NOT A CONTENT CHANGE

- **Per-site-page change**: merge the two existing canon blocks — `.enrichment-approach` ("The approach") and `.enrichment-dark-sky` ("Dark sky") — in `src/routes/[slug]/+page.svelte` under a single "Before you go" heading.
- **Retain the existing `{site.enrichment.approach}` and `{site.enrichment.darkSky}` bindings verbatim.** Do not rewrite, consolidate, paraphrase, or supplement their content.
- **Sites without a `darkSky` field render only the existing approach content.** (Clava is the live case — its `darkSky` is absent; the existing `{#if}` already handles this.)
- **Discard the seven drafted prose passages from the earlier diagnosis/revision.** They were analysis only. The exact canon is already rendered; rewriting it is needless risk and is explicitly not required.
- Same seven existing site pages only. Not a landing-page module, not a new page, not a site-grid.
- **Preserve** the existing site page hierarchy and visual language. The existing per-site body-copy region already hosts both blocks; the change is at most a heading/container relabel plus whatever CSS merging the single heading requires, staying within the existing block styles.
- **No change to register logic, rotation logic, solver, access objects, or any canon data** (`sites.ts` untouched).

---

## The mount-point finding that drove this scoping

Read-only check of `src/routes/[slug]/+page.svelte` (lines 174–188) shows the verified canon already renders on every per-site page:

```svelte
<!-- THE APPROACH -->
{#if site.enrichment?.approach}
    <div class="enrichment-approach">
        <h3>The approach</h3>
        <p>{site.enrichment.approach}</p>
    </div>
{/if}

<!-- DARK SKY -->
{#if site.enrichment?.darkSky}
    <div class="enrichment-dark-sky">
        <h3>Dark sky</h3>
        <p>{site.enrichment.darkSky}</p>
    </div>
{/if}
```

The CSS for both blocks lives at lines 658–735 of the same file. The revised scope therefore requires **no new copy**: the content job is already done by the canon bindings. The build is a heading/container merge only.

---

## The register (as it stands — unchanged, no new language)

A vigil is kept on the same conceptual rule it already carries: you went, you observed, you record what happened — including nothing. This brief introduces no new register concept. In particular, it does not distinguish "real" vigils from managed-site visits; the `registerSeeding` implementation flag is not surfaced to visitors and is not referenced here.

---

## Absent fields — implementation constraints, NOT public copy

Per instruction, carried here only. They are **not** rendered on the site, **not** given placeholder text, and **not** stated as "unverified" anywhere public. This scoping disposes of most of the original absent-list — the earlier drafted modules (which would have implied absent content) are discarded — but the constraints that remain guard the merge:

- **Clava dark-sky:** absent in canon; the merged "Before you go" renders approach content only for Clava. No dark-sky claim is added.
- **No new copy in any module:** hours, prices, booking URLs, weather, transport, astronomical calculations, dark-sky claims — none are added to the merged surface beyond the verbatim canon fields already rendered.
- **No Bortle-2 import:** the landing hero constant is not a canon `darkSky` field and is not imported into the per-site surface.

---

## Standing rules — do not override

- Do not touch `alignments.ts`; if the build touches it, run `npm run verify:solver` immediately.
- `npm run verify:solver` must pass before any commit.
- The gated scrub panel and ancestral-sky panel are not referenced or surfaced here.
- No monetisation, affiliate, or advertising element.
- No change to `registerSeeding`, register logic, rotation logic, or any access object.

---

## Acceptance

- [ ] All seven per-site pages render a "Before you go" heading with the existing canon practical/dark-sky content.
- [ ] The rendered content is byte-identical to `site.enrichment.approach` / `site.enrichment.darkSky` from `sites.ts` (grep/SSR diff, not eyeball) — no rewrite, no paraphrase, no supplement.
- [ ] Clava renders approach content only (no dark-sky block, no dark-sky claim).
- [ ] No placeholder, no "unverified" text, no absent field rendered anywhere public.
- [ ] Register / rotation / solver / access / canon objects unchanged (`git diff --stat` shows only the target page file(s)).
- [ ] `npm run verify:solver` passes.
- [ ] Browser pass over all seven live pages (exact host `standing-stones-vigil.netlify.app`) confirms the merged heading renders in the existing visual hierarchy.
- [ ] No commit, no deploy — report and stop.