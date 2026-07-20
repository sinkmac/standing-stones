// Lunar standstill solver — separate dispatch from the solar solver.
// Calculates major/minor lunar standstill timing using node precession.
//
// Reference: Meeus, "Astronomical Algorithms" Ch. 46 (Position of the Moon)
// and Ch. 51 (Lunar Node position). Node regression period ~18.612 years.
//
// A lunar standstill occurs when the moon's orbital node aligns with
// the ecliptic such that the moon reaches its maximum possible declination
// (±28.6° at major standstill, ±18.3° at minor standstill).
//
// The standstill is a season lasting several months, not an instant.
// This solver returns windows, consistent with the house style.

import { getSeasons, calculateNextAlignment } from './alignments';

// === Constants ===

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const J2000 = 2451545.0;

// Lunar node regression: one full cycle ≈ 18.612 years, or about
// 6798.38 days. Node longitude decreases by about 0.05295° per day.
const NODE_PERIOD_DAYS = 6798.38; // regression period
const NODE_RATE = -0.05295; // degrees per day (negative = regression)
const NODE_LONGITUDE_J2000 = 125.04; // longitude of ascending node at J2000.0

// Moon's orbital inclination to the ecliptic
const MOON_INCLINATION = 5.145 * DEG;

// Ecliptic obliquity
const OBLIQUITY = 23.439 * DEG;

// === Helper functions ===

function toJulian(date: Date): number {
	const year = date.getUTCFullYear();
	const month = date.getUTCMonth() + 1;
	const day = date.getUTCDate();
	const hour = date.getUTCHours();
	const minute = date.getUTCMinutes();
	const second = date.getUTCSeconds();

	let y = year;
	let m = month;
	if (m <= 2) { y -= 1; m += 12; }

	const A = Math.floor(y / 100);
	const B = 2 - A + Math.floor(A / 4);

	return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1))
		+ day + (hour + minute / 60 + second / 3600) / 24.0 + B - 1524.5;
}

function normalizeAngle(deg: number): number {
	return deg - 360 * Math.floor(deg / 360);
}

/**
 * Calculate the ecliptic longitude of the moon's ascending node at a given date.
 * The node regresses along the ecliptic with a period of ~18.6 years.
 */
function nodeLongitude(jd: number): number {
	const daysSinceJ2000 = jd - J2000;
	const longitude = NODE_LONGITUDE_J2000 + NODE_RATE * daysSinceJ2000;
	return normalizeAngle(longitude);
}

/**
 * Calculate the moon's maximum possible declination at a given time.
 * At major standstill, the moon's orbit adds its inclination to the
 * ecliptic obliquity, reaching a declination of approximately
 * ε + i ≈ 23.44° + 5.15° = 28.59°.
 *
 * More precisely, the actual declination varies over the 27.3-day
 * draconic cycle. The *peak achievable* declination within a standstill
 * window depends on the node position.
 */
function moonMaxDeclination(jd: number): number {
	const node = nodeLongitude(jd) * DEG;
	// The moon's declination extreme varies sinusoidally with node position.
	// When the ascending node is at 0° (vernal equinox), the moon's orbit
	// tilts maximally north → maximum possible declination.
	// When the node is at 90°, the tilt is east-west → minimum declination range.
	const tiltFactor = Math.sin(node); // =1 when node=90°, =0 when node=0°
	return OBLIQUITY + MOON_INCLINATION * Math.abs(tiltFactor);
}

/**
 * Determine whether a given date is within a major standstill window.
 * A major standstill occurs when the moon's maximum declination
 * exceeds ~28° (threshold). The standstill season spans roughly
 * 2-3 years around the node extreme.
 */
function isMajorStandstill(jd: number): boolean {
	const maxDec = moonMaxDeclination(jd);
	// Major standstill threshold: declination extreme >= 28°
	// Minor standstill: declination extreme <= 19°
	return maxDec * RAD >= 28.0;
}

/**
 * Find the next major standstill start date after a given date.
 * Uses binary search across the ~18.6-year cycle.
 */
