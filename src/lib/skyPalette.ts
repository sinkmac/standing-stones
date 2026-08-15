// Per-site sky palettes — drawn from each site's own alignment light.
// Six bands, top band (zenith) first, bottom band (horizon) last, applied as
// CSS custom properties (--sky-band-1 .. --sky-band-6) by the hero component.
//
// EXISTING palettes (kept verbatim from the landing page SKY_BANDS map):
//   ballochroy, drombeg, callanish
//
// DERIVED palettes (added 15 Aug 2026 for the full redesign, from each site's
// documented alignment event — see sites.ts alignments[]):
//   maeshowe    — winter solstice SUNSET into a chambered cairn → cold dusk,
//                 steel blue → amber at the horizon.
//   newgrange   — winter solstice SUNRISE through a roofbox → pre-dawn cold,
//                 warm gold low on the horizon.
//   stonehenge  — summer solstice SUNRISE + winter SUNSET → wide open plain,
//             dull stone grey-blue, dawn gold near the floor.
//   clava-cairns— winter solstice SUNSET down a passage → deep dusk purples,
//             bronze at the foot of the sky.
//
// These four are derived from the alignment logic, NOT photographic; treat as
// provisional until a design pass confirms them.

export const SKY_BANDS: Record<string, string[]> = {
	ballochroy: ['#0a0d12', '#141a25', '#2a2f3d', '#6d524d', '#8a6250', '#a5764f'],
	drombeg: ['#0b0e14', '#18202b', '#2b333e', '#4d5058', '#666069', '#b9ac96'],
	callanish: ['#080a0f', '#0d1119', '#111720', '#151b23', '#1a2028', '#1f252e'],
	maeshowe: ['#070b12', '#0e1520', '#1a2431', '#35404c', '#6a5a4a', '#9a6b3f'],
	newgrange: ['#050a10', '#0d1722', '#1c2a38', '#3a4550', '#7a6a4a', '#c08a3f'],
	stonehenge: ['#080c12', '#121a24', '#24303c', '#4c5660', '#7a736a', '#b08c4a'],
	clava: ['#0a0a12', '#141426', '#232336', '#3c3540', '#6a5144', '#8a6238']
};