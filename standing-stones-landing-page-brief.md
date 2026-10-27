# Standing Stones — landing page brief

## Preamble (Amendment 002 — completed from METHODOLOGY_CONSTITUTION.md)

**Audience:** For adults in Scotland, Ireland and the wider UK who already
stand at — or plan to stand at — ancient stone sites and want to know when the
sky next lines up with the stones, and the smaller set who keep the record of
what they saw even when it rained. Not for tourists seeking a visitor guide,
school projects needing a resource, or anyone arriving expecting heritage
opening hours, weather forecasts, or curated listing.

**Chance:** The front door is given a fair chance when (a) all three rotation
states are exercised on the live site and read correctly — an alignment-window
lead, a recent-vigil lead, and the Callanish fallback — and (b) at least one
genuine vigil is recorded at an open-access site so a real entry flows
end-to-end from a per-site page through to the register. No conditional
triggers.

---

## What this is

A new root-level page (`src/routes/+page.svelte` and any required server load) replacing the current entry point. The existing per-site pages are unchanged. This brief is for the front door only.

The property is live at standing-stones-vigil.netlify.app. Repo: github.com/sinkmac/standing-stones. SvelteKit, Svelte 5 runes. CI: GitHub Actions (npm ci → svelte-check → verify:solver). Deploy: Netlify, auto on push to main.

---

## Standing rules — do not override

- Do not touch `alignments.ts` without running `npm run verify:solver` immediately afterwards. That file has a regression history.
- `npm run verify:solver` must pass before any commit.
- The gated scrub panel (`ScrubControl.svelte`) is not referenced or linked from this page. It is a vigil-keeper feature and must not be surfaced to visitors who have not kept a vigil.
- This property is heartfelt-track, not commercial-track. No advertising, affiliate, or monetisation logic.

---

## Page structure

### 1. Wordmark bar

One line at the very top. Left: "standing stones" (existing wordmark style). Right: a short descriptor establishing scope — "seven sites · vigil register" or equivalent. This line exists to solve the first-screen legibility problem: without it, the page reads as a single-site fan page until the orientation lines are reached.

### 2. Leading sky

A full-width illustrated sky. Flat discrete colour bands — not a gradient, not a photograph. Site-specific palette drawn from the light of that site's own alignment event (see palette data below). Stone silhouettes at the horizon. This element is **not a launch gate** — the page must be complete and correct with `showSky: false`. Art is per-site and can be added incrementally. Build the conditional rendering path first; populate it only for the sites where the art is ready.

**Palette data — banded sky, six rows per site:**

| Site | Event | Top band | → | → | → | → | Bottom band |
|---|---|---|---|---|---|---|---|
| Ballochroy | Midsummer sunset | `#0a0d12` | `#141a25` | `#2a2f3d` | `#6d524d` | `#8a6250` | `#a5764f` |
| Drombeg | Winter solstice sunset | `#0b0e14` | `#18202b` | `#2b333e` | `#4d5058` | `#666069` | `#b9ac96` |
| Callanish | Dark sky | `#080a0f` | `#0d1119` | `#111720` | `#151b23` | `#1a2028` | `#1f252e` |

Maeshowe, Newgrange, Stonehenge are managed-access and never lead. Their palettes are deferred — do not build them.

Sky colours are CSS custom properties on each site's data object, not hardcoded. Name them `--sky-band-1` through `--sky-band-6`.

### 3. Hero sentence

Large serif (`font-family: var(--font-voice)`). One sentence naming what happens at the featured site and approximately when. Written in the property's existing voice — plain, specific, no superlatives.

**Sentence copy per site:**

- Ballochroy: "On about six evenings in June, the sun goes down into the notch between the Paps of Jura, seen from a slab at Ballochroy."
- Drombeg: "Around the winter solstice, the setting sun aligns with the recumbent stone at Drombeg and lights the back of the circle."
- Callanish (fallback state): "Callanish stands on Lewis in the Outer Hebrides, Bortle 2, open every hour of the night."

### 4. Practical line

One shorter line below the sentence. Conditional on register state:

