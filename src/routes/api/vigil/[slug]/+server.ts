import { json } from '@sveltejs/kit';
import { recordVigil, getVigilsForSite, getSiteVigilStats } from '$lib/server/vigil';
import { getSite } from '$lib/server/sites';

export async function POST({ params, request }) {
	const site = getSite(params.slug);
	if (!site) {
		return json({ error: 'Site not found' }, { status: 404 });
	}

	// Parse request body
	const body = await request.json();

	// Validate required fields
	if (!body.observation || typeof body.observation !== 'string' || body.observation.trim().length < 3) {
		return json({ error: 'Observation is required (min 3 characters)' }, { status: 400 });
	}

	const entry = await recordVigil({
		siteSlug: params.slug,
		visitDate: body.visitDate || new Date().toISOString().split('T')[0],
		visitTime: body.visitTime,
		alignmentType: body.alignmentType || site.alignments[0]?.type || 'unknown',
		sawEvent: body.sawEvent === undefined ? null : Boolean(body.sawEvent),
		observation: body.observation.trim(),
		weather: body.weather || 'other',
		keeperName: body.keeperName || undefined
	});

	const stats = await getSiteVigilStats(site.slug);

	return json({ entry, stats }, { status: 201 });
}

export async function GET({ params }) {
	const site = getSite(params.slug);
	if (!site) {
		return json({ error: 'Site not found' }, { status: 404 });
	}

	const [vigils, stats] = await Promise.all([
		getVigilsForSite(site.slug),
		getSiteVigilStats(site.slug)
	]);

	return json({ vigils, stats });
}