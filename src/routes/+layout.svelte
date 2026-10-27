<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<meta name="description" content="Standing Stones — ancient places, extraordinary light." />
</svelte:head>

<main>
	{@render children()}
</main>

<footer class="app-footer">
	<p>Ancient places. Extraordinary light.</p>
	<p>A field guide for the curious. Leave the stones as you found them.</p>
</footer>

<style>
	@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Libre+Caslon+Display&display=swap');

	:global(body) {
		margin: 0;
		background: #111d1e;
		color: #f0ede3;
		font: 15px/1.65 'DM Sans', Arial, sans-serif;
		line-height: 1.6;
	}
	h1, h2, h3 { margin-top: 0 }

	main { min-height: 60vh }

	.app-footer {
		margin-top: 4rem;
		padding: 3rem 6%;
		border-top: 1px solid #ffffff20;
		font-size: 12px;
		color: #a9b4ad;
	}
	.app-footer p { margin: 0.25rem 0 }
</style>
