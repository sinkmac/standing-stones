<script lang="ts">
	// Observation capture — the one required answer, an optional reason, an
	// optional line. Nothing beyond the one answer is required.
	//
	// Time and place are recorded as the device reports them and kept as
	// SELF-REPORTED. No wording here implies a check, a confirmation or a
	// verification, and nothing is sent anywhere.
	import { FIELD_COPY } from '$lib/fieldCopy';
	import type { ReasonCode, SawAnswer } from '$lib/observation';

	interface Props {
		saw?: SawAnswer | null;
		reason?: ReasonCode | null;
		note?: string;
		onSave: () => void;
	}
	let { saw = $bindable(null), reason = $bindable(null), note = $bindable(''), onSave }: Props = $props();

	const REASON_ORDER: ReasonCode[] = ['cloud', 'late', 'wrong-spot', 'choice'];

	function chooseSaw(v: SawAnswer) {
		saw = v;
		if (v === 'yes') reason = null; // a reason only applies to not seeing it
	}
</script>

<section class="record">
	<h2>{FIELD_COPY.recordHeading}</h2>

	<p class="question">{FIELD_COPY.recordQuestion}</p>
	<div class="answers">
		<button
			type="button"
			class="answer"
			class:chosen={saw === 'yes'}
			aria-pressed={saw === 'yes'}
			onclick={() => chooseSaw('yes')}
		>
			{FIELD_COPY.recordSawYes}
		</button>
		<button
			type="button"
			class="answer"
			class:chosen={saw === 'no'}
			aria-pressed={saw === 'no'}
			onclick={() => chooseSaw('no')}
		>
			{FIELD_COPY.recordSawNo}
		</button>
	</div>

	{#if saw === 'no'}
		<p class="question">{FIELD_COPY.recordReasonQuestion}</p>
		<div class="reasons">
			{#each REASON_ORDER as code}
				<button
					type="button"
					class="answer small"
					class:chosen={reason === code}
					aria-pressed={reason === code}
					onclick={() => (reason = code)}
				>
					{FIELD_COPY.recordReasons[code]}
				</button>
			{/each}
		</div>
	{/if}

	<label class="note-field">
		{FIELD_COPY.recordNoteLabel}
		<textarea rows="3" bind:value={note} placeholder={FIELD_COPY.recordNotePlaceholder}></textarea>
	</label>

	<p class="self-report">{FIELD_COPY.recordSelfReport}</p>

	<button type="button" class="save" disabled={saw === null} onclick={onSave}>
		{FIELD_COPY.recordSave}
	</button>
	{#if saw === null}
		<p class="hint">{FIELD_COPY.recordNoAnswer}</p>
	{/if}
</section>

<style>
	.record {
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
	.question {
		font-size: 1.05rem;
		margin: 0.4rem 0 0.6rem;
		color: var(--ink);
	}
	.answers,
	.reasons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.answer {
		flex: 1 1 45%;
		min-height: 72px;
		font-size: 1.05rem;
		font-family: inherit;
		color: var(--ink);
		background: var(--raised);
		border: 2px solid var(--line);
		border-radius: 6px;
		cursor: pointer;
	}
	.answer.small {
		flex: 1 1 40%;
		min-height: 60px;
		font-size: 0.95rem;
	}
	.answer.chosen {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 22%, var(--raised));
	}
	.note-field {
		display: block;
		margin: 1rem 0 0;
		font-size: 0.85rem;
		color: var(--muted);
	}
	textarea {
		display: block;
		width: 100%;
		box-sizing: border-box;
		margin-top: 0.3rem;
		padding: 0.6rem;
		font-family: inherit;
		font-size: 1rem;
		color: var(--ink);
		background: var(--ground);
		border: 1px solid var(--line);
		border-radius: 6px;
	}
	.self-report {
		margin: 0.85rem 0 0.25rem;
		font-size: 0.78rem;
		color: var(--muted);
		line-height: 1.45;
	}
	.save {
		width: 100%;
		min-height: 72px;
		margin-top: 0.5rem;
		font-size: 1.1rem;
		font-family: inherit;
		font-weight: 600;
		color: var(--accentInk);
		background: var(--accent);
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}
	.save:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.hint {
		margin: 0.4rem 0 0;
		font-size: 0.8rem;
		color: var(--muted);
	}
</style>
