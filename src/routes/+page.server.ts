import { getSite } from '$lib/server/sites';
import { calculateNextAlignment } from '$lib/server/alignments';
import { getSiteVigilStats, getAllVigils } from '$lib/server/vigil';

type LeadSiteId = 'ballochroy' | 'drombeg' | 'callanish';

interface LeadSite {
	id: LeadSiteId;
	sentence: string;
	practicalLine: string;
	daysUntil: number | null;
	withinWindow: boolean;
	showSky: boolean;
	skyBands: string[];
}

export interface HomePageData {
	site: LeadSite;
	state: 1 | 2 | 3;
	vigilCount: number;
	seenKeptRatio: string | null;
}

// Open-access sites eligible for states 1 and 2, in lead-priority order.
const OPEN_ACCESS = ['ballochroy', 'drombeg'] as const;

// Front-door copy — written in the property's voice. Not canon data.
const SENTENCE: Record<string, string> = {
	ballochroy:
		'On about six evenings in June, the sun goes down into the notch between the Paps of Jura, seen from a slab at Ballochroy.',
	drombeg:
		'Around the winter solstice, the setting sun aligns with the recumbent stone at Drombeg and lights the back of the circle.',
	callanish: 'Callanish stands on Lewis in the Outer Hebrides, Bortle 2, open every hour of the night.'
};

const PRACTICAL_LINE: Record<string, string> = {
	ballochroy: 'Often it is raining.',
	drombeg: 'The circle is small. The sky around it is wide.',
	callanish: 'No alignment is due. It is open every hour.'
};

// Banded-sky palettes, top band first. Written to CSS custom properties in the
// component (--sky-band-1 .. --sky-band-6), never hardcoded in markup.
const SKY_BANDS: Record<string, string[]> = {
	ballochroy: ['#0a0d12', '#141a25', '#2a2f3d', '#6d524d', '#8a6250', '#a5764f'],
	drombeg: ['#0b0e14', '#18202b', '#2b333e', '#4d5058', '#666069', '#b9ac96'],
	callanish: ['#080a0f', '#0d1119', '#111720', '#151b23', '#1a2028', '#1f252e']
};

const DAY = 86_400_000;

/**
 * Next solar alignment for an open-access site, reduced to the two fields this
 * page needs. Solar only — lunar alignment sites (Callanish) lead state 3 with
 * no countdown. Returns null when the site has no upcoming solar alignment.
 */
function nextEvent(slug: string, now: Date): { daysUntil: number; withinWindow: boolean } | null {
	const site = getSite(slug);
	if (!site) return null;

	for (const a of site.alignments) {
		if (a.type.includes('lunar')) continue;
		const e = calculateNextAlignment(
			site.latitude,
			site.longitude,
			a.bearing,
			a.event,
			a.type,
			site.tier,
			now
		);
		if (!e) continue;

		const at = e.solsticeDate.getTime();
		const withinWindow = now.getTime() >= at - e.daysBefore * DAY && now.getTime() <= at + e.daysAfter * DAY;
		// "This week" takes display precedence; daysUntil only matters outside the window.
		const daysUntil = withinWindow ? 0 : Math.max(0, Math.ceil((at - now.getTime()) / DAY));
		return { daysUntil, withinWindow };
	}

	return null;
}

async function buildLead(
	slug: string,
	state: 1 | 2 | 3,
	ev: { daysUntil: number | null; withinWindow: boolean }
): Promise<HomePageData> {
	const stats = await getSiteVigilStats(slug);
	const seenKeptRatio =
		stats.total >= 3 ? `Seen ${stats.seen} of the last ${stats.seen + stats.notSeen} vigils.` : null;

	return {
		site: {
			id: slug as LeadSiteId,
			sentence: SENTENCE[slug],
			practicalLine: PRACTICAL_LINE[slug],
			daysUntil: ev.daysUntil,
			withinWindow: ev.withinWindow,
			showSky: Boolean(SKY_BANDS[slug]),
			skyBands: SKY_BANDS[slug] ?? []
		},
		state,
		vigilCount: stats.total,
		seenKeptRatio
	};
}

export async function load(): Promise<HomePageData> {
	const now = new Date();

	// State 1 — the nearest open-access alignment within 60 days leads.
	let nearest: { slug: string; ev: { daysUntil: number; withinWindow: boolean } } | null = null;
	for (const slug of OPEN_ACCESS) {
		const ev = nextEvent(slug, now);
		if (ev && ev.daysUntil <= 60 && (!nearest || ev.daysUntil < nearest.ev.daysUntil)) {
			nearest = { slug, ev };
		}
	}
	if (nearest) {
		return buildLead(nearest.slug, 1, nearest.ev);
	}

	// State 2 — the most recent vigil at an open-access site within 90 days leads.
	const all = await getAllVigils();
	const recent = all.find(
		(v) =>
			(OPEN_ACCESS as readonly string[]).includes(v.siteSlug) &&
			Date.now() - new Date(v.createdAt).getTime() <= 90 * DAY
	);
	if (recent) {
		return buildLead(recent.siteSlug, 2, nextEvent(recent.siteSlug, now) ?? { daysUntil: null, withinWindow: false });
	}

	// State 3 — Callanish fallback. No countdown.
	return buildLead('callanish', 3, { daysUntil: null, withinWindow: false });
}