<script lang="ts">
	// Full-bleed sky hero — the whole page is the sky. Pure CSS/SVG, no images.
	// Palette comes from the parent via a 6-band array (matches SKY_BANDS).
	// Redesign of the original thin banded strip; scaled monoliths sit in the
	// foreground, a dashed arc marks the alignment setting point.
	// link to canon-avoidance: this is per-site palette, drawn from alignment
	// light (skyPalette.ts), rotation/state logic untouched.

	let { bands = [], siteId = 'callanish' }: { bands: string[]; siteId?: string } = $props();

	let skyStyle = $derived(
		bands.length
			? [1, 2, 3, 4, 5, 6]
					.map((n) => `--sky-band-${n}:${bands[n - 1]}`)
					.join(';')
			: ''
	);

	// Sparse, deterministic star field — seeded off the site id so it's stable
	// per site (no layout shift between renders), not random per page view.
	let seed = $derived(
		[...siteId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
	);
	let stars = $derived(
		Array.from({ length: 18 }, (_, i) => {
			const n = (seed + i * 37) % 271;
			return {
				left: (n % 100),
				top: ((n * 7) % 46), // upper half of the sky only
				delay: (n % 90) / 10,
				size: n % 3 === 0 ? 2 : 1.4
			};
		})
	);
</script>

<div class="heroshell" class:no-bands={!bands.length} aria-hidden="true">
	{#if bands.length}
		<div class="sky" style={skyStyle}>
			<div class="band" style="background: var(--sky-band-1)"></div>
			<div class="band" style="background: var(--sky-band-2)"></div>
			<div class="band" style="background: var(--sky-band-3)"></div>
			<div class="band" style="background: var(--sky-band-4)"></div>
			<div class="band" style="background: var(--sky-band-5)"></div>
			<div class="band" style="background: var(--sky-band-6)"></div>

			<div class="stars">
				{#each stars as s}
					<span
						class="star"
						style="left:{s.left}%; top:{s.top}%; width:{s.size}px; height:{s.size}px; --d:{s.delay}s"
					></span>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Foreground standing stones — large, near, monumental -->
	<svg class="stones" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true">
		<path
			d="M0 200 L0 150 L46 148 L46 200 Z
			   M150 200 L150 118 L206 112 L206 200 Z
			   M270 200 L270 158 L318 154 L318 200 Z
			   M400 200 L400 170 L452 166 L452 200 Z
			   M620 200 L620 96 L688 88 L688 200 Z
			   M760 200 L760 140 L814 134 L814 200 Z
			   M910 200 L910 120 L972 112 L972 200 Z
			   M1020 200 L1020 152 L1072 150 L1072 200 Z
			   L1200 200 Z"
			fill="var(--mono, #0a0d12)"
		/>
	</svg>

	<!-- Dashed alignment arc: from upper sky down to the gap between stones -->
	<svg class="arc" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true">
		<path
			d="M600 20 C 560 90, 560 140, 505 160"
			fill="none"
			stroke="var(--arc, #cfd6e8)"
			stroke-width="2"
			stroke-dasharray="8 8"
			stroke-linecap="round"
			opacity="0.8"
		/>
		<circle cx="505" cy="160" r="4" fill="none" stroke="var(--arc, #cfd6e8)" stroke-width="2" opacity="0.9" />
	</svg>
</div>

<style>
	.heroshell {
		--mono: #0a0d12;
		position: relative;
		width: 100vw;
		margin-left: calc(50% - 50vw);
		height: clamp(240px, 38vh, 42vh);
		min-height: 240px;
		overflow: hidden;
		margin-bottom: 2rem;
	}
	.sky {
		position: absolute;
		inset: 0;
	}
	.band {
		position: absolute;
		left: 0;
		width: 100%;
	}
	.band:nth-child(1) { top: 0; height: 22%; }
	.band:nth-child(2) { top: 22%; height: 20%; }
	.band:nth-child(3) { top: 42%; height: 20%; }
	.band:nth-child(4) { top: 62%; height: 16%; }
	.band:nth-child(5) { top: 78%; height: 12%; }
	.band:nth-child(6) { top: 90%; height: 10%; }

	.stars {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 46%;
		overflow: hidden;
	}
	.star {
		position: absolute;
		background: #cdd2db;
		border-radius: 50%;
		opacity: 0.55;
		animation: twinkle 4s ease-in-out infinite alternate;
		animation-delay: var(--d, 0s);
	}
	@keyframes twinkle {
		from { opacity: 0.35; }
		to   { opacity: 0.9; }
	}
	/* Respect reduced motion — stars hold still. */
	@media (prefers-reduced-motion: reduce) {
		.star { animation: none; opacity: 0.6; }
	}

	.stones {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}
	.arc {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}
</style>