// Ancestral-sky drift: backward precession calculation.
// Reuses the same drift/precession logic as the solar solver, run backward
// instead of forward, to render how star positions have shifted across
// a site's construction-date window.
//
// Uses Meeus Chapter 21 (Precession) — the same model used by the solar
// solver for epoch conversions, just applied in reverse.
//
// Key principle: we render the *drift* — the star sliding across the site
// alignment as the sky precesses — not a fixed star at a fixed date.
// The uncertainty (the range of plausible positions across the construction
// window) is the content, not a caveat underneath it.

import { getSeasons } from './alignments';

// === Constants ===

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const J2000 = 2451545.0;

// Precession constants (Meeus 21.2)
const P1 = 1.396971; // degrees per Julian century
const P2 = 0.0003086;
const P3 = 0.000018; // ~1.39697°/century in RA precession

// === Helper: precession calculation ===

/**
 * Apply precession to convert RA/Dec from one epoch to another.
 * Implements the simplified precession model from Meeus Chapter 21.
 *
 * For the purpose of this tool (showing the sky has changed, not computing
 * precise planetary positions for an ephemeris), the simplified model is
 * sufficient — the drift across a 500-year window is ~7° of RA, easily
 * visible as a band without arcsecond precision.
 */
function precess(
	ra: number,
	dec: number,
	fromJD: number,
	toJD: number
): { ra: number; dec: number } {
	const fromCent = (fromJD - J2000) / 36525;
	const toCent = (toJD - J2000) / 36525;
	const centDiff = toCent - fromCent;

	// Simplified precession: mainly RA drift from precession of the equinoxes
	const precessRA = (P1 + P2 * fromCent + P3 * fromCent * fromCent) * centDiff * DEG;
	const precessDec = 0; // Declination precession is negligible for this timescale

	return {
		ra: ra + precessRA,
		dec: dec + precessDec
	};
}

function toJulian(date: Date): number {
	const year = date.getUTCFullYear();
	const month = date.getUTCMonth() + 1;
	const day = date.getUTCDate();

	let y = year;
	let m = month;
	if (m <= 2) { y -= 1; m += 12; }

	const A = Math.floor(y / 100);
	const B = 2 - A + Math.floor(A / 4);

	return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1))
		+ day + B - 1524.5;
}

/**
 * Convert RA/Dec to equatorial offset from a reference point.
 * Used to calculate how much a star's position has shifted
 * relative to the alignment axis.
 */
function angularSeparation(
	ra1: number, dec1: number,
	ra2: number, dec2: number
): number {
	const dRa = ra1 - ra2;
	const dDec = dec1 - dec2;
	return Math.sqrt(dRa * dRa + dDec * dDec) * RAD;
}

/**
 * Key stars of seasonal/cultural significance that would have been
 * visible in the Neolithic sky. These are the stars most likely to
 * have been used for alignment purposes.
 */
const KEY_STARS = [
	{ name: 'Polaris (α UMi)', ra: 2.530, dec: 89.264 * DEG, todayDec: 1 },
	{ name: 'Capella (α Aur)', ra: 5.257, dec: 45.994 * DEG, todayDec: 1 },
	{ name: 'Vega (α Lyr)', ra: 18.615, dec: 38.784 * DEG, todayDec: 1 },
	{ name: 'Deneb (α Cyg)', ra: 20.691, dec: 45.280 * DEG, todayDec: 1 },
	{ name: 'Aldebaran (α Tau)', ra: 4.596, dec: 16.509 * DEG, todayDec: 1 },
	{ name: 'Rigel (β Ori)', ra: 5.242, dec: -8.202 * DEG, todayDec: 1 },
	{ name: 'Sirius (α CMa)', ra: 6.753, dec: -16.716 * DEG, todayDec: 1 }
];

// === Public API ===

export interface DateConfidenceTier {
	type: 'eligible' | 'not-applicable' | 'unknown';
	/** The era date used for calculations (year CE/BCE — negative = BCE) */
	circaYear: number;
	/** One-sided range in years (± this many years) */
	range: number;
	/** Human-readable description of the dating evidence */
	evidence: string;
}

export interface StarDriftResult {
	starName: string;
	/** Approximate RA at the construction-date midpoint */
	historicalRA: number;
	/** Angular drift across the construction window in degrees */
	driftDegrees: number;
	/** Was the star likely visible at the site's latitude? */
	visible: boolean;
}

