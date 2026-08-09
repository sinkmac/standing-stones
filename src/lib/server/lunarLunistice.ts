// Monthly southern lunar lunistice solver — standalone, zero dependencies.
//
// Computes the moon's geocentric ecliptic longitude/latitude (and hence
// declination + illuminated fraction) from Meeus, "Astronomical Algorithms"
// 2nd ed., Chapter 47 "Position of the Moon". The periodic-term coefficient
// tables (47.a longitude, 47.b latitude) are transcribed verbatim from the
// pymeeus faithful Meeus port (MIT/LGPL, https://github.com/architest/pymeeus
// , pymeeus/Moon.py) to avoid transcription drift from the printed book.
//
// A southern monthly lunistice is the moment in each draconic month (~27.21 d)
// when the moon reaches its most southerly declination (the local minimum of
// declination): the moon rises at its most southerly azimuth. The major lunar
// standstill (18.6-yr cycle) peaked 2025 and is now descending toward the
// minor standstill ~2033, so the exact southern declination reached declines
// year on year, but a monthly lunistice is always present.
//
// Mirrors the house style of alignments.ts: mean equinox of date, no nutation
// (sub-arcminute error is below the precision a "next event" dateline needs).

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const J2000 = 2451545.0;

function reduce360(deg: number): number {
	return deg - 360 * Math.floor(deg / 360);
}

// Table 47.a — [D, M, M', F] multipliers, longitude coeff (1e-6 deg), distance coeff (1e-3 km).
// Distance column is unused by the declination solver but kept for fidelity with the source.
const LUNAR_LON_TABLE: number[][] = [
	[0,0,1,0,6288774,-20905355],[2,0,-1,0,1274027,-3699111],[2,0,0,0,658314,-2955968],
	[0,0,2,0,213618,-569925],[0,1,0,0,-185116,48888],[0,0,0,2,-114332,-3149],
	[2,0,-2,0,58793,246158],[2,-1,-1,0,57066,-152138],[2,0,1,0,53322,-170733],
	[2,-1,0,0,45758,-204586],[0,1,-1,0,-40923,-129620],[1,0,0,0,-34720,108743],
	[0,1,1,0,-30383,104755],[2,0,0,-2,15327,10321],[0,0,1,2,-12528,0],
	[0,0,1,-2,10980,79661],[4,0,-1,0,10675,-34782],[0,0,3,0,10034,-23210],
	[4,0,-2,0,8548,-21636],[2,1,-1,0,-7888,24208],[2,1,0,0,-6766,30824],
	[1,0,-1,0,-5163,-8379],[1,1,0,0,4987,-16675],[2,-1,1,0,4036,-12831],
	[2,0,2,0,3994,-10445],[4,0,0,0,3861,-11650],[2,0,-3,0,3665,14403],
	[0,1,-2,0,-2689,-7003],[2,0,-1,2,-2602,0],[2,-1,-2,0,2390,10056],
	[1,0,1,0,-2348,6322],[2,-2,0,0,2236,-9884],[0,1,2,0,-2120,5751],
	[0,2,0,0,-2069,0],[2,-2,-1,0,2048,-4950],[2,0,1,-2,-1773,4130],
	[2,0,0,2,-1595,0],[4,-1,-1,0,1215,-3958],[0,0,2,2,-1110,0],
	[3,0,-1,0,-892,3258],[2,1,1,0,-810,2616],[4,-1,-2,0,759,-1897],
	[0,2,-1,0,-713,-2117],[2,2,-1,0,-700,2354],[2,1,-2,0,691,0],
	[2,-1,0,-2,596,0],[4,0,1,0,549,-1423],[0,0,4,0,537,-1117],
	[4,-1,0,0,520,-1571],[1,0,-2,0,-487,-1739],[2,1,0,-2,-399,0],
	[0,0,2,-2,-381,-4421],[1,1,1,0,351,0],[3,0,-2,0,-340,0],
	[4,0,-3,0,330,0],[2,-1,2,0,327,0],[0,2,1,0,-323,1165],
	[1,1,-1,0,299,0],[2,0,3,0,294,0],[2,0,-1,-2,0,8752]
];

