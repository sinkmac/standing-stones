<script lang="ts">
	let { data } = $props();

	let site = $derived(data.site);
	let state = $derived(data.state);

	// Practical line: the seen/kept ratio once 3+ vigils are recorded,
	// otherwise the site's practical copy. The ratio threshold is a design fact.
	let practicalLine = $derived(data.seenKeptRatio ?? site.practicalLine);

	let skyStyle = $derived(
		site.showSky
			? [1, 2, 3, 4, 5, 6]
					.map((n) => `--sky-band-${n}:${site.skyBands[n - 1]}`)
					.join(';')
			: ''
	);

	// Callanish-only sparse star field — a few pale points confined to the
	// upper third of the sky, so a deliberately dark sky reads as night
	// rather than a failed image. Hard cap: under 15 points, upper third
	// only. Never rendered for other sites — the fix is scoped to Callanish.
	const CALLANISH_STARS = [
		{ left: 8, top: 6, size: 1.5, opacity: 0.7 },
		{ left: 17, top: 20, size: 1, opacity: 0.5 },
		{ left: 26, top: 10, size: 1, opacity: 0.6 },
		{ left: 34, top: 24, size: 1.5, opacity: 0.8 },
		{ left: 41, top: 5, size: 1, opacity: 0.55 },
		{ left: 49, top: 16, size: 1, opacity: 0.7 },
		{ left: 57, top: 27, size: 1.5, opacity: 0.65 },
		{ left: 63, top: 9, size: 1, opacity: 0.5 },
		{ left: 70, top: 21, size: 1, opacity: 0.75 },
		{ left: 78, top: 6, size: 1.5, opacity: 0.6 },
		{ left: 85, top: 18, size: 1, opacity: 0.5 },
		{ left: 92, top: 26, size: 1, opacity: 0.7 }
	];
	let skyStars = $derived(site.id === 'callanish' ? CALLANISH_STARS : []);
</script>

<svelte:head>
	<title>Standing Stones &amp; Alignments — vigil register</title>
	<meta
		name="description"
		content="Countdowns to the next alignment at seven ancient sites, and a register of every vigil kept — including the ones that saw nothing."
	/>
</svelte:head>

