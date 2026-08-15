<script lang="ts">
	import HeroSky from '$lib/components/HeroSky.svelte';

	let { data } = $props();

	let site = $derived(data.site);
	let state = $derived(data.state);
	let isState3 = $derived(state === 3);

	// Practical line: the seen/kept ratio once 3+ vigils are recorded,
	// otherwise the site's practical copy. The ratio threshold is a design fact.
	let practicalLine = $derived(data.seenKeptRatio ?? site.practicalLine);

	let skyBands = $derived(site.skyBands ?? []);
	let siteId = $derived(site.id);
</script>

<svelte:head>
	<title>Standing Stones &amp; Alignments — vigil register</title>
	<meta
		name="description"
		content="Countdowns to the next alignment at seven ancient sites, and a register of every vigil kept — including the ones that saw nothing."
	/>
</svelte:head>

<div class="landing">
	<header class="wordmark">
		<a href="/" class="wm-title">standing stones</a>
		<span class="wm-scope" aria-label="scope">Seven sites · Britain &amp; Ireland · Vigil register</span>
	</header>

	<HeroSky bands={skyBands} siteId={siteId} />

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
			{#if !isState3}
				<p>Countdowns to the next alignment at seven ancient sites.</p>
			{:else}
				<p>Next alignments and the sites that count them down.</p>
			{/if}
			<p>A register of every vigil kept, including the ones that saw nothing.</p>
			<p>Timing given in ranges. These are broad events, not instants.</p>
			<p>Come and watch one arrive — the sky still keeps the appointments these stones were set for.</p>
		</div>

		<p class="routing">Seven sites keep a <a href="/register">register</a>. Browse the <a href="/register">sites</a>.</p>
	</main>
</div>

<style>
	.landing {
		--font-voice: Georgia, 'Times New Roman', Times, serif;
		--page-bg: #faf9f5;
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

	/* 2. Hero — inscription-style: wide-spaced, centred, no bold weight */
	.hero {
		text-align: center;
		font-size: clamp(1.5rem, 2.6vw, 2.1rem);
		line-height: 1.25;
		letter-spacing: 0.08em;
		font-weight: 400;
		margin: 0 0 0.5rem 0;
		color: #1a1a1a;
	}

	/* 3. Practical line */
	.practical {
		text-align: center;
		font-size: 0.95rem;
		color: #5a5550;
		font-style: italic;
		margin: 0 0 1.5rem 0;
	}

	/* 4. Countdown + CTA — centred, small, together */
	.countdown-row {
		display: flex;
		align-items: baseline;
		justify-content: center;
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

	/* 5. Orientation / manifesto — centred, quiet */
	.orientation {
		border-top: 1px solid #d4d0c8;
		padding-top: 0.75rem;
		margin-bottom: 1.5rem;
	}
	.orientation p {
		text-align: center;
		font-size: 0.9rem;
		color: #5a5550;
		margin: 0.2rem 0;
	}

	/* 6. Site routing — one line */
	.routing {
		text-align: center;
		font-size: 0.9rem;
		color: #1a1a1a;
		margin: 0 auto;
	}
	.routing a {
		color: #3a6a3a;
	}
</style>