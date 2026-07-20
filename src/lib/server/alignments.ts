// Solar solver — alignment calculation using astronomy-engine
// Router pattern: solar declination, lunar declination, precession-backward
// sit on different solvers. This module implements the solar solver only.

import * as Astronomy from 'astronomy-engine';

/**
 * Calculate the next solstice date for the northern hemisphere.
 */
function getNextSolstice(fromDate: Date): { summer: Date; winter: Date } {
	const year = fromDate.getFullYear();

	// Check this year's solstices
	const thisYear = Astronomy.Seasons(year);
	const nextYear = Astronomy.Seasons(year + 1);

	const summer = new Date(thisYear.jun_solstice.date);
	const winter = new Date(thisYear.dec_solstice.date);
	const nextSummer = new Date(nextYear.jun_solstice.date);

	return { summer, winter };
}

/**
 * Get the next relevant solstice after a given date.
 */
function getNearestSolstice(fromDate: Date, alignmentType: string): Date {
	const { summer, winter } = getNextSolstice(fromDate);
	const isSummer = alignmentType.includes('summer') || alignmentType.includes('midsummer');

	if (isSummer) {
		// Summer solstice is in June — check if it's passed
		if (fromDate < summer) return summer;
		// If past summer, check if winter is next (shouldn't be for summer alignment)
		// Actually: next summer solstice is next year
		const nextYear = Astronomy.Seasons(fromDate.getFullYear() + 1);
		return new Date(nextYear.jun_solstice.date);
	} else {
		// Winter solstice is in December
		if (fromDate < winter) return winter;
		// If past winter, next winter is next year
		const nextYear = Astronomy.Seasons(fromDate.getFullYear() + 1);
		return new Date(nextYear.dec_solstice.date);
	}
}

/**
 * Get the sunrise or sunset time at a location on a given date.
 * Returns the time and azimuth of the event.
 */
function getSunriseSunset(
	date: Date,
	latitude: number,
	longitude: number,
	event: 'sunrise' | 'sunset'
): { time: Date; azimuth: number } | null {
	const observer = new Astronomy.Observer(latitude, longitude, 0);
	const direction = event === 'sunrise' ? 1 : -1;

	// Search starting from 6h before noon for sunrise (morning event, direction=+1)
	// or from noon for sunset (afternoon event, direction=-1)
	const searchHour = event === 'sunrise' ? -6 : 6;
	const searchDate = new Date(date);
	searchDate.setHours(12 + searchHour, 0, 0, 0);

	const astroSearch = new Astronomy.AstroTime(searchDate);

	try {
		const result = Astronomy.SearchRiseSet('Sun', observer, direction, astroSearch, 1.0);

		if (!result) return null;

		const resultDate = new Date(result.date);

		// Get sun position at the event
		const astroResult = new Astronomy.AstroTime(result.date);
		const eq = Astronomy.Equator('Sun', astroResult, observer, true, true);
		const horiz = Astronomy.Horizon(result.date, observer, eq.ra, eq.dec, 'normal');

		return {
			time: resultDate,
			azimuth: horiz.azimuth
		};
	} catch {
		return null;
	}
}

/**
 * The range of dates around a solstice where the sun's azimuth
 * at the given event (sunrise/sunset) is close to the target bearing.
 *
 * Returns the days before and after the solstice where the alignment holds.
 */
