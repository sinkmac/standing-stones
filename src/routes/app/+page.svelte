<script lang="ts">
	// The installable app. A route on the existing site, not a separate app.
	// Nothing here changes what a non-installed visitor to the site sees.
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { allAppSites, getAppSite, siteData } from '$lib/appData';
	import { registerAppShellServiceWorker, applyKillSwitchIfPresent, SW_ENABLED } from '$lib/pwa';
	import AppShell from '$lib/components/AppShell.svelte';

	const sites = allAppSites();
	const fallback = sites.find(s => s.character === 'moonlit')?.slug ?? sites[0]?.slug;

	let slug = $derived(page.url.searchParams.get('site') ?? fallback);
	let site = $derived(getAppSite(slug) ?? sites[0]);
	let swState = $state<string>('idle');

	// Client-only: the kill switch first (if /sw-kill.json is present, uninstall and
	// reload), then registration, which is a no-op unless the build flag is on.
	onMount(async () => {
		if (await applyKillSwitchIfPresent()) {
			location.reload();
			return;
		}
		// __BUILD_ID__ changes every deploy, so a fixed worker actually replaces the
		// old one on the device. (The canon hash does not change per deploy and would
		// have left a stale worker in place.)
		swState = await registerAppShellServiceWorker(__BUILD_ID__);
	});
</script>

<svelte:head>
	<title>Standing Stones: Vigil</title>
	<meta name="description" content="A calendar of ancient appointments." />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content="#04060e" />
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
</svelte:head>

{#if site}
	<AppShell {site} />

	<nav class="switch">
		{#each sites as s}
			<a href="/app?site={s.slug}" aria-current={s.slug === site.slug}>{s.name}</a>
		{/each}
	</nav>

	<p class="pwa">
		Service worker: <strong>{SW_ENABLED ? `enabled (${swState})` : 'disabled (build flag off)'}</strong>
		· site data {siteData.canonHash}
	</p>
{/if}

<style>
	.switch {
		max-width: 40rem;
		margin: 0 auto;
		padding: 0 1.25rem 1.5rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		background: #04060e;
	}
	.switch a { color: #8e9ab5; text-decoration: none; font-size: 0.85rem; padding: 0.5rem 0; }
	.switch a[aria-current='true'] { color: #d9c27a; }
	.pwa {
		max-width: 40rem;
		margin: 0 auto;
		padding: 0 1.25rem 2rem;
		color: #55607a;
		font-size: 0.75rem;
	}
</style>