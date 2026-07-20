<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<meta name="description" content="Countdown and witness tool for solar and lunar alignments at standing stones and stone circles." />
</svelte:head>

<header>
	<a href="/" class="site-title">Standing Stones & Alignments</a>
	<nav>
		<a href="/">Sites</a>
	</nav>
</header>

<main>
	{@render children()}
</main>

<footer>
	<p>Not a heritage directory. A countdown and witness tool for the sky.</p>
	<p>Non-events are valid entries. The register is the moat.</p>
</footer>

<style>
	:global(body) {
		font-family: Georgia, 'Times New Roman', Times, serif;
		max-width: min(54ch, 96vw);
		margin: 0 auto;
		padding: 1rem;
		background: #faf9f5;
		color: #1a1a1a;
		line-height: 1.6;
	}

	header {
		border-bottom: 1px solid #d4d0c8;
		padding-bottom: 0.75rem;
		margin-bottom: 1.5rem;
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.site-title {
		font-size: 1.25rem;
		font-weight: normal;
		text-decoration: none;
		color: #1a1a1a;
	}

	nav a {
		margin-left: 1rem;
		color: #5a5550;
		text-decoration: none;
		font-size: 0.9rem;
	}

	nav a:hover {
		color: #1a1a1a;
	}

	footer {
		margin-top: 3rem;
		padding-top: 1rem;
		border-top: 1px solid #d4d0c8;
		font-size: 0.8rem;
		color: #7a7670;
	}

	footer p {
		margin: 0.25rem 0;
	}
</style>