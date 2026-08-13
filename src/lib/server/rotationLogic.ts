// Pure rotation-selection logic — no I/O, no Svelte, no HTTP. Unit-testable in
// isolation (see scripts/verify-rotation.ts).
//
// Rule (Hermes brief, 13 Aug 2026, daily-hold variant):
//   among currently-eligible open-access sites, lead whichever has led least
//   recently. Least-recently-led is THE tie-break in both state 1 (equal
//   alignment distance) and state 2 (entry recency gates eligibility only).
//   Fresh state (never led) breaks by canon order — the fixed site list order
//   in sites.ts — not alphabetical, not random.

export interface StateCandidate {
	slug: string;
	daysUntil: number | null;
	withinWindow: boolean;
}

/** slug -> ISO timestamp of the last lead. Absent/null = this site has never led. */
export type LastLedMap = Record<string, string | null | undefined>;

export interface LeaderDecision {
	site: string;
	state: 1 | 2 | 3;
	reason: string;
}

const NEVER_LED = 0;

/**
 * Compare two pool sites for leadership: least recently led first, never-led
 * sites first among themselves, then canon order. Never-led (no entry) is
 * treated as epoch-zero so a site that has never taken a turn is preferred
 * over one that has — this is what makes the rule self-correcting.
 */
export function leaderCompare(
	a: string,
	b: string,
	lastLed: LastLedMap,
	canonOrder: string[]
): number {
	const aLed = lastLed[a] ? new Date(lastLed[a]!).getTime() : NEVER_LED;
	const bLed = lastLed[b] ? new Date(lastLed[b]!).getTime() : NEVER_LED;
	if (aLed !== bLed) return aLed - bLed;
	const aRank = canonOrder.indexOf(a);
	const bRank = canonOrder.indexOf(b);
	return (aRank === -1 ? Number.MAX_SAFE_INTEGER : aRank) -
		(bRank === -1 ? Number.MAX_SAFE_INTEGER : bRank);
}

/**
 * Decide the front-door leader from the candidate pools.
 *
 * state1: open-access sites whose next solar alignment is within 60 days,
 *         with their computed distance (caller has already windowed them).
 * state2Eligible: open-access slugs with at least one vigil within 90 days
 *         (entry recency is eligibility only — it no longer ranks).
 * lastLed: persistent lead history; source of the tie-break.
 * canonOrder: full fixed site-list order, used to break never-led ties.
 */
export function selectLeader(
	state1: StateCandidate[],
	state2Eligible: string[],
	lastLed: LastLedMap,
	canonOrder: string[]
): LeaderDecision {
	if (state1.length > 0) {
		const minDays = Math.min(
			...state1.map(c => (c.daysUntil === null ? Number.MAX_SAFE_INTEGER : c.daysUntil))
		);
		const tied = state1.filter(c => (c.daysUntil === null ? Number.MAX_SAFE_INTEGER : c.daysUntil) === minDays).length > 1;
		const winner = [...state1].sort((a, b) => {
			const d =
				(a.daysUntil === null ? Number.MAX_SAFE_INTEGER : a.daysUntil) -
				(b.daysUntil === null ? Number.MAX_SAFE_INTEGER : b.daysUntil);
			return d !== 0 ? d : leaderCompare(a.slug, b.slug, lastLed, canonOrder);
		})[0];
		return {
			site: winner.slug,
			state: 1,
			reason: tied
				? 'state 1, tie-break: least-recently-led'
				: 'state 1, nearest alignment'
		};
	}

	if (state2Eligible.length > 0) {
		const winner = [...state2Eligible].sort((a, b) =>
			leaderCompare(a, b, lastLed, canonOrder)
		)[0];
		return {
			site: winner,
			state: 2,
			reason: state2Eligible.length > 1
				? 'state 2, least-recently-led'
				: 'state 2, sole eligible'
		};
	}

	return { site: 'callanish', state: 3, reason: 'state 3, callanish fallback' };
}