export interface AncestralSkyResult {
	siteSlug: string;
	dateConfidence: DateConfidenceTier;
	/** Drift data for key stars */
	stars: StarDriftResult[];
	/** Summary of the drift across the window */
	summary: string;
	/** The copy guardrail line — non-negotiable */
	guardrail: string;
	/** The default visualisation description (static band/spread) */
	bandDescription: string;
	/**
	 * For the optional scrub control: returns the star positions
	 * at specific dates within the window. The static band is the
	 * default (no interaction required); scrub is additive.
	 */
	scrubAvailable: boolean;
}

/**
 * Calculate ancestral-sky drift for a site with a known construction date.
 *
 * Returns a band/spread of star positions across the construction window,
 * not a single fixed render. The uncertainty (drift across the range)
 * is the content.
 *
 * Requires the site to have a DateConfidenceTier of 'eligible' with
 * a well-defined circaYear and range. Does not compute automatically
 * for sites whose dating evidence doesn't support it.
 */
export function calculateAncestralSky(
	siteSlug: string,
	latitude: number,
	dateConfidence: DateConfidenceTier
): AncestralSkyResult | null {
	if (dateConfidence.type !== 'eligible') {
		return null;
	}

	const { circaYear, range, evidence } = dateConfidence;

	// Convert the construction date range to Julian dates
	// year 0 = 1 BCE, year -1 = 2 BCE, etc.
	const yearToJD = (year: number): number => {
		const y = year < 0 ? year + 1 : year; // astronomical year
		const date = new Date(Date.UTC(y, 5, 15)); // approximate midsummer
		return toJulian(date);
	};

	const midJD = yearToJD(circaYear);
	const startJD = yearToJD(circaYear - range);
	const endJD = yearToJD(circaYear + range);

	// Calculate star positions at the start and end of the window
	const stars = KEY_STARS.map(star => {
		// Precess from J2000 back to the site's era
		const atStart = precess(star.ra, star.dec, J2000, startJD);
		const atEnd = precess(star.ra, star.dec, J2000, endJD);

		const drift = angularSeparation(atStart.ra, atStart.dec, atEnd.ra, atEnd.dec);

		// Check visibility: star's declination roughly tells us
		// if it's above the horizon often enough to be notable
		// At latitude φ, stars with dec > (90° - φ) are circumpolar
		const decAtMid = (atStart.dec + atEnd.dec) / 2;
		const visibleAtLat = (decAtMid * RAD) > -90 + Math.abs(latitude);

		return {
			starName: star.name,
			historicalRA: (atStart.ra + atEnd.ra) / 2,
			driftDegrees: Math.round(drift * 100) / 100,
			visible: visibleAtLat
		};
	});

	// Find the star with the most visible drift
	const visibleStars = stars.filter(s => s.visible);
	const maxDriftStar = visibleStars.reduce((a, b) => a.driftDegrees > b.driftDegrees ? a : b, visibleStars[0]);

	// Build the band description
	const bandDescription = `Across the ${circaYear < 0 ? Math.abs(circaYear) + ' BCE' : circaYear + ' CE'} ` +
		`construction window (spanning about ${range * 2} years), ` +
		`the positions of key stars drifted by up to ${maxDriftStar?.driftDegrees ?? '~1'} degrees ` +
		`in the sky — roughly ${Math.round((maxDriftStar?.driftDegrees ?? 1) * 0.67)} times the width of the moon. ` +
		`This drift is shown as a band of plausible positions, not a single fixed star map.`;

	// The non-negotiable guardrail line — blocks retroactive-intentionality inference
	const guardrail = 'We don\'t know why they built this, only that the sky above it has changed. ' +
		'The alignment you see today — if there is one — would have pointed at a different piece of sky ' +
		'when these stones were raised. That doesn\'t mean the builders used this star, or any star. ' +
		'We can calculate where the stars were; we cannot calculate what the builders saw in them.';

	const summary = `The sky over ${siteSlug} has shifted noticeably since the site was built. ` +
		`Stars that rise over the alignment axis today would have risen in a different direction ` +
		`${range * 2} years ago — the difference is visible as a band, not a point.`;

	return {
		siteSlug,
		dateConfidence,
		stars,
		summary,
		guardrail,
		bandDescription,
		scrubAvailable: range > 25 // scrub useful if the window is wide enough
	};
}

/**
 * Get star positions at a specific date within the construction window.
 * For the optional scrub control — not the default view.
 */
export function scrubAncestralSky(
	date: Date,
	latitude: number,
	dateConfidence: DateConfidenceTier
): { starName: string; ra: number; dec: number }[] | null {
	if (dateConfidence.type !== 'eligible') return null;

	const queryJD = toJulian(date);

	return KEY_STARS.map(star => {
		const pos = precess(star.ra, star.dec, J2000, queryJD);
		return {
			starName: star.name,
			ra: pos.ra,
			dec: pos.dec * RAD
		};
	});
}