// Table 47.b — [D, M, M', F] multipliers, latitude coeff (1e-6 deg).
const LUNAR_LAT_TABLE: number[][] = [
	[0,0,0,1,5128122],[0,0,1,1,280602],[0,0,1,-1,277693],[2,0,0,-1,173237],
	[2,0,-1,1,55413],[2,0,-1,-1,46271],[2,0,0,1,32573],[0,0,2,1,17198],
	[2,0,1,-1,9266],[0,0,2,-1,8822],[2,-1,0,-1,8216],[2,0,-2,-1,4324],
	[2,0,1,1,4200],[2,1,0,-1,-3359],[2,-1,-1,1,2463],[2,-1,0,1,2211],
	[2,-1,-1,-1,2065],[0,1,-1,-1,-1870],[4,0,-1,-1,1828],[0,1,0,1,-1794],
	[0,0,0,3,-1749],[0,1,-1,1,-1565],[1,0,0,1,-1491],[0,1,1,1,-1475],
	[0,1,1,-1,-1410],[0,1,0,-1,-1344],[1,0,0,-1,-1335],[0,0,3,1,1107],
	[4,0,0,-1,1021],[4,0,-1,1,833],[0,0,1,-3,777],[4,0,-2,1,671],
	[2,0,0,-3,607],[2,0,2,-1,596],[2,-1,1,-1,491],[2,0,-2,1,-451],
	[0,0,3,-1,439],[2,0,2,1,422],[2,0,-3,-1,421],[2,1,-1,1,-366],
	[2,1,0,1,-351],[4,0,0,1,331],[2,-1,1,1,315],[2,-2,0,-1,302],
	[0,0,1,3,-283],[2,1,1,-1,-229],[1,1,0,-1,223],[1,1,0,1,223],
	[0,1,-2,-1,-220],[2,1,-1,-1,-220],[1,0,1,1,-185],[2,-1,-2,-1,181],
	[0,1,2,1,-177],[4,0,-2,-1,176],[4,-1,-1,-1,166],[1,0,1,-1,-164],
	[4,0,1,-1,132],[1,0,-1,-1,-119],[4,-1,0,-1,115],[2,-2,0,1,107]
];

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
		+ day + (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) / 24.0 + B - 1524.5;
}

function fromJulian(jd: number): Date {
	const jdInt = Math.floor(jd + 0.5);
	const frac = jd + 0.5 - jdInt;

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
}

// Sun ecliptic longitude (geometric, mean equinox of date) — Meeus Ch. 24/25 low precision.
// Used only for the phase (Sun-Moon elongation), so sub-arcminute accuracy suffices.
function sunEclipticLongitude(jd: number): number {
	const T = (jd - J2000) / 36525;
	const L0 = reduce360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
	const M = reduce360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
	const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * DEG)
		+ (0.019993 - 0.000101 * T) * Math.sin(2 * M * DEG)
		+ 0.000289 * Math.sin(3 * M * DEG);
	return L0 + C;
}

export interface MoonInstant {
	/** Geocentric ecliptic longitude (degrees, mean equinox of date) */
	eclipticLon: number;
	/** Geocentric ecliptic latitude (degrees) */
	eclipticLat: number;
	/** Equatorial declination (degrees) */
	declination: number;
	/** Right ascension (radians) */
	rightAscension: number;
	/** Illuminated fraction 0..1 (derived from Sun-Moon elongation) */
	phase: number;
}

/** Moon position at a Julian date — zero-dep Meeus Ch. 47. */
export function moonPosition(jd: number): MoonInstant {
	const T = (jd - J2000) / 36525;

	// Mean arguments (degrees)
	const Lprime = 218.3164477 + (481267.88123421 + (-0.0015786 + (1 / 538841 - T / 65194000) * T) * T) * T;
	const D = 297.8501921 + (445267.1114034 + (-0.0018819 + (1 / 545868 - T / 113065000) * T) * T) * T;
	const M = 357.5291092 + (35999.0502909 + (-0.0001536 + T / 24490000) * T) * T;
	const Mprime = 134.9633964 + (477198.8675055 + (0.0087414 + (1 / 69699 - T / 14712000) * T) * T) * T;
	const F = 93.2720950 + (483202.0175233 + (-0.0036539 + (-1 / 3526000 + T / 863310000) * T) * T) * T;
	const A1 = 119.75 + 131.849 * T;
	const A2 = 53.09 + 479264.290 * T;
	const A3 = 313.45 + 481266.484 * T;
	const E = 1.0 + (-0.002516 - 0.0000074 * T) * T;
	const E2 = E * E;

	const Lr = Lprime * DEG, Dr = D * DEG, Mr = M * DEG, Mpr = Mprime * DEG, Fr = F * DEG;
	const A1r = A1 * DEG, A2r = A2 * DEG, A3r = A3 * DEG;
	const args = [Dr, Mr, Mpr, Fr];

	// Longitude periodic sum (units 1e-6 deg); E-weight by the M multiplier.
	let sigmal = 0;
	for (const row of LUNAR_LON_TABLE) {
		let arg = 0;
		for (let j = 0; j < 4; j++) arg += row[j] * args[j];
		let c = row[4];
		if (Math.abs(row[1]) === 1) c *= E;
		else if (Math.abs(row[1]) === 2) c *= E2;
		sigmal += c * Math.sin(arg);
	}
	sigmal += 3958 * Math.sin(A1r) + 1962 * Math.sin(Lr - Fr) + 318 * Math.sin(A2r);

	// Latitude periodic sum (units 1e-6 deg)
	let sigmab = 0;
	for (const row of LUNAR_LAT_TABLE) {
		let arg = 0;
		for (let j = 0; j < 4; j++) arg += row[j] * args[j];
		let c = row[4];
		if (Math.abs(row[1]) === 1) c *= E;
		else if (Math.abs(row[1]) === 2) c *= E2;
		sigmab += c * Math.sin(arg);
	}
	sigmab += -2235 * Math.sin(Lr) + 382 * Math.sin(A3r) + 175 * Math.sin(A1r - Fr)
		+ 175 * Math.sin(A1r + Fr) + 127 * Math.sin(Lr - Mpr) - 115 * Math.sin(Lr + Mpr);

	const lon = Lprime + sigmal / 1e6;
	const lat = sigmab / 1e6;

	// Ecliptic -> equatorial (mean obliquity of date)
	const eps = (23.439291 - 0.0130042 * T) * DEG;
	const lam = lon * DEG, bet = lat * DEG;
	const ra = Math.atan2(Math.sin(lam) * Math.cos(eps) - Math.tan(bet) * Math.sin(eps), Math.cos(lam));
	const dec = Math.asin(Math.sin(bet) * Math.cos(eps) + Math.cos(bet) * Math.sin(eps) * Math.sin(lam));

	// Illuminated fraction k = (1 - cos(elongation))/2. Elongation 0 = conjunction
	// (new/dark), 180 = opposition (full).
	const sunLon = sunEclipticLongitude(jd);
	let dlon = reduce360(lon - sunLon);
	dlon = Math.min(dlon, 360 - dlon); // to [0, 180]
	const phase = (1 - Math.cos(dlon * DEG)) / 2;

	return { eclipticLon: lon, eclipticLat: lat, declination: dec, rightAscension: ra, phase };
}