- **Fewer than 3 vigils recorded at the featured site:** practical copy — what it is actually like. Examples: "Often it is raining." / "Entry that week is by public lottery." / "No electricity for miles."
- **3 or more vigils recorded:** the seen/kept ratio. Example: "Seen 4 of the last 11 midsummer evenings."

The ratio threshold (3 vigils) is a design fact, not a bug. The practical line is the expected default for the first several years. It deserves the same care as the hero sentence — do not leave it as placeholder.

**Practical line copy per site:**

- Ballochroy: "Often it is raining."
- Drombeg: "The circle is small. The sky around it is wide."
- Callanish: "No alignment is due. It is open every hour."

### 5. Countdown and CTA

Small, beside each other, not as a hero number. The countdown is not the main event on this page — it belongs to the per-site pages.

- Countdown: days until the next occurrence of the site's alignment. Reuse the existing solver. Display as: "134 days" or, if within the alignment window, "this week".
- CTA: "Keep the vigil" — links to the featured site's per-site page.
- Callanish (state 3, no solar alignment): suppress the countdown entirely. CTA remains.

### 6. Orientation lines

Three lines. Below the sentence, not above it. Moving them above trades the single-site-fan-page problem for the place-feels-like-a-product problem.

1. "Countdowns to the next alignment at seven ancient sites."
2. "A register of every vigil kept, including the ones that saw nothing."
3. "Timing given in ranges. These are broad events, not instants."

### 7. Site routing

One line. Links to the vigil register and, implicitly, to all seven sites via it. Example: "Seven sites keep a register." — with "register" linking to the register index or the existing per-site listing, whichever is the cleaner route.

Do not build a site grid. One line only.

---

## Hero rotation logic

The featured site is determined server-side at page load. Logic is a priority waterfall — evaluate in order, take the first match:

**State 1 — alignment within 60 days:**
Query the solver for all seven sites. Filter to open-access only: Ballochroy and Drombeg. If the nearest open-access alignment is within 60 days, that site leads.

**State 2 — recent vigil within 90 days:**
Query the vigil register. Filter to open-access sites only (Ballochroy, Drombeg) — managed-access sites must not take the front door via the vigil fallback. If a vigil has been logged at an open-access site within the last 90 days, the site with the most recent vigil leads.

**State 3 — default:**
Callanish leads. No countdown is shown. The hero sentence and practical line use the Callanish copy above.

Open-access sites for this brief: Ballochroy, Drombeg. All others (Callanish, Maeshowe, Newgrange, Stonehenge, Balnuaran of Clava) are excluded from states 1 and 2. Callanish is the dedicated state 3 and never competes in 1 or 2. Balnuaran of Clava is open-access but its front-door eligibility and palette are deferred — it was added to canon after this brief was written and has not yet been through the palette or copy pass.

---

## Data layer

The server load function (`+page.server.ts`) should return:

```typescript
{
  site: {
    id: string,           // 'ballochroy' | 'drombeg' | 'callanish'
    sentence: string,
    practicalLine: string,
    daysUntil: number | null,   // null for Callanish / no alignment
    withinWindow: boolean,
    showSky: boolean,
    skyBands: string[],         // six hex values, top to bottom
  },
  state: 1 | 2 | 3,
}
```

The vigil count for the featured site is needed to determine whether the practical line or the ratio shows. Add `vigilCount: number` and `seenKeptRatio: string | null` to the return shape.

---

## What Hermes must not build

- Live weather integration of any kind.
- A site grid on the front door.
- Any reference to the scrub control or ancestral-sky panel.
- A ratio line for a site with fewer than 3 vigils.
- Managed-access sites (Maeshowe, Newgrange, Stonehenge) in the rotation logic.
- Any monetisation or affiliate element.

---

## Verify before committing

1. `npm run verify:solver` — must pass.
2. `npm run svelte-check` — must not introduce new errors (baseline at time of build: 0 errors / 2 warnings; the 41 cited in the brief's draft were cleared by commit 823332e — do not add any).
3. Manual check: confirm state 3 renders cleanly with no countdown, no broken ratio line, no empty practical line.
4. Manual check: confirm `showSky: false` renders a complete, readable page with no broken layout.

Commit message: `feat: landing page — hero rotation, three states, banded sky scaffold`

Push to main. Netlify deploys automatically.