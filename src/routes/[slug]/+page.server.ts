import { error } from '@sveltejs/kit';
import { getSite, isSolarAlignment } from '$lib/server/sites';
import { calculateNextAlignment, getLocationSkySummary } from '$lib/server/alignments';
import { calculateNextLunarLunistice, lunisticeLocalWindow } from '$lib/server/lunarLunistice';
import { getVigilsForSite, getSiteVigilStats, type VigilEntry } from '$lib/server/vigil';
import { calculateAncestralSky, type AncestralSkyResult } from '$lib/server/ancestral';
import { SKY_BANDS } from '$lib/skyPalette';

export interface SitePageData {
	site: NonNullable<ReturnType<typeof getSite>>;
	nextEvents: Array<{
		solsticeDate: Date;
		dateRange: string;
		eventTime: string;
		daysBefore: number;
		daysAfter: number;
		windowDescription: string;
		isPrecise: boolean;
		/** Present when the producing solver knows the alignment type. */
		alignmentType?: string;
		moonDeclinationDeg?: number;
		moonriseAzimuthDeg?: number;
		moonPhase?: string;
	}>;
	vigilStats: Awaited<ReturnType<typeof getSiteVigilStats>>;
	recentVigils: VigilEntry[];
	skySummary: { sunrise: string; sunset: string; sunlight: string };
	ancestralSky: AncestralSkyResult | null;
	skyBands: string[];
}

export async function load({ params }): Promise<SitePageData> {
	const site = getSite(params.slug);
	if (!site) {
		error(404, 'Site not found');
	}

	const now = new Date();

	// Calculate next events. Solar alignments use the solar solver; the monthly
	// southern lunistice (Callanish) uses the lunar solver, mirroring the API route.
	const nextEvents = site.alignments
		.map(a => {
			if (a.type === 'lunar-standstill') {
				return null;
			}
			if (a.type === 'lunar-lunistice-south') {
				const lev = calculateNextLunarLunistice(now, site.latitude);
				return lev ? {
					solsticeDate: lev.datetime,
					dateRange: lev.datetime.toLocaleDateString('en-GB', {
						weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
					}),
					eventTime: lunisticeLocalWindow(lev.datetime),
					daysBefore: 0,
					daysAfter: 0,
					windowDescription: `Monthly southern lunistice — the moon reaches its most southerly declination of the month (${lev.declinationDeg.toFixed(1)}°) ` +
						`and rises low from the Sleeping Beauty ridge to the south-south-east. ` +
						`Time is approximate to within about an hour. Moon phase: ${lev.phaseBand}.`,
					isPrecise: site.tier === 'surveyed',
					alignmentType: 'lunar-lunistice-south' as const,
					moonDeclinationDeg: lev.declinationDeg,
					moonriseAzimuthDeg: lev.riseAzimuthDeg,
					moonPhase: lev.phaseBand
				} : null;
			}
			if (!isSolarAlignment(a)) return null;
			const solar = calculateNextAlignment(
				site.latitude,
				site.longitude,
				a.bearing,
				a.event,
				a.type,
				site.tier,
				now
			);
			return solar ? { ...solar, alignmentType: a.type } : null;
		})
		.filter((e): e is NonNullable<typeof e> => e !== null);

	const [vigilStats, recentVigils] = await Promise.all([
		getSiteVigilStats(site.slug),
		getVigilsForSite(site.slug)
	]);

	const skySummary = getLocationSkySummary(site.latitude, site.longitude, now);

	// Ancestral-sky calculation (only for eligible sites)
	const ancestralSky = site.dateConfidence && site.tier === 'surveyed'
		? calculateAncestralSky(site.slug, site.latitude, site.dateConfidence)
		: null;

	return {
		site,
		nextEvents,
		vigilStats,
		recentVigils: recentVigils.slice(0, 10),
		skySummary,
		ancestralSky,
		skyBands: SKY_BANDS[site.slug] ?? []
	};
}