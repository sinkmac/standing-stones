<script lang="ts">
	// Orientation band — "are you facing the right part of the horizon?"
	//
	// A BAND, never a line, and never a degree readout to the visitor. True north
	// where a declination is measured for this position, magnetic (labelled) where
	// it is not. If permission is refused, or there is no compass, this degrades to
	// a plain statement and the drag-to-match carries the screen — never an error.
	import { FIELD_COPY } from '$lib/fieldCopy';
	import { angleDiff, declinationAt, magneticToTrue, type DeclinationEntry } from '$lib/declination';
	import type { HeadingStatus } from '$lib/orientation';

	interface Props {
		bearingDeg: number;
		headingMagnetic: number | null;
		headingStatus: HeadingStatus;
		declination: DeclinationEntry | null;
		now: Date;
		needsTap: boolean;
		onGrant: () => void;
	}
	let { bearingDeg, headingMagnetic, headingStatus, declination, now, needsTap, onGrant }: Props = $props();

	const HALF_DEG = 10; // tolerance half-width of the band
	const TAPE_HALF_DEG = 60; // how much of the arc the tape shows either side

	const dec = $derived(declination ? declinationAt(declination, now) : null);
	const trueHeading = $derived(
		headingMagnetic === null ? null : magneticToTrue(headingMagnetic, dec ?? 0)
	);
	const hasReading = $derived(headingMagnetic !== null && trueHeading !== null);
	const diff = $derived(trueHeading === null ? 0 : angleDiff(bearingDeg, trueHeading));
	const corrected = $derived(dec !== null);

	const verdict = $derived.by(() => {
		if (Math.abs(diff) <= HALF_DEG) return FIELD_COPY.orientationRight;
		return diff < 0 ? FIELD_COPY.orientationLeft : FIELD_COPY.orientationTurnRight;
	});

	const inBand = $derived(Math.abs(diff) <= HALF_DEG);

	/** Tape position as a percentage, clamped to the visible arc. */
	function pct(azimuth: number): number {
		const d = angleDiff(azimuth, trueHeading ?? bearingDeg);
		const clamped = Math.max(-TAPE_HALF_DEG, Math.min(TAPE_HALF_DEG, d));
		return 50 + (clamped / TAPE_HALF_DEG) * 50;
	}

	const targetPct = $derived(pct(bearingDeg));
	const bandLeftPct = $derived(pct(bearingDeg - HALF_DEG));
	const bandRightPct = $derived(pct(bearingDeg + HALF_DEG));
	const northPct = $derived(pct(0));
	const targetOffTape = $derived(Math.abs(angleDiff(bearingDeg, trueHeading ?? bearingDeg)) > TAPE_HALF_DEG);
</script>

<section class="orientation" aria-label={FIELD_COPY.orientationHeading}>
	<h2>{FIELD_COPY.orientationHeading}</h2>

	{#if headingStatus === 'unsupported'}
		<p class="fallback">{FIELD_COPY.orientationUnavailable}</p>
	{:else if needsTap && !hasReading}
		<button type="button" class="grant" onclick={onGrant}>{FIELD_COPY.orientationGrant}</button>
		<p class="note">{FIELD_COPY.orientationGrantNote}</p>
	{:else if !hasReading}
		<p class="fallback">{FIELD_COPY.orientationUnavailable}</p>
	{:else}
		<p class="verdict" class:in-band={inBand}>{verdict}</p>

		<div class="tape" role="img" aria-label="Direction tape">
			<div class="band" style="left:{bandLeftPct}%; width:{Math.max(0, bandRightPct - bandLeftPct)}%"></div>
			<div class="north" style="left:{northPct}%"><span>N</span></div>
			<div class="target" class:off={targetOffTape} style="left:{targetPct}%"></div>
			<div class="you" style="left:50%"></div>
		</div>
		<p class="legend">
			<span class="dot you-dot"></span> You are facing
			<span class="dot target-dot"></span> {FIELD_COPY.orientationTarget}
		</p>

		<p class="north-label">
			{corrected ? FIELD_COPY.orientationTrue : FIELD_COPY.orientationMagnetic}
		</p>
		{#if !corrected}
			<p class="note">{FIELD_COPY.orientationNoCorrection}</p>
		{/if}
	{/if}
</section>

<style>
	.orientation {
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 0.9rem 1rem 1rem;
	}
	h2 {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		margin: 0 0 0.6rem;
		color: var(--muted);
	}
	.verdict {
		font-size: 1.6rem;
		font-weight: 600;
		margin: 0 0 0.9rem;
		color: var(--ink);
	}
	.verdict.in-band {
		color: var(--accent);
	}
	.tape {
		position: relative;
		height: 84px;
		background: var(--ground);
		border: 1px solid var(--line);
		border-radius: 6px;
		overflow: hidden;
	}
	.band {
		position: absolute;
		top: 0;
		bottom: 0;
		background: color-mix(in srgb, var(--accent) 26%, transparent);
		border-left: 1px solid var(--accent);
		border-right: 1px solid var(--accent);
	}
	.north,
	.target,
	.you {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 0;
	}
	.north {
		border-left: 1px dashed var(--muted);
	}
	.north span {
		position: absolute;
		top: 2px;
		left: 3px;
		font-size: 0.7rem;
		color: var(--muted);
	}
	.target {
		border-left: 3px solid var(--accent);
	}
	.target.off {
		border-left-style: dotted;
	}
	.you {
		border-left: 2px solid var(--ink);
	}
	.legend {
		margin: 0.5rem 0 0;
		font-size: 0.8rem;
		color: var(--muted);
	}
	.dot {
		display: inline-block;
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		margin-right: 0.25rem;
	}
	.you-dot {
		background: var(--ink);
	}
	.target-dot {
		background: var(--accent);
		margin-left: 0.75rem;
	}
	.north-label {
		margin: 0.6rem 0 0;
		font-size: 0.78rem;
		color: var(--muted);
	}
	.note {
		margin: 0.35rem 0 0;
		font-size: 0.78rem;
		color: var(--muted);
	}
	.fallback {
		margin: 0;
		font-size: 0.95rem;
		color: var(--ink);
	}
	.grant {
		min-height: 56px;
		width: 100%;
		font-size: 1rem;
		font-family: inherit;
		color: var(--accentInk);
		background: var(--accent);
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}
</style>
