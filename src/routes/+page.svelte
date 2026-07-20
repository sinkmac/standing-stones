<script lang="ts">
	let { data } = $props();

	let sites = $derived(data.sites);
	let canonInfo = $derived(data.canonInfo);

	function tierClass(tier: string) {
		return tier === 'surveyed' ? 'badge-surveyed' : 'badge-traditional';
	}
</script>

<svelte:head>
	<title>Standing Stones & Alignments — Sites</title>
</svelte:head>

<h1>Standing Stones & Alignments</h1>
<p class="subtitle">Keep the vigil. Record what you see. Non-events are valid.</p>

<div class="canon-info">
	<p>
		<span class="label">Initial canon:</span>
		{canonInfo.total} sites —
		{canonInfo.surveyed} surveyed/published research,
		{canonInfo.traditional} traditional/folklore
	</p>
</div>

<div class="site-list">
	{#each sites as site}
		<a href="/{site.slug}" class="site-card">
			<div class="card-header">
				<h2>{site.name}</h2>
				<span class="tier-badge {tierClass(site.tier)}">{site.tier}</span>
				{#if site.marquee}
					<span class="badge-marquee">marquee</span>
				{/if}
				{#if site.registerSeeding}
					<span class="badge-seeding">vigil site</span>
				{/if}
			</div>
			<p class="region">{site.region}</p>
			<p class="description">{site.description}</p>
			<div class="alignments">
				{#each site.alignments as a}
					<span class="alignment-tag">{a.type.replace('-', ' ')}</span>
				{/each}
			</div>
		</a>
	{/each}
</div>

<style>
	.subtitle {
		color: #5a5550;
		font-style: italic;
		margin-top: -0.5rem;
		margin-bottom: 1.5rem;
	}

	.canon-info {
		font-size: 0.85rem;
		color: #7a7670;
		margin-bottom: 1.5rem;
	}

	.label {
		color: #5a5550;
	}

	.site-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.site-card {
		display: block;
		padding: 1rem;
		border: 1px solid #d4d0c8;
		border-radius: 4px;
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s;
	}

	.site-card:hover {
		border-color: #8a8578;
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}

	.card-header h2 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.region {
		font-size: 0.85rem;
		color: #7a7670;
		margin: 0 0 0.5rem 0;
	}

	.description {
		font-size: 0.9rem;
		margin: 0 0 0.5rem 0;
	}

	.tier-badge {
		font-size: 0.7rem;
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.badge-surveyed {
		background: #e8f0e8;
		color: #3a6a3a;
		border: 1px solid #b0ccb0;
	}

	.badge-traditional {
		background: #f0ece8;
		color: #8a6a3a;
		border: 1px solid #d0c4b0;
	}

	.badge-marquee {
		font-size: 0.7rem;
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
		background: #e8e4f0;
		color: #5a4a7a;
		border: 1px solid #c4bcd0;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.badge-seeding {
		font-size: 0.7rem;
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
		background: #f0e8d8;
		color: #7a6a3a;
		border: 1px solid #d0c4a8;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.alignments {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.alignment-tag {
		font-size: 0.75rem;
		padding: 0.1rem 0.3rem;
		background: #eae8e4;
		border-radius: 3px;
		color: #5a5550;
	}
</style>