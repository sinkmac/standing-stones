import { json } from '@sveltejs/kit';
import { recordVigil, getVigilsForSite, getSiteVigilStats } from '$lib/server/vigil';
import { getSite } from '$lib/server/sites';

export function POST({ params, request }) {
	const site = getSite(params.slug);
	if (!site) {
		return json({ error: 'Site not found' }, { status: 404 });
	}

	// Parse request body
	const body = request.json();

	// Validate required fields
	if (!body.observation || typeof body.observation !== 'string' || body.observation.trim().length < 3) {
		return json({ error: 'Observation is required (min 3 characters)' }, { status: 400 });
	}

	const entry = recordVigil({
		siteSlug: params.slug,
		visitDate: body.visitDate || new Date().toISOString().split('T')[0],
		visitTime: body.visitTime,
		alignmentType: body.alignmentType || site.alignments[0]?.type || 'unknown',
		sawEvent: body.sawEvent === undefined ? null : Boolean(body.sawEvent),
		observation: body.observation.trim(),
		weather: body.weather || 'other',
		keeperName: body.keeperName || undefined
	});

	return json({ entry, stats: getSiteVigilStats(site.slug) }, { status: 201 });
}

export function GET({ params }) {
	const site = getSite(params.slug);
	if (!site) {
		return json({ error: 'Site not found' }, { status: 404 });
	}

	const vigils = getVigilsForSite(site.slug);
	const stats = getSiteVigilStats(site.slug);

	return json({ vigils, stats });
}