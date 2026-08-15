import { getSite, sites } from '$lib/server/sites';
import { calculateNextAlignment } from '$lib/server/alignments';
import { getSiteVigilStats, getAllVigils } from '$lib/server/vigil';
import { SKY_BANDS } from '$lib/skyPalette';
import { selectLeader, type StateCandidate, type LastLedMap } from '$lib/server/rotationLogic';
import { loadRotation, saveRotation } from '$lib/server/rotation';

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

// Full fixed site-list order — canon tie-break for never-led sites.
const CANON_ORDER = sites.map(s => s.slug);

// Entry-recency window for state 2 eligibility (matches the brief's other windows).
const STATE2_WINDOW_DAYS = 90;

// Front-door copy — written in the property's voice. Not canon data.
const SENTENCE: Record<string, string> = {
	ballochroy:
		'On about six evenings in June, the sun goes down into the notch between the Paps of Jura, seen from a slab at Ballochroy.',
	drombeg:
		'Around the winter solstice, the setting sun aligns with the recumbent stone at Drombeg and lights the back of the circle.',
	callanish: 'Callanish stands on Lewis in the Outer Hebrides, among the darkest skies in Britain, open every hour of the night.'
};

const PRACTICAL_LINE: Record<string, string> = {
	ballochroy: 'Often it is raining.',
	drombeg: 'The circle is small. The sky around it is wide.',
	callanish:
		'No fixed alignment is tracked here — the sky itself is the constant. There is no wrong time to come.'
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
	const loaded = await loadRotation();
	const vigils = await getAllVigils();

	// Daily decision: reuse today's if already computed, else compute once and
	// persist (advancing the leader's lastLed and logging the decision). The
	// rotation is evaluated once per UTC day — stable within a day, fair across
	// days — rather than once per page request.
	const today = now.toISOString().slice(0, 10);
	const stored = loaded.state.decision;
	let decision: { site: string; state: 1 | 2 | 3; reason: string };
	let lastLed: LastLedMap = loaded.state.lastLed;

	if (stored && stored.asOf === today) {
		decision = { site: stored.site, state: stored.state, reason: stored.reason };
	} else {
		// State 1 candidates — open-access sites with a solar alignment within 60 days.
		const state1: StateCandidate[] = [];
		for (const slug of OPEN_ACCESS) {
			const ev = nextEvent(slug, now);
			if (ev && ev.daysUntil <= 60) {
				state1.push({ slug, daysUntil: ev.daysUntil, withinWindow: ev.withinWindow });
			}
		}

		// State 2 eligibility — open-access sites with any vigil within 90 days.
		// Entry recency is eligibility only; it no longer ranks.
		const cutoff = now.getTime() - STATE2_WINDOW_DAYS * DAY;
		const seenWithinWindow = new Set<string>();
		for (const v of vigils) {
			if (now.getTime() - new Date(v.createdAt).getTime() <= cutoff) {
				seenWithinWindow.add(v.siteSlug);
			}
		}
		const state2Eligible = OPEN_ACCESS.filter(slug => seenWithinWindow.has(slug));

		decision = selectLeader(state1, state2Eligible, lastLed, CANON_ORDER);

		// A rotation-pool site that just took the lead moves to the back of the
		// queue. State 3 (Callanish fallback) is not a rotation competitor.
		if (decision.state === 1 || decision.state === 2) {
			lastLed = { ...lastLed, [decision.site]: now.toISOString() };
		}
		await saveRotation(decision, today, lastLed);
	}

	if (decision.state === 3) {
		return buildLead('callanish', 3, { daysUntil: null, withinWindow: false });
	}

	const ev = nextEvent(decision.site, now) ?? { daysUntil: null, withinWindow: false };
	return buildLead(decision.site as LeadSiteId, decision.state as 1 | 2, ev);
}