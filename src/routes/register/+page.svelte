<script lang="ts">
	import { VIGIL_STATES, vigilCountLine, vigilZeroState, vigilRemoteLine } from '$lib/registerCopy';

	let { data } = $props();

	let registers = $derived(data.registers);
	let recentVigils = $derived(data.recentVigils);

	let nameBySlug = $derived(
		registers.reduce<Record<string, string>>((acc, r) => {
			acc[r.site.slug] = r.site.name;
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

<h1>Vigil register</h1>
<p class="intro">Seven sites keep a register. Non-events are valid entries. Cloudy counts.</p>

<section class="site-index">
	<h2>The sites</h2>
	<ul>
		{#each registers as { site, tally, body }}
			<li>
				<a href="/{site.slug}">{site.name}</a>
				<span class="region">{site.region}</span>
				<p class="count">
					{tally.kept > 0 ? vigilCountLine(tally.kept, tally.saw, tally.cloud, body) : vigilZeroState()}
					{vigilRemoteLine(tally.remote)}
				</p>
			</li>
		{/each}
	</ul>
	<p class="note">Times, places and what people saw are as reported. The register takes them on trust.</p>
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
					{#if v.vigilState} · {VIGIL_STATES[v.vigilState]}{/if}
				</p>
				<blockquote>{v.observation}</blockquote>
			</div>
		{/each}
	{:else}
		<p class="empty">No vigils recorded yet. The register is waiting.</p>
	{/if}
</section>

<style>
	h1 {
		font-size: 1.5rem;
		margin: 0 0 0.25rem 0;
		font-weight: normal;
	}
	.intro {
		color: #5a5550;
		font-style: italic;
		margin: 0 0 1.5rem 0;
	}
	h2 {
		font-size: 1.1rem;
		font-weight: normal;
		margin: 0 0 0.5rem 0;
	}
	.site-index ul {
		list-style: none;
		padding: 0;
		margin: 0 0 1.5rem 0;
	}
	.site-index li {
		margin: 0.5rem 0;
	}
	.count {
		margin: 0.1rem 0 0 0;
		font-size: 0.85rem;
		color: #5a5550;
	}
	.note {
		font-size: 0.85rem;
		color: #7a7670;
		margin: -0.75rem 0 1.5rem 0;
	}
	.site-index a {
		color: #1a1a1a;
		text-decoration: none;
	}
	.site-index a:hover {
		color: #3a6a3a;
	}
	.region {
		color: #7a7670;
		font-size: 0.85rem;
		margin-left: 0.5rem;
	}
	.entry {
		padding: 0.6rem 0;
		border-bottom: 1px solid #e4e0d8;
	}
	.meta {
		font-size: 0.85rem;
		color: #5a5550;
		margin: 0 0 0.2rem 0;
	}
	blockquote {
		margin: 0;
		color: #1a1a1a;
		font-size: 0.9rem;
	}
	.empty {
		color: #7a7670;
		font-style: italic;
	}
</style>