<div class="landing" style="--font-voice: Georgia, 'Times New Roman', Times, serif">
	<header class="wordmark">
		<a href="/" class="wm-title">standing stones</a>
		<span class="wm-scope" aria-label="scope">seven sites · vigil register</span>
	</header>

	{#if site.showSky}
		<div class="sky" style={skyStyle} role="img" aria-label="Illustrated banded sky over {site.id} at its alignment">
			<div class="band" style="background: var(--sky-band-1)"></div>
			<div class="band" style="background: var(--sky-band-2)"></div>
			<div class="band" style="background: var(--sky-band-3)"></div>
			<div class="band" style="background: var(--sky-band-4)"></div>
			<div class="band" style="background: var(--sky-band-5)"></div>
			<div class="band" style="background: var(--sky-band-6)"></div>
			<svg class="silhouette" viewBox="0 0 1200 110" preserveAspectRatio="none" aria-hidden="true">
				<path
					d="M0 110 L0 96 L52 92 L52 110 Z
					   M150 110 L150 70 L196 66 L196 110 Z
					   M246 110 L246 84 L290 82 L290 110 Z
					   M360 110 L360 88 L416 84 L416 110 Z
					   M560 110 L560 58 L620 54 L620 110 Z
					   M672 110 L672 78 L716 76 L716 110 Z
					   M780 110 L780 92 L836 88 L836 110 Z
					   M980 110 L980 64 L1036 60 L1036 110 Z
					   M1090 110 L1090 84 L1136 82 L1136 110 Z
					   L1200 110 Z"
					fill="#0a0d12"
				/>
			</svg>
			{#if skyStars.length}
				<div class="stars" aria-hidden="true">
					{#each skyStars as s}
						<span class="star" style="left:{s.left}%; top:{s.top}%; width:{s.size}px; height:{s.size}px; opacity:{s.opacity}"></span>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<main>
		<p class="hero">{site.sentence}</p>
		<p class="practical">{practicalLine}</p>

		<div class="countdown-row">
			{#if site.daysUntil != null && site.withinWindow}
				<p class="countdown">this week</p>
			{:else if site.daysUntil != null}
				<p class="countdown">{site.daysUntil} days</p>
			{/if}
			<a class="cta" href="/{site.id}">Keep the vigil</a>
		</div>

		<div class="orientation">
			<p>Countdowns to the next alignment at seven ancient sites.</p>
			<p>A register of every vigil kept, including the ones that saw nothing.</p>
			<p>Timing given in ranges. These are broad events, not instants.</p>
		</div>

		<p class="routing">Seven sites keep a <a href="/register">register</a>. Browse the <a href="/register">sites</a>.</p>
	</main>
</div>

<style>
	.landing {
		--font-voice: Georgia, 'Times New Roman', Times, serif;
	}

	/* 1. Wordmark bar */
	.wordmark {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		font-variant-caps: small-caps;
		letter-spacing: 0.02em;
		border-bottom: 1px solid #d4d0c8;
		padding-bottom: 0.35rem;
		margin-bottom: 1.25rem;
	}
	.wm-title {
		font-size: 1.15rem;
		color: #1a1a1a;
	}
	.wm-scope {
		font-size: 0.85rem;
		color: #7a7670;
	}

	/* 2. Leading sky — flat bands, stone silhouettes at the horizon */
	.sky {
		position: relative;
		width: 100vw;
		margin-left: calc(50% - 50vw);
		height: 200px;
		overflow: hidden;
		border-radius: 0;
		margin-bottom: 1.5rem;
	}
	.band {
		position: absolute;
		left: 0;
		width: 100%;
	}
	.band:nth-child(1) { top: 0; height: 26%; }
	.band:nth-child(2) { top: 26%; height: 22%; }
	.band:nth-child(3) { top: 48%; height: 20%; }
	.band:nth-child(4) { top: 68%; height: 14%; }
	.band:nth-child(5) { top: 82%; height: 10%; }
	.band:nth-child(6) { top: 92%; height: 8%; }
	.silhouette {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 110px;
		display: block;
	}
	.stars {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 33%;
		overflow: hidden;
	}
	.star {
		position: absolute;
		background: #cdd2db;
		border-radius: 50%;
	}

	/* 3. Hero sentence */
	.hero {
		font-family: var(--font-voice);
		font-size: clamp(1.5rem, 2.6vw, 2.1rem);
		line-height: 1.25;
		margin: 0 0 0.5rem 0;
		color: #1a1a1a;
	}

	/* 4. Practical line */
	.practical {
		font-size: 0.95rem;
		color: #5a5550;
		font-style: italic;
		margin: 0 0 1.5rem 0;
	}

	/* 5. Countdown + CTA — small, beside each other, not a hero number */
	.countdown-row {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		margin-bottom: 2rem;
	}
	.countdown {
		font-size: 0.9rem;
		color: #5a5550;
		margin: 0;
	}
	.cta {
		font-size: 0.9rem;
		color: #3a6a3a;
		text-decoration: none;
		border: 1px solid #b0ccb0;
		padding: 0.35rem 0.8rem;
		border-radius: 3px;
		background: #e8f0e8;
	}
	.cta:hover {
		background: #dceadc;
		color: #2a522a;
	}

	/* 6. Orientation lines — below the sentence, not above */
	.orientation {
		border-top: 1px solid #d4d0c8;
		padding-top: 0.75rem;
		margin-bottom: 1.5rem;
	}
	.orientation p {
		font-size: 0.9rem;
		color: #5a5550;
		margin: 0.2rem 0;
	}

	/* 7. Site routing — one line */
	.routing {
		font-size: 0.9rem;
		color: #1a1a1a;
		margin: 0;
	}
	.routing a {
		color: #3a6a3a;
	}
</style>