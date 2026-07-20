// Solar solver — standalone implementation of celestial mechanics
// No external dependencies.
//
// Reference algorithm: NOAA Solar Calculator (Cornwall et al.),
// https://gml.noaa.gov/grad/solcalc/ — implements the standard
// astronomical algorithms from Jean Meeus, "Astronomical Algorithms"
// (2nd ed., Willmann-Bell, 1998) for:
//   - Julian date conversions
//   - Solar position (ecliptic longitude → right ascension/declination)
//   - Sunrise/sunset (US Naval Observatory method with -50' refraction)
//   - Solstice/equinox (binary search for target ecliptic longitude)
//
// Uses the same precession/epoch model as Meeus Chapter 22, without
// the nutation corrections (sub-arcsecond precision not needed when
// the output is human-readable ranges)

// === Constants ===

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const J2000 = 2451545.0; // Julian date for Jan 1, 2000 12:00 TT

// === Julian date conversion ===

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

	const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1))
		+ day + (hour + minute / 60 + second / 3600) / 24.0 + B - 1524.5;

	return jd;
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

// === Mean orbital elements ===

function sunLongitude(jd: number): number {
	const n = jd - J2000;
	const L = 280.460 + 0.9856474 * n; // mean longitude (degrees)
	return normalizeAngle(L);
}

function sunAnomaly(jd: number): number {
	const n = jd - J2000;
	const g = 357.528 + 0.9856003 * n; // mean anomaly (degrees)
	return normalizeAngle(g);
}

function normalizeAngle(deg: number): number {
	return deg - 360 * Math.floor(deg / 360);
}

