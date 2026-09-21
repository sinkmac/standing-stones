// Measured magnetic declination — an APP-LEVEL table, never a canon field.
//
// Declination is a property of POSITION, so the table is keyed by position and
// not by slug. Two reasons that is the right key here:
//   1. It is physically correct — declination is a function of where you are.
//   2. A slug key would bake the field-test site's slug into the production
//      bundle, and scripts/verify-prod-bundle.ts forbids that word in the build
//      output. Coordinates are just numbers.
//
// Values are measured (not assumed) from the keyless BGS World Magnetic Model
// web service, the same source the conditions round used:
//   https://geomag.bgs.ac.uk/web_service/GMModels/wmm/2025/?latitude=..&longitude=..&format=json
// Nothing here implies a *verification* — a declination is a measurement with an
// epoch, and it drifts. Re-measure annually.
//
// Settled shape (conditions round): { declinationDeg, epoch, driftPerYear }.
// The table is keyed by latitude/longitude instead of slug; the record itself is
// exactly that settled shape plus the position it was measured at.

export interface DeclinationEntry {
	/** Position the value was measured at (WGS84 degrees). */
	latitude: number;
	longitude: number;
	/** Declination in degrees, EAST-POSITIVE. Negative = west of true north. */
	declinationDeg: number;
	/** Fractional year the value was measured at (e.g. 2026.716). */
	epoch: number;
	/** Degrees of east drift per year, or null when the drift was NOT measured
	 *  for this point — in which case the value is held at its epoch. */
	driftPerYear: number | null;
	source: string;
}

/** The canon declination entries. Only Callanish has a MEASURED value; every
 *  other canon site has none, so declinationFor() returns null for it and the
 *  band says so rather than inventing a correction. */
const CANON_DECLINATION: DeclinationEntry[] = [
	{
		latitude: 58.19754,
		longitude: -6.74514,
		declinationDeg: -2.14,
		epoch: 2026.716,
		// +13.4 arcmin/yr east ~= 0.22333 deg/yr (measured in the conditions round).
		driftPerYear: 0.22333,
		source: 'BGS WMM2025 at 58.19754N 6.74514W, alt 0 — Callanish'
	}
];

/** DEV-TEST material, not canon: the field-test point's entry. It must not exist
 *  in a production build — it is gated by the same flag that gates the dev site
 *  (see DECLINATION_TABLE below). */
const FIELD_TEST_DECLINATION: DeclinationEntry = {
	latitude: 56.676,
	longitude: -3.007,
	declinationDeg: -0.346,
	epoch: 2026.716,
	// Drift for this point was not measured, so it is held at its epoch rather
	// than extrapolated on an assumed rate.
	driftPerYear: null,
	source: 'BGS WMM2025 at 56.676N 3.007W, alt 0 — field-test point'
};

/** The build flag, injected by Vite from INCLUDE_DEV_SITE. In a plain Node
 *  context (the gates) there is no define, so the identifier is absent and the
 *  guard below yields false — the gates stand the global up themselves when they
 *  want to exercise the flagged state. */
const INCLUDE_DEV_SITE: boolean =
	typeof __INCLUDE_DEV_SITE__ !== 'undefined' ? __INCLUDE_DEV_SITE__ : false;

/** The measured declination table, keyed by POSITION (declination is a property
 *  of where you are, and a slug key would put the field-test slug into the
 *  production bundle). The field-test entry is DEV-TEST material: it is present
 *  only when the build carries the dev-only test site, so it never ships.
 *  The canon entries are unaffected in either state. */
export const DECLINATION_TABLE: DeclinationEntry[] = INCLUDE_DEV_SITE
	? [...CANON_DECLINATION, FIELD_TEST_DECLINATION]
	: CANON_DECLINATION;

/** How close a site must sit to a measured point to inherit its value. */
export const DECLINATION_MATCH_TOLERANCE_DEG = 0.05;

/** The measured entry for a position, or null when none is close enough.
 *  Null means "no local correction is measured" — never "zero declination". */
export function declinationFor(latitude: number, longitude: number): DeclinationEntry | null {
	let best: DeclinationEntry | null = null;
	let bestDist = Infinity;
	for (const entry of DECLINATION_TABLE) {
		const d = Math.hypot(entry.latitude - latitude, entry.longitude - longitude);
		if (d < bestDist) {
			bestDist = d;
			best = entry;
		}
	}
	return best !== null && bestDist <= DECLINATION_MATCH_TOLERANCE_DEG ? best : null;
}

/** Fractional year of a date, for epoch-based drift. */
export function fractionalYear(date: Date): number {
	const y = date.getUTCFullYear();
	const start = Date.UTC(y, 0, 1);
	const end = Date.UTC(y + 1, 0, 1);
	return y + (date.getTime() - start) / (end - start);
}

/** Declination at a date: the measured value plus measured drift since the
 *  epoch, or the value held constant when the drift was not measured. */
export function declinationAt(entry: DeclinationEntry, date: Date): number {
	if (entry.driftPerYear === null) return entry.declinationDeg;
	return entry.declinationDeg + entry.driftPerYear * (fractionalYear(date) - entry.epoch);
}

function normalize360(deg: number): number {
	return ((deg % 360) + 360) % 360;
}

/** True bearing from a magnetic bearing (declination east-positive):
 *  true = magnetic + declination. At Callanish, true = magnetic - 2.14. */
export function magneticToTrue(magneticDeg: number, declinationDeg: number): number {
	return normalize360(magneticDeg + declinationDeg);
}

/** Signed shortest angular difference a - b, in (-180, 180]. */
export function angleDiff(a: number, b: number): number {
	return ((a - b + 540) % 360) - 180;
}