function findNextMajorStandstill(fromDate: Date): { start: Date; end: Date; peak: Date } {
	const fromJd = toJulian(fromDate);

	// Check approximate node alignment windows.
	// Node completes a full regression every 18.6 years.
	// Major standstill happens near node longitude = 0° or 180°
	// (when the orbit adds maximally to ecliptic declination).
	// Let's search forward from the current date.

	let searchJd = fromJd;
	const maxLookaheadDays = 365.25 * 25; // look up to 25 years ahead

	// Find a date within a major standstill window
	let found = false;
	let startJd = searchJd;

	for (let offset = 0; offset < maxLookaheadDays; offset += 7) {
		const jd = searchJd + offset;
		if (isMajorStandstill(jd)) {
			startJd = jd;
			found = true;
			break;
		}
	}

	if (!found) {
		// Shouldn't happen within 25 years — major standstills are ~9 years apart
		// Worst case: extend the search
		searchJd += 365.25 * 20;
		for (let offset = 0; offset < maxLookaheadDays; offset += 7) {
			const jd = searchJd + offset;
			if (isMajorStandstill(jd)) {
				startJd = jd;
				found = true;
				break;
			}
		}
	}

	if (!found) {
		throw new Error('Could not find next major standstill within search window');
	}

	// Walk backward to find the start of the window
	let windowStart = startJd;
	for (let d = 0; d < 400; d++) {
		const jd = startJd - d;
		if (!isMajorStandstill(jd)) {
			windowStart = startJd - d + 1;
			break;
		}
	}

	// Walk forward to find the end
	let windowEnd = startJd;
	for (let d = 0; d < 400; d++) {
		const jd = startJd + d;
		if (!isMajorStandstill(jd)) {
			windowEnd = startJd + d - 1;
			break;
		}
	}

	// Peak is approximately when the moon's declination extreme is highest
	// This is near the midpoint
	const peakJd = (windowStart + windowEnd) / 2;

	const fromJD = (j: number) => {
		const jdInt = Math.floor(j + 0.5);
		const frac = j + 0.5 - jdInt;
		let a = jdInt;
		if (jdInt >= 2299161) {
			const alpha = Math.floor((jdInt - 1867216.25) / 36524.25);
			a = jdInt + 1 + alpha - Math.floor(alpha / 4);
		}
		const b = a + 1524;
		const c = Math.floor((b - 122.1) / 365.25);
		const d = Math.floor(365.25 * c);
		const e = Math.floor((b - d) / 30.6001);
		const day = b - d - Math.floor(30.6001 * e) + frac;
		const month = e <= 13 ? e - 1 : e - 13;
		const year = month <= 2 ? c - 4715 : c - 4716;
		const totalSeconds = Math.round((day - Math.floor(day)) * 86400);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;
		return new Date(Date.UTC(year, month - 1, Math.floor(day), hours, minutes, seconds));
	};

	return {
		start: fromJD(windowStart),
		peak: fromJD(peakJd),
		end: fromJD(windowEnd)
	};
}

// === Public API ===

export interface LunarStandstillEvent {
	type: 'major-standstill';
	peakYear: number;
	windowStart: Date;
	windowEnd: Date;
	peakDate: Date;
	description: string;
	windowDuration: string;
	isPrecise: boolean;
}

/**
 * Calculate the next major lunar standstill window.
 *
 * Returns a window (not an instant), consistent with the house style.
 * The standstill is a season spanning 2-3 years; the user can experience
 * the extreme moon phenomena at any point within that window.
 *
 * Label: "Next kept vigil: 2043" — framed as a rare/prestige event,
 * not as a repeat-vigil engine.
 */
export function calculateLunarStandstill(
	tier: 'surveyed' | 'traditional',
	fromDate: Date = new Date()
): LunarStandstillEvent | null {
	try {
		const { start, end, peak } = findNextMajorStandstill(fromDate);
		const peakYear = peak.getFullYear();

		// Duration of the window in months
		const durationMs = end.getTime() - start.getTime();
		const durationMonths = Math.round(durationMs / (30.44 * 86400000));

		const fmtDate = (d: Date) =>
			d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

		const isPrecise = tier === 'surveyed';

		let description: string;
		if (isPrecise) {
			description = `Major lunar standstill season from ${fmtDate(start)} to ${fmtDate(end)}, ` +
				`peaking around ${peak.getFullYear()}. During this window the moon reaches its extreme ` +
				`declination of ±28.6°, rising and setting at its furthest points along the horizon. ` +
				`At high latitudes (like Orkney at 59°N), the moon may stay above the horizon for ` +
				`days at a time during this period.`;
		} else {
			description = `Major lunar standstill season around ${peakYear}. ` +
				`The alignment is described in traditional accounts but specific timing is not ` +
				`precisely documented from surveyed sources.`;
		}

		return {
			type: 'major-standstill',
			peakYear,
			windowStart: start,
			windowEnd: end,
			peakDate: peak,
			description,
			windowDuration: `~${durationMonths} months`,
			isPrecise
		};
	} catch {
		return null;
	}
}

/**
 * Get a human-readable countdown-like message for a lunar standstill.
 * Framed as a rare/prestige event, not a repeat-vigil.
 */
export function formatStandstillContext(event: LunarStandstillEvent): string {
	const now = new Date();
	const yearsAway = event.peakYear - now.getFullYear();

	if (yearsAway <= 0) {
		return `Major standstill ongoing — reaches peak around ${event.peakYear}. ` +
			`The next one won't come around until well into the 2060s.`;
	}
	if (yearsAway === 1) {
		return `Next major standstill peaks next year (${event.peakYear}). ` +
			`The last one before that was around ${event.peakYear - 18.6}. ` +
			`Most people will experience this once or twice in a lifetime.`;
	}
	return `Next major standstill peaks around ${event.peakYear} — ` +
		`roughly ${yearsAway} years away. The last one was around ${Math.round(event.peakYear - 18.6)}. ` +
		`Most people will experience this once or twice in a lifetime.`;
}