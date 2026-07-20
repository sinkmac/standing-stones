<script lang="ts">
	let { data } = $props();

	let site = $derived(data.site);
	let nextEvents = $derived(data.nextEvents);
	let vigilStats = $derived(data.vigilStats);
	let recentVigils = $derived(data.recentVigils);
	let skySummary = $derived(data.skySummary);

	// Form state
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

	// Check if this site has any alignment
	let hasAlignment = $derived(site.alignments.length > 0);
	let isFolklore = $derived(site.tier === 'traditional');
	let hasError = $derived('error' in data);
</script>

<svelte:head>
	<title>{site.name} — Standing Stones & Alignments</title>
</svelte:head>

{#if hasError}
	<div class="error">
		<h1>Site not found</h1>
		<p>{(data as { error: string }).error}</p>
		<a href="/">← Back to all sites</a>
	</div>
{:else}

	<a href="/" class="back-link">← All sites</a>

	<div class="site-header">
		<h1>{site.name}</h1>
		{#if site.altName}
			<p class="alt-name">{site.altName}</p>
		{/if}
		<p class="region">{site.region}</p>
		<div class="badges">
			<span class="badge badge-{site.tier}">{site.tier}</span>
			{#if site.marquee}
				<span class="badge badge-marquee">marquee</span>
			{/if}
		</div>
	</div>

	<p class="description">{site.description}</p>

	<div class="access">
		<h3>Access</h3>
		<p>{site.access.description}</p>
		{#if site.access.lottery}
			<p class="access-note">⚠ Lottery access. Plan ahead.</p>
		{/if}
	</div>

	<!-- COUNTDOWN SECTION -->
	<section class="countdown">
		<h2>Next alignment</h2>
		{#if !hasAlignment}
			<!--- NO-ALIGNMENT FALLBACK PROMPT -->
			<div class="no-alignment">
				<p>This site has no documented alignment in the current canon.</p>
				<p>That doesn't mean nothing is happening in the sky.</p>
				<div class="sky-summary">
					<p><strong>Today's sun:</strong> rise {skySummary.sunrise} · set {skySummary.sunset}</p>
					<p><strong>Daylight:</strong> {skySummary.sunlight}</p>
				</div>
				<p class="keep-prompt">Were you at this site? What did the sky look like? Record a vigil below — non-events are valid entries.</p>
			</div>
		{:else if isFolklore}
			<div class="folklore-notice">
				<p><strong>Traditional/folklore tier.</strong> The alignment at this site is described in tradition but has not been surveyed or published as a specific sightline. Timing is described, not promised.</p>
			</div>
			{#each nextEvents as event}
				<div class="event-card">
					<p class="event-date">Around {event.dateRange}</p>
					<p class="event-desc">{event.windowDescription}</p>
				</div>
			{/each}
		{:else}
			{#each nextEvents as event}
				<div class="event-card">
					<p class="event-badge">{event.eventTime} · {event.daysBefore}/{event.daysAfter} days window</p>
					<p class="event-date">{event.dateRange}</p>
					<p class="event-desc">{event.windowDescription}</p>
				</div>
			{/each}
		{/if}
	</section>

	<!-- VIGIL STATS -->
	{#if vigilStats.total > 0}
		<section class="vigil-stats">
			<h2>Vigil register</h2>
			<div class="stats-banner">
				<p><strong>{vigilStats.total}</strong> vigils kept</p>
				<p>Seen <strong>{vigilStats.ratio ?? 0}%</strong> of attempts</p>
				<p>({vigilStats.seen} seen · {vigilStats.notSeen} not seen)</p>
			</div>
		</section>
	{/if}

	<!-- VIGIL ENTRY -- KEEP THE VIGIL -->
	<section class="vigil-form">
		<h2>Keep the vigil</h2>
		<p class="form-intro">If you visited or plan to visit this site, record what happened — or what didn't. <em>Cloudy counts.</em></p>

		{#if submitted}
			<div class="success">
				<p>Vigil recorded. The register grows.</p>
				<button onclick={() => { submitted = false; }}>Record another</button>
			</div>
		{:else}
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

				<button type="submit">Keep the vigil</button>
			</form>
		{/if}
	</section>

	<!-- RECENT VIGILS -->
	{#if recentVigils.length > 0}
		<section class="vigil-log">
			<h2>Recent vigils</h2>
			{#each recentVigils as entry}
				<div class="vigil-entry">
					<p class="vigil-meta">
						{new Date(entry.visitDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
						{#if entry.visitTime} at {entry.visitTime}{/if}
						—
						{entry.sawEvent ? 'Saw it ✓' : entry.sawEvent === false ? 'Didn\'t see it' : 'Uncertain'}
						· {entry.weather}
						{#if entry.keeperName} · {entry.keeperName}{/if}
					</p>
					<blockquote>{entry.observation}</blockquote>
				</div>
			{/each}
		</section>
	{/if}

{/if}

<style>
	.back-link {
		font-size: 0.85rem;
		color: #5a5550;
		text-decoration: none;
	}

	.back-link:hover {
		color: #1a1a1a;
	}

	.site-header {
		margin: 0.5rem 0 0.75rem 0;
	}

	.site-header h1 {
		margin: 0;
		font-size: 1.5rem;
	}

	.alt-name {
		font-style: italic;
		color: #5a5550;
		margin: 0.25rem 0 0 0;
	}

	.region {
		color: #7a7670;
		font-size: 0.85rem;
		margin: 0.25rem 0 0.5rem 0;
	}

	.badges {
		display: flex;
		gap: 0.4rem;
		margin-bottom: 0.5rem;
	}

	.badge {
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
		background: #e8e4f0;
		color: #5a4a7a;
		border: 1px solid #c4bcd0;
	}

	.description {
		font-size: 0.95rem;
		margin-bottom: 1rem;
	}

	.access {
		font-size: 0.85rem;
		color: #5a5550;
		margin-bottom: 1.5rem;
		padding: 0.75rem;
		background: #f4f2ee;
		border-radius: 4px;
	}

	.access h3 {
		margin: 0 0 0.25rem 0;
		font-size: 0.9rem;
	}

	.access p {
		margin: 0.2rem 0;
	}

	.access-note {
		color: #8a6a3a;
		font-weight: 600;
	}

	.countdown {
		margin-bottom: 1.5rem;
	}

	.countdown h2 {
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
	}

	.folklore-notice {
		font-size: 0.85rem;
		padding: 0.5rem 0.75rem;
		background: #f0ece8;
		border-left: 3px solid #d0c4b0;
		margin-bottom: 0.75rem;
		border-radius: 2px;
	}

	.event-card {
		padding: 0.75rem;
		background: #f4f2ee;
		border-radius: 4px;
		margin-bottom: 0.5rem;
	}

	.event-badge {
		font-size: 0.8rem;
		color: #3a6a3a;
		margin: 0 0 0.25rem 0;
		font-family: monospace;
	}

	.event-date {
		font-size: 0.95rem;
		font-weight: 600;
		margin: 0 0 0.25rem 0;
	}

	.event-desc {
		font-size: 0.85rem;
		color: #5a5550;
		margin: 0;
	}

	.no-alignment {
		padding: 1rem;
		background: #f4f2ee;
		border-radius: 4px;
		border-left: 3px solid #8a8578;
	}

	.sky-summary {
		font-size: 0.9rem;
		margin: 0.5rem 0;
	}

	.keep-prompt {
		font-style: italic;
		color: #5a5550;
	}

	.vigil-stats {
		margin-bottom: 1.5rem;
	}

	.vigil-stats h2 {
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
	}

	.stats-banner {
		display: flex;
		gap: 1.5rem;
		font-size: 0.9rem;
		padding: 0.75rem;
		background: #e8f0e8;
		border-radius: 4px;
	}

	.stats-banner p {
		margin: 0;
	}

	.vigil-form {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: #f4f2ee;
		border-radius: 4px;
	}

	.vigil-form h2 {
		font-size: 1.1rem;
		margin: 0 0 0.25rem 0;
	}

	.form-intro {
		font-size: 0.85rem;
		color: #5a5550;
		margin: 0 0 0.75rem 0;
	}

	.form-error {
		color: #8a3a3a;
		font-size: 0.85rem;
		padding: 0.4rem;
		background: #f0e4e4;
		border-radius: 3px;
	}

	label {
		display: block;
		font-size: 0.85rem;
		margin-bottom: 0.5rem;
		color: #5a5550;
	}

	.required {
		color: #8a3a3a;
	}

	select, input, textarea {
		display: block;
		width: 100%;
		margin-top: 0.15rem;
		padding: 0.35rem 0.5rem;
		font-family: Georgia, serif;
		font-size: 0.9rem;
		border: 1px solid #d4d0c8;
		border-radius: 3px;
		background: white;
		box-sizing: border-box;
	}

	textarea {
		resize: vertical;
	}

	button {
		margin-top: 0.5rem;
		padding: 0.5rem 1rem;
		font-family: Georgia, serif;
		font-size: 0.9rem;
		background: #1a1a1a;
		color: #faf9f5;
		border: none;
		border-radius: 3px;
		cursor: pointer;
	}

	button:hover {
		background: #3a3a3a;
	}

	.success {
		padding: 0.75rem;
		background: #e8f0e8;
		border-radius: 4px;
	}

	.success p {
		margin: 0 0 0.5rem 0;
	}

	.success button {
		background: #3a6a3a;
	}

	.vigil-log {
		margin-bottom: 1.5rem;
	}

	.vigil-log h2 {
		font-size: 1.1rem;
		margin-bottom: 0.5rem;
	}

	.vigil-entry {
		padding: 0.5rem 0;
		border-bottom: 1px solid #eae8e4;
	}

	.vigil-entry:last-child {
		border-bottom: none;
	}

	.vigil-meta {
		font-size: 0.8rem;
		color: #7a7670;
		margin: 0 0 0.25rem 0;
	}

	blockquote {
		margin: 0;
		font-size: 0.9rem;
		color: #3a3a3a;
		font-style: italic;
		padding-left: 0.5rem;
		border-left: 2px solid #d4d0c8;
	}

	.error {
		text-align: center;
		padding: 2rem;
	}
</style>