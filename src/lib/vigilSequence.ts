// The vigil sequence: prepare -> countdown -> field -> record -> saved.
//
// Traversable with no signal, and RE-ENTERABLE at any point without losing
// state: the whole sequence (the step, the field-mode setting, the drag offset,
// and the record in progress) is persisted on every change, so closing the app,
// losing power mid-entry, or reopening hours later resumes where it stopped.
//
// No network anywhere in this file.

import type { ReasonCode, SawAnswer, StorageLike } from './observation.ts';

export type SequenceStep = 'prepare' | 'countdown' | 'field' | 'record' | 'saved';

export const SEQUENCE_STEPS: SequenceStep[] = ['prepare', 'countdown', 'field', 'record', 'saved'];

export const SEQUENCE_KEY_PREFIX = 'ssv.sequence.v1.';

export interface SequenceState {
	siteSlug: string;
	step: SequenceStep;
	/** Field mode is a deliberate setting, persisted across sessions. */
	fieldMode: boolean;
	/** Whether the visitor has said the profile is matched. Their judgement. */
	matched: boolean;
	/** Horizontal offset of the dragged profile, in strip units. */
	matchOffset: number;
	/** The record in progress — persisted so a mid-entry power loss keeps it. */
	saw: SawAnswer | null;
	reason: ReasonCode | null;
	note: string;
	/** The id of the last observation saved from this sequence, if any. */
	savedId: string | null;
}

export function defaultSequence(siteSlug: string): SequenceState {
	return {
		siteSlug,
		step: 'prepare',
		fieldMode: false,
		matched: false,
		matchOffset: 0,
		saw: null,
		reason: null,
		note: '',
		savedId: null
	};
}

function isStep(v: unknown): v is SequenceStep {
	return typeof v === 'string' && (SEQUENCE_STEPS as string[]).includes(v);
}

/** Merge a stored partial over the defaults, defending against an older shape. */
export function hydrateSequence(siteSlug: string, raw: unknown): SequenceState {
	const base = defaultSequence(siteSlug);
	if (!raw || typeof raw !== 'object') return base;
	const r = raw as Partial<SequenceState>;
	return {
		siteSlug,
		step: isStep(r.step) ? r.step : base.step,
		fieldMode: typeof r.fieldMode === 'boolean' ? r.fieldMode : base.fieldMode,
		matched: typeof r.matched === 'boolean' ? r.matched : base.matched,
		matchOffset: typeof r.matchOffset === 'number' ? r.matchOffset : base.matchOffset,
		saw: r.saw === 'yes' || r.saw === 'no' ? r.saw : null,
		reason: (r.reason as ReasonCode | null) ?? null,
		note: typeof r.note === 'string' ? r.note : '',
		savedId: typeof r.savedId === 'string' ? r.savedId : null
	};
}

function defaultStorage(): StorageLike | null {
	try {
		const ls = (globalThis as { localStorage?: StorageLike }).localStorage;
		if (!ls) return null;
		// Node 22 exposes a `localStorage` global that THROWS unless it is given a
		// backing file. Probe it once so a broken global reads as "no storage"
		// rather than crashing an SSR render.
		ls.getItem('ssv.probe');
		return ls;
	} catch {
		return null;
	}
}

export interface SequenceStore {
	load(siteSlug: string): SequenceState;
	save(state: SequenceState): void;
	clear(siteSlug: string): void;
}

export function makeSequenceStore(storage: StorageLike | null = defaultStorage()): SequenceStore {
	return {
		load(siteSlug) {
			if (!storage) return defaultSequence(siteSlug);
			try {
				const raw = storage.getItem(SEQUENCE_KEY_PREFIX + siteSlug);
				if (!raw) return defaultSequence(siteSlug);
				return hydrateSequence(siteSlug, JSON.parse(raw));
			} catch {
				return defaultSequence(siteSlug);
			}
		},
		save(state) {
			if (!storage) return;
			try {
				// Persist on every change; re-entry must never lose state.
				storage.setItem(SEQUENCE_KEY_PREFIX + state.siteSlug, JSON.stringify(state));
			} catch {
				/* storage unavailable — the in-memory state still holds for this session */
			}
		},
		clear(siteSlug) {
			if (!storage) return;
			try {
				storage.removeItem(SEQUENCE_KEY_PREFIX + siteSlug);
			} catch {
				/* nothing to clear */
			}
		}
	};
}

export const sequenceStore = makeSequenceStore();
