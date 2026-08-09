import { json } from '@sveltejs/kit';
import { sites } from '$lib/server/sites';
import { calculateNextAlignment } from '$lib/server/alignments';
import type { AlignmentEvent } from '$lib/server/alignments';
import { calculateNextLunarLunistice } from '$lib/server/lunarLunistice';
import { getSiteVigilStats } from '$lib/server/vigil';

/**
 * GET /api/layer/vigil?lat=..&lon=..&radius=..
 *
 * Layer response for the dossier contract: lists every canon site within
 * `radius` km of the query point, each with its next alignment event timing
 * and a summary of vigil-register stats. All canon sites are tier-eligible
 * (the surveyed/traditional distinction affects Standing Stones UI display,
 * not whether a site appears here).
 *
 * Returns 200 with `status: "ok"` and an items array; if no canon site falls
 * within the radius, returns a gap object instead (not a 404).
 */

const DEFAULT_RADIUS_KM = 200;

/** Haversine distance in km between two lat/lon points. */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371;
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	const a = Math.sin(dLat / 2) ** 2 +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		Math.sin(dLon / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Canon alignment type (hyphenated) → layer contract type (underscored). */
function contractType(t: string): string {
	return t.replace(/-/g, '_');
}

/** Whole-day difference between a future event date and today. */
function daysUntil(d: Date): number {
	const now = new Date();
	const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
	const eventDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
	return Math.round((eventDay.getTime() - startOfDay.getTime()) / 86400000);
}

/** Alignment event shape carried through to the item; lunar events add structured geometry. */
type VigilEvent = AlignmentEvent & {
	moonDeclinationDeg?: number;
	moonriseAzimuthDeg?: number;
	moonPhase?: string;
};

/** Human-readable window description for a southern lunistice (matches the solar style). */
function lunarWindowDescription(lev: NonNullable<ReturnType<typeof calculateNextLunarLunistice>>): string {
	const moonriseTime = lev.datetime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
	return `Monthly southern lunistice — the moon reaches declination ${lev.declinationDeg.toFixed(1)}° ` +
		`(its most southerly extent this draconic month) on ${lev.datetime.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} ` +
		`and rises at ${Math.round(lev.riseAzimuthDeg)}° from north, skimming the Sleeping Beauty ridge to the south. ` +
		`Moon phase: ${lev.phaseBand} (${Math.round(lev.phase * 100)}%). Best seen at moonrise (~${moonriseTime} local) that evening.`;
}

export async function GET({ url }: { url: URL }) {
	const lat = parseFloat(url.searchParams.get('lat') || '');
	const lon = parseFloat(url.searchParams.get('lon') || '');
	const radiusKm = parseFloat(url.searchParams.get('radius') || '') || DEFAULT_RADIUS_KM;

	if (isNaN(lat) || isNaN(lon)) {
		return json({ error: 'lat and lon query parameters are required' }, { status: 400 });
	}

	const now = new Date();
	const fetchedAt = now.toISOString();

	// Canon sites within radius, nearest first.
	const inRadius = sites
		.map(site => ({ site, distance: haversineKm(lat, lon, site.latitude, site.longitude) }))
		.filter(({ distance }) => distance <= radiusKm)
		.sort((a, b) => a.distance - b.distance);

	if (inRadius.length === 0) {
		return json({
			layer: 'vigil',
			status: 'ok',
			items: [],
			gap: {
				reason: 'no_sites_in_radius',
				pointer: 'https://standing-stones-vigil.netlify.app'
			}
		});
	}

	// Build an item per site; skip any site whose solver call errors or returns
	// an implausible result (log server-side, don't ship bad data).
	const items = [];
	for (const { site, distance } of inRadius) {
		try {
			// Earliest upcoming alignment for this site (solar or monthly lunar lunistice).
			const upcoming = site.alignments
				.map(al => {
					if (al.type === 'lunar-standstill') return null;
					let ev: VigilEvent | null = null;
					if (al.type === 'lunar-lunistice-south') {
						const lev = calculateNextLunarLunistice(now, site.latitude);
						ev = lev ? {
							solsticeDate: lev.datetime,
							dateRange: lev.datetime.toLocaleDateString('en-GB', {
								weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
							}),
							eventTime: lev.datetime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
							daysBefore: 0,
							daysAfter: 0,
							windowDescription: lunarWindowDescription(lev),
							isPrecise: site.tier === 'surveyed',
							moonDeclinationDeg: lev.declinationDeg,
							moonriseAzimuthDeg: lev.riseAzimuthDeg,
							moonPhase: lev.phaseBand
						} : null;
					} else {
						ev = calculateNextAlignment(
							site.latitude,
							site.longitude,
							al.bearing,
							al.event,
							al.type,
							site.tier,
							now
						);
					}
					return ev && ev.solsticeDate.getTime() > now.getTime() ? { al, ev } : null;
				})
				.filter((x): x is NonNullable<typeof x> => x !== null)
				.sort((a, b) => a.ev.solsticeDate.getTime() - b.ev.solsticeDate.getTime());

			if (upcoming.length === 0) continue;

			const { al, ev } = upcoming[0];

			// Vigil register stats; null (not a failure) if unavailable.
			let register = null;
			try {
				const stats = await getSiteVigilStats(site.slug);
				if (stats) {
					register = {
						total_vigils: stats.total,
						seen_count: stats.seen,
						kept_ratio: stats.total === 0
							? 'No vigils recorded yet'
							: `${stats.seen} of ${stats.total} vigils recorded a clear event`
					};
				}
			} catch (err) {
				console.error(`[layer/vigil] register stats failed for ${site.slug}:`, err);
				register = null;
			}

			items.push({
				id: `vigil:${site.slug}`,
				name: site.name,
				location: {
					lat: site.latitude,
					lon: site.longitude,
					region: site.region,
					distance_km: Math.round(distance)
				},
				alignment: {
					type: contractType(al.type),
					event: al.event,
					next_date: ev.solsticeDate.toISOString().split('T')[0],
					days_until: daysUntil(ev.solsticeDate),
					window_description: ev.windowDescription,
					...(ev.moonDeclinationDeg !== undefined ? {
						moon_declination_deg: Math.round(ev.moonDeclinationDeg * 10) / 10,
						moonrise_azimuth_deg: Math.round(ev.moonriseAzimuthDeg as number),
						moon_phase: ev.moonPhase as string
					} : {})
				},
				register,
				when: {
					tense: 'future',
					label: 'Alignment'
				}
			});
		} catch (err) {
			console.error(`[layer/vigil] solver failed for ${site.slug}:`, err);
			// Omit this site rather than return bad data.
		}
	}

	return json({
		layer: 'vigil',
		fetched_at: fetchedAt,
		status: 'ok',
		items,
		gap: null
	});
}
