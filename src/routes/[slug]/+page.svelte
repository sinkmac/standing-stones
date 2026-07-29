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
		let ancestralSky = $derived(data.ancestralSky);

	$effect(() => {
		// Dark-sky section: toggle .sky-dark on scroll
		const skyEl = document.querySelector('.enrichment-dark-sky');
		if (skyEl) {
			const field = document.createElement('div');
			field.className = 'star-field';
			for (let i = 0; i < 28; i++) {
				const s = document.createElement('div');
				s.className = 'star';
				s.style.left = Math.random() * 100 + '%';
				s.style.top = Math.random() * 100 + '%';
				s.style.opacity = (0.3 + Math.random() * 0.7).toFixed(2);
				s.style.width = s.style.height = Math.random() > 0.7 ? '3px' : '2px';
				field.appendChild(s);
			}
			skyEl.prepend(field);
		}

		const skyObs = new IntersectionObserver((entries) => {
			entries.forEach(e => {
				if (e.intersectionRatio >= 0.3) {
					e.target.classList.add('sky-dark');
				} else {
					e.target.classList.remove('sky-dark');
				}
			});
		}, { threshold: [0.3, 0.5] });

		if (skyEl) skyObs.observe(skyEl);

		// Countdown: fade-in on first scroll
		let countdownDone = false;
		const cdEl = document.querySelector('.countdown');
		const cdObs = new IntersectionObserver((entries) => {
			entries.forEach(e => {
				if (e.isIntersecting && !countdownDone) {
					countdownDone = true;
					e.target.classList.remove('countdown-hidden');
					animateDays(e.target);
					cdObs.disconnect();
				}
			});
		}, { threshold: 0.3 });

		if (cdEl) cdObs.observe(cdEl);

		function animateDays(cdEl) {
			const badge = cdEl.querySelector('.event-badge');
			if (!badge) return;
			const match = badge.textContent.match(/(\d+)\/(\d+)\s+days/);
			if (!match) return;
			const target = parseInt(match[1], 10);
			if (!target || target === 0) return;
			const span = document.createElement('span');
			span.textContent = '0';
			badge.textContent = '';
			badge.appendChild(span);
			let start = null;
			function tick(ts) {
				if (!start) start = ts;
				const p = Math.min((ts - start) / 1200, 1);
				const ease = 1 - Math.pow(1 - p, 3);
				span.textContent = Math.round(ease * target) + '/' + match[2] + ' days window';
				if (p < 1) requestAnimationFrame(tick);
				else span.textContent = match[1] + '/' + match[2] + ' days window';
			}
			requestAnimationFrame(tick);
		}

		return () => {
			skyObs.disconnect();
			cdObs.disconnect();
		};
	});
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

	<!-- THE APPROACH -->
	{#if site.enrichment?.approach}
		<div class="enrichment-approach">
			<h3>The approach</h3>
			<p>{site.enrichment.approach}</p>
		</div>
	{/if}

	<!-- DARK SKY -->
	{#if site.enrichment?.darkSky}
		<div class="enrichment-dark-sky">
			<h3>Dark sky</h3>
			<p>{site.enrichment.darkSky}</p>
		</div>
	{/if}

	<!-- COUNTDOWN SECTION -->
	<section class="countdown countdown-hidden">
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

	<!-- ANCESTRAL-SKY DRIFT (only for eligible sites) -->
		{#if ancestralSky}
			<section class="ancestral-sky">
				<h2>Ancestral sky</h2>
				<p class="guardrail">{ancestralSky.guardrail}</p>
				<div class="band-description">
					<p><strong>Drift across the construction window:</strong> {ancestralSky.bandDescription}</p>
				</div>
				{#if ancestralSky.scrubAvailable}
					<p class="scrub-note">The optional date scrub control can show specific star positions within this window.</p>
				{/if}
			</section>
		{/if}

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

	.ancestral-sky {
		margin-bottom: 1.5rem;
		padding: 0.75rem;
		background: #eeecf0;
		border-radius: 4px;
		border-left: 3px solid #9a8ab0;
	}

	.ancestral-sky h2 {
		font-size: 1.1rem;
		margin: 0 0 0.5rem 0;
	}

	.guardrail {
		font-size: 0.85rem;
		font-style: italic;
		color: #5a4a7a;
		margin: 0 0 0.5rem 0;
		line-height: 1.5;
	}

	.band-description {
		font-size: 0.9rem;
		margin-bottom: 0.25rem;
	}

	.band-description p {
		margin: 0;
	}

	.scrub-note {
		font-size: 0.8rem;
		color: #7a7670;
		margin: 0.25rem 0 0 0;
	}

	.enrichment-approach {
		font-size: 0.85rem;
		color: #5a5550;
		margin-bottom: 1.5rem;
		padding: 0.75rem;
		background: #f4f2ee;
		border-radius: 4px;
	}

	.enrichment-approach h3 {
		margin: 0 0 0.25rem 0;
		font-size: 0.9rem;
		color: #3a3a3a;
	}

	.enrichment-approach p {
		margin: 0;
	}

	.enrichment-dark-sky {
		font-size: 0.85rem;
		color: #5a5550;
		margin-bottom: 1.5rem;
		padding: 0.75rem;
		background: #f0f0ec;
		border-radius: 4px;
		border-left: 3px solid #9a9a8a;
		transition: background 0.8s ease, border-color 0.8s ease;
		position: relative;
		overflow: hidden;
	}

	.enrichment-dark-sky h3 {
		margin: 0 0 0.25rem 0;
		font-size: 0.9rem;
		color: #3a3a3a;
	}

	.enrichment-dark-sky p {
		margin: 0;
	}

	.enrichment-dark-sky.sky-dark {
		background: #0d1117;
		border-color: #2a3040;
		border-left-color: #3a4a60;
	}

	.enrichment-dark-sky.sky-dark h3 {
		color: #4a5568;
	}

	.enrichment-dark-sky.sky-dark p {
		color: #8a9bb5;
		transition: color 0.8s ease;
	}

	.star-field {
		position: absolute;
		top: 0; left: 0; right: 0; bottom: 0;
		pointer-events: none;
		opacity: 0;
		transition: opacity 1.2s ease;
	}

	.star-field .star {
		position: absolute;
		width: 2px;
		height: 2px;
		border-radius: 50%;
		background: white;
	}

	.enrichment-dark-sky.sky-dark .star-field {
		opacity: 1;
	}

	.countdown-hidden {
		opacity: 0;
		transform: translateY(16px);
		transition: opacity 0.9s ease, transform 0.9s ease;
	}
</style>