import { json } from '@sveltejs/kit';
import { getSite } from '$lib/server/sites';
import { calculateNextAlignment, getLocationSkySummary } from '$lib/server/alignments';
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
			constructionDate: site.constructionDate
		},
		nextEvents,
		vigilStats,
		recentVigils: recentVigils.slice(0, 10),
		skySummary
	});
}