<script lang="ts">
	let { data } = $props();

	let sites = $derived(data.sites);
	let recentVigils = $derived(data.recentVigils);

	let nameBySlug = $derived(
		sites.reduce<Record<string, string>>((acc, site) => {
			acc[site.slug] = site.name;
			return acc;
		}, {})
	);
</script>

<svelte:head>
	<title>Vigil register — Standing Stones &amp; Alignments</title>
	<meta
		name="description"
		content="The vigil register: every genuinely-kept vigil at these stones, including the ones that saw nothing."
	/>
</svelte:head>

<header class="register-header">
	<div class="register-header-inner">
		<a class="brand" href="/">
			<span class="brand-icon">◒</span>
			<span>STANDING<br>STONES</span>
		</a>
		<nav class="register-nav" aria-label="Main navigation">
			<a href="#explore">Explore the stones</a>
		</nav>
	</div>
</header>

<main class="register-page">
	<h1>Vigil register</h1>
	<p class="intro">Seven sites keep a register. Non-events are valid entries. Cloudy counts.</p>

	<section class="site-index">
		<h2>The sites</h2>
		<ul>
			{#each sites as site}
				<li>
					<a href="/{site.slug}">{site.name}</a>
					<span class="region">{site.region}</span>
				</li>
			{/each}
		</ul>
	</section>

	<section class="recent">
		<h2>Recent vigils</h2>
		{#if recentVigils.length > 0}
			{#each recentVigils as v}
				<div class="entry">
					<p class="meta">
						{nameBySlug[v.siteSlug] ?? v.siteSlug} ·
						{new Date(v.visitDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
						{#if v.visitTime} at {v.visitTime}{/if}
						—
						{v.sawEvent ? 'Saw it' : v.sawEvent === false ? "Didn't see it" : 'Uncertain'}
						{#if v.keeperName} · {v.keeperName}{/if}
					</p>
					<blockquote>{v.observation}</blockquote>
				</div>
			{/each}
		{:else}
			<p class="empty">No vigils recorded yet. The register is waiting.</p>
		{/if}
	</section>
</main>

<footer class="register-footer">
	<p>Ancient places. Extraordinary light.<br>A field guide for the curious.</p>
	<p>Leave the stones as you found them.</p>
</footer>

<style>
	@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Libre+Caslon+Display&display=swap');

	:root {
		--bg: #111d1e;
		--panel: #172628;
		--ink: #f0ede3;
		--muted: #a9b4ad;
		--gold: #e3bf82;
		--line: #ffffff20;
		--serif: 'Libre Caslon Display', Georgia, serif;
		--sans: 'DM Sans', Arial, sans-serif;
	}
	* { box-sizing: border-box }
	body {
		margin: 0;
		background: var(--bg);
		color: var(--ink);
		font: 15px/1.65 var(--sans);
	}
	h1, h2, h3 { margin-top: 0 }
	h1 { font: clamp(40px, 4.8vw, 56px) / 1.05 var(--serif); letter-spacing: -1px; margin-bottom: 24px }
	h2 { font: clamp(24px, 3vw, 32px) / 1.15 var(--serif); letter-spacing: -0.5px; margin-bottom: 16px }
	p { color: var(--muted) }
	a { color: var(--gold) }
	button, a { -webkit-tap-highlight-color: transparent }

	.register-header {
		height: 105px;
		padding: 0 6%;
		position: sticky;
		top: 0;
		z-index: 10;
		border-bottom: 1px solid var(--line);
		background: linear-gradient(#0b171bc0, transparent);
	}
	.register-header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 105px;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 12px;
		line-height: 1.05;
		letter-spacing: 2px;
		font-size: 17px;
		font-weight: 500;
	}
	.brand-icon { font-size: 55px; line-height: 1; color: var(--gold); font-weight: 400 }
	.register-nav { display: flex; gap: 34px; font-size: 12px }
	.register-nav a { border-bottom: 1px solid #fff6; padding: 9px 0; color: var(--ink) }
	.register-nav a:hover { color: var(--gold) }

	.register-page { padding: 80px 6%; max-width: 900px; margin: 0 auto }
	.register-footer { padding: 40px 6%; border-top: 1px solid var(--line); font-size: 13px; color: var(--muted) }

	.intro { color: var(--muted); font-style: italic; margin: 0 0 2rem 0 }
	.site-index ul { list-style: none; padding: 0; margin: 0 }
	.site-index li { margin: 0.5rem 0; border-bottom: 1px solid var(--line); padding-bottom: 0.5rem }
	.site-index a { color: var(--ink); text-decoration: none; font-size: 16px }
	.site-index a:hover { color: var(--gold) }
	.region { color: var(--muted); font-size: 0.85rem; margin-left: 0.5rem; letter-spacing: 1px }

	.entry { padding: 1rem 0; border-bottom: 1px solid var(--line) }
	.meta { font-size: 0.85rem; color: var(--muted); margin: 0 0 0.4rem 0 }
	blockquote { margin: 0; color: var(--ink); font-size: 0.95rem; border-left: 3px solid var(--gold); padding-left: 1rem }
	.empty { color: var(--muted); font-style: italic }
</style>
