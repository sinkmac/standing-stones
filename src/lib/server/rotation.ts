// Rotation state — durable persistence via Netlify Blobs, with in-memory
// fallback for local dev. Mirrors the vigil-register pattern (vigil.ts).
//
// Two blobs in a dedicated 'rotation-state' store:
//   - 'rotation-state': { decision: {asOf, site, state, reason} | null,
//                         lastLed: { slug: ISO } }
//   - 'rotation-log': capped array of { at, date, site, state, reason }
//
// Stores survive redeploys. On the first evaluation after a fresh bucket the
// state is re-initialised to never-led, so the launch tie resolves to canon
// order in rotationLogic.selectLeader.

import { getStore } from '@netlify/blobs';
import type { LeaderDecision, LastLedMap } from './rotationLogic';

export interface RotationLogEntry {
	at: string;
	date: string;
	site: string;
	state: 1 | 2 | 3;
	reason: string;
}

export interface RotationState {
	decision: {
		asOf: string; // UTC YYYY-MM-DD the decision was computed
		site: string;
		state: 1 | 2 | 3;
		reason: string;
	} | null;
	lastLed: LastLedMap;
}

const LOG_CAP = 200;

// In-memory fallback for local dev
let memoryState: RotationState = { decision: null, lastLed: {} };
let memoryLog: RotationLogEntry[] = [];

function canUseBlobs(): boolean {
	try {
		return (
			typeof process !== 'undefined' &&
			(process.env.NETLIFY === 'true' || process.env.NODE_ENV === 'production')
		);
	} catch {
		return false;
	}
}

function getRotationStore() {
	try {
		return getStore('rotation-state');
	} catch {
		return null;
	}
}

/**
 * Load the current rotation state and decision log. Returns in-memory defaults
 * when blobs are unavailable or unreadable.
 */
export async function loadRotation(): Promise<{ state: RotationState; log: RotationLogEntry[] }> {
	if (!canUseBlobs()) return { state: memoryState, log: memoryLog };
	const store = getRotationStore();
	if (!store) return { state: memoryState, log: memoryLog };
	try {
		const state = await store.get('rotation-state', { type: 'json' });
		const log = await store.get('rotation-log', { type: 'json' });
		return {
			state: state && typeof state === 'object' ? (state as RotationState) : memoryState,
			log: Array.isArray(log) ? (log as RotationLogEntry[]) : memoryLog
		};
	} catch {
		return { state: memoryState, log: memoryLog };
	}
}

/**
 * Persist a fresh daily decision and advance the leader's lastLed. Records the
 * decision to the (capped) log so there is a legible paper trail if the rule
 * ever produces a result that feels wrong.
 */
export async function saveRotation(
	decision: LeaderDecision,
	asOf: string,
	lastLed: LastLedMap
): Promise<void> {
	const entry: RotationLogEntry = {
		at: new Date().toISOString(),
		date: asOf,
		site: decision.site,
		state: decision.state,
		reason: decision.reason
	};
	const current = await loadRotation();
	const nextLog = [entry, ...current.log].slice(0, LOG_CAP);
	const state: RotationState = {
		decision: { asOf, site: decision.site, state: decision.state, reason: decision.reason },
		lastLed
	};

	if (canUseBlobs()) {
		const store = getRotationStore();
		if (store) {
			try {
				await store.setJSON('rotation-state', state);
				await store.setJSON('rotation-log', nextLog);
				return;
			} catch {
				// Blob write failed — fall through to memory.
			}
		}
	}
	memoryState = state;
	memoryLog = nextLog;
}

/** Raw decision log, newest first — exposed for any future admin/debug surface. */
export async function readDecisionLog(): Promise<RotationLogEntry[]> {
	return (await loadRotation()).log;
}