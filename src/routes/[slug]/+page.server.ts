import { getSite } from '$lib/server/sites';
import { calculateNextAlignment, getLocationSkySummary } from '$lib/server/alignments';
import { getVigilsForSite, getSiteVigilStats, type VigilEntry } from '$lib/server/vigil';

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
	}>;
	vigilStats: ReturnType<typeof getSiteVigilStats>;
	recentVigils: VigilEntry[];
	skySummary: { sunrise: string; sunset: string; sunlight: string };
}

export async function load({ params }): Promise<SitePageData | { error: string }> {
	const site = getSite(params.slug);
	if (!site) {
		return { error: 'Site not found' };
	}

	const now = new Date();

	// Calculate next events for solar alignments (skip lunar standstill for now)
	const nextEvents = site.alignments
		.map(a => {
			if (a.type === 'lunar-standstill') {
				return null;
			}
			return calculateNextAlignment(
				site.latitude,
				site.longitude,
				a.bearing,
				a.event,
				a.type,
				site.tier,
				now
			);
		})
		.filter((e): e is NonNullable<typeof e> => e !== null);

	const [vigilStats, recentVigils] = await Promise.all([
		getSiteVigilStats(site.slug),
		getVigilsForSite(site.slug)
	]);

	const skySummary = getLocationSkySummary(site.latitude, site.longitude, now);

	return {
		site,
		nextEvents,
		vigilStats,
		recentVigils: recentVigils.slice(0, 10),
		skySummary
	};
}