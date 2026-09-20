<script lang="ts">
	// The vigil sequence: prepare -> countdown -> field -> record -> saved.
	//
	// Traversable with no signal, and re-enterable at any point without losing
	// state: the whole sequence is persisted on every change (vigilSequence.ts),
	// so closing the app, losing power mid-entry, or reopening hours later
	// resumes where it stopped. Nothing in this flow touches the network.
	import { onMount, untrack } from 'svelte';
	import type { AppSite } from '$lib/appData';
	import { nextAppointment, primaryAlignment } from '$lib/appShell';
	import { declinationFor } from '$lib/declination';
	import {
		headingSupported,
		needsTapPermission,
		requestHeadingPermission,
		startHeading,
		type HeadingStatus
	} from '$lib/orientation';
	import { observationStore, newObservationId, type SavedObservation } from '$lib/observation';
	import { sequenceStore, SEQUENCE_STEPS, defaultSequence, type SequenceState, type SequenceStep } from '$lib/vigilSequence';
	import { FIELD_PALETTE, NIGHT_PALETTE } from '$lib/fieldPalette';
	import { FIELD_COPY, STEP_LABELS } from '$lib/fieldCopy';
	import OrientationBand from './OrientationBand.svelte';
	import HorizonMatch from './HorizonMatch.svelte';
	import ObservationRecord from './ObservationRecord.svelte';

	let { site }: { site: AppSite } = $props();

	let seq = $state<SequenceState>(untrack(() => sequenceStore.load(site.slug)));
	let now = $state(new Date());
	let savedCount = $state(0);

	let headingMagnetic = $state<number | null>(null);
	let headingStatus = $state<HeadingStatus>('idle');
	let tapNeeded = $state(false);
	let stopHeading: (() => void) | null = null;

	const appt = $derived(nextAppointment(site, now));
	const primary = $derived(primaryAlignment(site));
	const bearingDeg = $derived(primary?.bearing ?? 0);
	const horizonAltitudeDeg = $derived(primary?.horizonAltitude ?? 0);
	const declination = $derived(declinationFor(site.latitude, site.longitude));
	const palette = $derived(seq.fieldMode ? FIELD_PALETTE : NIGHT_PALETTE);
	const paletteStyle = $derived(
		`--ground:${palette.ground};--surface:${palette.surface};--raised:${palette.raised};` +
			`--line:${palette.line};--ink:${palette.ink};--muted:${palette.muted};` +
			`--accent:${palette.accent};--accentInk:${palette.accentInk};`
	);
	const stepIndex = $derived(SEQUENCE_STEPS.indexOf(seq.step));

	// Persist on every change — re-entry must never lose state.
	$effect(() => {
		sequenceStore.save(seq);
	});

	$effect(() => {
		const t = setInterval(() => (now = new Date()), 1000);
		return () => clearInterval(t);
	});

	function beginHeading() {
		if (stopHeading) return;
		stopHeading = startHeading(
			(h) => (headingMagnetic = h),
			(s) => {
				headingStatus = s;
				if (s === 'listening') tapNeeded = false;
			}
		);
	}

	async function grantHeading() {
		const res = await requestHeadingPermission();
		headingStatus = res;
		if (res === 'listening') {
			tapNeeded = false;
			beginHeading();
		}
	}

	onMount(() => {
		savedCount = observationStore.countObservations();
		if (!headingSupported()) {
			headingStatus = 'unsupported';
			return;
		}
		if (needsTapPermission()) {
			tapNeeded = true;
		} else {
			beginHeading();
		}
		return () => {
			stopHeading?.();
		};
	});

	function go(step: SequenceStep) {
		seq.step = step;
	}

	function restart() {
		const fm = seq.fieldMode;
		seq = { ...defaultSequence(site.slug), fieldMode: fm };
	}

	function deviceTimeLabel(d: Date): string {
		return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
	}

	/** Best-effort device position. Never blocks or fails the save; null is fine. */
	async function devicePosition(): Promise<{ latitude: number; longitude: number } | null> {
		if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
		return new Promise((resolve) => {
			let settled = false;
			const finish = (v: { latitude: number; longitude: number } | null) => {
				if (!settled) {
					settled = true;
					resolve(v);
				}
			};
			const timer = setTimeout(() => finish(null), 2500);
			try {
				navigator.geolocation.getCurrentPosition(
					(p) => {
						clearTimeout(timer);
						finish({ latitude: p.coords.latitude, longitude: p.coords.longitude });
					},
					() => {
						clearTimeout(timer);
						finish(null);
					},
					{ enableHighAccuracy: false, timeout: 2500, maximumAge: 60000 }
				);
			} catch {
				clearTimeout(timer);
				finish(null);
			}
		});
	}

	async function saveObservation() {
		if (seq.saw === null) return;
		const when = new Date();
		const pos = await devicePosition();
		const obs: SavedObservation = {
			id: newObservationId(),
			siteSlug: site.slug,
			alignmentType: primary?.type ?? null,
			createdAtIso: when.toISOString(),
			deviceTimeLabel: deviceTimeLabel(when),
			saw: seq.saw,
			reason: seq.saw === 'no' ? seq.reason : null,
			note: seq.note.trim(),
			latitude: pos?.latitude ?? null,
			longitude: pos?.longitude ?? null,
			locationSource: pos ? 'device' : 'none'
		};
		observationStore.saveObservation(obs);
		savedCount = observationStore.countObservations();
		seq.savedId = obs.id;
		seq.step = 'saved';
	}
