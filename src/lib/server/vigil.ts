// Vigil register — data model for recording visits to alignment sites
// In-memory store for initial build; swap to Netlify Blobs for persistence later.

export interface VigilEntry {
	id: string;
	siteSlug: string;
	/** Date of the visit */
	visitDate: string; // ISO date
	/** Time of the vigil (optional) */
	visitTime?: string;
	/** The alignment they came to see */
	alignmentType: string;
	/** Did they see it? */
	sawEvent: boolean | null; // null = uncertain
	/** What they observed (free text, required) */
	observation: string;
	/** Weather conditions */
	weather: 'clear' | 'partly-cloudy' | 'overcast' | 'rain' | 'other';
	/** Name/display name (optional) */
	keeperName?: string;
	/** Timestamp of the entry */
	createdAt: string; // ISO datetime
}

// In-memory store — replace with persistent store
let entries: VigilEntry[] = [];

/**
 * Record a new vigil entry.
 */
export function recordVigil(entry: Omit<VigilEntry, 'id' | 'createdAt'>): VigilEntry {
	const newEntry: VigilEntry = {
		...entry,
		id: crypto.randomUUID(),
		createdAt: new Date().toISOString()
	};
	entries = [newEntry, ...entries];
	return newEntry;
}

/**
 * Get all vigil entries for a site.
 */
export function getVigilsForSite(siteSlug: string): VigilEntry[] {
	return entries.filter(e => e.siteSlug === siteSlug).sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	);
}

/**
 * Get the seen/attempted ratio for a site.
 */
export function getSiteVigilStats(siteSlug: string): {
	total: number;
	seen: number;
	notSeen: number;
	ratio: number | null; // percentage, null if no entries
} {
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
export function getAllVigils(): VigilEntry[] {
	return [...entries].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	);
}

/**
 * Get the count of keepers for a specific upcoming alignment event.
 */
export function getKeepersForAlignment(siteSlug: string, alignmentType: string): number {
	return entries.filter(
		e => e.siteSlug === siteSlug && e.alignmentType === alignmentType
	).length;
}

/**
 * Format a vigil entry for display.
 */
export function formatVigilEntry(entry: VigilEntry): string {
	const status = entry.sawEvent === true ? 'Saw it ✓' : entry.sawEvent === false ? 'Didn\'t see it' : 'Uncertain';
	const weather = entry.weather === 'clear' ? 'Clear' : entry.weather === 'partly-cloudy' ? 'Partly cloudy' : entry.weather === 'overcast' ? 'Overcast' : entry.weather === 'rain' ? 'Rain' : 'Other';
	const visitDate = new Date(entry.visitDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
	return `${visitDate}${entry.visitTime ? ' at ' + entry.visitTime : ''} — ${status}, ${weather}\n"${entry.observation}"`;
}