export function moonPhaseBand(phase: number): string {
	const p = phase * 100;
	if (p < 5) return 'new';
	if (p < 45) return 'crescent';
	if (p < 55) return 'quarter';
	if (p < 95) return 'gibbous';
	return 'full';
}

export interface LunarLunistice {
	/** Instant of the lunistice (UTC) — the next local minimum of declination */
	datetime: Date;
	/** Southern declination at that instant (degrees, negative) */
	declinationDeg: number;
	/** Moonrise azimuth = arccos(sin δ / cos φ) from north (degrees) */
	riseAzimuthDeg: number;
	/** Illuminated fraction 0..1 */
	phase: number;
	/** new/crescent/quarter/gibbous/full */
	phaseBand: string;
	/** Whole days from `fromDate` to the lunistice */
	daysUntil: number;
}

/** Moonrise azimuth from north for a given declination and site latitude.
 *  arccos(sin δ / cos φ); the brief-specified geometry (horizon model excluded). */
export function moonriseAzimuth(declinationDeg: number, latitude: number): number {
	const s = Math.sin(declinationDeg * DEG) / Math.cos(latitude * DEG);
	return Math.acos(Math.max(-1, Math.min(1, s))) * RAD;
}

/**
 * Find the next southern monthly lunistice after `fromDate`.
 * Steps forward in 1-hour increments over a ~40-day window (the draconic month
 * is ~27.2 d, so the next southern extremum always falls inside) and locates
 * the local minimum (most-negative) of declination. No hardcoded date.
 */
export function findNextSouthernLunistice(fromDate: Date, latitude: number, windowDays = 40): LunarLunistice | null {
	try {
		const jd0 = toJulian(fromDate);
		const step = 1 / 24; // 1 hour
		let prevJd = jd0;
		let prevDec = moonPosition(prevJd).declination;
		let best: { jd: number; dec: number } | null = null;

		for (let j = jd0 + step; j <= jd0 + windowDays; j += step) {
			const dec = moonPosition(j).declination;
			const beforePrevDec = moonPosition(prevJd - step).declination; // sample before prevJd
			// local minimum: prevJd is lower than both neighbours
			if (dec > prevDec && prevDec < beforePrevDec && prevJd > jd0) {
				if (!best || prevDec < best.dec) best = { jd: prevJd, dec: prevDec };
			}
			prevJd = j;
			prevDec = dec;
		}
		if (!best) return null;

		const p = moonPosition(best.jd);
		const daysUntil = Math.round(best.jd - jd0);
		return {
			datetime: fromJulian(best.jd),
			declinationDeg: best.dec * RAD,
			riseAzimuthDeg: moonriseAzimuth(best.dec * RAD, latitude),
			phase: p.phase,
			phaseBand: moonPhaseBand(p.phase),
			daysUntil
		};
	} catch {
		return null;
	}
}

/** Convenience: next southern lunistice from `fromDate` at a site latitude.
 *  Recomputes live each call — no hardcoded date. */
export function calculateNextLunarLunistice(fromDate: Date, latitude: number): LunarLunistice | null {
	return findNextSouthernLunistice(fromDate, latitude);
}