function getAlignmentWindow(
	solsticeDate: Date,
	latitude: number,
	longitude: number,
	targetBearing: number,
	event: 'sunrise' | 'sunset',
	maxDaysOut: number = 14
): { daysBefore: number; daysAfter: number } {
	const tolerance = 1.5; // degrees — keeps it within ~6-day window

	let before = 0;
	for (let d = 0; d <= maxDaysOut; d++) {
		const checkDate = new Date(solsticeDate);
		checkDate.setDate(checkDate.getDate() - d);
		const eventTime = getSunriseSunset(checkDate, latitude, longitude, event);
		if (!eventTime) { before = d; break; }
		const diff = Math.abs(eventTime.azimuth - targetBearing);
		if (diff > tolerance) break;
		before = d;
	}

	let after = 0;
	for (let d = 0; d <= maxDaysOut; d++) {
		const checkDate = new Date(solsticeDate);
		checkDate.setDate(checkDate.getDate() + d);
		const eventTime = getSunriseSunset(checkDate, latitude, longitude, event);
		if (!eventTime) { after = d; break; }
		const diff = Math.abs(eventTime.azimuth - targetBearing);
		if (diff > tolerance) break;
		after = d;
	}

	return { daysBefore: before, daysAfter: after };
}

/**
 * Get the azimuth of the sun at a given time and location.
 */
function getSunAzimuth(date: Date, latitude: number, longitude: number): number {
	const observer = new Astronomy.Observer(latitude, longitude, 0);
	const astroTime = new Astronomy.AstroTime(date);
	const eq = Astronomy.Equator('Sun', astroTime, observer, true, true);
	const horiz = Astronomy.Horizon(date, observer, eq.ra, eq.dec, 'normal');
	return horiz.azimuth;
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
	const isLunar = alignmentType.includes('lunar');
	if (isLunar) {
		// Lunar standstill — separate solver needed
		return null;
	}

	// Get the relevant solstice
	const solsticeDate = getNearestSolstice(fromDate, alignmentType);

	// Get the sunrise/sunset time on the solstice
	const eventTime = getSunriseSunset(solsticeDate, latitude, longitude, event);
	if (!eventTime) return null;

	// Get the alignment window
	const window = getAlignmentWindow(solsticeDate, latitude, longitude, targetBearing, event);

	// Format times
	const formatTime = (d: Date): string => {
		return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
	};

	const formatDate = (d: Date): string => {
		return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
	};

	const solsticeDay = solsticeDate.toLocaleDateString('en-GB', {
		weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
	});

	const isPrecise = tier === 'surveyed';

	let dateRange: string;
	let windowDescription: string;

	if (isPrecise) {
		dateRange = solsticeDay;
		windowDescription = `${event === 'sunrise' ? 'Sunrise' : 'Sunset'} around ${formatTime(eventTime.time)}. ` +
			`Alignment visible from ${formatDate(new Date(solsticeDate.getTime() - window.daysBefore * 86400000))} ` +
			`to ${formatDate(new Date(solsticeDate.getTime() + window.daysAfter * 86400000))}, ` +
			`roughly ${window.daysBefore} day${window.daysBefore !== 1 ? 's' : ''} before to ` +
			`${window.daysAfter} day${window.daysAfter !== 1 ? 's' : ''} after the solstice.`;
	} else {
		dateRange = `around the ${solsticeDate.getMonth() === 5 ? 'summer' : 'winter'} solstice`;
		windowDescription = `The alignment is described as occurring during the solstice period. ` +
			`No precise timing is available from the traditional/folklore tier.`;
	}

	return {
		solsticeDate,
		dateRange,
		eventTime: formatTime(eventTime.time),
		daysBefore: window.daysBefore,
		daysAfter: window.daysAfter,
		windowDescription,
		isPrecise
	};
}

/**
 * Get a summary of today's sun at a location — used by the no-alignment fallback.
 */
export function getLocationSkySummary(
	latitude: number,
	longitude: number,
	date: Date = new Date()
): { sunrise: string; sunset: string; sunlight: string } {
	const sunrise = getSunriseSunset(date, latitude, longitude, 'sunrise');
	const sunset = getSunriseSunset(date, latitude, longitude, 'sunset');

	const formatTime = (d: Date): string => {
		return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
	};

	return {
		sunrise: sunrise ? formatTime(sunrise.time) : '—',
		sunset: sunset ? formatTime(sunset.time) : '—',
		sunlight: sunrise && sunset
			? `${formatTime(sunrise.time)}–${formatTime(sunset.time)}`
			: '—'
	};
}