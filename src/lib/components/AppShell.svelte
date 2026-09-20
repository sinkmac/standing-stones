<script lang="ts">
	// The app shell — it takes a Site record and NOTHING else. What kind of
	// appointment the site has is read from its alignment data, so this component
	// has no knowledge of any particular site.
	import type { AppSite } from '$lib/appData';
	import { nextAppointment } from '$lib/appShell';

	let { site }: { site: AppSite } = $props();

	let now = $state(new Date());
	let online = $state(true);
	let appt = $derived(nextAppointment(site, now));

	$effect(() => {
		online = navigator.onLine;
		const on = () => (online = true);
		const off = () => (online = false);
		window.addEventListener('online', on);
		window.addEventListener('offline', off);
		const t = setInterval(() => (now = new Date()), 30_000);
		return () => {
			window.removeEventListener('online', on);
			window.removeEventListener('offline', off);
			clearInterval(t);
		};
	});

	let coordLine = $derived(
		`${Math.abs(site.latitude).toFixed(3)}°${site.latitude < 0 ? 'S' : 'N'} ` +
		`${Math.abs(site.longitude).toFixed(3)}°${site.longitude < 0 ? 'W' : 'E'}`
	);
</script>

<article class="shell" data-character={site.character} data-slug={site.slug}>
	<header>
		<h1>{site.name}</h1>
		<p class="region">{site.region} · {coordLine}</p>
	</header>

	{#if appt.kind === 'lunar'}
		<section class="next">
			<p class="label">{appt.label}</p>
			<p class="when">{appt.dateRange}</p>
			<p class="window">{appt.window}</p>
			<p class="desc">{appt.windowDescription}</p>
		</section>
	{:else if appt.kind === 'solar'}
		<section class="next">
			<p class="label">{appt.label}</p>
			<p class="desc">{appt.windowDescription}</p>
		</section>
	{:else}
		<section class="next">
			<p class="desc">No upcoming appointment is available for this site.</p>
		</section>
	{/if}

	{#if !online}
		<p class="offline" role="status">No signal — showing the last calculation made on this device.</p>
	{/if}

	<p class="trust">Times and places you record are taken as given. Nothing here is verified.</p>
</article>

<style>
	.shell {
		max-width: 40rem;
		margin: 0 auto;
		padding: 1.5rem 1.25rem 3rem;
		color: #eef1f8;
		background: #04060e;
		min-height: 100vh;
	}
	h1 { font-size: 1.5rem; margin: 0 0 0.25rem; font-weight: 600; }
	.region { margin: 0 0 2rem; color: #8e9ab5; font-size: 0.9rem; }
	.next { border-top: 1px solid #1d2740; padding-top: 1.25rem; }
	.label {
		margin: 0 0 0.5rem; font-size: 0.75rem; letter-spacing: 0.09em;
		text-transform: uppercase; color: #b0a36a;
	}
	.when { margin: 0 0 0.25rem; font-size: 1.35rem; font-weight: 600; }
	.window { margin: 0 0 0.75rem; font-size: 1.05rem; color: #d9c27a; font-family: ui-monospace, monospace; }
	.desc { margin: 0; font-size: 0.95rem; line-height: 1.5; color: #b9c2d4; }
	.offline { margin-top: 1.5rem; font-size: 0.9rem; color: #d9c27a; }
	.trust { margin-top: 2.5rem; font-size: 0.8rem; color: #6f7b96; }
</style>
