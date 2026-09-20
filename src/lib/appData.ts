// App data — the client-safe view of canon, generated at BUILD time.
//
// The app must never import src/lib/server/*. Everything the shell needs comes
// from ./generated/siteData.json (produced by scripts/generate-site-data.ts from
// sites.ts, gated by scripts/verify-site-data.ts so it cannot drift from canon).
import siteDataJson from './generated/siteData.json';

export type Character = 'moonlit' | 'solar';

export interface AppAlignment {
	type: string;
	bearing: number;
	horizonAltitude: number;
	daysBefore: number;
	daysAfter: number;
}

export interface AppSite {
	slug: string;
	name: string;
	region: string;
	tier: string;
	latitude: number;
	longitude: number;
	/** Derived from alignment data, never from the slug. */
	character: Character;
	alignments: AppAlignment[];
	darkSky: string | null;
}

export interface SiteDataFile {
	generatedAt: string;
	includeDevSite: boolean;
	canonHash: string;
	sites: AppSite[];
}

export const siteData = siteDataJson as SiteDataFile;

export function allAppSites(): AppSite[] {
	return siteData.sites;
}

export function getAppSite(slug: string): AppSite | undefined {
	return siteData.sites.find(s => s.slug === slug);
}
