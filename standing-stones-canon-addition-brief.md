# Standing Stones — Canon Addition Brief
**Repo:** standing-stones (`~/projects/standing-stones`)  
**Date:** 9 August 2026  
**Status:** Pre-brief only. No CR. Do not deploy without instruction.

---

## What this brief does

Adds two new sites to the canon: Balnuaran of Clava (Clava Cairns) and Temple Wood, Kilmartin Glen. Both passed the canon spike — three independent published survey sources each, HES scheduled monuments, open access, midwinter sunset alignment.

Both sites use the midwinter sunset solver already built for Maeshowe. No new solver is needed. This is a data and registration pass, not a solver build.

---

## Read before writing anything

Read `src/lib/server/sites.ts` (the canon register) and the existing Maeshowe entry in full before adding anything. The two new entries must follow the exact same shape. Read the existing vigil API route and verify the midwinter sunset solver path before assuming it will pick up the new sites automatically.

---

## Site 1 — Balnuaran of Clava (Clava Cairns)

**Coordinates:** 57.473°N, 4.074°W  
Use the southwest passage-grave as the primary point — it carries the primary alignment. The site is a cemetery of three cairns; the canon entry covers the cemetery as a whole.

**Alignment type:** `solar_midwinter_sunset`  
Same type as Maeshowe. The passage of the southwest cairn is oriented so the setting winter solstice sun shines directly down the corridor.

**Provenance tier:** SURVEYED  
Sources (three independent, peer-reviewed):
- Somerville, H.B. (1910) — first recorded alignment
- MacKie, E. (1975) — confirmed passage-grave orientation on midwinter sunset
- Bradley, R. (2000) — *The Good Stones*, Society of Antiquaries of Scotland monograph no. 17 — full excavation and alignment analysis
- Scott, D. (2016) — *Journal of Skyscape Archaeology* Vol. 2 No. 1 — solar-lunar orientations confirmed

**Register seeding:** YES — open access, HES managed, free entry, no booking required.

**Canon description (use verbatim in the site entry):**  
`Three Early Bronze Age passage-graves near Inverness, oriented to midwinter sunset. The passages align so the setting solstice sun shines directly into the chambers. Surveyed independently by Somerville (1910), MacKie (1975), and Bradley (2000).`

**Honest caveat to carry in the entry:**  
The alignment is a cemetery-wide orientation, not a single-point sightline. The southwest cairn is the primary observation point.

---

## Site 2 — Temple Wood, Kilmartin Glen

**Coordinates:** 56.124°N, 5.499°W  
Use the southern circle as the primary observation point.

**Alignment type:** `solar_midwinter_sunset`  
A line through the centre of the two circles and the northeast cairn points to midwinter sunset in the southwest.

**Provenance tier:** SURVEYED  
Sources (three independent, peer-reviewed):
- Thom, A. (1967, 1971) — original survey, *Megalithic Sites in Britain*
- Ruggles, C. (1984) — reassessment fieldwork
- Scott, D. (2009) — surveyed all sightlines 1992, direct observations during 2006-2007 major standstill, published in *Antiquity* journal

**Register seeding:** YES — open access, HES managed, free entry, no booking required.

**Canon description (use verbatim in the site entry):**  
`Two adjacent stone circles in Kilmartin Glen, Argyll, dating to around 3500 BCE. A line through the circles and the northeast cairn aligns with midwinter sunset. Surveyed by Thom (1967), Ruggles (1984), and Scott (2009, Antiquity).`

**Honest caveat to carry in the entry:**  
The solar alignment is a landscape alignment running between the two circles and the Nether Largie cairn — it is not contained within a single structure. The southern circle is the primary observation point.

---

## What to build

1. Add both sites to `sites.ts` following the exact shape of the existing Maeshowe entry
2. Verify the midwinter sunset solver picks up both new sites automatically — run a solver check for both coordinates before calling this done
3. Verify the vigil API endpoint returns items for both sites
4. Verify the register-seeding flag is set correctly on both (open access = yes)
5. Verify the Ballochroy and Maeshowe entries are unchanged after the additions

---

## Rules not to break

- Read `sites.ts` before writing — follow the existing shape exactly, do not invent new fields
- `solar_midwinter_sunset` is the alignment type — same as Maeshowe, do not create a new type
- Provenance tier is SURVEYED on both — do not downgrade
- Canon descriptions above are verbatim — use them, do not rewrite them
- Honest caveats must appear in the entry, not be dropped for brevity
- Run verify:solver after any change to `sites.ts` — the solar solver regression has happened twice; treat this as a standing discipline
- Do not commit or deploy without instruction — report findings and stop
- No new solver, no new infrastructure — this is data only

---

## Acceptance

- [ ] Balnuaran of Clava entry in `sites.ts`, coordinates 57.473°N / 4.074°W, tier SURVEYED, type `solar_midwinter_sunset`, register-seeding YES
- [ ] Temple Wood entry in `sites.ts`, coordinates 56.124°N / 5.499°W, tier SURVEYED, type `solar_midwinter_sunset`, register-seeding YES
- [ ] Midwinter sunset solver returns a valid next event for both new coordinates
- [ ] Vigil API returns items for both sites
- [ ] Ballochroy, Maeshowe, Callanish entries unchanged
- [ ] verify:solver passes
- [ ] No commit, no deploy — report and stop
