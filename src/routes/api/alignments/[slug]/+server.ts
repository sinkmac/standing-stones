import { json } from '@sveltejs/kit';
import { getSite } from '$lib/server/sites';
import { calculateNextAlignment, getLocationSkySummary } from '$lib/server/alignments';
import { calculateNextLunarLunistice } from '$lib/server/lunarLunistice';
import { getVigilsForSite, getSiteVigilStats } from '$lib/server/vigil';

export async function GET({ params }) {
	const site = getSite(params.slug);
	if (!site) {
		return json({ error: 'Site not found' }, { status: 404 });
	}

	const now = new Date();

	// Calculate next events for each alignment
	const nextEvents = site.alignments
		.map(a => {
			if (a.type === 'lunar-standstill') {
				// Lunar standstill placeholder — separate solver needed
				return null;
			}
			if (a.type === 'lunar-lunistice-south') {
				const lev = calculateNextLunarLunistice(now, site.latitude);
				return lev ? {
					solsticeDate: lev.datetime,
					dateRange: lev.datetime.toLocaleDateString('en-GB', {
						weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
					}),
					eventTime: lev.datetime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
					daysBefore: 0,
					daysAfter: 0,
					windowDescription: `Monthly southern lunistice — the moon reaches declination ${lev.declinationDeg.toFixed(1)}° ` +
						`and rises at ${Math.round(lev.riseAzimuthDeg)}° from north, skimming the Sleeping Beauty ridge. ` +
						`Moon phase: ${lev.phaseBand}.`,
					isPrecise: site.tier === 'surveyed',
					moonDeclinationDeg: lev.declinationDeg,
					moonriseAzimuthDeg: lev.riseAzimuthDeg,
					moonPhase: lev.phaseBand
				} : null;
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
		.filter(Boolean);

	// Get vigil stats
	const [vigilStats, recentVigils] = await Promise.all([
		getSiteVigilStats(site.slug),
		getVigilsForSite(site.slug)
	]);

	// Get sky summary for no-alignment fallback
	const skySummary = getLocationSkySummary(site.latitude, site.longitude, now);

	return json({
		site: {
			slug: site.slug,
			name: site.name,
			altName: site.altName,
			region: site.region,
			tier: site.tier,
			description: site.description,
			marquee: site.marquee,
			registerSeeding: site.registerSeeding,
			access: site.access,
			dateConfidence: site.dateConfidence
		},
		nextEvents,
		vigilStats,
		recentVigils: recentVigils.slice(0, 10),
		skySummary
	});
}