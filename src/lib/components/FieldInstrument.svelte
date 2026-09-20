<script lang="ts">
	// Field instrument — the tiled dark page, slug-driven and reusable.
	//
	// Generalized from the Callanish field instrument. Rendered entirely from
	// each site's existing canon/data:
	//   - Palette: the site's own SKY_BANDS entry (via HeroSky); tile strata are
	//     one shared dark system across sites.
	//   - Hero arc: HeroSky shows it for solar sites, withholds it for Callanish
	//     (the moonlit-no-arc rule lives in HeroSky, keyed on siteId).
	//   - Next vigils: whatever nextEvents the page load actually returns —
	//     solar solstice countdowns, Stonehenge's two events, Callanish's
	//     monthly lunistice. Same data, rendered per shape. No invented events.
	//   - Thinner canon = thinner tiles. Nothing padded, nothing invented.
	//
	// Countdown badge forms (both dark-styled, brass accent, monospace):
	//   single night  — "19:59 · one night only"
	//   window        — "21:08 · 4/6 days window"

	import HeroSky from './HeroSky.svelte';
	import { emptyBook as emptyBookFor, emptyNext as emptyNextFor } from '$lib/shellStrings';

	let { data }: { data: import('../../routes/[slug]/+page.server').SitePageData } = $props();

	let site = $derived(data.site);
	let nextEvents = $derived(data.nextEvents ?? []);
	let vigilStats = $derived(data.vigilStats);
	let recentVigils = $derived(data.recentVigils ?? []);
	let skyBands = $derived(data.skyBands ?? []);

	// Keep-the-vigil form state (the register stays real and truthful).
	let observation = $state('');
	let keeperName = $state('');
	let sawEvent = $state<string | null>(null);
	let weather = $state('clear');
	let submitted = $state(false);
	let submitError = $state('');

	async function handleSubmit() {
		submitted = false;
		submitError = '';

		if (!observation || observation.trim().length < 3) {
			submitError = 'Observation must be at least 3 characters.';
			return;
		}

		try {
			const res = await fetch(`/api/vigil/${site.slug}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					observation: observation.trim(),
					keeperName: keeperName.trim() || undefined,
					sawEvent: sawEvent === null ? null : sawEvent === 'yes',
					weather,
					alignmentType: site.alignments[0]?.type || 'unknown'
				})
			});

			if (!res.ok) {
				const err = await res.json();
				submitError = err.error || 'Failed to record vigil.';
				return;
			}

			submitted = true;
			observation = '';
			keeperName = '';
			sawEvent = null;
		} catch (e) {
			submitError = 'Network error. Try again.';
		}
	}

	// Location from canon (no map prop). Longitude negative → W.
	let coordLine = $derived(
		`${Math.abs(site.latitude).toFixed(4)}°${site.latitude < 0 ? 'S' : 'N'} ` +
		`${Math.abs(site.longitude).toFixed(4)}°${site.longitude < 0 ? 'W' : 'E'}`
	);

	// Human label for an event's alignment type — canon words, no invention.
	function eventLabel(type?: string): string {
		switch (type) {
			case 'summer-solstice': return 'Summer solstice';
			case 'winter-solstice': return 'Winter solstice';
			case 'equinox': return 'Equinox';
			case 'lunar-lunistice-south': return 'Monthly southern lunistice';
			case 'lunar-standstill': return 'Lunar standstill';
			default: return 'Next alignment';
		}
	}

	// Badge: single-night form vs multi-day-window form.
	function badge(e: (typeof nextEvents)[number]): string {
		const win = e.daysBefore + e.daysAfter;
		return win === 0
			? `${e.eventTime} · one night only`
			: `${e.eventTime} · ${e.daysBefore}/${e.daysAfter} days window`;
	}

	// Empty-register copy lives in the keyed table (src/lib/shellStrings.ts), not
	// inside the component — per-site strings inline in a component are what stop a
	// shell being site-agnostic. Strings are verbatim unchanged (Callanish's live
	// page must not reword).
	const emptyBook = $derived(emptyBookFor(site.slug, site.name));
	const emptyNext = $derived(emptyNextFor(site.slug, site.name));
</script>

<svelte:head>
	<title>{site.name} — Standing Stones & Alignments</title>
</svelte:head>

<a href="/" class="back-link">← All sites</a>

<div class="field">

	<!-- TILE 1 : HERO -->
	<section class="tile hero" id="guide">
		<HeroSky bands={skyBands} siteId={site.slug} />
		<div class="hero-copy">
			<h1>{site.name}</h1>
			{#if site.altName}
				<p class="alt-name">{site.altName}</p>
			{/if}
			<p class="region">{site.region}</p>
			<!-- Ballochroy hierarchy pass: the archaeological description moved to
			     History in brief (consolidated, not deleted — it already partly
			     lived there via the alignment lines). The hero carries an
			     invitation-led line instead, per the Next-Vigil-dominates brief. -->
			{#if site.slug === 'ballochroy'}
				<p class="description">Three stones on a Kintyre farm track, set so they frame the midsummer sunset where it drops behind Jura. The date is the appointment; standing there is how you keep it.</p>
			{:else}
				<p class="description">{site.description}</p>
			{/if}
			<p class="guide-entry"><a href="#before">Before you go →</a></p>
		</div>
	</section>

	<!-- TILE 2 : BEFORE YOU GO -->
	<section class="tile tile-before" id="before">
		<h2>Before you go</h2>
		<div class="readout">
			{#if site.enrichment?.approach}
				<p>{site.enrichment.approach}</p>
			{/if}
			{#if site.access}
				<p class="access-line">{site.access.description}</p>
			{/if}
		</div>
	</section>

	<!-- TILE 3 : DARK SKY -->
	<section class="tile tile-dark">
		<h2>Dark sky</h2>
		<div class="readout tile-dark-readout">
			{#if site.enrichment?.darkSky}
				<p>{site.enrichment.darkSky}</p>
			{:else}
				<p>The dark-sky case for this site is not yet documented in the current canon.</p>
			{/if}
		</div>
	</section>

	<!-- TILE 4 : NEXT VIGILS -->
	<section class="tile tile-next" class:tile-next-primary={site.slug === 'ballochroy'}>
		<h2>Next vigils</h2>
		{#if nextEvents.length > 0}
			{#each nextEvents as event}
				<div class="event-card">
					<p class="event-type">{eventLabel(event.alignmentType)}</p>
					<p class="event-date">{event.dateRange}</p>
					<p class="event-badge">{badge(event)}</p>
					<p class="event-desc">{event.windowDescription}</p>
				</div>
			{/each}
		{:else}
			<div class="empty-instrument">
				<p>{emptyNext}</p>
				<p>The absence of a datable alignment is not the absence of a sky. Keep the vigil and the register will show it.</p>
			</div>
		{/if}
	</section>

	<!-- TILE 5 : VISITORS BOOK -->
	<section class="tile tile-book">
		<h2>Visitors book</h2>
		<div class="stats">
			<p><strong>{vigilStats.total}</strong> vigils kept</p>
			{#if vigilStats.total > 0}
				<p>Seen {vigilStats.ratio ?? 0}% of attempts</p>
			{/if}
		</div>

		{#if recentVigils.length > 0}
			<div class="recent">
				{#each recentVigils as entry}
					<div class="vigil-entry">
						<p class="vigil-meta">
							{new Date(entry.visitDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
							{#if entry.visitTime} at {entry.visitTime}{/if}
							— {entry.sawEvent ? 'Saw it' : entry.sawEvent === false ? "Didn't see it" : 'Uncertain'}
							· {entry.weather}
						</p>
						<blockquote>{entry.observation}</blockquote>
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-book">
				<p>{emptyBook[0]}</p>
				<p>{emptyBook[1]}</p>
			</div>
		{/if}

		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
			{#if submitError}
				<p class="form-error">{submitError}</p>
			{/if}

			<label>
				Did you see the alignment?
				<select bind:value={sawEvent}>
					<option value={null}>Not sure / Other</option>
					<option value="yes">Yes, I saw it</option>
					<option value="no">No, I didn't</option>
				</select>
			</label>

			<label>
				Weather
				<select bind:value={weather}>
					<option value="clear">Clear</option>
					<option value="partly-cloudy">Partly cloudy</option>
					<option value="overcast">Overcast</option>
					<option value="rain">Rain</option>
					<option value="other">Other</option>
				</select>
			</label>

			<label>
				Your name (optional)
				<input type="text" bind:value={keeperName} placeholder="Display name" />
			</label>

			<label>
				What did you see?<span class="required">*</span>
				<textarea bind:value={observation} rows={3} placeholder="Went, cloudy, saw nothing. Still worth recording."></textarea>
			</label>

			{#if submitted}
				<p class="success">Vigil recorded. The register grows.</p>
			{/if}
			<button type="submit">Keep the vigil</button>
		</form>
	</section>

	<!-- TILE 6 : HISTORY IN BRIEF -->
	<section class="tile tile-history">
		<h2>History in brief</h2>
		{#if site.slug === 'ballochroy'}
			<!-- Ballochroy hierarchy pass: the archaeological site description
			     (moved from the hero, consolidated — no duplication) precedes the
			     alignment lines. Same canon words, relocated. -->
			<p class="history-body">{site.description}</p>
		{/if}
		{#if site.dateConfidence}
			<p class="history-body">{site.dateConfidence.evidence}</p>
		{/if}
		{#each site.alignments as al}
			<div class="history-align">
				<p class="history-desc">{al.description}</p>
				<p class="source-line">{al.source}</p>
			</div>
		{/each}
	</section>

	<!-- TILE 7 : LOCATION -->
	<section class="tile tile-location">
		<h2>Location</h2>
		<p class="region">{site.region}</p>
		<p class="coords">{coordLine}</p>
		{#if site.access}
			<p class="access-line">{site.access.description}</p>
		{/if}
	</section>

</div>

<style>
	/* Asymmetric tiled composition. Hierarchy:
	   PLACE (hero, dominated) → CONDITIONS (dark sky) → WHEN (next)
	   → PRACTICALITY (before) → CONTEXT (book / history / location).

	   The layout body is capped at 54ch by +layout.svelte (a prose measure).
	   A 12-column instrument cannot live in that: break out to near-full
	   viewport width (same full-bleed technique HeroSky uses), capped and
	   centred so wide screens don't sprawl. */
	/* Dark visual identity — one shared tile system across sites; each site's
	   sky comes from its own SKY_BANDS entry via HeroSky, while the tile
	   strata stay constant so the identity reads as one product. */
	.field {
		/* full-bleed breakout from the 54ch prose measure, capped at 1200px.
		   width = min(100vw, cap); margin-left = 50% - half-the-actual-width,
		   which self-centres at any viewport. The page-level overflow-x: clip
		   below absorbs the 100vw-vs-scrollbar difference. */
		width: min(100vw - 17px, 1200px);
		margin-left: calc(50% - min((100vw - 17px) / 2, 600px));
		display: grid;
		gap: 0.8rem;
		grid-template-columns: repeat(12, 1fr);
		grid-template-areas:
			"hero hero hero hero hero hero hero hero hero hero hero hero"
			"next next next next dark dark dark before before before before before"
			"book book book book book history history history history location location location";
		align-items: start;
	}

	/* Ballochroy hierarchy pass — Next Vigils dominates as the primary
	   proposition: full-width row directly under the hero, before the
	   practical/scholarly tiles. Before You Go and Dark Sky drop to a
	   secondary equal-weight row. Brief-scoped: Ballochroy only. */
	.field:has(.tile-next-primary) {
		grid-template-areas:
			"hero hero hero hero hero hero hero hero hero hero hero hero"
			"next next next next next next next next next next next next"
			"dark dark dark dark dark dark before before before before before before"
			"book book book book book history history history history location location location";
	}
	.field:has(.tile-next-primary) .tile-next {
		/* The invitation row: larger card, more space, stronger type. */
		background: #131b2e;
		border: 1px solid #2a3552;
		border-left: 4px solid #b0a36a;
		padding: 1.4rem 1.5rem 1.5rem 1.5rem;
	}
	.field:has(.tile-next-primary) .tile-next h2 {
		font-size: 0.85rem;
		color: #b0a36a;
	}
	.field:has(.tile-next-primary) .event-type { font-size: 0.85rem; }
	.field:has(.tile-next-primary) .event-date {
		font-size: 1.45rem;
		letter-spacing: 0.01em;
	}
	.field:has(.tile-next-primary) .event-badge { font-size: 1.05rem; }
	.field:has(.tile-next-primary) .event-desc {
		font-size: 0.95rem;
		max-width: 70ch;
	}
	.field:has(.tile-next-primary) .event-card { padding: 0.55rem 0; }
	/* Secondary row tiles read slightly quieter than the invitation. */
	.field:has(.tile-next-primary) .tile-dark,
	.field:has(.tile-next-primary) .tile-before {
		font-size: 0.97em;
	}

	.tile {
		background: #101728;
		border: 1px solid #1d2740;
		border-radius: 6px;
		padding: 0.85rem 0.95rem;
	}

	.tile h2 {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		margin: 0 0 0.45rem 0;
		color: #7d8aa8;
	}

	.tile p { margin: 0.25rem 0; }
	.readout { font-size: 0.85rem; color: #b9c2d4; }
	.tile p, .readout p { line-height: 1.45; }

	/* HERO — dominates; illustrated per-site sky, copy in normal flow below. */
	.hero {
		grid-area: hero;
		background: none;
		border: none;
		padding: 0 0 0.5rem 0;
		position: relative;
	}
	.hero :global(.heroshell) {
		border-radius: 6px;
		overflow: hidden;
		/* HeroSky breaks out with calc(50% - 50vw) — full viewport width —
		   which overhangs the field's narrower (scrollbar-compensated) breakout
		   by the scrollbar width. Pull it back to the field's own box. */
		width: 100%;
		margin-left: 0;
	}
	/* Copy sits below the hero sky as normal flow — no overlay, no overlap. */
	.hero-copy {
		padding: 0 0.25rem;
		margin-top: 0.6rem;
	}
	.hero h1 { margin: 0.4rem 0 0 0; font-size: 1.7rem; color: #eef1f8; }
	.alt-name { font-style: italic; color: #98a4be; margin: 0.2rem 0 0 0; }
	.hero .region { color: #7d8aa8; font-size: 0.85rem; margin: 0.2rem 0 0 0; }
	.hero .description { margin: 0.6rem 0 0 0; font-size: 0.98rem; max-width: 60ch; color: #c4ccdd; }
	.guide-entry { margin-top: 0.9rem; font-size: 0.9rem; }
	.guide-entry a { color: #9db4d8; font-weight: 600; text-decoration: none; }
	.guide-entry a:hover { text-decoration: underline; color: #c4d4ee; }

	/* NEXT — the dated countdown(s), clearly visible. Brass/warm accent —
	   the "when" instrument. Badge handles both single-night and window forms. */
	.tile-next { grid-area: next; background: #131b2e; border-left: 3px solid #8a7d4a; }
	.event-type { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.09em; color: #b0a36a; }
	.event-date { font-weight: 600; font-size: 1.02rem; color: #eef1f8; }
	.event-badge { font-size: 0.85rem; color: #d9c27a; font-family: monospace; }
	.event-desc { font-size: 0.85rem; color: #b9c2d4; }
	.event-card { display: flex; flex-direction: column; gap: 0.25rem; padding: 0.4rem 0; }
	.event-card + .event-card { border-top: 1px solid #1d2740; }

	/* DARK SKY — the instrument answering "is this a good night?".
	   Honest treatment: striking text on deep ground, no gauge/dial, no
	   fabricated readings — the canon line IS the instrument. */
	.tile-dark {
		grid-area: dark;
		background:
			radial-gradient(ellipse 120% 90% at 50% 115%, rgba(24, 34, 60, 0.9), transparent 70%),
			#0c1120;
		border-left: 3px solid #4a5a8a;
	}
	.tile-dark .readout { color: #aebadb; }

	/* BEFORE — practical readiness. */
	.tile-before { grid-area: before; }

	/* BOOK — register, honest and sparse. */
	.tile-book { grid-area: book; }
	.stats { display: flex; gap: 1.5rem; font-size: 0.9rem; margin: 0.25rem 0 0.5rem 0; }
	.stats strong { color: #eef1f8; }
	.vigil-entry { border-bottom: 1px solid #1d2740; padding: 0.3rem 0; }
	.vigil-meta { font-size: 0.78rem; color: #7d8aa8; }
	blockquote { margin: 0.2rem 0 0 0; font-size: 0.85rem; font-style: italic; color: #b9c2d4; }
	.empty-book {
		font-size: 0.85rem; color: #98a2b8; font-style: italic;
		background: #0d1322; border: 1px solid #1d2740; border-radius: 4px; padding: 0.6rem;
	}
	form { margin-top: 0.7rem; }
	label { display: block; font-size: 0.8rem; color: #8b96ad; margin-bottom: 0.4rem; }
	.required { color: #c98a8a; }
	select, input, textarea {
		display: block; width: 100%; margin-top: 0.12rem; padding: 0.3rem 0.45rem;
		font-family: Georgia, serif; font-size: 0.85rem; border: 1px solid #2a3652;
		border-radius: 3px; background: #0d1322; color: #dbe1ee; box-sizing: border-box;
	}
	button {
		margin-top: 0.4rem; padding: 0.45rem 0.9rem; font-family: Georgia, serif;
		font-size: 0.85rem; background: #dbe1ee; color: #0d1322; border: none;
		border-radius: 3px; cursor: pointer;
	}
	button:hover { background: #ffffff; }
	.form-error { color: #d89a9a; font-size: 0.85rem; }
	.success { color: #8fbf8f; font-size: 0.85rem; }

	/* HISTORY — concise orientation, real canon. */
	.tile-history { grid-area: history; font-size: 0.85rem; color: #b9c2d4; }
	.history-body { font-size: 0.85rem; }
	.history-align { margin-top: 0.55rem; }
	.history-align .history-desc { font-size: 0.85rem; margin: 0; }
	.source-line { font-size: 0.74rem; color: #6f7a94; font-style: italic; margin-top: 0.3rem; }

	/* LOCATION — orientation from canon, no map prop. */
	.tile-location { grid-area: location; background: #0d1322; }
	.tile-location .region { color: #8b96ad; }
	.coords { font-family: monospace; color: #9db4d8; font-size: 0.9rem; }
	.access-line { font-size: 0.82rem; color: #8b96ad; }

	.empty-instrument { font-size: 0.85rem; color: #98a2b8; }

	.back-link { font-size: 0.85rem; color: #7d8aa8; text-decoration: none; }
	.back-link:hover { color: #dbe1ee; }

	/* Page ground: the night extends beyond the tiles — body, header, footer.
	   Scoped via :has(.field) so ONLY component pages go dark; the CSS ships
	   with this component, so no other route is affected. */
	:global(html:has(.field)) { overflow-x: clip; }
	:global(body:has(.field)) { background: #04060e; }
	:global(body:has(.field) header) { border-bottom-color: #1d2740; }
	:global(body:has(.field) header .site-title) { color: #dbe1ee; }
	:global(body:has(.field) nav a) { color: #8b96ad; }
	:global(body:has(.field) nav a:hover) { color: #dbe1ee; }
	:global(body:has(.field) footer) { border-top-color: #1d2740; }
	:global(body:has(.field) footer p) { color: #6f7a94; }

	/* Mobile: single-column vertical sequence. Base priority (other sites):
	   Hero → Before you go → Dark sky → Next → Book → History → Location.
	   Ballochroy (invitation-first pass): Next Vigils jumps ahead of the
	   practical tiles so the page reads "here's the night" first. */
	@media (max-width: 820px) {
		.field {
			width: 100%;
			margin-left: 0;
			grid-template-columns: 1fr;
			grid-template-areas:
				"hero"
				"before"
				"dark"
				"next"
				"book"
				"history"
				"location";
		}
		.field:has(.tile-next-primary) {
			grid-template-areas:
				"hero"
				"next"
				"before"
				"dark"
				"book"
				"history"
				"location";
		}
	}
</style>