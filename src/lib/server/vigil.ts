// Vigil register — persistent storage via Netlify Blobs, with in-memory fallback for local dev
// Store type: site-scoped (survives redeploys) — entries accumulate over years

import { getStore } from '@netlify/blobs';

export interface VigilEntry {
	id: string;
	siteSlug: string;
	visitDate: string;
	visitTime?: string;
	alignmentType: string;
	sawEvent: boolean | null;
	observation: string;
	weather: 'clear' | 'partly-cloudy' | 'overcast' | 'rain' | 'other';
	keeperName?: string;
	createdAt: string;
}

// In-memory fallback for local dev
let memoryStore: VigilEntry[] = [];

/**
 * Determine if we can use Netlify Blobs (production) or need in-memory fallback (local dev).
 */
function canUseBlobs(): boolean {
	try {
		// Check for Netlify environment
		return typeof process !== 'undefined' &&
			(process.env.NETLIFY === 'true' || process.env.NODE_ENV === 'production');
	} catch {
		return false;
	}
}

/**
 * Get the store instance. Returns null if unavailable.
 */
function getVigilStore() {
	try {
		return getStore('vigil-register');
	} catch {
		return null;
	}
}

/**
 * Generate a unique ID for a vigil entry.
 */
function generateId(): string {
	return crypto.randomUUID();
}

/**
 * Load all entries from persistent store.
 */
async function loadEntries(): Promise<VigilEntry[]> {
	if (canUseBlobs()) {
		const store = getVigilStore();
		if (store) {
			try {
				const data = await store.get('entries', { type: 'json' });
				if (data && Array.isArray(data)) {
					return data as VigilEntry[];
				}
			} catch {
				// Blob read failed — fall back
			}
		}
	}
	return memoryStore;
}

/**
 * Save all entries to persistent store.
 */
async function saveEntries(entries: VigilEntry[]): Promise<void> {
	if (canUseBlobs()) {
		const store = getVigilStore();
		if (store) {
			try {
				await store.setJSON('entries', entries);
				return;
			} catch {
				// Blob write failed — fall back to memory
			}
		}
	}
	memoryStore = entries;
}

/**
 * Record a new vigil entry.
 */
export async function recordVigil(entry: Omit<VigilEntry, 'id' | 'createdAt'>): Promise<VigilEntry> {
	const entries = await loadEntries();
	const newEntry: VigilEntry = {
		...entry,
		id: generateId(),
		createdAt: new Date().toISOString()
	};
	entries.unshift(newEntry);
	await saveEntries(entries);
	return newEntry;
}

/**
 * Get all vigil entries for a site.
 */
export async function getVigilsForSite(siteSlug: string): Promise<VigilEntry[]> {
	const entries = await loadEntries();
	return entries
		.filter(e => e.siteSlug === siteSlug)
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get the seen/attempted ratio for a site.
 */
export async function getSiteVigilStats(siteSlug: string): Promise<{
	total: number;
	seen: number;
	notSeen: number;
	ratio: number | null;
}> {
	const entries = await loadEntries();
	const siteEntries = entries.filter(e => e.siteSlug === siteSlug);
	if (siteEntries.length === 0) {
		return { total: 0, seen: 0, notSeen: 0, ratio: null };
	}

	const seen = siteEntries.filter(e => e.sawEvent === true).length;
	const notSeen = siteEntries.filter(e => e.sawEvent === false).length;
	const definite = seen + notSeen;

	return {
		total: siteEntries.length,
		seen,
		notSeen,
		ratio: definite > 0 ? Math.round((seen / definite) * 100) : null
	};
}

/**
 * Get all vigil entries across all sites.
 */
export async function getAllVigils(): Promise<VigilEntry[]> {
	const entries = await loadEntries();
	return entries.sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	);
}

/**
 * Get the count of keepers for a specific upcoming alignment event.
 */
export async function getKeepersForAlignment(siteSlug: string, alignmentType: string): Promise<number> {
	const entries = await loadEntries();
	return entries.filter(
		e => e.siteSlug === siteSlug && e.alignmentType === alignmentType
	).length;
}

/**
 * Format a vigil entry for display.
 */
export function formatVigilEntry(entry: VigilEntry): string {
	const status = entry.sawEvent === true ? 'Saw it ✓' :
		entry.sawEvent === false ? 'Didn\'t see it' : 'Uncertain';
	const weatherLabels: Record<string, string> = {
		'clear': 'Clear',
		'partly-cloudy': 'Partly cloudy',
		'overcast': 'Overcast',
		'rain': 'Rain',
		'other': 'Other'
	};
	const visitDate = new Date(entry.visitDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
	return `${visitDate}${entry.visitTime ? ' at ' + entry.visitTime : ''} — ${status}, ${weatherLabels[entry.weather] || entry.weather}\n"${entry.observation}"`;
}