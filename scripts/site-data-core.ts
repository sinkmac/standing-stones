// Site-data core — builds the app's site data from canon. Pure: no I/O.
//
// The app must NOT import src/lib/server/sites.ts (server-only). Instead this
// module derives a small, flat, client-safe record set at BUILD time, and a gate
// (verify-site-data.ts) fails if the generated file drifts from canon.
//
// CHARACTER IS DERIVED FROM ALIGNMENT DATA, NEVER FROM THE SLUG: a site is
// "moonlit" when it has a lunar alignment and no solar one, otherwise "solar".
// Keying on the slug is exactly the bug that made Callanish special-cased.
import type { Site } from '../src/lib/server/sites.ts';
import { getSeasons, getAlignmentWindow } from '../src/lib/server/alignments.ts';
import { isSolarAlignment } from '../src/lib/server/sites.ts';
// Types live with the app (src/lib/appData.ts) — type-only import, erased at
// runtime, so this build script never pulls the generated JSON in.
import type { Character, AppSite, SiteDataFile } from '../src/lib/appData.ts';

/** Window width for an alignment. Computed against a FIXED reference year so the
 *  generated file does not churn with the build date (the window is a property
 *  of the site's geometry, not of the year). */
function windowFor(site: Site, a: Site['alignments'][number]): { daysBefore: number; daysAfter: number } {
	if (!isSolarAlignment(a)) return { daysBefore: 0, daysAfter: 0 };
	const seasons = getSeasons(2027);
	if (a.type === 'summer-solstice') {
		return getAlignmentWindow(seasons.junSolstice, site.latitude, site.longitude, a.bearing, a.event);
	}
	if (a.type === 'winter-solstice') {
		return getAlignmentWindow(seasons.decSolstice, site.latitude, site.longitude, a.bearing, a.event);
	}
	return { daysBefore: 0, daysAfter: 0 };
}

/** THE character rule. Data, not identity. */
export function characterOf(site: Site): Character {
	const hasLunar = site.alignments.some(a => !isSolarAlignment(a));
	const hasSolar = site.alignments.some(a => isSolarAlignment(a));
	return hasLunar && !hasSolar ? 'moonlit' : 'solar';
}

export function toAppSite(site: Site): AppSite {
	return {
		slug: site.slug,
		name: site.name,
		region: site.region,
		tier: site.tier,
		latitude: site.latitude,
		longitude: site.longitude,
		character: characterOf(site),
		alignments: site.alignments.map(a => ({
			type: a.type,
			bearing: a.bearing,
			horizonAltitude: a.horizonAltitude,
			...windowFor(site, a)
		})),
		darkSky: site.enrichment?.darkSky ?? null
	};
}

/** Hash over the canon-derived content only (never the timestamp), so the
 *  staleness gate is stable. */
export function canonHash(sites: Site[]): string {
	const canon = JSON.stringify(
		sites.map(s => ({ slug: s.slug, name: s.name, region: s.region, tier: s.tier, lat: s.latitude,
			lon: s.longitude, al: s.alignments.map(a => [a.type, a.bearing, a.horizonAltitude, a.event]),
			dark: s.enrichment?.darkSky ?? null }))
	);
	// FNV-1a, 32-bit — no node crypto, so this stays importable anywhere.
	let h = 0x811c9dc5;
	for (let i = 0; i < canon.length; i++) {
		h ^= canon.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return 'fnv1a-' + h.toString(16).padStart(8, '0') + '-' + canon.length;
}

export function buildSiteData(
	canonSites: Site[],
	opts: { includeDevSite: boolean; devSite?: Site }
): SiteDataFile {
	const all = opts.includeDevSite && opts.devSite ? [...canonSites, opts.devSite] : canonSites;
	return {
		includeDevSite: opts.includeDevSite,
		canonHash: canonHash(all),
		sites: all.map(toAppSite)
	};
}
