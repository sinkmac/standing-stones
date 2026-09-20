<script lang="ts">
	// Drag-to-match horizon — the signature interaction.
	//
	// A SCHEMATIC line, not a rendering; an alignment aid, not a picture of the
	// skyline. The visitor drags the profile until it sits on the ridge they can
	// see, then says so. NOTHING HERE SCORES IT, CONFIRMS IT, OR CALLS IT CORRECT —
	// the match is the visitor's own judgement, and the expected band simply
	// appears against the profile once they say they are matched.
	//
	// WHAT THIS DOES NOT TEST: whether the profile matches any real site's ridge.
	// The profile is generic. That is a content check on one site and waits for a
	// first real vigil there.
	import { FIELD_COPY } from '$lib/fieldCopy';
	import { angleDiff, declinationAt, magneticToTrue, type DeclinationEntry } from '$lib/declination';

	interface Props {
		bearingDeg: number;
		horizonAltitudeDeg: number;
		headingMagnetic: number | null;
		declination: DeclinationEntry | null;
		now: Date;
		matched?: boolean;
		offset?: number;
	}
	let {
		bearingDeg,
		horizonAltitudeDeg,
		headingMagnetic,
		declination,
		now,
		matched = $bindable(false),
		offset = $bindable(0)
	}: Props = $props();

	const HALF_DEG = 8; // half-width of the expected band
	const UNITS_PER_DEG = 10; // strip units per degree of azimuth
	const MAX_ALT_DEG = 25;

	// A generic schematic ridge — a ramp with one clear summit, so there is a
	// shape to line up rather than a flat edge.
	const RIDGE: [number, number][] = [
		[-320, 6], [-180, 8.5], [-60, 7], [40, 11], [140, 14.5], [220, 12],
		[300, 18.5], [380, 16], [470, 21], [560, 17], [660, 13], [780, 15.5],
		[900, 10], [1050, 12.5], [1320, 9]
	];

	function yOf(altDeg: number): number {
		return 320 - (altDeg / MAX_ALT_DEG) * 280;
	}
	const ridgePoints = RIDGE.map(([x, a]) => `${x},${yOf(a)}`).join(' ');
	const ridgePoly = `${ridgePoints} 1320,320 -320,320`;
	const horizonY = $derived(yOf(horizonAltitudeDeg));

	const dec = $derived(declination ? declinationAt(declination, now) : null);
	// The frame's centre is where the phone points when a heading is known,
	// otherwise the record's bearing (so the band sits at the strip centre and the
	// visitor's own match carries it).
	const frameCentre = $derived(
		headingMagnetic !== null ? magneticToTrue(headingMagnetic, dec ?? 0) : bearingDeg
	);
	const bandCentreX = $derived(500 + angleDiff(bearingDeg, frameCentre) * UNITS_PER_DEG);

	let svgEl: SVGSVGElement | undefined = $state();
	let dragging = $state(false);
	let startClientX = 0;
	let startOffset = 0;

	function clampOffset(v: number): number {
		return Math.max(-450, Math.min(450, v));
	}
	function nudge(delta: number) {
		matched = false;
		offset = clampOffset(offset + delta);
	}
	function onDown(e: PointerEvent) {
		dragging = true;
		matched = false;
		startClientX = e.clientX;
		startOffset = offset;
		(e.currentTarget as Element).setPointerCapture?.(e.pointerId);
	}
	function onMove(e: PointerEvent) {
		if (!dragging || !svgEl) return;
		const rect = svgEl.getBoundingClientRect();
		const unitsPerPx = 1000 / rect.width;
		offset = clampOffset(startOffset + (e.clientX - startClientX) * unitsPerPx);
	}
	function onUp(e: PointerEvent) {
		dragging = false;
		(e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
	}
</script>

<section class="match">
	<h2>{FIELD_COPY.matchHeading}</h2>
	<p class="intro">{FIELD_COPY.matchIntro}</p>

	<svg
		bind:this={svgEl}
		viewBox="0 0 1000 320"
		preserveAspectRatio="none"
		class="strip"
		class:dragging
		role="img"
		aria-label="Schematic ridge profile to align with the horizon"
		onpointerdown={onDown}
		onpointermove={onMove}
		onpointerup={onUp}
		onpointercancel={onUp}
	>
		<!-- horizon reference -->
		<line x1="0" y1={horizonY} x2="1000" y2={horizonY} class="horizon" />
		<!-- the terrain profile the visitor drags -->
		<g transform="translate({offset},0)">
			<polygon points={ridgePoly} class="terrain-fill" />
			<polyline points={ridgePoints} class="terrain" />
		</g>
		<!-- the expected band, only once the visitor says they are matched -->
		{#if matched}
			<rect
				x={bandCentreX - HALF_DEG * UNITS_PER_DEG}
				y="0"
				width={HALF_DEG * 2 * UNITS_PER_DEG}
				height="320"
				class="band"
			/>
			<line x1={bandCentreX} y1="0" x2={bandCentreX} y2="320" class="band-mark" />
		{/if}
		<!-- where the phone points / the view centre -->
		<line x1="500" y1="0" x2="500" y2="320" class="facing" />
	</svg>

	<div class="controls">
		<button type="button" class="nudge" onclick={() => nudge(-40)} aria-label={FIELD_COPY.matchNudgeLeft}>◀</button>
		<button type="button" class="nudge" onclick={() => nudge(40)} aria-label={FIELD_COPY.matchNudgeRight}>▶</button>
		<button type="button" class="mark-matched" onclick={() => (matched = true)} disabled={matched}>
			{FIELD_COPY.matchDone}
		</button>
	</div>

	{#if matched}
		<p class="band-label">{FIELD_COPY.matchBandLabel}</p>
		<p class="note">{FIELD_COPY.matchBandNote}</p>
	{:else}
		<p class="note">{FIELD_COPY.matchNoBand}</p>
	{/if}
</section>

<style>
	.match {
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 0.9rem 1rem 1rem;
	}
	h2 {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		margin: 0 0 0.5rem;
		color: var(--muted);
	}
	.intro {
		margin: 0 0 0.75rem;
		font-size: 0.92rem;
		color: var(--ink);
		line-height: 1.45;
	}
	.strip {
		display: block;
		width: 100%;
		height: 200px;
		background: var(--ground);
		border: 1px solid var(--line);
		border-radius: 6px;
		touch-action: none;
		cursor: grab;
	}
	.strip.dragging {
		cursor: grabbing;
	}
	.horizon {
		stroke: var(--muted);
		stroke-width: 1;
		stroke-dasharray: 6 6;
		opacity: 0.6;
	}
	.terrain {
		fill: none;
		stroke: var(--ink);
		stroke-width: 3;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.terrain-fill {
		fill: color-mix(in srgb, var(--ink) 10%, transparent);
		stroke: none;
	}
	.band {
		fill: color-mix(in srgb, var(--accent) 24%, transparent);
	}
	.band-mark {
		stroke: var(--accent);
		stroke-width: 2;
	}
	.facing {
		stroke: var(--muted);
		stroke-width: 1.5;
		opacity: 0.8;
	}
	.controls {
		display: flex;
		gap: 0.6rem;
		margin-top: 0.75rem;
	}
	.nudge {
		min-width: 72px;
		min-height: 64px;
		font-size: 1.6rem;
		font-family: inherit;
		color: var(--ink);
		background: var(--raised);
		border: 1px solid var(--line);
		border-radius: 6px;
		cursor: pointer;
	}
	.mark-matched {
		flex: 1;
		min-height: 64px;
		font-size: 1rem;
		font-family: inherit;
		font-weight: 600;
		color: var(--accentInk);
		background: var(--accent);
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}
	.mark-matched:disabled {
		opacity: 0.55;
		cursor: default;
	}
	.band-label {
		margin: 0.7rem 0 0;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--accent);
	}
	.note {
		margin: 0.35rem 0 0;
		font-size: 0.8rem;
		color: var(--muted);
		line-height: 1.45;
	}
</style>
