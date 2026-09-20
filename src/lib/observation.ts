// Observation store — everything the visitor records lives HERE, on the device,
// written at the moment of saving. Nothing in this module touches the network.
//
// Two integrity rules, carried over from the register law because they are the
// same rule the register will later need:
//   - the observation id is minted CLIENT-SIDE at the moment of saving (a
//     stable id the register phase can upsert on, so a later submit is idempotent)
//   - one key PER ENTRY plus a small index of ids, never a single read-modify-
//     write blob that a second write can clobber
//
// The observation still *in progress* is persisted by vigilSequence.ts, not here
// — one source of truth for the sequence, one for saved entries.
//
// Storage is injectable so the gate can exercise a round-trip without a browser.

export interface StorageLike {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

export type SawAnswer = 'yes' | 'no';
export type ReasonCode = 'cloud' | 'late' | 'wrong-spot' | 'choice';

export interface SavedObservation {
	/** Client-minted stable id — minted at the moment of saving. */
	id: string;
	siteSlug: string;
	alignmentType: string | null;
	/** Device clock, as the device reports it. Self-reported, not verified. */
	createdAtIso: string;
	/** Device local time label, as the device reports it. */
	deviceTimeLabel: string;
	saw: SawAnswer;
	/** Only present when saw === 'no'. */
	reason: ReasonCode | null;
	/** Optional free text. Empty string when none. */
	note: string;
	/** Device-reported position, or null when none was available. */
	latitude: number | null;
	longitude: number | null;
	locationSource: 'device' | 'none';
}

export const OBS_INDEX_KEY = 'ssv.observations.v1';
export const OBS_ENTRY_PREFIX = 'ssv.observation.v1.';

function fallbackToken(): string {
	return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/** A client-side stable id. Prefers crypto.randomUUID; falls back without throwing. */
export function newObservationId(): string {
	const c = (globalThis as { crypto?: Crypto }).crypto;
	if (c && typeof c.randomUUID === 'function') return 'obs_' + c.randomUUID();
	return 'obs_' + fallbackToken();
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

export interface ObservationStore {
	saveObservation(o: SavedObservation): void;
	listObservations(): SavedObservation[];
	countObservations(): number;
}

export function makeObservationStore(storage: StorageLike | null = defaultStorage()): ObservationStore {
	function readIndex(): string[] {
		if (!storage) return [];
		try {
			const raw = storage.getItem(OBS_INDEX_KEY);
			const parsed = raw ? JSON.parse(raw) : [];
			return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
		} catch {
			return [];
		}
	}

	return {
		saveObservation(o) {
			if (!storage) return;
			try {
				// Entry first, then the index. If power is lost between the two, the
				// entry survives; a missing index line is recoverable, a lost entry is not.
				storage.setItem(OBS_ENTRY_PREFIX + o.id, JSON.stringify(o));
				const ids = readIndex();
				if (!ids.includes(o.id)) {
					ids.push(o.id);
					storage.setItem(OBS_INDEX_KEY, JSON.stringify(ids));
				}
			} catch {
				/* storage unavailable — nothing is lost beyond this session */
			}
		},
		listObservations() {
			if (!storage) return [];
			const out: SavedObservation[] = [];
			try {
				for (const id of readIndex()) {
					const raw = storage.getItem(OBS_ENTRY_PREFIX + id);
					if (!raw) continue;
					try {
						out.push(JSON.parse(raw) as SavedObservation);
					} catch {
						/* a corrupt entry is skipped, never guessed at */
					}
				}
			} catch {
				return out;
			}
			return out;
		},
		countObservations() {
			return this.listObservations().length;
		}
	};
}

/** The store backed by this browser's localStorage. */
export const observationStore = makeObservationStore();