function eclipticLongitude(jd: number): number {
	const L = sunLongitude(jd) * DEG;
	const g = sunAnomaly(jd) * DEG;

	const lambda = L + (1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * DEG;
	return lambda;
}

// Obliquity of the ecliptic
function obliquity(jd: number): number {
	const n = (jd - J2000) / 36525;
	return (23.439291 - 0.0130042 * n) * DEG;
}

// === Right ascension and declination ===

function sunRaDec(jd: number): { ra: number; dec: number } {
	const lambda = eclipticLongitude(jd);
	const epsilon = obliquity(jd);

	const sinLambda = Math.sin(lambda);
	const ra = Math.atan2(Math.cos(epsilon) * sinLambda, Math.cos(lambda));
	const dec = Math.asin(Math.sin(epsilon) * sinLambda);

	return { ra, dec };
}

// === Solar azimuth and altitude ===

function sunPosition(jd: number, latitude: number, longitude: number): { azimuth: number; altitude: number } {
	const { ra, dec } = sunRaDec(jd);

	// Greenwich mean sidereal time (hours)
	const n = jd - J2000;
	const gmst = (280.46061837 + 360.98564736629 * n) % 360;
	const gmstRad = gmst * DEG;

	// Local hour angle
	const latRad = latitude * DEG;
	const lonRad = longitude * DEG;
	const hourAngle = gmstRad + lonRad - ra;

	// Altitude
	const alt = Math.asin(
		Math.sin(latRad) * Math.sin(dec) + Math.cos(latRad) * Math.cos(dec) * Math.cos(hourAngle)
	);

	// Azimuth (from north, clockwise)
	const az = Math.atan2(
		-Math.sin(hourAngle),
		Math.tan(dec) * Math.cos(latRad) - Math.sin(latRad) * Math.cos(hourAngle)
	);

	return {
		azimuth: normalizeAngle(az * RAD + 180),
		altitude: alt * RAD
	};
}

// === Sunrise/sunset calculation (NOAA method) ===

function calcSunriseSet(
	jd: number,
	latitude: number,
	longitude: number,
	event: 'sunrise' | 'sunset'
): number | null {
	const latRad = latitude * DEG;
	const lonRad = longitude * DEG;

	// Solar noon at this longitude
	const noonJd = jd + (12 - (longitude / 15)) / 24; // approximate

	// Sun's declination at noon
	const { ra, dec } = sunRaDec(noonJd);

	// Solar altitude at sunrise/sunset (includes refraction + solar disk)
	const h0 = -0.8333 * DEG; // -50 arcminutes (standard)

	// Hour angle
	const cosH = (Math.sin(h0) - Math.sin(latRad) * Math.sin(dec)) / (Math.cos(latRad) * Math.cos(dec));

	if (cosH > 1) return null; // No sunrise/sunset (polar night)
	if (cosH < -1) return null; // No sunrise/sunset (midnight sun)

	const H = Math.acos(cosH);

	// Local time of event
	const hourAngle = event === 'sunrise' ? -H : H;

	// Julian day fraction for the event
	const eventJd = jd + (12 - longitude / 15) / 24 + hourAngle / (2 * Math.PI);

	return eventJd;
}

// === Solstice/equinox calculation ===

function estimateSolstice(year: number, month: number, day: number): number {
	// Rough estimate using mean anomaly
	const jd = toJulian(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
	const L = sunLongitude(jd);
	const g = sunAnomaly(jd);

	// Equation of center
	const c = (1.915 * Math.sin(g * DEG) + 0.020 * Math.sin(2 * g * DEG)) / DEG;

	// Ecliptic longitude of the Sun
	const lambda = L + c;

	// We're looking for lambda = 0° (vernal equinox), 90° (summer solstice),
	// 180° (autumnal equinox), 270° (winter solstice)
	// Use a binary search to refine
	return jd;
}

function findSolstice(year: number, targetLongitude: number): Date {
	// Start from approximate date
	let approxJd: number;
	if (targetLongitude === 90) {
		// Summer solstice ~ June 21
		approxJd = toJulian(new Date(Date.UTC(year, 5, 10, 12, 0, 0)));
	} else if (targetLongitude === 270) {
		// Winter solstice ~ December 21
		approxJd = toJulian(new Date(Date.UTC(year, 11, 10, 12, 0, 0)));
	} else if (targetLongitude === 0) {
		// Vernal equinox ~ March 20
		approxJd = toJulian(new Date(Date.UTC(year, 2, 10, 12, 0, 0)));
	} else {
		// Autumnal equinox ~ September 22
		approxJd = toJulian(new Date(Date.UTC(year, 8, 10, 12, 0, 0)));
	}

	// Binary search to find when ecliptic longitude crosses the target
	let low = approxJd - 10;
	let high = approxJd + 10;

	for (let iter = 0; iter < 40; iter++) {
		const mid = (low + high) / 2;
		const lambda = eclipticLongitude(mid) * RAD;
		const diff = lambda - targetLongitude;
		const diffNorm = diff - 360 * Math.round(diff / 360);

		if (diffNorm < 0) {
			low = mid;
		} else {
			high = mid;
		}
	}

	return fromJulian((low + high) / 2);
}

// === Public API ===

export interface SeasonsResult {
	junSolstice: Date;
	decSolstice: Date;
	marEquinox: Date;
	sepEquinox: Date;
}

/**
 * Calculate solstice and equinox dates for a given year.
 */
export function getSeasons(year: number): SeasonsResult {
	return {
		marEquinox: findSolstice(year, 0),
		junSolstice: findSolstice(year, 90),
		sepEquinox: findSolstice(year, 180),
		decSolstice: findSolstice(year, 270)
	};
}

/**
 * Calculate next summer solstice after a given date.
 */
export function getNextSummer(fromDate: Date): Date {
	const year = fromDate.getFullYear();
	const summer = getSeasons(year).junSolstice;
	if (fromDate < summer) return summer;
	return getSeasons(year + 1).junSolstice;
}

/**
 * Calculate next winter solstice after a given date.
 */
export function getNextWinter(fromDate: Date): Date {
	const year = fromDate.getFullYear();
	const winter = getSeasons(year).decSolstice;
	if (fromDate < winter) return winter;
	return getSeasons(year + 1).decSolstice;
}

/**
 * Get sunrise or sunset time at a location on a given date.
 */
export function getSunriseSunset(
	date: Date,
	latitude: number,
	longitude: number,
	event: 'sunrise' | 'sunset'
): { time: Date; azimuth: number } | null {
	const jd = toJulian(date);
	const eventJd = calcSunriseSet(jd, latitude, longitude, event);

	if (eventJd === null) return null;

	const eventDate = fromJulian(eventJd);
	const pos = sunPosition(eventJd, latitude, longitude);

	return { time: eventDate, azimuth: pos.azimuth };
}

/**
 * Get sun azimuth at a specific time and location.
 */
export function getSunAzimuth(date: Date, latitude: number, longitude: number): number {
	const jd = toJulian(date);
	const pos = sunPosition(jd, latitude, longitude);
	return pos.azimuth;
}

/**
 * Get a summary of today's sun at a location — for the no-alignment fallback.
 */
export function getLocationSkySummary(
	latitude: number,
	longitude: number,
	date: Date = new Date()
): { sunrise: string; sunset: string; sunlight: string } {
	const rise = getSunriseSunset(date, latitude, longitude, 'sunrise');
	const set = getSunriseSunset(date, latitude, longitude, 'sunset');

	const fmt = (d: Date) =>
		d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

	return {
		sunrise: rise ? fmt(rise.time) : '—',
		sunset: set ? fmt(set.time) : '—',
		sunlight: rise && set ? `${fmt(rise.time)}–${fmt(set.time)}` : '—'
	};
}

/**
 * The range of dates around a solstice where the sun's azimuth
 * at the given event is close to the target bearing.
 */
export function getAlignmentWindow(
	solsticeDate: Date,
	latitude: number,
	longitude: number,
	targetBearing: number,
	event: 'sunrise' | 'sunset',
	maxDaysOut: number = 14
): { daysBefore: number; daysAfter: number } {
	const tolerance = 1.5; // degrees

	let before = 0;
	for (let d = 0; d <= maxDaysOut; d++) {
		const check = new Date(solsticeDate);
		check.setDate(check.getDate() - d);
		const et = getSunriseSunset(check, latitude, longitude, event);
		if (!et) { before = d; break; }
		if (Math.abs(et.azimuth - targetBearing) > tolerance) break;
		before = d;
	}

	let after = 0;
	for (let d = 0; d <= maxDaysOut; d++) {
		const check = new Date(solsticeDate);
		check.setDate(check.getDate() + d);
		const et = getSunriseSunset(check, latitude, longitude, event);
		if (!et) { after = d; break; }
		if (Math.abs(et.azimuth - targetBearing) > tolerance) break;
		after = d;
	}

	return { daysBefore: before, daysAfter: after };
}

export interface AlignmentEvent {
	solsticeDate: Date;
	dateRange: string;
	eventTime: string;
	daysBefore: number;
	daysAfter: number;
	windowDescription: string;
	isPrecise: boolean;
}

/**
 * Calculate the next alignment event for a site alignment.
 */
export function calculateNextAlignment(
	latitude: number,
	longitude: number,
	targetBearing: number,
	event: 'sunrise' | 'sunset',
	alignmentType: string,
	tier: 'surveyed' | 'traditional',
	fromDate: Date = new Date()
): AlignmentEvent | null {
	const isSummer = alignmentType.includes('summer') || alignmentType.includes('midsummer');
	const isLunar = alignmentType.includes('lunar');
	if (isLunar) return null;

	let solsticeDate: Date;
	if (isSummer) {
		solsticeDate = getNextSummer(fromDate);
	} else {
		solsticeDate = getNextWinter(fromDate);
	}

	const eventTime = getSunriseSunset(solsticeDate, latitude, longitude, event);
	if (!eventTime) return null;

	const window = getAlignmentWindow(solsticeDate, latitude, longitude, targetBearing, event);

	const fmtTime = (d: Date) =>
		d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

	const fmtDate = (d: Date) =>
		d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

	const solsticeDay = solsticeDate.toLocaleDateString('en-GB', {
		weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
	});

	const isPrecise = tier === 'surveyed';
	const season = solsticeDate.getMonth() === 5 ? 'summer' : 'winter';

	let dateRange: string;
	let windowDescription: string;

	if (isPrecise) {
		dateRange = solsticeDay;
		windowDescription = `${event === 'sunrise' ? 'Sunrise' : 'Sunset'} around ${fmtTime(eventTime.time)}. ` +
			`Alignment visible from ${fmtDate(new Date(solsticeDate.getTime() - window.daysBefore * 86400000))} ` +
			`to ${fmtDate(new Date(solsticeDate.getTime() + window.daysAfter * 86400000))}, ` +
			`roughly ${window.daysBefore} day${window.daysBefore !== 1 ? 's' : ''} before to ` +
			`${window.daysAfter} day${window.daysAfter !== 1 ? 's' : ''} after the ${season} solstice.`;
	} else {
		dateRange = `around the ${season} solstice`;
		windowDescription = `The alignment is described as occurring during the ${season} solstice period. ` +
			`No precise timing is available from the traditional/folklore tier.`;
	}

	return { solsticeDate, dateRange, eventTime: fmtTime(eventTime.time), daysBefore: window.daysBefore, daysAfter: window.daysAfter, windowDescription, isPrecise };
}