</script>

<div
	class="vigil-app"
	class:field-mode={seq.fieldMode}
	style={paletteStyle}
	data-field-mode={seq.fieldMode}
	data-step={seq.step}
>
	<header class="sequence-bar">
		<p class="step-name">{STEP_LABELS[seq.step]}</p>
		<ol class="progress" aria-label="Sequence progress">
			{#each SEQUENCE_STEPS as s, i}
				<li class:done={i < stepIndex} class:active={i === stepIndex}>{i + 1}</li>
			{/each}
		</ol>
		<button
			type="button"
			class="mode-toggle"
			aria-pressed={seq.fieldMode}
			onclick={() => (seq.fieldMode = !seq.fieldMode)}
		>
			{seq.fieldMode ? FIELD_COPY.fieldModeOn : FIELD_COPY.fieldModeOff}
		</button>
	</header>

	{#if seq.step === 'prepare'}
		<section class="step">
			<h1>{site.name}</h1>
			<p class="region">{site.region}</p>
			<h2>{FIELD_COPY.prepareHeading}</h2>
			<p class="body">{FIELD_COPY.prepareIntro}</p>
			<ul class="checklist">
				{#each FIELD_COPY.prepareChecklist as item}
					<li>{item}</li>
				{/each}
			</ul>
			<p class="note">{FIELD_COPY.fieldModeNote}</p>
			<button type="button" class="primary" onclick={() => go('countdown')}>{FIELD_COPY.begin}</button>
		</section>
	{:else if seq.step === 'countdown'}
		<section class="step">
			<h2>{FIELD_COPY.countdownHeading}</h2>
			{#if appt.kind === 'lunar'}
				<p class="label">{appt.label}</p>
				<p class="when">{appt.dateRange}</p>
				<p class="window">{appt.window}</p>
				<p class="body">{appt.windowDescription}</p>
				<p class="note">
					{appt.daysUntil <= 0
						? FIELD_COPY.countdownTonight
						: appt.daysUntil <= 2
							? FIELD_COPY.countdownApproaching
							: FIELD_COPY.countdownFar}
				</p>
			{:else if appt.kind === 'solar'}
				<p class="label">{appt.label}</p>
				<p class="body">{appt.windowDescription}</p>
				<p class="note">{FIELD_COPY.countdownNoDate}</p>
			{:else}
				<p class="body">{FIELD_COPY.countdownNoDate}</p>
			{/if}
			<div class="row">
				<button type="button" class="secondary" onclick={() => go('prepare')}>Back</button>
				<button type="button" class="primary" onclick={() => go('field')}>{FIELD_COPY.countdownToField}</button>
			</div>
		</section>
	{:else if seq.step === 'field'}
		<section class="step">
			<h2>{FIELD_COPY.fieldHeading}</h2>
			<p class="body">{FIELD_COPY.fieldIntro}</p>
			<OrientationBand
				{bearingDeg}
				{headingMagnetic}
				{headingStatus}
				{declination}
				{now}
				needsTap={tapNeeded}
				onGrant={grantHeading}
			/>
			<HorizonMatch
				{bearingDeg}
				{horizonAltitudeDeg}
				{headingMagnetic}
				{declination}
				{now}
				bind:matched={seq.matched}
				bind:offset={seq.matchOffset}
			/>
			<div class="row">
				<button type="button" class="secondary" onclick={() => go('countdown')}>Back</button>
				<button type="button" class="primary" onclick={() => go('record')}>{FIELD_COPY.recordHeading}</button>
			</div>
		</section>
	{:else if seq.step === 'record'}
		<section class="step">
			<ObservationRecord bind:saw={seq.saw} bind:reason={seq.reason} bind:note={seq.note} onSave={saveObservation} />
			<div class="row">
				<button type="button" class="secondary" onclick={() => go('field')}>Back</button>
			</div>
		</section>
	{:else}
		<section class="step">
			<h2>{FIELD_COPY.savedHeading}</h2>
			<p class="body">{FIELD_COPY.savedBody}</p>
			<p class="count">{savedCount === 1 ? FIELD_COPY.savedCountOne : FIELD_COPY.savedCountMany(savedCount)}</p>
			{#if seq.savedId}
				<p class="ref">{FIELD_COPY.savedIdLabel}: <code>{seq.savedId}</code></p>
			{/if}
			<div class="row">
				<button type="button" class="secondary" onclick={restart}>{FIELD_COPY.savedRestart}</button>
				<button type="button" class="primary" onclick={() => go('record')}>{FIELD_COPY.savedAnother}</button>
			</div>
		</section>
	{/if}
</div>

<style>
	:global(body:has(.vigil-app)) {
		background: #04060e;
		color: #eef1f8;
	}
	:global(body:has(.vigil-app.field-mode)) {
		background: #0a0505;
	}
	:global(html:has(.vigil-app)) {
		background: #04060e;
		color-scheme: dark;
	}

	.vigil-app {
		max-width: 42rem;
		margin: 0 auto;
		padding: 0.5rem 1rem 4rem;
		min-height: 100vh;
		background: var(--ground);
		color: var(--ink);
	}
	.sequence-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0 1rem;
		flex-wrap: wrap;
	}
	.step-name {
		margin: 0;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--muted);
	}
	.progress {
		display: flex;
		gap: 0.35rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.progress li {
		width: 1.6rem;
		height: 1.6rem;
		display: grid;
		place-items: center;
		border-radius: 50%;
		border: 1px solid var(--line);
		font-size: 0.72rem;
		color: var(--muted);
	}
	.progress li.done {
		border-color: var(--accent);
		color: var(--accent);
	}
	.progress li.active {
		background: var(--accent);
		color: var(--accentInk);
		border-color: var(--accent);
	}
	.mode-toggle {
		margin-left: auto;
		min-height: 48px;
		padding: 0 0.9rem;
		font-family: inherit;
		font-size: 0.85rem;
		color: var(--ink);
		background: var(--raised);
		border: 1px solid var(--line);
		border-radius: 6px;
		cursor: pointer;
	}
	.step h1 {
		font-size: 1.5rem;
		margin: 0 0 0.15rem;
	}
	.step h2 {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		margin: 0.5rem 0 0.6rem;
		color: var(--muted);
	}
	.region {
		margin: 0 0 1rem;
		font-size: 0.9rem;
		color: var(--muted);
	}
	.body {
		font-size: 0.98rem;
		line-height: 1.5;
	}
	.checklist {
		margin: 0.6rem 0;
		padding-left: 1.1rem;
		line-height: 1.55;
	}
	.checklist li {
		margin-bottom: 0.4rem;
	}
	.label {
		margin: 0.2rem 0;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.09em;
		color: var(--accent);
	}
	.when {
		margin: 0.1rem 0;
		font-size: 1.35rem;
		font-weight: 600;
	}
	.window {
		margin: 0.1rem 0 0.6rem;
		font-size: 1.1rem;
		color: var(--accent);
		font-family: ui-monospace, monospace;
	}
	.note,
	.ref {
		font-size: 0.82rem;
		color: var(--muted);
		line-height: 1.45;
	}
	.count {
		font-size: 0.95rem;
		color: var(--ink);
	}
	code {
		font-family: ui-monospace, monospace;
		font-size: 0.78rem;
		color: var(--muted);
		word-break: break-all;
	}
	.row {
		display: flex;
		gap: 0.6rem;
		margin-top: 1.1rem;
	}
	.primary,
	.secondary {
		min-height: 64px;
		font-family: inherit;
		font-size: 1.05rem;
		border-radius: 6px;
		cursor: pointer;
	}
	.primary {
		flex: 2;
		font-weight: 600;
		color: var(--accentInk);
		background: var(--accent);
		border: none;
	}
	.secondary {
		flex: 1;
		color: var(--ink);
		background: var(--raised);
		border: 1px solid var(--line);
	}
</style>
